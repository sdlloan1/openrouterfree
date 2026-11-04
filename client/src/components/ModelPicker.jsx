import { useEffect, useMemo, useRef, useState } from 'react'

function shortName(model) {
  if (!model) return 'Free models'
  return model.name.replace(/\s*\(free\)$/i, '')
}

export default function ModelPicker({ models, value, onChange, compact = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)
  const selected = models.find((model) => model.id === value)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return models
    return models.filter((model) =>
      `${model.name} ${model.id} ${model.description}`.toLowerCase().includes(needle)
    )
  }, [models, query])

  const choose = (id) => {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="picker" ref={wrapRef}>
      <button
        type="button"
        className={`picker-trigger${compact ? ' compact' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="model-dot" aria-hidden="true" />
        <span className="picker-label">{models.length ? shortName(selected) : 'Loading models…'}</span>
        <span className={`caret${open ? ' up' : ''}`} aria-hidden="true">
          ⌄
        </span>
      </button>

      {open && (
        <div className="picker-menu" role="listbox" aria-label="Free models">
          <div className="picker-search">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search free models"
              aria-label="Search free models"
            />
          </div>
          <div className="picker-scroll">
            {filtered.length === 0 && <p className="picker-empty">No models match that search.</p>}
            {filtered.map((model) => (
              <button
                type="button"
                key={model.id}
                role="option"
                aria-selected={model.id === value}
                className={`picker-item${model.id === value ? ' selected' : ''}`}
                onClick={() => choose(model.id)}
              >
                <span className="picker-item-main">
                  <span className="picker-item-name">{shortName(model)}</span>
                  <span className="picker-item-id">{model.id}</span>
                </span>
                <span className="free-pill">free</span>
              </button>
            ))}
          </div>
          <p className="picker-note">Model list comes from OpenRouter's free catalogue.</p>
        </div>
      )}
    </div>
  )
}
