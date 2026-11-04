import { useEffect, useRef } from 'react'
import Message from './Message'

export default function Thread({ messages, streaming, error, onRegenerate, onRetry }) {
  const scroller = useRef(null)

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [messages, streaming, error])

  const last = messages[messages.length - 1]

  return (
    <div className="thread" ref={scroller}>
      <div className="thread-inner">
        {messages.map((message, index) => (
          <Message
            key={`${index}-${message.role}`}
            message={message}
            streaming={streaming && index === messages.length - 1 && message.role === 'assistant'}
          />
        ))}

        {error && (
          <div className="error-card" role="alert">
            <div className="error-body">
              <strong>
                {error.code === 'missing_api_key' ? 'OpenRouter key not connected' : 'That didn’t work'}
              </strong>
              <p>{error.message}</p>
            </div>
            <button type="button" className="ghost-btn" onClick={onRetry}>
              Try again
            </button>
          </div>
        )}

        {!streaming && !error && messages.length > 1 && last?.role === 'assistant' && (
          <div className="thread-actions">
            <button type="button" className="ghost-btn" onClick={onRegenerate}>
              ↻ Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
