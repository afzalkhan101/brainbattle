import { useSyncExternalStore } from 'react'
import { translate } from '../i18n/translate'

const themeKey = 'brainbattle.theme'
const languageKey = 'brainbattle.language'
function read(key, fallback) {
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}
let preferences = {
  theme: read(themeKey, window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') === 'dark' ? 'dark' : 'light',
  language: read(languageKey, 'en') === 'bn' ? 'bn' : 'en',
}
const listeners = new Set()
function apply() {
  document.documentElement.classList.toggle('dark', preferences.theme === 'dark')
  document.documentElement.style.colorScheme = preferences.theme
  document.documentElement.lang = preferences.language
}
apply()
function setPreferences(next) {
  preferences = { ...preferences, ...next }
  try { localStorage.setItem(themeKey, preferences.theme); localStorage.setItem(languageKey, preferences.language) } catch { /* Preferences still work when storage is blocked. */ }
  apply()
  listeners.forEach((notify) => notify())
}
window.addEventListener('storage', (event) => {
  if (![themeKey, languageKey, null].includes(event.key)) return
  setPreferences({ theme: read(themeKey, 'light') === 'dark' ? 'dark' : 'light', language: read(languageKey, 'en') === 'bn' ? 'bn' : 'en' })
})
export const t = (value) => translate(value, preferences.language)
export const getLocale = () => preferences.language === 'bn' ? 'bn-BD' : 'en-GB'
export const getTheme = () => preferences.theme
const subscribe = (notify) => { listeners.add(notify); return () => listeners.delete(notify) }
const snapshot = () => preferences
export function usePreferences() {
  const state = useSyncExternalStore(subscribe, snapshot)
  return { ...state, t, locale: getLocale(), setTheme: (theme) => setPreferences({ theme }), setLanguage: (language) => setPreferences({ language }) }
}
