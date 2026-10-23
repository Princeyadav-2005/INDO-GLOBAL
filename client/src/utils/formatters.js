/**
 * Format currency in Indian Rupees format (₹X,XX,XXX)
 * @param {number} amount - Amount in paise or rupees
 * @param {boolean} isPaise - If true, divides amount by 100 first
 * @returns {string} Formatted rupees string
 */
export function formatRupees(amount, isPaise = true) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0'
  const rupees = isPaise ? Number(amount) / 100 : Number(amount)
  
  // Format with en-IN locale
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0
  }).format(rupees)
  
  return `₹${formatted}`
}

/**
 * Format paise to rupees as a raw number or input value
 */
export function paiseToRupees(paise) {
  if (paise === undefined || paise === null || isNaN(paise)) return 0
  return Number(paise) / 100
}

/**
 * Convert rupees to paise
 */
export function rupeesToPaise(rupees) {
  if (rupees === undefined || rupees === null || isNaN(rupees)) return 0
  return Math.round(Number(rupees) * 100)
}

/**
 * Format date string to Indian readable date (e.g. 15 Aug 2024)
 */
export function formatDate(dateString) {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Format date with time
 */
export function formatDateTime(dateString) {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Determine freshness of mandi observation
 * @param {string|Date} observationDate 
 * @returns {{ days: number, color: string, badgeClass: string, label: string }}
 */
export function getMandiFreshness(observationDate) {
  if (!observationDate) return { days: 999, color: 'var(--color-error)', badgeClass: 'badge-error', label: 'Purana' }
  const obs = new Date(observationDate)
  const today = new Date()
  const diffTime = Math.abs(today - obs)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 3) {
    return { days: diffDays, color: 'var(--color-success)', badgeClass: 'badge-success', label: `${diffDays}d pehle (Taaza)` }
  } else if (diffDays <= 7) {
    return { days: diffDays, color: 'var(--color-warning)', badgeClass: 'badge-warning', label: `${diffDays}d pehle` }
  } else if (diffDays <= 14) {
    return { days: diffDays, color: '#f97316', badgeClass: 'badge-warning', label: `${diffDays}d pehle` }
  } else {
    return { days: diffDays, color: 'var(--color-error)', badgeClass: 'badge-error', label: `${diffDays}d+ pehle` }
  }
}
