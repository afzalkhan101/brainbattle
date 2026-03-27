import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { Search, BookOpen, Clock, HelpCircle, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Quizzes() {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchList = async (q = '') => {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/quizzes/${q ? `?search=${q}` : ''}`)
      setList(Array.isArray(data) ? data : data.results ?? [])
    } catch { toast.error('Failed to load quizzes') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchList() }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchList(search), 400)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Quizzes</h1>
        <p className="page-subtitle">Test your knowledge with our curated quizzes</p>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Search quizzes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No quizzes available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((q) => (
            <div
              key={q.id}
              onClick={() => navigate(`/quizzes/${q.id}`)}
              className="card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2">{q.title}</h3>
                  <span className={q.is_published ? 'badge-green mt-1' : 'badge-slate mt-1'}>
                    {q.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>

              {q.description && (
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">{q.description}</p>
              )}

              <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <HelpCircle size={12} />
                    {q.question_count ?? '?'} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(q.created_at).toLocaleDateString()}
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
