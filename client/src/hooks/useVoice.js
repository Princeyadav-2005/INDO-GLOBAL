import { useState, useRef, useEffect, useCallback } from 'react'

export function useVoice({ language = 'hi-IN', onTranscript, onError } = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null

  const isSupported = !!SpeechRecognition

  useEffect(() => {
    if (!isSupported) {
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = language

      recognition.onresult = (event) => {
        let currentTranscript = ''
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript
        }
        setTranscript(currentTranscript)
        if (onTranscript) {
          onTranscript(currentTranscript)
        }
      }

      recognition.onerror = (event) => {
        let errMsg = event.error
        if (event.error === 'not-allowed') {
          errMsg = 'Microphone access denied. Kripya browser settings se microphone permission dein.'
        } else if (event.error === 'no-speech') {
          errMsg = 'Koi aawaz nahi sunai di. Dobara boliye.'
        } else if (event.error === 'network') {
          errMsg = 'Network issue ki wajah se speech recognition band hua.'
        }
        setError(errMsg)
        setIsRecording(false)
        if (onError) onError(errMsg)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    } catch (e) {
      setError(e.message)
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (_) {}
      }
    }
  }, [isSupported, language, onTranscript, onError])

  const startRecording = useCallback(() => {
    if (!isSupported) {
      const msg = 'Aapke browser me aawaz se bolne ki suvidha (Speech Recognition) uplabdh nahi hai. Kripya Chrome ya Edge use karein.'
      setError(msg)
      if (onError) onError(msg)
      return
    }

    try {
      setError(null)
      setTranscript('')
      if (recognitionRef.current) {
        recognitionRef.current.lang = language
        recognitionRef.current.start()
        setIsRecording(true)
      }
    } catch (err) {
      console.warn('SpeechRecognition start error:', err)
      // If already started or pending
      if (err.name !== 'InvalidStateError') {
        setError(err.message)
        if (onError) onError(err.message)
      }
    }
  }, [isSupported, language, onError])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop()
      } catch (_) {}
      setIsRecording(false)
    }
  }, [isRecording])

  return {
    isRecording,
    transcript,
    isSupported,
    error,
    startRecording,
    stopRecording,
    setTranscript
  }
}
