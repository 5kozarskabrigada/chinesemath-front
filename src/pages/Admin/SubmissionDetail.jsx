import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { apiGetSubmissionDetail } from "../../api";
import {
  ArrowLeft, CheckCircle, XCircle, Download, Loader2,
  User, Clock, FileText, Award, X
} from "lucide-react";
import { renderMath } from "../../utils/math";
import html2pdf from "html2pdf.js";

function parseOptions(raw) {
  if (!raw) return [];
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  }) + " at " + new Date(d).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function AdminSubmissionDetail() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const pdfContentRef = useRef(null);

  useEffect(() => {
    apiGetSubmissionDetail(submissionId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [submissionId]);

  const handleDownloadPdf = () => {
    setShowPdfPreview(true);
  };

  const handleConfirmPdf = async () => {
    if (!pdfContentRef.current) return;
    setDownloadingPdf(true);

    try {
      const { submission: sub } = data;
      const studentName = `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || sub.username || "Unknown";
      const examTitle = sub.exam_title || "Exam";
      const filename = `${studentName.replace(/\s+/g, "_")}_${examTitle.replace(/\s+/g, "_")}_Results.pdf`;

      const opt = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(pdfContentRef.current).save();
      setShowPdfPreview(false);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      </AdminLayout>
    );
  }
  if (!data) {
    return <AdminLayout><div className="p-8 text-gray-400">Submission not found</div></AdminLayout>;
  }

  const { submission: sub, answers } = data;
  const correctCount = answers.filter(a => a.is_correct).length;
  const wrongCount = answers.filter(a => !a.is_correct).length;

  return (
    <AdminLayout>
      <div className="p-8 max-w-5xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/admin/submissions")}
            className="flex items-center gap-2 text-gray-500 hover:text-red-600 text-sm transition"
          >
            <ArrowLeft size={16} />
            <span>Back to Submissions</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition shadow-sm"
          >
            {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {downloadingPdf ? "Generating..." : "Download PDF"}
          </button>
        </div>

        {/* Header Card */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold">{sub.exam_title}</h1>
              <div className="flex items-center gap-3 mt-2 text-gray-300 text-sm">
                <span className="flex items-center gap-1"><User size={14} /> {sub.first_name} {sub.last_name}</span>
                <span className="text-gray-500">@{sub.username}</span>
              </div>
              {sub.submitted_at && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <Clock size={12} /> {formatDate(sub.submitted_at)}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className={`text-5xl font-bold ${sub.score >= 60 ? "text-green-400" : "text-red-400"}`}>
                {sub.score}%
              </div>
              <p className="text-sm text-gray-400 mt-1">{sub.total_correct} / {sub.total_questions} correct</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Score</p>
            <p className={`text-2xl font-bold ${sub.score >= 60 ? "text-green-600" : "text-red-600"}`}>{sub.score}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Correct Answers</p>
            <p className="text-2xl font-bold text-green-600">{correctCount}</p>
            <p className="text-xs text-gray-400">out of {sub.total_questions}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Wrong Answers</p>
            <p className="text-2xl font-bold text-red-600">{wrongCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Time Spent</p>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(sub.time_spent)}</p>
          </div>
        </div>

        {/* Question Breakdown */}
        <div className="mb-4 flex items-center gap-2">
          <FileText size={18} className="text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">Question Breakdown</h2>
          <span className="text-xs text-gray-400 ml-2">{answers.length} questions</span>
        </div>

        <div className="space-y-3">
          {answers.map((a) => {
            const opts = parseOptions(a.options);
            return (
              <div
                key={a.question_id}
                className={`pdf-question bg-white rounded-xl border p-5 transition ${
                  a.is_correct ? "border-green-200" : "border-red-200"
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {a.is_correct ? (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={16} className="text-green-600" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <XCircle size={16} className="text-red-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-400">Q{a.question_number}</span>
                      {a.is_correct ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">Correct</span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">Wrong</span>
                      )}
                    </div>
                    <div
                      className="text-sm text-gray-800 font-medium"
                      dangerouslySetInnerHTML={{ __html: renderMath(a.question_text) }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 ml-11">
                  {opts.map((opt) => {
                    const isUserAnswer = a.user_answer === opt.label;
                    const isCorrect = a.correct_answer === opt.label;
                    let cls = "border border-gray-100 bg-gray-50 text-gray-600";
                    if (isCorrect) cls = "border-2 border-green-400 bg-green-50 text-green-800";
                    else if (isUserAnswer && !isCorrect) cls = "border-2 border-red-400 bg-red-50 text-red-700";
                    return (
                      <div key={opt.label} className={`px-3 py-2 rounded-lg text-sm ${cls} flex items-start gap-1`}>
                        <span className="font-bold">{opt.label}.</span>
                        <span dangerouslySetInnerHTML={{ __html: renderMath(opt.text) }} />
                        {isCorrect && <CheckCircle size={14} className="text-green-600 ml-auto flex-shrink-0 mt-0.5" />}
                        {isUserAnswer && !isCorrect && <XCircle size={14} className="text-red-500 ml-auto flex-shrink-0 mt-0.5" />}
                      </div>
                    );
                  })}
                </div>

                {!a.is_correct && (
                  <div className="ml-11 mt-2 text-xs text-gray-500 flex items-center gap-3">
                    <span>Your answer: <strong className="text-red-600">{a.user_answer || "Skipped"}</strong></span>
                    <span>Correct: <strong className="text-green-700">{a.correct_answer}</strong></span>
                  </div>
                )}
                {a.explanation && (
                  <div className="ml-11 mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-800"><strong>Explanation:</strong> {a.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PDF Preview Modal */}
      {showPdfPreview && data && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">PDF Preview</h2>
              <button
                onClick={() => setShowPdfPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              <div ref={pdfContentRef} className="bg-white p-8 max-w-3xl mx-auto shadow-lg" style={{ minHeight: '1000px' }}>
                {/* Cover */}
                <div className="mb-8 pb-6 border-b-4 border-gray-900">
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">{data.submission.exam_title}</h1>
                  <p className="text-lg text-gray-600 mb-1">Student: {data.submission.first_name} {data.submission.last_name} (@{data.submission.username})</p>
                  <p className="text-lg text-gray-600">
                    Submitted: {data.submission.submitted_at ? new Date(data.submission.submitted_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "N/A"}
                  </p>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                    <div className="text-xs text-gray-500 uppercase mb-2">Score</div>
                    <div className={`text-3xl font-bold ${data.submission.score >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.submission.score}%
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                    <div className="text-xs text-gray-500 uppercase mb-2">Correct</div>
                    <div className="text-3xl font-bold text-gray-900">{data.submission.total_correct}/{data.submission.total_questions}</div>
                  </div>
                  <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                    <div className="text-xs text-gray-500 uppercase mb-2">Time</div>
                    <div className="text-3xl font-bold text-gray-900">{formatDuration(data.submission.time_spent)}</div>
                  </div>
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <div className="text-xs text-gray-500 uppercase mb-2">Status</div>
                    <div className="text-3xl font-bold text-gray-900">{data.submission.status === "submitted" ? "Submitted" : data.submission.status || "—"}</div>
                  </div>
                </div>

                {/* Questions */}
                <h2 className="text-2xl font-bold text-gray-900 mb-4 page-break-after-avoid">Question Breakdown</h2>
                <div className="space-y-4">
                  {data.answers.map((a) => {
                    const opts = parseOptions(a.options);
                    return (
                      <div key={a.question_id} className="p-5 border-2 rounded-lg page-break-inside-avoid" style={{ borderColor: a.is_correct ? '#86efac' : '#fca5a5', backgroundColor: a.is_correct ? '#f0fdf4' : '#fef2f2' }}>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-3 py-1 bg-gray-200 text-gray-700 font-bold rounded text-sm">Q{a.question_number}</span>
                          <span className="px-3 py-1 rounded text-sm font-bold" style={{ backgroundColor: a.is_correct ? '#dcfce7' : '#fecaca', color: a.is_correct ? '#16a34a' : '#dc2626' }}>
                            {a.is_correct ? '✓ CORRECT' : '✗ WRONG'}
                          </span>
                        </div>
                        <div className="mb-4 text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMath(a.question_text) }} />
                        <div className="grid grid-cols-2 gap-2">
                          {opts.map((opt) => {
                            const isUserAnswer = a.user_answer === opt.label;
                            const isCorrect = a.correct_answer === opt.label;
                            let bg = '#f9fafb';
                            let border = '#e5e7eb';
                            let color = '#374151';
                            if (isCorrect) { bg = '#dcfce7'; border = '#86efac'; color = '#166534'; }
                            else if (isUserAnswer && !isCorrect) { bg = '#fecaca'; border = '#fca5a5'; color = '#991b1b'; }
                            return (
                              <div key={opt.label} className="p-3 border-2 rounded text-sm" style={{ borderColor: border, backgroundColor: bg, color }}>
                                <span className="font-bold">{opt.label}.</span> <span dangerouslySetInnerHTML={{ __html: renderMath(opt.text) }} />
                              </div>
                            );
                          })}
                        </div>
                        {!a.is_correct && (
                          <div className="mt-3 text-sm text-gray-600 p-2 bg-gray-100 rounded">
                            Your answer: <strong className="text-red-600">{a.user_answer || "Skipped"}</strong> ·
                            Correct: <strong className="text-green-600">{a.correct_answer}</strong>
                          </div>
                        )}
                        {a.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-200 rounded text-sm text-blue-800">
                            <strong>Explanation:</strong> {a.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowPdfPreview(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPdf}
                disabled={downloadingPdf}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-60 transition flex items-center gap-2"
              >
                {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {downloadingPdf ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
