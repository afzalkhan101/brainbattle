import { usePreferences } from "../../context/Preferences";
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { useAdminList, ListState, Pagination, Modal, errorText } from './shared';
export default function Subjects() {
  const {
    t
  } = usePreferences();
  const list = useAdminList('subjects');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    class_level: 'hsc',
    description: ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/admin/subjects/', form);
      setOpen(false);
      list.refresh();
      toast.success(t('Subject added'));
      setForm({
        name: '',
        slug: '',
        class_level: 'hsc',
        description: ''
      });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return <><div className="flex justify-between items-center mb-6"><div><h1 className="page-title">{t("Subjects")}</h1><p className="page-subtitle">{t("Organize quizzes by subject and class.")}</p></div><button className="btn-primary" onClick={() => {
        setOpen(true);
        setError('');
      }}>{t("+ Add subject")}</button></div><section className="admin-panel"><ListState list={list}><div className="overflow-x-auto p-5"><table className="admin-table"><thead><tr><th>{t("Subject")}</th><th>{t("Class")}</th><th>{t("Description")}</th></tr></thead><tbody>{list.results.map(s => <tr key={s.id}><td className="font-semibold">{s.name}</td><td>{t(s.class_level_display)}</td><td>{s.description || '—'}</td></tr>)}</tbody></table></div></ListState><Pagination list={list} /></section>{open && <Modal title={t("Add subject")} onClose={() => {
      if (!busy) setOpen(false);
    }}><form onSubmit={save} className="space-y-4">{error && <p className="text-red-600 text-sm" role="alert">{t(error)}</p>}{['name', 'slug', 'description'].map(key => <label className="block" key={key}><span className="label capitalize">{t(key)}</span><input className="input" required={key !== 'description'} pattern={key === 'slug' ? '[-a-zA-Z0-9_]+' : undefined} maxLength={key === 'name' ? 100 : key === 'slug' ? 120 : undefined} value={form[key]} onChange={e => setForm({
            ...form,
            [key]: e.target.value
          })} placeholder={t(key === 'slug' ? 'e.g. hsc-physics (unique)' : '')} /></label>)}<label className="block"><span className="label">{t("Class")}</span><select className="input" value={form.class_level} onChange={e => setForm({
            ...form,
            class_level: e.target.value
          })}>{['class_6', 'class_7', 'class_8', 'class_9', 'class_10', 'ssc', 'hsc', 'admission'].map(l => <option key={l} value={l}>{t(l.replace('_', ' ').toUpperCase())}</option>)}</select></label><div className="flex gap-3 justify-end"><button type="button" disabled={busy} className="btn-secondary" onClick={() => setOpen(false)}>{t("Cancel")}</button><button className="btn-primary" disabled={busy}>{t(busy ? 'Saving…' : 'Add subject')}</button></div></form></Modal>}</>;
}
