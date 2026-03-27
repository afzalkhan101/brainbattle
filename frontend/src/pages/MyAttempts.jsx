import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { ClipboardList, Trophy, Target, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MyAttempts() {
  const navigate = useNavigate()
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/quizzes/my-attempts/')
      .then(({ data }) => setAttempts(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => toast.error('Failed to load attempts'))
      .finally(() => setLoading(false))
  }, [])

  const avg = attempts.length
    ? (attempts.reduce((s, a) => s + a.score, 0) / attempts.length).toFixed(1)
    : 0
  const best = attempts.length
    ? Math.max(...attempts.map((a) => a.score)).toFixed(1)
    : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">My Attempts</h1>
        <p className="page-subtitle">Your quiz history and performance</p>
      </div>

      {attempts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <ClipboardList size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{attempts.length}</p>
              <p className="text-sm text-slate-500">Total Attempts</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Target size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{avg}%</p>
              <p className="text-sm text-slate-500">Average Score</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Trophy size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{best}%</p>
              <p className="text-sm text-slate-500">Best Score</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : attempts.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardList size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-600 font-medium mb-1">No attempts yet</p>
          <p className="text-slate-400 text-sm mb-5">Take a quiz to see your results here</p>
          <button onClick={() => navigate('/quizzes')} className="btn-primary">
            Browse Quizzes
          </button>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {attempts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
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
                    <span className={`font-bold text-sm ${a.score >= 60 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {a.score}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center text-slate-600 hidden sm:table-cell">{a.correct_answers}</td>
                  <td className="px-4 py-4 text-center text-slate-600 hidden md:table-cell">{a.total_questions}</td>
                  <td className="px-6 py-4 text-right text-slate-400 text-xs">
                    {new Date(a.submitted_at).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
