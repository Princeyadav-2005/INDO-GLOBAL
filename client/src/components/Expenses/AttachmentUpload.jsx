import React, { useState, useEffect } from 'react'
import { expensesAPI } from '../../services/api'
import Alert from '../UI/Alert'

export function AttachmentUpload({ expenseId, onUploadSuccess }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [loadingList, setLoadingList] = useState(false)

  useEffect(() => {
    if (expenseId) {
      loadAttachments()
    }
  }, [expenseId])

  const loadAttachments = async () => {
    try {
      setLoadingList(true)
      const res = await expensesAPI.getAttachments(expenseId)
      const list = res.attachments || res.data || (Array.isArray(res) ? res : [])
      setAttachments(list)
    } catch (err) {
      console.warn('Failed to fetch attachments:', err)
    } finally {
      setLoadingList(false)
    }
  }

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    setError(null)
    setSuccess(null)
    if (!selected) {
      setFile(null)
      setPreview(null)
      return
    }

    // Check size limit (max 5MB)
    if (selected.size > 5 * 1024 * 1024) {
      setError('File size 5MB se kam honi chahiye.')
      return
    }

    setFile(selected)

    if (selected.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(selected)
    } else {
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Kripya pehle bill ya raseed select karein.')
      return
    }

    if (!expenseId) {
      setError('Expense ID nahi mili. Kripya pehle kharcha save karein.')
      return
    }

    try {
      setUploading(true)
      setError(null)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('attachment', file)

      const res = await expensesAPI.uploadAttachment(expenseId, formData)
      setSuccess('Bill safaltapoorvak upload ho gaya!')
      setFile(null)
      setPreview(null)
      loadAttachments()
      if (onUploadSuccess) {
        onUploadSuccess(res)
      }
    } catch (err) {
      setError(err.message || 'Upload me truti hui. Dobara koshish karein.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card p-4 animate-fadeIn" style={{ backgroundColor: 'var(--color-surface-2)' }}>
      <h4 className="font-semibold text-sm mb-2 text-primary">
        🧾 Raseed ya Bill Attach Karein (Evidence Upload)
      </h4>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="mb-3">
        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
          📷 Photo / PDF Chunein
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>
        {file && (
          <span className="text-xs text-secondary ml-2 font-medium">
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </span>
        )}
      </div>

      {preview && (
        <div className="mb-3">
          <img
            src={preview}
            alt="Preview"
            style={{
              maxHeight: '140px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              objectFit: 'cover'
            }}
          />
        </div>
      )}

      {file && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="btn btn-primary btn-sm"
        >
          {uploading ? '⏳ Upload ho raha hai...' : '⬆️ Bill Upload Karein'}
        </button>
      )}

      {/* List of uploaded attachments */}
      {attachments.length > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <span className="text-xs font-bold text-secondary">Upload Kiye Gaye Dastavej:</span>
          <div className="flex gap-2 flex-wrap mt-1">
            {attachments.map((att, i) => (
              <span key={att.id || i} className="chip text-xs">
                📄 {att.filename || `Receipt #${i + 1}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AttachmentUpload
