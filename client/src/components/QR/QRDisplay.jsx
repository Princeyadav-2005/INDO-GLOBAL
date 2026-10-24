import React, { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import QRCodeLib from 'qrcode'

export function QRDisplay({ url, qrDataUrl, size = 200, label = 'Khet Passport QR' }) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [imgSrc, setImgSrc] = useState(qrDataUrl || '')

  useEffect(() => {
    if (qrDataUrl) {
      setImgSrc(qrDataUrl)
      return
    }
    if (url) {
      QRCodeLib.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f3d1c',
          light: '#ffffff'
        }
      })
        .then((dataUri) => setImgSrc(dataUri))
        .catch(() => {})
    }
  }, [url, qrDataUrl])

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const dataUrl = imgSrc || await QRCodeLib.toDataURL(url, {
        width: 600,
        margin: 2,
        color: {
          dark: '#0f3d1c',
          light: '#ffffff'
        }
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `farmer-connect-passport-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download QR failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: label,
          text: `Farmer Connect 2.0 Khet Passport dekhein: ${url}`,
          url
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err)
        }
      }
    } else {
      handleCopy()
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div
      className="card text-center p-6 animate-fadeIn"
      style={{
        maxWidth: '380px',
        margin: '0 auto',
        border: '2px solid var(--color-primary-light)',
        boxShadow: 'var(--shadow-md)'
      }}
    >
      <h3 className="font-bold text-lg mb-1 text-primary">{label}</h3>
      <p className="text-xs text-secondary mb-4">
        Scan karke khet ka verified hisaab dekhein
      </p>

      <div
        style={{
          background: '#ffffff',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          display: 'inline-block',
          border: '1px solid var(--color-border)',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.03)'
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt="QR Code"
            style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <QRCode
            value={url || 'https://farmerconnect.in'}
            size={size}
            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
            viewBox={`0 0 256 256`}
            fgColor="#0f3d1c"
          />
        )}
      </div>

      <div className="mt-4 p-2 bg-surface-2 rounded text-xs text-muted" style={{ wordBreak: 'break-all' }}>
        <a href={url} target="_blank" rel="noreferrer" className="text-secondary font-medium">
          {url}
        </a>
      </div>

      <div className="flex-center gap-2 mt-4 flex-wrap">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="btn btn-outline btn-sm"
        >
          📥 {downloading ? 'Download ho raha...' : 'Save PNG'}
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="btn btn-primary btn-sm"
        >
          📤 Share Karein
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-ghost btn-sm"
        >
          📋 {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  )
}

export default QRDisplay
