import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { Modal, errorText } from './shared'

const newQuestion = () => ({ question_text: '', difficulty: 'simple', answers: Array.from({ length: 4 }, (_, i) => ({ answer_text: '', is_correct: i === 0 })) })
const localDate = (value) => { if (!value) return ''; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
export default function QuizEditor({ quiz, onClose, onSaved }) {
  const [form, setForm] = useState(quiz ? { ...quiz, subject: quiz.subject || '', scheduled_at: localDate(quiz.scheduled_at) } : { title: '', description: '', subject: '', duration_minutes: 30, scheduled_at: '', is_published: false, questions: [newQuestion()] })
  const [subjects, setSubjects] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      const all = []; let url = '/api/admin/subjects/'
      while (url) { const { data } = await api.get(url); all.push(...data.results); url = data.next }
      if (active) setSubjects(all)
    }
    load().catch((err) => { if (active) setError(errorText(err)) })
    return () => { active = false }
  }, [])
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const updateQuestion = (index, key, value) => change('questions', form.questions.map((q, i) => i === index ? { ...q, [key]: value } : q))
  async function save(event) {
    event.preventDefault(); setSaving(true); setError('')
    const payload = { title: form.title, description: form.description, subject: form.subject || null, duration_minutes: Number(form.duration_minutes), is_published: form.is_published, scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null }
    if (!quiz?.has_attempts) payload.questions = form.questions
    try {
      if (quiz) await api.patch(`/api/admin/quizzes/${quiz.id}/`, payload)
      else await api.post('/api/admin/quizzes/', payload)
      toast.success(quiz ? 'Quiz updated' : 'Quiz created'); onSaved()
    } catch (err) { setError(errorText(err)) } finally { setSaving(false) }
  }
  return <Modal title={quiz ? 'Edit quiz' : 'Create a new quiz'} onClose={saving ? () => {} : onClose}><form onSubmit={save} className="space-y-5">
    {error && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</p>}
    <label className="block"><span className="label">Quiz title</span><input autoFocus required maxLength={255} className="input" value={form.title} onChange={(e) => change('title', e.target.value)} placeholder="e.g. HSC Physics — Motion" /></label>
    <label className="block"><span className="label">Description</span><textarea className="input" rows={2} value={form.description} onChange={(e) => change('description', e.target.value)} /></label>
    <div className="grid sm:grid-cols-2 gap-4"><label><span className="label">Subject</span><select className="input" value={form.subject} onChange={(e) => change('subject', e.target.value)}><option value="">Unassigned</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.class_level_display}</option>)}</select></label><label><span className="label">Duration (minutes)</span><input type="number" min="1" max="1440" required className="input" value={form.duration_minutes} onChange={(e) => change('duration_minutes', e.target.value)} /></label></div>
    <div className="grid sm:grid-cols-2 items-center gap-4"><label><span className="label">Start time (optional, your local time)</span><input type="datetime-local" className="input" value={form.scheduled_at} onChange={(e) => change('scheduled_at', e.target.value)} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published} onChange={(e) => change('is_published', e.target.checked)} className="accent-indigo-600" />Publish quiz for students</label></div>
    <div className="border-t pt-5"><h3 className="font-semibold mb-1">Questions <span className="text-slate-400 font-normal">({form.questions.length})</span></h3><p className="text-xs text-slate-500 mb-4">Select the circle beside the correct answer. Each question needs exactly one correct answer.</p>
    {quiz?.has_attempts && <p className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3 mb-4">Students have submitted this quiz. Questions are locked to preserve their results. You can still edit quiz details.</p>}
    <fieldset disabled={quiz?.has_attempts || saving} className="space-y-4 disabled:opacity-60">{form.questions.map((question, index) => <div key={index} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3"><div className="flex justify-between items-center"><span className="text-sm font-semibold">Question {index + 1}</span><button type="button" aria-label={`Remove question ${index + 1}`} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" onClick={() => change('questions', form.questions.filter((_, i) => i !== index))}><Trash2 size={16} /></button></div><textarea aria-label={`Question ${index + 1} text`} required className="input bg-white" placeholder="Enter your question" value={question.question_text} onChange={(e) => updateQuestion(index, 'question_text', e.target.value)} /><select aria-label={`Question ${index + 1} difficulty`} className="input bg-white" value={question.difficulty} onChange={(e) => updateQuestion(index, 'difficulty', e.target.value)}><option value="simple">Simple · 1 mark</option><option value="mid">Medium · 2 marks</option><option value="hard">Hard · 3 marks</option></select><div className="grid sm:grid-cols-2 gap-3">{question.answers.map((answer, ai) => <div key={ai} className="flex gap-2 items-center"><input type="radio" aria-label={`Question ${index + 1} correct answer ${ai + 1}`} name={`correct-${index}`} checked={answer.is_correct} onChange={() => updateQuestion(index, 'answers', question.answers.map((a, i) => ({ ...a, is_correct: i === ai })))} className="accent-indigo-600" /><input required aria-label={`Question ${index + 1} answer ${ai + 1}`} className="input bg-white" placeholder={`Answer ${ai + 1}`} value={answer.answer_text} onChange={(e) => updateQuestion(index, 'answers', question.answers.map((a, i) => i === ai ? { ...a, answer_text: e.target.value } : a))} /></div>)}</div></div>)}{!quiz?.has_attempts && <button type="button" className="btn-secondary" onClick={() => change('questions', [...form.questions, newQuestion()])}><Plus size={16} />Add question</button>}</fieldset></div>
    <div className="flex justify-end gap-3 border-t pt-5"><button type="button" disabled={saving} className="btn-secondary" onClick={onClose}>Cancel</button><button disabled={saving} className="btn-primary">{saving ? 'Saving…' : quiz ? 'Save changes' : 'Create quiz'}</button></div>
  </form></Modal>
}
