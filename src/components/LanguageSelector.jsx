import { useState, useRef, useEffect } from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { useTranslation } from '../i18n'

export default function LanguageSelector() {
  const { language, setLanguage, supportedLanguages } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const currentLangObj = supportedLanguages.find((l) => l.code === language) || supportedLanguages[0]

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Vælg sprog / Select language"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-md border border-slate-700/80 shadow-sm transition-all duration-150 cursor-pointer"
      >
        <Globe className="w-3.5 h-3.5 text-sky-400" />
        <span className="mr-0.5">{currentLangObj.flag}</span>
        <span className="font-semibold">{currentLangObj.code.toUpperCase()}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute left-0 mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1 z-[60] animate-dropdown-in motion-reduce:animate-none"
        >
          {supportedLanguages.map((langItem) => {
            const isSelected = langItem.code === language
            return (
              <button
                key={langItem.code}
                role="menuitem"
                type="button"
                onClick={() => {
                  setLanguage(langItem.code)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50 text-sky-950 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">{langItem.flag}</span>
                  <span>{langItem.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 stroke-[2.5]" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
