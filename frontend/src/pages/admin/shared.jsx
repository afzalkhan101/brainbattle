import { useEffect, useState, useRef } from 'react'
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react'
import api from '../../api/axios'

export const isAdmin = (user) => user?.role === 'admin' || user?.is_superuser === true
export const errorText = (error) => {
  const data = error.response?.data
  if (!data) return 'Could not connect. Please try again.'
  const flatten = (value) => typeof value === 'string' ? value : Array.isArray(value) ? value.map(flatten).join(' ') : Object.entries(value).map(([key, val]) => `${key}: ${flatten(val)}`).join(' ')
  return flatten(data)
}
export function useAdminList(resource, search = '', filter = '') {
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ results: [], count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      setLoading(true)
      setError('')
      api.get(`/api/admin/${resource}/?page=${page}&search=${encodeURIComponent(search)}${filter}`)
        .then(({ data }) => { if (active) setData(data) })
        .catch((err) => { if (active) setError(errorText(err)) })
        .finally(() => { if (active) setLoading(false) })
    }, 200)
    return () => { active = false; clearTimeout(timer) }
  }, [resource, search, filter, page, revision])
  return { ...data, page, loading, error, setPage, refresh: () => setRevision((n) => n + 1) }
}
export function SearchBox({ value, onChange, placeholder }) {
  return <div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input aria-label={placeholder} className="input pl-10 bg-white" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} /></div>
}
export function Pagination({ list }) {
  if (!list.count) return null
  return <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500"><span>{(list.page - 1) * 20 + 1}–{Math.min(list.page * 20, list.count)} of {list.count}</span><div className="flex gap-2"><button aria-label="Previous page" className="btn-secondary p-2 disabled:opacity-40" disabled={list.page === 1 || list.loading} onClick={() => list.setPage(list.page - 1)}><ChevronLeft size={16} /></button><button aria-label="Next page" className="btn-secondary p-2 disabled:opacity-40" disabled={!list.next || list.loading} onClick={() => list.setPage(list.page + 1)}><ChevronRight size={16} /></button></div></div>
}
export function ListState({ list, children }) {
  if (list.loading) return <div className="p-10 text-center text-slate-400" role="status">Loading…</div>
  if (list.error) return <div className="p-8 text-center text-red-600" role="alert">{list.error}<button className="btn-secondary ml-4" onClick={list.refresh}>Retry</button></div>
  if (!list.results.length) return <div className="p-10 text-center text-slate-400">No records found.</div>
  return children
}
export function Modal({ title, onClose, children }) {
  const panel = useRef(null)
  useEffect(() => {
    const handler = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])
  useEffect(() => {
    const handler = (event) => {
      if (event.key !== 'Tab') return
      const elements = [...panel.current.querySelectorAll('button, input, textarea, select, a[href], [tabindex="0"]')].filter((el) => !el.disabled && !el.closest('fieldset[disabled]'))
      const first = elements[0], last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    const previous = document.activeElement
    document.addEventListener('keydown', handler)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!panel.current.contains(document.activeElement)) panel.current.querySelector('input, button')?.focus()
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = previousOverflow; previous?.focus() }
  }, [])
  return <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}><section ref={panel} role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}><div className="px-6 py-5 flex items-center justify-between border-b border-slate-100"><h2 className="text-xl font-bold">{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X size={20} /></button></div><div className="overflow-y-auto p-6">{children}</div></section></div>
}
export const dateText = (date) => new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
