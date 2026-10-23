import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { expensesAPI, seasonsAPI } from '../../services/api'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import EmptyState from '../../components/UI/EmptyState'
import Alert from '../../components/UI/Alert'
import Modal from '../../components/UI/Modal'
import { formatRupees, formatDate } from '../../utils/formatters'

export function DisputeCenter() {
  const { seasonId } = useParams()
  const [seasons, setSeasons] = useState([])
  const [activeSeasonId, setActiveSeasonId] = useState(seasonId || '')
  const [disputedExpenses, setDisputedExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Resolution Modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [submittingResolve, setSubmittingResolve] = useState(false)

  // Response Form state
  const [responseText, setResponseText] = useState('')
  const [respondingId, setRespondingId] = useState(null)

  useEffect(() => {
    loadSeasons()
  }, [])

  useEffect(() => {
    if (activeSeasonId) {
      loadDisputes(activeSeasonId)
    }
  }, [activeSeasonId])

  const loadSeasons = async () => {
    try {
      const res = await seasonsAPI.list()
      const list = res.seasons || res.data || (Array.isArray(res) ? res : [])
      setSeasons(list)
      if (!activeSeasonId && list.length > 0) {
        setActiveSeasonId(list[0].id || list[0]._id)
      }
    } catch (_) {}
  }

  const loadDisputes = async (sId) => {
    try {
      setLoading(true)
      setError(null)
      const res = await expensesAPI.list({ seasonId: sId, status: 'disputed' })
      const list = res.expenses || res.data || (Array.isArray(res) ? res : [])
      setDisputedExpenses(list)
    } catch (err) {
      setError('Vivad records prapt nahi ho sake.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenResolve = (expense) => {
    setSelectedDispute(expense)
    setResolutionNotes('')
    setResolveModalOpen(true)
  }

  const handleResolveSubmit = async () => {
    if (!selectedDispute) return
    try {
      setSubmittingResolve(true)
      await expensesAPI.review(selectedDispute.id || selectedDispute._id, 'acknowledged', resolutionNotes || 'Resolved amicably')
      setSuccess('Vivad sulajh gaya aur kharcha acknowledge kiya gaya!')
      setResolveModalOpen(false)
      loadDisputes(activeSeasonId)
    } catch (err) {
      setError(err.message || 'Vivad suljhane me truti hui.')
    } finally {
      setSubmittingResolve(false)
    }
  }

  const handleAddResponse = async (expenseId) => {
    if (!responseText.trim()) return
    try {
      // Review with notes or update expense notes
      await expensesAPI.review(expenseId, 'under_review', responseText)
      setSuccess('Aapka jawab darj ho gaya!')
      setResponseText('')
      setRespondingId(null)
      loadDisputes(activeSeasonId)
    } catch (err) {
      setError('Jawab darj karne me truti hui.')
    }
  }

  return (
    <div className="container animate-fadeIn" style={{ maxWidth: '820px' }}>
      <div className="page-header mb-4">
        <div>
          <Link to="/khet-hisab" className="text-xs text-secondary font-medium">
            ⬅ Khet Hisab Par Wapas
          </Link>
          <h2 className="page-title mt-1">⚠️ Vivad Kendra (Dispute Center)</h2>
          <p className="page-subtitle">
            Kharche ya aamadani par uthi aaptiyon ko aapas me baatcheet se suljhayein
          </p>
        </div>

        {seasons.length > 0 && (
          <div>
            <select
              className="select"
              value={activeSeasonId}
              onChange={(e) => setActiveSeasonId(e.target.value)}
              style={{ minWidth: '200px' }}
            >
              {seasons.map((s) => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.crop} ({s.farmName || 'Khet'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {loading ? (
        <LoadingSpinner message="Vivad records khoje ja rahe hain..." />
      ) : disputedExpenses.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="Koi vivad (Dispute) nahi hai"
          subtitle="Is fasal ke sabhi kharche shanti aur sahmati se darj hain. Koi aniyamitta nahi hai."
          action={() => (window.location.href = '/khet-hisab')}
          actionLabel="Khet Hisab Dekhein"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {disputedExpenses.map((exp) => (
            <div
              key={exp.id || exp._id}
              className="card p-5"
              style={{ borderLeft: '4px solid var(--color-error)' }}
            >
              <div className="flex-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="badge badge-error">⚠️ Vivadit (Open Dispute)</span>
                  <span className="text-xs text-muted">ID: #{String(exp.id || exp._id).slice(-6)}</span>
                </div>
                <div className="font-bold text-base text-primary">
                  {formatRupees(exp.amount, exp.isPaise ?? true)}
                </div>
              </div>

              <h4 className="font-bold text-lg mb-1">{exp.description || exp.category}</h4>
              <p className="text-xs text-secondary mb-3">
                Tareekh: {formatDate(exp.date)} • Category: {exp.category} • Paid To: {exp.paidTo || '—'}
              </p>

              {/* Dispute Reason Box */}
              <div className="p-3 bg-surface-2 rounded mb-3 text-sm" style={{ borderLeft: '3px solid var(--color-warning)' }}>
                <strong className="text-error">Aapti Ka Karan:</strong>
                <p className="mt-1 text-secondary">
                  "{exp.disputeReason || exp.disputeNotes || 'Kharche ki rashi ya gunvatta par asahmati darj ki gayi hai.'}"
                </p>
                <div className="text-xs text-muted mt-2">
                  Darj Karta: <strong>{exp.disputedBy || 'Sajhedar (Partner)'}</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex-between items-center pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => setRespondingId(respondingId === (exp.id || exp._id) ? null : (exp.id || exp._id))}
                  className="btn btn-ghost btn-sm"
                >
                  💬 Jawab Likhein (Add Response)
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenResolve(exp)}
                  className="btn btn-primary btn-sm"
                >
                  ✓ Suljhayein (Resolve & Approve)
                </button>
              </div>

              {/* Response input drawer */}
              {respondingId === (exp.id || exp._id) && (
                <div className="mt-3 pt-3 border-t">
                  <textarea
                    className="textarea"
                    placeholder="Apna paksh ya safaai yahan likhein (jaise: bill dukan se verify kar liya hai)..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => handleAddResponse(exp.id || exp._id)}
                      className="btn btn-primary btn-sm"
                    >
                      Jawab Bhejein
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title="✓ Vivad Suljhayein (Resolve Dispute)"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setResolveModalOpen(false)}
            >
              Raddh Karein
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={submittingResolve}
              onClick={handleResolveSubmit}
            >
              {submittingResolve ? '⏳ Sulajh raha hai...' : '✓ Sahmati Ke Sath Resolve Karein'}
            </button>
          </>
        }
      >
        <p className="text-sm text-secondary mb-3">
          Kya donon paksh is kharche par sehmat hain? Resolution notes darj karke is kharche ko tasdeeq karein:
        </p>
        <textarea
          className="textarea"
          placeholder="Samadhan vivaran (jaise: 200 rupaye kam karke sahmati bani)..."
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
        />
      </Modal>
    </div>
  )
}

export default DisputeCenter
