import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()

  return (
    <div className="app-layout">
      {/* Sidebar for Desktop & Mobile drawer */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Mobile Header Bar */}
        <div
          className="flex-between items-center mb-4"
          style={{
            display: 'flex',
            padding: '0.5rem 0',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: '1.25rem'
          }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSidebarOpen(true)}
              style={{ fontSize: '1.3rem', padding: '0.2rem 0.5rem' }}
              aria-label="Open Menu"
            >
              ☰
            </button>
            <span className="font-bold text-base text-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              🌾 Farmer Connect
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/farmguard/new" className="btn btn-primary btn-sm" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
              + {t('addExpense')}
            </Link>
          </div>
        </div>

        {/* Page Content injected via Outlet */}
        <Outlet />

        {/* Floating Action Button (FAB) for rapid expense entry */}
        <Link
          to="/farmguard/new"
          className="fab"
          title={t('addNewExpense')}
          aria-label="Record new expense"
        >
          🎙️
        </Link>
      </main>

      {/* Bottom Nav on Mobile */}
      <BottomNav />
    </div>
  )
}

export default AppLayout
