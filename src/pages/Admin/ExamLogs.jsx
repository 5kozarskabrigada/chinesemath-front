import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiGetExamLogs, apiGetAdminExams, apiGetUsers } from "../../api";
import { AlertTriangle, Eye, EyeOff, Activity, LogIn, LogOut, MousePointerClick, Loader2, Filter, FileText, User } from "lucide-react";

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
    // Load exams and users for filters
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

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case "exam_started":
        return <LogIn className="w-4 h-4 text-green-600" />;
      case "exam_joined":
        return <Activity className="w-4 h-4 text-blue-600" />;
      case "exam_submitted":
        return <LogOut className="w-4 h-4 text-purple-600" />;
      case "fullscreen_exit":
        return <EyeOff className="w-4 h-4 text-red-600" />;
      case "fullscreen_enter":
        return <Eye className="w-4 h-4 text-green-600" />;
      case "window_blur":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "window_focus":
        return <MousePointerClick className="w-4 h-4 text-blue-600" />;
      case "tab_hidden":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "tab_visible":
        return <Eye className="w-4 h-4 text-green-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEventColor = (eventType) => {
    if (eventType.includes("violation") || eventType === "fullscreen_exit" || eventType === "window_blur" || eventType === "tab_hidden") {
      return "bg-red-50 border-red-200";
    }
    if (eventType === "exam_started" || eventType === "exam_joined") {
      return "bg-blue-50 border-blue-200";
    }
    if (eventType === "exam_submitted") {
      return "bg-purple-50 border-purple-200";
    }
    return "bg-gray-50 border-gray-200";
  };

  const getEventLabel = (eventType) => {
    return eventType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const eventTypes = [
    { value: "", label: "All Events" },
    { value: "exam_started", label: "Exam Started" },
    { value: "exam_joined", label: "Exam Joined" },
    { value: "exam_submitted", label: "Exam Submitted" },
    { value: "fullscreen_exit", label: "Fullscreen Exit" },
    { value: "fullscreen_enter", label: "Fullscreen Enter" },
    { value: "window_blur", label: "Window Blur" },
    { value: "window_focus", label: "Window Focus" },
    { value: "tab_hidden", label: "Tab Hidden" },
    { value: "tab_visible", label: "Tab Visible" },
  ];

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Exam Logs</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Activity className="w-4 h-4" />
            <span>{logs.length} events</span>
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
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
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
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Limit</label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange("limit", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
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
            <p className="text-gray-600">No logs found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`border rounded-lg p-4 transition hover:shadow-md ${getEventColor(log.event_type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-0.5">{getEventIcon(log.event_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-gray-900">{getEventLabel(log.event_type)}</span>
                        {log.event_type.includes("exit") || log.event_type.includes("blur") || log.event_type.includes("hidden") ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">VIOLATION</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                        {log.username && (
                          <div className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5" />
                            <span>
                              {log.first_name} {log.last_name} ({log.username})
                            </span>
                          </div>
                        )}
                        {log.exam_title && (
                          <div className="flex items-center space-x-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{log.exam_title}</span>
                          </div>
                        )}
                        <span className="text-gray-400">{formatTimestamp(log.created_at)}</span>
                      </div>
                      {log.event_data && Object.keys(log.event_data).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 bg-white/50 rounded p-2">
                          {JSON.stringify(log.event_data)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
