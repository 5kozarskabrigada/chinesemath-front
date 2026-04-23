import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { apiGetStats, apiGetSubmissions } from "../../api";
import { Users, FileText, ClipboardList, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiGetStats(), apiGetSubmissions()])
      .then(([s, subs]) => {
        setStats(s);
        setRecentSubmissions(subs.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Total Students", value: stats?.totalStudents ?? "—", icon: Users, color: "blue" },
    { label: "Total Exams", value: stats?.totalExams ?? "—", icon: FileText, color: "green" },
    { label: "Submissions", value: stats?.totalSubmissions ?? "—", icon: ClipboardList, color: "purple" },
    { label: "Average Score", value: stats?.avgScore != null ? `${stats.avgScore}%` : "—", icon: TrendingUp, color: "red" },
  ];

  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {cards.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Recent submissions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Recent Submissions</h2>
              </div>
              {recentSubmissions.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No submissions yet</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Student</th>
                      <th className="px-6 py-3 text-left">Exam</th>
                      <th className="px-6 py-3 text-left">Score</th>
                      <th className="px-6 py-3 text-left">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentSubmissions.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          {s.first_name} {s.last_name}
                          <span className="text-gray-400 font-normal"> @{s.username}</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{s.exam_title}</td>
                        <td className="px-6 py-3">
                          <span className={`text-sm font-semibold ${s.score >= 60 ? "text-green-600" : "text-red-500"}`}>
                            {s.score}%
                          </span>
                          <span className="text-xs text-gray-400 ml-1">({s.total_correct}/{s.total_questions})</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500">
                          {new Date(s.submitted_at).toLocaleString("en-US")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
