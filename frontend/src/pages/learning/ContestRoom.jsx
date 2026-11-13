import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Clock, Trophy, CheckCircle } from 'lucide-react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { usePreferences } from '../../context/Preferences'
import { Modal, errorText } from '../admin/shared'
import { LearningPager, LearningState, useLearning } from './shared'
import { contestBadge, contestDate } from './Contests'

export default function ContestRoom() {
  const { id } = useParams()
  const { user } = useAuth()
  const { t } = usePreferences()
  const remote = useLearning(`contests/${id}/`)
  const data = remote.data?.id === Number(id) ? remote.data : null
  const [entry, setEntry] = useState(null)
  const [answers, setAnswers] = useState({})
  const [clock, setClock] = useState(Date.now())
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [rankPage, setRankPage] = useState(1)
  const loadedEntry = useRef(null)
  const latestAnswers = useRef({})
  const saves = useRef(Promise.resolve())
  const autoSubmitted = useRef(false)
  const refreshedEnd = useRef(false)
  const ended = Boolean(data && clock + offset >= new Date(data.ends_at).getTime())
  const live = Boolean(data && clock + offset >= new Date(data.starts_at).getTime() && !ended)
  const remaining = entry ? Math.max(0, Math.ceil((new Date(entry.deadline).getTime() - clock - offset) / 1000)) : null
  const ranks = useLearning(ended ? `contests/${id}/leaderboard/?page=${rankPage}` : null)
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 500); return () => clearInterval(timer) }, [])
  useEffect(() => {
    loadedEntry.current = null; latestAnswers.current = {}; autoSubmitted.current = false; refreshedEnd.current = false
    setEntry(null); setAnswers({}); setError(''); setRankPage(1)
  }, [id])
  useEffect(() => {
    if (!data) return
    setOffset(new Date(data.server_time).getTime() - Date.now())
    setEntry(data.entry)
    if (data.entry && (loadedEntry.current !== data.entry.id || data.entry.submitted)) {
      loadedEntry.current = data.entry.id
      latestAnswers.current = data.entry.answers
      setAnswers(data.entry.answers)
    }
  }, [data])
  useEffect(() => {
    const warn = (event) => { if (pending) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [pending])
  async function start() {
    setBusy(true); setError('')
    try { await api.post(`/api/learning/contests/${id}/start/`); remote.refresh() } catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  function choose(item, index) {
    const next = { ...latestAnswers.current, [item]: index }
    latestAnswers.current = next; setAnswers(next); setPending((v) => v + 1)
    saves.current = saves.current.then(async () => {
      try {
        const { data } = await api.patch(`/api/learning/contests/${id}/save/`, { answers: next })
        setEntry(data.entry); setError('')
      } catch (error) { setError(errorText(error)) } finally { setPending((v) => Math.max(0, v - 1)) }
    })
  }
  async function submit() {
    if (busy) return
    setBusy(true); setConfirm(false); setError('')
    try {
      await saves.current
      await api.patch(`/api/learning/contests/${id}/save/`, { answers: latestAnswers.current })
      const { data } = await api.post(`/api/learning/contests/${id}/submit/`)
      setEntry(data.entry); remote.refresh(); ranks.refresh()
    } catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  useEffect(() => {
    if (entry && !entry.submitted && remaining === 0 && !autoSubmitted.current) { autoSubmitted.current = true; submit() }
  }, [entry?.id, entry?.submitted, remaining])
  useEffect(() => {
    if (ended && data?.status !== 'ended' && !refreshedEnd.current) { refreshedEnd.current = true; remote.refresh() }
  }, [ended, data?.status])
  return <LearningState remote={remote}>{data && <div className="space-y-6"><Link to="/contests" className="text-primary-600 text-sm">← {t('Subject contests')}</Link><section className="card"><div className="flex flex-wrap justify-between gap-4"><div><span className={contestBadge(ended ? 'ended' : live ? 'live' : 'upcoming')}>{t(ended ? 'ended' : live ? 'live' : 'upcoming')}</span><h1 className="page-title mt-3">{data.title}</h1><p className="text-slate-500 text-sm mt-2">{data.subject_name} · {t(data.kind === 'weekly' ? 'Weekly' : 'Monthly')} · {data.question_count} {t('Questions')}</p></div>{entry && !entry.submitted && <div className="p-4 rounded-xl bg-primary-50 text-primary-700 flex gap-3 items-center"><Clock size={21} /><div><p className="text-xs">{t('Time remaining')}</p><p className="text-2xl font-bold tabular-nums">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</p></div></div>}</div><p className="text-sm text-slate-500 mt-4 whitespace-pre-wrap">{data.description}</p><p className="text-xs text-slate-500 mt-4">{t('Starts')}: {contestDate(data.starts_at)} · {t('Ends')}: {contestDate(data.ends_at)} · {data.duration_minutes} {t('min')}</p><p className="text-xs text-slate-400 mt-3">{t('One entry per student. Score ranks first; faster submission breaks ties. Results unlock after the contest ends.')}</p>
    {!entry && live && user.role === 'student' && <button className="btn-primary mt-5" disabled={busy} onClick={start}>{t(busy ? 'Loading…' : 'Start contest')}</button>}{!live && !ended && <p className="text-sm text-primary-600 mt-5">{t('This contest has not started yet.')}</p>}</section>
    {error && <div role="alert" className="card text-red-600"><p>{error}</p>{entry && !entry.submitted && <button disabled={busy} className="btn-secondary mt-3" onClick={submit}>{t('Retry submission')}</button>}</div>}
    {entry?.submitted && <section className="card"><h2 className="text-lg font-semibold flex gap-2 items-center"><CheckCircle size={20} className="text-emerald-600" />{t('Contest submitted')}</h2>{ended ? <div className="mt-4 flex flex-wrap gap-6"><div><p className="text-sm text-slate-500">{t('Score')}</p><p className="text-2xl font-bold">{data.entry?.score ?? entry.score} / {data.entry?.total_marks ?? entry.total_marks}</p></div><div><p className="text-sm text-slate-500">{t('Correct answers')}</p><p className="text-2xl font-bold">{data.entry?.correct_answers ?? entry.correct_answers}</p></div></div> : <p className="text-sm text-slate-500 mt-3">{t('Results and answer explanations will appear when the contest ends.')}</p>}</section>}
    {entry && (!entry.submitted || ended) && <div className="space-y-4">{data.questions.map((item, index) => <section className="card" key={item.id}><p className="text-xs text-slate-400 mb-3">{t('Question')} {index + 1} · {t(item.difficulty)}</p><h2 className="font-semibold whitespace-pre-wrap">{item.question_text}</h2><div className="space-y-2 mt-4">{item.options.map((option, oi) => <button key={oi} disabled={entry.submitted || busy || remaining === 0} aria-pressed={answers[item.id] === oi} className={`w-full text-left border p-3 rounded-xl flex gap-3 text-sm ${ended && item.correct_index === oi ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : answers[item.id] === oi ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-slate-200 text-slate-700'}`} onClick={() => choose(item.id, oi)}><span>{String.fromCharCode(65 + oi)}.</span>{option}</button>)}</div>{ended && <p className="text-sm text-slate-500 mt-4 whitespace-pre-wrap">{item.explanation || t('Explanation not added yet.')}</p>}</section>)}{!entry.submitted && <div className="sticky bottom-3 card shadow-lg flex flex-wrap justify-between items-center gap-3 py-4"><p className="text-xs text-slate-500">{Object.keys(answers).length} / {data.question_count} {t('answered')} · {t(pending ? 'Saving…' : error ? 'Save failed' : 'Saved')}</p><button disabled={busy} className="btn-primary" onClick={() => setConfirm(true)}>{t(busy ? 'Submitting…' : 'Submit contest')}</button></div>}</div>}
    {ended && <section className="card"><h2 className="text-xl font-bold flex items-center gap-2 mb-5"><Trophy size={21} className="text-primary-600" />{t('Leaderboard')}</h2><LearningState remote={ranks}><div className="overflow-auto"><table className="admin-table"><thead><tr><th>{t('Rank')}</th><th>{t('Student')}</th><th>{t('Score')}</th><th>{t('Time (seconds)')}</th></tr></thead><tbody>{ranks.data?.results.map((row, i) => <tr key={`${row.rank}-${i}`}><td>{row.rank}</td><td>{row.name} {row.is_me && <span className="badge-blue ml-2">{t('You')}</span>}</td><td>{row.score} / {row.total_marks}</td><td>{row.elapsed_seconds}</td></tr>)}</tbody></table></div>{ranks.data?.count === 0 && <p className="text-slate-400 text-sm py-5">{t('No participants yet.')}</p>}<LearningPager remote={ranks} page={rankPage} setPage={setRankPage} /></LearningState></section>}
    {confirm && <Modal title={t('Submit contest?')} onClose={() => setConfirm(false)}><p className="text-sm text-slate-500">{t('Unanswered questions receive zero marks. You cannot change answers after submitting.')}</p><div className="flex justify-end gap-3 mt-6"><button className="btn-secondary" onClick={() => setConfirm(false)}>{t('Cancel')}</button><button className="btn-primary" onClick={submit}>{t('Submit contest')}</button></div></Modal>}
  </div>}</LearningState>
}
