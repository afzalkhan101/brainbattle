import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookOpen, CircleCheck, ChartNoAxesColumn, Plus, Pencil, Trash2, ArrowRight, Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import QuizEditor from './QuizEditor'
import { useAdminList, SearchBox, Pagination, ListState, Modal, dateText, errorText } from './shared'

export function QuizManagement({ compact = false, onChanged, createSignal = 0 }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const list = useAdminList('quizzes', search, `&status=${status}`)
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  useEffect(() => { if (createSignal) setEditor({}) }, [createSignal])
  async function remove() {
    setBusy(true); setDeleteError('')
    try {
      await api.delete(`/api/admin/quizzes/${deleting.id}/`)
      toast.success('Quiz deleted'); setDeleting(null)
      if (list.results.length === 1 && list.page > 1) list.setPage(list.page - 1)
      else list.refresh()
      onChanged?.()
    } catch (err) { setDeleteError(errorText(err)) } finally { setBusy(false) }
  }
  return <><section className="admin-panel"><div className="flex flex-wrap gap-4 items-center justify-between p-5"><h2 className="text-lg font-bold">Quiz management</h2><div className="flex flex-wrap gap-3"><SearchBox value={search} onChange={(s) => { setSearch(s); list.setPage(1) }} placeholder="Search quizzes…" /><select aria-label="Quiz status" className="input bg-white w-auto" value={status} onChange={(e) => { setStatus(e.target.value); list.setPage(1) }}><option value="">All statuses</option><option value="live">Published</option><option value="draft">Draft</option><option value="upcoming">Scheduled</option></select>{!compact && <button className="btn-primary" onClick={() => setEditor({})}><Plus size={17} />Add quiz</button>}</div></div><ListState list={list}><div className="overflow-x-auto px-5"><table className="admin-table"><thead><tr><th>Quiz name</th><th>Subject</th><th>Questions</th><th>Status</th><th>Actions</th></tr></thead><tbody>{(compact ? list.results.slice(0, 4) : list.results).map((quiz) => <tr key={quiz.id}><td><p className="font-semibold text-slate-900">{quiz.title}</p><p className="text-xs text-slate-400 mt-1">{quiz.duration_minutes} min</p></td><td>{quiz.subject_name}</td><td>{quiz.question_count}</td><td><span className={quiz.status_label === 'live' ? 'badge-green' : quiz.status_label === 'upcoming' ? 'badge-blue' : 'badge-slate'}>● &nbsp;{ { live: 'Published', upcoming: 'Scheduled', draft: 'Draft' }[quiz.status_label]}</span></td><td><div className="flex gap-2"><button title="Edit quiz" aria-label={`Edit ${quiz.title}`} className="p-2 border rounded-lg hover:bg-primary-50 text-slate-600" onClick={() => setEditor(quiz)}><Pencil size={16} /></button><button title="Delete quiz" aria-label={`Delete ${quiz.title}`} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" onClick={() => { setDeleting(quiz); setDeleteError('') }}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div></ListState>{compact ? <div className="p-4 text-right"><Link className="text-sm text-primary-600 font-medium" to="/admin/quizzes">View all quizzes →</Link></div> : <Pagination list={list} />}</section>
  {editor && <QuizEditor quiz={editor.id ? editor : null} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); list.refresh(); onChanged?.() }} />}
  {deleting && <Modal title="Delete quiz?" onClose={() => { if (!busy) setDeleting(null) }}><p className="text-slate-600">Delete <strong>{deleting.title}</strong>? This permanently removes its questions and all student results for this quiz.</p>{deleteError && <p className="text-red-600 mt-3" role="alert">{deleteError}</p>}<div className="flex justify-end gap-3 mt-6"><button disabled={busy} className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button><button disabled={busy} className="btn-danger" onClick={remove}>{busy ? 'Deleting…' : 'Delete quiz'}</button></div></Modal>}</>
}
export function StudentList({ compact = false }) {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const list = useAdminList('students', search, `&class_level=${level}`)
  return <section className="admin-panel"><div className="p-5 flex flex-wrap justify-between items-center gap-4"><h2 className="text-lg font-bold">Students</h2>{compact && <Link to="/admin/students" className="flex items-center gap-1 text-sm text-primary-600 font-semibold">View all students <ArrowRight size={15} /></Link>}</div><div className="px-5 pb-4 flex flex-wrap gap-3"><SearchBox value={search} onChange={(v) => { setSearch(v); list.setPage(1) }} placeholder="Search students…" />{!compact && <select aria-label="Filter students by class" className="input bg-white w-auto" value={level} onChange={(e) => { setLevel(e.target.value); list.setPage(1) }}><option value="">All classes</option>{['class_6', 'class_7', 'class_8', 'class_9', 'class_10', 'ssc', 'hsc', 'admission'].map((l) => <option key={l} value={l}>{l.replace('_', ' ').toUpperCase()}</option>)}</select>}</div><ListState list={list}><div className="overflow-x-auto px-5 pb-4"><table className="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Class</th><th>Institution</th><th>Status</th>{!compact && <><th>Attempts</th><th>Joined</th></>}</tr></thead><tbody>{(compact ? list.results.slice(0, 3) : list.results).map((s) => <tr key={s.id}><td className="font-semibold text-slate-900">{s.full_name || 'Unnamed student'}</td><td>{s.email}</td><td className="uppercase">{s.class_level?.replace('_', ' ') || '—'}</td><td>{s.institution || '—'}</td><td><span className={s.is_active ? 'badge-green' : 'badge-slate'}>● &nbsp;{s.is_active ? 'Active' : 'Inactive'}</span></td>{!compact && <><td>{s.attempts_count}</td><td>{dateText(s.date_joined)}</td></>}</tr>)}</tbody></table></div></ListState>{!compact && <Pagination list={list} />}</section>
}
export function ResultsList() {
  const [search, setSearch] = useState('')
  const list = useAdminList('results', search)
  return <section className="admin-panel"><div className="p-5 flex flex-wrap items-center justify-between gap-4"><h2 className="text-lg font-bold">Student results</h2><SearchBox placeholder="Search quiz or student…" value={search} onChange={(s) => { setSearch(s); list.setPage(1) }} /></div><ListState list={list}><div className="overflow-x-auto px-5"><table className="admin-table"><thead><tr><th>Student</th><th>Quiz</th><th>Score</th><th>Correct answers</th><th>Percentage</th><th>Submitted</th></tr></thead><tbody>{list.results.map((r) => <tr key={r.id}><td>{r.user_email}</td><td className="font-semibold text-slate-900">{r.quiz_title}</td><td>{r.score} / {r.total_marks}</td><td>{r.correct_answers} / {r.total_questions}</td><td><span className={r.percentage >= 50 ? 'badge-green' : 'badge-slate'}>{r.percentage}%</span></td><td>{dateText(r.submitted_at)}</td></tr>)}</tbody></table></div></ListState><Pagination list={list} /></section>
}
export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [createSignal, setCreateSignal] = useState(0)
  useEffect(() => {
    let active = true
    api.get('/api/admin/overview/').then(({ data }) => { if (active) { setStats(data); setError('') } }).catch((err) => { if (active) setError(errorText(err)) })
    return () => { active = false }
  }, [revision])
  return <div className="space-y-6"><div className="flex flex-wrap justify-between items-center gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Admin dashboard</h1><p className="page-subtitle">Manage your quizzes, students and results in one place.</p></div><button className="btn-primary" onClick={() => setCreateSignal((n) => n + 1)}><Plus size={18} />Add quiz</button></div>
  {error && <div className="p-4 rounded-xl bg-red-50 text-red-700 text-sm" role="alert">{error} <button className="underline" onClick={() => setRevision((n) => n + 1)}>Retry</button></div>}
  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">{[{ key: 'students', label: 'Total students', icon: Users, to: '/admin/students' }, { key: 'quizzes', label: 'Total quizzes', icon: BookOpen, to: '/admin/quizzes' }, { key: 'published', label: 'Published quizzes', icon: CircleCheck, to: '/admin/quizzes' }, { key: 'attempts', label: 'Quiz attempts', icon: ChartNoAxesColumn, to: '/admin/results' }].map(({ key, label, icon: Icon, to }) => <Link key={key} to={to} className="admin-panel p-5 flex flex-wrap sm:flex-nowrap items-center gap-4 hover:border-primary-200 transition-colors"><div className="p-3 rounded-xl bg-primary-50 text-primary-600"><Icon size={24} /></div><div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold mt-1 tabular-nums">{stats ? stats[key].toLocaleString() : '—'}</p></div></Link>)}</div>
  <QuizManagement compact createSignal={createSignal} onChanged={() => setRevision((n) => n + 1)} />
  <div className="grid xl:grid-cols-[1.8fr_1fr] gap-6"><StudentList compact /><section className="admin-panel p-5"><h2 className="text-lg font-bold mb-6">Recent activity</h2>{!stats && !error && <p className="text-sm text-slate-400">Loading activity…</p>}{stats?.activity.length === 0 && <p className="text-sm text-slate-400">Your platform activity will appear here.</p>}<div className="space-y-6">{stats?.activity.map((event) => <div key={event.id} className="flex gap-3"><div className="bg-primary-50 text-primary-600 h-9 w-9 rounded-xl flex shrink-0 items-center justify-center"><Activity size={17} /></div><div className="min-w-0"><p className="text-sm font-semibold">{event.title}</p><p className="text-xs text-slate-500 mt-1 break-words">{event.detail}</p><p className="text-xs text-slate-400 mt-1">{dateText(event.at)}</p></div></div>)}</div></section></div></div>
}
