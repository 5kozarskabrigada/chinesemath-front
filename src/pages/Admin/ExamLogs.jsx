import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiGetExamLogs, apiGetAdminExams, apiGetUsers } from "../../api";
import {
  AlertTriangle, Eye, EyeOff, Activity, LogIn, LogOut,
  MousePointerClick, Loader2, Filter, FileText, User,
  MessageSquare, UserX, Wifi, WifiOff, Camera, Shield,
  Clock, CheckCircle, XCircle, Monitor, Smartphone
} from "lucide-react";

const EVENT_CONFIG = {
  exam_started:               { label: "Started Exam",                      icon: LogIn,            color: "bg-green-50",  badge: null },
  exam_joined:                { label: "Joined Exam",                       icon: Activity,         color: "bg-blue-50",    badge: null },
  exam_submitted:             { label: "Submitted Exam",                    icon: CheckCircle,      color: "bg-purple-50", badge: null },
  fullscreen_exit:            { label: "Left Fullscreen",                   icon: EyeOff,           color: "bg-red-50",      badge: "⚠️" },
  fullscreen_enter:           { label: "Entered Fullscreen",                icon: Eye,              color: "bg-green-50",  badge: null },
  window_blur:                { label: "Switched Away",                     icon: AlertTriangle,    color: "bg-red-50",      badge: "⚠️" },
  window_focus:               { label: "Returned to Exam",                  icon: MousePointerClick, color: "bg-blue-50",   badge: null },
  tab_hidden:                 { label: "Switched Tab",                      icon: AlertTriangle,    color: "bg-red-50",      badge: "⚠️" },
  tab_visible:                { label: "Returned to Tab",                   icon: Eye,              color: "bg-green-50",  badge: null },
  monitoring_message:         { label: "Admin Message",                    icon: MessageSquare,    color: "bg-purple-50", badge: null },
  monitoring_disqualify:      { label: "Disqualified",                      icon: UserX,            color: "bg-red-50",      badge: "❌" },
  monitoring_camera_check:    { label: "Camera Check",                      icon: Camera,           color: "bg-yellow-50", badge: null },
  monitoring_violation:       { label: "Violation",                         icon: Shield,           color: "bg-red-50",      badge: "⚠️" },
  monitoring_student_joined:  { label: "Connected",                         icon: Wifi,             color: "bg-blue-50",    badge: null },
  monitoring_student_left:    { label: "Disconnected",                      icon: WifiOff,          color: "bg-orange-50", badge: null },
  fullscreen_exit_violation:  { label: "Fullscreen Exit Violation",        icon: EyeOff,           color: "bg-red-50",      badge: "⚠️" },
  esc_key_press_violation:    { label: "ESC Pressed",                       icon: AlertTriangle,    color: "bg-red-50",      badge: "⚠️" },
  multiple_monitors_detected:{ label: "Multiple Monitors",                 icon: Monitor,          color: "bg-red-50",      badge: "⚠️" },
  exam_switch_violation:      { label: "Exam Switch",                       icon: AlertTriangle,    color: "bg-red-50",      badge: "⚠️" },
  context_menu_blocked:       { label: "Right Click Blocked",               icon: AlertTriangle,    color: "bg-red-50",      badge: "⚠️" },
  keyboard_shortcut_blocked: { label: "Shortcut Blocked",                  icon: AlertTriangle,    color: "bg-red-50",      badge: "⚠️" },
  admin_message_received:     { label: "Admin Message Received",           icon: MessageSquare,    color: "bg-purple-50", badge: null },
  camera_check_requested:     { label: "Camera Check Requested",           icon: Camera,           color: "bg-yellow-50", badge: null },
  exam_terminated_by_admin:   { label: "Exam Terminated",                   icon: UserX,            color: "bg-red-50",      badge: "❌" },
};

function studentName(log) {
  if (log.first_name && log.last_name) return `${log.first_name} ${log.last_name}`;
  if (log.username) return log.username;
  return "Unknown student";
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let relative = "";
  if (diffMins < 1) relative = "just now";
  else if (diffMins < 60) relative = `${diffMins}m ago`;
  else if (diffHours < 24) relative = `${diffHours}h ago`;
  else if (diffDays < 7) relative = `${diffDays}d ago`;

  const full = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    + " at " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return { relative, full };
}

export default function ExamLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    examId: "",
    userId: "",
    eventType: "",
    limit: 100,
  });

  const loadLogs = () => {
    setLoading(true);
    const activeFilters = {};
    if (filters.examId) activeFilters.examId = filters.examId;
    if (filters.userId) activeFilters.userId = filters.userId;
    if (filters.eventType) activeFilters.eventType = filters.eventType;
    activeFilters.limit = filters.limit;

    apiGetExamLogs(activeFilters)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    apiGetAdminExams().then(setExams).catch(console.error);
    apiGetUsers().then(setUsers).catch(console.error);
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleApplyFilters = () => {
    loadLogs();
  };

  const handleClearFilters = () => {
    setFilters({ examId: "", userId: "", eventType: "", limit: 100 });
    apiGetExamLogs({ limit: 100 }).then(setLogs).catch(console.error);
  };

  const eventTypeOptions = [
    { value: "", label: "All Events" },
    { group: "Exam Activity", items: [
      { value: "exam_started", label: "Started Exam" },
      { value: "exam_joined", label: "Joined Exam" },
      { value: "exam_submitted", label: "Submitted Exam" },
    ]},
    { group: "Suspicious Activity", items: [
      { value: "fullscreen_exit", label: "Left Fullscreen" },
      { value: "window_blur", label: "Switched Away" },
      { value: "tab_hidden", label: "Switched Tab" },
    ]},
    { group: "Returned to Exam", items: [
      { value: "fullscreen_enter", label: "Entered Fullscreen" },
      { value: "window_focus", label: "Returned to Window" },
      { value: "tab_visible", label: "Returned to Tab" },
    ]},
    { group: "Monitoring", items: [
      { value: "monitoring_message", label: "Admin Message" },
      { value: "monitoring_disqualify", label: "Disqualification" },
      { value: "monitoring_violation", label: "Violation" },
      { value: "monitoring_student_joined", label: "Student Connected" },
      { value: "monitoring_student_left", label: "Student Disconnected" },
    ]},
  ];

  const suspiciousCount = logs.filter(l =>
    ["fullscreen_exit", "window_blur", "tab_hidden", "monitoring_violation", "monitoring_disqualify"].includes(l.event_type)
  ).length;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-red-600" />
              Activity Logs
            </h1>
            <p className="text-sm text-gray-500 mt-1">Complete record of all student activity during exams</p>
          </div>
          <div className="flex items-center gap-4">
            {suspiciousCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                {suspiciousCount} suspicious {suspiciousCount === 1 ? 'event' : 'events'}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              {logs.length} total events
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Exam</label>
              <select
                value={filters.examId}
                onChange={(e) => handleFilterChange("examId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="">All Exams</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>{exam.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Student</label>
              <select
                value={filters.userId}
                onChange={(e) => handleFilterChange("userId", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="">All Students</option>
                {users
                  .filter((u) => u.role === "student")
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.username})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Event Type</label>
              <select
                value={filters.eventType}
                onChange={(e) => handleFilterChange("eventType", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                {eventTypeOptions.map((item, i) =>
                  item.group ? (
                    <optgroup key={item.group} label={item.group}>
                      {item.items.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                  ) : (
                    <option key={i} value={item.value}>{item.label}</option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Show</label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange("limit", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="50">Last 50 events</option>
                <option value="100">Last 100 events</option>
                <option value="200">Last 200 events</option>
                <option value="500">Last 500 events</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
            >
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Logs List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Activity className="mx-auto w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Activity Found</h3>
            <p className="text-gray-500 text-sm">Activity will appear here when students start taking exams.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Exam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const config = EVENT_CONFIG[log.event_type] || {
                    label: log.event_type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
                    icon: Activity,
                    color: "bg-gray-50",
                    badge: null
                  };
                  const IconComponent = config.icon;
                  const time = formatTime(log.created_at);

                  return (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-900">{config.label}</span>
                          {config.badge && (
                            <span className="text-xs">{config.badge}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.first_name} {log.last_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.exam_title || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500" title={time.full}>
                        {time.relative}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
