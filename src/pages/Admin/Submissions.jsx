import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { apiGetSubmissions } from "../../api";

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    apiGetSubmissions()
      .then(setSubmissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = submissions.filter(
    (s) =>
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      s.exam_title.toLowerCase().includes(search.toLowerCase()) ||
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Submissions</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search by student or exam..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white"
            />
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No submissions found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3 text-left">Student</th>
                  <th className="px-6 py-3 text-left">Exam</th>
                  <th className="px-6 py-3 text-left">Score</th>
                  <th className="px-6 py-3 text-left">Correct/Total</th>
                  <th className="px-6 py-3 text-left">Time</th>
                  <th className="px-6 py-3 text-left">Submitted At</th>
                  <th className="px-6 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm">
                      <p className="font-medium text-gray-900">{s.first_name} {s.last_name}</p>
                      <p className="text-gray-400 text-xs">@{s.username}</p>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{s.exam_title}</td>
                    <td className="px-6 py-3">
                      <span className={`text-sm font-bold ${s.score >= 60 ? "text-green-600" : "text-red-500"}`}>
                        {s.score}%
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {s.total_correct} / {s.total_questions}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {Math.round(s.time_spent / 60)}m {s.time_spent % 60}s
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {new Date(s.submitted_at).toLocaleString("en-US")}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => navigate(`/admin/submissions/${s.id}`)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        View
                      </button>
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
