import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Trophy, Clock, CalendarDays, ArrowRight } from 'lucide-react'
import { usePreferences, getLocale } from '../../context/Preferences'
import { SearchBox } from '../admin/shared'
import { LearningState, LearningPager, SubjectSelect, query, useLearning, useSubjects } from './shared'
export const contestDate = (value) => new Date(value).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' })
export const contestBadge = (status) => status === 'live' ? 'badge-green' : status === 'upcoming' ? 'badge-blue' : 'badge-slate'
export default function Contests() {
  const { t } = usePreferences()
  const [subject, setSubject] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { subjects, error } = useSubjects()
  const remote = useLearning(`contests/?${query({ subject, search, page })}`)
  return <div className="space-y-6"><div><h1 className="page-title">{t('Subject contests')}</h1><p className="page-subtitle">{t('Compete in weekly and monthly contests. Results decide your rating.')}</p></div><div className="card p-4 grid sm:grid-cols-2 gap-3"><SubjectSelect value={subject} subjects={subjects} onChange={(v) => { setSubject(v); setPage(1) }} /><SearchBox value={search} placeholder={t('Search contests…')} onChange={(v) => { setSearch(v); setPage(1) }} />{error && <p className="text-red-600 text-sm">{error}</p>}</div><LearningState remote={remote}><div className="grid lg:grid-cols-2 gap-5">{remote.data?.results.map((contest) => <section className="card p-5 sm:p-6" key={contest.id}><div className="flex justify-between gap-3"><div className="p-3 rounded-xl bg-primary-50 text-primary-600"><Trophy size={23} /></div><div className="flex items-center gap-2"><span className="badge-slate">{t(contest.kind === 'weekly' ? 'Weekly' : 'Monthly')}</span><span className={contestBadge(contest.status)}>{t(contest.status)}</span></div></div><h2 className="text-xl font-bold mt-4">{contest.title}</h2><p className="text-sm text-slate-500 mt-1">{contest.subject_name} · {contest.question_count} {t('Questions')}</p><p className="text-sm text-slate-500 mt-3 line-clamp-2">{contest.description}</p><div className="text-xs text-slate-500 mt-5 space-y-2"><p className="flex gap-2"><CalendarDays size={15} />{t('Starts')}: {contestDate(contest.starts_at)}</p><p className="flex gap-2"><CalendarDays size={15} />{t('Ends')}: {contestDate(contest.ends_at)}</p><p className="flex gap-2"><Clock size={15} />{contest.duration_minutes} {t('min')} · {contest.participant_count} {t('Participants')}</p></div><Link to={`/contests/${contest.id}`} className="btn-primary mt-5 w-full justify-center">{t(contest.status === 'ended' ? 'View results' : 'View contest')}<ArrowRight size={16} /></Link></section>)}</div>{remote.data?.count === 0 && <div className="card text-center text-slate-400 p-12">{t('No contests yet. Check back soon.')}</div>}<LearningPager remote={remote} page={page} setPage={setPage} /></LearningState></div>
}
