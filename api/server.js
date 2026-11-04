import express from 'express'

const app = express()
app.disable('x-powered-by')

// The GitHub Pages build calls this service cross-origin, so the browser page
// origin has to be allowlisted. Locally the Vite dev server proxies /api and no
// CORS headers are needed.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin.replace(/\/$/, ''))) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.use(express.json({ limit: '30mb' }))

const PORT = Number(process.env.PORT || 8000)
const OPENROUTER_BASE = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '')
const MAX_MESSAGES = 40
const MAX_CHARS = 12000

const PREFERRED_DEFAULTS = [
  'openrouter/free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
]

const FALLBACK_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Instruct (free)', context: 131072, description: 'Meta · general purpose' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (free)', context: 163840, description: 'DeepSeek · reasoning' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3 (free)', context: 163840, description: 'DeepSeek · chat' },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (free)', context: 1048576, description: 'Google · fast' },
  { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen3 235B (free)', context: 131072, description: 'Alibaba · general purpose' },
  { id: 'mistralai/mistral-small-3.2-24b-instruct:free', name: 'Mistral Small 3.2 (free)', context: 131072, description: 'Mistral · general purpose' },
]

function apiKey() {
  return (process.env.OPENROUTER_API_KEY || '').trim()
}

function titleOf(model) {
  if (!model.name) return model.id
  return model.name.replace(/\s*\((free|Free)\)\s*$/, '')
}

let modelsCache = { at: 0, models: null }

function lookupFallback() {
  return FALLBACK_MODELS.map((m) => ({ ...m, name: titleOf(m) }))
}

async function loadFreeModels() {
  if (modelsCache.models && Date.now() - modelsCache.at < 10 * 60 * 1000) {
    return modelsCache.models
  }
  try {
    const response = await fetch(`${OPENROUTER_BASE}/models`, {
      headers: {
        'HTTP-Referer': process.env.PUBLIC_APP_URL || 'https://srt.ai',
        'X-Title': 'srt ai',
      },
    })
    if (!response.ok) throw new Error(`OpenRouter models responded ${response.status}`)
    const payload = await response.json()
    const models = (payload.data || [])
      .filter((model) => {
        const pricing = model.pricing || {}
        const isFree = Number(pricing.prompt) === 0 && Number(pricing.completion) === 0
        if (!isFree) return false
        // Chat needs a text-producing model: skip image, audio and embedding models.
        const outputs =
          model.architecture?.output_modalities ||
          (model.architecture?.modality ? [model.architecture.modality.split('->')[1]] : null)
        return !outputs || outputs.every((modality) => modality === 'text')
      })
      .map((model) => ({
        id: model.id,
        name: titleOf(model),
        description: model.description || '',
        context: model.context_length || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    if (!models.length) throw new Error('No free models listed upstream')
    modelsCache = { at: Date.now(), models: models.slice(0, 80) }
    return modelsCache.models
  } catch (error) {
    if (modelsCache.models) return modelsCache.models
    return lookupFallback()
  }
}

function normalizeContent(content) {
  if (typeof content === 'string') return content.trim().slice(0, MAX_CHARS)
  if (!Array.isArray(content)) return ''

  const parts = []
  for (const part of content) {
    if (!part || typeof part !== 'object') continue
    if (part.type === 'text' && typeof part.text === 'string') {
      const text = part.text.trim().slice(0, MAX_CHARS)
      if (text) parts.push({ type: 'text', text })
      continue
    }
    if (part.type === 'image_url') {
      const url = typeof part.image_url === 'string' ? part.image_url : part.image_url?.url
      const allowed = /^data:image\/(png|jpe?g|webp|gif);base64,/
      if (typeof url === 'string' && allowed.test(url) && url.length < 8_000_000) {
        parts.push({ type: 'image_url', image_url: { url } })
      }
    }
  }
  return parts
}

function hasContent(content) {
  return typeof content === 'string' ? content.length > 0 : content.length > 0
}

function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return null
  const cleaned = raw
    .filter((message) => message && typeof message === 'object')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : message.role === 'system' ? 'system' : 'user',
      content: normalizeContent(message.content),
    }))
    .filter((message) => hasContent(message.content))
    .slice(-MAX_MESSAGES)
  if (!cleaned.some((message) => message.role === 'user')) return null
  return cleaned
}

// The service URL is opened in a browser as often as it is called, so the root
// answers with a status summary instead of the catch-all 404 below.
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'srt ai api',
    message: 'The srt ai API is running.',
    keyConfigured: Boolean(apiKey()),
    endpoints: {
      health: 'GET /api/health',
      models: 'GET /api/models',
      chat: 'POST /api/chat',
    },
  })
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, keyConfigured: Boolean(apiKey()) })
})

app.get('/api/models', async (_req, res) => {
  const models = await loadFreeModels()
  const preferred = PREFERRED_DEFAULTS.find((id) => models.some((model) => model.id === id))
  res.json({
    models,
    keyConfigured: Boolean(apiKey()),
    defaultModel: preferred || models[0]?.id || '',
  })
})

app.post('/api/chat', async (req, res) => {
  const key = apiKey()
  if (!key) {
    return res.status(503).json({
      error: 'missing_api_key',
      message: 'No OpenRouter API key is connected yet. Add OPENROUTER_API_KEY to unlock free models.',
    })
  }

  const body = req.body || {}
  const messages = normalizeMessages(body.messages)
  if (!messages) {
    return res.status(400).json({ error: 'invalid_messages', message: 'Send at least one user message.' })
  }
  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : ''

  const controller = new AbortController()
  // Abort the upstream call only when the client really goes away. `req` emits
  // 'close' as soon as its body is consumed, which would cancel every reply.
  res.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)])

  let upstream
  try {
    upstream = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.PUBLIC_APP_URL || 'https://srt.ai',
        'X-Title': 'srt ai',
      },
      body: JSON.stringify({
        ...(model ? { model } : {}),
        messages,
        stream: true,
        temperature: 0.7,
      }),
    })
  } catch (error) {
    if (controller.signal.aborted) {
      res.end()
      return
    }
    return res.status(502).json({
      error: 'upstream_unreachable',
      message: 'Could not reach OpenRouter. Check the connection and try again.',
    })
  }

  if (!upstream.ok) {
    let detail = ''
    try {
      detail = (await upstream.text()).slice(0, 400)
    } catch (error) {
      detail = ''
    }
    const status = upstream.status
    const mapped =
      status === 401 || status === 403
        ? { code: 'invalid_api_key', message: 'The OpenRouter API key was rejected. Update OPENROUTER_API_KEY and try again.' }
        : status === 429
          ? { code: 'rate_limited', message: 'OpenRouter is rate limiting requests right now. Try again in a moment.' }
          : status === 402
            ? { code: 'insufficient_credits', message: 'This OpenRouter account has no credits available for that model.' }
            : { code: 'upstream_error', message: `OpenRouter could not complete that request (${status}).` }
    return res.status(status >= 500 ? 502 : status).json({ error: mapped.code, message: mapped.message, detail })
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const emit = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`)
  const decoder = new TextDecoder()
  let buffer = ''
  let finished = false

  const consume = (line) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const data = trimmed.slice(5).trim()
    if (!data || data === '[DONE]') return
    let event
    try {
      event = JSON.parse(data)
    } catch (error) {
      return
    }
    if (event.error) {
      emit({ error: 'upstream_error', message: event.error.message || 'The model returned an error.' })
      return
    }
    const choice = event.choices?.[0]
    const delta = choice?.delta?.content
    if (delta) emit({ delta })
    if (choice?.finish_reason) {
      finished = true
      emit({ done: true, finish: choice.finish_reason })
    }
  }

  try {
    for await (const chunk of upstream.body) {
      buffer += decoder.decode(chunk, { stream: true })
      let index
      while ((index = buffer.indexOf('\n')) !== -1) {
        consume(buffer.slice(0, index))
        buffer = buffer.slice(index + 1)
      }
    }
    if (buffer) consume(buffer)
    if (!finished) emit({ done: true })
  } catch (error) {
    if (!controller.signal.aborted) {
      emit({ error: 'stream_interrupted', message: 'The connection to the model was interrupted.' })
    }
  } finally {
    res.end()
  }
})

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`srt ai api listening on http://0.0.0.0:${PORT}`)
})
