import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import {
  BookOpen, CheckCircle2, XCircle, ArrowLeft,
  Send, Clock, ChevronRight, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Constants ───────────────────────────────────────────────────────────────
const DIFFICULTY_TIME = { easy: 10, mid: 15, hard: 20 }
const DIFFICULTY_LABEL = { easy: 'Easy', mid: 'Medium', hard: 'Hard' }
const DIFFICULTY_COLOR = {
  easy: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  mid:  'bg-amber-50 text-amber-600 border-amber-200',
  hard: 'bg-red-50 text-red-600 border-red-200',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getTimeLimit = (difficulty) => DIFFICULTY_TIME[difficulty] ?? 15

const DifficultyBadge = ({ level }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium shrink-0 ${DIFFICULTY_COLOR[level] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
    {DIFFICULTY_LABEL[level] ?? level}
  </span>
)

// ─── Circular Timer Ring ─────────────────────────────────────────────────────
const TimerRing = ({ timeLeft, total, danger }) => {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const dash = circumference * (timeLeft / total)

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <circle
          cx="28" cy="28" r={radius} fill="none"
          stroke={danger ? '#ef4444' : '#6366f1'}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - dash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>
      <span className={`text-sm font-bold tabular-nums ${danger ? 'text-red-500' : 'text-slate-700'}`}>
        {timeLeft}s
      </span>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function QuizDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [quiz, setQuiz]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers]       = useState({})      // { qId: aId | null }
  const [timeLeft, setTimeLeft]     = useState(null)
  const [lockedQs, setLockedQs]     = useState(new Set())
  const [result, setResult]         = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showExpired, setShowExpired] = useState(false)

  const timerRef = useRef(null)

  // ── Fetch Quiz ──
  useEffect(() => {
    api.get(`/api/quizzes/${id}/`)
      .then(({ data }) => { setQuiz(data); setLoading(false) })
      .catch(() => { toast.error('Quiz not found'); navigate('/quizzes') })
  }, [id])

  const questions  = quiz?.questions ?? []
  const currentQ   = questions[currentIdx]
  const isLastQ    = currentIdx === questions.length - 1
  const totalQ     = questions.length

  // ── Start per-question timer ──
  const startTimer = useCallback((question) => {
    clearInterval(timerRef.current)
    const limit = getTimeLimit(question?.difficulty)
    setTimeLeft(limit)
    setShowExpired(false)

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setLockedQs((s) => new Set(s).add(question.id))
          setAnswers((a) => ({ ...a, [question.id]: a[question.id] ?? null }))
          setShowExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    if (!currentQ || result) return
    startTimer(currentQ)
    return () => clearInterval(timerRef.current)
  }, [currentIdx, currentQ?.id, result])

  useEffect(() => {
    if (result) clearInterval(timerRef.current)
  }, [result])

  // ── Select answer ──
  const select = (qId, aId) => {
    if (result || lockedQs.has(qId)) return
    setAnswers((prev) => ({ ...prev, [qId]: aId }))
  }

  // ── Next question ──
  const handleNext = () => {
    if (answers[currentQ.id] === undefined) {
      setAnswers((prev) => ({ ...prev, [currentQ.id]: null }))
      setLockedQs((s) => new Set(s).add(currentQ.id))
    }
    clearInterval(timerRef.current)
    setCurrentIdx((i) => i + 1)
  }

  // ── Submit ──
  const handleSubmit = async () => {
    setSubmitting(true)
    clearInterval(timerRef.current)
    try {
      const payload = {
        answers: questions
          .map((q) => ({
            question_id: q.id,
            answer_id: answers[q.id] ?? null,
          }))
          .filter((a) => a.answer_id !== null),
      }
      const { data } = await api.post(`/api/quizzes/${id}/submit/`, payload)
      setResult(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ─── Result Screen ────────────────────────────────────────────────────────────
  if (result) return (
    <div className="max-w-2xl mx-auto">
      <div className={`rounded-2xl p-6 mb-6 border ${
        result.score >= 60 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          {result.score >= 60
            ? <CheckCircle2 size={28} className="text-emerald-500" />
            : <XCircle size={28} className="text-red-500" />}
          <div>
            <p className="font-bold text-lg text-slate-900">
              {result.score >= 60 ? 'Great job!' : 'Keep practicing!'}
            </p>
            <p className="text-sm text-slate-600">Quiz submitted successfully</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: 'Score',   value: result.score,            color: 'text-slate-900'   },
            { label: 'Correct', value: result.correct_answers,  color: 'text-emerald-600' },
            { label: 'Total',   value: result.total_questions,  color: 'text-slate-900'   },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-3 text-center border border-white/50">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 justify-center">
        <button onClick={() => navigate('/quizzes')} className="btn-secondary">Browse More Quizzes</button>
        <button onClick={() => navigate('/my-attempts')} className="btn-primary">View All Attempts</button>
      </div>
    </div>
  )

  // ─── Quiz Screen ──────────────────────────────────────────────────────────────
  const timeLimit = getTimeLimit(currentQ?.difficulty)
  const isDanger  = timeLeft !== null && timeLeft <= 5
  const progress  = totalQ > 0 ? ((currentIdx + 1) / totalQ) * 100 : 0

  return (
    <div className="max-w-2xl mx-auto">

      {/* Back */}
      <button
        onClick={() => navigate('/quizzes')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Quizzes
      </button>

      {/* Quiz Header */}
      <div className="card mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <BookOpen size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">{quiz.title}</h1>
            {quiz.description && <p className="text-sm text-slate-500 mt-1">{quiz.description}</p>}
          </div>
        </div>
        {/* Overall progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Question {currentIdx + 1} of {totalQ}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Card */}
      {currentQ && (
        <div className="card">

          {/* Question header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
                  Q{currentIdx + 1}
                </span>
                {currentQ.difficulty && <DifficultyBadge level={currentQ.difficulty} />}
              </div>
              <p className="font-medium text-slate-900 leading-relaxed">
                {currentQ.question_text}
              </p>
            </div>
            {/* Circular countdown */}
            {timeLeft !== null && (
              <TimerRing timeLeft={timeLeft} total={timeLimit} danger={isDanger} />
            )}
          </div>

          {/* Time hint */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
            <Clock size={12} />
            <span>
              Time limit: <strong>{timeLimit}s</strong> for {DIFFICULTY_LABEL[currentQ.difficulty] ?? currentQ.difficulty} question
            </span>
          </div>

          {/* Expired banner */}
          {showExpired && lockedQs.has(currentQ.id) && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-red-600">
              <AlertCircle size={15} />
              Time's up! This question has been skipped.
            </div>
          )}

          {/* Options */}
          <div className="space-y-2">
            {currentQ.answers?.map((a) => {
              const selected = answers[currentQ.id] === a.id
              const locked   = lockedQs.has(currentQ.id)
              return (
                <button
                  key={a.id}
                  onClick={() => select(currentQ.id, a.id)}
                  disabled={locked}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    selected
                      ? 'bg-primary-50 border-primary-400 text-primary-800 font-medium'
                      : locked
                        ? 'border-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {a.answer_text}
                </button>
              )
            })}
          </div>

          {/* Navigation */}
          <div className="flex justify-end mt-5 pt-4 border-t border-slate-100">
            {isLastQ ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary px-6 py-2.5 flex items-center gap-2"
              >
                {submitting
                  ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><Send size={15} /> Submit Quiz</>}
              </button>
            ) : (
              <button onClick={handleNext} className="btn-primary px-6 py-2.5 flex items-center gap-2">
                Next <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Question dot indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-5 flex-wrap">
        {questions.map((q, i) => {
          const isAnswered = answers[q.id] !== undefined
          const isSkipped  = lockedQs.has(q.id) && answers[q.id] === null
          const isCurrent  = i === currentIdx
          return (
            <div
              key={q.id}
              title={`Q${i + 1}: ${isSkipped ? 'Skipped' : isAnswered ? 'Answered' : 'Pending'}`}
              className={`rounded-full transition-all duration-300 ${
                isCurrent   ? 'w-5 h-2.5 bg-primary-500'  :
                isSkipped   ? 'w-2.5 h-2.5 bg-red-300'    :
                isAnswered  ? 'w-2.5 h-2.5 bg-emerald-400':
                              'w-2.5 h-2.5 bg-slate-200'
              }`}
            />
          )
        })}
      </div>

    </div>
  )
}