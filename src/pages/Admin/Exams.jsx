import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { apiGetAdminExams, apiDeleteExam, apiUpdateExam } from "../../api";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Loader2, 
  FileText, 
  Clock, 
  Users as UsersIcon,
  Monitor,
  Camera,
  Activity,
  AlertCircle
} from "lucide-react";

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monitoringStats, setMonitoringStats] = useState({
    activeExams: 0,
    monitoredStudents: 0,
    totalCameras: 0
  });
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    apiGetAdminExams()
      .then(exams => {
        const filteredExams = exams.filter(e => !e.is_deleted);
        setExams(filteredExams);
        
        // Calculate monitoring stats
        const activeExams = filteredExams.filter(e => e.status === 'published' && e.is_active);
        setMonitoringStats({
          activeExams: activeExams.length,
          monitoredStudents: activeExams.reduce((sum, e) => sum + (e.active_students || 0), 0),
          totalCameras: activeExams.reduce((sum, e) => sum + (e.active_students || 0) * 2, 0) // 2 cameras per student
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggleStatus = async (exam, e) => {
    e.stopPropagation();
    const newStatus = exam.status === "published" ? "draft" : "published";
    try {
      await apiUpdateExam(exam.id, { status: newStatus });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (examId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this exam?")) return;
    try {
      await apiDeleteExam(examId);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const copyCode = (code, e) => {
    e.stopPropagation();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).catch(err => console.error('Clipboard error:', err));
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Fallback copy error:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const statusBadge = (status) => {
    const map = {
      draft: "bg-gray-100 text-gray-600",
      published: "bg-green-100 text-green-700",
      archived: "bg-yellow-100 text-yellow-700",
    };
    const labels = { draft: "Draft", published: "Published", archived: "Archived" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/admin/monitoring")}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition shadow-sm"
            >
              <Monitor size={18} />
              <span>Live Monitoring</span>
            </button>
            <button
              onClick={() => navigate("/admin/exams/new")}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-red-700 transition shadow-sm"
            >
              <Plus size={18} />
              <span>New Exam</span>
            </button>
          </div>
        </div>

        {/* Monitoring Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Exams</p>
                <p className="text-2xl font-bold text-blue-600">{monitoringStats.activeExams}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Monitored Students</p>
                <p className="text-2xl font-bold text-green-600">{monitoringStats.monitoredStudents}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Cameras</p>
                <p className="text-2xl font-bold text-purple-600">{monitoringStats.totalCameras}</p>
              </div>
              <Camera className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="mx-auto w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No exams yet</p>
            <button
              onClick={() => navigate("/admin/exams/new")}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Create your first exam
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-red-200 transition"
              >
                {/* Header with title and actions */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-2">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                      {exam.title}
                    </h3>
                    {exam.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {exam.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => handleToggleStatus(exam, e)}
                      title={exam.status === "published" ? "Unpublish" : "Publish"}
                      className="p-1.5 hover:bg-green-100 rounded transition"
                    >
                      {exam.status === "published" ? 
                        <EyeOff className="w-4 h-4 text-green-600" /> : 
                        <Eye className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/exams/${exam.id}/edit`);
                      }}
                      className="p-1.5 hover:bg-blue-100 rounded transition"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(exam.id, e)}
                      className="p-1.5 hover:bg-red-100 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Access Code */}
                <div className="mb-3">
                  <div className="flex items-center space-x-2">
                    <code className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-sm font-mono font-medium">
                      {exam.access_code}
                    </code>
                    <button 
                      onClick={(e) => copyCode(exam.access_code, e)} 
                      className="p-1 hover:bg-gray-100 rounded transition"
                      title="Copy code"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-1 text-gray-500 mb-1">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="text-xs">Questions</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{exam.total_questions}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-1 text-gray-500 mb-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs">Duration</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{exam.duration_minutes}m</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-1 text-gray-500 mb-1">
                      <UsersIcon className="w-3.5 h-3.5" />
                      <span className="text-xs">Active</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{exam.active_students || 0}</span>
                  </div>
                </div>

                {/* Monitoring Status */}
                {exam.status === 'published' && exam.is_active && (
                  <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-700 font-medium">Live Monitoring</span>
                        </div>
                        <span className="text-gray-600">
                          {(exam.active_students || 0) * 2} cameras active
                        </span>
                      </div>
                      <Camera className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                )}

                {/* Footer with status and actions */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      {statusBadge(exam.status)}
                    </div>
                    
                    <div className="flex gap-2">
                      {exam.status === 'published' && exam.is_active && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/exams/${exam.id}/monitor`);
                          }}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition flex items-center gap-1"
                          title="Live Monitoring"
                        >
                          <Monitor className="w-3 h-3" />
                          Monitor
                        </button>
                      )}
                      
                      {exam.status === 'published' && !exam.is_active && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/submissions?examId=${exam.id}`);
                          }}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition flex items-center gap-1"
                          title="View Results"
                        >
                          <Activity className="w-3 h-3" />
                          Results
                        </button>
                      )}

                      {exam.status === 'draft' && (
                        <div className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Draft
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
