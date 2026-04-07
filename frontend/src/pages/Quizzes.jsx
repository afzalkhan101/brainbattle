import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Search, BookOpen, Clock, HelpCircle, ChevronRight, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

const CLASS_LEVELS = [
  { value: '',          label: 'All Classes' },
  { value: 'class_6',  label: 'Class 6' },
  { value: 'class_7',  label: 'Class 7' },
  { value: 'class_8',  label: 'Class 8' },
  { value: 'class_9',  label: 'Class 9' },
  { value: 'class_10', label: 'Class 10' },
  { value: 'ssc',      label: 'SSC' },
  { value: 'hsc',      label: 'HSC' },
  { value: 'admission',label: 'Admission' },
]

function useCountdown(initialSeconds) {
  const [secs, setSecs] = useState(initialSeconds)
  useEffect(() => {
    if (!secs || secs <= 0) return
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])
  return secs
}

const STATUS_CONFIG = {
  live:     { label: 'Live',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  upcoming: { label: 'Upcoming', cls: 'bg-amber-50  text-amber-700  border-amber-200'   },
  draft:    { label: 'Draft',    cls: 'bg-slate-100 text-slate-500  border-slate-200'   },
}

function StatusBadge({ label }) {
  const cfg = STATUS_CONFIG[label] ?? STATUS_CONFIG.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function CountdownCircle({ seconds }) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  const units = d > 0
    ? [{ v: d, l: 'day' }, { v: h, l: 'hr' }, { v: m, l: 'min' }, { v: s, l: 'sec' }]
    : h > 0
    ? [{ v: h, l: 'hr' }, { v: m, l: 'min' }, { v: s, l: 'sec' }]
    : [{ v: m, l: 'min' }, { v: s, l: 'sec' }]

  return (
    <div className="flex items-center justify-center gap-2 py-2 mb-3">
      {units.map(({ v, l }, i) => (
        <div key={l} className="flex items-center gap-2">
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-amber-50 border border-amber-200">
            <span className="text-sm font-bold tabular-nums text-amber-700 leading-none">
              {String(v).padStart(2, '0')}
            </span>
            <span className="text-[9px] text-amber-500 mt-0.5">{l}</span>
          </div>
          {i < units.length - 1 && (
            <span className="text-amber-400 font-bold text-sm mb-1">:</span>
          )}
        </div>
      ))}
    </div>
  )
}

function QuizCard({ q, onClick }) {
  const countdown = useCountdown(q.seconds_until_start)

  return (
    <div
      onClick={q.status_label === 'draft' ? undefined : onClick}
      className={`card group flex flex-col transition-all duration-200
        ${q.status_label === 'draft'
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
        }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
          <BookOpen size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2">{q.title}</h3>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <StatusBadge label={q.status_label} />
            {q.subject && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-600 border border-green-600">
                <Tag size={9} />
                {q.subject.class_level_display} · <span className="text-green-600">{q.subject.name}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {q.description && (
        <p className="text-sm text-slate-500 line-clamp-2 mb-4">{q.description}</p>
      )}

      {/* Countdown */}
      {q.status_label === 'upcoming' && countdown > 0 && (
        <CountdownCircle seconds={countdown} />
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <HelpCircle size={12} />
            {q.question_count ?? '?'} questions
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {q.duration_minutes} min
          </span>
        </div>

        {/* A3 — Pulse ring */}
        <div className="relative w-7 h-7">
          <div className="absolute inset-0 rounded-full border border-violet-400 opacity-0 group-hover:animate-[pulse-out_0.6s_ease-out_infinite]" />
          <div className="absolute inset-0 rounded-full bg-violet-600 flex items-center justify-center">
            <ChevronRight size={13} color="white" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Quizzes() {
  const navigate    = useNavigate()
  const [list,       setList]       = useState([])
  const [subjects,   setSubjects]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [subjectId,  setSubjectId]  = useState('')

  useEffect(() => {
    setSubjectId('')
    if (!classLevel) { setSubjects([]); return }
    api.get(`/api/quizzes/subjects/?class_level=${classLevel}`)
      .then(({ data }) => setSubjects(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => {})
  }, [classLevel])

  const fetchList = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search)     params.set('search',      search)
      if (classLevel) params.set('class_level',  classLevel)
      if (subjectId)  params.set('subject',      subjectId)
      const { data } = await api.get(`/api/quizzes/?${params.toString()}`)
      setList(Array.isArray(data) ? data : data.results ?? [])
    } catch { toast.error('Failed to load quizzes') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(fetchList, 350)
    return () => clearTimeout(t)
  }, [search, classLevel, subjectId])

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="page-title">Quizzes</h1>
        <p className="page-subtitle">Test your knowledge with our curated quizzes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search quizzes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input w-auto pr-8"
          value={classLevel}
          onChange={(e) => setClassLevel(e.target.value)}
        >
          {CLASS_LEVELS.map((cl) => (
            <option key={cl.value} value={cl.value}>{cl.label}</option>
          ))}
        </select>

        {subjects.length > 0 && (
          <select
            className="input w-auto pr-8"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No quizzes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((q) => (
            <QuizCard
              key={q.id}
              q={q}
              onClick={() => navigate(`/quizzes/${q.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}