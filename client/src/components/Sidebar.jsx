export default function Sidebar({
  conversations,
  activeId,
  open,
  onClose,
  onNew,
  onSelect,
  onDelete,
}) {
  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Chat history">
      <div className="sidebar-head">
        <div className="brand">
          <span className="logo-mark" aria-hidden="true">
            s
          </span>
          <span className="brand-name">
            srt <em>ai</em>
          </span>
        </div>
        <button type="button" className="icon-btn close-sidebar" onClick={onClose} aria-label="Close menu">
          ✕
        </button>
      </div>

      <button type="button" className="new-chat" onClick={onNew}>
        <span className="plus" aria-hidden="true">
          +
        </span>
        New chat
      </button>

      <div className="chat-list">
        {conversations.length === 0 ? (
          <p className="empty-list">Your chats show up here — nothing leaves this browser.</p>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`chat-item${conversation.id === activeId ? ' active' : ''}`}
            >
              <button type="button" className="chat-link" onClick={() => onSelect(conversation.id)}>
                <span className="chat-glyph" aria-hidden="true">
                  ✧
                </span>
                <span className="chat-title">{conversation.title || 'New chat'}</span>
              </button>
              <button
                type="button"
                className="chat-delete"
                onClick={() => onDelete(conversation.id)}
                aria-label={`Delete ${conversation.title || 'chat'}`}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-foot">
        <div className="foot-row">
          <span className="pulse-dot" />
          <span>{conversations.length ? 'Saved on this device' : 'Private by default'}</span>
        </div>
      </div>
    </aside>
  )
}
