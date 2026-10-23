import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { expensesAPI, seasonsAPI, aiAPI } from '../../services/api'
import VoiceRecorder from '../../components/VoiceInput/VoiceRecorder'
import AttachmentUpload from '../../components/Expenses/AttachmentUpload'
import Alert from '../../components/UI/Alert'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import { rupeesToPaise, paiseToRupees } from '../../utils/formatters'

const CATEGORIES = [
  { value: 'seeds', label: '🌱 Beej (Seeds)' },
  { value: 'fertilizer', label: '🧪 Khaad (Fertilizer/DAP/Urea)' },
  { value: 'pesticide', label: '🧴 Keetnashak (Pesticide/Spray)' },
  { value: 'labour', label: '👨‍🌾 Majdoori (Labour)' },
  { value: 'machinery', label: '🚜 Tractor / Kiraya / Thresher' },
  { value: 'diesel', label: '⛽ Diesel / Petrol' },
  { value: 'irrigation', label: '💧 Sinchai (Irrigation)' },
  { value: 'transport', label: '🚚 Gadi Kiraya / Transport' },
  { value: 'packaging', label: '📦 Bori / Packaging' },
  { value: 'other', label: '🏷️ Anya Kharcha' }
]

export function ExpenseForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')

  const [activeTab, setActiveTab] = useState('voice') // 'voice' | 'manual'
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [parsingVoice, setParsingVoice] = useState(false)
  const [error, setError] = useState(null)
  const [savedExpenseId, setSavedExpenseId] = useState(null)
  const [showSuccessActions, setShowSuccessActions] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    seasonId: '',
    category: 'fertilizer',
    description: '',
    amountRupees: '',
    date: new Date().toISOString().split('T')[0],
    crop: '',
    quantity: '',
    unit: 'Kg',
    paymentMethod: 'Cash',
    paidTo: '',
    notes: '',
    voiceTranscript: '',
    confidence: null
  })

  useEffect(() => {
    loadInitialData()
  }, [editId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const seasonsRes = await seasonsAPI.list()
      const list = seasonsRes.seasons || seasonsRes.data || (Array.isArray(seasonsRes) ? seasonsRes : [])
      setSeasons(list)

      if (editId) {
        setActiveTab('manual')
        const exp = await expensesAPI.get(editId)
        const d = exp.expense || exp.data || exp
        setFormData({
          seasonId: d.seasonId || (list[0]?.id || list[0]?._id),
          category: d.category || 'other',
          description: d.description || '',
          amountRupees: d.isPaise ? paiseToRupees(d.amount) : d.amount,
          date: d.date ? d.date.split('T')[0] : new Date().toISOString().split('T')[0],
          crop: d.crop || '',
          quantity: d.quantity || '',
          unit: d.unit || 'Kg',
          paymentMethod: d.paymentMethod || 'Cash',
          paidTo: d.paidTo || '',
          notes: d.notes || '',
          voiceTranscript: d.voiceTranscript || '',
          confidence: null
        })
      } else if (list.length > 0) {
        setFormData((prev) => ({
          ...prev,
          seasonId: list[0].id || list[0]._id,
          crop: list[0].crop || ''
        }))
      }
    } catch (err) {
      setError('Form data load nahi ho saka.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Voice Parse
  const handleVoiceTranscript = async (transcript) => {
    try {
      setParsingVoice(true)
      setError(null)
      const res = await aiAPI.voiceParse(transcript, 'hi')
      const parsed = res.parsed || res.data || res

      setFormData((prev) => ({
        ...prev,
        voiceTranscript: transcript,
        category: parsed.category || prev.category,
        description: parsed.description || transcript,
        amountRupees: parsed.amount || parsed.amountRupees || prev.amountRupees,
        date: parsed.date || prev.date,
        crop: parsed.crop || prev.crop,
        quantity: parsed.quantity || prev.quantity,
        unit: parsed.unit || prev.unit,
        paidTo: parsed.paidTo || prev.paidTo,
        confidence: parsed.confidence || 0.85
      }))
    } catch (err) {
      console.warn('Voice parse API error, using raw transcript:', err)
      // Fallback: set description to transcript
      setFormData((prev) => ({
        ...prev,
        voiceTranscript: transcript,
        description: transcript
      }))
    } finally {
      setParsingVoice(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.amountRupees || Number(formData.amountRupees) <= 0) {
      setError('Kripya kharche ki sahi rashi (Amount in ₹) darj karein.')
      return
    }

    if (!formData.description.trim()) {
      setError('Kripya kharche ka vivaran (Description) likhein.')
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        seasonId: formData.seasonId,
        category: formData.category,
        description: formData.description,
        amount: rupeesToPaise(formData.amountRupees), // store as paise
        isPaise: true,
        date: formData.date,
        crop: formData.crop,
        quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
        unit: formData.unit,
        paymentMethod: formData.paymentMethod,
        paidTo: formData.paidTo,
        notes: formData.notes,
        voiceTranscript: formData.voiceTranscript
      }

      let res
      if (editId) {
        res = await expensesAPI.update(editId, payload)
        setSavedExpenseId(editId)
      } else {
        res = await expensesAPI.create(payload)
        const newId = res.id || res._id || (res.expense && (res.expense.id || res.expense._id))
        setSavedExpenseId(newId)
      }

      setShowSuccessActions(true)
    } catch (err) {
      setError(err.message || 'Kharcha darj karne me truti hui. Dobara koshish karein.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetForNew = () => {
    setSavedExpenseId(null)
    setShowSuccessActions(false)
    setFormData((prev) => ({
      ...prev,
      description: '',
      amountRupees: '',
      quantity: '',
      paidTo: '',
      notes: '',
      voiceTranscript: '',
      confidence: null
    }))
  }

  if (loading) {
    return <LoadingSpinner message="Kharcha form khul raha hai..." />
  }

  return (
    <div className="container animate-fadeIn" style={{ maxWidth: '640px' }}>
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">
            {editId ? '✏️ Kharcha Sudharein' : '🎙️ Naya Kharcha Darj Karein'}
          </h2>
          <p className="page-subtitle">Aawaz se bolkar ya likhkar apna hisab surakshit karein</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Mode Tabs */}
      {!editId && !showSuccessActions && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`btn ${activeTab === 'voice' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1 }}
          >
            🎙️ Bolkar Likhein (Voice Entry)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`btn ${activeTab === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1 }}
          >
            ✍️ Hath Se Bharein (Manual Entry)
          </button>
        </div>
      )}

      {/* Voice Recorder Block */}
      {!showSuccessActions && activeTab === 'voice' && !editId && (
        <div className="mb-4">
          <VoiceRecorder onTranscript={handleVoiceTranscript} />
          {parsingVoice && (
            <div className="mt-2 text-center text-sm font-semibold text-primary">
              ⏳ AI aawaz samajh raha hai... Kripya pratiksha karein
            </div>
          )}
        </div>
      )}

      {/* Success View with Receipt Upload Option */}
      {showSuccessActions ? (
        <div className="card p-6 text-center animate-fadeIn">
          <span style={{ fontSize: '3rem' }}>✅</span>
          <h3 className="font-bold text-xl text-primary mt-2">Kharcha Safaltapoorvak Darj Ho Gaya!</h3>
          <p className="text-sm text-secondary mb-4">
            Aapka hisab update ho gaya hai. Abhi raseed ya bill upload karke isse verified banayein.
          </p>

          <div className="mb-4 text-left">
            <AttachmentUpload expenseId={savedExpenseId} />
          </div>

          <div className="flex-center gap-3 mt-4">
            <button
              type="button"
              onClick={handleResetForNew}
              className="btn btn-outline"
            >
              + Aur Kharcha Jodein
            </button>
            <button
              type="button"
              onClick={() => navigate('/farmguard')}
              className="btn btn-primary"
            >
              📒 Diary Dekhein
            </button>
          </div>
        </div>
      ) : (
        /* The Expense Form */
        <div className="card p-6">
          {formData.voiceTranscript && (
            <div className="p-3 mb-4 rounded bg-surface-2 text-xs text-secondary border">
              <strong>🎙️ Record Ki Gayi Aawaz:</strong> "{formData.voiceTranscript}"
              {formData.confidence && (
                <span className="badge badge-success ml-2">
                  AI Confidence: {Math.round(formData.confidence * 100)}%
                </span>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-2 gap-3">
              <div className="form-group">
                <label className="form-label">Fasal / Season *</label>
                <select
                  name="seasonId"
                  className="select"
                  value={formData.seasonId}
                  onChange={handleChange}
                  required
                >
                  {seasons.map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.crop} ({s.farmName || 'Khet'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Category (Kharcha Kism) *</label>
                <select
                  name="category"
                  className="select"
                  value={formData.category}
                  onChange={handleChange}
                  required
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Kharche Ka Vivaran (Description) *</label>
              <input
                type="text"
                name="description"
                className={`input ${!formData.description ? 'input-warning' : ''}`}
                placeholder="Jaise: 2 Bori IFFCO DAP khareedi"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-2 gap-3">
              <div className="form-group">
                <label className="form-label">Kul Rashi (Amount in ₹) *</label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontWeight: 'bold',
                      color: 'var(--color-primary)'
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    name="amountRupees"
                    className="input"
                    style={{ paddingLeft: '28px', fontWeight: 'bold', fontSize: '1.1rem' }}
                    placeholder="2700"
                    value={formData.amountRupees}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tareekh (Date) *</label>
                <input
                  type="date"
                  name="date"
                  className="input"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-3 gap-3">
              <div className="form-group">
                <label className="form-label">Matra (Quantity)</label>
                <input
                  type="number"
                  step="0.01"
                  name="quantity"
                  className="input"
                  placeholder="2"
                  value={formData.quantity}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ikai (Unit)</label>
                <select name="unit" className="select" value={formData.unit} onChange={handleChange}>
                  <option value="Bori">Bori (Bags)</option>
                  <option value="Kg">Kg (Kilogram)</option>
                  <option value="Quintal">Quintal (क्विंटल)</option>
                  <option value="Litre">Litre (लीटर)</option>
                  <option value="Ghanta">Ghanta (Hours)</option>
                  <option value="Dihadi">Dihadi (Days)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Bhugtan Madhyam</label>
                <select name="paymentMethod" className="select" value={formData.paymentMethod} onChange={handleChange}>
                  <option value="Cash">Rokad (Cash)</option>
                  <option value="UPI">UPI / PhonePe / GPay</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Udhaar">Udhaar (Credit)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Kisko Diya (Paid To / Dukan Ka Naam)</label>
              <input
                type="text"
                name="paidTo"
                className="input"
                placeholder="Jaise: Kisan Krishi Seva Kendra, Sehore"
                value={formData.paidTo}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Anya Tiphani (Notes)</label>
              <textarea
                name="notes"
                className="textarea"
                placeholder="Kharche se judi koi aur jankari..."
                value={formData.notes}
                onChange={handleChange}
                style={{ minHeight: '70px' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.75rem' }}
            >
              {submitting ? '⏳ Kharcha Darj Ho Raha Hai...' : '✓ Kharcha Diary Me Save Karein'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default ExpenseForm
