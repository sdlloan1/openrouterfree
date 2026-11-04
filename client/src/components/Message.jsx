import { useState } from 'react'
import Markdown from './Markdown'

export default function Message({ message, streaming }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      /* clipboard blocked */
    }
  }

  return (
    <div className={`msg ${isUser ? 'user' : 'assistant'}`}>
      <div className={`avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`} aria-hidden="true">
        {isUser ? 'you' : 's'}
      </div>
      <div className="bubble">
        {isUser ? (
          <p className="user-text">{message.content}</p>
        ) : message.content ? (
          <>
            <Markdown text={message.content} />
            {streaming && <span className="caret" aria-hidden="true" />}
          </>
        ) : streaming ? (
          <div className="typing" aria-label="srt ai is thinking">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        {!isUser && message.content && !streaming && (
          <button type="button" className="copy-btn" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}
