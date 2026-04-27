import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../authContext";
import { apiGetExamQuestions, apiSubmitExam, apiLogExamEvent, apiCheckExamStatus } from "../../api";
import { renderMath } from "../../utils/math";
import { Clock, ChevronLeft, ChevronRight, Loader2, AlertCircle, X, AlertTriangle, Smartphone, Maximize } from "lucide-react";
import CameraService from "../../services/CameraService";
import QRCode from "react-qr-code";

export default function ExamPlayer() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [adminMessage, setAdminMessage] = useState(null);
  const [examTerminated, setExamTerminated] = useState(false);
  const startTimeRef = useRef(Date.now());
  const hasLoggedStartRef = useRef(false);
  const examStartTimeRef = useRef(null);

  // Log exam event helper
  const logEvent = useCallback((eventType, eventData = {}) => {
    if (examId) {
      apiLogExamEvent(examId, eventType, eventData).catch(console.error);
    }
  }, [examId]);

  useEffect(() => {
    // Enter fullscreen mode and prevent exit
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          await document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) {
          await document.documentElement.msRequestFullscreen();
        }
      } catch (error) {
        console.warn('Fullscreen request failed:', error);
      }
    };

    // Prevent right-click context menu
    const preventContextMenu = (e) => {
      e.preventDefault();
      logEvent("context_menu_blocked", { timestamp: new Date().toISOString() });
    };

    // Prevent keyboard shortcuts
    const preventShortcuts = (e) => {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'i') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.key === 'F12')
      ) {
        e.preventDefault();
        logEvent("keyboard_shortcut_blocked", { key: e.key, timestamp: new Date().toISOString() });
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventShortcuts);

    // Load saved state from localStorage
    const savedState = localStorage.getItem(`exam_${examId}_state`);
    const savedStartTime = localStorage.getItem(`exam_${examId}_start_time`);

    // Check if student has already submitted or was terminated (final safeguard)
    apiCheckExamStatus(examId)
      .then((status) => {
        if (status.status === 'submitted') {
          setError("You have already submitted this exam. You cannot retake it.");
          setLoading(false);
          setTimeout(() => navigate('/student/dashboard'), 3000);
          return;
        }
        if (status.status === 'terminated') {
          setError("Your exam was terminated by the administrator. You cannot re-enter this exam.");
          setLoading(false);
          setTimeout(() => navigate('/student/dashboard'), 3000);
          return;
        }
      })
      .catch((statusError) => {
        // If status check fails, continue anyway (might not be implemented yet)
        console.warn('Status check failed:', statusError);
      })
      .finally(() => {
        // Continue loading exam questions regardless of status check result
        apiGetExamQuestions(examId)
          .then(async ({ exam: e, questions: qs }) => {
            setExam(e);
            setQuestions(qs);

            if (savedState) {
              // Restore saved state
              const state = JSON.parse(savedState);
              setAnswers(state.answers || {});
              setCurrent(state.current || 0);
              
              // Calculate remaining time based on saved start time
              if (savedStartTime) {
                const elapsed = Math.floor((Date.now() - parseInt(savedStartTime)) / 1000);
                const totalSeconds = e.duration_minutes * 60;
                const remaining = Math.max(0, totalSeconds - elapsed);
                setTimeLeft(remaining);
                examStartTimeRef.current = parseInt(savedStartTime);
              } else {
                setTimeLeft(e.duration_minutes * 60);
                const startTime = Date.now();
                localStorage.setItem(`exam_${examId}_start_time`, startTime.toString());
                examStartTimeRef.current = startTime;
              }
              
              hasLoggedStartRef.current = true;
            } else {
              // New exam
              setTimeLeft(e.duration_minutes * 60);
              const startTime = Date.now();
              localStorage.setItem(`exam_${examId}_start_time`, startTime.toString());
              examStartTimeRef.current = startTime;
              
              logEvent("exam_started", { examTitle: e.title, questionCount: qs.length });
              hasLoggedStartRef.current = true;
              
              // Enter fullscreen on new exam start
              enterFullscreen();
              
              // Add event listeners for security
              document.addEventListener('contextmenu', preventContextMenu);
              document.addEventListener('keydown', preventShortcuts);
            }

            // Initialize camera monitoring
            try {
              await CameraService.initializeSocket(examId, user?.id || 'unknown');
              await CameraService.initializeLaptopCamera();

              // Start camera health check to send status updates to admin
              CameraService.startCameraHealthCheck();

              // Listen for admin messages
              CameraService.socket?.on('student_admin_message', (data) => {
                console.log('Received admin message:', data);
                setAdminMessage(data);
                logEvent('admin_message_received', {
                  messageType: data.messageType,
                  message: data.message
                });

                // Handle disqualification
                if (data.messageType === 'disqualify') {
                  setExamTerminated(true);
                  CameraService.cleanup();
                  setTimeout(() => {
                    navigate('/student/dashboard');
                  }, 3000);
                }
              });

              // Listen for camera check requests
              CameraService.socket?.on('student_camera_check_request', (data) => {
                console.log('Camera check requested by admin');
                logEvent('camera_check_requested', { timestamp: data.timestamp });
              });

              // Listen for exam termination
              CameraService.socket?.on('student_exam_terminated', (data) => {
                console.log('Exam terminated by admin');
                setExamTerminated(true);
                logEvent('exam_terminated_by_admin', { timestamp: data.timestamp });
                CameraService.cleanup();
                setTimeout(() => {
                  navigate('/student/dashboard');
                }, 3000);
              });
            } catch (error) {
              console.warn('Camera initialization failed:', error);
              // Allow exam to continue even if camera fails
            }
          })
          .catch((err) => setError(err.message))
          .finally(() => setLoading(false));
      });

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventShortcuts);
    };
  }, [examId, logEvent, user?.id, navigate]);

  // Fullscreen detection and prevention
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logEvent("fullscreen_exit_violation", { timestamp: new Date().toISOString() });
        // Force fullscreen back
        const enterFullscreen = async () => {
          try {
            if (document.documentElement.requestFullscreen) {
              await document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
              await document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) {
              await document.documentElement.msRequestFullscreen();
            }
          } catch (error) {
            console.warn('Fullscreen re-entry failed:', error);
          }
        };
        enterFullscreen();
      } else {
        logEvent("fullscreen_enter");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [logEvent]);

  // ESC key detection as violation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        logEvent("esc_key_press_violation", { timestamp: new Date().toISOString() });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [logEvent]);

  // Multiple monitor detection
  useEffect(() => {
    const detectMultipleMonitors = () => {
      if (window.screen && window.screen.width && window.screen.height) {
        const screenArea = window.screen.width * window.screen.height;
        const windowArea = window.innerWidth * window.innerHeight;
        
        // If screen area is significantly larger than window area, likely multiple monitors
        if (screenArea > windowArea * 2) {
          logEvent("multiple_monitors_detected", {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            timestamp: new Date().toISOString()
          });
        }
      }
    };

    detectMultipleMonitors();
    window.addEventListener('resize', detectMultipleMonitors);
    return () => window.removeEventListener('resize', detectMultipleMonitors);
  }, [logEvent]);

  // Detect URL change (switching to another exam)
  useEffect(() => {
    const currentUrl = window.location.href;
    
    const checkUrlChange = () => {
      const newUrl = window.location.href;
      if (newUrl !== currentUrl && !newUrl.includes(`/student/exam/${examId}`)) {
        logEvent("exam_switch_violation", {
          fromUrl: currentUrl,
          toUrl: newUrl,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Check periodically
    const urlCheckInterval = setInterval(checkUrlChange, 1000);
    return () => clearInterval(urlCheckInterval);
  }, [examId, logEvent]);

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

  // Save state to localStorage on changes
  useEffect(() => {
    if (examId && questions.length > 0) {
      const state = {
        answers,
        current,
        timestamp: Date.now()
      };
      localStorage.setItem(`exam_${examId}_state`, JSON.stringify(state));
    }
  }, [answers, current, examId, questions.length]);

  // Cleanup localStorage on submit
  useEffect(() => {
    return () => {
      if (submitting) {
        localStorage.removeItem(`exam_${examId}_state`);
        localStorage.removeItem(`exam_${examId}_start_time`);
      }
    };
  }, [submitting, examId]);

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
        const timeSpent = examStartTimeRef.current ? Math.floor((Date.now() - examStartTimeRef.current) / 1000) : Math.floor((Date.now() - startTimeRef.current) / 1000);
        await apiSubmitExam(examId, answers, timeSpent);
        logEvent("exam_submitted", {
          answerCount: Object.keys(answers).length,
          totalQuestions: questions.length,
          timeSpent,
          autoSubmit
        });
        // Cleanup localStorage
        localStorage.removeItem(`exam_${examId}_state`);
        localStorage.removeItem(`exam_${examId}_start_time`);
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

  // Admin message notification
  const dismissAdminMessage = () => {
    setAdminMessage(null);
  };

  if (examTerminated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white border border-red-200 rounded-2xl p-8 shadow-sm max-w-md">
          <AlertTriangle size={40} className="mx-auto text-red-500 mb-3" />
          <p className="text-gray-800 font-bold text-xl mb-2">Exam Terminated</p>
          <p className="text-gray-600">Your exam has been terminated by the administrator.</p>
          <p className="text-sm text-gray-500 mt-4">Redirecting to dashboard...</p>
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

      {/* Admin Message Notification */}
      {adminMessage && (
        <div className={`fixed top-20 right-6 max-w-sm z-50 rounded-lg shadow-lg p-4 animate-in slide-in-from-right ${
          adminMessage.messageType === 'disqualify' ? 'bg-red-50 border border-red-200' : 'bg-purple-50 border border-purple-200'
        }`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 ${
              adminMessage.messageType === 'disqualify' ? 'text-red-600' : 'text-purple-600'
            }`} />
            <div className="flex-1">
              <p className={`font-semibold text-sm ${
                adminMessage.messageType === 'disqualify' ? 'text-red-800' : 'text-purple-800'
              }`}>
                {adminMessage.messageType === 'disqualify' ? 'Exam Terminated' : 'Message from Administrator'}
              </p>
              <p className={`text-sm mt-1 ${
                adminMessage.messageType === 'disqualify' ? 'text-red-700' : 'text-purple-700'
              }`}>
                {adminMessage.message}
              </p>
            </div>
            <button
              onClick={dismissAdminMessage}
              className={`p-1 rounded hover:bg-opacity-80 ${
                adminMessage.messageType === 'disqualify' ? 'hover:bg-red-100 text-red-600' : 'hover:bg-purple-100 text-purple-600'
              }`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Phone QR Code for reconnection */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Smartphone size={18} className="text-gray-500" />
            <div className="text-sm text-gray-600">
              <span className="font-medium">Phone Camera:</span> Scan to connect secondary camera
            </div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-gray-200">
            <QRCode 
              value={CameraService.generatePhoneURL(examId, user?.id || 'unknown')} 
              size={64}
              level="L"
            />
          </div>
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
