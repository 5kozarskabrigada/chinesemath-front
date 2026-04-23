import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { apiGetSubmissionDetail } from "../../api";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { renderMath } from "../../utils/math";

export default function AdminSubmissionDetail() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetSubmissionDetail(submissionId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) {
    return <AdminLayout><div className="p-8 text-gray-400">Loading...</div></AdminLayout>;
  }
  if (!data) {
    return <AdminLayout><div className="p-8 text-gray-400">Submission not found</div></AdminLayout>;
  }

  const { submission: sub, answers } = data;

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl">
        <button
          onClick={() => navigate("/admin/submissions")}
          className="flex items-center space-x-2 text-gray-500 hover:text-gray-800 mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to Submissions</span>
        </button>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{sub.exam_title}</h1>
              <p className="text-gray-500 text-sm mt-1">
                {sub.first_name} {sub.last_name} (@{sub.username})
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Submitted at: {new Date(sub.submitted_at).toLocaleString("en-US")}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-4xl font-bold ${sub.score >= 60 ? "text-green-600" : "text-red-500"}`}>
                {sub.score}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {sub.total_correct} / {sub.total_questions} correct
              </p>
            </div>
          </div>
        </div>

        {/* Answers */}
        <div className="space-y-4">
          {answers.map((a) => (
            <div
              key={a.question_id}
              className={`bg-white rounded-2xl shadow-sm border p-5 ${
                a.is_correct ? "border-green-100" : "border-red-100"
              }`}
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
                  const isUserAnswer = a.user_answer === opt.label;
                  const isCorrect = a.correct_answer === opt.label;
                  let cls = "border border-gray-100 bg-gray-50 text-gray-600";
                  if (isCorrect) cls = "border border-green-300 bg-green-50 text-green-800";
                  else if (isUserAnswer && !isCorrect) cls = "border border-red-300 bg-red-50 text-red-700";
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
                  Student answer: <strong>{a.user_answer || "No answer"}</strong> ·
                  Correct answer: <strong className="text-green-700">{a.correct_answer}</strong>
                </p>
              )}
              {a.explanation && (
                <p className="ml-8 mt-2 text-xs text-gray-500">
                  Explanation: {a.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
