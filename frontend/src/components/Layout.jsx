import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, GraduationCap, BookOpen, ClipboardList,
  User, Wallet, LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/universities', label: 'Universities',  icon: GraduationCap },
  { to: '/quizzes',      label: 'Quizzes',       icon: BookOpen },
  { to: '/my-attempts',  label: 'My Attempts',   icon: ClipboardList },
  { to: '/wallet',       label: 'Wallet',        icon: Wallet },
  { to: '/profile',      label: 'Profile',       icon: User },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : 'U'

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">EduPortal</span>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-slate-400">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon size={17} />
              {label}
              <ChevronRight size={13} className="ml-auto opacity-30" />
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center gap-4 px-6 sticky top-0 z-20">
          <button onClick={() => setOpen(true)} className="lg:hidden text-slate-500">
            <Menu size={20} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">{user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
