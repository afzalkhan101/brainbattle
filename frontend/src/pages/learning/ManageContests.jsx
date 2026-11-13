import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { usePreferences } from '../../context/Preferences'
import { Modal, SearchBox, errorText } from '../admin/shared'
import { LearningPager, LearningState, SubjectSelect, localInput, query, useLearning, useSubjects } from './shared'
import { contestDate, contestBadge } from './Contests'

function ContestEditor({ contest, subjects, onClose, onSaved }) {
  const { t } = usePreferences()
  const [form, setForm] = useState(contest ? { ...contest, starts_at: localInput(contest.starts_at), ends_at: localInput(contest.ends_at) } : { title: '', description: '', subject: '', kind: 'weekly', starts_at: localInput(Date.now() + 3600000), ends_at: localInput(Date.now() + 7200000), duration_minutes: 30, is_published: false })
  const [selected, setSelected] = useState(new Set(contest?.selected_question_ids || []))
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bank = useLearning(form.subject ? `admin/questions/?${query({ subject: form.subject, active: 'true', search, page })}` : null)
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  function toggle(id) { setSelected((ids) => { const next = new Set(ids); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('')
    const payload = { title: form.title, description: form.description, subject: Number(form.subject), kind: form.kind, starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString(), duration_minutes: Number(form.duration_minutes), is_published: form.is_published, question_ids: [...selected] }
    try {
      if (contest) await api.patch(`/api/learning/admin/contests/${contest.id}/`, payload)
      else await api.post('/api/learning/admin/contests/', payload)
      toast.success(t('Contest saved')); onSaved()
    } catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  return <Modal title={t(contest ? 'Edit contest' : 'Create contest')} onClose={() => { if (!busy) onClose() }}><form onSubmit={save} className="space-y-4">{error && <p className="text-sm text-red-600" role="alert">{error}</p>}<label className="block"><span className="label">{t('Contest title')}</span><input autoFocus className="input" required maxLength={255} value={form.title} onChange={(e) => change('title', e.target.value)} /></label><label className="block"><span className="label">{t('Description')}</span><textarea className="input" rows={2} value={form.description} onChange={(e) => change('description', e.target.value)} /></label><div className="grid sm:grid-cols-2 gap-3"><label><span className="label">{t('Subject')}</span><SubjectSelect required value={form.subject} subjects={subjects} onChange={(v) => { change('subject', v); setSelected(new Set()); setPage(1) }} /></label><label><span className="label">{t('Contest type')}</span><select aria-label={t("Contest type")} className="input" value={form.kind} onChange={(e) => change('kind', e.target.value)}><option value="weekly">{t('Weekly')}</option><option value="monthly">{t('Monthly')}</option></select></label></div><div className="grid sm:grid-cols-2 gap-3"><label><span className="label">{t('Starts (local time)')}</span><input required className="input" type="datetime-local" value={form.starts_at} onChange={(e) => change('starts_at', e.target.value)} /></label><label><span className="label">{t('Ends (local time)')}</span><input required className="input" type="datetime-local" value={form.ends_at} onChange={(e) => change('ends_at', e.target.value)} /></label></div><label className="block"><span className="label">{t('Duration (minutes)')}</span><input className="input" required type="number" min="1" max="1440" value={form.duration_minutes} onChange={(e) => change('duration_minutes', e.target.value)} /></label>
    <section className="border-t border-slate-200 pt-4"><h3 className="font-semibold mb-1">{t('Select bank questions')} ({selected.size}/200)</h3><p className="text-xs text-slate-500 mb-3">{t('Selection order is used for every participant. Question text, choices and answer keys are copied when you save.')}</p>{form.subject ? <><SearchBox value={search} placeholder={t('Search questions…')} onChange={(v) => { setSearch(v); setPage(1) }} /><div className="mt-3"><LearningState remote={bank}><div className="max-h-64 overflow-auto space-y-2">{bank.data?.results.map((q) => <label key={q.id} className="flex gap-3 border border-slate-200 rounded-xl p-3 text-sm items-start cursor-pointer"><input className="mt-1" type="checkbox" checked={selected.has(q.id)} disabled={!selected.has(q.id) && selected.size >= 200} onChange={() => toggle(q.id)} /><div><p className="text-xs text-slate-400 mb-1">#{q.id} · {q.chapter || t('No chapter')} · {t(q.difficulty)}</p><p>{q.question_text}</p></div></label>)}</div><LearningPager remote={bank} page={page} setPage={setPage} /></LearningState></div></> : <p className="text-sm text-slate-400">{t('Select a subject to choose questions.')}</p>}</section><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published} onChange={(e) => change('is_published', e.target.checked)} />{t('Publish contest')}</label><p className="text-xs text-slate-400">{t('Contests become immutable after they start. Weekly and monthly are schedule labels; create each contest with its own dates.')}</p><div className="flex justify-end gap-3"><button type="button" disabled={busy} className="btn-secondary" onClick={onClose}>{t('Cancel')}</button><button className="btn-primary" disabled={busy || !selected.size}>{t(busy ? 'Saving…' : 'Save changes')}</button></div></form></Modal>
}
export default function ManageContests() {
  const { t } = usePreferences()
  const { subjects, error: subjectError } = useSubjects()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const remote = useLearning(`admin/contests/?${query({ search, page })}`)
  async function remove() {
    setBusy(true); setError('')
    try { await api.delete(`/api/learning/admin/contests/${deleting.id}/`); setDeleting(null); remote.refresh() } catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  return <div className="space-y-5"><div className="flex flex-wrap justify-between gap-4"><div><h1 className="page-title">{t('Manage contests')}</h1><p className="page-subtitle">{t('Organize subject-wise weekly and monthly competitions from your question bank.')}</p></div><button className="btn-primary" onClick={() => setEditing({})}><Plus size={17} />{t('Create contest')}</button></div>{subjectError && <p role="alert" className="text-red-600 text-sm">{subjectError}</p>}<SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={t('Search contests…')} /><LearningState remote={remote}><section className="admin-panel p-4"><div className="overflow-auto"><table className="admin-table"><thead><tr><th>{t('Contest title')}</th><th>{t('Subject')}</th><th>{t('Status')}</th><th>{t('Questions')}</th><th>{t('Starts')}</th><th>{t('Actions')}</th></tr></thead><tbody>{remote.data?.results.map((contest) => <tr key={contest.id}><td><p className="font-semibold">{contest.title}</p><p className="text-xs text-slate-400 mt-1">{t(contest.kind === 'weekly' ? 'Weekly' : 'Monthly')} · {contest.participant_count} {t('Participants')}</p></td><td>{contest.subject_name}</td><td><span className={contestBadge(contest.status)}>{t(contest.status)}</span></td><td>{contest.question_count}</td><td>{contestDate(contest.starts_at)}</td><td><div className="flex gap-2">{['draft', 'upcoming'].includes(contest.status) && <><button className="btn-secondary p-2" aria-label={t('Edit contest')} onClick={() => setEditing(contest)}><Pencil size={15} /></button><button className="btn-secondary p-2 text-red-600" aria-label={t('Delete contest')} onClick={() => { setDeleting(contest); setError('') }}><Trash2 size={15} /></button></>}{contest.is_published && <Link className="text-primary-600 text-xs underline self-center" to={`/contests/${contest.id}`}>{t('View contest')}</Link>}</div></td></tr>)}</tbody></table></div>{remote.data?.count === 0 && <p className="text-slate-400 text-sm text-center py-12">{t('No contests yet. Check back soon.')}</p>}<LearningPager remote={remote} page={page} setPage={setPage} /></section></LearningState>{editing && <ContestEditor contest={editing.id ? editing : null} subjects={subjects} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); remote.refresh() }} />}{deleting && <Modal title={t('Delete contest?')} onClose={() => { if (!busy) setDeleting(null) }}><p className="text-sm text-slate-500">{t('This removes the scheduled contest. Its bank questions are kept.')}</p>{error && <p role="alert" className="text-red-600 mt-3">{error}</p>}<div className="flex justify-end gap-3 mt-5"><button disabled={busy} className="btn-secondary" onClick={() => setDeleting(null)}>{t('Cancel')}</button><button disabled={busy} className="btn-danger" onClick={remove}>{t('Delete contest')}</button></div></Modal>}</div>
}
