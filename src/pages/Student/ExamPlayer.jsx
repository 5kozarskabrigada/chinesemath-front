import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGetExamQuestions, apiSubmitExam, apiLogExamEvent } from "../../api";
import { renderMath } from "../../utils/math";
import { Clock, ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import CameraService from "../../services/CameraService";

export default function ExamPlayer() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const startTimeRef = useRef(Date.now());
  const hasLoggedStartRef = useRef(false);

  // Log exam event helper
  const logEvent = useCallback((eventType, eventData = {}) => {
    if (examId) {
      apiLogExamEvent(examId, eventType, eventData).catch(console.error);
    }
  }, [examId]);

  useEffect(() => {
    apiGetExamQuestions(examId)
      .then(async ({ exam: e, questions: qs }) => {
        setExam(e);
        setQuestions(qs);
        setTimeLeft(e.duration_minutes * 60);

        // Log exam started only once
        if (!hasLoggedStartRef.current) {
          logEvent("exam_started", { examTitle: e.title, questionCount: qs.length });
          hasLoggedStartRef.current = true;

          // Initialize camera monitoring
          try {
            await CameraService.initializeSocket(examId, 'current_student_id');
            await CameraService.initializeLaptopCamera();
          } catch (error) {
            console.warn('Camera initialization failed:', error);
            // Allow exam to continue even if camera fails
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [examId, logEvent]);

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        logEvent("fullscreen_enter");
      } else {
        logEvent("fullscreen_exit", { timestamp: new Date().toISOString() });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [logEvent]);

  // Window blur/focus detection
  useEffect(() => {
    const handleWindowBlur = () => {
      logEvent("window_blur", { timestamp: new Date().toISOString() });
    };

    const handleWindowFocus = () => {
      logEvent("window_focus", { timestamp: new Date().toISOString() });
    };

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [logEvent]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent("tab_hidden", { timestamp: new Date().toISOString() });
      } else {
        logEvent("tab_visible", { timestamp: new Date().toISOString() });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [logEvent]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft !== null]);

  const handleSubmit = useCallback(
    async (autoSubmit = false) => {
      if (submitting) return;
      if (!autoSubmit) {
        const unanswered = questions.filter((q) => !answers[q.id]).length;
        if (unanswered > 0) {
          const confirmed = window.confirm(`${unanswered} question(s) are unanswered. Submit anyway?`);
          if (!confirmed) return;
        }
      }
      setSubmitting(true);
      try {
        const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
        await apiSubmitExam(examId, answers, timeSpent);
        logEvent("exam_submitted", {
          answerCount: Object.keys(answers).length,
          totalQuestions: questions.length,
          timeSpent,
          autoSubmit
        });
        CameraService.cleanup();
        navigate(`/student/exam/${examId}/result`);
      } catch (error) {
        setError(error.message);
      } finally {
        setSubmitting(false);
      }
    },
    [answers, examId, navigate, questions, submitting, logEvent]
  );

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
          <p className="text-gray-700 font-medium">{error}</p>
          <button onClick={() => navigate("/student/dashboard")} className="mt-4 text-red-600 text-sm underline">
            Back
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const answered = Object.keys(answers).length;
  const isTimeLow = timeLeft < 60;

  if (!q) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white border border-gray-100 rounded-2xl p-8 shadow-sm max-w-md">
          <AlertCircle size={34} className="mx-auto text-amber-500 mb-3" />
          <p className="text-gray-800 font-semibold mb-1">No questions available for this exam.</p>
          <p className="text-sm text-gray-500">Please contact your teacher or try another exam.</p>
          <button
            onClick={() => navigate("/student/dashboard")}
            className="mt-5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm truncate max-w-xs">{exam?.title}</p>
            <p className="text-xs text-gray-400">{answered}/{questions.length} answered</p>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-sm font-mono font-bold ${isTimeLow ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-700"}`}>
            <Clock size={14} />
            <span>{timeLeft !== null ? formatTime(timeLeft) : "--:--"}</span>
          </div>
        </div>
      </header>

      {/* Question navigator */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-3 flex flex-wrap gap-2">
          {questions.map((qn, idx) => (
            <button
              key={qn.id}
              onClick={() => setCurrent(idx)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                idx === current
                  ? "bg-red-600 text-white shadow"
                  : answers[qn.id]
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Question body */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">
            Question {current + 1} of {questions.length}
          </p>
          <div
            className="text-gray-800 text-base leading-relaxed mb-6"
            dangerouslySetInnerHTML={{ __html: renderMath(q.question_text) }}
          />

          <div className="space-y-3">
            {(typeof q.options === "string" ? JSON.parse(q.options) : q.options).map((opt) => {
              const selected = answers[q.id] === opt.label;
              return (
                <button
                  key={opt.label}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.label }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                    selected
                      ? "border-red-500 bg-red-50 text-red-800"
                      : "border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-white"
                  }`}
                >
                  <span className={`inline-flex w-7 h-7 rounded-lg mr-3 items-center justify-center text-xs font-bold ${selected ? "bg-red-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                    {opt.label}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: renderMath(opt.text) }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition shadow-sm"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition shadow-sm disabled:opacity-70"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              <span>Submit Exam</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
