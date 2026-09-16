import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { GraduationCap, BookOpen, Wallet, ClipboardList, ChevronRight } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color, to, loading }) {
  return (
    <Link
      to={to}
      className="card flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="h-7 w-14 rounded-md bg-slate-100 animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        )}
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <ChevronRight size={16} className="ml-auto shrink-0 text-slate-300" />
    </Link>
  )
}

const QUICK_ACTIONS = [
  { label: 'Take a quiz', sub: 'Test your knowledge', to: '/quizzes', icon: BookOpen },
  { label: 'View attempts', sub: 'Review your quiz history', to: '/my-attempts', icon: ClipboardList },
]

const PROFILE_FIELDS = [
  { label: 'Role', get: (u) => u?.role?.replace(/_/g, ' ') },
  { label: 'Class level', get: (u) => u?.class_level?.toUpperCase() },
  { label: 'Institution', get: (u) => u?.institution },
  { label: 'Referral code', get: (u) => u?.referral_code },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ quizzes: null, attempts: null, wallet: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.allSettled([
      api.get('/api/quizzes/'),
      api.get('/api/quizzes/my-attempts/'),
      api.get('/api/auth/wallet/'),
    ]).then(([quizzes, attempts, wallet]) => {
      if (cancelled) return
      setStats({
        quizzes: quizzes.status === 'fulfilled' ? quizzes.value.data.count ?? quizzes.value.data.length : 0,
        attempts: attempts.status === 'fulfilled' ? attempts.value.data.count ?? attempts.value.data.length : 0,
        wallet: wallet.status === 'fulfilled' ? wallet.value.data.balance : 0,
      })
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm text-slate-400">{today}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          {greeting}, {user?.first_name}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={BookOpen}
          label="Quizzes available"
          value={stats.quizzes}
          loading={loading}
          color="bg-violet-50 text-violet-600"
          to="/quizzes"
        />
        <StatCard
          icon={ClipboardList}
          label="My attempts"
          value={stats.attempts}
          loading={loading}
          color="bg-emerald-50 text-emerald-600"
          to="/my-attempts"
        />
        <StatCard
          icon={Wallet}
          label="Wallet balance"
          value={stats.wallet !== null ? `৳${stats.wallet}` : null}
          loading={loading}
          color="bg-amber-50 text-amber-600"
          to="/wallet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-slate-900 mb-5">Quick actions</h3>
          <div className="space-y-1">
            {QUICK_ACTIONS.map(({ label, sub, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
                <ChevronRight size={14} className="ml-auto text-slate-300" />
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
              <GraduationCap size={16} />
            </div>
            <h3 className="font-semibold text-slate-900">Your profile</h3>
          </div>
          <div className="space-y-3">
            {PROFILE_FIELDS.map(({ label, get }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="text-sm font-medium text-slate-800 capitalize text-right">
                  {get(user) || 'Not set'}
                </span>
              </div>
            ))}
          </div>
          <Link to="/profile" className="btn-secondary w-full justify-center mt-4 text-xs">
            Edit profile
          </Link>
        </div>
      </div>
    </div>
  )
}