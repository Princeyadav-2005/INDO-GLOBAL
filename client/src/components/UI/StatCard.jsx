import React from 'react'

export function StatCard({
  icon = '📈',
  value = '0',
  label = '',
  sublabel,
  color,
  trend
}) {
  return (
    <div className="stat-card card-hover animate-fadeIn">
      <div className="stat-header">
        <div className="stat-icon" style={{ backgroundColor: color ? `${color}15` : undefined, color: color }}>
          {icon}
        </div>
        {trend && (
          <span
            className={`badge ${trend.isUp ? 'badge-success' : 'badge-warning'}`}
            style={{ fontSize: '0.75rem' }}
          >
            {trend.isUp ? '▲' : '▼'} {trend.text}
          </span>
        )}
      </div>
      <div>
        <div className="stat-value" style={{ color: color || undefined }}>
          {value}
        </div>
        <div className="stat-label">{label}</div>
        {sublabel && <div className="stat-sublabel">{sublabel}</div>}
      </div>
    </div>
  )
}

export default StatCard
