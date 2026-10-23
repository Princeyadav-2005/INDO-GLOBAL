import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import translations from '../i18n/translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('fc_lang') || 'hi'
  })

  // t(key) → returns translated string or fallback to key
  const t = useCallback((key) => {
    return translations[lang]?.[key] || translations['hi']?.[key] || key
  }, [lang])

  const setLang = useCallback((newLang) => {
    if (newLang !== 'en' && newLang !== 'hi') return
    localStorage.setItem('fc_lang', newLang)
    setLangState(newLang)
  }, [])

  // Sync with user.language from profile if available
  const syncLangFromUser = useCallback((userLang) => {
    if (!userLang) return
    const mapped = userLang === 'en' ? 'en' : 'hi'
    localStorage.setItem('fc_lang', mapped)
    setLangState(mapped)
  }, [])

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, syncLangFromUser }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

export default LanguageContext
