import { useRef, useState } from 'react'
import { BookOpen, CheckCircle, ArrowRight, RotateCcw } from 'lucide-react'
import { usePreferences } from '../../context/Preferences'
import api from '../../api/axios'
import { Modal, SearchBox, errorText } from '../admin/shared'
import { LearningPager, LearningState, SubjectSelect, query, useLearning } from './shared'

function PracticeQuestion({ question, onClose, onAnswered }) {
  const { t } = usePreferences()
  const [choice, setChoice] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(crypto.randomUUID())
  async function submit() {
    setBusy(true); setError('')
    try {
      const { data } = await api.post(`/api/learning/practice/${question.id}/submit/`, { selected_index: choice, request_id: requestId.current })
      setResult(data); onAnswered()
    } catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  return <Modal title={t('Practice question')} onClose={() => { if (!busy) onClose() }}><div className="space-y-5"><p className="text-xs text-slate-500">{question.subject_name} · {question.chapter || t('No chapter')} · {t(question.difficulty)}</p><h3 className="text-lg font-semibold whitespace-pre-wrap">{question.question_text}</h3><div className="space-y-3">{question.options.map((option, i) => <button key={i} disabled={busy || Boolean(result)} aria-pressed={choice === i} className={`w-full text-left p-4 rounded-xl border flex items-center gap-3 ${result && i === result.correct_index ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : result && choice === i ? 'bg-red-50 border-red-200 text-red-600' : choice === i ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-slate-200 bg-white text-slate-700'}`} onClick={() => { setChoice(i); requestId.current = crypto.randomUUID() }}><span className="text-xs font-bold">{String.fromCharCode(65 + i)}.</span>{option}</button>)}</div>
    {error && <p className="text-sm text-red-600" role="alert">{t(error)}</p>}
    {result && <section className={`p-4 rounded-xl ${result.is_correct ? 'bg-emerald-50' : 'bg-red-50'}`}><h4 className={result.is_correct ? 'font-semibold text-emerald-700' : 'font-semibold text-red-600'}>{t(result.is_correct ? 'Correct' : 'Incorrect')}</h4><p className="text-sm mt-2 text-slate-700">{t('Correct answer:')} {result.options[result.correct_index]}</p><p className="text-sm text-slate-500 mt-3 whitespace-pre-wrap">{result.explanation || t('Explanation not added yet.')}</p></section>}
    <p className="text-xs text-slate-400">{t('Practice improves accuracy. Only finished contests affect your competitive rating.')}</p><div className="flex justify-end gap-3">{result ? <><button className="btn-secondary" onClick={() => { setResult(null); setChoice(null); requestId.current = crypto.randomUUID() }}><RotateCcw size={15} />{t('Try again')}</button><button className="btn-primary" onClick={onClose}>{t('Done')}</button></> : <button disabled={choice === null || busy} className="btn-primary" onClick={submit}>{t(busy ? 'Submitting…' : 'Check answer')}</button>}</div></div></Modal>
}
export default function Practice() {
  const { t } = usePreferences()
  const [filters, setFilters] = useState({ subject: '', chapter: '', difficulty: '', status: '', search: '' })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const summary = useLearning('practice/summary/')
  const remote = useLearning(`practice/?${query({ ...filters, page })}`)
  const change = (key, value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1) }
  return <div className="space-y-6"><div><h1 className="page-title">{t('Practice arena')}</h1><p className="page-subtitle">{t('Choose a subject, solve questions and learn from your mistakes.')}</p></div>
    {summary.error && <p role="alert" className="text-red-600 text-sm">{summary.error}<button className="ml-3 underline" onClick={summary.refresh}>{t('Retry')}</button></p>}
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{[['Available questions', summary.data?.available], ['Solved questions', summary.data?.solved], ['Practice accuracy', summary.data?.accuracy === null ? '—' : summary.data ? `${summary.data.accuracy}%` : undefined], ['Practised today', summary.data?.today]].map(([label, value]) => <div className="card p-5" key={label}><p className="text-sm text-slate-500">{t(label)}</p><p className="text-2xl font-bold mt-2">{value ?? '—'}</p></div>)}</div>
    <div className="card p-4 sm:p-5"><div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3"><SubjectSelect value={filters.subject} onChange={(v) => change('subject', v)} subjects={summary.data?.subjects || []} /><input aria-label={t('Chapter')} className="input" placeholder={t('Chapter (exact name)')} value={filters.chapter} onChange={(e) => change('chapter', e.target.value)} /><select aria-label={t('Difficulty')} className="input" value={filters.difficulty} onChange={(e) => change('difficulty', e.target.value)}><option value="">{t('All difficulties')}</option>{['simple', 'mid', 'hard'].map((v) => <option key={v} value={v}>{t(v)}</option>)}</select><select aria-label={t('Practice status')} className="input" value={filters.status} onChange={(e) => change('status', e.target.value)}><option value="">{t('All questions')}</option><option value="solved">{t('Solved')}</option><option value="unsolved">{t('Unsolved')}</option><option value="wrong">{t('Wrong answers')}</option></select><SearchBox value={filters.search} placeholder={t('Search questions…')} onChange={(v) => change('search', v)} /></div><p className="text-xs text-slate-400 mt-3">{t('Questions used in live contests return to practice when the contest ends.')}</p></div>
    <LearningState remote={remote}><div className="space-y-3">{remote.data?.results.map((q) => <button key={q.id} className="card p-5 w-full text-left flex items-center gap-4 hover:border-primary-200 transition-colors" onClick={() => setSelected(q)}><div className={`p-3 rounded-xl shrink-0 ${q.solved ? 'bg-emerald-50 text-emerald-600' : 'bg-primary-50 text-primary-600'}`}>{q.solved ? <CheckCircle size={20} /> : <BookOpen size={20} />}</div><div className="min-w-0 flex-1"><p className="text-xs text-slate-500 mb-2">#{q.id} · {q.subject_name} · {q.chapter || t('No chapter')} · {t(q.difficulty)}</p><p className="font-medium text-sm line-clamp-2 whitespace-pre-wrap">{q.question_text}</p><span className={`text-xs inline-block mt-2 ${q.solved ? 'text-emerald-600' : 'text-slate-400'}`}>{t(q.solved ? 'Solved' : q.attempted ? 'Try again' : 'Unsolved')}</span></div><ArrowRight className="text-slate-300 shrink-0" size={18} /></button>)}{remote.data?.count === 0 && <div className="card py-12 text-center text-slate-400">{t('No questions found. Try another subject or filter.')}</div>}</div><LearningPager remote={remote} page={page} setPage={setPage} /></LearningState>
    {selected && <PracticeQuestion question={selected} onClose={() => setSelected(null)} onAnswered={() => { summary.refresh(); remote.refresh() }} />}
  </div>
}
