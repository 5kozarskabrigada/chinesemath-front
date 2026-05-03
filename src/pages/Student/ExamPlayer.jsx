import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../authContext";
import { apiGetExamQuestions, apiSubmitExam, apiLogExamEvent, apiCheckExamStatus } from "../../api";
import { renderMath } from "../../utils/math";
import { Clock, ChevronLeft, ChevronRight, Loader2, AlertCircle, X, AlertTriangle, Smartphone, Maximize, Star } from "lucide-react";
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
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [isFullscreenBlocked, setIsFullscreenBlocked] = useState(false);
  const [fullscreenViolationStartTime, setFullscreenViolationStartTime] = useState(null);
  const [fullscreenViolationCount, setFullscreenViolationCount] = useState(0);
  const [violationTimer, setViolationTimer] = useState(0);
  const cameraVideoRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const hasLoggedStartRef = useRef(false);
  const examStartTimeRef = useRef(null);

  // Camera stream attachment
  useEffect(() => {
    if (cameraVideoRef.current && CameraService.laptopStream) {
      cameraVideoRef.current.srcObject = CameraService.laptopStream;
      cameraVideoRef.current.play().catch(e => console.error('Video play error:', e));
    }
  }, [CameraService.laptopStream]);

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
              setMarkedForReview(new Set(state.markedForReview || []));
              
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
              const enterFullscreenInitial = async () => {
                try {
                  logEvent("fullscreen_initial_attempt", { timestamp: new Date().toISOString() });
                  
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                  } else if (document.documentElement.webkitRequestFullscreen) {
                    await document.documentElement.webkitRequestFullscreen();
                  } else if (document.documentElement.msRequestFullscreen) {
                    await document.documentElement.msRequestFullscreen();
                  }
                  
                  logEvent("fullscreen_initial_success", { timestamp: new Date().toISOString() });
                } catch (error) {
                  console.error('Initial fullscreen request failed:', error);
                  logEvent("fullscreen_initial_failed", { 
                    timestamp: new Date().toISOString(),
                    error: error.message
                  });
                  
                  // Still allow exam to continue but show warning
                  setTimeout(() => {
                    if (!document.fullscreenElement) {
                      setIsFullscreenBlocked(true);
                      alert('Please enter fullscreen mode manually using F11 or the fullscreen button to ensure exam security.');
                    }
                  }, 2000);
                }
              };
              
              enterFullscreenInitial();
              
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
      if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        const violationTime = Date.now();
        setFullscreenViolationStartTime(violationTime);
        setFullscreenViolationCount(prev => prev + 1);
        
        logEvent("fullscreen_exit_violation", { 
          timestamp: new Date().toISOString(),
          method: 'exit_detected',
          violationCount: fullscreenViolationCount + 1,
          violationTime
        });
        setIsFullscreenBlocked(true);
        
        // Show warning and require manual re-entry for better user awareness
        console.warn('Fullscreen mode exited - exam paused');
      } else {
        // Calculate time spent outside fullscreen if there was a violation
        if (fullscreenViolationStartTime) {
          const timeOutsideFullscreen = Date.now() - fullscreenViolationStartTime;
          logEvent("fullscreen_enter", { 
            timestamp: new Date().toISOString(),
            timeOutsideMs: timeOutsideFullscreen,
            violationCount: fullscreenViolationCount
          });
          setFullscreenViolationStartTime(null);
        } else {
          logEvent("fullscreen_enter", { timestamp: new Date().toISOString() });
        }
        setIsFullscreenBlocked(false);
      }
    };

    // Handle multiple vendor prefixes for better browser compatibility
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("msfullscreenchange", handleFullscreenChange);
    };
  }, [logEvent, fullscreenViolationStartTime, fullscreenViolationCount]);

  // Update violation timer every second when in violation
  useEffect(() => {
    if (fullscreenViolationStartTime && isFullscreenBlocked) {
      const timer = setInterval(() => {
        setViolationTimer(Math.floor((Date.now() - fullscreenViolationStartTime) / 1000));
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setViolationTimer(0);
    }
  }, [fullscreenViolationStartTime, isFullscreenBlocked]);

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
        markedForReview: Array.from(markedForReview),
        timestamp: Date.now()
      };
      localStorage.setItem(`exam_${examId}_state`, JSON.stringify(state));
    }
  }, [answers, current, markedForReview, examId, questions.length]);

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

  const toggleMarkForReview = (questionId) => {
    setMarkedForReview(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const goToQuestion = (index) => {
    setCurrent(index);
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
    <div className={`min-h-screen bg-gray-50 flex flex-col ${isFullscreenBlocked ? 'blur-sm pointer-events-none' : ''}`}>
      {/* Fullscreen blocking overlay */}
      {isFullscreenBlocked && (
        <div className="fixed inset-0 bg-red-900/90 backdrop-blur-md z-50 flex items-center justify-center pointer-events-auto">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-2xl border-4 border-red-500 animate-pulse">
            <div className="animate-bounce mb-4">
              <AlertTriangle className="w-20 h-20 text-red-600 mx-auto" />
            </div>
            <h2 className="text-3xl font-bold text-red-900 mb-2">⚠️ EXAM PAUSED ⚠️</h2>
            
            {fullscreenViolationCount > 0 && (
              <div className="bg-red-100 border border-red-400 rounded-lg p-2 mb-4">
                <p className="text-red-800 font-bold text-sm">
                  Violation #{fullscreenViolationCount} - All attempts are logged
                </p>
              </div>
            )}
            
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-800 font-semibold text-lg">Fullscreen Mode Required</p>
              <p className="text-red-700 text-sm mt-2">
                Exiting fullscreen mode is not allowed during the exam. 
                This violation has been logged and reported to your administrator.
              </p>
            </div>
            
            {fullscreenViolationCount >= 3 && (
              <div className="bg-orange-100 border border-orange-400 rounded-lg p-3 mb-4">
                <p className="text-orange-800 font-bold text-sm">
                  ⚠️ WARNING: Multiple violations detected!
                </p>
                <p className="text-orange-700 text-xs mt-1">
                  Continued violations may result in exam termination.
                </p>
              </div>
            )}
            
            <p className="text-gray-600 mb-6 font-medium">
              You must return to fullscreen mode to continue with your exam.
            </p>
            <button
              onClick={async () => {
                try {
                  logEvent("fullscreen_manual_reentry_attempt", { 
                    timestamp: new Date().toISOString(),
                    violationCount: fullscreenViolationCount
                  });
                  
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                  } else if (document.documentElement.webkitRequestFullscreen) {
                    await document.documentElement.webkitRequestFullscreen();
                  } else if (document.documentElement.msRequestFullscreen) {
                    await document.documentElement.msRequestFullscreen();
                  }
                  
                  logEvent("fullscreen_manual_reentry_success", { 
                    timestamp: new Date().toISOString(),
                    violationCount: fullscreenViolationCount
                  });
                } catch (error) {
                  console.error('Fullscreen request failed:', error);
                  logEvent("fullscreen_manual_reentry_failed", { 
                    timestamp: new Date().toISOString(),
                    error: error.message,
                    violationCount: fullscreenViolationCount
                  });
                  
                  // Show additional help if fullscreen fails
                  alert('Fullscreen request failed. Please try pressing F11 or contact your administrator for help.');
                }
              }}
              className="bg-red-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition transform hover:scale-105 shadow-lg"
            >
              🔒 RETURN TO FULLSCREEN
            </button>
            <div className="mt-4 text-xs text-gray-500">
              <p>Time spent outside fullscreen is being tracked</p>
              <p>Press F11 if the button doesn't work</p>
              {violationTimer > 0 && (
                <p className="text-red-600 font-bold mt-2 text-base animate-pulse">
                  ⏱️ Violation Duration: {violationTimer}s
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleMarkForReview(questions[current]?.id)}
                className={`p-2 rounded-lg transition ${
                  markedForReview.has(questions[current]?.id) ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title="Mark for review"
              >
                <Star size={18} className={markedForReview.has(questions[current]?.id) ? 'fill-current' : ''} />
              </button>
              <p className="font-semibold text-gray-900 text-sm truncate max-w-xs">{exam?.title}</p>
              <p className="text-xs text-gray-400">{answered}/{questions.length} answered</p>
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-sm font-mono font-bold ${isTimeLow ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-700"}`}>
              <Clock size={14} />
              <span>{timeLeft !== null ? formatTime(timeLeft) : "--:--"}</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
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

      {/* Main content with sidebar */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Question navigation sidebar */}
        <div className="w-72 bg-white border-r border-gray-100 p-3 overflow-y-auto">
          {/* Student credentials */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-500 text-xs">Photo</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{user?.name || 'Student Name'}</p>
                <p className="text-xs text-gray-500">{user?.surname || 'Surname'}</p>
                <p className="text-xs text-gray-400">ID: {user?.id || '---'}</p>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mb-3">Questions</h3>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 48 }, (_, i) => {
              const question = questions[i];
              const isAnswered = question && answers[question.id];
              const isMarked = question && markedForReview.has(question.id);
              const isCurrent = i === current;
              
              return (
                <button
                  key={i}
                  onClick={() => goToQuestion(i)}
                  disabled={!question}
                  className={`
                    w-10 h-10 rounded-lg text-sm font-medium transition relative
                    ${isCurrent ? 'ring-2 ring-red-500' : ''}
                    ${!question ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : ''}
                    ${isAnswered ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-700'}
                    ${isMarked ? 'bg-yellow-100 text-yellow-700' : ''}
                    hover:opacity-80
                  `}
                  title={question ? `Question ${i + 1}` : 'Not available'}
                >
                  {i + 1}
                  {isMarked && (
                    <Star size={8} className="absolute top-0.5 right-0.5 fill-current text-yellow-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Camera Preview */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video">
              <video
                ref={cameraVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Question body */}
        <div className="flex-1 px-6 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 max-w-2xl w-full">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">
              Question {current + 1} of {questions.length}
            </p>
            <div
              className="text-gray-800 text-base leading-relaxed mb-6"
              dangerouslySetInnerHTML={{ __html: renderMath(q.question_text) }}
            />

            <div className="grid grid-cols-2 gap-3">
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
        </div>
      </div>
    </div>
  );
}
