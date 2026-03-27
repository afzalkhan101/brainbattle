import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { User, Mail, Phone, Building, Lock, Camera, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [tab, setTab] = useState('profile')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    first_name:  user?.first_name  ?? '',
    last_name:   user?.last_name   ?? '',
    phone:       user?.phone       ?? '',
    institution: user?.institution ?? '',
    class_level: user?.class_level ?? '',
  })

  const [pw, setPw] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [imgFile, setImgFile] = useState(null)
  const [preview, setPreview] = useState(user?.profile_image ?? null)

  const set  = (k) => (e) => setForm({ ...form,  [k]: e.target.value })
  const setP = (k) => (e) => setPw({ ...pw, [k]: e.target.value })

  const handleImagePick = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImgFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (imgFile) fd.append('profile_image', imgFile)
      const { data } = await api.patch('/api/auth/profile/update/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      updateUser(data)
      toast.success('Profile updated')
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') Object.values(d).flat().forEach((m) => toast.error(m))
      else toast.error('Update failed')
    } finally { setSaving(false) }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (pw.new_password !== pw.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/auth/change-password/', {
        old_password: pw.old_password,
        new_password: pw.new_password,
      })
      toast.success('Password changed')
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

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your personal information</p>
      </div>

      <div className="card mb-6 flex items-center gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary-100 text-primary-700 flex items-center justify-center text-xl font-bold">
            {preview
              ? <img src={preview} alt="avatar" className="w-full h-full object-cover" />
              : initials}
          </div>
          <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary-700">
            <Camera size={11} />
            <input type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
          </label>
        </div>
        <div>
          <p className="font-bold text-slate-900">{user?.first_name} {user?.last_name}</p>
          <p className="text-sm text-slate-500 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          <div className="flex items-center gap-2 mt-2">
            <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700">
              {user?.referral_code}
            </code>
            <button onClick={copyReferral} className="text-slate-400 hover:text-primary-600 transition-colors">
              <Copy size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {['profile', 'password'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t === 'profile' ? 'Personal Info' : 'Change Password'}
          </button>
        ))}
      </div>

      {tab === 'profile' ? (
        <form onSubmit={handleProfile} className="card space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" value={form.first_name} onChange={set('first_name')} required />
              </div>
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" value={form.last_name} onChange={set('last_name')} required />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 opacity-60" value={user?.email} disabled />
            </div>
          </div>

          <div>
            <label className="label">Phone</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="+880..." value={form.phone} onChange={set('phone')} />
            </div>
          </div>

          <div>
            <label className="label">Institution</label>
            <div className="relative">
              <Building size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Your school or college" value={form.institution} onChange={set('institution')} />
            </div>
          </div>

          <div>
            <label className="label">Class Level</label>
            <select className="input" value={form.class_level} onChange={set('class_level')}>
              <option value="">Not selected</option>
              <option value="ssc">SSC</option>
              <option value="hsc">HSC</option>
              <option value="admission">Admission</option>
            </select>
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Changes'}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePassword} className="card space-y-5">
          {[
            { key: 'old_password',     label: 'Current password' },
            { key: 'new_password',     label: 'New password' },
            { key: 'confirm_password', label: 'Confirm new password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  className="input pl-9"
                  placeholder="••••••••"
                  value={pw[key]}
                  onChange={setP(key)}
                  required
                />
              </div>
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  )
}
