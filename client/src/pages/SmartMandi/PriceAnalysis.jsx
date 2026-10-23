import React, { useState, useEffect } from 'react'
import { mandiAPI } from '../../services/api'
import PriceChart from '../../components/Charts/PriceChart'
import StatCard from '../../components/UI/StatCard'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import Alert from '../../components/UI/Alert'
import { formatRupees } from '../../utils/formatters'

const COMMODITIES = [
  'Wheat', 'Soyabean', 'Gram', 'Mustard', 'Paddy', 'Cotton', 'Maize', 'Onion', 'Potato'
]

export function PriceAnalysis() {
  const [commodity, setCommodity] = useState('Wheat')
  const [mandi, setMandi] = useState('Sehore')
  const [dateRange, setDateRange] = useState('90') // 30, 90, 180, 365 days
  const [observations, setObservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadChartData()
  }, [commodity, mandi, dateRange])

  const loadChartData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await mandiAPI.getObservations({
        commodity,
        mandi,
        days: dateRange
      })
      const list = res.observations || res.data || (Array.isArray(res) ? res : [])
      setObservations(list)
    } catch (err) {
      setError('Aitihasik mandi bhav data prapt nahi ho saka.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats
  const prices = observations.map((o) => (o.isPaise ? (o.modalPrice || 0) / 100 : (o.modalPrice || 0))).filter(p => p > 0)
  const highest = prices.length ? Math.max(...prices) : 0
  const lowest = prices.length ? Math.min(...prices) : 0
  const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0
  const latest = prices.length ? prices[prices.length - 1] : 0

  const hasSufficientData = observations.length >= 10

  return (
    <div className="animate-fadeIn">
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">📈 Mandi Bhav Vishleshan (Historical Trend)</h2>
          <p className="page-subtitle">Pichhle samay ke mandi bhavon ka rukh aur anuman</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {!hasSufficientData && !loading && (
        <Alert
          type="warning"
          title="Kam Data Uplabdh"
          message="Is mandi ke liye pichhle 30 dinon ka paryapt data uplabdh nahi hai. Bhav anuman ke liye adhik records ki aavashyakta hoti hai."
        />
      )}

      {/* Controls */}
      <div className="card p-4 mb-4">
        <div className="grid grid-3 gap-3">
          <div className="form-group mb-0">
            <label className="form-label">Fasal (Commodity)</label>
            <select className="select" value={commodity} onChange={(e) => setCommodity(e.target.value)}>
              {COMMODITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Mandi Ka Naam</label>
            <input
              type="text"
              className="input"
              placeholder="Jaise: Sehore, Indore, Kota"
              value={mandi}
              onChange={(e) => setMandi(e.target.value)}
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Samayavadhi (Period)</label>
            <select className="select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="30">Pichhle 30 Din</option>
              <option value="90">Pichhle 3 Mahine (90 Din)</option>
              <option value="180">Pichhle 6 Mahine (180 Din)</option>
              <option value="365">Pichhla 1 Saal (365 Din)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-4 gap-3 mb-5">
        <StatCard
          icon="⚡"
          value={formatRupees(latest, false)}
          label="Taaza Bhav (Latest)"
          sublabel="Sabse aakhiri darj bhav"
          color="var(--color-primary)"
        />
        <StatCard
          icon="🔺"
          value={formatRupees(highest, false)}
          label="Sabse Jyada (Highest)"
          sublabel="Is avadhi ka uchchtam star"
          color="var(--color-success)"
        />
        <StatCard
          icon="🔻"
          value={formatRupees(lowest, false)}
          label="Sabse Kam (Lowest)"
          sublabel="Is avadhi ka nyuntam star"
          color="var(--color-warning)"
        />
        <StatCard
          icon="⚖️"
          value={formatRupees(avg, false)}
          label="Ausat Bhav (Average)"
          sublabel="Madhya dar (Modal average)"
          color="var(--color-info)"
        />
      </div>

      {/* Chart Section */}
      {loading ? (
        <LoadingSpinner message="Graph taiyar ho raha hai..." />
      ) : (
        <div className="mb-4">
          <PriceChart
            observations={observations}
            title={`${commodity} Price Trend in ${mandi} (${dateRange} Din)`}
            commodity={commodity}
          />
        </div>
      )}

      <div className="p-3 bg-surface-2 rounded text-xs text-muted text-center border">
        ⚠️ <strong>Dhyan Dein:</strong> Yeh vishleshan aitihasik mandi records par aadharit hai. Bhav me utar-chadav mausam aur bazaar ki sthiti par nirbhar karta hai. Isse nivesh salah na maanein.
      </div>
    </div>
  )
}

export default PriceAnalysis
