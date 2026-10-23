import React, { useState, useEffect } from 'react'
import { schemesAPI } from '../../services/api'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import EmptyState from '../../components/UI/EmptyState'
import Alert from '../../components/UI/Alert'

const CATEGORIES = [
  { id: 'all', label: 'Sabhi Yojanayein' },
  { id: 'insurance', label: '🛡️ Fasal Bima' },
  { id: 'credit', label: '💳 Kisan Credit & Rin' },
  { id: 'subsidy', label: '💰 Subsidy & Anudan' },
  { id: 'training', label: '🎓 Prashikshan & Takneek' },
  { id: 'market', label: '🛒 Mandi & e-NAM' }
]

export function SchemesPage() {
  const [schemes, setSchemes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    loadSchemes()
  }, [])

  const loadSchemes = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await schemesAPI.list()
      const list = res.schemes || res.data || (Array.isArray(res) ? res : [])
      setSchemes(list)
    } catch (err) {
      setError('Sarkari yojana suchi load nahi ho saki.')
    } finally {
      setLoading(false)
    }
  }

  const filteredSchemes = schemes.filter((s) => {
    const matchCategory = categoryFilter === 'all' || s.category === categoryFilter
    const matchSearch = !searchTerm || (
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.nameHi && s.nameHi.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.benefit && s.benefit.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    return matchCategory && matchSearch
  })

  return (
    <div className="container animate-fadeIn" style={{ maxWidth: '860px' }}>
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">📜 Sarkari Krishi Yojana Portal</h2>
          <p className="page-subtitle">
            Kendra va Rajya sarkar ki sabhi kisan kalyankari yojanaon ki jankari aur aavedan process
          </p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Filter and Search Bar */}
      <div className="card p-4 mb-4">
        <div className="mb-3">
          <input
            type="text"
            className="input"
            placeholder="🔍 Yojana ka naam ya labh khojein (PM-Kisan, Bima, Tractor subsidy)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 flex-wrap">
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

      {/* Schemes List */}
      {loading ? (
        <LoadingSpinner message="Sarkari yojanayein khoji ja rahi hain..." />
      ) : filteredSchemes.length === 0 ? (
        <EmptyState
          icon="📜"
          title="Koi yojana nahi mili"
          subtitle="Aapke khoje gaye shabdon ke anuroop koi yojana uplabdh nahi hai."
          action={() => {
            setCategoryFilter('all')
            setSearchTerm('')
          }}
          actionLabel="Sabhi Yojanayein Dekhein"
        />
      ) : (
        <div className="flex flex-col gap-4">
          {filteredSchemes.map((scheme, idx) => {
            const sid = scheme.id || scheme._id || idx
            const isExpanded = expandedId === sid

            return (
              <div
                key={sid}
                className="card card-hover p-5"
                style={{
                  borderLeft: '4px solid var(--color-primary)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div
                  className="flex-between items-start"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : sid)}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-info">{scheme.category || 'Krishi'}</span>
                      <span className="text-xs text-muted">{scheme.ministry || 'Krishi Mantralaya'}</span>
                    </div>

                    <h3 className="font-bold text-lg text-primary">{scheme.name}</h3>
                    {scheme.nameHi && (
                      <h4 className="font-semibold text-sm text-secondary">{scheme.nameHi}</h4>
                    )}

                    <div className="mt-2 text-sm font-semibold text-success">
                      🎁 Labh: {scheme.benefit || scheme.amount || 'Aarthik sahayata evam anudan'}
                    </div>

                    <p className="text-xs text-secondary mt-1">
                      Patrata (Eligibility): {scheme.eligibility || 'Sabhi kisan jinke paas kheti yogya jameen hai.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '1.1rem' }}
                    aria-label="Expand details"
                  >
                    {isExpanded ? '▲' : '▼'}
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t text-sm animate-fadeIn">
                    <div className="mb-3">
                      <strong className="text-text">Pura Vivaran (Description):</strong>
                      <p className="text-secondary mt-1" style={{ lineHeight: 1.6 }}>
                        {scheme.description || 'Yeh yojana kisanon ko aarthik rup se majboot banane aur fasal suraksha pradan karne ke liye chalayi ja rahi hai.'}
                      </p>
                    </div>

                    <div className="mb-3 p-3 bg-surface-2 rounded">
                      <strong className="text-primary text-xs uppercase font-bold">
                        Aavedan Kaise Karein (How to Apply):
                      </strong>
                      <p className="text-secondary text-xs mt-1" style={{ lineHeight: 1.5 }}>
                        {scheme.howToApply || 'Kisan apne najdeeki CSC Center (Jan Seva Kendra) par jaakar ya aadhikarik portal par Aadhar aur Khatauni ke sath aavedan kar sakte hain.'}
                      </p>
                    </div>

                    {scheme.website && (
                      <div className="flex justify-end">
                        <a
                          href={scheme.website}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-primary btn-sm"
                        >
                          🔗 Aadhikarik Website Par Jayein ➔
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SchemesPage
