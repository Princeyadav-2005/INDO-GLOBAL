import React from 'react'

export function Alert({ type = 'info', title, message, onClose, children }) {
  const getIcon = () => {
    switch (type) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      case 'info':
      default: return 'ℹ️'
    }
  }

  return (
    <div className={`alert alert-${type} animate-fadeIn`}>
      <span style={{ fontSize: '1.25rem' }}>{getIcon()}</span>
      <div className="flex-1">
        {title && <div className="alert-title">{title}</div>}
        {message && <div className="alert-message">{message}</div>}
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          className="alert-close"
          onClick={onClose}
          aria-label="Close alert"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default Alert
