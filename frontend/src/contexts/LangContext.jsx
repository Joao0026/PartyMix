import { createContext, useContext, useState } from 'react'
import { translations } from '../i18n/translations'

const LangContext = createContext()

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('partymix_lang') || 'pt')
  const t = translations[lang] || translations.pt
  const changeLang = (code) => { setLang(code); localStorage.setItem('partymix_lang', code) }
  return <LangContext.Provider value={{ lang, t, changeLang }}>{children}</LangContext.Provider>
}

export function useLang() { return useContext(LangContext) }
