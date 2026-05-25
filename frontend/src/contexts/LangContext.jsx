import { createContext, useContext } from 'react'
import { translations } from '../i18n/translations'

const LangContext = createContext()

export function LangProvider({ children }) {
  // Só PT por agora — ES/EN voltam quando houver conteúdo traduzido
  const lang = 'pt'
  const t = translations.pt
  const changeLang = () => {}
  return <LangContext.Provider value={{ lang, t, changeLang }}>{children}</LangContext.Provider>
}

export function useLang() { return useContext(LangContext) }
