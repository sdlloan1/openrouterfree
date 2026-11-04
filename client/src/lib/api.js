export async function fetchModels(signal) {
  const response = await fetch('/api/models', { signal })
  if (!response.ok) throw new Error('Could not load the model list.')
  return response.json()
}

export async function streamChat({ messages, model, signal, onDelta }) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model }),
    signal,
  })

  if (!response.ok) {
    let payload = {}
    try {
      payload = await response.json()
    } catch (error) {
      payload = {}
    }
    const failure = new Error(payload.message || `The request failed (${response.status}).`)
    failure.code = payload.error || 'request_failed'
    throw failure
  }

  if (!response.body) throw new Error('This browser cannot read streamed replies.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleEvent = (raw) => {
    for (const line of raw.split('\n')) {
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (!data) continue
      let event
      try {
        event = JSON.parse(data)
      } catch (error) {
        continue
      }
      if (event.delta) onDelta(event.delta)
      if (event.error) {
        const failure = new Error(event.message || 'The model returned an error.')
        failure.code = event.error
        throw failure
      }
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let index
      while ((index = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, index)
        buffer = buffer.slice(index + 2)
        handleEvent(raw)
      }
    }
    if (buffer.trim()) handleEvent(buffer)
  } finally {
    reader.releaseLock()
  }
}
