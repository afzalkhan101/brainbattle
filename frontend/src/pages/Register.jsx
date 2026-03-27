import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    phone: '', role: 'student', class_level: '', referral_code: ''
  })

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.phone) delete payload.phone
      if (!payload.class_level) delete payload.class_level
      if (!payload.referral_code) delete payload.referral_code
      await register(payload)
      navigate('/dashboard')
      toast.success('Account created!')
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        Object.values(data).flat().forEach((msg) => toast.error(msg))
      } else {
        toast.error('Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 flex-col justify-center items-center p-12 text-white">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
          <GraduationCap size={32} />
        </div>
        <h1 className="text-4xl font-bold mb-3">EduPortal</h1>
        <p className="text-primary-200 text-center max-w-sm text-lg leading-relaxed">
          Join thousands of students and educators on Bangladesh's premier education platform.
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-6">
          <div className="flex lg:hidden items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <GraduationCap size={16} className="text-white" />
            </div>
            <span className="font-bold text-xl">EduPortal</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Create account</h2>
          <p className="text-slate-500 text-sm mb-6">Fill in your details to get started</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input pl-9" placeholder="John" value={form.first_name} onChange={set('first_name')} required />
                </div>
              </div>
              <div>
                <label className="label">Last name</label>
                <input className="input" placeholder="Doe" value={form.last_name} onChange={set('last_name')} required />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" className="input pl-9" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={set('role')}>
                  <option value="student">Student</option>
                  <option value="coaching_center_owner">Coaching Owner</option>
                  <option value="university_admin">University Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Class Level</label>
                <select className="input" value={form.class_level} onChange={set('class_level')}>
                  <option value="">Select</option>
                  <option value="ssc">SSC</option>
                  <option value="hsc">HSC</option>
                  <option value="admission">Admission</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" placeholder="+880..." value={form.phone} onChange={set('phone')} />
              </div>
            </div>

            <div>
              <label className="label">Referral Code <span className="text-slate-400 font-normal">(optional)</span></label>
              <input className="input" placeholder="Enter referral code" value={form.referral_code} onChange={set('referral_code')} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
