import React, { useState } from 'react'
import { formatRupees, formatDate } from '../../utils/formatters'

const CATEGORY_ICONS = {
  seeds: '🌱',
  fertilizer: '🧪',
  pesticide: '🧴',
  labour: '👨‍🌾',
  machinery: '🚜',
  irrigation: '💧',
  diesel: '⛽',
  transport: '🚚',
  packaging: '📦',
  other: '🏷️'
}

const CATEGORY_NAMES = {
  seeds: 'Beej (Seeds)',
  fertilizer: 'Khaad (Fertilizer)',
  pesticide: 'Dawa (Pesticide)',
  labour: 'Majdoori (Labour)',
  machinery: 'Kiraya / Machine',
  irrigation: 'Sinchai (Irrigation)',
  diesel: 'Diesel / Fuel',
  transport: 'Kiraya / Transport',
  packaging: 'Packing',
  other: 'Anya Kharcha'
}

export function ExpenseCard({
  expense,
  onEdit,
  onReview,
  onDispute,
  showActions = true,
  userRole = 'farmer'
}) {
  const [expanded, setExpanded] = useState(false)

  if (!expense) return null

  const category = (expense.category || 'other').toLowerCase()
  const icon = CATEGORY_ICONS[category] || '🏷️'
  const categoryLabel = CATEGORY_NAMES[category] || expense.category || 'Anya'
  
  const hasReceipt = !!(expense.attachments?.length || expense.hasReceipt || expense.receiptUrl)
  const reviewStatus = expense.reviewStatus || expense.status || 'pending'

  const getStatusBadge = () => {
    switch (reviewStatus) {
      case 'acknowledged':
      case 'approved':
        return <span className="badge badge-success">✓ Manya (Approved)</span>
      case 'disputed':
        return <span className="badge badge-error">⚠ Vivadit (Disputed)</span>
      case 'pending':
      default:
        return <span className="badge badge-warning">⏳ Jaanch Baaki (Pending)</span>
    }
  }

  return (
    <div className="card card-hover mb-3 animate-fadeIn" style={{ borderLeft: `4px solid var(--color-primary)` }}>
      <div className="flex-between items-center" style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem'
            }}
          >
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
              {expense.description || categoryLabel}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-secondary">{formatDate(expense.date || expense.createdAt)}</span>
              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                {categoryLabel}
              </span>
              {hasReceipt ? (
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                  🧾 Bill Attached
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                  ❌ Bill Missing
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="font-bold text-lg text-primary">
            {formatRupees(
              expense.amountPaise != null
                ? expense.amountPaise
                : (expense.amount != null
                    ? (expense.isPaise === false ? expense.amount * 100 : expense.amount)
                    : (expense.amountRupees ? expense.amountRupees * 100 : 0)),
              true
            )}
          </div>
          <div className="mt-1">{getStatusBadge()}</div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="grid grid-2 gap-3 mb-3 text-sm">
            <div>
              <span className="text-secondary font-medium">Fasal / Plot: </span>
              <strong>{expense.crop || expense.plotName || 'Samanya'}</strong>
            </div>
            <div>
              <span className="text-secondary font-medium">Bhugtan Madhyam: </span>
              <strong>{expense.paymentMethod || 'Cash'}</strong>
            </div>
            {expense.quantity && (
              <div>
                <span className="text-secondary font-medium">Matra (Qty): </span>
                <strong>{expense.quantity} {expense.unit || 'Kg'}</strong>
              </div>
            )}
            {expense.paidTo && (
              <div>
                <span className="text-secondary font-medium">Kisko Diya: </span>
                <strong>{expense.paidTo}</strong>
              </div>
            )}
          </div>

          {expense.notes && (
            <div className="p-2 mb-3 bg-surface-2 rounded text-sm text-secondary">
              <strong>Notes:</strong> {expense.notes}
            </div>
          )}

          {expense.voiceTranscript && (
            <div className="p-2 mb-3 bg-surface-2 rounded text-xs text-muted">
              <strong>🎙️ Aawaz Record:</strong> "{expense.voiceTranscript}"
            </div>
          )}

          {expense.attachments && expense.attachments.length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-bold text-secondary uppercase mb-1 block">Sanlagna Dastavej (Bills):</span>
              <div className="flex gap-2 flex-wrap">
                {expense.attachments.map((att, idx) => (
                  <a
                    key={att.id || idx}
                    href={att.url || att.path}
                    target="_blank"
                    rel="noreferrer"
                    className="chip text-xs"
                  >
                    📎 {att.filename || `Receipt #${idx + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}

          {showActions && (
            <div className="flex justify-between items-center pt-2 mt-2" style={{ borderTop: '1px dashed var(--color-border)' }}>
              <div>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(expense)}
                    className="btn btn-ghost btn-sm"
                  >
                    ✏️ Sudhar (Edit)
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {onDispute && reviewStatus !== 'disputed' && (
                  <button
                    type="button"
                    onClick={() => onDispute(expense)}
                    className="btn btn-outline btn-sm text-error"
                    style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                  >
                    ⚠️ Vivad (Dispute)
                  </button>
                )}
                {onReview && reviewStatus !== 'acknowledged' && (
                  <button
                    type="button"
                    onClick={() => onReview(expense)}
                    className="btn btn-primary btn-sm"
                  >
                    ✓ Swikar Karein (Approve)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ExpenseCard
