import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Send,
  Clock,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";

const DIFFICULTY_TIME = { easy: 10, mid: 15, hard: 20 };
const DIFFICULTY_LABEL = { easy: "Easy", mid: "Medium", hard: "Hard" };
const DIFFICULTY_COLOR = {
  easy: "bg-emerald-50 text-emerald-600 border-emerald-200",
  mid: "bg-amber-50 text-amber-600 border-amber-200",
  hard: "bg-red-50 text-red-600 border-red-200",
};

const getTimeLimit = (d) => DIFFICULTY_TIME[d] ?? 15;

const DifficultyBadge = ({ level }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium shrink-0 ${DIFFICULTY_COLOR[level] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}
  >
    {DIFFICULTY_LABEL[level] ?? level}
  </span>
);

const TimerRing = ({ timeLeft, total, danger }) => {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (timeLeft / total);

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56">
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="3"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={danger ? "#ef4444" : "#6366f1"}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - dash}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`text-sm font-bold ${danger ? "text-red-500" : "text-slate-700"}`}
      >
        {timeLeft}s
      </span>
    </div>
  );
};

export default function QuizDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [lockedQs, setLockedQs] = useState(new Set());
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    api
      .get(`/api/quizzes/${id}/`)
      .then(({ data }) => {
        setQuiz(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Quiz not found");
        navigate("/quizzes");
      });
  }, [id]);

  const questions = quiz?.questions ?? [];
  const currentQ = questions[currentIdx];
  const isLastQ = currentIdx === questions.length - 1;

  const startTimer = useCallback((q) => {
    clearInterval(timerRef.current);
    const limit = getTimeLimit(q?.difficulty);
    setTimeLeft(limit);
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
          .map((q) => ({
            question_id: q.id,
            answer_id: answers[q.id] ?? null,
          }))
          .filter((a) => a.answer_id !== null),
      };

      const { data } = await api.post(`/api/quizzes/${id}/submit/`, payload);

      setResult(data);

      Swal.fire({
        icon: "success",
        title: "Quiz Submitted!",
        text: "Done",
        confirmButtonColor: "#6366f1",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: err.response?.data?.detail || "Something went wrong!",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (result)
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl p-6 border bg-white">
          <h2>Result</h2>
          <p>Score: {result.attempt.score}</p>
        </div>
      </div>
    );

  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-3 md:px-0">
      <button
        type="button"
        onClick={() => navigate("/quizzes")}
        className="flex items-center gap-2 mb-4"
      >
        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white">
          <ArrowLeft size={16} />
        </div>
        <span className="hidden md:inline text-sm text-slate-600">Back</span>
      </button>

      <div className="card mb-4">
        <h1 className="text-lg md:text-xl font-bold">{quiz.title}</h1>

        <div className="mt-3">
          <div className="flex justify-between text-xs mb-2">
            <span>
              Q {currentIdx + 1}/{questions.length}
            </span>

            {/* 🔥 ONLY CHANGE DONE HERE */}
            <div className="w-9 h-9 rounded-full border-2 border-primary-500 flex items-center justify-center text-[9px] text-black font-bold text-primary-600">
  {Math.round(progress)}%
</div>
          </div>

          <div className="h-1.5 bg-slate-100 rounded-full">
            <div
              className="h-full bg-primary-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {currentQ && (
        <div className="card">
          <div className="flex flex-col md:flex-row md:justify-between gap-3 mb-3">
            <div>
              <DifficultyBadge level={currentQ.difficulty} />
              <p className="mt-2 font-medium">{currentQ.question_text}</p>
            </div>

            {timeLeft !== null && (
              <TimerRing
                timeLeft={timeLeft}
                total={getTimeLimit(currentQ.difficulty)}
                danger={timeLeft <= 5}
              />
            )}
          </div>

          <div className="space-y-2">
            {currentQ.answers?.map((a) => (
              <button
                key={a.id}
                onClick={() => select(currentQ.id, a.id)}
                className="w-full text-left p-3 border rounded-xl hover:bg-slate-50"
              >
                {a.answer_text}
              </button>
            ))}
          </div>

          <div className="flex justify-end mt-4">
            {isLastQ ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            ) : (
              <button onClick={handleNext} className="btn-primary">
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
