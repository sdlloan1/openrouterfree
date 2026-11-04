const SUGGESTIONS = [
  {
    icon: '✧',
    label: 'Explain something',
    prompt: 'Explain how thunderstorms form, in simple terms.',
  },
  {
    icon: '✎',
    label: 'Write with me',
    prompt: 'Write a short story about a lighthouse keeper who finds a message in a bottle.',
  },
  {
    icon: '⌘',
    label: 'Debug code',
    prompt: 'Why does my JavaScript fetch call return undefined? Walk me through the fix.',
  },
  {
    icon: '◷',
    label: 'Plan my day',
    prompt: 'Help me plan a focused, realistic work day with three priorities.',
  },
]

export default function Hero({ onPick, modelName }) {
  return (
    <div className="hero">
      <div className="hero-orb" aria-hidden="true">
        <span>s</span>
      </div>
      <h1>
        Ask <em>srt ai</em> anything
      </h1>
      <p className="hero-sub">
        Free, private AI chat powered by open models.
        {modelName ? <span className="hero-model"> Now using {modelName}.</span> : null}
      </p>

      <div className="suggestions">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.label}
            type="button"
            className="suggestion"
            onClick={() => onPick(suggestion.prompt)}
          >
            <span className="suggestion-icon" aria-hidden="true">
              {suggestion.icon}
            </span>
            <span className="suggestion-label">{suggestion.label}</span>
            <span className="suggestion-prompt">{suggestion.prompt}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
