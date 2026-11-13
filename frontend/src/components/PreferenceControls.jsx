import { Moon, Sun, Languages } from 'lucide-react'
import { usePreferences } from '../context/Preferences'

export default function PreferenceControls({ floating = false }) {
  const { theme, language, setTheme, setLanguage, t } = usePreferences()
  return <div className={`flex items-center gap-2 shrink-0 ${floating ? 'fixed top-4 right-4 z-40' : ''}`}>
    <button type="button" className="preference-button w-10 h-10 justify-center" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')} title={t(theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')} aria-pressed={theme === 'dark'}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
    <button type="button" className="preference-button h-10 px-3 gap-1.5" onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')} aria-label={t(language === 'bn' ? 'Switch to English' : 'Switch to Bangla')} title={t(language === 'bn' ? 'Switch to English' : 'Switch to Bangla')}><Languages size={17} /><span className="text-sm font-semibold" lang={language === 'en' ? 'bn' : 'en'}>{language === 'bn' ? 'English' : 'বাংলা'}</span></button>
  </div>
}
