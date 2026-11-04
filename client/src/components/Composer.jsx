import { useEffect, useRef, useState } from 'react'
import { readAttachments, ATTACHMENT_LIMITS } from '../lib/attachments'

const ACCEPTED =
  'image/png,image/jpeg,image/webp,image/gif,.txt,.md,.markdown,.csv,.json,.js,.jsx,.ts,.tsx,.py,.html,.css,.yml,.yaml,.sh,.sql,.xml,.log,.env,.go,.rb'

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none">
      <path
        d="M20.4 11.6 12 20a5.1 5.1 0 0 1-7.2-7.2l8-8a3.4 3.4 0 0 1 4.8 4.8l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.2-7.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  streaming,
  disabled,
  placeholder,
}) {
  const [files, setFiles] = useState([])
  const [attachError, setAttachError] = useState('')
  const textareaRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`
  }, [value])

  const addFiles = async (fileList) => {
    setAttachError('')
    const { attachments, errors } = await readAttachments(fileList, files.length)
    if (attachments.length) {
      setFiles((current) => [...current, ...attachments].slice(0, ATTACHMENT_LIMITS.MAX_FILES))
    }
    if (errors.length) setAttachError(errors[0])
  }

  const removeFile = (id) => {
    setFiles((current) => current.filter((file) => file.id !== id))
    setAttachError('')
  }

  const submit = () => {
    if (disabled || streaming) return
    if (!value.trim() && !files.length) return
    onSubmit(value, files)
    setFiles([])
    setAttachError('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  const canSend = !disabled && (Boolean(value.trim()) || files.length > 0)

  return (
    <div className="composer-wrap">
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        {files.length > 0 && (
          <div className="composer-attachments">
            {files.map((file) => (
              <div key={file.id} className={`attachment ${file.kind}`}>
                {file.kind === 'image' ? (
                  <img src={file.dataUrl} alt="" />
                ) : (
                  <span className="file-glyph" aria-hidden="true">
                    ▤
                  </span>
                )}
                <span className="attachment-name">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  aria-label={`Remove ${file.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

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
            <button
              type="button"
              className="attach-btn"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || streaming || files.length >= ATTACHMENT_LIMITS.MAX_FILES}
              aria-label="Attach a file"
              title="Attach an image or a text/code file"
            >
              <PaperclipIcon />
            </button>
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
            <button type="submit" className="send" disabled={!canSend} aria-label="Send message">
              <span aria-hidden="true">↑</span>
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="file-input"
          onChange={(event) => {
            const picked = Array.from(event.target.files || [])
            event.target.value = ''
            addFiles(picked)
          }}
        />

        {attachError && <p className="attach-error">{attachError}</p>}
      </form>
      <p className="disclaimer">
        srt ai runs on free open models and can be wrong. Double-check anything important.
      </p>
    </div>
  )
}
