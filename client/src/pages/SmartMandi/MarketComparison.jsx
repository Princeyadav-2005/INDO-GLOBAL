import React, { useState, useEffect } from 'react'
import { mandiAPI } from '../../services/api'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import Alert from '../../components/UI/Alert'
import { formatRupees, formatDate, getMandiFreshness } from '../../utils/formatters'

const COMMODITIES = [
  'Wheat (Gehu)', 'Soyabean', 'Gram (Chana)', 'Mustard (Sarson)',
  'Paddy (Dhan)', 'Cotton (Kapas)', 'Maize (Makka)'
]

const DEFAULT_MANDIS = [
  { id: 1, name: 'Sehore APMC', district: 'Sehore', price: 2450, distanceKm: 12, transportRatePerKm: 25, date: new Date().toISOString() },
  { id: 2, name: 'Bhopal Karond Mandi', district: 'Bhopal', price: 2580, distanceKm: 42, transportRatePerKm: 25, date: new Date().toISOString() },
  { id: 3, name: 'Ashta Mandi', district: 'Sehore', price: 2480, distanceKm: 45, transportRatePerKm: 25, date: new Date().toISOString() },
  { id: 4, name: 'Dewas Mandi', district: 'Dewas', price: 2620, distanceKm: 85, transportRatePerKm: 25, date: new Date().toISOString() }
]

export function MarketComparison() {
  const [commodity, setCommodity] = useState('Wheat (Gehu)')
  const [quantityQuintals, setQuantityQuintals] = useState(40) // 40 quintals load
  const [mandiItems, setMandiItems] = useState(DEFAULT_MANDIS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Add new Mandi form
  const [newMandiName, setNewMandiName] = useState('')
  const [newMandiPrice, setNewMandiPrice] = useState('')
  const [newMandiDist, setNewMandiDist] = useState('')

  const handleDistanceChange = (id, km) => {
    setMandiItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, distanceKm: Number(km) } : item))
    )
  }

  const handlePriceChange = (id, price) => {
    setMandiItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, price: Number(price) } : item))
    )
  }

  const handleRemove = (id) => {
    setMandiItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleAddMandi = (e) => {
    e.preventDefault()
    if (!newMandiName || !newMandiPrice) return
    if (mandiItems.length >= 5) {
      alert('Aap ek samay me adhiktam 5 mandiyon ki tulna kar sakte hain.')
      return
    }

    const newItem = {
      id: Date.now(),
      name: newMandiName,
      district: 'Madhya Pradesh',
      price: Number(newMandiPrice),
      distanceKm: Number(newMandiDist) || 20,
      transportRatePerKm: 25,
      date: new Date().toISOString()
    }

    setMandiItems([...mandiItems, newItem])
    setNewMandiName('')
    setNewMandiPrice('')
    setNewMandiDist('')
  }

  // Calculate estimates
  const calculatedItems = mandiItems.map((m) => {
    const gross = Number(quantityQuintals) * Number(m.price)
    // Approximate transport cost: base ₹800 + (distance × rate)
    const transport = Math.round(800 + (Number(m.distanceKm) * Number(m.transportRatePerKm || 25)))
    const mandiFees = Math.round(gross * 0.02) // 2% fees/commission
    const netProceeds = Math.max(0, gross - transport - mandiFees)
    const netPerQuintal = quantityQuintals > 0 ? (netProceeds / quantityQuintals).toFixed(0) : 0

    return {
      ...m,
      gross,
      transport,
      mandiFees,
      netProceeds,
      netPerQuintal: Number(netPerQuintal)
    }
  })

  // Sort by netProceeds descending
  const sortedItems = [...calculatedItems].sort((a, b) => b.netProceeds - a.netProceeds)
  const bestMandi = sortedItems[0]

  return (
    <div className="animate-fadeIn">
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">⚖️ Multi-Mandi Tulna (Market Comparison)</h2>
          <p className="page-subtitle">
            Kahan bechna sabse faydemand rahega? Transport aur aadhat katne ke baad best mandi chunein.
          </p>
        </div>
      </div>

      <div className="alert alert-warning mb-4">
        <span>⚠️</span>
        <div className="text-xs">
          <strong>Samaan Gunvatta (Comparable Quality Only):</strong> Yeh tulna saman grade aur nami par aadharit hai. Door ki mandi jane se pehle wahan ke aadhat aur raste ke kharch ka dhyan rakhein.
        </div>
      </div>

      {/* Control bar */}
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
            <label className="form-label">Kul Maal (Quintals me)</label>
            <input
              type="number"
              className="input"
              value={quantityQuintals}
              onChange={(e) => setQuantityQuintals(Math.max(1, Number(e.target.value)))}
            />
          </div>

          <div className="form-group mb-0 flex items-end">
            <div className="text-xs text-secondary">
              Transport dar anuman: <strong>₹25 / KM</strong> (Mini truck / pickup)
            </div>
          </div>
        </div>
      </div>

      {/* Best Choice Recommendation Banner */}
      {bestMandi && (
        <div
          className="card p-4 mb-4 animate-slideUp"
          style={{
            background: 'linear-gradient(135deg, #14532d 0%, #1a5c2a 100%)',
            color: '#ffffff',
            border: '2px solid var(--color-secondary-light)'
          }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '2.5rem' }}>🏆</span>
            <div>
              <span className="badge badge-success" style={{ backgroundColor: '#ffffff', color: '#14532d' }}>
                Farmer Connect Sifarish (Best Choice)
              </span>
              <h3 className="font-bold text-xl mt-1" style={{ color: '#ffffff' }}>
                {bestMandi.name} me bechna sabse laabhkari hai!
              </h3>
              <p className="text-xs mt-1" style={{ color: '#d1fae5' }}>
                Gaadi kiraya (-{formatRupees(bestMandi.transport, false)}) aur mandi cess katne ke baad bhi aapko yahan sabse jyada{' '}
                <strong>{formatRupees(bestMandi.netProceeds, false)}</strong> (lagbhag ₹{bestMandi.netPerQuintal}/Qtl) prapt honge.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Cards Grid */}
      <div className="grid grid-4 gap-4 mb-5">
        {calculatedItems.map((m) => {
          const isBest = bestMandi && bestMandi.id === m.id
          const freshness = getMandiFreshness(m.date)

          return (
            <div
              key={m.id}
              className="card p-4 flex flex-col justify-between"
              style={{
                border: isBest ? '2.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                backgroundColor: isBest ? 'rgba(76, 175, 110, 0.05)' : 'var(--color-surface)'
              }}
            >
              <div>
                <div className="flex-between items-center mb-2">
                  <h4 className="font-bold text-base text-primary">{m.name}</h4>
                  {isBest && <span className="badge badge-success">Top Choice</span>}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`badge ${freshness.badgeClass}`} style={{ fontSize: '0.65rem' }}>
                    {freshness.label}
                  </span>
                  <span className="text-xs text-muted">{m.district}</span>
                </div>

                <div className="mb-3">
                  <label className="text-xs text-secondary font-medium block">Mandi Bhav (₹/Qtl):</label>
                  <input
                    type="number"
                    className="input"
                    value={m.price}
                    onChange={(e) => handlePriceChange(m.id, e.target.value)}
                    style={{ fontWeight: 'bold', fontSize: '1rem', marginTop: '2px' }}
                  />
                </div>

                <div className="mb-3">
                  <label className="text-xs text-secondary font-medium block">Duri (Distance in KM):</label>
                  <input
                    type="number"
                    className="input"
                    value={m.distanceKm}
                    onChange={(e) => handleDistanceChange(m.id, e.target.value)}
                    style={{ marginTop: '2px' }}
                  />
                </div>

                <hr className="divider" style={{ margin: '0.75rem 0' }} />

                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex-between">
                    <span className="text-secondary">Gross (Kul Bikri):</span>
                    <span className="font-semibold">{formatRupees(m.gross, false)}</span>
                  </div>
                  <div className="flex-between text-warning">
                    <span>Gaadi Kiraya:</span>
                    <span>- {formatRupees(m.transport, false)}</span>
                  </div>
                  <div className="flex-between text-warning">
                    <span>Mandi Fees (2%):</span>
                    <span>- {formatRupees(m.mandiFees, false)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="text-xs text-secondary">Net Anuman (Shuddh):</div>
                <div className="text-xl font-bold text-primary">
                  {formatRupees(m.netProceeds, false)}
                </div>
                <div className="text-xs text-secondary mt-1">
                  (₹{m.netPerQuintal} / Qtl)
                </div>

                {calculatedItems.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemove(m.id)}
                    className="btn btn-ghost btn-sm text-xs mt-2"
                    style={{ width: '100%', color: 'var(--color-error)' }}
                  >
                    ✕ Hataiye
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add another Mandi form */}
      {mandiItems.length < 5 && (
        <div className="card p-4">
          <h4 className="font-bold text-sm mb-2 text-primary">+ Tulna Me Nayi Mandi Jodein</h4>
          <form onSubmit={handleAddMandi} className="grid grid-4 gap-3 items-end">
            <div className="form-group mb-0">
              <label className="form-label text-xs">Mandi Ka Naam *</label>
              <input
                type="text"
                className="input"
                placeholder="Jaise: Ujjain Mandi"
                value={newMandiName}
                onChange={(e) => setNewMandiName(e.target.value)}
                required
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-xs">Bhav (₹/Qtl) *</label>
              <input
                type="number"
                className="input"
                placeholder="2550"
                value={newMandiPrice}
                onChange={(e) => setNewMandiPrice(e.target.value)}
                required
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label text-xs">Duri (KM)</label>
              <input
                type="number"
                className="input"
                placeholder="50"
                value={newMandiDist}
                onChange={(e) => setNewMandiDist(e.target.value)}
              />
            </div>
            <div>
              <button type="submit" className="btn btn-outline" style={{ width: '100%' }}>
                + Mandi Add Karein
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default MarketComparison
