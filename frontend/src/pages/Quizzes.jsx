import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Search, BookOpen, Clock, HelpCircle, ChevronRight, Timer, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

const CLASS_LEVELS = [
  { value: '',         label: 'All Classes' },
  { value: 'class_6',  label: 'Class 6' },
  { value: 'class_7',  label: 'Class 7' },
  { value: 'class_8',  label: 'Class 8' },
  { value: 'class_9',  label: 'Class 9' },
  { value: 'class_10', label: 'Class 10' },
  { value: 'ssc',      label: 'SSC' },
  { value: 'hsc',      label: 'HSC' },
  { value: 'admission',label: 'Admission' },
]

// Converts seconds → "2h 30m 10s" countdown string
function formatCountdown(seconds) {
  if (!seconds || seconds <= 0) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// Live countdown hook — ticks every second
function useCountdown(initialSeconds) {
  const [secs, setSecs] = useState(initialSeconds)
  useEffect(() => {
    if (!secs || secs <= 0) return
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [])
  return secs
}

// Status badge config
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

function QuizCard({ q, onClick }) {
  const countdown = useCountdown(q.seconds_until_start)

  return (
    <div
      onClick={q.status_label === 'draft' ? undefined : onClick}
      className={`card flex flex-col transition-all duration-200
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                <Tag size={9} />
                {q.subject.class_level_display} · {q.subject.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {q.description && (
        <p className="text-sm text-slate-500 line-clamp-2 mb-4">{q.description}</p>
      )}

      {/* Upcoming countdown banner */}
      {q.status_label === 'upcoming' && countdown > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
          <Timer size={12} className="shrink-0" />
          <span>Starts in <span className="font-semibold tabular-nums">{formatCountdown(countdown)}</span></span>
        </div>
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
        <ChevronRight size={15} className="text-slate-300" />
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

  // Fetch subjects for the selected class level
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

  // Debounce search, re-fetch on filter change
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
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search quizzes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Class level */}
        <select
          className="input w-auto pr-8"
          value={classLevel}
          onChange={(e) => setClassLevel(e.target.value)}
        >
          {CLASS_LEVELS.map((cl) => (
            <option key={cl.value} value={cl.value}>{cl.label}</option>
          ))}
        </select>

        {/* Subject — only shown when class level selected */}
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