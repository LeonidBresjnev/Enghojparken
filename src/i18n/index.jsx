import { createContext, useContext, useState } from 'react'
import da from './da'
import en from './en'

export const translations = {
  da,
  en,
}

export const SUPPORTED_LANGUAGES = [
  { code: 'da', label: 'Dansk', flag: '🇩🇰' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
]

export const DEFAULT_LANGUAGE = 'da'

export const I18nContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key, params = {}) => getTranslation(DEFAULT_LANGUAGE, key, params),
  supportedLanguages: SUPPORTED_LANGUAGES,
})

/**
 * Helper function to retrieve nested translation key e.g. 'auth.logIn' or 'columns.todo'
 */
export function getTranslation(lang, keyPath, params = {}) {
  const dict = translations[lang] || translations[DEFAULT_LANGUAGE]
  const keys = keyPath.split('.')
  let current = dict

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k]
    } else {
      // Fallback to default language if missing in current lang
      let fallback = translations[DEFAULT_LANGUAGE]
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk]
        } else {
          fallback = null
          break
        }
      }
      current = fallback || keyPath
      break
    }
  }

  if (typeof current !== 'string') {
    return keyPath
  }

  // Replace {paramName} in string
  let result = current
  Object.keys(params).forEach((paramKey) => {
    result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey])
  })

  return result
}

export function I18nProvider({ children, initialLanguage }) {
  const [language, setLanguageState] = useState(() => {
    if (initialLanguage && translations[initialLanguage]) {
      return initialLanguage
    }
    try {
      const saved = localStorage.getItem('app_language')
      if (saved && translations[saved]) {
        return saved
      }
    } catch {
      // Ignore localStorage access errors
    }
    return DEFAULT_LANGUAGE
  })

  const setLanguage = (newLang) => {
    if (translations[newLang]) {
      setLanguageState(newLang)
      try {
        localStorage.setItem('app_language', newLang)
      } catch {
        // Ignore localStorage access errors
      }
    }
  }

  const t = (keyPath, params = {}) => {
    return getTranslation(language, keyPath, params)
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key, params = {}) => getTranslation(DEFAULT_LANGUAGE, key, params),
      supportedLanguages: SUPPORTED_LANGUAGES,
    }
  }
  return context
}
