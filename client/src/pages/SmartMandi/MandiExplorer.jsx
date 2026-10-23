import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { mandiAPI } from '../../services/api'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import EmptyState from '../../components/UI/EmptyState'
import Alert from '../../components/UI/Alert'
import { formatRupees, formatDate, getMandiFreshness } from '../../utils/formatters'

const COMMODITIES = [
  'Wheat (Gehu)', 'Soyabean', 'Gram (Chana)', 'Mustard (Sarson)',
  'Paddy (Dhan)', 'Cotton (Kapas)', 'Maize (Makka)', 'Onion (Pyaz)',
  'Potato (Aloo)', 'Tomato (Tamatar)', 'Garlic (Lahsun)'
]

const STATES = [
  'Madhya Pradesh', 'Maharashtra', 'Uttar Pradesh', 'Punjab', 'Haryana',
  'Rajasthan', 'Gujarat', 'Bihar', 'Karnataka', 'Telangana'
]

export function MandiExplorer() {
  const [observations, setObservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchingGov, setFetchingGov] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Filters
  const [state, setState] = useState('Madhya Pradesh')
  const [district, setDistrict] = useState('')
  const [commodity, setCommodity] = useState('Wheat (Gehu)')
  const [page, setPage] = useState(1)
  const [limit] = useState(15)

  useEffect(() => {
    loadObservations()
  }, [state, commodity])

  const loadObservations = async () => {
    try {
      setLoading(true)
      setError(null)
      const cleanCommodity = commodity.split(' (')[0]
      const res = await mandiAPI.getObservations({
        state,
        district: district || undefined,
        commodity: cleanCommodity
      })
      const list = (res?.data?.observations) || (Array.isArray(res?.data) ? res.data : []) || res?.observations || []
      setObservations(list)
    } catch (err) {
      setError('Mandi bhav load karne me truti hui.')
    } finally {
      setLoading(false)
    }
  }

  const handleFetchLatest = async () => {
    try {
      setFetchingGov(true)
      setError(null)
      setSuccessMsg(null)
      const cleanCommodity = commodity.split(' (')[0]
      const res = await mandiAPI.fetchFromGov({ state, commodity: cleanCommodity })
      setSuccessMsg('data.gov.in se taaza mandi records update kiye gaye!')
      loadObservations()
    } catch (err) {
      setError(err.message || 'data.gov.in se data sync asafal raha. CSV import try karein.')
    } finally {
      setFetchingGov(false)
    }
  }

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('csv', file)
      formData.append('file', file)
      await mandiAPI.importCSV(formData)
      setSuccessMsg('Mandi CSV safaltapoorvak import ho gayi!')
      loadObservations()
    } catch (err) {
      setError(err.message || 'CSV import me truti hui.')
    } finally {
      setLoading(false)
    }
  }

  // Filtered by district if user entered text
  const displayed = observations.filter((o) => {
    if (!district) return true
    return (o.district && o.district.toLowerCase().includes(district.toLowerCase())) ||
           (o.mandi && o.mandi.toLowerCase().includes(district.toLowerCase()))
  })

  const paginated = displayed.slice((page - 1) * limit, page * limit)
  const totalPages = Math.ceil(displayed.length / limit) || 1

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">📊 Smart Mandi Bhav Explorer</h2>
          <p className="page-subtitle">
            APMC mandiyon ke taaza aur sachhe bhav (Data source: data.gov.in)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/mandi/compare" className="btn btn-outline btn-sm">
            ⚖️ Mandi Tulna (Compare)
          </Link>
          <Link to="/mandi/proceeds" className="btn btn-outline btn-sm">
            🧮 Munafa Calculator
          </Link>
          <button
            type="button"
            onClick={handleFetchLatest}
            disabled={fetchingGov}
            className="btn btn-primary btn-sm"
          >
            {fetchingGov ? '⏳ Sync ho raha...' : '🔄 Taaza Data Fetch Karein'}
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}

      {/* Filter Card */}
      <div className="card p-4 mb-4">
        <div className="grid grid-3 gap-3">
          <div className="form-group mb-0">
            <label className="form-label">Rajya (State)</label>
            <select className="select" value={state} onChange={(e) => setState(e.target.value)}>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Fasal / Jins (Commodity)</label>
            <select className="select" value={commodity} onChange={(e) => setCommodity(e.target.value)}>
              {COMMODITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Jila ya Mandi Search</label>
            <input
              type="text"
              className="input"
              placeholder="Jaise: Sehore, Indore, Ujjain"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Results Strip */}
      <div className="flex-between items-center mb-3">
        <div className="text-xs text-secondary font-medium">
          Kul Milkar <strong>{displayed.length}</strong> Mandi Bhav Records Mile
        </div>
        <div className="flex items-center gap-2">
          <label className="btn btn-ghost btn-sm text-xs" style={{ cursor: 'pointer' }}>
            📥 CSV Data Import
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <LoadingSpinner message="Mandi bhav records khoje ja rahe hain..." />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon="📊"
          title="Is filter par koi bhav nahi mila"
          subtitle="Aap taaza data data.gov.in se fetch kar sakte hain ya CSV file upload kar sakte hain."
          action={handleFetchLatest}
          actionLabel="data.gov.in Se Sync Karein"
        />
      ) : (
        <>
          <div className="card p-0 mb-4" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-2)', borderBottom: '1.5px solid var(--color-border)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Mandi / Jila</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Fasal (Commodity)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Modal Bhav (₹/Qtl)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Min - Max (₹)</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Tareekh (Date)</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Taazgi (Freshness)</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((obs, idx) => {
                  const freshness = getMandiFreshness(obs.observationDate || obs.date)
                  return (
                    <tr
                      key={obs.id || obs._id || idx}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div className="font-bold text-primary">{obs.mandi || obs.market}</div>
                        <div className="text-xs text-muted">{obs.district || state}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div className="font-semibold">{obs.commodity}</div>
                        <div className="text-xs text-secondary">{obs.variety || 'FAQ'}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div className="font-bold text-base text-primary">
                          {formatRupees(obs.modalPricePaise ?? obs.modalPrice ?? obs.price ?? 0, true)}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div className="text-xs text-secondary">
                          {formatRupees(obs.minPricePaise ?? obs.minPrice ?? obs.modalPricePaise ?? 0, true)} - {formatRupees(obs.maxPricePaise ?? obs.maxPrice ?? obs.modalPricePaise ?? 0, true)}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div className="text-xs">{formatDate(obs.observationDate || obs.date)}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${freshness.badgeClass}`}>
                          {freshness.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex-between items-center mt-3">
              <span className="text-xs text-secondary">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="btn btn-outline btn-sm"
                >
                  ⬅ Pichhla
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="btn btn-outline btn-sm"
                >
                  Agla ➔
                </button>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-muted mt-4">
            * Data Source: <strong>data.gov.in (Agmarknet)</strong>. Yeh dar mandi samitiyon dwara darj kiye gaye hain.
          </div>
        </>
      )}
    </div>
  )
}

export default MandiExplorer
