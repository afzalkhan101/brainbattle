import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { ArrowLeft, ChevronRight, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

/* ─── constants ─────────────────────────────────────────────── */
const DIFF_TIME  = { easy: 10, mid: 15, hard: 20 };
const DIFF_LABEL = { easy: "Easy", mid: "Medium", hard: "Hard" };
const LETTERS    = ["A", "B", "C", "D"];

const getTimeLimit = (d) => DIFF_TIME[d] ?? 15;

/* ─── sub-components ─────────────────────────────────────────── */
function DifficultyBadge({ level }) {
  const styles = {
    easy: { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-600" },
    mid:  { badge: "bg-amber-50 text-amber-700",     dot: "bg-amber-600"   },
    hard: { badge: "bg-red-50 text-red-700",          dot: "bg-red-600"     },
  };
  const s = styles[level] ?? styles.mid;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide ${s.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {DIFF_LABEL[level] ?? level}
    </span>
  );
}

function TimerRing({ timeLeft, total, danger }) {
  const r  = 22;
  const c  = 2 * Math.PI * r;
  const dash = c * (timeLeft / total);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative w-14 h-14">
        <svg className="absolute inset-0 -rotate-90" width="56" height="56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
          <circle
            cx="28" cy="28" r={r} fill="none"
            stroke={danger ? "#E24B4A" : "#534AB7"}
            strokeWidth="3.5"
            strokeDasharray={c.toFixed(2)}
            strokeDashoffset={(c - dash).toFixed(2)}
            strokeLinecap="round"
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center text-[13px] font-semibold font-mono ${
            danger ? "text-red-600" : "text-indigo-700"
          }`}
        >
          {timeLeft}s
        </div>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
        Time
      </span>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────── */
export default function QuizDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [quiz,        setQuiz]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [answers,     setAnswers]     = useState({});
  const [timeLeft,    setTimeLeft]    = useState(null);
  const [lockedQs,    setLockedQs]    = useState(new Set());
  const [result,      setResult]      = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const timerRef = useRef(null);

  /* fetch quiz */
  useEffect(() => {
    api
      .get(`/api/quizzes/${id}/`)
      .then(({ data }) => { setQuiz(data); setLoading(false); })
      .catch(() => { toast.error("Quiz not found"); navigate("/quizzes"); });
  }, [id]);

  const questions = quiz?.questions ?? [];
  const currentQ  = questions[currentIdx];
  const isLastQ   = currentIdx === questions.length - 1;

  /* timer */
  const startTimer = useCallback((q) => {
    clearInterval(timerRef.current);
    setTimeLeft(getTimeLimit(q?.difficulty));
    setShowExpired(false);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setLockedQs((s) => new Set(s).add(q.id));
          setAnswers((a) => ({ ...a, [q.id]: a[q.id] ?? null }));
          setShowExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (!currentQ || result) return;
    startTimer(currentQ);
    return () => clearInterval(timerRef.current);
  }, [currentIdx, currentQ?.id, result]);

  /* actions */
  const select = (qId, aId) => {
    if (result || lockedQs.has(qId)) return;
    setAnswers((p) => ({ ...p, [qId]: aId }));
  };

  const handleNext = () => {
    if (answers[currentQ.id] === undefined) {
      setAnswers((p) => ({ ...p, [currentQ.id]: null }));
      setLockedQs((s) => new Set(s).add(currentQ.id));
    }
    clearInterval(timerRef.current);
    setCurrentIdx((i) => i + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    clearInterval(timerRef.current);

    try {
      const payload = {
        answers: questions
          .map((q) => ({ question_id: q.id, answer_id: answers[q.id] ?? null }))
          .filter((a) => a.answer_id !== null),
      };
      const { data } = await api.post(`/api/quizzes/${id}/submit/`, payload);
      setResult(data);
      Swal.fire({
        icon: "success",
        title: "Quiz submitted!",
        text: "Your result is ready.",
        confirmButtonColor: "#534AB7",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Submission failed",
        text: err.response?.data?.detail || "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── loading ── */
  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  /* ── result screen ── */
  if (result) {
    const correct = result.attempt?.correct_count ?? 0;
    const total   = questions.length;
    const score   = result.attempt?.score ?? Math.round((correct / total) * 100);
    const wrong   = total - correct;

    const tier =
      score >= 70 ? { icon: "✓", bg: "bg-emerald-50", text: "text-emerald-700", msg: "Great work!" }
    : score >= 40 ? { icon: "~", bg: "bg-amber-50",   text: "text-amber-700",   msg: "Good effort" }
    :               { icon: "✗", bg: "bg-red-50",      text: "text-red-700",     msg: "Keep practicing" };

    return (
      <div className="max-w-2xl mx-auto px-3 md:px-0 py-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          {/* icon */}
          <div className={`w-24 h-24 rounded-full ${tier.bg} flex items-center justify-center mx-auto mb-5`}>
            <span className={`font-mono font-bold text-4xl ${tier.text}`}>{tier.icon}</span>
          </div>

          {/* score */}
          <div className="text-5xl font-bold font-mono text-slate-800 leading-none mb-1">
            {score}<span className="text-2xl text-slate-400">%</span>
          </div>
          <p className="text-sm text-slate-500 mb-7">
            {tier.msg} — {correct} of {total} correct
          </p>

          {/* stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { val: correct, label: "Correct",   color: "text-emerald-600" },
              { val: wrong,   label: "Incorrect",  color: "text-red-500"    },
              { val: total,   label: "Total",      color: "text-slate-700"  },
            ].map(({ val, label, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl py-3">
                <div className={`text-2xl font-bold font-mono ${color}`}>{val}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate("/quizzes")}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Back to quizzes
            </button>
            <button
              onClick={() => navigate(0)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Retake quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── quiz screen ── */
  const progress = Math.round(((currentIdx + 1) / questions.length) * 100);
  const isLocked = lockedQs.has(currentQ.id);
  const selected = answers[currentQ.id];
  const timeLimit = getTimeLimit(currentQ.difficulty);
  const danger    = timeLeft !== null && timeLeft <= 5;

  return (
    <div className="max-w-2xl mx-auto px-3 md:px-0 py-4">
      {/* back */}
      <button
        type="button"
        onClick={() => navigate("/quizzes")}
        className="flex items-center gap-2 mb-5 text-slate-500 hover:text-slate-800 transition text-sm font-medium"
      >
        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
          <ArrowLeft size={15} />
        </div>
        Back to quizzes
      </button>

      {/* header card */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-3 shadow-sm">
        <h1 className="text-base md:text-lg font-semibold text-slate-800 mb-3 leading-snug">
          {quiz.title}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-mono font-semibold text-slate-400 shrink-0">
            Q {currentIdx + 1}/{questions.length}
          </span>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md shrink-0">
            {progress}%
          </span>
        </div>
      </div>

      {/* question card */}
      {currentQ && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          {/* top row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <DifficultyBadge level={currentQ.difficulty} />
              <p className="mt-2.5 text-[15px] font-medium text-slate-800 leading-relaxed">
                {currentQ.question_text}
              </p>
            </div>
            {timeLeft !== null && (
              <TimerRing timeLeft={timeLeft} total={timeLimit} danger={danger} />
            )}
          </div>

          {/* expired warning */}
          {showExpired && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mb-4 text-[13px] font-medium text-red-700">
              <AlertCircle size={14} className="shrink-0" />
              Time's up — this question was skipped automatically
            </div>
          )}

          {/* answers */}
          <div className="flex flex-col gap-2">
            {currentQ.answers?.map((a, i) => {
              const isSelected = selected === a.id;
              return (
                <button
                  key={a.id}
                  disabled={isLocked || !!result}
                  onClick={() => select(currentQ.id, a.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all
                    ${isSelected
                      ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:translate-x-0.5"
                    }
                    ${(isLocked || result) ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                  `}
                >
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold font-mono shrink-0 transition-colors
                      ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    {LETTERS[i]}
                  </span>
                  {a.answer_text}
                </button>
              );
            })}
          </div>

          {/* footer */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
            <span className="text-[12px] text-slate-400">
              {isLocked ? "Question locked" : "Select an answer to continue"}
            </span>

            {isLastQ ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit quiz
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
              >
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}