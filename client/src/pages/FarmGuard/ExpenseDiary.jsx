import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { expensesAPI, seasonsAPI, consistencyAPI } from '../../services/api'
import ExpenseCard from '../../components/Expenses/ExpenseCard'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import EmptyState from '../../components/UI/EmptyState'
import Alert from '../../components/UI/Alert'
import ConfirmDialog from '../../components/UI/ConfirmDialog'
import Modal from '../../components/UI/Modal'
import { formatRupees } from '../../utils/formatters'

const CATEGORIES = [
  { id: 'all', label: 'Sabhi Kharch' },
  { id: 'seeds', label: '🌱 Beej' },
  { id: 'fertilizer', label: '🧪 Khaad' },
  { id: 'pesticide', label: '🧴 Dawa' },
  { id: 'labour', label: '👨‍🌾 Majdoori' },
  { id: 'machinery', label: '🚜 Machine' },
  { id: 'diesel', label: '⛽ Diesel' },
  { id: 'transport', label: '🚚 Kiraya' },
  { id: 'other', label: '📦 Anya' }
]

export function ExpenseDiary() {
  const navigate = useNavigate()
  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Consistency & Dialogs
  const [consistencyAlerts, setConsistencyAlerts] = useState([])
  const [disputeModalOpen, setDisputeModalOpen] = useState(false)
  const [activeExpenseForDispute, setActiveExpenseForDispute] = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [submittingDispute, setSubmittingDispute] = useState(false)

  useEffect(() => {
    loadSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeasonId) {
      loadExpenses(selectedSeasonId)
      loadConsistency(selectedSeasonId)
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

  const loadExpenses = async (seasonId) => {
    try {
      setLoading(true)
      setError(null)
      const res = await expensesAPI.list({ seasonId })
      const list = res.expenses || res.data || (Array.isArray(res) ? res : [])
      setExpenses(list)
    } catch (err) {
      setError('Kharcha diary load karne me samasya aayi.')
    } finally {
      setLoading(false)
    }
  }

  const loadConsistency = async (seasonId) => {
    try {
      const res = await consistencyAPI.get(seasonId)
      const issues = res.issues || res.alerts || (Array.isArray(res) ? res : [])
      setConsistencyAlerts(issues)
    } catch (_) {}
  }

  // Handle Review (Acknowledge)
  const handleReview = async (expense) => {
    try {
      await expensesAPI.review(expense.id || expense._id, 'acknowledged', 'Verified by farmer')
      loadExpenses(selectedSeasonId)
    } catch (err) {
      alert(err.message || 'Review karne me truti hui.')
    }
  }

  // Handle Dispute
  const handleOpenDispute = (expense) => {
    setActiveExpenseForDispute(expense)
    setDisputeReason('')
    setDisputeModalOpen(true)
  }

  const handleSubmitDispute = async () => {
    if (!disputeReason.trim() || !activeExpenseForDispute) return
    try {
      setSubmittingDispute(true)
      await expensesAPI.dispute(activeExpenseForDispute.id || activeExpenseForDispute._id, disputeReason)
      setDisputeModalOpen(false)
      loadExpenses(selectedSeasonId)
    } catch (err) {
      alert(err.message || 'Vivad darj karne me truti hui.')
    } finally {
      setSubmittingDispute(false)
    }
  }

  // Filtered List
  const filteredExpenses = expenses.filter((exp) => {
    const matchCategory = categoryFilter === 'all' || (exp.category || '').toLowerCase() === categoryFilter.toLowerCase()
    const matchStatus = statusFilter === 'all' || (exp.reviewStatus || exp.status || 'pending') === statusFilter
    const matchSearch = !searchTerm || (
      (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.category && exp.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.paidTo && exp.paidTo.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    return matchCategory && matchStatus && matchSearch
  })

  // Summary Metrics
  const getExpensePaise = (e) => {
    if (e.amountPaise != null) return Number(e.amountPaise);
    if (e.amount != null) return e.isPaise === false ? Math.round(Number(e.amount) * 100) : Number(e.amount);
    if (e.amountRupees != null) return Math.round(Number(e.amountRupees) * 100);
    return 0;
  };

  const totalAmount = expenses.reduce((acc, curr) => acc + getExpensePaise(curr), 0)
  const withReceiptsCount = expenses.filter((e) => e.attachments?.length || e.hasReceipt || e.receiptUrl).length
  const missingReceiptsCount = expenses.length - withReceiptsCount
  const pendingReviewCount = expenses.filter((e) => (e.reviewStatus || e.status || 'pending') === 'pending').length

  const selectedSeason = seasons.find((s) => (s.id || s._id) === selectedSeasonId)

  return (
    <div className="animate-fadeIn">
      {/* Header and Season Selector */}
      <div className="page-header mb-3">
        <div>
          <h2 className="page-title">📒 FarmGuard: Khet Kharcha Diary</h2>
          <p className="page-subtitle">
            Khet me hua har ek kharcha saboot ke sath darj karein
          </p>
        </div>

        <div className="flex items-center gap-2">
          {seasons.length > 0 && (
            <select
              className="select"
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              style={{ minWidth: '220px' }}
            >
              {seasons.map((s) => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.crop} ({s.farmName || 'Khet'} - {s.plotName || 'Plot'})
                </option>
              ))}
            </select>
          )}

          <Link to="/farmguard/new" className="btn btn-primary">
            + Naya Kharcha
          </Link>
        </div>
      </div>

      {/* Consistency Warnings */}
      {consistencyAlerts.length > 0 && (
        <Alert
          type="warning"
          title="Diary Audit Alert:"
          message={`${consistencyAlerts.length} aniyamittaayein payi gayi hain (jaise missing bills ya duplicate entries).`}
        />
      )}

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Summary Strip */}
      <div className="card p-4 mb-4">
        <div className="grid grid-4 gap-3 text-center">
          <div>
            <div className="text-xs text-secondary font-medium">Kul Kharcha (Total)</div>
            <div className="text-xl font-bold text-primary mt-1">{formatRupees(totalAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-secondary font-medium">Bill Ke Sath (Receipts)</div>
            <div className="text-xl font-bold text-success mt-1">{withReceiptsCount}</div>
          </div>
          <div>
            <div className="text-xs text-secondary font-medium">Bina Bill (Missing)</div>
            <div className="text-xl font-bold text-warning mt-1">{missingReceiptsCount}</div>
          </div>
          <div>
            <div className="text-xs text-secondary font-medium">Jaanch Baaki (Pending)</div>
            <div className="text-xl font-bold text-accent mt-1">{pendingReviewCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 mb-4">
        <div className="flex-between items-center gap-3 flex-wrap mb-3">
          <input
            type="text"
            className="input"
            placeholder="🔍 Kharcha khojein (description, beej, majdoor...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '320px' }}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary">Status:</span>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="all">Sabhi Status</option>
              <option value="pending">⏳ Pending (Jaanch Baaki)</option>
              <option value="acknowledged">✓ Acknowledged (Manya)</option>
              <option value="disputed">⚠️ Disputed (Vivadit)</option>
            </select>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 flex-wrap" style={{ overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`chip ${categoryFilter === cat.id ? 'chip-active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expense List */}
      {loading ? (
        <LoadingSpinner message="Kharcha diary khul rahi hai..." />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          icon="📒"
          title="Koi kharcha nahi mila"
          subtitle={
            categoryFilter !== 'all' || statusFilter !== 'all' || searchTerm
              ? 'Chune gaye filters ke anuroop koi record nahi mila. Filters hatakar dekhein.'
              : 'Is fasal ke liye abhi tak koi kharcha darj nahi kiya gaya hai.'
          }
          action={() => navigate('/farmguard/new')}
          actionLabel="+ Naya Kharcha Jodein"
        />
      ) : (
        <div>
          {filteredExpenses.map((exp) => (
            <ExpenseCard
              key={exp.id || exp._id}
              expense={exp}
              onReview={handleReview}
              onDispute={handleOpenDispute}
              onEdit={(e) => navigate(`/farmguard/new?edit=${e.id || e._id}`)}
            />
          ))}
        </div>
      )}

      {/* Dispute Modal */}
      <Modal
        isOpen={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
        title="⚠️ Kharcha Vivad (Dispute) Darj Karein"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setDisputeModalOpen(false)}
            >
              Raddh Karein
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={submittingDispute || !disputeReason.trim()}
              onClick={handleSubmitDispute}
            >
              {submittingDispute ? '⏳ Vivad darj ho raha...' : 'Vivad Darj Karein'}
            </button>
          </>
        }
      >
        <p className="text-sm text-secondary mb-3">
          Aap kharche par aapti kyon jata rahe hain? Kripya karan spasht karein (jaise: rate jyada hai, beej nahi aaya, galat jankari):
        </p>
        <textarea
          className="textarea"
          placeholder="Yahan aapti ka karan likhein..."
          value={disputeReason}
          onChange={(e) => setDisputeReason(e.target.value)}
          required
        />
      </Modal>
    </div>
  )
}

export default ExpenseDiary
