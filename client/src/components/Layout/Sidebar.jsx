import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

export function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const { t, lang } = useLanguage()

  const NAV_ITEMS = [
    { path: '/', labelKey: 'nav_dashboard', subKey: 'nav_dashboard', icon: '🏠' },
    { path: '/farmguard', labelKey: 'nav_farmguard', subKey: 'nav_farmguard_sub', icon: '📒' },
    { path: '/mandi', labelKey: 'nav_mandi', subKey: 'nav_mandi_sub', icon: '📊' },
    { path: '/khet-hisab', labelKey: 'nav_khethisab', subKey: 'nav_khethisab_sub', icon: '📋' },
    { path: '/qr', labelKey: 'nav_qr', subKey: 'nav_qr_sub', icon: '🔑' },
    { path: '/ai-mitra', labelKey: 'nav_ai', subKey: 'nav_ai_sub', icon: '🤖' },
    { path: '/weather', labelKey: 'nav_weather', subKey: 'nav_weather_sub', icon: '🌤️' },
    { path: '/schemes', labelKey: 'nav_schemes', subKey: 'nav_schemes_sub', icon: '📜' },
    { path: '/marketplace', labelKey: 'nav_marketplace', subKey: 'nav_marketplace_sub', icon: '🛒' },
    { path: '/settings', labelKey: 'nav_settings', subKey: 'nav_settings_sub', icon: '⚙️' },
  ]

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '2rem' }}>🌾</span>
            <div>
              <h1 className="font-bold text-lg" style={{ color: '#ffffff', lineHeight: 1.2 }}>
                {t('appName')}
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-secondary-light)', fontWeight: 500 }}>
                {t('appTagline')}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-md)',
                color: isActive ? '#ffffff' : '#d1fae5',
                backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                fontWeight: isActive ? 700 : 500, fontSize: '0.925rem',
                transition: 'all 0.15s ease'
              })}
            >
              <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
              <div>
                <div>{t(item.labelKey)}</div>
                <div style={{ fontSize: '0.725rem', opacity: 0.75 }}>{t(item.subKey)}</div>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
              {user?.name ? user.name[0].toUpperCase() : '👨‍🌾'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div className="font-bold text-sm" style={{ color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {user?.name || (lang === 'en' ? 'Farmer' : 'Kisan Bhai')}
              </div>
              <div className="text-xs" style={{ color: 'var(--color-secondary-light)' }}>
                {user?.phone || user?.email}
              </div>
            </div>
          </div>

          {/* Language quick toggle in sidebar */}
          <Link to="/settings" onClick={onClose} className="btn btn-sm mb-2" style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', color: '#d1fae5', border: '1px solid rgba(255,255,255,0.15)', justifyContent: 'center', fontSize: '0.8rem' }}>
            🌐 {lang === 'en' ? 'English' : 'हिंदी'} — {t('nav_settings')}
          </Link>

          <button type="button" onClick={logout} className="btn btn-sm" style={{ width: '100%', backgroundColor: 'rgba(220, 38, 38, 0.2)', color: '#fca5a5', border: '1px solid rgba(220, 38, 38, 0.4)', justifyContent: 'center' }}>
            {t('logoutBtn')}
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
