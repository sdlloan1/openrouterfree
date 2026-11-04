import { memo, useState } from 'react'

function renderInline(text, keyPrefix) {
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))/g
  const nodes = []
  let cursor = 0
  let match
  let index = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    const token = match[0]
    const key = `${keyPrefix}-i${index}`
    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)
      if (linkMatch) {
        nodes.push(
          <a key={key} href={linkMatch[2]} target="_blank" rel="noreferrer noopener">
            {linkMatch[1]}
          </a>
        )
      } else {
        nodes.push(token)
      }
    }
    cursor = match.index + token.length
    index += 1
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      /* clipboard blocked */
    }
  }

  return (
    <div className="code-block">
      <div className="code-head">
        <span>{language || 'code'}</span>
        <button type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Markdown({ text }) {
  const chunks = text.split(/```/)
  const blocks = []

  chunks.forEach((chunk, chunkIndex) => {
    if (chunkIndex % 2 === 1) {
      const newline = chunk.indexOf('\n')
      const language = newline > -1 ? chunk.slice(0, newline).trim() : ''
      const code = (newline > -1 ? chunk.slice(newline + 1) : chunk).replace(/\n+$/, '')
      blocks.push(<CodeBlock key={`code-${chunkIndex}`} language={language} code={code} />)
      return
    }

    const lines = chunk.split('\n')
    let listItems = []
    let ordered = false

    const flushList = () => {
      if (!listItems.length) return
      const items = listItems.map((item, itemIndex) => (
        <li key={`item-${chunkIndex}-${itemIndex}`}>{renderInline(item, `li-${chunkIndex}-${itemIndex}`)}</li>
      ))
      blocks.push(
        ordered ? (
          <ol key={`list-${chunkIndex}-${blocks.length}`}>{items}</ol>
        ) : (
          <ul key={`list-${chunkIndex}-${blocks.length}`}>{items}</ul>
        )
      )
      listItems = []
    }

    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim()
      const bullet = /^[-*•]\s+(.*)$/.exec(trimmed)
      const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed)

      if (bullet) {
        if (ordered) flushList()
        ordered = false
        listItems.push(bullet[1])
        return
      }

      if (numbered) {
        if (!ordered) flushList()
        ordered = true
        listItems.push(numbered[1])
        return
      }

      flushList()

      if (!trimmed) return

      const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed)
      if (heading) {
        const key = `h-${chunkIndex}-${lineIndex}`
        const content = renderInline(heading[2], key)
        if (heading[1].length === 1) blocks.push(<h2 key={key}>{content}</h2>)
        else if (heading[1].length === 2) blocks.push(<h3 key={key}>{content}</h3>)
        else blocks.push(<h4 key={key}>{content}</h4>)
        return
      }

      if (/^([-*_])\1{2,}$/.test(trimmed)) {
        blocks.push(<hr key={`hr-${chunkIndex}-${lineIndex}`} />)
        return
      }

      if (trimmed.startsWith('> ')) {
        blocks.push(
          <blockquote key={`quote-${chunkIndex}-${lineIndex}`}>
            {renderInline(trimmed.slice(2), `q-${chunkIndex}-${lineIndex}`)}
          </blockquote>
        )
        return
      }

      blocks.push(<p key={`p-${chunkIndex}-${lineIndex}`}>{renderInline(trimmed, `p-${chunkIndex}-${lineIndex}`)}</p>)
    })

    flushList()
  })

  return <div className="markdown">{blocks}</div>
}

export default memo(Markdown)
