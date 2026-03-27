import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { GraduationCap, BookOpen, Wallet, ClipboardList, TrendingUp, ChevronRight } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color, to }) {
  return (
    <Link to={to} className="card flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <ChevronRight size={16} className="ml-auto text-slate-300" />
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ unis: null, quizzes: null, attempts: null, wallet: null })

  useEffect(() => {
    Promise.allSettled([
      api.get('/api/universities/'),
      api.get('/api/quizzes/'),
      api.get('/api/quizzes/my-attempts/'),
      api.get('/api/auth/wallet/'),
    ]).then(([unis, quizzes, attempts, wallet]) => {
      setStats({
        unis:     unis.status === 'fulfilled'     ? unis.value.data.count ?? unis.value.data.length    : 0,
        quizzes:  quizzes.status === 'fulfilled'  ? quizzes.value.data.count ?? quizzes.value.data.length  : 0,
        attempts: attempts.status === 'fulfilled' ? attempts.value.data.count ?? attempts.value.data.length : 0,
        wallet:   wallet.status === 'fulfilled'   ? wallet.value.data.balance  : 0,
      })
    })
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{greeting}, {user?.first_name}!</h1>
        <p className="text-slate-500 mt-1 text-sm">Here's what's happening on your platform today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={GraduationCap} label="Universities"  value={stats.unis}    color="bg-blue-50 text-blue-600"    to="/universities" />
        <StatCard icon={BookOpen}      label="Quizzes"       value={stats.quizzes} color="bg-violet-50 text-violet-600" to="/quizzes" />
        <StatCard icon={ClipboardList} label="My Attempts"   value={stats.attempts}color="bg-emerald-50 text-emerald-600"to="/my-attempts" />
        <StatCard icon={Wallet}        label="Wallet Balance" value={stats.wallet !== null ? `৳${stats.wallet}` : null} color="bg-amber-50 text-amber-600" to="/wallet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-900">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Browse Universities', sub: 'Explore universities in Bangladesh', to: '/universities', icon: GraduationCap },
              { label: 'Take a Quiz', sub: 'Test your knowledge', to: '/quizzes', icon: BookOpen },
              { label: 'View Attempts', sub: 'Review your quiz history', to: '/my-attempts', icon: ClipboardList },
            ].map(({ label, sub, to, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group">
                <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-100">
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
              <TrendingUp size={16} />
            </div>
            <h3 className="font-semibold text-slate-900">Your Profile</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Role',        value: user?.role?.replace(/_/g, ' ') },
              { label: 'Class Level', value: user?.class_level?.toUpperCase() || 'Not set' },
              { label: 'Institution', value: user?.institution || 'Not set' },
              { label: 'Referral Code', value: user?.referral_code },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="text-sm font-medium text-slate-800 capitalize">{value}</span>
              </div>
            ))}
          </div>
          <Link to="/profile" className="btn-secondary w-full justify-center mt-4 text-xs">
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
