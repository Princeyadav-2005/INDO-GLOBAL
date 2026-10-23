import React from 'react'

export function EmptyState({
  icon = '🌾',
  title = 'Koi data nahi mila',
  subtitle = 'Yahan abhi tak koi record darj nahi kiya gaya hai.',
  action,
  actionLabel = '+ Naya jodein'
}) {
  return (
    <div className="card text-center p-6 animate-fadeIn" style={{ borderStyle: 'dashed' }}>
      <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{icon}</div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-secondary text-sm mb-4" style={{ maxWidth: '400px', margin: '0 auto 1.25rem' }}>
        {subtitle}
      </p>
      {action && actionLabel && (
        <div>
          <button type="button" onClick={action} className="btn btn-primary btn-sm">
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}

export default EmptyState
