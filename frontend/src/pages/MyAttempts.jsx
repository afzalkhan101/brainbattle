import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import {
  ClipboardList, Trophy, Target, CheckCircle2,
  XCircle, X, ChevronRight, Minus, BookOpen
} from 'lucide-react'
import toast from 'react-hot-toast'

const DIFFICULTY_COLOR = {
  easy: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  mid:  'bg-amber-50 text-amber-600 border-amber-200',
  hard: 'bg-red-50 text-red-600 border-red-200',
}
const DIFFICULTY_LABEL = { easy: 'Easy', mid: 'Medium', hard: 'Hard' }

const DifficultyBadge = ({ level }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${DIFFICULTY_COLOR[level] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
    {DIFFICULTY_LABEL[level] ?? level}
  </span>
)

const ScoreBadge = ({ score, total }) => {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  return (
    <span className={`font-bold text-sm ${pct >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>
      {score}/{total} <span className="font-normal text-xs">({pct}%)</span>
    </span>
  )
}

function AttemptDetailModal({ attemptId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/quizzes/attempts/${attemptId}/`)
      .then(({ data }) => setDetail(data))
      .catch(() => toast.error('Failed to load attempt details'))
      .finally(() => setLoading(false))
  }, [attemptId])
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 "
      style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <BookOpen size={16} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">
                {detail?.quiz_title ?? 'Loading...'}
              </p>
              {detail && (
                <p className="text-xs text-slate-500">
                  {detail.correct_answers}/{detail.total_questions} correct ·{' '}
                  {detail.score}/{detail.total_marks} marks
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {detail?.attempt_answers?.map((item, idx) => {
                const isSkipped = item.selected_text === 'Skipped'
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-4 ${
                      isSkipped
                        ? 'bg-slate-50 border-slate-200'
                        : item.is_correct
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {/* Question row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {/* Status icon */}
                        <div className="shrink-0 mt-0.5">
                          {isSkipped
                            ? <Minus size={16} className="text-slate-400" />
                            : item.is_correct
                              ? <CheckCircle2 size={16} className="text-emerald-500" />
                              : <XCircle size={16} className="text-red-500" />}
                        </div>
                        <p className="text-sm font-medium text-slate-800 leading-snug">
                          <span className="text-slate-400 mr-1">Q{idx + 1}.</span>
                          {item.question_text}
                        </p>
                      </div>

                      {/* Right side: difficulty + marks */}
                      <div className="flex items-center gap-2 shrink-0">
                        <DifficultyBadge level={item.difficulty} />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          item.marks_obtained > 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {item.marks_obtained}/{item.marks_possible} pts
                        </span>
                      </div>
                    </div>

                    {/* Answer rows */}
                    <div className="ml-6 space-y-1.5">
                      {/* Your answer */}
                      <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                        isSkipped
                          ? 'bg-slate-100 text-slate-500'
                          : item.is_correct
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        <span className="font-semibold shrink-0">Your answer:</span>
                        <span>{item.selected_text}</span>
                      </div>

                      {/* Correct answer (show only if wrong or skipped) */}
                      {(!item.is_correct) && (
                        <div className="flex items-center gap-2 text-xs bg-emerald-100 text-emerald-700 rounded-lg px-3 py-2">
                          <span className="font-semibold shrink-0">Correct answer:</span>
                          <span>{item.correct_text}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {detail && (
          <div className="px-6 py-4 border-t border-slate-100 shrink-0">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Score',    value: `${detail.score}/${detail.total_marks}`, color: 'text-slate-900' },
                { label: 'Correct',  value: detail.correct_answers,                  color: 'text-emerald-600' },
                { label: 'Wrong',    value: detail.total_questions - detail.correct_answers - (detail.attempt_answers?.filter(a => a.selected_text === 'Skipped').length ?? 0), color: 'text-red-500' },
                { label: 'Skipped',  value: detail.attempt_answers?.filter(a => a.selected_text === 'Skipped').length ?? 0, color: 'text-slate-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyAttempts() {
  const navigate = useNavigate()
  const [attempts, setAttempts]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [selectedId, setSelectedId]   = useState(null)

  useEffect(() => {
    api.get('/api/quizzes/my-attempts/')
      .then(({ data }) => setAttempts(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => toast.error('Failed to load attempts'))
      .finally(() => setLoading(false))
  }, [])

  const avg  = attempts.length
    ? (attempts.reduce((s, a) => s + (a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0), 0) / attempts.length).toFixed(1)
    : 0
  const best = attempts.length
    ? Math.max(...attempts.map((a) => a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0))
    : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">My Attempts</h1>
        <p className="page-subtitle">Your quiz history and performance</p>
      </div>

      {/* Stats */}
      {attempts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: <ClipboardList size={18} />, value: attempts.length, label: 'Total Attempts', bg: 'bg-primary-50 text-primary-600' },
            { icon: <Target size={18} />,        value: `${avg}%`,       label: 'Average Score',  bg: 'bg-emerald-50 text-emerald-600' },
            { icon: <Trophy size={18} />,         value: `${best}%`,      label: 'Best Score',     bg: 'bg-amber-50 text-amber-600' },
          ].map(({ icon, value, label, bg }) => (
            <div key={label} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>{icon}</div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : attempts.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-1">No attempts yet</p>
          <p className="text-slate-400 text-sm mb-5">Take a quiz to see your results here</p>
          <button onClick={() => navigate('/quizzes')} className="btn-primary">Browse Quizzes</button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quiz</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Correct</th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Total Qs</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {attempts.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={13} />
                      </div>
                      <span className="font-medium text-slate-800 truncate max-w-[160px]">
                        {a.quiz_title ?? `Quiz #${a.quiz}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <ScoreBadge score={a.score} total={a.total_marks} />
                  </td>
                  <td className="px-4 py-4 text-center text-slate-600 hidden sm:table-cell">
                    {a.correct_answers}
                  </td>
                  <td className="px-4 py-4 text-center text-slate-600 hidden md:table-cell">
                    {a.total_questions}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-400 text-xs">
                    {new Date(a.submitted_at).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td className="px-4 py-4 text-slate-300 group-hover:text-slate-500 transition-colors">
                    <ChevronRight size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedId && (
        <AttemptDetailModal
          attemptId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}