import React from 'react'

export function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  return (
    <div className="loading-container animate-fadeIn">
      <div className={`spinner ${size === 'sm' ? 'spinner-sm' : ''}`}></div>
      {message && <p className="text-secondary font-medium">{message}</p>}
    </div>
  )
}

export default LoadingSpinner
