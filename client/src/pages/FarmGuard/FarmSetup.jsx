import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { farmsAPI, seasonsAPI } from '../../services/api'
import Alert from '../../components/UI/Alert'
import LoadingSpinner from '../../components/UI/LoadingSpinner'

const INDIAN_STATES = [
  'Madhya Pradesh', 'Maharashtra', 'Uttar Pradesh', 'Punjab', 'Haryana',
  'Rajasthan', 'Gujarat', 'Bihar', 'West Bengal', 'Karnataka',
  'Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Chhattisgarh', 'Odisha'
]

export function FarmSetup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)
  const [existingFarms, setExistingFarms] = useState([])
  const [useExistingFarm, setUseExistingFarm] = useState(false)
  const [selectedFarmId, setSelectedFarmId] = useState('')

  const [formData, setFormData] = useState({
    // Farm
    farmName: '',
    district: '',
    state: 'Madhya Pradesh',
    area: '',
    areaUnit: 'Acre',
    soilType: 'Kali Mitti (Black Soil)',
    waterSource: 'Tube Well (Borewell)',

    // Plot
    plotName: 'Plot A',
    plotArea: '',
    plotNotes: '',

    // Season
    crop: 'Gehu (Wheat)',
    variety: 'Sharbati / Lokwan',
    startDate: new Date().toISOString().split('T')[0],
    expectedHarvestDate: '',
    agreementTerms: 'Batai (50-50 hissedari)'
  })

  useEffect(() => {
    loadExistingFarms()
  }, [])

  const loadExistingFarms = async () => {
    try {
      setInitialLoading(true)
      const res = await farmsAPI.list()
      const list = res.farms || res.data || (Array.isArray(res) ? res : [])
      setExistingFarms(list)
      if (list.length > 0) {
        setSelectedFarmId(list[0].id || list[0]._id)
      }
    } catch (err) {
      console.warn('Could not load existing farms:', err)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleNext = (e) => {
    e.preventDefault()
    setError(null)

    if (step === 1 && !useExistingFarm) {
      if (!formData.farmName || !formData.area) {
        setError('Kripya Khet ka naam aur kshetrafal (Area) darj karein.')
        return
      }
    }

    if (step === 2) {
      if (!formData.plotName) {
        setError('Kripya Plot ka naam darj karein.')
        return
      }
    }

    if (step === 3) {
      if (!formData.crop || !formData.startDate) {
        setError('Kripya fasal aur buwai ki tareekh darj karein.')
        return
      }
    }

    setStep(step + 1)
  }

  const handleFinalSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      let farmId = selectedFarmId

      // 1. Create Farm if not using existing
      if (!useExistingFarm || !farmId) {
        const farmPayload = {
          name: formData.farmName,
          district: formData.district,
          state: formData.state,
          totalArea: parseFloat(formData.area) || 0,
          areaUnit: formData.areaUnit,
          soilType: formData.soilType,
          waterSource: formData.waterSource
        }
        const createdFarm = await farmsAPI.create(farmPayload)
        farmId = createdFarm.id || createdFarm._id || (createdFarm.farm && (createdFarm.farm.id || createdFarm.farm._id))
      }

      // 2. Create Plot
      let plotId = null
      if (farmId) {
        try {
          const plotPayload = {
            name: formData.plotName,
            area: parseFloat(formData.plotArea || formData.area) || 0,
            notes: formData.plotNotes
          }
          const createdPlot = await farmsAPI.createPlot(farmId, plotPayload)
          plotId = createdPlot.id || createdPlot._id
        } catch (plotErr) {
          console.warn('Plot creation warning:', plotErr)
        }
      }

      // 3. Create Season
      const seasonPayload = {
        farmId,
        plotId,
        farmName: useExistingFarm ? (existingFarms.find(f => (f.id || f._id) === farmId)?.name || 'Mera Khet') : formData.farmName,
        plotName: formData.plotName,
        crop: formData.crop,
        variety: formData.variety,
        startDate: formData.startDate,
        expectedHarvestDate: formData.expectedHarvestDate || undefined,
        agreementTerms: formData.agreementTerms,
        status: 'active'
      }

      await seasonsAPI.create(seasonPayload)
      navigate('/farmguard')
    } catch (err) {
      setError(err.message || 'Khet aur Fasal darj karne me truti hui. Dobara koshish karein.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return <LoadingSpinner message="Khet setup form khul raha hai..." />
  }

  return (
    <div className="container animate-fadeIn" style={{ maxWidth: '680px' }}>
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">🌱 Khet & Fasal Setup Wizard</h2>
          <p className="page-subtitle">Apni jameen, plot aur fasal ka vivaran darj karein</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="card p-3 mb-4">
        <div className="flex-between text-center">
          {[
            { s: 1, label: 'Khet' },
            { s: 2, label: 'Plot' },
            { s: 3, label: 'Fasal' },
            { s: 4, label: 'Jaanch' }
          ].map((item) => (
            <div
              key={item.s}
              className="flex items-center gap-1"
              style={{
                opacity: step >= item.s ? 1 : 0.45,
                fontWeight: step === item.s ? 'bold' : 'normal',
                color: step >= item.s ? 'var(--color-primary)' : 'var(--color-text-secondary)'
              }}
            >
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: step >= item.s ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: step >= item.s ? '#ffffff' : 'var(--color-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem'
                }}
              >
                {item.s}
              </span>
              <span className="text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="card p-6">
        {/* STEP 1: Farm Details */}
        {step === 1 && (
          <form onSubmit={handleNext}>
            <h3 className="section-title mb-3">Kadam 1: Khet Ki Jankari</h3>

            {existingFarms.length > 0 && (
              <div className="mb-4 p-3 bg-surface-2 rounded">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={useExistingFarm}
                    onChange={(e) => setUseExistingFarm(e.target.checked)}
                  />
                  Purane Khet Me Nayi Fasal Jodein
                </label>

                {useExistingFarm && (
                  <div className="mt-2">
                    <select
                      className="select"
                      value={selectedFarmId}
                      onChange={(e) => setSelectedFarmId(e.target.value)}
                    >
                      {existingFarms.map((f) => (
                        <option key={f.id || f._id} value={f.id || f._id}>
                          {f.name} ({f.totalArea || f.area} {f.areaUnit || 'Acre'}) - {f.district}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {!useExistingFarm && (
              <>
                <div className="form-group">
                  <label className="form-label">Khet Ka Naam *</label>
                  <input
                    type="text"
                    name="farmName"
                    className="input"
                    placeholder="Jaise: Narmada Kinare Wala Khet"
                    value={formData.farmName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="grid grid-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">Kul Kshetrafal (Area) *</label>
                    <input
                      type="number"
                      step="0.1"
                      name="area"
                      className="input"
                      placeholder="5"
                      value={formData.area}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ikai (Unit)</label>
                    <select name="areaUnit" className="select" value={formData.areaUnit} onChange={handleChange}>
                      <option value="Acre">Acre (एकड़)</option>
                      <option value="Bigha">Bigha (बीघा)</option>
                      <option value="Hectare">Hectare (हेक्टेयर)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">Rajya (State)</label>
                    <select name="state" className="select" value={formData.state} onChange={handleChange}>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jila (District)</label>
                    <input
                      type="text"
                      name="district"
                      className="input"
                      placeholder="Jaise: Sehore"
                      value={formData.district}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">Mitti Ka Prakaar (Soil)</label>
                    <select name="soilType" className="select" value={formData.soilType} onChange={handleChange}>
                      <option value="Kali Mitti (Black Soil)">Kali Mitti (Black Soil)</option>
                      <option value="Lal Mitti (Red Soil)">Lal Mitti (Red Soil)</option>
                      <option value="Domat Mitti (Alluvial)">Domat Mitti (Alluvial)</option>
                      <option value="Balui Mitti (Sandy)">Balui Mitti (Sandy)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pani Ka Sadhan (Water)</label>
                    <select name="waterSource" className="select" value={formData.waterSource} onChange={handleChange}>
                      <option value="Tube Well (Borewell)">Tube Well (Borewell)</option>
                      <option value="Nehar (Canal)">Nehar (Canal)</option>
                      <option value="Kuan (Open Well)">Kuan (Open Well)</option>
                      <option value="Barish (Rainfed)">Sirf Barish (Rainfed)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end mt-4">
              <button type="submit" className="btn btn-primary">
                Aage Badhein (Plot Setup) ➔
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Plot Details */}
        {step === 2 && (
          <form onSubmit={handleNext}>
            <h3 className="section-title mb-3">Kadam 2: Plot Vivaran</h3>
            <p className="text-xs text-secondary mb-4">
              Yadi aapne khet ko hisson me baanta hua hai, to plot ka naam darj karein.
            </p>

            <div className="form-group">
              <label className="form-label">Plot Ka Naam *</label>
              <input
                type="text"
                name="plotName"
                className="input"
                placeholder="Jaise: Plot A / Pandraha Bigha Tukda"
                value={formData.plotName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Plot Kshetrafal (Optional)</label>
              <input
                type="number"
                step="0.1"
                name="plotArea"
                className="input"
                placeholder="Yadi pura khet hai to khali chhod sakte hain"
                value={formData.plotArea}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Plot Ki Vishesh Tiphani (Notes)</label>
              <textarea
                name="plotNotes"
                className="textarea"
                placeholder="Jaise: Niche ki taraf dhalan hai, sinchai aasan hai..."
                value={formData.plotNotes}
                onChange={handleChange}
              />
            </div>

            <div className="flex-between mt-4">
              <button type="button" onClick={() => setStep(1)} className="btn btn-outline">
                ⬅ Pichhe
              </button>
              <button type="submit" className="btn btn-primary">
                Aage Badhein (Fasal Vivaran) ➔
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Season / Crop Details */}
        {step === 3 && (
          <form onSubmit={handleNext}>
            <h3 className="section-title mb-3">Kadam 3: Fasal & Batai Niyam</h3>

            <div className="grid grid-2 gap-3">
              <div className="form-group">
                <label className="form-label">Fasal Ka Naam (Crop) *</label>
                <input
                  type="text"
                  name="crop"
                  className="input"
                  placeholder="Jaise: Gehu, Soyabean, Chana, Dhan"
                  value={formData.crop}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Kism / Variety</label>
                <input
                  type="text"
                  name="variety"
                  className="input"
                  placeholder="Jaise: Sharbati, JS-9560, Pusa"
                  value={formData.variety}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-2 gap-3">
              <div className="form-group">
                <label className="form-label">Buwai Ki Tareekh (Start Date) *</label>
                <input
                  type="date"
                  name="startDate"
                  className="input"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Anumanit Katai (Harvest Date)</label>
                <input
                  type="date"
                  name="expectedHarvestDate"
                  className="input"
                  value={formData.expectedHarvestDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Batai / Samjhauta Niyam (Agreement Terms)</label>
              <select
                name="agreementTerms"
                className="select"
                value={formData.agreementTerms}
                onChange={handleChange}
              >
                <option value="Self / Nijee (100% Kisan)">Nijee Kheti (Self - 100% Kisan)</option>
                <option value="Batai (50-50 hissedari)">Adhiya / Batai (50% - 50% Lagat aur Upaj)</option>
                <option value="Tihai (1/3 Hissedari)">Tihai (33.3% Operator, 66.7% Malik)</option>
                <option value="Theka / Lease (Fixed Rent)">Fixed Kiraya (Lease / Theka)</option>
              </select>
            </div>

            <div className="flex-between mt-4">
              <button type="button" onClick={() => setStep(2)} className="btn btn-outline">
                ⬅ Pichhe
              </button>
              <button type="submit" className="btn btn-primary">
                Aage Badhein (Pushti Karein) ➔
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Review & Confirm */}
        {step === 4 && (
          <div className="animate-fadeIn">
            <h3 className="section-title mb-3">Kadam 4: Vivaran Ki Pushti Karein</h3>

            <div className="p-4 bg-surface-2 rounded mb-4 text-sm">
              <div className="grid grid-2 gap-3">
                <div>
                  <span className="text-secondary">Khet:</span>
                  <div className="font-bold">{useExistingFarm ? 'Purana Chuna Hua Khet' : formData.farmName}</div>
                </div>
                <div>
                  <span className="text-secondary">Kshetrafal:</span>
                  <div className="font-bold">{formData.area || '—'} {formData.areaUnit}</div>
                </div>
                <div>
                  <span className="text-secondary">Plot:</span>
                  <div className="font-bold">{formData.plotName}</div>
                </div>
                <div>
                  <span className="text-secondary">Fasal:</span>
                  <div className="font-bold text-primary">{formData.crop} ({formData.variety || 'Samanya'})</div>
                </div>
                <div>
                  <span className="text-secondary">Buwai Ki Tareekh:</span>
                  <div className="font-bold">{formData.startDate}</div>
                </div>
                <div>
                  <span className="text-secondary">Batai Niyam:</span>
                  <div className="font-bold text-accent">{formData.agreementTerms}</div>
                </div>
              </div>
            </div>

            <div className="flex-between mt-4">
              <button type="button" onClick={() => setStep(3)} className="btn btn-outline">
                ⬅ Pichhe
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading}
                className="btn btn-primary btn-lg"
              >
                {loading ? '⏳ Surakshit ho raha hai...' : '✓ Khet & Fasal Save Karein'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FarmSetup
