import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { BookOpen, CheckCircle2, XCircle, ArrowLeft, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function QuizDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get(`/api/quizzes/${id}/`)
      .then(({ data }) => { setQuiz(data); setLoading(false) })
      .catch(() => { toast.error('Quiz not found'); navigate('/quizzes') })
  }, [id])

  const select = (qId, aId) => {
    if (result) return
    setAnswers((prev) => ({ ...prev, [qId]: aId }))
  }

  const handleSubmit = async () => {
    const total = quiz.questions?.length ?? 0
    if (Object.keys(answers).length < total) {
      toast.error('Please answer all questions')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        answers: Object.entries(answers).map(([question_id, answer_id]) => ({
          question_id: Number(question_id),
          answer_id: Number(answer_id),
        })),
      }
      const { data } = await api.post(`/api/quizzes/${id}/submit/`, payload)
      setResult(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const answered = Object.keys(answers).length
  const total = quiz.questions?.length ?? 0
  const progress = total > 0 ? (answered / total) * 100 : 0

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate('/quizzes')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to Quizzes
      </button>

      {result && (
        <div className={`rounded-2xl p-6 mb-6 border ${
          result.score >= 60
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
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
            <div className="bg-white rounded-xl p-3 text-center border border-white/50">
              <p className="text-2xl font-bold text-slate-900">{result.score}</p>
              <p className="text-xs text-slate-500">Score</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-white/50">
              <p className="text-2xl font-bold text-emerald-600">{result.correct_answers}</p>
              <p className="text-xs text-slate-500">Correct</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-white/50">
              <p className="text-2xl font-bold text-slate-900">{result.total_questions}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <BookOpen size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{quiz.title}</h1>
            {quiz.description && <p className="text-sm text-slate-500 mt-1">{quiz.description}</p>}
          </div>
        </div>

        {!result && total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>{answered} of {total} answered</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {quiz.questions?.map((q, qi) => (
          <div key={q.id} className="card">
            <p className="font-medium text-slate-900 mb-4">
              <span className="text-primary-600 mr-2">Q{qi + 1}.</span>
              {q.question_text}
            </p>
            <div className="space-y-2">
              {q.answers?.map((a) => {
                const selected = answers[q.id] === a.id
                return (
                  <button
                    key={a.id}
                    onClick={() => select(q.id, a.id)}
                    disabled={!!result}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      selected
                        ? 'bg-primary-50 border-primary-400 text-primary-800 font-medium'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                    } disabled:cursor-default`}
                  >
                    {a.answer_text}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {!result && total > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || answered < total}
            className="btn-primary px-6 py-3"
          >
            {submitting
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Send size={15} /> Submit Quiz</>}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-6 flex gap-3 justify-center">
          <button onClick={() => navigate('/quizzes')} className="btn-secondary">Browse More Quizzes</button>
          <button onClick={() => navigate('/my-attempts')} className="btn-primary">View All Attempts</button>
        </div>
      )}
    </div>
  )
}
