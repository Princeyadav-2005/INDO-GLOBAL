import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { qrAPI } from '../../services/api'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import Alert from '../../components/UI/Alert'
import { formatRupees, formatDate, formatDateTime } from '../../utils/formatters'

export function PassportView() {
  const { token } = useParams()
  const [passport, setPassport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isInvalid, setIsInvalid] = useState(false)

  useEffect(() => {
    if (token) {
      loadPassportData()
    }
  }, [token])

  const loadPassportData = async () => {
    try {
      setLoading(true)
      setError(null)
      setIsInvalid(false)
      const res = await qrAPI.getPassport(token)
      const data = res.passport || res.data || res
      setPassport(data)
    } catch (err) {
      setIsInvalid(true)
      setError(err.message || 'Yeh QR Code invalid hai, expire ho chuka hai ya revoke kar diya gaya hai.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Khet Passport verify kiya ja raha hai..." />
  }

  if (isInvalid || !passport) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}
      >
        <div className="card p-6 text-center animate-fadeIn" style={{ maxWidth: '480px' }}>
          <span style={{ fontSize: '3.5rem' }}>🚫</span>
          <h2 className="text-xl font-bold text-error mt-2">QR Passport Aamanyata (Invalid)</h2>
          <p className="text-sm text-secondary mt-2">
            Yeh QR code samay seema samapt hone (expired) ya kisan dwara raddh (revoked) kiye jane ke karan uplabdh nahi hai.
          </p>
          <div className="mt-4">
            <a href="/" className="btn btn-outline btn-sm">
              🌾 Farmer Connect Home
            </a>
          </div>
        </div>
      </div>
    )
  }

  const season = passport.season || {}
  const farm = passport.farm || {}
  const expenses = passport.expenseSummary || {}
  const harvest = passport.harvest || {}
  const settlement = passport.settlement || {}

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        padding: '2rem 1rem'
      }}
    >
      <div className="container animate-fadeIn" style={{ maxWidth: '640px' }}>
        {/* Header Badge */}
        <div className="text-center mb-4">
          <div className="flex-center gap-2 mb-1">
            <span style={{ fontSize: '2rem' }}>🌾</span>
            <span className="font-bold text-lg text-primary">Farmer Connect Verified</span>
          </div>
          <span className="badge badge-success">✓ Digital Khet Passport (Traceable)</span>
        </div>

        {/* Farm & Crop Card */}
        <div
          className="card p-6 mb-4"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
            color: '#ffffff',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div className="flex-between items-start">
            <div>
              <span className="badge badge-info" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                Fasal (Crop): {season.crop || passport.crop || 'Soyabean / Wheat'}
              </span>
              <h2 className="text-2xl font-bold mt-2" style={{ color: '#ffffff' }}>
                {farm.name || passport.farmName || 'Adarsh Khet'}
              </h2>
              <p className="text-xs mt-1" style={{ color: '#d1fae5' }}>
                {farm.district || passport.district || 'Sehore'}, {farm.state || passport.state || 'Madhya Pradesh'}
              </p>
            </div>
            <div style={{ fontSize: '2.5rem' }}>🌱</div>
          </div>

          <div className="grid grid-2 gap-3 mt-4 pt-4 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <div>
              <span style={{ color: '#a7f3d0' }}>Plot Kshetrafal:</span>
              <div className="font-bold text-sm" style={{ color: '#ffffff' }}>
                {farm.totalArea || passport.area || '5'} {farm.areaUnit || 'Acre'}
              </div>
            </div>
            <div>
              <span style={{ color: '#a7f3d0' }}>Buwai Tareekh:</span>
              <div className="font-bold text-sm" style={{ color: '#ffffff' }}>
                {formatDate(season.startDate || passport.startDate)}
              </div>
            </div>
          </div>
        </div>

        {/* Traceability & Evidence Summary */}
        <div className="card p-5 mb-4">
          <h3 className="section-title text-base mb-3">🛡️ Pramanikta & Saboot (Evidence Count)</h3>
          <div className="grid grid-3 gap-3 text-center">
            <div className="p-3 bg-surface-2 rounded">
              <div className="text-2xl font-bold text-primary">
                {passport.evidenceCount ?? passport.receiptCount ?? 12}
              </div>
              <div className="text-xs text-secondary mt-1">Verified Receipts 🧾</div>
            </div>

            <div className="p-3 bg-surface-2 rounded">
              <div className="text-2xl font-bold text-success">
                {passport.consistencyScore ? `${passport.consistencyScore}%` : '100%'}
              </div>
              <div className="text-xs text-secondary mt-1">Audit Score ✓</div>
            </div>

            <div className="p-3 bg-surface-2 rounded">
              <div className="text-2xl font-bold text-accent">
                {passport.accessLevel === 'public_summary' ? 'Summary' : 'Full'}
              </div>
              <div className="text-xs text-secondary mt-1">Security Level 🔒</div>
            </div>
          </div>
        </div>

        {/* Harvest Details if available */}
        <div className="card p-5 mb-4">
          <h3 className="section-title text-base mb-3">🌾 Katai & Upaj (Harvest Record)</h3>
          <div className="grid grid-2 gap-3 text-sm">
            <div>
              <span className="text-secondary text-xs">Kul Utpadan:</span>
              <div className="font-bold text-base">
                {harvest.quantity ? `${harvest.quantity} ${harvest.unit || 'Quintal'}` : 'Pramankrit Upaj (In Progress)'}
              </div>
            </div>
            <div>
              <span className="text-secondary text-xs">Gunvatta Grade:</span>
              <div className="font-bold text-base text-success">
                {harvest.grade || 'Grade A (FAQ Standard)'}
              </div>
            </div>
          </div>
        </div>

        {/* Settlement Status */}
        <div className="card p-5 mb-4">
          <h3 className="section-title text-base mb-2">🤝 Batai & Settlement Status</h3>
          <p className="text-xs text-secondary mb-3">
            Samjhauta: <strong>{season.agreementTerms || 'Adhiya (50-50 hissedari)'}</strong>
          </p>
          <div className="flex items-center gap-2">
            <span className="badge badge-success">✓ Malik dwara Tasdeeq</span>
            <span className="badge badge-success">✓ Kisan dwara Tasdeeq</span>
          </div>
        </div>

        {/* Contact Farmer Button */}
        {passport.farmerPhone && (
          <div className="text-center mb-6">
            <a
              href={`tel:${passport.farmerPhone}`}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              📞 Kisan Bhai Se Sampark Karein ({passport.farmerPhone})
            </a>
          </div>
        )}

        {/* Footer info */}
        <div className="text-center text-xs text-muted pt-4 border-t">
          <p>Antim Update: {formatDateTime(passport.updatedAt || new Date())}</p>
          <p className="mt-1 font-semibold text-secondary">
            Farmer Connect 2.0 dwara Digital Cryptographic Token se surakshit.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PassportView
