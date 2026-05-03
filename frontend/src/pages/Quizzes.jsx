import { useEffect, useState, useCallback } from 'react'
import api from '../api/axios'
import {
  Search, BookOpen, Clock, HelpCircle,
  ChevronRight, Tag, X, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import QuizDetailModal from './QuizDetailModal'

const CLASS_LEVELS = [
  { value: 'class_6',  label: 'Class 6' },
  { value: 'class_7',  label: 'Class 7' },
  { value: 'class_8',  label: 'Class 8' },
  { value: 'class_9',  label: 'Class 9' },
  { value: 'class_10', label: 'Class 10' },
  { value: 'ssc',      label: 'SSC' },
  { value: 'hsc',      label: 'HSC' },
  { value: 'admission',label: 'Admission' },
]

const STATUS = {
  live:     { label: 'Live',     bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  upcoming: { label: 'Upcoming', bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400' },
  draft:    { label: 'Draft',    bg: 'bg-slate-100',   text: 'text-slate-500',   border: 'border-slate-200',  dot: 'bg-slate-400' },
}

function StatusBadge({ label }) {
  const s = STATUS[label] ?? STATUS.draft
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium
      border ${s.bg} ${s.text} ${s.border}
    `}>
      <span className={`
        w-1.5 h-1.5 rounded-full ${s.dot}
        ${label === 'live' ? 'animate-pulse' : ''}
      `} />
      {s.label}
    </span>
  )
}

function useCountdown(initialSeconds) {
  const [secs, setSecs] = useState(initialSeconds ?? 0)

  useEffect(() => {
    if (!initialSeconds || initialSeconds <= 0) return
    setSecs(initialSeconds)
    const id = setInterval(() => setSecs(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [initialSeconds])

  return secs
}

function CountdownBar({ seconds }) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  const units = d > 0
    ? [{ v: d, l: 'd' }, { v: h, l: 'h' }, { v: m, l: 'm' }, { v: s, l: 's' }]
    : h > 0
    ? [{ v: h, l: 'h' }, { v: m, l: 'm' }, { v: s, l: 's' }]
    : [{ v: m, l: 'm' }, { v: s, l: 's' }]

  return (
    <div className="flex items-center gap-1 my-3 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
      <Zap size={11} className="text-amber-500 shrink-0" />
      <span className="text-[11px] text-amber-600 mr-1.5">Starts in</span>
      <div className="flex items-center gap-1 ml-auto">
        {units.map(({ v, l }, i) => (
          <div key={l} className="flex items-center gap-1">
            <div className="flex flex-col items-center min-w-[32px] bg-white border border-amber-200 rounded-lg py-1 px-1.5">
              <span className="text-[13px] font-bold text-amber-700 leading-none tabular-nums">
                {String(v).padStart(2, '0')}
              </span>
              <span className="text-[9px] text-amber-400 mt-0.5">{l}</span>
            </div>
            {i < units.length - 1 && (
              <span className="text-amber-300 text-[11px] font-bold">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
          <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-slate-100 rounded-lg" />
        <div className="h-3 bg-slate-100 rounded-lg w-4/5" />
      </div>
      <div className="pt-3 border-t border-slate-100 flex justify-between">
        <div className="h-3 bg-slate-100 rounded-lg w-24" />
        <div className="h-3 bg-slate-100 rounded-lg w-16" />
      </div>
    </div>
  )
}

function QuizCard({ q, onClick }) {
  const countdown = useCountdown(q.seconds_until_start)
  const isDraft = q.status_label === 'draft'
  const isLive  = q.status_label === 'live'

  return (
    <div
      onClick={isDraft ? undefined : onClick}
      className={`
        card group relative flex flex-col overflow-hidden
        transition-all duration-200
        ${isDraft
          ? 'opacity-55 cursor-not-allowed'
          : 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-200'
        }
      `}
    >
      {/* Live accent stripe */}
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-t-xl" />
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`
          w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors duration-200
          ${isLive
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-primary-50 text-primary-600 group-hover:bg-primary-100'
          }
        `}>
          <BookOpen size={17} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-1.5">
            {q.title}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge label={q.status_label} />
            {q.subject && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                <Tag size={9} />
                {q.subject.class_level_display} · {q.subject.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {q.description && (
        <p className="text-[13px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
          {q.description}
        </p>
      )}

      {/* Countdown */}
      {q.status_label === 'upcoming' && countdown > 0 && (
        <CountdownBar seconds={countdown} />
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[12px] text-slate-400 font-medium">
            <HelpCircle size={12} />
            {q.question_count ?? '—'} Qs
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] text-slate-400 font-medium">
            <Clock size={12} />
            {q.duration_minutes} min
          </span>
        </div>

        {!isDraft && (
          <div className={`
            w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200
            ${isLive
              ? 'bg-emerald-500 group-hover:bg-emerald-600'
              : 'bg-slate-900 group-hover:bg-primary-600'
            }
          `}>
            <ChevronRight size={13} color="white" strokeWidth={2.5} />
          </div>
        )}
      </div>
    </div>
  )
}

function FilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
      {label}
      <button
        onClick={onRemove}
        className="w-3.5 h-3.5 rounded-full hover:bg-primary-200 flex items-center justify-center transition-colors"
      >
        <X size={9} strokeWidth={2.5} />
      </button>
    </span>
  )
}


export default function Quizzes() {
  const [list, setList]           = useState([])
  const [subjects, setSubjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [selectedQuiz, setSelectedQuiz] = useState(null)

  useEffect(() => {
    setSubjectId('')
    if (!classLevel) { setSubjects([]); return }
    api.get(`/api/quizzes/subjects/?class_level=${classLevel}`)
      .then(({ data }) => setSubjects(data.results ?? data))
      .catch(() => {})
  }, [classLevel])

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search)     params.set('search', search)
      if (classLevel) params.set('class_level', classLevel)
      if (subjectId)  params.set('subject', subjectId)
      const { data } = await api.get(`/api/quizzes/?${params}`)
      setList(data.results ?? data)
    } catch {
      toast.error('Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }, [search, classLevel, subjectId])

  useEffect(() => {
    const t = setTimeout(fetchList, 300)
    return () => clearTimeout(t)
  }, [fetchList])
  
  const activeClassLabel   = CLASS_LEVELS.find(c => c.value === classLevel)?.label
  const activeSubjectLabel = subjects.find(s => String(s.id) === subjectId)?.name
  const hasFilters         = classLevel || subjectId || search

  const clearAll = () => {
    setSearch('')
    setClassLevel('')
    setSubjectId('')
  }

  return (
    <div className="px-3 md:px-0">

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Quizzes</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {!loading && list.length > 0
                ? `${list.length} quiz${list.length !== 1 ? 'zes' : ''} available`
                : 'Test your knowledge'}
            </p>
          </div>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              className="input pl-9 w-full text-sm"
              placeholder="Search quizzes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Class select */}
          <select
            className="input text-sm w-full md:w-44"
            value={classLevel}
            onChange={(e) => setClassLevel(e.target.value)}
          >
            <option value="">All Classes</option>
            {CLASS_LEVELS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* Subject select (conditional) */}
          {subjects.length > 0 && (
            <select
              className="input text-sm w-full md:w-44"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Active filter pills */}
        {(activeClassLabel || activeSubjectLabel) && (
          <div className="flex flex-wrap gap-1.5">
            {activeClassLabel && (
              <FilterPill label={activeClassLabel} onRemove={() => setClassLevel('')} />
            )}
            {activeSubjectLabel && (
              <FilterPill label={activeSubjectLabel} onRemove={() => setSubjectId('')} />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : list.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={24} className="text-slate-300" />
          </div>
          <p className="font-medium text-slate-600">No quizzes found</p>
          <p className="text-sm text-slate-400 mt-1">
            {hasFilters ? 'Try adjusting your filters.' : 'Check back soon.'}
          </p>
          {hasFilters && (
            <button
              onClick={clearAll}
              className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((q) => (
            <QuizCard key={q.id} q={q} onClick={() => setSelectedQuiz(q)} />
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedQuiz && (
        <QuizDetailModal
          quiz={selectedQuiz}
          onClose={() => setSelectedQuiz(null)}
        />
      )}
    </div>
  )
}