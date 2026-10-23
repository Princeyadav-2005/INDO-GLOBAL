import React, { useState } from 'react'
import { useVoice } from '../../hooks/useVoice'

export function VoiceRecorder({ onTranscript, language = 'hi-IN' }) {
  const [internalError, setInternalError] = useState(null)

  const {
    isRecording,
    transcript,
    isSupported,
    error,
    startRecording,
    stopRecording,
    setTranscript
  } = useVoice({
    language,
    onError: (err) => setInternalError(err)
  })

  const handleToggleRecord = () => {
    setInternalError(null)
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const handleParse = () => {
    if (transcript.trim() && onTranscript) {
      onTranscript(transcript)
    }
  }

  const handleClear = () => {
    setTranscript('')
    setInternalError(null)
  }

  return (
    <div className="card text-center p-6 animate-fadeIn" style={{ background: 'var(--color-surface)' }}>
      {!isSupported ? (
        <div className="alert alert-warning mb-4">
          <span>⚠️</span>
          <div>
            <strong>Aawaz Suvidha Uplabdh Nahi Hai</strong>
            <p className="text-sm">
              Aapka browser Web Speech API support nahi karta. Kripya niche diye gaye form me manual entry karein ya Google Chrome use karein.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <button
              type="button"
              onClick={handleToggleRecord}
              className="btn btn-icon"
              style={{
                width: '84px',
                height: '84px',
                fontSize: '2.25rem',
                backgroundColor: isRecording ? 'var(--color-error)' : 'var(--color-primary)',
                color: '#ffffff',
                boxShadow: isRecording
                  ? '0 0 0 10px rgba(220, 38, 38, 0.25)'
                  : '0 0 0 8px rgba(26, 92, 42, 0.15)',
                animation: isRecording ? 'pulse-red 1.5s infinite' : 'none',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={isRecording ? 'Aawaz band karein' : 'Bolne ke liye tap karein'}
            >
              {isRecording ? '⏹️' : '🎙️'}
            </button>
          </div>

          <div className="mb-3">
            {isRecording ? (
              <span className="badge badge-error" style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem' }}>
                🔴 Sun rahe hain... Boliye
              </span>
            ) : (
              <p className="font-semibold text-primary" style={{ fontSize: '1rem' }}>
                Bolein: <em>"Kal 2 bori DAP khareedi 2700 rupaye me"</em>
              </p>
            )}
            <p className="text-xs text-secondary mt-1">
              {isRecording ? 'Rukne ke liye button par dobara tap karein' : 'Mic button dabakar bolna shuru karein'}
            </p>
          </div>

          {(error || internalError) && (
            <div className="alert alert-warning text-sm mb-3">
              <span>⚠️</span>
              <div>{error || internalError}</div>
            </div>
          )}

          {transcript && (
            <div
              className="p-4 mb-4 text-left"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                minHeight: '60px'
              }}
            >
              <div className="flex-between mb-1">
                <span className="text-xs font-bold text-secondary uppercase">Aapne bola:</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                >
                  Saaf karein
                </button>
              </div>
              <p className="font-medium" style={{ fontSize: '1.05rem', color: 'var(--color-text)' }}>
                "{transcript}"
              </p>
            </div>
          )}

          {transcript && !isRecording && (
            <div className="flex-center gap-3">
              <button
                type="button"
                onClick={handleParse}
                className="btn btn-primary"
                style={{ width: '100%', maxWidth: '280px' }}
              >
                ✨ AI Se Kharcha Samajhein (Parse)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default VoiceRecorder
