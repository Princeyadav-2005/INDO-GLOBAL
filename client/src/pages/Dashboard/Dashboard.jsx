import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { expensesAPI, seasonsAPI, farmsAPI, consistencyAPI, weatherAPI } from '../../services/api'
import StatCard from '../../components/UI/StatCard'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import Alert from '../../components/UI/Alert'
import EmptyState from '../../components/UI/EmptyState'
import ExpenseCard from '../../components/Expenses/ExpenseCard'
import { formatRupees, formatDate } from '../../utils/formatters'

export function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [stats, setStats] = useState({
    totalExpenses: 0,
    missingReceipts: 0,
    activeFarmsCount: 0,
    pendingReviews: 0
  })

  const [recentExpenses, setRecentExpenses] = useState([])
  const [activeSeasons, setActiveSeasons] = useState([])
  const [consistencyAlerts, setConsistencyAlerts] = useState([])
  const [weatherInfo, setWeatherInfo] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [expensesRes, seasonsRes, farmsRes, consistencyRes, weatherRes] = await Promise.allSettled([
        expensesAPI.list({ limit: 5 }),
        seasonsAPI.list({ status: 'active' }),
        farmsAPI.list(),
        consistencyAPI.get(),
        weatherAPI.get({ district: user?.district || 'Sehore', state: user?.state || 'Madhya Pradesh' })
      ])

      // 1. Process Expenses
      if (expensesRes.status === 'fulfilled' && expensesRes.value) {
        const rawExpenses = expensesRes.value.expenses || expensesRes.value.data || (Array.isArray(expensesRes.value) ? expensesRes.value : [])
        setRecentExpenses(rawExpenses.slice(0, 5))

        const getExpensePaise = (e) => {
          if (e.amountPaise != null) return Number(e.amountPaise);
          if (e.amount != null) return e.isPaise === false ? Math.round(Number(e.amount) * 100) : Number(e.amount);
          if (e.amountRupees != null) return Math.round(Number(e.amountRupees) * 100);
          return 0;
        };

        // Compute summary totals if not provided
        const total = rawExpenses.reduce((acc, curr) => acc + getExpensePaise(curr), 0)
        const missing = rawExpenses.filter((e) => !e.attachments?.length && !e.hasReceipt && !e.receiptUrl).length
        const pending = rawExpenses.filter((e) => e.reviewStatus === 'pending' || e.status === 'pending').length

        setStats((prev) => ({
          ...prev,
          totalExpenses: total,
          missingReceipts: missing,
          pendingReviews: pending
        }))
      }

      // 2. Process Seasons
      if (seasonsRes.status === 'fulfilled' && seasonsRes.value) {
        const seasons = seasonsRes.value.seasons || seasonsRes.value.data || (Array.isArray(seasonsRes.value) ? seasonsRes.value : [])
        setActiveSeasons(seasons)
      }

      // 3. Process Farms
      if (farmsRes.status === 'fulfilled' && farmsRes.value) {
        const farms = farmsRes.value.farms || farmsRes.value.data || (Array.isArray(farmsRes.value) ? farmsRes.value : [])
        setStats((prev) => ({
          ...prev,
          activeFarmsCount: farms.length
        }))
      }

      // 4. Process Consistency Alerts
      if (consistencyRes.status === 'fulfilled' && consistencyRes.value) {
        const issues = consistencyRes.value.issues || consistencyRes.value.alerts || (Array.isArray(consistencyRes.value) ? consistencyRes.value : [])
        setConsistencyAlerts(issues)
      }

      // 5. Process Weather
      if (weatherRes.status === 'fulfilled' && weatherRes.value) {
        const wData = weatherRes.value.weather || weatherRes.value.current || weatherRes.value
        setWeatherInfo(wData)
      }
    } catch (err) {
      setError('Dashboard data load karne me samasya aayi. Kripya page refresh karein.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Khet ka dashboard taiyar ho raha hai..." />
  }

  return (
    <div className="animate-fadeIn">
      {/* Welcome Banner */}
      <div
        className="card p-5 mb-5"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
          color: '#ffffff',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div className="flex-between items-center flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#ffffff' }}>
              Namaskar, {user?.name || 'Kisan Bhai'}! 🌾
            </h2>
            <p className="text-sm mt-1" style={{ color: '#d1fae5' }}>
              Aapka Khet Se Mandi Tak ka digital hisaab kitaab surakshit hai.
            </p>
          </div>

          {weatherInfo ? (
            <div
              className="flex items-center gap-3 p-3 rounded"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <span style={{ fontSize: '2rem' }}>{weatherInfo.conditionIcon || '🌤️'}</span>
              <div>
                <div className="font-bold text-base" style={{ color: '#ffffff' }}>
                  {weatherInfo.temperature ?? '28'}°C
                </div>
                <div className="text-xs" style={{ color: '#a7f3d0' }}>
                  {weatherInfo.district || user?.district || 'Sehore'} • {weatherInfo.condition || 'Khula Mausam'}
                </div>
              </div>
            </div>
          ) : (
            <Link to="/weather" className="chip text-xs" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
              🌤️ Mausam Jankari Dekhein
            </Link>
          )}
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Consistency Warnings */}
      {consistencyAlerts.length > 0 && (
        <Alert
          type="warning"
          title="Hisaab me kuch baatein dhyan dene yogya hain:"
          message={`${consistencyAlerts.length} aniyamittaayein payi gayi hain.`}
        >
          <ul className="text-xs mt-2 pl-4" style={{ listStyleType: 'disc' }}>
            {consistencyAlerts.slice(0, 3).map((alert, idx) => (
              <li key={idx} className="mt-1">
                {alert.message || alert.description || JSON.stringify(alert)}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Quick Actions Row */}
      <div className="grid grid-4 gap-3 mb-6">
        <Link
          to="/farmguard/new"
          className="card card-hover p-4 text-center"
          style={{ textDecoration: 'none' }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🎙️</div>
          <div className="font-bold text-sm text-primary">+ Bolkar Kharcha</div>
          <div className="text-xs text-secondary mt-1">Aawaz se note karein</div>
        </Link>

        <Link
          to="/mandi"
          className="card card-hover p-4 text-center"
          style={{ textDecoration: 'none' }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📊</div>
          <div className="font-bold text-sm text-primary">Mandi Bhav</div>
          <div className="text-xs text-secondary mt-1">Aaj ke taaza rates</div>
        </Link>

        <Link
          to="/khet-hisab"
          className="card card-hover p-4 text-center"
          style={{ textDecoration: 'none' }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📋</div>
          <div className="font-bold text-sm text-primary">Batai Hisaab</div>
          <div className="text-xs text-secondary mt-1">Settlement ledger</div>
        </Link>

        <Link
          to="/farmguard/farm-setup"
          className="card card-hover p-4 text-center"
          style={{ textDecoration: 'none' }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🌱</div>
          <div className="font-bold text-sm text-primary">Apna Khet</div>
          <div className="text-xs text-secondary mt-1">Plot & Fasal jodein</div>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-4 gap-3 mb-6">
        <StatCard
          icon="💰"
          value={formatRupees(stats.totalExpenses)}
          label="Kul Kharcha (This Season)"
          sublabel="Khet me lagayi gayi lagat"
          color="var(--color-primary)"
        />
        <StatCard
          icon="🧾"
          value={stats.missingReceipts}
          label="Bina Bill Ke Kharch"
          sublabel="Raseed upload karna baaki"
          color={stats.missingReceipts > 0 ? 'var(--color-warning)' : 'var(--color-success)'}
        />
        <StatCard
          icon="🌾"
          value={stats.activeFarmsCount}
          label="Darj Khet (Farms)"
          sublabel="Kul sakriya jameenein"
          color="var(--color-secondary)"
        />
        <StatCard
          icon="⏳"
          value={stats.pendingReviews}
          label="Jaanch Baaki Entries"
          sublabel="Sajhedar se anumodan"
          color="var(--color-accent)"
        />
      </div>

      {/* Active Seasons & Recent Expenses */}
      <div className="grid grid-2 gap-5">
        {/* Active Seasons */}
        <div>
          <div className="flex-between items-center mb-3">
            <h3 className="section-title mb-0">🌱 Sakriya Fasalein (Seasons)</h3>
            <Link to="/farmguard/farm-setup" className="text-xs text-primary font-bold">
              + Nayi Fasal
            </Link>
          </div>

          {activeSeasons.length === 0 ? (
            <EmptyState
              icon="🌾"
              title="Koi sakriya fasal nahi hai"
              subtitle="Naya season darj karke lagat aur aamdani ka hisab shuru karein."
              action={() => (window.location.href = '/farmguard/farm-setup')}
              actionLabel="+ Fasal Darj Karein"
            />
          ) : (
            <div className="flex flex-col gap-3">
              {activeSeasons.map((season) => (
                <div key={season.id || season._id} className="card card-hover p-4">
                  <div className="flex-between items-center">
                    <div>
                      <h4 className="font-bold text-base text-primary">
                        {season.crop || 'Fasal'} {season.variety ? `(${season.variety})` : ''}
                      </h4>
                      <p className="text-xs text-secondary mt-1">
                        Khet: <strong>{season.farmName || 'Mera Khet'}</strong> • Plot: {season.plotName || 'Plot 1'}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        Shuruwat: {formatDate(season.startDate)} • Anumanit katai: {formatDate(season.expectedHarvestDate || season.endDate)}
                      </p>
                    </div>
                    <Link
                      to={`/khet-hisab/${season.id || season._id}`}
                      className="btn btn-outline btn-sm"
                    >
                      Hisaab ➔
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div>
          <div className="flex-between items-center mb-3">
            <h3 className="section-title mb-0">📒 Haal Hi Ke Kharch</h3>
            <Link to="/farmguard" className="text-xs text-primary font-bold">
              Sabhi Dekhein ({recentExpenses.length})
            </Link>
          </div>

          {recentExpenses.length === 0 ? (
            <EmptyState
              icon="📝"
              title="Koi kharcha darj nahi hai"
              subtitle="Pehla kharcha aawaz se bolkar ya hath se darj karein."
              action={() => (window.location.href = '/farmguard/new')}
              actionLabel="+ Kharcha Jodein"
            />
          ) : (
            <div>
              {recentExpenses.map((exp) => (
                <ExpenseCard
                  key={exp.id || exp._id}
                  expense={exp}
                  showActions={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
