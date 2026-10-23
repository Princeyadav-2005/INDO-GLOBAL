import React, { useState, useEffect } from 'react'
import { seasonsAPI, qrAPI } from '../../services/api'
import QRDisplay from '../../components/QR/QRDisplay'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import EmptyState from '../../components/UI/EmptyState'
import Alert from '../../components/UI/Alert'
import ConfirmDialog from '../../components/UI/ConfirmDialog'
import Modal from '../../components/UI/Modal'
import { formatDate } from '../../utils/formatters'

export function PassportGenerator() {
  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [passports, setPassports] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // New QR Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [accessLevel, setAccessLevel] = useState('public_summary')
  const [expiryDays, setExpiryDays] = useState('30')
  const [generatedQR, setGeneratedQR] = useState(null)

  // Revoke Dialog
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [selectedTokenToRevoke, setSelectedTokenToRevoke] = useState(null)
  const [revokeReason, setRevokeReason] = useState('')

  useEffect(() => {
    loadSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeasonId) {
      loadPassports(selectedSeasonId)
    }
  }, [selectedSeasonId])

  const loadSeasons = async () => {
    try {
      setLoading(true)
      const res = await seasonsAPI.list()
      const list = res.seasons || res.data || (Array.isArray(res) ? res : [])
      setSeasons(list)
      if (list.length > 0) {
        setSelectedSeasonId(list[0].id || list[0]._id)
      } else {
        setLoading(false)
      }
    } catch (err) {
      setError('Seasons load nahi ho sake.')
      setLoading(false)
    }
  }

  const loadPassports = async (sId) => {
    try {
      setLoading(true)
      setError(null)
      const res = await qrAPI.list(sId)
      const list = res.passports || res.data || (Array.isArray(res) ? res : [])
      setPassports(list)
    } catch (err) {
      // If none generated yet or endpoint returns empty
      setPassports([])
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQR = async () => {
    if (!selectedSeasonId) return
    try {
      setGenerating(true)
      setError(null)

      const payload = {
        accessLevel,
        expiryDays: expiryDays === '0' ? null : Number(expiryDays)
      }

      const res = await qrAPI.generate(selectedSeasonId, payload)
      const qrData = res.passport || res.data || res
      const token = qrData.token || qrData.id || qrData._id
      const fullUrl = `${window.location.origin}/passport/${token}`

      setGeneratedQR({ ...qrData, fullUrl })
      setSuccess('Naya Khet Passport QR Code taiyar ho gaya!')
      setGenerateModalOpen(false)
      loadPassports(selectedSeasonId)
    } catch (err) {
      setError(err.message || 'QR Code generate karne me truti hui.')
    } finally {
      setGenerating(false)
    }
  }

  const handleOpenRevoke = (token) => {
    setSelectedTokenToRevoke(token)
    setRevokeReason('')
    setRevokeDialogOpen(true)
  }

  const handleConfirmRevoke = async () => {
    if (!selectedTokenToRevoke) return
    try {
      await qrAPI.revoke(selectedTokenToRevoke, revokeReason || 'Owner requested revoke')
      setSuccess('QR Passport revoke (raddh) kar diya gaya hai.')
      setRevokeDialogOpen(false)
      loadPassports(selectedSeasonId)
    } catch (err) {
      setError(err.message || 'Revoke karne me samasya aayi.')
    }
  }

  return (
    <div className="container animate-fadeIn" style={{ maxWidth: '840px' }}>
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">🔑 Khet QR Passport</h2>
          <p className="page-subtitle">
            Apne khet ka verified hisaab, fasal saboot aur traceability QR code banayein
          </p>
        </div>

        <div className="flex items-center gap-2">
          {seasons.length > 0 && (
            <select
              className="select"
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              style={{ minWidth: '200px' }}
            >
              {seasons.map((s) => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.crop} ({s.farmName || 'Khet'})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setGenerateModalOpen(true)}
            className="btn btn-primary btn-sm"
          >
            + Naya QR Banayein
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Security Info Card */}
      <div className="alert alert-info mb-4">
        <span>🛡️</span>
        <div className="text-xs">
          <strong>Surakshit & Niyantrit Access:</strong> QR scan karne par sirf vahi jankari dikhti hai jo aap chunenge (Public Summary me private bank ya sensitive details chhupi rehti hain). Kisi bhi samay aap QR ko raddh (revoke) kar sakte hain.
        </div>
      </div>

      {/* Display Recently Generated QR */}
      {generatedQR && (
        <div className="mb-6">
          <QRDisplay
            url={generatedQR.fullUrl}
            label={`Verified Passport: ${generatedQR.crop || 'Khet'}`}
          />
        </div>
      )}

      {/* Passports List */}
      <h3 className="section-title">📜 Sakriya aur Purane QR Passports</h3>

      {loading ? (
        <LoadingSpinner message="QR Passport records prapt kiye ja rahe hain..." />
      ) : passports.length === 0 ? (
        <EmptyState
          icon="🔑"
          title="Koi QR Passport nahi mila"
          subtitle="Is khet ke liye abhi tak koi digital passport generate nahi kiya gaya hai. Vyapari ya aadhikariyon ko khet ka record dikhane ke liye QR banayein."
          action={() => setGenerateModalOpen(true)}
          actionLabel="+ Naya QR Passport Banayein"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {passports.map((p) => {
            const isRevoked = p.status === 'revoked'
            const isExpired = p.expiresAt && new Date(p.expiresAt) < new Date()
            const token = p.token || p.id || p._id
            const fullUrl = `${window.location.origin}/passport/${token}`

            return (
              <div key={token} className="card p-4 flex-between items-center flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-primary">
                      {p.accessLevel === 'public_summary' ? '🌐 Sarvajanik (Public Summary)' : '🔒 Nijee (Stakeholders Only)'}
                    </span>
                    {isRevoked ? (
                      <span className="badge badge-error">Raddh (Revoked)</span>
                    ) : isExpired ? (
                      <span className="badge badge-warning">Samapt (Expired)</span>
                    ) : (
                      <span className="badge badge-success">Sakriya (Active)</span>
                    )}
                  </div>

                  <p className="text-xs text-secondary mt-1">
                    Bana: {formatDate(p.createdAt)} • Expiry: {p.expiresAt ? formatDate(p.expiresAt) : 'Kabhi Nahi (Permanent)'}
                  </p>
                  <p className="text-xs text-muted mt-1" style={{ wordBreak: 'break-all' }}>
                    URL: <a href={fullUrl} target="_blank" rel="noreferrer" className="text-primary">{fullUrl}</a>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm"
                  >
                    👁️ Kholkar Dekhein
                  </a>

                  {!isRevoked && !isExpired && (
                    <button
                      type="button"
                      onClick={() => handleOpenRevoke(token)}
                      className="btn btn-danger btn-sm"
                    >
                      Raddh Karein
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Generate QR Modal */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="🔑 Naya QR Passport Generate Karein"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setGenerateModalOpen(false)}
            >
              Raddh Karein
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={generating}
              onClick={handleGenerateQR}
            >
              {generating ? '⏳ QR Ban raha hai...' : '✓ Generate QR Code'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Access Level (Suraksha Star) *</label>
          <select
            className="select"
            value={accessLevel}
            onChange={(e) => setAccessLevel(e.target.value)}
          >
            <option value="public_summary">
              🌐 Sarvajanik Summary (Fasal, katai, verified bills count)
            </option>
            <option value="stakeholders_only">
              🔒 Batai / Malik Sahmati (Full details for stakeholders)
            </option>
          </select>
        </div>

        <div className="form-group mb-0">
          <label className="form-label">QR Validity / Expiry Avadhi *</label>
          <select
            className="select"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
          >
            <option value="7">7 Din (One week trial)</option>
            <option value="30">30 Din (1 Mahina)</option>
            <option value="90">90 Din (3 Mahine / Fasal Samapti Tak)</option>
            <option value="0">Kabhi Expire Na Ho (No Expiry)</option>
          </select>
        </div>
      </Modal>

      {/* Revoke Dialog */}
      <ConfirmDialog
        isOpen={revokeDialogOpen}
        title="QR Passport Raddh (Revoke) Karein"
        message="Kya aap sach me is QR Passport ko raddh karna chahte hain? Iske baad koi bhi vyapari ya vyakti is link ko nahi dekh sakega."
        confirmText="Haan, Revoke Karein"
        cancelText="Nahi, Chhod Dein"
        danger={true}
        onConfirm={handleConfirmRevoke}
        onCancel={() => setRevokeDialogOpen(false)}
      />
    </div>
  )
}

export default PassportGenerator
