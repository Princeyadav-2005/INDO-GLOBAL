import React, { useState, useEffect } from 'react'
import { mandiAPI, harvestAPI } from '../../services/api'
import Alert from '../../components/UI/Alert'
import { formatRupees } from '../../utils/formatters'

export function NetProceedsCalc() {
  // Step 1: Rate & Mandi
  const [mandiRate, setMandiRate] = useState(2400) // ₹ per Quintal
  const [commodity, setCommodity] = useState('Wheat (Gehu)')
  const [mandiName, setMandiName] = useState('Sehore Mandi')

  // Step 2: Quantity
  const [quantityKg, setQuantityKg] = useState(5000) // 50 Quintals

  // Step 3: Costs
  const [transportCost, setTransportCost] = useState(2500)
  const [labourCost, setLabourCost] = useState(1200)
  const [packagingCost, setPackagingCost] = useState(800)
  const [commissionPct, setCommissionPct] = useState(2.0) // 2%
  const [otherCost, setOtherCost] = useState(500)

  // Calculations
  const quantityQuintals = Number(quantityKg) / 100
  const grossProceeds = quantityQuintals * Number(mandiRate)

  const commissionAmount = (grossProceeds * Number(commissionPct)) / 100
  const totalDeductions =
    Number(transportCost) +
    Number(labourCost) +
    Number(packagingCost) +
    commissionAmount +
    Number(otherCost)

  const netProceeds = Math.max(0, grossProceeds - totalDeductions)
  const netRatePerQuintal = quantityQuintals > 0 ? (netProceeds / quantityQuintals).toFixed(0) : 0

  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSaveCalculation = () => {
    // Save to local storage or session
    const calcData = {
      commodity,
      mandiName,
      mandiRate,
      quantityKg,
      quantityQuintals,
      grossProceeds,
      totalDeductions,
      netProceeds,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('last_mandi_calculation', JSON.stringify(calcData))
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="container animate-fadeIn" style={{ maxWidth: '780px' }}>
      <div className="page-header mb-4">
        <div>
          <h2 className="page-title">🧮 Mandi Net Proceeds (Munafa) Calculator</h2>
          <p className="page-subtitle">
            Mandi le jaane se pehle gaadi bhada, hamali aur commission katne ke baad shuddh munafa jaaniye
          </p>
        </div>
      </div>

      {savedSuccess && (
        <Alert
          type="success"
          title="Calculation Surakshit!"
          message="Yeh calculation aapke records me save ho gaya hai."
          onClose={() => setSavedSuccess(false)}
        />
      )}

      <div className="grid grid-2 gap-4">
        {/* Left Inputs */}
        <div className="card p-5">
          <h3 className="section-title text-base mb-3">1. Fasal & Mandi Dar</h3>
          
          <div className="form-group">
            <label className="form-label">Fasal Ka Naam</label>
            <input
              type="text"
              className="input"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
            />
          </div>

          <div className="grid grid-2 gap-3">
            <div className="form-group">
              <label className="form-label">Mandi Ka Naam</label>
              <input
                type="text"
                className="input"
                value={mandiName}
                onChange={(e) => setMandiName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mandi Bhav (₹ / Quintal) *</label>
              <input
                type="number"
                className="input"
                style={{ fontWeight: 'bold' }}
                value={mandiRate}
                onChange={(e) => setMandiRate(e.target.value)}
              />
            </div>
          </div>

          <h3 className="section-title text-base mt-4 mb-3">2. Upaj / Vajan (Quantity)</h3>

          <div className="grid grid-2 gap-3">
            <div className="form-group">
              <label className="form-label">Kul Vajan (Kg me)</label>
              <input
                type="number"
                step="50"
                className="input"
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Barabar (Quintals)</label>
              <div className="input" style={{ backgroundColor: 'var(--color-surface-2)', fontWeight: 'bold' }}>
                {quantityQuintals.toFixed(2)} Qtl
              </div>
            </div>
          </div>

          <h3 className="section-title text-base mt-4 mb-3">3. Mandi Kharch (Deductions)</h3>

          <div className="grid grid-2 gap-3">
            <div className="form-group">
              <label className="form-label">Gaadi Kiraya (Transport ₹)</label>
              <input
                type="number"
                className="input"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hamali / Majdoori (Labour ₹)</label>
              <input
                type="number"
                className="input"
                value={labourCost}
                onChange={(e) => setLabourCost(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-2 gap-3">
            <div className="form-group">
              <label className="form-label">Bori / Packing (₹)</label>
              <input
                type="number"
                className="input"
                value={packagingCost}
                onChange={(e) => setPackagingCost(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Aadhatiya Commission (%)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={commissionPct}
                onChange={(e) => setCommissionPct(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Anya Mandi Shulk / Cess (₹)</label>
            <input
              type="number"
              className="input"
              value={otherCost}
              onChange={(e) => setOtherCost(e.target.value)}
            />
          </div>
        </div>

        {/* Right Calculation Results Card */}
        <div>
          <div
            className="card p-5 mb-4"
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, var(--color-surface-2) 100%)',
              border: '2px solid var(--color-primary-light)',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <span className="badge badge-success mb-2">Net Proceeds Estimate</span>
            
            <div className="mb-4">
              <div className="text-xs text-secondary">Shuddh Haath Aane Wali Rashi (Net Amount):</div>
              <div className="text-3xl font-bold text-primary mt-1">
                {formatRupees(netProceeds, false)}
              </div>
              <div className="text-xs text-secondary mt-1">
                Shuddh Dar: <strong>₹{netRatePerQuintal}</strong> / Quintal (Ghatne ke baad)
              </div>
            </div>

            <hr className="divider" />

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex-between">
                <span className="text-secondary">Kul Bikri (Gross: {quantityQuintals} Qtl × ₹{mandiRate}):</span>
                <span className="font-semibold">{formatRupees(grossProceeds, false)}</span>
              </div>

              <div className="flex-between text-warning">
                <span>Gaadi Bhada (Transport):</span>
                <span>- {formatRupees(transportCost, false)}</span>
              </div>

              <div className="flex-between text-warning">
                <span>Hamali (Labour):</span>
                <span>- {formatRupees(labourCost, false)}</span>
              </div>

              <div className="flex-between text-warning">
                <span>Bori Kharcha:</span>
                <span>- {formatRupees(packagingCost, false)}</span>
              </div>

              <div className="flex-between text-warning">
                <span>Aadhat ({commissionPct}%):</span>
                <span>- {formatRupees(commissionAmount, false)}</span>
              </div>

              {Number(otherCost) > 0 && (
                <div className="flex-between text-warning">
                  <span>Anya Kharcha:</span>
                  <span>- {formatRupees(otherCost, false)}</span>
                </div>
              )}

              <hr className="divider" style={{ margin: '0.5rem 0' }} />

              <div className="flex-between font-bold" style={{ color: 'var(--color-error)' }}>
                <span>Kul Katoti (Total Deductions):</span>
                <span>- {formatRupees(totalDeductions, false)}</span>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleSaveCalculation}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                💾 Yeh Calculation Save Karein
              </button>
            </div>
          </div>

          <div className="card p-4 text-xs text-secondary bg-surface-2">
            <h4 className="font-bold text-text mb-1">📐 Calculation Formula:</h4>
            <p>
              <code>Net Proceeds = (Quantity in Qtl × Mandi Rate) - (Transport + Hamali + Packing + Commission + Other)</code>
            </p>
            <p className="mt-2 text-muted">
              * Dhyan Dein: Yeh keval ek anuman hai. Mandi me boli, nami aur chhanai ke aadhar par antim mulya bhinna ho sakta hai.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NetProceedsCalc
