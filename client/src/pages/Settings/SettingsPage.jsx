import React, { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../services/api'

export function SettingsPage() {
  const { lang, setLang, t } = useLanguage()
  const { user, setUser } = useAuth()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '', state: user?.state || '', district: user?.district || '' })
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })

  const handleLangChange = async (newLang) => {
    setLang(newLang)
    try {
      const res = await authAPI.updateProfile({ language: newLang })
      const updated = res?.data || res?.user || user
      if (setUser) setUser({ ...user, language: newLang, ...updated })
    } catch (_) {}
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      const res = await authAPI.updateProfile(profileForm)
      const updated = res?.data || res?.user || {}
      if (setUser) setUser({ ...user, ...profileForm, ...updated })
      setMsg({ type: 'success', text: t('settingsSaved') })
    } catch (err) {
      setMsg({ type: 'error', text: err.message || t('error') })
    } finally { setSaving(false) }
  }

  const handlePwSave = async (e) => {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm) { setMsg({ type: 'error', text: t('passwordMismatch') }); return }
    if (pwForm.newPw.length < 6) { setMsg({ type: 'error', text: t('passwordTooShort') }); return }
    setSaving(true); setMsg(null)
    try {
      await authAPI.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw })
      setMsg({ type: 'success', text: t('settingsSaved') })
      setPwForm({ current: '', newPw: '', confirm: '' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message || t('error') })
    } finally { setSaving(false) }
  }

  return (
    <div className="animate-fadeIn" style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">⚙️ {t('settingsTitle')}</h2>
          <p className="page-subtitle">{t('settingsSubtitle')}</p>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'} mb-4`} style={{ padding: '0.85rem 1.1rem', borderRadius: 'var(--radius-md)', backgroundColor: msg.type === 'success' ? 'var(--color-success-bg, #d1fae5)' : 'var(--color-error-bg, #fee2e2)', color: msg.type === 'success' ? 'var(--color-success)' : 'var(--color-error)', border: `1px solid ${msg.type === 'success' ? 'var(--color-success)' : 'var(--color-error)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        </div>
      )}

      {/* Language Section */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-base mb-1" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🌐 {t('languageSettings')}
        </h3>
        <p className="text-sm text-secondary mb-3">{t('languageDesc')}</p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Hindi */}
          <button
            type="button"
            onClick={() => handleLangChange('hi')}
            style={{
              flex: 1, minWidth: '140px', padding: '1rem 1.5rem',
              borderRadius: 'var(--radius-lg)',
              border: lang === 'hi' ? '2.5px solid var(--color-primary)' : '2px solid var(--color-border)',
              backgroundColor: lang === 'hi' ? 'var(--color-primary-bg, #f0fdf4)' : 'var(--color-surface)',
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '2rem' }}>🇮🇳</span>
            <span className="font-bold" style={{ fontSize: '1.05rem', color: lang === 'hi' ? 'var(--color-primary)' : 'var(--color-text)' }}>हिंदी</span>
            <span className="text-xs text-secondary">Hindi</span>
            {lang === 'hi' && <span style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>✓</span>}
          </button>

          {/* English */}
          <button
            type="button"
            onClick={() => handleLangChange('en')}
            style={{
              flex: 1, minWidth: '140px', padding: '1rem 1.5rem',
              borderRadius: 'var(--radius-lg)',
              border: lang === 'en' ? '2.5px solid var(--color-primary)' : '2px solid var(--color-border)',
              backgroundColor: lang === 'en' ? 'var(--color-primary-bg, #f0fdf4)' : 'var(--color-surface)',
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '2rem' }}>🇬🇧</span>
            <span className="font-bold" style={{ fontSize: '1.05rem', color: lang === 'en' ? 'var(--color-primary)' : 'var(--color-text)' }}>English</span>
            <span className="text-xs text-secondary">Angrezi</span>
            {lang === 'en' && <span style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>✓</span>}
          </button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-base mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          👤 {t('profileSettings')}
        </h3>
        <form onSubmit={handleProfileSave}>
          <div className="grid grid-2 gap-3">
            <div className="form-group">
              <label className="form-label">{t('fullName')}</label>
              <input className="input" type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('phone')}</label>
              <input className="input" type="tel" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('state')}</label>
              <input className="input" type="text" value={profileForm.state} onChange={e => setProfileForm(p => ({ ...p, state: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('district')}</label>
              <input className="input" type="text" value={profileForm.district} onChange={e => setProfileForm(p => ({ ...p, district: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary mt-2" disabled={saving}>
            {saving ? t('loading') : t('updateProfile')}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-4">
        <h3 className="font-bold text-base mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🔑 {t('changePassword')}
        </h3>
        <form onSubmit={handlePwSave}>
          <div className="form-group">
            <label className="form-label">{t('currentPassword')}</label>
            <input className="input" type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('newPassword')}</label>
            <input className="input" type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('confirmPassword')}</label>
            <input className="input" type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t('loading') : t('changePassword')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SettingsPage
