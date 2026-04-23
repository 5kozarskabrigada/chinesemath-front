import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { apiGetAdminExams, apiDeleteExam, apiUpdateExam } from "../../api";
import { Plus, Pencil, Trash2, Copy, Eye, EyeOff } from "lucide-react";

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    apiGetAdminExams()
      .then(setExams)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleToggleStatus = async (exam) => {
    const newStatus = exam.status === "published" ? "draft" : "published";
    try {
      await apiUpdateExam(exam.id, { status: newStatus });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (examId) => {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;
    try {
      await apiDeleteExam(examId);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
  };

  const statusBadge = (status) => {
    const map = {
      draft: "bg-gray-100 text-gray-600",
      published: "bg-green-100 text-green-700",
      archived: "bg-yellow-100 text-yellow-700",
    };
    const labels = { draft: "Draft", published: "Published", archived: "Archived" };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
          <button
            onClick={() => navigate("/admin/exams/new")}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-red-700 transition shadow-sm"
          >
            <Plus size={18} />
            <span>New Exam</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {loading ? (
            <div className="p-6 text-center text-gray-400">Loading...</div>
          ) : exams.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm">No exams yet. Click "New Exam" to create one.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3 text-left">Title</th>
                  <th className="px-6 py-3 text-left">Access Code</th>
                  <th className="px-6 py-3 text-left">Questions</th>
                  <th className="px-6 py-3 text-left">Duration</th>
                  <th className="px-6 py-3 text-left">Submissions</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {exams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 text-sm">{exam.title}</p>
                      {exam.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{exam.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <code className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">
                          {exam.access_code}
                        </code>
                        <button onClick={() => copyCode(exam.access_code)} className="text-gray-400 hover:text-gray-700">
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{exam.total_questions}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{exam.duration_minutes} min</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{exam.submission_count}</td>
                    <td className="px-6 py-4">{statusBadge(exam.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleStatus(exam)}
                          title={exam.status === "published" ? "Unpublish" : "Publish"}
                          className="text-gray-400 hover:text-green-600 transition p-1"
                        >
                          {exam.status === "published" ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => navigate(`/admin/exams/${exam.id}/edit`)}
                          className="text-gray-400 hover:text-blue-600 transition p-1"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          className="text-gray-400 hover:text-red-600 transition p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
