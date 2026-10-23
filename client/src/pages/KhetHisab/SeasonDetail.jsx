import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { seasonsAPI, expensesAPI, settlementAPI, auditAPI, consistencyAPI } from '../../services/api'
import ExpenseCard from '../../components/Expenses/ExpenseCard'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import Alert from '../../components/UI/Alert'
import { formatRupees, formatDate } from '../../utils/formatters'

export function SeasonDetail() {
  const { seasonId } = useParams()
  const navigate = useNavigate()

  const [season, setSeason] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [settlement, setSettlement] = useState(null)
  const [consistencyIssues, setConsistencyIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAudit, setShowAudit] = useState(false)
  const [runningConsistency, setRunningConsistency] = useState(false)

  useEffect(() => {
    if (seasonId) {
      loadAllDetails()
    }
  }, [seasonId])

  const loadAllDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const [seasonRes, expensesRes, auditRes, settlementRes, consistencyRes] = await Promise.allSettled([
        seasonsAPI.get(seasonId),
        expensesAPI.list({ seasonId }),
        auditAPI.get(seasonId),
        settlementAPI.get(seasonId),
        consistencyAPI.get(seasonId)
      ])

      if (seasonRes.status === 'fulfilled' && seasonRes.value) {
        setSeason(seasonRes.value.season || seasonRes.value.data || seasonRes.value)
      }

      if (expensesRes.status === 'fulfilled' && expensesRes.value) {
        setExpenses(expensesRes.value.expenses || expensesRes.value.data || (Array.isArray(expensesRes.value) ? expensesRes.value : []))
      }

      if (auditRes.status === 'fulfilled' && auditRes.value) {
        setAuditLogs(auditRes.value.logs || auditRes.value.data || (Array.isArray(auditRes.value) ? auditRes.value : []))
      }

      if (settlementRes.status === 'fulfilled' && settlementRes.value) {
        setSettlement(settlementRes.value.settlement || settlementRes.value.data || settlementRes.value)
      }

      if (consistencyRes.status === 'fulfilled' && consistencyRes.value) {
        setConsistencyIssues(consistencyRes.value.issues || consistencyRes.value.data || (Array.isArray(consistencyRes.value) ? consistencyRes.value : []))
      }
    } catch (err) {
      setError('Season detail load nahi ho saki.')
    } finally {
      setLoading(false)
    }
  }

  const handleRunConsistency = async () => {
    try {
      setRunningConsistency(true)
      const res = await consistencyAPI.run(seasonId)
      setConsistencyIssues(res.issues || res.data || (Array.isArray(res) ? res : []))
    } catch (err) {
      alert('Consistency check asafal raha.')
    } finally {
      setRunningConsistency(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Khet season detail load ho rahi hai..." />
  }

  if (!season) {
    return (
      <div className="container p-6 text-center">
        <Alert type="error" message="Season nahi mila." />
        <Link to="/khet-hisab" className="btn btn-primary mt-3">
          ⬅ Ledger Par Wapas Jayein
        </Link>
      </div>
    )
  }

  const totalExpenseAmount = expenses.reduce((a, b) => a + (b.amount || 0), 0)

  return (
    <div className="animate-fadeIn">
      {/* Top Navigation Row */}
      <div className="page-header mb-4">
        <div>
          <Link to="/khet-hisab" className="text-xs text-secondary font-medium">
            ⬅ Khet Hisab Ledger Par Wapas
          </Link>
          <h2 className="page-title mt-1">
            🌱 {season.crop} — {season.farmName || 'Khet'}
          </h2>
          <p className="page-subtitle">
            Plot: {season.plotName || 'Plot 1'} • Samay: {formatDate(season.startDate)} se {formatDate(season.expectedHarvestDate || season.endDate)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/khet-hisab/${seasonId}/disputes`} className="btn btn-outline btn-sm text-error" style={{ borderColor: 'var(--color-error)' }}>
            ⚠️ Vivad Kendra (Disputes)
          </Link>
          <Link to="/qr" className="btn btn-outline btn-sm">
            🔑 QR Passport
          </Link>
          <button
            type="button"
            onClick={handleRunConsistency}
            disabled={runningConsistency}
            className="btn btn-primary btn-sm"
          >
            {runningConsistency ? '⏳ Jaanch ho rahi...' : '🔍 Consistency Check'}
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Consistency Issues Banner */}
      {consistencyIssues.length > 0 && (
        <Alert
          type="warning"
          title="Audit Visangatiyan (Consistency Alerts):"
          message={`${consistencyIssues.length} aisi cheezein hain jinme sudhar aavashyak hai.`}
        >
          <ul className="text-xs mt-2 pl-4">
            {consistencyIssues.map((issue, idx) => (
              <li key={idx} className="mt-1">{issue.message || JSON.stringify(issue)}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Settlement Snapshot */}
      <div className="card p-5 mb-5" style={{ backgroundColor: 'var(--color-surface-2)' }}>
        <h3 className="section-title text-base mb-3">🤝 Settlement Snapshot</h3>
        <div className="grid grid-3 gap-3">
          <div>
            <span className="text-xs text-secondary">Kul Lagat (Allowable Expenses):</span>
            <div className="font-bold text-lg text-primary">{formatRupees(totalExpenseAmount)}</div>
          </div>
          <div>
            <span className="text-xs text-secondary">Kul Upaj Bikri (Gross Revenue):</span>
            <div className="font-bold text-lg text-success">
              {formatRupees(settlement?.grossSales || 0, settlement?.isPaise ?? false)}
            </div>
          </div>
          <div>
            <span className="text-xs text-secondary">Batai Samjhauta:</span>
            <div className="font-bold text-base text-accent">{season.agreementTerms || '50-50 Batai'}</div>
          </div>
        </div>
      </div>

      {/* Expenses with Edit capabilities */}
      <div className="mb-5">
        <div className="flex-between items-center mb-3">
          <h3 className="section-title mb-0">📒 Sabhi Kharch ({expenses.length})</h3>
          <Link to="/farmguard/new" className="btn btn-primary btn-sm">
            + Naya Kharcha
          </Link>
        </div>

        {expenses.length === 0 ? (
          <p className="text-sm text-secondary">Is season me koi kharcha nahi hai.</p>
        ) : (
          <div>
            {expenses.map((exp) => (
              <ExpenseCard
                key={exp.id || exp._id}
                expense={exp}
                showActions={true}
                onEdit={(e) => navigate(`/farmguard/new?edit=${e.id || e._id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Audit History Expandable Section */}
      <div className="card p-4">
        <div
          className="flex-between items-center"
          style={{ cursor: 'pointer' }}
          onClick={() => setShowAudit(!showAudit)}
        >
          <h3 className="section-title text-base mb-0">
            🛡️ Khet Audit History (Badlavon Ka Record)
          </h3>
          <button type="button" className="btn btn-ghost btn-sm">
            {showAudit ? '▲ Chhupayein' : '▼ Dekhein'}
          </button>
        </div>

        {showAudit && (
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-secondary">Abhi tak koi audit event darj nahi hua hai.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {auditLogs.map((log, i) => (
                  <div key={log.id || i} className="p-2 bg-surface-2 rounded text-xs">
                    <div className="flex-between font-semibold">
                      <span>{log.action || 'Badlav'} — {log.entity || 'Record'}</span>
                      <span className="text-muted">{formatDate(log.timestamp || log.createdAt)}</span>
                    </div>
                    <div className="text-secondary mt-1">
                      Karta: {log.user || log.performedBy || 'System'} • {log.details || log.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SeasonDetail
