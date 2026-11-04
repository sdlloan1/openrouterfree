import { useEffect, useRef } from 'react'

export default function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  streaming,
  disabled,
  placeholder,
}) {
  const textareaRef = useRef(null)

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`
  }, [value])

  const submit = () => {
    if (disabled || streaming) return
    if (!value.trim()) return
    onSubmit(value)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="composer-wrap">
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="composer-body">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message srt ai"
          />
        </div>
        <div className="composer-row">
          <div className="composer-tools">
            <span className="free-badge">100% free</span>
            <span className="composer-hint">
              {streaming ? 'Generating…' : 'Enter to send · Shift + Enter for a new line'}
            </span>
          </div>
          {streaming ? (
            <button type="button" className="send stop" onClick={onStop} aria-label="Stop generating">
              <span className="stop-square" />
            </button>
          ) : (
            <button
              type="submit"
              className="send"
              disabled={disabled || !value.trim()}
              aria-label="Send message"
            >
              <span aria-hidden="true">↑</span>
            </button>
          )}
        </div>
      </form>
      <p className="disclaimer">
        srt ai runs on free open models and can be wrong. Double-check anything important.
      </p>
    </div>
  )
}
