import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { usePreferences } from '../../context/Preferences'
import { errorText } from '../admin/shared'

export function useLearning(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    if (!path) { setData(null); setLoading(false); return }
    setLoading(true); setError('')
    const timer = setTimeout(() => {
      api.get(`/api/learning/${path}`, { signal: controller.signal })
        .then(({ data }) => { if (!controller.signal.aborted) setData(data) })
        .catch((error) => { if (!controller.signal.aborted) setError(errorText(error)) })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 150)
    return () => { clearTimeout(timer); controller.abort() }
  }, [path, version])
  return { data, loading, error, refresh: () => setVersion((n) => n + 1) }
}
export function useSubjects() {
  const [subjects, setSubjects] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      let url = '/api/quizzes/subjects/'; const all = []
      while (url) { const { data } = await api.get(url); all.push(...data.results); url = data.next }
      if (active) setSubjects(all)
    }
    load().catch((error) => { if (active) setError(errorText(error)) })
    return () => { active = false }
  }, [])
  return { subjects, error }
}
export function LearningState({ remote, children }) {
  const { t } = usePreferences()
  if (remote.loading) return <div role="status" className="card text-center p-12 text-slate-400">{t('Loading…')}</div>
  if (remote.error) return <div role="alert" className="card text-red-600 space-y-3"><p>{remote.error}</p><button className="btn-secondary" onClick={remote.refresh}>{t('Retry')}</button></div>
  return children
}
export function LearningPager({ remote, page, setPage }) {
  const { t } = usePreferences()
  if (!remote.data?.count) return null
  return <div className="flex items-center justify-between gap-3 py-4 text-xs text-slate-500"><span>{Math.min((page - 1) * 20 + 1, remote.data.count)}–{Math.min(page * 20, remote.data.count)} / {remote.data.count}</span><div className="flex gap-2"><button className="btn-secondary" disabled={page === 1 || remote.loading} onClick={() => setPage(page - 1)}>{t('Previous page')}</button><button className="btn-secondary" disabled={!remote.data.next || remote.loading} onClick={() => setPage(page + 1)}>{t('Next page')}</button></div></div>
}
export function SubjectSelect({ value, onChange, subjects, required = false }) {
  const { t } = usePreferences()
  return <select aria-label={t('Subject')} className="input bg-white" value={value} onChange={(e) => onChange(e.target.value)} required={required}><option value="">{t(required ? 'Select a subject' : 'All Subjects')}</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name} · {t(s.class_level_display || s.class_level)}</option>)}</select>
}
export const localInput = (value) => { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
export const query = (values) => new URLSearchParams(Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined)).toString()
