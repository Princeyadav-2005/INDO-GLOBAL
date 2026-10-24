import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { seasonsAPI, qrAPI } from '../../services/api'
import { useLanguage } from '../../context/LanguageContext'
import QRDisplay from '../../components/QR/QRDisplay'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import EmptyState from '../../components/UI/EmptyState'
import Alert from '../../components/UI/Alert'
import ConfirmDialog from '../../components/UI/ConfirmDialog'
import Modal from '../../components/UI/Modal'
import { formatDate } from '../../utils/formatters'

export function PassportGenerator() {
  const { t, lang } = useLanguage()
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
    } else {
      setPassports([])
    }
  }, [selectedSeasonId])

  const loadSeasons = async () => {
    try {
      setLoading(true)
      const res = await seasonsAPI.list()
      const list = res?.data || res?.seasons || (Array.isArray(res) ? res : [])
      setSeasons(list)
      if (list.length > 0) {
        setSelectedSeasonId(list[0].id || list[0]._id)
      } else {
        setLoading(false)
      }
    } catch (err) {
      setError(lang === 'en' ? 'Could not load farm seasons.' : 'Khet ke seasons load nahi ho sake.')
      setLoading(false)
    }
  }

  const loadPassports = async (sId) => {
    try {
      setLoading(true)
      setError(null)
      const res = await qrAPI.list(sId)
      const list = res?.data || res?.passports || (Array.isArray(res) ? res : [])
      setPassports(list)
    } catch (err) {
      setPassports([])
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQR = async () => {
    if (!selectedSeasonId) {
      setError(
        lang === 'en'
          ? 'Please select or create a farm season first.'
          : 'Kripya pehle ek khet ya fasal (Season) chunein. Agar fasal nahi hai to Farm Setup me jakar banayein.'
      )
      return
    }

    try {
      setGenerating(true)
      setError(null)

      const daysVal = expiryDays === '0' ? null : Number(expiryDays)
      const payload = {
        accessLevel,
        expiresInDays: daysVal,
        expiryDays: daysVal
      }

      const res = await qrAPI.generate(selectedSeasonId, payload)
      const dataObj = res?.data || res?.passport || res
      const token = dataObj?.token || dataObj?.passport?.token || dataObj?.id
      const qrDataUrl = dataObj?.qrDataUrl || dataObj?.passport?.qrCodeDataUrl || ''
      const fullUrl = `${window.location.origin}/passport/${token}`

      const currentSeason = seasons.find((s) => (s.id || s._id) === selectedSeasonId)
      const cropName = currentSeason?.crop || 'Khet'

      setGeneratedQR({
        token,
        fullUrl,
        qrDataUrl,
        crop: cropName
      })
      setSuccess(
        lang === 'en'
          ? 'Digital Farm Passport QR generated successfully!'
          : 'Naya Khet Passport QR Code safaltapoorvak ban gaya!'
      )
      setGenerateModalOpen(false)
      loadPassports(selectedSeasonId)
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Failed to generate QR code.' : 'QR Code generate karne me truti hui.'))
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
      setSuccess(
        lang === 'en'
          ? 'QR Passport revoked successfully.'
          : 'QR Passport revoke (raddh) kar diya gaya hai.'
      )
      setRevokeDialogOpen(false)
      loadPassports(selectedSeasonId)
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Failed to revoke QR.' : 'Revoke karne me samasya aayi.'))
    }
  }

  const currentSeason = seasons.find((s) => (s.id || s._id) === selectedSeasonId)

  return (
    <div className="container animate-fadeIn" style={{ maxWidth: '840px' }}>
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">🔑 {lang === 'en' ? 'Digital Farm QR Passport' : 'Khet QR Passport'}</h2>
          <p className="page-subtitle">
            {lang === 'en'
              ? 'Create verified digital passports, farm records and crop traceability QR codes'
              : 'Apne khet ka verified hisaab, fasal saboot aur traceability QR code banayein'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {seasons.length > 0 && (
            <select
              className="select"
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              style={{ minWidth: '200px' }}
            >
              {seasons.map((s) => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.crop} ({s.farmName || s.variety || (lang === 'en' ? 'Farm' : 'Khet')})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setGenerateModalOpen(true)}
            className="btn btn-primary btn-sm"
          >
            + {lang === 'en' ? 'Generate New QR' : 'Naya QR Banayein'}
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Warning banner if user has NO seasons */}
      {!loading && seasons.length === 0 && (
        <div
          className="card p-4 mb-4"
          style={{
            backgroundColor: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div className="flex items-start gap-3">
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div className="flex-1">
              <h4 className="font-bold text-sm text-warning" style={{ color: '#92400e' }}>
                {lang === 'en'
                  ? 'No Active Farm Seasons Found'
                  : 'Koi Sakriya Khet ya Fasal (Season) Nahi Mila'}
              </h4>
              <p className="text-xs text-secondary mt-1">
                {lang === 'en'
                  ? 'To generate a verifiable QR passport, you must first register your farm and crop season.'
                  : 'QR Passport banane ke liye pehle apna khet aur fasal (Season) darj karna anivarya hai.'}
              </p>
              <Link
                to="/farmguard/farm-setup"
                className="btn btn-primary btn-sm mt-3"
                style={{ display: 'inline-block' }}
              >
                🌾 + {lang === 'en' ? 'Setup Farm & Season Now' : 'Naya Khet & Fasal Jodein'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Security Info Card */}
      <div className="alert alert-info mb-4">
        <span>🛡️</span>
        <div className="text-xs">
          <strong>{lang === 'en' ? 'Controlled Access & Privacy:' : 'Surakshit & Niyantrit Access:'}</strong>{' '}
          {lang === 'en'
            ? 'Scanning this QR code reveals only verified data based on your chosen access level. Private financial details remain protected. You can revoke this QR code at any time.'
            : 'QR scan karne par sirf vahi jankari dikhti hai jo aap chunenge (Public Summary me private bank ya sensitive details chhupi rehti hain). Kisi bhi samay aap QR ko raddh (revoke) kar sakte hain.'}
        </div>
      </div>

      {/* Display Recently Generated QR */}
      {generatedQR && (
        <div className="mb-6">
          <QRDisplay
            url={generatedQR.fullUrl}
            qrDataUrl={generatedQR.qrDataUrl}
            label={`${lang === 'en' ? 'Verified Passport' : 'Pramanik Passport'}: ${generatedQR.crop || 'Khet'}`}
          />
        </div>
      )}

      {/* Passports List */}
      <h3 className="section-title">
        📜 {lang === 'en' ? 'Active and Past QR Passports' : 'Sakriya aur Purane QR Passports'}
        {currentSeason ? ` — ${currentSeason.crop}` : ''}
      </h3>

      {loading ? (
        <LoadingSpinner message={lang === 'en' ? 'Fetching QR Passport records...' : 'QR Passport records prapt kiye ja rahe hain...'} />
      ) : passports.length === 0 ? (
        <EmptyState
          icon="🔑"
          title={lang === 'en' ? 'No QR Passports for this season' : 'Is khet ke liye koi QR Passport nahi mila'}
          subtitle={
            lang === 'en'
              ? 'No digital passport has been created yet. Generate a QR code to share verified records with buyers or banks.'
              : 'Is khet ke liye abhi tak koi digital passport generate nahi kiya gaya hai. Vyapari ya aadhikariyon ko khet ka verified record dikhane ke liye QR banayein.'
          }
          action={() => setGenerateModalOpen(true)}
          actionLabel={`+ ${lang === 'en' ? 'Create New QR Passport' : 'Naya QR Passport Banayein'}`}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {passports.map((p) => {
            const isRevoked = Boolean(p.revokedAt) || p.status === 'revoked'
            const isExpired = p.expiresAt && new Date(p.expiresAt) < new Date()
            const token = p.token || p.id || p._id
            const fullUrl = `${window.location.origin}/passport/${token}`

            return (
              <div key={token} className="card p-4 flex-between items-center flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-primary">
                      {p.accessLevel === 'public_summary'
                        ? (lang === 'en' ? '🌐 Public Summary' : '🌐 Sarvajanik (Public Summary)')
                        : (lang === 'en' ? '🔒 Stakeholders Only' : '🔒 Nijee (Stakeholders Only)')}
                    </span>
                    {isRevoked ? (
                      <span className="badge badge-error">{lang === 'en' ? 'Revoked' : 'Raddh (Revoked)'}</span>
                    ) : isExpired ? (
                      <span className="badge badge-warning">{lang === 'en' ? 'Expired' : 'Samapt (Expired)'}</span>
                    ) : (
                      <span className="badge badge-success">{lang === 'en' ? 'Active' : 'Sakriya (Active)'}</span>
                    )}
                  </div>

                  <p className="text-xs text-secondary mt-1">
                    {lang === 'en' ? 'Created' : 'Bana'}: {formatDate(p.createdAt)} •{' '}
                    {lang === 'en' ? 'Expiry' : 'Expiry'}: {p.expiresAt ? formatDate(p.expiresAt) : (lang === 'en' ? 'Permanent' : 'Kabhi Nahi (Permanent)')}
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
                    👁️ {lang === 'en' ? 'View' : 'Dekhein'}
                  </a>

                  {!isRevoked && !isExpired && (
                    <button
                      type="button"
                      onClick={() => handleOpenRevoke(token)}
                      className="btn btn-danger btn-sm"
                    >
                      {lang === 'en' ? 'Revoke' : 'Raddh Karein'}
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
        title={lang === 'en' ? '🔑 Generate New QR Passport' : '🔑 Naya QR Passport Generate Karein'}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setGenerateModalOpen(false)}
            >
              {lang === 'en' ? 'Cancel' : 'Raddh Karein'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={generating || seasons.length === 0}
              onClick={handleGenerateQR}
            >
              {generating
                ? (lang === 'en' ? '⏳ Generating...' : '⏳ QR Ban raha hai...')
                : `✓ ${lang === 'en' ? 'Generate QR Code' : 'QR Code Banayein'}`}
            </button>
          </>
        }
      >
        {seasons.length === 0 ? (
          <div className="alert alert-warning mb-2">
            <span>⚠️</span>
            <div className="text-xs">
              <p className="font-bold">
                {lang === 'en' ? 'No farm seasons found' : 'Koi fasal (season) nahi mili'}
              </p>
              <p className="mt-1">
                {lang === 'en'
                  ? 'Please add a farm and season first before generating a passport.'
                  : 'QR Passport banane se pehle kripya khet aur fasal setup karein.'}
              </p>
              <Link to="/farmguard/farm-setup" className="btn btn-primary btn-sm mt-2">
                🌾 + {lang === 'en' ? 'Add Farm & Season' : 'Khet & Fasal Jodein'}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">
                {lang === 'en' ? 'Select Farm Season *' : 'Khet / Fasal (Season) Chunein *'}
              </label>
              <select
                className="select"
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
              >
                {seasons.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>
                    {s.crop} ({s.farmName || s.variety || (lang === 'en' ? 'Farm' : 'Khet')})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {lang === 'en' ? 'Access Level (Privacy)' : 'Access Level (Suraksha Star) *'}
              </label>
              <select
                className="select"
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
              >
                <option value="public_summary">
                  🌐 {lang === 'en' ? 'Public Summary (Crop, Harvest, Receipts Count)' : 'Sarvajanik Summary (Fasal, katai, verified bills count)'}
                </option>
                <option value="stakeholders_only">
                  🔒 {lang === 'en' ? 'Stakeholders Only (Detailed Batai & Settlement)' : 'Batai / Malik Sahmati (Full details for stakeholders)'}
                </option>
              </select>
            </div>

            <div className="form-group mb-0">
              <label className="form-label">
                {lang === 'en' ? 'QR Validity / Expiry *' : 'QR Validity / Expiry Avadhi *'}
              </label>
              <select
                className="select"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
              >
                <option value="7">7 {lang === 'en' ? 'Days' : 'Din'}</option>
                <option value="30">30 {lang === 'en' ? 'Days (1 Month)' : 'Din (1 Mahina)'}</option>
                <option value="90">90 {lang === 'en' ? 'Days (3 Months / Full Season)' : 'Din (3 Mahine / Fasal Samapti Tak)'}</option>
                <option value="0">{lang === 'en' ? 'Permanent (Never Expires)' : 'Kabhi Expire Na Ho (Permanent)'}</option>
              </select>
            </div>
          </>
        )}
      </Modal>

      {/* Revoke Dialog */}
      <ConfirmDialog
        isOpen={revokeDialogOpen}
        title={lang === 'en' ? 'Revoke QR Passport' : 'QR Passport Raddh (Revoke) Karein'}
        message={
          lang === 'en'
            ? 'Are you sure you want to revoke this QR Passport? Once revoked, the link will no longer be accessible by anyone.'
            : 'Kya aap sach me is QR Passport ko raddh karna chahte hain? Iske baad koi bhi vyapari ya vyakti is link ko nahi dekh sakega.'
        }
        confirmText={lang === 'en' ? 'Yes, Revoke' : 'Haan, Revoke Karein'}
        cancelText={lang === 'en' ? 'Cancel' : 'Nahi, Chhod Dein'}
        danger={true}
        onConfirm={handleConfirmRevoke}
        onCancel={() => setRevokeDialogOpen(false)}
      />
    </div>
  )
}

export default PassportGenerator
