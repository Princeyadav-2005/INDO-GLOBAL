import React from 'react'
import { NavLink } from 'react-router-dom'

const BOTTOM_NAV_ITEMS = [
  { path: '/', label: 'Ghar', icon: '🏠' },
  { path: '/farmguard', label: 'Kharcha', icon: '📒' },
  { path: '/mandi', label: 'Mandi', icon: '📊' },
  { path: '/khet-hisab', label: 'Hisab', icon: '📋' },
  { path: '/ai-mitra', label: 'Mitra', icon: '🤖' }
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {BOTTOM_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default BottomNav
