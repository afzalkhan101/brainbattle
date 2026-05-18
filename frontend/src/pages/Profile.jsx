import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import {
  User, Mail, Phone, Building, Lock, Camera, Copy,
  GraduationCap, BookOpen, MapPin, Calendar, Edit3,
  CheckCircle, Shield, Award, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'


const CLASS_LEVEL_OPTIONS = [
  { value: '',          label: 'Not selected', group: null },
  { value: 'class_6',  label: 'Class 6',      group: 'School' },
  { value: 'class_7',  label: 'Class 7',      group: 'School' },
  { value: 'class_8',  label: 'Class 8',      group: 'School' },
  { value: 'class_9',  label: 'Class 9',      group: 'School' },
  { value: 'class_10', label: 'Class 10',     group: 'School' },
  { value: 'ssc',      label: 'SSC',          group: 'Board Exam' },
  { value: 'hsc',      label: 'HSC',          group: 'Board Exam' },
  { value: 'admission',label: 'Admission',    group: 'University' },
]

const BOARD_OPTIONS = [
  '', 'Dhaka', 'Chittagong', 'Rajshahi', 'Sylhet',
  'Barisal', 'Jessore', 'Comilla', 'Dinajpur', 'Mymensingh', 'Madrasa', 'Technical',
]

const SUBJECT_GROUP_OPTIONS = ['', 'Science', 'Commerce', 'Arts / Humanities']

const TABS = [
  { id: 'profile',  label: 'Personal Info',   icon: User },
  { id: 'academic', label: 'Academic Info',   icon: GraduationCap },
  { id: 'password', label: 'Change Password', icon: Lock },
]

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [tab, setTab]       = useState('profile')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    first_name:    user?.first_name    ?? '',
    last_name:     user?.last_name     ?? '',
    phone:         user?.phone         ?? '',
    institution:   user?.institution   ?? '',
    class_level:   user?.class_level   ?? '',
    board:         user?.board         ?? '',
    subject_group: user?.subject_group ?? '',
    roll_number:   user?.roll_number   ?? '',
    reg_number:    user?.reg_number    ?? '',
    exam_year:     user?.exam_year     ?? '',
    district:      user?.district      ?? '',
  })

  const [pw, setPw]         = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [imgFile, setImgFile] = useState(null)
  const [preview, setPreview] = useState(user?.profile_image ?? null)
  const [pwVisible, setPwVisible] = useState({ old: false, new: false, confirm: false })

  // Sync preview when user context updates
  useEffect(() => {
    if (!imgFile) setPreview(user?.profile_image ?? null)
  }, [user?.profile_image, imgFile])

  const set  = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setP = (k) => (e) => setPw(p => ({ ...p, [k]: e.target.value }))

  const handleImagePick = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    setImgFile(file)
    setPreview(URL.createObjectURL(file))
  }

  // ── Personal Info ──────────────────────────────────────────────────────────
  const handleProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      ;['first_name', 'last_name', 'phone', 'institution', 'class_level'].forEach(
        (k) => fd.append(k, form[k])
      )
      if (imgFile) fd.append('profile_image', imgFile)

      const { data } = await api.patch('/api/auth/profile/update/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      updateUser(data)
      setImgFile(null)
      toast.success('Profile updated!')
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') Object.values(d).flat().forEach((m) => toast.error(m))
      else toast.error('Update failed')
    } finally { setSaving(false) }
  }

  // ── Academic Info ──────────────────────────────────────────────────────────
  const handleAcademic = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      ;['class_level', 'institution', 'board', 'subject_group', 'roll_number', 'reg_number', 'exam_year', 'district'].forEach(
        (k) => fd.append(k, form[k] ?? '')
      )

      const { data } = await api.patch('/api/auth/profile/update/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      updateUser(data)
      toast.success('Academic info updated!')
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') Object.values(d).flat().forEach((m) => toast.error(m))
      else toast.error('Update failed')
    } finally { setSaving(false) }
  }

  // ── Password ───────────────────────────────────────────────────────────────
  const handlePassword = async (e) => {
    e.preventDefault()
    if (pw.new_password !== pw.confirm_password) { toast.error('Passwords do not match'); return }
    setSaving(true)
    try {
      await api.post('/api/auth/change-password/', {
        old_password: pw.old_password,
        new_password: pw.new_password,
      })
      toast.success('Password changed!')
      setPw({ old_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') Object.values(d).flat().forEach((m) => toast.error(m))
      else toast.error('Failed to change password')
    } finally { setSaving(false) }
  }

  const copyReferral = () => {
    navigator.clipboard.writeText(user?.referral_code ?? '')
    toast.success('Referral code copied!')
  }

  const initials        = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()
  const classLevelLabel = CLASS_LEVEL_OPTIONS.find(o => o.value === user?.class_level)?.label ?? ''
  const completionFields = ['first_name', 'last_name', 'phone', 'institution', 'class_level', 'profile_image']
  const filled      = completionFields.filter(f => user?.[f]).length
  const completion  = Math.round((filled / completionFields.length) * 100)

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your personal and academic information</p>
      </div>

      {/* Profile summary card */}
      <div className="card mb-4">
        <div className="flex items-start gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold shadow-sm">
              {preview
                ? <img src={preview} alt="avatar" className="w-full h-full object-cover" />
                : <span>{initials}</span>
              }
            </div>
            <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary-700 transition-colors">
              <Camera size={13} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            </label>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-bold text-slate-900 text-lg leading-tight">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 capitalize">
                    <Award size={10} />
                    {user?.role?.replace(/_/g, ' ')}
                  </span>
                  {classLevelLabel && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                      <GraduationCap size={10} />
                      {classLevelLabel}
                    </span>
                  )}
                  {user?.board && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                      <Shield size={10} />
                      {user.board} Board
                    </span>
                  )}
                  {user?.is_email_verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      <CheckCircle size={10} />
                      Verified
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                <Shield size={12} className="text-slate-400" />
                <code className="text-xs font-mono text-slate-700">{user?.referral_code}</code>
                <button onClick={copyReferral} className="text-slate-400 hover:text-primary-600 transition-colors ml-1">
                  <Copy size={12} />
                </button>
              </div>
            </div>

            {/* Completion bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-500">Profile completion</span>
                <span className="text-xs font-medium text-slate-700">{completion}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {(user?.institution || user?.district) && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 flex-wrap">
            {user?.institution && (
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <Building size={13} className="text-slate-400" />
                {user.institution}
              </span>
            )}
            {user?.district && (
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <MapPin size={13} className="text-slate-400" />
                {user.district}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* ── Personal Info ── */}
      {tab === 'profile' && (
        <form onSubmit={handleProfile} className="card space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <User size={15} className="text-primary-600" />
            <h3 className="font-semibold text-slate-800">Personal Information</h3>
          </div>

          {imgFile && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-center gap-2">
              <Camera size={13} />
              New photo selected — click <strong>Save Changes</strong> to upload it.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name <span className="text-red-500">*</span></label>
              <input className="input" value={form.first_name} onChange={set('first_name')} required placeholder="First name" />
            </div>
            <div>
              <label className="label">Last name <span className="text-red-500">*</span></label>
              <input className="input" value={form.last_name} onChange={set('last_name')} required placeholder="Last name" />
            </div>
          </div>

          <div>
            <label className="label">Email address</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 opacity-60 cursor-not-allowed" value={user?.email} disabled />
            </div>
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed.</p>
          </div>

          <div>
            <label className="label">Phone number</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="+880 1XXXXXXXXX" value={form.phone} onChange={set('phone')} />
            </div>
          </div>

          <div>
            <label className="label">Member since</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9 opacity-60 cursor-not-allowed"
                value={user?.date_joined
                  ? new Date(user.date_joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'}
                disabled
              />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Edit3 size={14} /> Save Changes</>
            }
          </button>
        </form>
      )}

      {/* ── Academic Info ── */}
      {tab === 'academic' && (
        <form onSubmit={handleAcademic} className="space-y-4">

          {/* Institution */}
          <div className="card space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Building size={15} className="text-primary-600" />
              <h3 className="font-semibold text-slate-800">School / Institution</h3>
            </div>

            <div>
              <label className="label">Institution name</label>
              <div className="relative">
                <Building size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Your school, college, or coaching center"
                  value={form.institution}
                  onChange={set('institution')}
                />
              </div>
            </div>

            <div>
              <label className="label">District / Location</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="e.g. Dhaka, Chittagong..."
                  value={form.district}
                  onChange={set('district')}
                />
              </div>
            </div>
          </div>

          {/* Academic Level */}
          <div className="card space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap size={15} className="text-primary-600" />
              <h3 className="font-semibold text-slate-800">Academic Level</h3>
            </div>

            <div>
              <label className="label">Class / Level</label>
              <div className="relative">
                <GraduationCap size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select className="input pl-9 pr-9 appearance-none" value={form.class_level} onChange={set('class_level')}>
                  {CLASS_LEVEL_OPTIONS.map(({ value, label, group }) => (
                    <option key={value} value={value}>
                      {group ? `${group} — ${label}` : label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="label">Subject group</label>
              <div className="relative">
                <BookOpen size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select className="input pl-9 pr-9 appearance-none" value={form.subject_group} onChange={set('subject_group')}>
                  {SUBJECT_GROUP_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g || 'Not selected'}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="label">Education board</label>
              <div className="relative">
                <Shield size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select className="input pl-9 pr-9 appearance-none" value={form.board} onChange={set('board')}>
                  {BOARD_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b || 'Not selected'}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Exam Details */}
          <div className="card space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={15} className="text-primary-600" />
              <h3 className="font-semibold text-slate-800">Exam Details</h3>
              <span className="text-xs text-slate-400 font-normal ml-1">(optional)</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Roll number</label>
                <input
                  className="input"
                  placeholder="Your roll no."
                  value={form.roll_number}
                  onChange={set('roll_number')}
                />
              </div>
              <div>
                <label className="label">Registration no.</label>
                <input
                  className="input"
                  placeholder="Reg. number"
                  value={form.reg_number}
                  onChange={set('reg_number')}
                />
              </div>
            </div>

            <div>
              <label className="label">Exam year</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <select className="input pl-9 pr-9 appearance-none" value={form.exam_year} onChange={set('exam_year')}>
                  <option value="">Not selected</option>
                  {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + 1 - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Edit3 size={14} /> Save Academic Info</>
            }
          </button>
        </form>
      )}

      {/* ── Change Password ── */}
      {tab === 'password' && (
        <form onSubmit={handlePassword} className="card space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Lock size={15} className="text-primary-600" />
            <h3 className="font-semibold text-slate-800">Change Password</h3>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
            Choose a strong password with at least 8 characters.
          </div>

          {[
            { key: 'old_password',     label: 'Current password',    vis: 'old' },
            { key: 'new_password',     label: 'New password',         vis: 'new' },
            { key: 'confirm_password', label: 'Confirm new password', vis: 'confirm' },
          ].map(({ key, label, vis }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={pwVisible[vis] ? 'text' : 'password'}
                  className="input pl-9 pr-14"
                  placeholder="••••••••"
                  value={pw[key]}
                  onChange={setP(key)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setPwVisible(v => ({ ...v, [vis]: !v[vis] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                >
                  {pwVisible[vis] ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          ))}

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Shield size={14} /> Update Password</>
            }
          </button>
        </form>
      )}
    </div>
  )
}