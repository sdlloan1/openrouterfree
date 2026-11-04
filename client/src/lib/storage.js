const CONVERSATIONS_KEY = 'srt.ai.conversations.v1'
const PREFS_KEY = 'srt.ai.prefs.v1'
const MAX_STORED = 60

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch (error) {
    return fallback
  }
}

export function loadConversations() {
  const stored = readJson(CONVERSATIONS_KEY, [])
  if (!Array.isArray(stored)) return []
  return stored
    .filter((conversation) => conversation && Array.isArray(conversation.messages))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function saveConversations(conversations) {
  try {
    const trimmed = conversations.slice(0, MAX_STORED).map((conversation) => ({
      ...conversation,
      messages: conversation.messages.filter((message) => message.content?.trim()),
    }))
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(trimmed))
  } catch (error) {
    /* storage full or unavailable — chats stay in memory */
  }
}

export function loadPref(name) {
  const prefs = readJson(PREFS_KEY, {})
  return prefs[name]
}

export function savePref(name, value) {
  try {
    const prefs = readJson(PREFS_KEY, {})
    prefs[name] = value
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch (error) {
    /* ignore */
  }
}

function makeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function newConversation(model) {
  const now = Date.now()
  return {
    id: makeId(),
    title: 'New chat',
    model: model || '',
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}
