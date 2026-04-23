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

  const { submission: sub, answers } = data;
  const passed = sub.score >= 60;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-6">
        {/* Score card */}
        <div className={`rounded-2xl p-8 text-center text-white mb-8 shadow-lg ${passed ? "bg-gradient-to-br from-green-500 to-green-600" : "bg-gradient-to-br from-red-500 to-red-600"}`}>
          <p className="text-lg font-medium opacity-90 mb-1">{sub.exam_title}</p>
          <p className="text-7xl font-bold mb-2">{sub.score}%</p>
          <p className="text-xl font-semibold opacity-90">
            {passed ? "Passed" : "Keep Practicing"}
          </p>
          <p className="text-sm opacity-75 mt-2">
            {sub.total_correct} / {sub.total_questions} correct ·
            Time spent: {Math.round(sub.time_spent / 60)}m {sub.time_spent % 60}s
          </p>
        </div>

        {/* Answers review */}
        <h2 className="font-bold text-gray-900 mb-4">Answer Review</h2>
        <div className="space-y-4 mb-8">
          {answers.map((a) => (
            <div
              key={a.question_id}
              className={`bg-white rounded-2xl border p-5 ${a.is_correct ? "border-green-100" : "border-red-100"}`}
            >
              <div className="flex items-start space-x-3 mb-3">
                {a.is_correct ? (
                  <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">Question {a.question_number}</p>
                  <div
                    className="text-sm text-gray-800 font-medium"
                    dangerouslySetInnerHTML={{ __html: renderMath(a.question_text) }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 ml-8">
                {(typeof a.options === "string" ? JSON.parse(a.options) : a.options).map((opt) => {
                  const isUser = a.user_answer === opt.label;
                  const isCorrect = a.correct_answer === opt.label;
                  let cls = "border border-gray-100 bg-gray-50 text-gray-600";
                  if (isCorrect) cls = "border border-green-300 bg-green-50 text-green-800 font-semibold";
                  else if (isUser && !isCorrect) cls = "border border-red-300 bg-red-50 text-red-700";
                  return (
                    <div key={opt.label} className={`px-3 py-2 rounded-xl text-sm ${cls}`}>
                      <span className="font-semibold">{opt.label}.</span>{" "}
                      <span dangerouslySetInnerHTML={{ __html: renderMath(opt.text) }} />
                    </div>
                  );
                })}
              </div>

              {!a.is_correct && (
                <p className="ml-8 mt-2 text-xs text-gray-500">
                  Your answer: <strong>{a.user_answer || "No answer"}</strong> ·
                  Correct answer: <strong className="text-green-700">{a.correct_answer}</strong>
                </p>
              )}
              {a.explanation && (
                <p className="ml-8 mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                  Explanation: {a.explanation}
                </p>
              )}
            </div>
          ))}
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
