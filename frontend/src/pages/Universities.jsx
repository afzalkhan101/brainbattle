import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Search, Plus, Globe, MapPin, Calendar, Building2, Pencil, Trash2, X, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const empty = { name: '', city: '', country: 'Bangladesh', website: '', established_year: '', is_public: true }

export default function Universities() {
  const { user } = useAuth()
  const isAdmin = user?.is_staff || user?.role === 'admin'
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const fetchList = async (q = '') => {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/universities/${q ? `?search=${q}` : ''}`)
      setList(Array.isArray(data) ? data : data.results ?? [])
    } catch { toast.error('Failed to load universities') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchList() }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchList(search), 400)
    return () => clearTimeout(t)
  }, [search])

  const openCreate = () => { setForm(empty); setModal('create') }
  const openEdit   = (u) => { setForm({ ...u, established_year: u.established_year ?? '' }); setModal('edit') }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.website) delete payload.website
      if (!payload.established_year) delete payload.established_year
      else payload.established_year = Number(payload.established_year)

      if (modal === 'create') {
        const { data } = await api.post('/api/universities/', payload)
        setList([data, ...list])
        toast.success('University created')
      } else {
        const { data } = await api.put(`/api/universities/${form.id}/`, payload)
        setList(list.map((u) => (u.id === form.id ? data : u)))
        toast.success('Updated successfully')
      }
      setModal(null)
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') Object.values(d).flat().forEach((m) => toast.error(m))
      else toast.error('Something went wrong')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this university?')) return
    try {
      await api.delete(`/api/universities/${id}/`)
      setList(list.filter((u) => u.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Delete failed') }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="page-title">Universities</h1>
          <p className="page-subtitle">Browse universities across Bangladesh</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={15} /> Add University
          </button>
        )}
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Search by name, city…"
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
          <Building2 size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No universities found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((u) => (
            <div key={u.id} className="card hover:shadow-md transition-shadow flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 leading-snug">{u.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={u.is_public ? 'badge-green' : 'badge-slate'}>
                      {u.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => openEdit(u)} className="w-7 h-7 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 flex items-center justify-center transition-all">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span>{u.city}, {u.country}</span>
                </div>
                {u.established_year && (
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-slate-400 shrink-0" />
                    <span>Est. {u.established_year}</span>
                  </div>
                )}
                {u.website && (
                  <a href={u.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline">
                    <Globe size={13} className="shrink-0" />
                    <span className="truncate">Website</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{modal === 'create' ? 'Add University' : 'Edit University'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Name</label>
                <input className="input" placeholder="University of Dhaka" value={form.name} onChange={set('name')} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">City</label>
                  <input className="input" placeholder="Dhaka" value={form.city} onChange={set('city')} required />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input className="input" value={form.country} onChange={set('country')} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Est. Year</label>
                  <input type="number" className="input" placeholder="1921" value={form.established_year} onChange={set('established_year')} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.value === 'true' })}>
                    <option value="true">Public</option>
                    <option value="false">Private</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Website</label>
                <input type="url" className="input" placeholder="https://..." value={form.website} onChange={set('website')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
