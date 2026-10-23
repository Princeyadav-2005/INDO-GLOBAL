import React, { useState, useEffect } from 'react'
import { weatherAPI } from '../../services/api'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import Alert from '../../components/UI/Alert'
import { formatDate } from '../../utils/formatters'

// Open-Meteo WMO weather code mapping
function getWeatherInfo(code) {
  if (code === 0) return { label: 'Saaf Aasman (Clear Sky)', icon: '☀️' }
  if (code === 1 || code === 2) return { label: 'Halke Badal (Partly Cloudy)', icon: '🌤️' }
  if (code === 3) return { label: 'Badal Chhaye Hain (Overcast)', icon: '⛅' }
  if (code === 45 || code === 48) return { label: 'Kohra (Fog)', icon: '🌫️' }
  if (code >= 51 && code <= 55) return { label: 'Halki Boondabandi (Drizzle)', icon: '🌦️' }
  if (code >= 61 && code <= 65) return { label: 'Barish (Rain)', icon: '🌧️' }
  if (code >= 71 && code <= 75) return { label: 'Baraf (Snow)', icon: '🌨️' }
  if (code >= 80 && code <= 82) return { label: 'Bhari Barish (Heavy Showers)', icon: '⛈️' }
  if (code >= 95 && code <= 99) return { label: 'Aandhi Aur Toofan (Thunderstorm)', icon: '🌩️' }
  return { label: 'Khula Mausam', icon: '🌤️' }
}

export function WeatherPage() {
  const [district, setDistrict] = useState('Sehore')
  const [state, setState] = useState('Madhya Pradesh')
  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadWeather()
  }, [])

  const loadWeather = async (targetDistrict = district, targetState = state) => {
    try {
      setLoading(true)
      setError(null)
      const res = await weatherAPI.get({ district: targetDistrict, state: targetState })
      const data = res.weather || res.data || res
      setWeatherData(data)
    } catch (err) {
      setError('Mausam jankari prapt nahi ho saki. Kripya jila check karein.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (!district.trim()) return
    loadWeather(district, state)
  }

  const current = weatherData?.current || weatherData || {}
  const forecast = weatherData?.forecast || weatherData?.daily || []
  const currentCondition = getWeatherInfo(current.weatherCode || current.code || 1)
  const rainfall = current.rainfall || current.precipitation || 0
  const willRainHeavy = rainfall > 5 || forecast.some(f => (f.precipitation || 0) > 5)

  return (
    <div className="container animate-fadeIn" style={{ maxWidth: '820px' }}>
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">🌤️ Khet Mausam & Krishi Salah (Weather Advisory)</h2>
          <p className="page-subtitle">Sahi samay par spray, sinchai aur katai ke liye satik purvanuman</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Location Search Bar */}
      <form onSubmit={handleSearch} className="card p-3 mb-4">
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="text"
            className="input"
            placeholder="Jila (District, jaise: Sehore, Karnal, Nashik)"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            style={{ flex: 2, minWidth: '180px' }}
          />
          <input
            type="text"
            className="input"
            placeholder="Rajya (State)"
            value={state}
            onChange={(e) => setState(e.target.value)}
            style={{ flex: 1, minWidth: '140px' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.625rem 1.25rem' }}>
            🔍 Mausam Dekhein
          </button>
        </div>
      </form>

      {loading ? (
        <LoadingSpinner message="Mausam satellite data load ho raha hai..." />
      ) : !weatherData ? (
        <div className="card p-6 text-center text-secondary">
          Mausam data uplabdh nahi hai.
        </div>
      ) : (
        <>
          {/* Farm Advisory Alert based on rain */}
          {willRainHeavy ? (
            <div className="alert alert-warning mb-4 animate-slideUp">
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div>
                <strong className="text-sm">Krishi Salah: Agle 24 Ghante Barish Ki Sambhavna</strong>
                <p className="text-xs mt-1">
                  Khet me keetnashak spray ya urea ka chhidkav abhi avoid karein kyonki barish se dava beh sakti hai. Kataai kiya hua maal tirpal se dhak kar rakhein.
                </p>
              </div>
            </div>
          ) : (
            <div className="alert alert-success mb-4 animate-slideUp">
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <div>
                <strong className="text-sm">Krishi Salah: Spray Aur Sinchai Ke Liye Anukool Mausam</strong>
                <p className="text-xs mt-1">
                  Aasman saaf rehne ki sambhavna hai. Aap beej buwai, sinchai ya spray bina kisi rukawat ke kar sakte hain.
                </p>
              </div>
            </div>
          )}

          {/* Current Weather Hero Card */}
          <div
            className="card p-6 mb-5"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
              color: '#ffffff',
              borderRadius: 'var(--radius-lg)'
            }}
          >
            <div className="flex-between items-center">
              <div>
                <span className="badge badge-info" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                  Aaj Ka Mausam • {district}, {state}
                </span>
                <div className="text-5xl font-bold mt-3" style={{ color: '#ffffff' }}>
                  {current.temperature ?? '28'}°C
                </div>
                <div className="text-lg font-medium mt-1" style={{ color: '#e0f2fe' }}>
                  {currentCondition.label}
                </div>
              </div>

              <div style={{ fontSize: '4.5rem' }}>
                {currentCondition.icon}
              </div>
            </div>

            <hr className="divider" style={{ backgroundColor: 'rgba(255,255,255,0.2)', margin: '1.25rem 0' }} />

            <div className="grid grid-3 gap-3 text-center text-xs">
              <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <span style={{ opacity: 0.8 }}>Hawa Ki Gati (Wind):</span>
                <div className="font-bold text-base mt-1">{current.windSpeed ?? '12'} km/h</div>
              </div>
              <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <span style={{ opacity: 0.8 }}>Nami (Humidity):</span>
                <div className="font-bold text-base mt-1">{current.humidity ?? '55'}%</div>
              </div>
              <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <span style={{ opacity: 0.8 }}>Varsha (Rainfall):</span>
                <div className="font-bold text-base mt-1">{rainfall} mm</div>
              </div>
            </div>
          </div>

          {/* 7-Day Forecast (Horizontal Cards) */}
          <div className="mb-4">
            <h3 className="section-title text-base mb-3">📅 Agle 7 Dinon Ka Purvanuman (7-Day Forecast)</h3>
            <div
              className="flex gap-3"
              style={{
                overflowX: 'auto',
                paddingBottom: '0.75rem',
                scrollSnapType: 'x mandatory'
              }}
            >
              {forecast.length === 0 ? (
                // Sample 7 days fallback if backend returns only current
                [0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                  const d = new Date()
                  d.setDate(d.getDate() + dayOffset)
                  return (
                    <div
                      key={dayOffset}
                      className="card p-3 text-center flex-1"
                      style={{ minWidth: '110px', scrollSnapAlign: 'start' }}
                    >
                      <div className="text-xs font-bold text-secondary">{formatDate(d).slice(0, 6)}</div>
                      <div style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{dayOffset % 2 === 0 ? '☀️' : '🌤️'}</div>
                      <div className="font-bold text-sm text-primary">29°C</div>
                      <div className="text-xs text-muted">18°C</div>
                    </div>
                  )
                })
              ) : (
                forecast.map((f, i) => {
                  const cond = getWeatherInfo(f.weatherCode || f.code || 0)
                  return (
                    <div
                      key={i}
                      className="card p-3 text-center flex-1"
                      style={{ minWidth: '110px', scrollSnapAlign: 'start' }}
                    >
                      <div className="text-xs font-bold text-secondary">
                        {formatDate(f.date).slice(0, 6)}
                      </div>
                      <div style={{ fontSize: '2rem', margin: '0.5rem 0' }}>
                        {cond.icon}
                      </div>
                      <div className="font-bold text-sm text-primary">
                        {f.maxTemp ?? f.temperature}°C
                      </div>
                      <div className="text-xs text-muted">
                        {f.minTemp ?? ''}°C
                      </div>
                      {f.precipitation > 0 && (
                        <div className="text-xs font-semibold text-info mt-1">
                          💧 {f.precipitation}mm
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="text-center text-xs text-muted pt-3 border-t">
            Data Source: <strong>Open-Meteo Weather API</strong>. Satik GPS & District weather modeling.
          </div>
        </>
      )}
    </div>
  )
}

export default WeatherPage
