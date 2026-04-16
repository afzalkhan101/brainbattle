import { useEffect, useState } from 'react'
import api from '../api/axios'
import {
  Search,
  BookOpen,
  Clock,
  HelpCircle,
  ChevronRight,
  Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import QuizDetailModal from "./QuizDetailModal"

/* CLASS LEVELS */
const CLASS_LEVELS = [
  { value: '', label: 'All Classes' },
  { value: 'class_6', label: 'Class 6' },
  { value: 'class_7', label: 'Class 7' },
  { value: 'class_8', label: 'Class 8' },
  { value: 'class_9', label: 'Class 9' },
  { value: 'class_10', label: 'Class 10' },
  { value: 'ssc', label: 'SSC' },
  { value: 'hsc', label: 'HSC' },
  { value: 'admission', label: 'Admission' },
]

/* STATUS */
const STATUS_CONFIG = {
  live: { label: 'Live', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  upcoming: { label: 'Upcoming', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

function StatusBadge({ label }) {
  const cfg = STATUS_CONFIG[label] ?? STATUS_CONFIG.draft
  return (
    <span className={`px-2 py-0.5 text-[11px] rounded-md border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

/* COUNTDOWN */
function useCountdown(initialSeconds) {
  const [secs, setSecs] = useState(initialSeconds)

  useEffect(() => {
    if (!initialSeconds || initialSeconds <= 0) return

    setSecs(initialSeconds)
    const id = setInterval(() => {
      setSecs((s) => (s > 0 ? s - 1 : 0))
    }, 1000)

    return () => clearInterval(id)
  }, [initialSeconds])

  return secs
}

function CountdownCircle({ seconds }) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  const units =
    d > 0
      ? [{ v: d, l: 'day' }, { v: h, l: 'hr' }, { v: m, l: 'min' }, { v: s, l: 'sec' }]
      : h > 0
      ? [{ v: h, l: 'hr' }, { v: m, l: 'min' }, { v: s, l: 'sec' }]
      : [{ v: m, l: 'min' }, { v: s, l: 'sec' }]

  return (
    <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2 py-2 mb-3">
      {units.map(({ v, l }, i) => (
        <div key={l} className="flex items-center gap-2">
          <div className="flex flex-col items-center justify-center w-11 md:w-12 h-11 md:h-12 rounded-full bg-amber-50 border border-amber-200">
            <span className="text-sm font-bold text-amber-700">
              {String(v).padStart(2, '0')}
            </span>
            <span className="text-[9px] text-amber-500">{l}</span>
          </div>

          {i < units.length - 1 && (
            <span className="text-amber-400 font-bold">:</span>
          )}
        </div>
      ))}
    </div>
  )
}

/* CARD */
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
      {/* HEADER */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
          <BookOpen size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 line-clamp-2">
            {q.title}
          </h3>

          <div className="flex flex-wrap gap-1.5 mt-1">
            <StatusBadge label={q.status_label} />

            {q.subject && (
              <span className="px-2 py-0.5 text-[11px] rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                <Tag size={9} />
                {q.subject.class_level_display} · {q.subject.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* DESC */}
      {q.description && (
        <p className="text-sm text-slate-500 line-clamp-2 mb-3">
          {q.description}
        </p>
      )}

      {/* COUNTDOWN */}
      {q.status_label === 'upcoming' && countdown > 0 && (
        <CountdownCircle seconds={countdown} />
      )}

      {/* FOOTER */}
      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <HelpCircle size={12} />
            {q.question_count ?? '?'} Q
          </span>

          <span className="flex items-center gap-1">
            <Clock size={12} />
            {q.duration_minutes} min
          </span>
        </div>

        <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center">
          <ChevronRight size={13} color="white" />
        </div>
      </div>
    </div>
  )
}

/* MAIN */
export default function Quizzes() {
  const [list, setList] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [subjectId, setSubjectId] = useState('')

  const [selectedQuiz, setSelectedQuiz] = useState(null)

  /* subjects load */
  useEffect(() => {
    setSubjectId('')
    if (!classLevel) {
      setSubjects([])
      return
    }

    api.get(`/api/quizzes/subjects/?class_level=${classLevel}`)
      .then(({ data }) => setSubjects(data.results ?? data))
      .catch(() => {})
  }, [classLevel])

  /* quiz fetch */
  const fetchList = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (classLevel) params.set('class_level', classLevel)
      if (subjectId) params.set('subject', subjectId)

      const { data } = await api.get(`/api/quizzes/?${params}`)
      setList(data.results ?? data)
    } catch {
      toast.error('Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(fetchList, 300)
    return () => clearTimeout(t)
  }, [search, classLevel, subjectId])

  return (
    <div className="px-3 md:px-0">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Quizzes</h1>
        <p className="text-sm text-slate-500">
          Test your knowledge
        </p>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">

        <div className="relative w-full md:flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9 w-full"
            placeholder="Search quizzes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input w-full md:w-auto"
          value={classLevel}
          onChange={(e) => setClassLevel(e.target.value)}
        >
          {CLASS_LEVELS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {subjects.length > 0 && (
          <select
            className="input w-full md:w-auto"
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

      {/* CONTENT */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="card text-center py-14">
          <BookOpen className="mx-auto text-slate-200 mb-3" size={40} />
          <p className="text-slate-500">No quizzes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((q) => (
            <QuizCard
              key={q.id}
              q={q}
              onClick={() => setSelectedQuiz(q)}
            />
          ))}
        </div>
      )}

      {/* MODAL */}
      {selectedQuiz && (
        <QuizDetailModal
          quiz={selectedQuiz}
          onClose={() => setSelectedQuiz(null)}
        />
      )}
    </div>
  )
}