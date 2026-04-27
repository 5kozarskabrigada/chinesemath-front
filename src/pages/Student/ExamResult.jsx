import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGetMyResult } from "../../api";
import { renderMath } from "../../utils/math";
import { CheckCircle, XCircle, Home, Loader2 } from "lucide-react";

export default function ExamResult() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGetMyResult(examId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{error || "Result not found"}</p>
      </div>
    );
  }

  const { submission: sub } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-6">
        {/* Submission confirmation card */}
        <div className="rounded-2xl p-8 text-center text-white mb-8 shadow-lg bg-gradient-to-br from-green-500 to-green-600">
          <p className="text-lg font-medium opacity-90 mb-1">{sub.exam_title}</p>
          <p className="text-5xl font-bold mb-2">✓ Submitted</p>
          <p className="text-xl font-semibold opacity-90">
            Your exam has been submitted successfully
          </p>
          <p className="text-sm opacity-75 mt-2">
            Submitted at {new Date(sub.submitted_at).toLocaleString("en-US")} ·
            Time spent: {Math.round(sub.time_spent / 60)}m {sub.time_spent % 60}s
          </p>
        </div>

        {/* Info message */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 text-center">
          <p className="text-gray-600 text-sm">
            Your results will be available after your teacher grades the exam. 
            Please check back later or contact your teacher for more information.
          </p>
        </div>

        <button
          onClick={() => navigate("/student/dashboard")}
          className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white py-3.5 rounded-xl font-semibold hover:bg-red-700 transition shadow-sm"
        >
          <Home size={18} />
          <span>Back to Dashboard</span>
        </button>
      </div>
    </div>
  );
}
