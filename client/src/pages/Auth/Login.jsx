import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Alert from '../../components/UI/Alert'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Kripya email/phone aur password dono darj karein.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Login asafal raha. Kripya apne credentials check karein.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexWrap: 'wrap',
        backgroundColor: 'var(--color-bg)'
      }}
    >
      {/* Left green panel */}
      <div
        style={{
          flex: '1 1 400px',
          backgroundColor: 'var(--color-primary-dark)',
          color: '#ffffff',
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(76, 175, 110, 0.25) 0%, transparent 50%)'
        }}
      >
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span style={{ fontSize: '3rem' }}>🌾</span>
            <div>
              <h1 className="font-bold text-2xl" style={{ color: '#ffffff' }}>
                Farmer Connect 2.0
              </h1>
              <p style={{ color: 'var(--color-secondary-light)', fontSize: '0.9rem' }}>
                Khet Se Mandi Tak
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-3" style={{ color: '#ffffff', lineHeight: 1.3 }}>
              Bolkar Record Karo.<br />
              <span style={{ color: 'var(--color-accent-light)' }}>
                Saboot Ke Saath Hisaab Rakho.
              </span>
            </h2>
            <p style={{ color: '#d1fae5', fontSize: '1rem', marginTop: '1rem', lineHeight: 1.6 }}>
              Bharat ke kisano ke liye smart expense tracking, taaza mandi bhav, batai-dar hisab ledger, aur QR passport ki suvidha.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div className="flex items-center gap-3">
            <div style={{ fontSize: '2rem' }}>🤝</div>
            <div className="text-xs" style={{ color: '#a7f3d0' }}>
              <strong>Batai & Hissedari Me Vishwas:</strong><br />
              Donon pakshon ke samne transparent hisab aur raseed upload.
            </div>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div
        style={{
          flex: '1 1 450px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 1.5rem'
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }} className="animate-fadeIn">
          <div className="mb-6">
            <h2 className="font-bold text-2xl text-primary">Login Karein</h2>
            <p className="text-secondary text-sm mt-1">
              Apne account me pravesh karne ke liye vivaran bharein
            </p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email ya Phone Number
              </label>
              <input
                id="email"
                type="text"
                className="input"
                placeholder="Jaise: 9876543210 ya kisan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                <span>Password</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  {showPassword ? 'Chhupayein 🙈' : 'Dekhein 👁️'}
                </button>
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Apna password darj karein"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex-between items-center mb-4">
              <label className="flex items-center gap-2 text-sm text-secondary" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Mujhe yaad rakhein
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
            >
              {submitting ? '⏳ Pravesh ho raha hai...' : 'Login Karein 🌾'}
            </button>
          </form>

          <div className="text-center mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <p className="text-sm text-secondary">
              Naye kisan hain?{' '}
              <Link to="/register" className="font-bold text-primary">
                Yahan Register Karein (Khata Banayein)
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
