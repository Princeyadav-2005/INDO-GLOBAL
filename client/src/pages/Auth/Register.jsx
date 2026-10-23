import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import Alert from '../../components/UI/Alert'

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
]

export function Register() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    state: 'Madhya Pradesh',
    district: '',
    language: 'hi'
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { register } = useAuth()
  const { setLang } = useLanguage()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleNextStep = (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.name || !formData.phone || !formData.password) {
      setError('Kripya naam, phone number aur password bharein.')
      return
    }

    if (formData.password.length < 6) {
      setError('Password kam se kam 6 aksharon ka hona chahiye.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password aur Confirm Password mel nahi kha rahe.')
      return
    }

    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.state) {
      setError('Kripya apna rajya chunein.')
      return
    }

    try {
      setSubmitting(true)
      await register({
        name: formData.name,
        email: formData.email || `${formData.phone}@farmerconnect.in`,
        phone: formData.phone,
        password: formData.password,
        state: formData.state,
        district: formData.district,
        language: formData.language
      })
      setLang(formData.language === 'en' ? 'en' : 'hi')
      navigate('/')
    } catch (err) {
      setError(err.message || 'Registration asafal raha. Kripya dobara janch karein.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem'
      }}
    >
      <div className="card p-6" style={{ maxWidth: '520px', width: '100%', boxShadow: 'var(--shadow-md)' }}>
        <div className="text-center mb-6">
          <span style={{ fontSize: '2.5rem' }}>🌾</span>
          <h2 className="font-bold text-2xl text-primary mt-1">Naya Khata Banayein</h2>
          <p className="text-sm text-secondary">
            Farmer Connect 2.0 par kisan pariwar se judein
          </p>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}
              >
                1
              </span>
              <span className={`text-xs ${step === 1 ? 'font-bold text-primary' : 'text-muted'}`}>
                Mul Jankari
              </span>
            </div>
            <div style={{ height: '2px', width: '40px', backgroundColor: step === 2 ? 'var(--color-primary)' : 'var(--color-border)' }} />
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: step === 2 ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: step === 2 ? '#ffffff' : 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}
              >
                2
              </span>
              <span className={`text-xs ${step === 2 ? 'font-bold text-primary' : 'text-muted'}`}>
                Sthaan & Bhasha
              </span>
            </div>
          </div>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        {step === 1 ? (
          <form onSubmit={handleNextStep}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Aapka Pura Naam *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="input"
                placeholder="Jaise: Rameshwar Patel"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Mobile Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="input"
                placeholder="10 ankon ka mobile number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Pata (Yadi ho)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                placeholder="optional@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-2 gap-3">
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="input"
                  placeholder="Kam se kam 6 akshar"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">
                  Pushti Karein *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="input"
                  placeholder="Password dobara dalein"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Aage Badhein (Step 2) ➔
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="state">
                Rajya (State) *
              </label>
              <select
                id="state"
                name="state"
                className="select"
                value={formData.state}
                onChange={handleChange}
                required
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="district">
                Jila (District)
              </label>
              <input
                id="district"
                name="district"
                type="text"
                className="input"
                placeholder="Jaise: Sehore, Indore, Karnal"
                value={formData.district}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="language">
                Prathmik Bhasha (Preferred Language)
              </label>
              <select
                id="language"
                name="language"
                className="select"
                value={formData.language}
                onChange={handleChange}
              >
                <option value="hi">🇮🇳 हिंदी (Hindi)</option>
                <option value="en">🇬🇧 English (Angrezi)</option>
              </select>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                ⬅ Pichhe
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                {submitting ? '⏳ Khata ban raha hai...' : 'Register Karein 🌾'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-sm text-secondary">
            Pehle se khata hai?{' '}
            <Link to="/login" className="font-bold text-primary">
              Login Karein
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
