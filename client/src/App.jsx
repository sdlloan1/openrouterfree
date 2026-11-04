import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import ModelPicker from './components/ModelPicker'
import Composer from './components/Composer'
import Hero from './components/Hero'
import Thread from './components/Thread'
import { fetchModels, streamChat } from './lib/api'
import {
  loadConversations,
  loadPref,
  newConversation,
  saveConversations,
  savePref,
} from './lib/storage'

export default function App() {
  const [conversations, setConversations] = useState(loadConversations)
  const [activeId, setActiveId] = useState(null)
  const [models, setModels] = useState([])
  const [modelId, setModelId] = useState(() => loadPref('model') || '')
  const [keyConfigured, setKeyConfigured] = useState(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(() => loadPref('theme') || 'dark')
  const abortRef = useRef(null)

  const active = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) || null,
    [conversations, activeId]
  )

  const selectedModel = models.find((model) => model.id === modelId)

  useEffect(() => {
    saveConversations(conversations)
  }, [conversations])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    savePref('theme', theme)
  }, [theme])

  useEffect(() => {
    if (modelId) savePref('model', modelId)
  }, [modelId])

  useEffect(() => {
    let cancelled = false
    fetchModels()
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.models) ? data.models : []
        setModels(list)
        setKeyConfigured(Boolean(data.keyConfigured))
        setModelId((current) => {
          if (current && list.some((model) => model.id === current)) return current
          if (data.defaultModel && list.some((model) => model.id === data.defaultModel)) {
            return data.defaultModel
          }
          return list[0]?.id || ''
        })
      })
      .catch(() => {
        if (!cancelled) setModels([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const runStream = useCallback(async (conversation, apiMessages) => {
    const controller = new AbortController()
    abortRef.current = controller
    setStreaming(true)

    try {
      await streamChat({
        model: conversation.model,
        messages: apiMessages,
        signal: controller.signal,
        onDelta: (delta) => {
          setConversations((previous) =>
            previous.map((item) => {
              if (item.id !== conversation.id) return item
              const messages = item.messages.slice()
              const lastIndex = messages.length - 1
              if (lastIndex < 0 || messages[lastIndex].role !== 'assistant') return item
              messages[lastIndex] = { ...messages[lastIndex], content: messages[lastIndex].content + delta }
              return { ...item, messages, updatedAt: Date.now() }
            })
          )
        },
      })
    } catch (failure) {
      if (failure.name !== 'AbortError') {
        setError({ message: failure.message || 'Something went wrong.', code: failure.code })
      }
    } finally {
      abortRef.current = null
      setStreaming(false)
      setConversations((previous) =>
        previous.map((item) => {
          if (item.id !== conversation.id) return item
          const lastMessage = item.messages[item.messages.length - 1]
          if (lastMessage?.role === 'assistant' && !lastMessage.content.trim()) {
            return { ...item, messages: item.messages.slice(0, -1) }
          }
          return item
        })
      )
    }
  }, [])

  const send = useCallback(
    (text) => {
      const content = text.trim()
      if (!content || streaming || keyConfigured === false) return

      const base = conversations.find((conversation) => conversation.id === activeId) || newConversation(modelId)
      const history = [...base.messages, { role: 'user', content }]
      const conversation = {
        ...base,
        model: modelId || base.model,
        title: base.messages.length ? base.title : content.replace(/\s+/g, ' ').slice(0, 48),
        messages: [...history, { role: 'assistant', content: '' }],
        updatedAt: Date.now(),
      }

      setConversations((previous) =>
        previous.some((item) => item.id === conversation.id)
          ? previous.map((item) => (item.id === conversation.id ? conversation : item))
          : [conversation, ...previous]
      )
      setActiveId(conversation.id)
      setDraft('')
      setError(null)
      runStream(
        conversation,
        history.map(({ role, content: messageContent }) => ({ role, content: messageContent }))
      )
    },
    [activeId, conversations, keyConfigured, modelId, runStream, streaming]
  )

  const regenerate = useCallback(() => {
    if (streaming) return
    const target = conversations.find((conversation) => conversation.id === activeId)
    if (!target) return

    const history = target.messages.slice()
    while (history.length && history[history.length - 1].role === 'assistant') history.pop()
    if (!history.length) return

    const conversation = {
      ...target,
      messages: [...history, { role: 'assistant', content: '' }],
      updatedAt: Date.now(),
    }
    setConversations((previous) =>
      previous.map((item) => (item.id === conversation.id ? conversation : item))
    )
    setError(null)
    runStream(
      conversation,
      history.map(({ role, content }) => ({ role, content }))
    )
  }, [activeId, conversations, runStream, streaming])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const startNewChat = useCallback(() => {
    abortRef.current?.abort()
    setActiveId(null)
    setDraft('')
    setError(null)
    setSidebarOpen(false)
  }, [])

  const selectChat = useCallback((id) => {
    abortRef.current?.abort()
    setActiveId(id)
    setError(null)
    setSidebarOpen(false)
  }, [])

  const deleteChat = useCallback(
    (id) => {
      setConversations((previous) => previous.filter((conversation) => conversation.id !== id))
      if (id === activeId) {
        abortRef.current?.abort()
        setActiveId(null)
      }
    },
    [activeId]
  )

  return (
    <div className="app">
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <Sidebar
        conversations={conversations}
        activeId={activeId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNew={startNewChat}
        onSelect={selectChat}
        onDelete={deleteChat}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
      />

      <main className="main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="topbar-brand">
            srt <em>ai</em>
          </span>
          <ModelPicker models={models} value={modelId} onChange={setModelId} />
          <span className="topbar-spacer" />
          <a
            className="topbar-link"
            href="https://openrouter.ai/models?max_price=0"
            target="_blank"
            rel="noreferrer noopener"
          >
            Free models ↗
          </a>
        </header>

        {keyConfigured === false && (
          <div className="notice" role="status">
            <span className="notice-dot" aria-hidden="true" />
            <span>
              <strong>No OpenRouter key connected.</strong> Add{' '}
              <code>OPENROUTER_API_KEY</code> in the secrets panel to start chatting with free
              models.
            </span>
          </div>
        )}

        {active ? (
          <Thread
            messages={active.messages}
            streaming={streaming}
            error={error}
            onRegenerate={regenerate}
            onRetry={regenerate}
          />
        ) : (
          <Hero onPick={(prompt) => setDraft(prompt)} modelName={selectedModel?.name} />
        )}

        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={send}
          onStop={stop}
          streaming={streaming}
          disabled={keyConfigured === false}
          placeholder={
            keyConfigured === false
              ? 'Connect an OpenRouter key to start chatting…'
              : 'Ask srt ai anything…'
          }
        />
      </main>
    </div>
  )
}
