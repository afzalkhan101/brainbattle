import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, BookOpen, Clock, HelpCircle, Tag, ChevronRight, AlertCircle,
} from 'lucide-react'

/* ─── countdown hook ─────────────────────────────────────────────────────── */
function useCountdown(initialSeconds) {
  const [secs, setSecs] = useState(initialSeconds ?? 0)
  useEffect(() => {
    if (!initialSeconds || initialSeconds <= 0) return
    setSecs(initialSeconds)
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [initialSeconds])
  return secs
}

/* ─── countdown strip ────────────────────────────────────────────────────── */
function CountdownStrip({ seconds }) {
  const live = useCountdown(seconds)

  const d = Math.floor(live / 86400)
  const h = Math.floor((live % 86400) / 3600)
  const m = Math.floor((live % 3600) / 60)
  const s = live % 60

  const units = d > 0
    ? [{ v: d, l: 'day' }, { v: h, l: 'hr' }, { v: m, l: 'min' }, { v: s, l: 'sec' }]
    : h > 0
    ? [{ v: h, l: 'hr' }, { v: m, l: 'min' }, { v: s, l: 'sec' }]
    : [{ v: m, l: 'min' }, { v: s, l: 'sec' }]

  if (live <= 0) return null

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {units.map(({ v, l }, i) => (
        <div key={l} className="flex items-center gap-2">
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full bg-amber-50 border border-amber-200">
            <span className="text-base font-bold tabular-nums text-amber-700 leading-none">
              {String(v).padStart(2, '0')}
            </span>
            <span className="text-[9px] text-amber-500 mt-0.5">{l}</span>
          </div>
          {i < units.length - 1 && (
            <span className="text-amber-400 font-bold text-sm mb-1">:</span>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── info tile ──────────────────────────────────────────────────────────── */
function InfoTile({ icon: Icon, label, value, className = '' }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 bg-slate-50 border border-slate-100 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
        <Icon size={14} className="text-slate-500" />
      </div>
      <div>
        <p className="text-[11px] text-slate-400 leading-none mb-0.5">{label}</p>
        <p className="text-[13px] font-semibold text-slate-700 leading-tight">{value}</p>
      </div>
    </div>
  )
}

/* ─── main modal ─────────────────────────────────────────────────────────── */
export default function QuizDetailModal({ quiz, onClose }) {
  const overlayRef = useRef(null)
  const navigate   = useNavigate()

  /* Escape key */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  /* Click-outside */
  const handleOverlay = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  const handleEnter = () => {
    onClose()
    navigate(`/quizzes/${quiz.id}`)
  }

  if (!quiz) return null

  const isLive     = quiz.status_label === 'live'
  const isUpcoming = quiz.status_label === 'upcoming'
  const isDraft    = quiz.status_label === 'draft'

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      {/* 🔥 UPDATED SIZE HERE */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="relative bg-gradient-to-br from-violet-600 to-violet-700 px-6 pt-6 pb-5 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={14} color="white" />
          </button>

          <div className="flex flex-wrap gap-2 mb-3">
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                Live now
              </span>
            )}
            {isUpcoming && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-300/20 text-amber-100 border border-amber-300/30">
                Upcoming
              </span>
            )}
            {quiz.subject && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white/80 border border-white/20">
                <Tag size={9} />
                {quiz.subject.class_level_display} · {quiz.subject.name}
              </span>
            )}
          </div>

          <h2 className="text-xl font-bold text-white">{quiz.title}</h2>
          {quiz.description && (
            <p className="mt-1.5 text-sm text-white/70">{quiz.description}</p>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">

          {isUpcoming && quiz.seconds_until_start > 0 && (
            <div className="px-6 pt-4">
              <CountdownStrip seconds={quiz.seconds_until_start} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 px-6 py-4">
            <InfoTile icon={HelpCircle} label="Questions" value={`${quiz.question_count ?? '-'} MCQ`} />
            <InfoTile icon={Clock} label="Duration" value={`${quiz.duration_minutes} min`} />

            {quiz.subject && (
              <>
                <InfoTile icon={BookOpen} label="Class" value={quiz.subject.class_level_display} />
                <InfoTile icon={Tag} label="Subject" value={quiz.subject.name} />
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0">
          {isDraft ? (
            <div className="flex items-center justify-center text-slate-400 text-sm">
              <AlertCircle size={14} />
              Not published
            </div>
          ) : (
            <button
              onClick={handleEnter}
              disabled={isUpcoming}
              className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2
                ${isUpcoming
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
                }`}
            >
              {isLive ? 'Enter Quiz' : 'View Quiz'}
              <ChevronRight size={15} />
            </button>
          )}
        </div>

      </div>
    </div>
  )
}