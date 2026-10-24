import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { seasonsAPI, expensesAPI, settlementAPI, harvestAPI, consistencyAPI, qrAPI } from '../../services/api'
import ExpenseCard from '../../components/Expenses/ExpenseCard'
import QRDisplay from '../../components/QR/QRDisplay'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import EmptyState from '../../components/UI/EmptyState'
import Alert from '../../components/UI/Alert'
import Modal from '../../components/UI/Modal'
import { formatRupees, formatDate } from '../../utils/formatters'

export function SeasonLedger() {
  const navigate = useNavigate()
  const [seasons, setSeasons] = useState([])
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [runningConsistency, setRunningConsistency] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Season data
  const [seasonData, setSeasonData] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [harvestRecord, setHarvestRecord] = useState(null)
  const [settlement, setSettlement] = useState(null)
  const [consistencyResult, setConsistencyResult] = useState(null)

  // Owner QR Passport State
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [generatingQR, setGeneratingQR] = useState(false)
  const [settlementQR, setSettlementQR] = useState(null)

  useEffect(() => {
    loadSeasons()
  }, [])

  useEffect(() => {
    if (selectedSeasonId) {
      loadSeasonLedger(selectedSeasonId)
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

  const loadSeasonLedger = async (seasonId) => {
    try {
      setLoading(true)
      setError(null)

      const [seasonRes, expensesRes, harvestRes, settlementRes] = await Promise.allSettled([
        seasonsAPI.get(seasonId),
        expensesAPI.list({ seasonId }),
        harvestAPI.get(seasonId),
        settlementAPI.get(seasonId)
      ])

      if (seasonRes.status === 'fulfilled' && seasonRes.value) {
        setSeasonData(seasonRes.value.season || seasonRes.value.data || seasonRes.value)
      }

      if (expensesRes.status === 'fulfilled' && expensesRes.value) {
        const rawExpenses = expensesRes.value.expenses || expensesRes.value.data || (Array.isArray(expensesRes.value) ? expensesRes.value : [])
        setExpenses(rawExpenses)
      }

      if (harvestRes.status === 'fulfilled' && harvestRes.value) {
        setHarvestRecord(harvestRes.value.harvest || harvestRes.value.data || harvestRes.value)
      } else {
        setHarvestRecord(null)
      }

      if (settlementRes.status === 'fulfilled' && settlementRes.value) {
        setSettlement(settlementRes.value.settlement || settlementRes.value.data || settlementRes.value)
      } else {
        setSettlement(null)
      }
    } catch (err) {
      setError('Season ledger data load karne me truti hui.')
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateSettlement = async () => {
    if (!selectedSeasonId) return
    try {
      setCalculating(true)
      setError(null)
      const res = await settlementAPI.calculate(selectedSeasonId)
      setSettlement(res.settlement || res.data || res)
      setSuccessMsg('Batai hisab (Settlement) safaltapoorvak compute ho gaya!')
    } catch (err) {
      setError(err.message || 'Settlement calculate nahi ho saka.')
    } finally {
      setCalculating(false)
    }
  }

  const handleAcknowledge = async (role) => {
    try {
      await settlementAPI.acknowledge(selectedSeasonId, role)
      setSuccessMsg(`${role === 'owner' ? 'Khet Malik' : 'Bataidar/Operator'} dwara hisaab tasdeeq (Acknowledge) kiya gaya!`)
      loadSeasonLedger(selectedSeasonId)
    } catch (err) {
      setError(err.message || 'Tasdeeq karne me truti hui.')
    }
  }

  const handleRunConsistency = async () => {
    try {
      setRunningConsistency(true)
      const res = await consistencyAPI.run(selectedSeasonId)
      setConsistencyResult(res.issues || res.data || (Array.isArray(res) ? res : []))
      setSuccessMsg('Hisaab ki jaanch (Consistency Check) purna hui.')
    } catch (err) {
      setError(err.message || 'Consistency check asafal raha.')
    } finally {
      setRunningConsistency(false)
    }
  }

  const handleGenerateOwnerQR = async () => {
    if (!selectedSeasonId) return
    try {
      setGeneratingQR(true)
      setError(null)
      const res = await qrAPI.generate(selectedSeasonId, {
        accessLevel: 'stakeholders_only',
        expiresInDays: 90,
        expiryDays: 90
      })
      const dataObj = res?.data || res?.passport || res
      const token = dataObj?.token || dataObj?.passport?.token || dataObj?.id
      const qrDataUrl = dataObj?.qrDataUrl || dataObj?.passport?.qrCodeDataUrl || ''
      const fullUrl = `${window.location.origin}/passport/${token}`

      setSettlementQR({
        token,
        fullUrl,
        qrDataUrl,
        crop: seasonData?.crop || 'Khet'
      })
      setQrModalOpen(true)
      setSuccessMsg('Khet Malik ke hisaab verification ke liye QR Passport taiyar ho gaya!')
    } catch (err) {
      setError(err.message || 'QR Passport generate karne me samasya aayi.')
    } finally {
      setGeneratingQR(false)
    }
  }

  // Summaries
  const getExpensePaise = (e) => {
    if (e.amountPaise != null) return Number(e.amountPaise);
    if (e.amount != null) return e.isPaise === false ? Math.round(Number(e.amount) * 100) : Number(e.amount);
    if (e.amountRupees != null) return Math.round(Number(e.amountRupees) * 100);
    return 0;
  };

  const totalExpenses = expenses.reduce((a, b) => a + getExpensePaise(b), 0)
  const ackExpenses = expenses.filter(e => (e.reviewStatus || e.status) === 'acknowledged' || (e.reviewStatus || e.status) === 'approved').reduce((a, b) => a + getExpensePaise(b), 0)
  const disputedExpenses = expenses.filter(e => (e.reviewStatus || e.status) === 'disputed').reduce((a, b) => a + getExpensePaise(b), 0)
  const pendingExpenses = expenses.filter(e => (e.reviewStatus || e.status || 'pending') === 'pending').reduce((a, b) => a + getExpensePaise(b), 0)

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">📋 Khet Hisab: Batai & Settlement Ledger</h2>
          <p className="page-subtitle">Malik aur Bataidar ke bich saaf, shuddh aur vishvasniya hisaab</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {seasons.length > 0 && (
            <select
              className="select"
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              style={{ minWidth: '220px' }}
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
            onClick={handleRunConsistency}
            disabled={runningConsistency}
            className="btn btn-outline btn-sm"
          >
            {runningConsistency ? '⏳ Jaanch ho rahi...' : '🔍 Consistency Check'}
          </button>

          <Link to={`/khet-hisab/${selectedSeasonId}`} className="btn btn-primary btn-sm">
            Pura Vivaran (Detail) ➔
          </Link>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Consistency results */}
      {consistencyResult && (
        <Alert
          type={consistencyResult.length > 0 ? 'warning' : 'success'}
          title={consistencyResult.length > 0 ? 'Ledger me kuch visangatiyan hain:' : 'Batai ledger bilkul durust hai!'}
          onClose={() => setConsistencyResult(null)}
        >
          {consistencyResult.length > 0 && (
            <ul className="text-xs mt-1 pl-4">
              {consistencyResult.map((iss, i) => (
                <li key={i}>{iss.message || JSON.stringify(iss)}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      {loading ? (
        <LoadingSpinner message="Khet hisab ledger load ho raha hai..." />
      ) : !seasonData ? (
        <EmptyState
          icon="📋"
          title="Koi fasal chuni nahi gayi hai"
          subtitle="Pehle ek khet aur fasal setup karein."
          action={() => navigate('/farmguard/farm-setup')}
          actionLabel="+ Naya Khet Setup"
        />
      ) : (
        <>
          {/* Season Overview Card */}
          <div className="card p-5 mb-4" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <div className="flex-between items-center flex-wrap gap-2">
              <div>
                <span className="badge badge-info">{seasonData.crop}</span>
                <h3 className="font-bold text-xl text-primary mt-1">
                  {seasonData.farmName || 'Mera Khet'} — {seasonData.plotName || 'Plot 1'}
                </h3>
                <p className="text-xs text-secondary mt-1">
                  Shuruwat: {formatDate(seasonData.startDate)} • Katai: {formatDate(seasonData.expectedHarvestDate || seasonData.endDate)}
                </p>
              </div>

              <div className="text-right">
                <span className="badge badge-warning" style={{ fontSize: '0.85rem' }}>
                  {seasonData.agreementTerms || '50-50 Batai'}
                </span>
                <div className="mt-2">
                  <Link to={`/khet-hisab/${selectedSeasonId}/disputes`} className="btn btn-ghost btn-sm text-xs">
                    ⚠️ Vivad Kendra (Dispute Center)
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Settlement Summary Strip */}
          <div className="card p-4 mb-4">
            <h4 className="text-xs font-bold text-secondary uppercase mb-3">Kharcha Status Summary</h4>
            <div className="grid grid-4 gap-3 text-center">
              <div>
                <div className="text-xs text-secondary">Kul Lagat (Total)</div>
                <div className="text-xl font-bold text-primary mt-1">{formatRupees(totalExpenses)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Manya Kharch (Acknowledged)</div>
                <div className="text-xl font-bold text-success mt-1">{formatRupees(ackExpenses)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Aapti Wale (Disputed)</div>
                <div className="text-xl font-bold text-error mt-1">{formatRupees(disputedExpenses)}</div>
              </div>
              <div>
                <div className="text-xs text-secondary">Jaanch Baaki (Pending)</div>
                <div className="text-xl font-bold text-warning mt-1">{formatRupees(pendingExpenses)}</div>
              </div>
            </div>
          </div>

          {/* Settlement Calculation Section */}
          <div
            className="card p-5 mb-5"
            style={{
              border: '2px solid var(--color-primary-light)',
              background: '#ffffff'
            }}
          >
            <div className="flex-between items-center mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-lg text-primary">🤝 Batai Hissedari & Final Settlement</h3>
                <p className="text-xs text-secondary">
                  Kul upaj aur kul lagat ko agreement niyam ke hisab se batai karein
                </p>
              </div>

              <button
                type="button"
                onClick={handleCalculateSettlement}
                disabled={calculating}
                className="btn btn-primary"
              >
                {calculating ? '⏳ Computation ho raha...' : '⚡ Calculate Settlement'}
              </button>
            </div>

            {settlement ? (
              <div className="p-4 bg-surface-2 rounded text-sm animate-fadeIn">
                <div className="grid grid-3 gap-3 mb-4">
                  <div>
                    <span className="text-secondary text-xs">Kul Lagat (Allowable Expense):</span>
                    <div className="font-bold text-base">
                      {formatRupees(settlement.totalExpensesPaise ?? settlement.totalExpenses ?? totalExpenses, true)}
                    </div>
                  </div>
                  <div>
                    <span className="text-secondary text-xs">Kul Upaj Bikri (Gross Sales):</span>
                    <div className="font-bold text-base text-success">
                      {formatRupees(settlement.grossSalePaise ?? settlement.grossSales ?? 0, true)}
                    </div>
                  </div>
                  <div>
                    <span className="text-secondary text-xs">Shuddh Munafa (Net Profit):</span>
                    <div className="font-bold text-base text-primary">
                      {formatRupees(settlement.netSalePaise ?? settlement.netProfit ?? 0, true)}
                    </div>
                  </div>
                </div>

                <hr className="divider" />

                <div className="grid grid-2 gap-4">
                  <div className="p-3 bg-white rounded border">
                    <span className="font-bold text-sm text-primary">👨‍🌾 Khet Malik Hissa:</span>
                    <div className="text-xl font-bold mt-1 text-primary">
                      {formatRupees(settlement.calculatedOwnerSharePaise ?? settlement.ownerShare ?? 0, true)}
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleAcknowledge('owner')}
                        className="btn btn-outline btn-sm"
                      >
                        ✓ Malik Tasdeeq Karein
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded border">
                    <span className="font-bold text-sm text-secondary">🚜 Bataidar / Operator Hissa:</span>
                    <div className="text-xl font-bold mt-1 text-primary">
                      {formatRupees(settlement.calculatedOperatorSharePaise ?? settlement.operatorShare ?? 0, true)}
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleAcknowledge('operator')}
                        className="btn btn-outline btn-sm"
                      >
                        ✓ Operator Tasdeeq Karein
                      </button>
                    </div>
                  </div>
                </div>

                {/* QR Option to share verified settlement with Owner */}
                <div
                  className="mt-4 pt-4 flex-between items-center flex-wrap gap-3"
                  style={{ borderTop: '1px solid var(--color-border)', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0' }}
                >
                  <div>
                    <h5 className="font-bold text-sm text-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      🔑 Malik Verification QR Passport
                    </h5>
                    <p className="text-xs text-secondary mt-1">
                      Malik ko sabhi kharch, verified bills, katai aur antim batai hisaab dikhane ke liye QR Code banayein.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateOwnerQR}
                      disabled={generatingQR}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      {generatingQR ? '⏳ QR Ban raha...' : '🔑 + Malik Ke Liye QR Banayein'}
                    </button>
                    {settlementQR && (
                      <button
                        type="button"
                        onClick={() => setQrModalOpen(true)}
                        className="btn btn-outline btn-sm"
                      >
                        👁️ QR Dekhein
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-secondary">
                Abhi tak is season ka final settlement generate nahi hua hai. Upar diye gaye <strong>"Calculate Settlement"</strong> button par click karein.
              </p>
            )}
          </div>

          {/* Chronological Expense Ledger */}
          <div className="mb-4">
            <h3 className="section-title">📒 Kharcha Prathmikta Soochi (Ledger Entries)</h3>
            {expenses.length === 0 ? (
              <EmptyState
                icon="📝"
                title="Is season me koi kharcha darj nahi hai"
                subtitle="Naya kharcha jodne ke liye FarmGuard me jayein."
              />
            ) : (
              <div>
                {expenses.map((exp) => (
                  <ExpenseCard
                    key={exp.id || exp._id}
                    expense={exp}
                    showActions={true}
                    onReview={() => loadSeasonLedger(selectedSeasonId)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Owner QR Verification Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="🔑 Khet Malik Settlement QR Passport"
        footer={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setQrModalOpen(false)}
          >
            Purna (Done)
          </button>
        }
      >
        {settlementQR && (
          <div>
            <div className="alert alert-info mb-3">
              <span>🛡️</span>
              <div className="text-xs">
                <strong>Malik Verification:</strong> Is QR code ko khet malik ke sath share karein ya unse scan karwayein. Isme sabhi kharch, verified raseedein, katai, bikri aur antim batai hissedari ka pura pramanik vivaran surakshit hai.
              </div>
            </div>
            <QRDisplay
              url={settlementQR.fullUrl}
              qrDataUrl={settlementQR.qrDataUrl}
              label={`Malik Hisab: ${settlementQR.crop}`}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default SeasonLedger
