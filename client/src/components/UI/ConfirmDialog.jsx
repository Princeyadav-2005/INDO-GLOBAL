import React from 'react'
import Modal from './Modal'

export function ConfirmDialog({
  isOpen,
  title = 'Pushti Karein',
  message = 'Kya aap aage badhna chahte hain?',
  onConfirm,
  onCancel,
  confirmText = 'Haan, Karein',
  cancelText = 'Raddh Karein',
  danger = false
}) {
  const footer = (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
        {cancelText}
      </button>
      <button
        type="button"
        className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`}
        onClick={onConfirm}
      >
        {confirmText}
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} footer={footer}>
      <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
        {message}
      </p>
    </Modal>
  )
}

export default ConfirmDialog
