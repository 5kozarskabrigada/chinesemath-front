import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../authContext";
import { apiGetMyExams } from "../../api";
import { BookOpen, LogOut, Plus, Trophy } from "lucide-react";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetMyExams().then(setExams).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow">
              <span className="text-white text-lg font-bold">M</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Math Exam Platform</p>
              <p className="text-xs text-gray-500">Welcome, {user?.first_name} {user?.last_name}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center space-x-2 text-gray-500 hover:text-red-600 text-sm transition">
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Join exam CTA */}
        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-6 text-white mb-8 shadow-lg">
          <h2 className="text-xl font-bold mb-1">Take an Exam</h2>
          <p className="text-red-100 text-sm mb-4">Enter the exam code provided by your teacher.</p>
          <button
            onClick={() => navigate("/student/exam/join")}
            className="flex items-center space-x-2 bg-white text-red-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-red-50 transition shadow-sm text-sm"
          >
            <Plus size={18} />
            <span>Enter Exam Code</span>
          </button>
        </div>

        {/* Past exams */}
        <h2 className="font-bold text-gray-900 mb-4">My Exams</h2>
        {loading ? (
          <div className="text-gray-400 text-sm">Loading...</div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <BookOpen size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No exams yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map((e) => (
              <div
                key={e.exam_id}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition cursor-pointer"
                onClick={() => e.status === "submitted" && navigate(`/student/exam/${e.exam_id}/result`)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${e.score >= 60 ? "bg-green-50" : "bg-red-50"}`}>
                    <Trophy size={22} className={e.score >= 60 ? "text-green-500" : "text-red-400"} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{e.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {e.status === "submitted"
                        ? `Submitted at ${new Date(e.submitted_at).toLocaleString("en-US")}`
                        : "In progress"}
                    </p>
                  </div>
                </div>
                {e.status === "submitted" && (
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${e.score >= 60 ? "text-green-600" : "text-red-500"}`}>
                      {e.score}%
                    </p>
                    <p className="text-xs text-gray-400">{e.total_correct}/{e.total_questions} questions</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
