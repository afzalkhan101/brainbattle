import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { isAdmin, errorText } from './admin/shared'
import StudentProgress from '../components/progress/StudentProgress'

export default function Dashboard() {
  const { user } = useAuth()
  const admin = isAdmin(user)
  const [period, setPeriod] = useState('7')
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [extras, setExtras] = useState({ available: null, wallet: null })

  useEffect(() => {
    if (admin) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.get(`/api/quizzes/progress/?period=${period}&timezone=Asia%2FDhaka`, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setProgress(data) })
      .catch((err) => { if (!controller.signal.aborted) setError(errorText(err)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [user.id, admin, period, revision])

  useEffect(() => {
    if (admin) return
    let active = true
    Promise.allSettled([api.get('/api/quizzes/'), api.get('/api/auth/wallet/')])
      .then(([quizzes, wallet]) => {
        if (active) setExtras({ available: quizzes.status === 'fulfilled' ? quizzes.value.data.count : null, wallet: wallet.status === 'fulfilled' ? wallet.value.data.balance : null })
      })
    return () => { active = false }
  }, [user.id, admin])

  useEffect(() => {
    if (admin) return
    const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date())
    let lastDay = dayKey()
    const timer = setInterval(() => {
      const current = dayKey()
      if (current !== lastDay) { lastDay = current; setRevision((n) => n + 1) }
    }, 60000)
    return () => clearInterval(timer)
  }, [admin])

  if (admin) return <Navigate to="/admin" replace />
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Dhaka', weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  return <div>
    <div className="mb-7"><p className="text-sm text-slate-400">{today}</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">{greeting}, {user.first_name || 'student'}</h1><p className="text-sm text-slate-500 mt-2">See how you are improving, one quiz at a time.</p></div>
    {error ? <div className="card text-center py-12" role="alert"><p className="font-semibold">Could not load your progress</p><p className="text-sm text-slate-500 mt-2">{error}</p><button className="btn-primary mt-5" onClick={() => setRevision((n) => n + 1)}>Try again</button></div>
      : !progress ? <div className="card text-center py-20 text-slate-400" role="status">Loading your progress…</div>
      : <StudentProgress progress={progress} period={period} setPeriod={setPeriod} refreshing={loading} available={extras.available} wallet={extras.wallet} />}
  </div>
}
