import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Archive, Upload, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { usePreferences } from '../../context/Preferences'
import { Modal, SearchBox, errorText } from '../admin/shared'
import { LearningState, LearningPager, SubjectSelect, query, useLearning, useSubjects } from './shared'

function QuestionEditor({ item, subjects, onClose, onSaved }) {
  const { t } = usePreferences()
  const [form, setForm] = useState(item ? { ...item } : { subject: '', chapter: '', question_text: '', options: ['', '', '', ''], correct_index: 0, explanation: '', difficulty: 'simple', is_active: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('')
    const payload = { subject: Number(form.subject), chapter: form.chapter, question_text: form.question_text, options: form.options, correct_index: Number(form.correct_index), explanation: form.explanation, difficulty: form.difficulty, is_active: form.is_active }
    try {
      if (item) await api.patch(`/api/learning/admin/questions/${item.id}/`, payload)
      else await api.post('/api/learning/admin/questions/', payload)
      toast.success(t('Question saved')); onSaved()
    } catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  return <Modal title={t(item ? 'Edit bank question' : 'Add bank question')} onClose={() => { if (!busy) onClose() }}><form onSubmit={save} className="space-y-4">{error && <p role="alert" className="text-red-600 text-sm">{error}</p>}<label className="block"><span className="label">{t('Subject')}</span><SubjectSelect required value={form.subject} subjects={subjects} onChange={(v) => change('subject', v)} /></label><label className="block"><span className="label">{t('Chapter')}</span><input className="input" maxLength={150} value={form.chapter} onChange={(e) => change('chapter', e.target.value)} /></label><label className="block"><span className="label">{t('Question')}</span><textarea className="input" required maxLength={5000} rows={3} value={form.question_text} onChange={(e) => change('question_text', e.target.value)} /></label><div className="space-y-3"><p className="label">{t('Select the correct option')}</p>{form.options.map((option, i) => <div key={i} className="flex items-center gap-3"><input type="radio" name="correct-bank-option" aria-label={t(`Answer ${i + 1}`)} checked={form.correct_index === i} onChange={() => change('correct_index', i)} /><input required className="input" maxLength={1000} aria-label={t(`Option ${i + 1}`)} value={option} onChange={(e) => change('options', form.options.map((o, oi) => oi === i ? e.target.value : o))} /></div>)}</div><label className="block"><span className="label">{t('Explanation')}</span><textarea className="input" maxLength={5000} rows={3} value={form.explanation} onChange={(e) => change('explanation', e.target.value)} /></label><label className="block"><span className="label">{t('Difficulty')}</span><select aria-label={t("Difficulty")} className="input" value={form.difficulty} onChange={(e) => change('difficulty', e.target.value)}>{['simple', 'mid', 'hard'].map((v) => <option key={v} value={v}>{t(v)}</option>)}</select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => change('is_active', e.target.checked)} />{t('Active for practice and future contests')}</label><div className="flex justify-end gap-3 pt-3"><button className="btn-secondary" type="button" disabled={busy} onClick={onClose}>{t('Cancel')}</button><button className="btn-primary" disabled={busy}>{t(busy ? 'Saving…' : 'Save changes')}</button></div></form></Modal>
}
function LegacyImport({ onClose, onSaved }) {
  const { t } = usePreferences()
  const [quizzes, setQuizzes] = useState([])
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      let url = '/api/admin/quizzes/'; const all = []
      while (url) { const { data } = await api.get(url); all.push(...data.results); url = data.next }
      if (active) setQuizzes(all)
    }
    load().catch((error) => { if (active) setError(errorText(error)) })
    return () => { active = false }
  }, [])
  async function save() {
    setBusy(true); setError('')
    try { const { data } = await api.post('/api/learning/admin/questions/from-quiz/', { quiz_id: Number(selected) }); toast.success(`${t('Imported questions')}: ${data.imported} · ${t('Skipped')}: ${data.skipped}`); onSaved() } catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  return <Modal title={t('Import an existing quiz')} onClose={() => { if (!busy) onClose() }}><div className="space-y-4"><p className="text-sm text-slate-500">{t('Copies valid questions into the bank. Existing copies are skipped. The original quiz stays unchanged.')}</p>{error && <p className="text-red-600" role="alert">{error}</p>}<select aria-label={t('Quiz')} className="input" value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">{t('Select')}</option>{quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}</select><button className="btn-primary" disabled={!selected || busy} onClick={save}>{t(busy ? 'Loading…' : 'Import questions')}</button></div></Modal>
}
export default function QuestionBank() {
  const { t } = usePreferences()
  const { subjects, error: subjectError } = useSubjects()
  const [filters, setFilters] = useState({ subject: '', search: '', active: '' })
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [retiring, setRetiring] = useState(null)
  const [legacy, setLegacy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const file = useRef(null)
  const remote = useLearning(`admin/questions/?${query({ ...filters, page })}`)
  const change = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1) }
  const refresh = () => { setEditing(null); setLegacy(false); remote.refresh() }
  function template() {
    const subject = Number(filters.subject || subjects[0]?.id)
    if (!subject) { toast.error(t('Add a subject first.')); return }
    const blob = new Blob([JSON.stringify({ questions: [{ subject, chapter: 'Motion', question_text: 'What is the SI unit of force?', options: ['Newton', 'Joule', 'Watt', 'Pascal'], correct_index: 0, explanation: 'The newton is the SI unit of force.', difficulty: 'simple', is_active: true }] }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'brain-battle-question-template.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function importFile(event) {
    const upload = event.target.files[0]; event.target.value = ''; if (!upload) return
    if (upload.size > 10 * 1024 * 1024) { setError(t('The import file must be smaller than 10 MB.')); return }
    setBusy(true); setError('')
    try {
      const raw = JSON.parse(await upload.text()); const questions = Array.isArray(raw) ? raw : raw.questions
      if (!Array.isArray(questions) || !questions.length || questions.length > 2000) throw new Error(t('Import between 1 and 2,000 questions per JSON file.'))
      const { data } = await api.post('/api/learning/admin/questions/import/', { questions })
      toast.success(`${t('Imported questions')}: ${data.imported}`); remote.refresh()
    } catch (error) { setError(error instanceof SyntaxError ? t('Invalid JSON. Download the template and try again.') : error.response ? errorText(error) : error.message) } finally { setBusy(false) }
  }
  async function retire() {
    setBusy(true); setError('')
    try { await api.delete(`/api/learning/admin/questions/${retiring.id}/`); setRetiring(null); remote.refresh() } catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  return <div className="space-y-5"><div className="flex flex-wrap justify-between gap-4"><div><h1 className="page-title">{t('Question bank')}</h1><p className="page-subtitle">{t('Reusable subject questions for daily practice and contests.')}</p></div><button className="btn-primary" onClick={() => setEditing({})}><Plus size={17} />{t('Add bank question')}</button></div><div className="card p-4 space-y-3"><div className="flex flex-wrap gap-3"><button className="btn-secondary" onClick={template}><Download size={15} />{t('JSON template')}</button><button disabled={busy} className="btn-secondary" onClick={() => file.current.click()}><Upload size={15} />{t(busy ? 'Importing…' : 'Import JSON')}</button><button className="btn-secondary" onClick={() => setLegacy(true)}>{t('Import an existing quiz')}</button><input ref={file} type="file" accept="application/json,.json" aria-label={t('Import JSON')} className="hidden" onChange={importFile} disabled={busy} /></div><p className="text-xs text-slate-400">{t('Up to 2,000 questions per import. All rows are validated before any are saved. Correct option indexes start at 0.')}</p></div>
    {(error || subjectError) && <p className="text-red-600 text-sm" role="alert">{error || subjectError}</p>}<div className="grid sm:grid-cols-3 gap-3"><SubjectSelect subjects={subjects} value={filters.subject} onChange={(v) => change('subject', v)} /><select aria-label={t('Status')} className="input" value={filters.active} onChange={(e) => change('active', e.target.value)}><option value="">{t('All questions')}</option><option value="true">{t('Active')}</option><option value="false">{t('Retired')}</option></select><SearchBox value={filters.search} placeholder={t('Search questions…')} onChange={(v) => change('search', v)} /></div><LearningState remote={remote}><div className="space-y-3">{remote.data?.results.map((q) => <section className="card p-5 flex gap-4" key={q.id}><div className="flex-1 min-w-0"><p className="text-xs text-slate-400">#{q.id} · {q.subject_name} · {q.chapter || t('No chapter')} · {t(q.difficulty)} · {t(q.is_active ? 'Active' : 'Retired')}</p><p className="font-medium text-sm mt-2 whitespace-pre-wrap">{q.question_text}</p><p className="text-xs text-emerald-600 mt-2">{t('Correct answer:')} {q.options[q.correct_index]}</p></div><div className="flex gap-2 self-start"><button className="btn-secondary p-2" aria-label={t('Edit bank question')} onClick={() => setEditing(q)}><Pencil size={15} /></button><button className="btn-secondary p-2 text-red-600" aria-label={t('Retire question')} disabled={!q.is_active} onClick={() => setRetiring(q)}><Archive size={15} /></button></div></section>)}{remote.data?.count === 0 && <div className="card text-center py-12 text-slate-400">{t('No questions found. Try another subject or filter.')}</div>}</div><LearningPager remote={remote} page={page} setPage={setPage} /></LearningState>
    {editing && <QuestionEditor item={editing.id ? editing : null} subjects={subjects} onClose={() => setEditing(null)} onSaved={refresh} />}{legacy && <LegacyImport onClose={() => setLegacy(false)} onSaved={refresh} />}{retiring && <Modal title={t('Retire question?')} onClose={() => { if (!busy) setRetiring(null) }}><p className="text-sm text-slate-500">{t('It will leave practice and future selections. Existing contest snapshots and results stay intact.')}</p>{error && <p role="alert" className="text-red-600 mt-3">{error}</p>}<div className="flex justify-end gap-3 mt-5"><button className="btn-secondary" onClick={() => setRetiring(null)} disabled={busy}>{t('Cancel')}</button><button className="btn-danger" onClick={retire} disabled={busy}>{t('Retire question')}</button></div></Modal>}
  </div>
}
