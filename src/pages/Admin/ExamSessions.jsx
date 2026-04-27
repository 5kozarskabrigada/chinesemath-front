import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { apiGetAdminExams, apiGetExamSessions, apiGetStudentSessionDetail } from "../../api";
import {
  AlertTriangle, Eye, EyeOff, Activity, LogIn,
  MousePointerClick, Loader2, FileText, User,
  MessageSquare, UserX, Wifi, WifiOff, Camera, Shield,
  Clock, CheckCircle, ChevronLeft, Monitor, Smartphone,
  Image, ArrowLeft, Video
} from "lucide-react";

const EVENT_LABELS = {
  exam_started:               { label: "Started Exam",                icon: LogIn,             color: "text-green-600", bg: "bg-green-100",  suspicious: false },
  exam_joined:                { label: "Joined Exam",                 icon: Activity,          color: "text-blue-600",  bg: "bg-blue-100",   suspicious: false },
  exam_submitted:             { label: "Submitted Exam",              icon: CheckCircle,       color: "text-purple-600",bg: "bg-purple-100", suspicious: false },
  fullscreen_exit:            { label: "Left Fullscreen",             icon: EyeOff,            color: "text-red-600",   bg: "bg-red-100",    suspicious: true },
  fullscreen_enter:           { label: "Entered Fullscreen",          icon: Eye,               color: "text-green-600", bg: "bg-green-100",  suspicious: false },
  window_blur:                { label: "Switched Away from Exam",     icon: AlertTriangle,     color: "text-red-600",   bg: "bg-red-100",    suspicious: true },
  window_focus:               { label: "Returned to Exam Window",     icon: MousePointerClick, color: "text-blue-600",  bg: "bg-blue-100",   suspicious: false },
  tab_hidden:                 { label: "Switched to Another Tab",     icon: AlertTriangle,     color: "text-red-600",   bg: "bg-red-100",    suspicious: true },
  tab_visible:                { label: "Returned to Exam Tab",        icon: Eye,               color: "text-green-600", bg: "bg-green-100",  suspicious: false },
  monitoring_message:         { label: "Admin Sent Message",          icon: MessageSquare,     color: "text-purple-600",bg: "bg-purple-100", suspicious: false },
  monitoring_disqualify:      { label: "Student Disqualified",        icon: UserX,             color: "text-red-600",   bg: "bg-red-100",    suspicious: true },
  monitoring_camera_check:    { label: "Camera Check Requested",      icon: Camera,            color: "text-yellow-600",bg: "bg-yellow-100", suspicious: false },
  monitoring_violation:       { label: "Violation Detected",          icon: Shield,            color: "text-red-600",   bg: "bg-red-100",    suspicious: true },
  monitoring_student_joined:  { label: "Connected to Monitoring",     icon: Wifi,              color: "text-blue-600",  bg: "bg-blue-100",   suspicious: false },
  monitoring_student_left:    { label: "Disconnected from Monitoring",icon: WifiOff,           color: "text-orange-600",bg: "bg-orange-100", suspicious: false },
  camera_snapshot:            { label: "Camera Snapshot Saved",       icon: Camera,            color: "text-gray-500",  bg: "bg-gray-100",   suspicious: false },
};

function getEventDescription(ev) {
  const d = ev.event_data || {};
  switch (ev.event_type) {
    case "exam_started": return "Student began taking the exam";
    case "exam_joined": return "Student joined the exam session";
    case "exam_submitted": return "Student finished and submitted answers";
    case "fullscreen_exit": return "Exited fullscreen — may be trying to access other apps";
    case "fullscreen_enter": return "Returned to fullscreen mode";
    case "window_blur": return "Clicked outside the exam window — possible tab switch";
    case "window_focus": return "Returned focus to the exam window";
    case "tab_hidden": return "Switched to a different browser tab — may be looking up answers";
    case "tab_visible": return "Came back to the exam tab";
    case "monitoring_message": return `Admin message: "${d.message || ''}"`;
    case "monitoring_disqualify": return "Disqualified from the exam by administrator";
    case "monitoring_camera_check": return "Admin requested a camera check";
    case "monitoring_violation": return `Violation: ${d.type || 'unknown'} (severity: ${d.severity || 'unknown'})`;
    case "monitoring_student_joined": return "Connected to the live monitoring system";
    case "monitoring_student_left": return "Disconnected from the live monitoring system";
    case "camera_snapshot": return `${d.cameraType === 'phone' ? 'Phone' : 'Laptop'} camera snapshot recorded`;
    default: return ev.event_type;
  }
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    + " at " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Exam Selector ──────────────────────────────────────────────────────────

function ExamSelector({ onSelect }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetAdminExams()
      .then(data => setExams((data.exams || data || []).filter(e => !e.is_deleted)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="text-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading exams...</p>
    </div>
  );

  if (exams.length === 0) return (
    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
      <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Exams Yet</h3>
      <p className="text-gray-600">Exam session data will appear here after students take exams.</p>
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {exams.map(ex => (
        <div
          key={ex.id}
          onClick={() => onSelect(ex.id)}
          className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition border-2 border-transparent hover:border-red-500"
        >
          <h3 className="font-semibold text-gray-900 text-lg mb-2">{ex.title}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${ex.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {ex.status || 'draft'}
            </span>
            <span className="text-gray-400">Code: {ex.access_code || 'N/A'}</span>
          </div>
          <p className="text-xs text-gray-400">{ex.total_questions} questions · {ex.duration_minutes} min</p>
          <button className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition flex items-center justify-center gap-2">
            <Video className="w-4 h-4" />
            View Sessions
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Session List ───────────────────────────────────────────────────────────

function SessionList({ examId, onSelect, onBack }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetExamSessions(examId)
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) return (
    <div className="text-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
    </div>
  );

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 mb-4 transition">
        <ArrowLeft className="w-4 h-4" /> Back to exams
      </button>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Student Sessions</h3>
          <p className="text-gray-600">No students have taken this exam yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const statusConfig = {
              disqualified: { label: "Disqualified", cls: "bg-red-600 text-white" },
              submitted:    { label: "Submitted",    cls: "bg-green-100 text-green-700" },
              in_progress:  { label: "In Progress",  cls: "bg-yellow-100 text-yellow-700" },
              joined:       { label: "Joined Only",  cls: "bg-blue-100 text-blue-700" },
            };
            const st = statusConfig[s.session_status] || statusConfig.joined;

            return (
              <div
                key={s.user_id}
                onClick={() => onSelect(s.user_id)}
                className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-lg hover:border-red-300 transition"
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      s.session_status === 'disqualified' ? 'bg-red-100' : 'bg-red-100'
                    }`}>
                      {s.session_status === 'disqualified' 
                        ? <UserX className="w-5 h-5 text-red-600" />
                        : <User className="w-5 h-5 text-red-600" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{s.first_name} {s.last_name}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="text-sm text-gray-500">{s.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 text-sm flex-wrap">
                    {parseInt(s.suspicious_count) > 0 && (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <AlertTriangle className="w-4 h-4" />
                        {s.suspicious_count} suspicious
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-gray-500">
                      <Camera className="w-4 h-4" />
                      {s.snapshot_count}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <MessageSquare className="w-4 h-4" />
                      {s.message_count}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Activity className="w-4 h-4" />
                      {s.total_events} events
                    </span>
                    {s.submission_status === 'submitted' ? (
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">{s.score != null ? `${s.score}%` : '—'}</div>
                        <div className="text-xs text-gray-400">
                          {s.total_correct}/{s.total_questions} correct
                        </div>
                      </div>
                    ) : (
                      <div className="text-right text-gray-400 text-xs">
                        No submission
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Session Detail ─────────────────────────────────────────────────────────

function SessionDetail({ examId, studentId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timeline");
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  useEffect(() => {
    apiGetStudentSessionDetail(examId, studentId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [examId, studentId]);

  if (loading) return (
    <div className="text-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-4" />
    </div>
  );

  if (!data) return (
    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
      <p className="text-gray-600">Session data not found.</p>
    </div>
  );

  const { submission, timeline, snapshots } = data;
  const suspiciousEvents = timeline.filter(e => EVENT_LABELS[e.event_type]?.suspicious);
  const messages = timeline.filter(e => e.event_type === 'monitoring_message');
  const laptopSnaps = snapshots.filter(s => s.event_data?.cameraType === 'laptop');
  const phoneSnaps = snapshots.filter(s => s.event_data?.cameraType === 'phone');

  const tabs = [
    { key: "timeline", label: "Activity Timeline", count: timeline.length },
    { key: "snapshots", label: "Camera Recordings", count: snapshots.length },
    { key: "messages", label: "Admin Messages", count: messages.length },
  ];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 mb-4 transition">
        <ArrowLeft className="w-4 h-4" /> Back to student list
      </button>

      {/* Student Info Card */}
      {submission && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{submission.first_name} {submission.last_name}</h2>
                <p className="text-sm text-gray-500">{submission.username} · {submission.exam_title}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{submission.score != null ? `${submission.score}%` : '—'}</div>
                <div className="text-xs text-gray-500">Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{submission.total_correct}/{submission.total_questions}</div>
                <div className="text-xs text-gray-500">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{formatDuration(submission.time_spent)}</div>
                <div className="text-xs text-gray-500">Time Spent</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${suspiciousEvents.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {suspiciousEvents.length}
                </div>
                <div className="text-xs text-gray-500">Suspicious</div>
              </div>
              <div className="text-center">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  submission.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {submission.status === 'submitted' ? 'Submitted' : 'In Progress'}
                </div>
              </div>
            </div>
          </div>
          {submission.submitted_at && (
            <p className="text-xs text-gray-400 mt-3">Submitted: {formatDate(submission.submitted_at)}</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 text-xs rounded ${
              activeTab === tab.key ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <div className="space-y-1">
          {timeline.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No activity recorded for this session.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
              {timeline.map((ev, i) => {
                const cfg = EVENT_LABELS[ev.event_type] || { label: ev.event_type, icon: Activity, color: "text-gray-500", bg: "bg-gray-100", suspicious: false };
                const Icon = cfg.icon;
                return (
                  <div key={ev.id || i} className="relative flex items-start gap-4 py-2">
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{cfg.label}</span>
                        {cfg.suspicious && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700">Suspicious</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{formatTime(ev.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{getEventDescription(ev)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Snapshots Tab */}
      {activeTab === "snapshots" && (
        <div>
          {snapshots.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">No Camera Recordings</h3>
              <p className="text-gray-500 text-sm">Camera snapshots are recorded every 60 seconds during exams. No recordings were captured for this session.</p>
            </div>
          ) : (
            <>
              {/* Laptop Camera */}
              {laptopSnaps.length > 0 && (
                <div className="mb-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Monitor className="w-4 h-4" /> Laptop Camera ({laptopSnaps.length} snapshots)
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                    {laptopSnaps.map((snap, i) => (
                      <div
                        key={snap.id || i}
                        onClick={() => setSelectedSnapshot(snap)}
                        className="cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-red-400 hover:shadow-md transition aspect-video bg-gray-100 relative group"
                      >
                        {snap.event_data?.image ? (
                          <img src={snap.event_data.image} alt={`Laptop ${i+1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full"><Camera className="w-6 h-6 text-gray-300" /></div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition">
                          {formatTime(snap.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phone Camera */}
              {phoneSnaps.length > 0 && (
                <div className="mb-6">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Smartphone className="w-4 h-4" /> Phone Camera ({phoneSnaps.length} snapshots)
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                    {phoneSnaps.map((snap, i) => (
                      <div
                        key={snap.id || i}
                        onClick={() => setSelectedSnapshot(snap)}
                        className="cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-red-400 hover:shadow-md transition aspect-video bg-gray-100 relative group"
                      >
                        {snap.event_data?.image ? (
                          <img src={snap.event_data.image} alt={`Phone ${i+1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full"><Camera className="w-6 h-6 text-gray-300" /></div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition">
                          {formatTime(snap.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Snapshot Modal */}
              {selectedSnapshot && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSnapshot(null)}>
                  <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
                    {selectedSnapshot.event_data?.image && (
                      <img src={selectedSnapshot.event_data.image} alt="Snapshot" className="w-full rounded-lg" />
                    )}
                    <div className="text-center text-white mt-3 text-sm">
                      {selectedSnapshot.event_data?.cameraType === 'phone' ? 'Phone' : 'Laptop'} Camera · {formatDate(selectedSnapshot.created_at)}
                    </div>
                    <button onClick={() => setSelectedSnapshot(null)} className="mt-3 mx-auto block px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition">
                      Close
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === "messages" && (
        <div>
          {messages.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">No Messages</h3>
              <p className="text-gray-500 text-sm">No admin messages were sent to this student during the exam.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => {
                const d = msg.event_data || {};
                return (
                  <div key={msg.id || i} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-purple-600 uppercase">{d.messageType || 'message'}</span>
                          <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-900">{d.message || '—'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ExamSessions() {
  const { examId: paramExamId, studentId: paramStudentId } = useParams();
  const navigate = useNavigate();
  const [examId, setExamId] = useState(paramExamId || null);
  const [studentId, setStudentId] = useState(paramStudentId || null);

  useEffect(() => {
    setExamId(paramExamId || null);
    setStudentId(paramStudentId || null);
  }, [paramExamId, paramStudentId]);

  let content;
  if (studentId && examId) {
    content = (
      <SessionDetail
        examId={examId}
        studentId={studentId}
        onBack={() => navigate(`/admin/exam-sessions/${examId}`)}
      />
    );
  } else if (examId) {
    content = (
      <SessionList
        examId={examId}
        onSelect={(sid) => navigate(`/admin/exam-sessions/${examId}/${sid}`)}
        onBack={() => navigate("/admin/exam-sessions")}
      />
    );
  } else {
    content = (
      <ExamSelector onSelect={(eid) => navigate(`/admin/exam-sessions/${eid}`)} />
    );
  }

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="w-6 h-6 text-red-600" />
            Exam Sessions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review student exam sessions — camera recordings, activity timeline, and admin messages
          </p>
        </div>
        {content}
      </div>
    </AdminLayout>
  );
}
