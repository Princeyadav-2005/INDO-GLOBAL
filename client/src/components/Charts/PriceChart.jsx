import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import EmptyState from '../UI/EmptyState'
import { formatDate, formatRupees } from '../../utils/formatters'

// Register Chart.js elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export function PriceChart({ observations = [], title = 'Mandi Bhav Trend', commodity = '' }) {
  if (!observations || observations.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="Bhav Data Uplabdh Nahi"
        subtitle={`${commodity ? `${commodity} ke liye ` : ''}abhi koi bhav record nahi mila hai.`}
      />
    )
  }

  // Sort observations chronologically
  const sorted = [...observations].sort((a, b) => {
    const da = new Date(a.observationDate || a.date || a.createdAt)
    const db = new Date(b.observationDate || b.date || b.createdAt)
    return da - db
  })

  const labels = sorted.map((obs) => formatDate(obs.observationDate || obs.date))
  
  // Modal price in rupees (check if paise or rupees)
  const modalPrices = sorted.map((obs) => {
    const val = obs.modalPrice ?? obs.price ?? 0
    // If > 10000 and not stated, check if paise or per quintal
    return obs.isPaise ? val / 100 : val
  })

  const minPrices = sorted.map((obs) => {
    const val = obs.minPrice ?? obs.modalPrice ?? 0
    return obs.isPaise ? val / 100 : val
  })

  const maxPrices = sorted.map((obs) => {
    const val = obs.maxPrice ?? obs.modalPrice ?? 0
    return obs.isPaise ? val / 100 : val
  })

  const data = {
    labels,
    datasets: [
      {
        label: 'Modal Bhav (₹/Qtl)',
        data: modalPrices,
        borderColor: '#1a5c2a',
        backgroundColor: 'rgba(76, 175, 110, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: '#1a5c2a',
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Adhiktam (Max)',
        data: maxPrices,
        borderColor: '#f59e0b',
        borderDash: [5, 5],
        borderWidth: 1.5,
        pointRadius: 2,
        fill: false,
        tension: 0.2
      },
      {
        label: 'Nyuntam (Min)',
        data: minPrices,
        borderColor: '#6b7280',
        borderDash: [3, 3],
        borderWidth: 1.5,
        pointRadius: 2,
        fill: false,
        tension: 0.2
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Inter', size: 12 },
          usePointStyle: true,
          boxWidth: 8
        }
      },
      title: {
        display: !!title,
        text: title,
        font: { family: 'Inter', size: 14, weight: '600' },
        color: '#1c1c1e'
      },
      tooltip: {
        backgroundColor: 'rgba(15, 61, 28, 0.9)',
        titleFont: { family: 'Inter', size: 13, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 10,
        callbacks: {
          label: (context) => {
            const val = context.parsed.y
            return `${context.dataset.label}: ${formatRupees(val, false)}`
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, maxRotation: 45 }
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: {
          font: { family: 'Inter', size: 11 },
          callback: (value) => `₹${value}`
        }
      }
    }
  }

  return (
    <div className="card p-4" style={{ height: '360px' }}>
      <Line data={data} options={options} />
    </div>
  )
}

export default PriceChart
