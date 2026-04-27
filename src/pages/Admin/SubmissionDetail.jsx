import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { apiGetSubmissionDetail } from "../../api";
import {
  ArrowLeft, CheckCircle, XCircle, Download, Loader2,
  User, Clock, FileText, Award
} from "lucide-react";
import { renderMath } from "../../utils/math";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Convert LaTeX to readable text for PDF
function latexToText(latex) {
  if (!latex) return "";
  // Remove LaTeX delimiters
  let text = latex
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\{/g, "{")
    .replace(/\\}/g, "}")
    .replace(/\\\\/g, "\n");
  // Replace common LaTeX commands with readable text
  text = text
    .replace(/\\frac{([^}]+)}{([^}]+)}/g, "($1)/$2")
    .replace(/\\sqrt{([^}]+)}/g, "√($1)")
    .replace(/\\sum/g, "∑")
    .replace(/\\int/g, "∫")
    .replace(/\\infty/g, "∞")
    .replace(/\\pi/g, "π")
    .replace(/\\theta/g, "θ")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\delta/g, "δ")
    .replace(/\^([a-zA-Z0-9])/g, "^$1")
    .replace(/_([a-zA-Z0-9])/g, "_$1");
  return text.replace(/\s+/g, " ").trim();
}

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

  useEffect(() => {
    apiGetSubmissionDetail(submissionId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [submissionId]);

  const handleDownloadPdf = async () => {
    if (!data || downloadingPdf) return;
    setDownloadingPdf(true);

    try {
      const { submission: sub, answers } = data;
      const studentName = `${sub.first_name || ""} ${sub.last_name || ""}`.trim() || sub.username || "Unknown";
      const examTitle = sub.exam_title || "Exam";
      const filename = `${studentName.replace(/\s+/g, "_")}_${examTitle.replace(/\s+/g, "_")}_Results.pdf`;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      const dark = [17, 24, 39];
      const muted = [107, 114, 128];
      const border = [229, 231, 235];
      const panel = [249, 250, 251];
      const green = [22, 163, 74];
      const red = [220, 38, 38];

      const completedDate = sub.submitted_at
        ? new Date(sub.submitted_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
        : "N/A";

      // ── Cover ─────────────────────────────────────────────────────────
      pdf.setFillColor(...panel);
      pdf.setDrawColor(...border);
      pdf.roundedRect(margin, margin, contentWidth, 18, 3, 3, "FD");
      pdf.setTextColor(...dark);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11.5);
      pdf.text("ChineseMath", margin + 6, margin + 8.2);
      pdf.setTextColor(...muted);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.2);
      pdf.text("Official Submission Report", margin + 6, margin + 13.3);

      const coverY = margin + 22;
      pdf.setFillColor(...dark);
      pdf.roundedRect(margin, coverY, contentWidth, 54, 4, 4, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(19);
      pdf.text("Submission Results", margin + 8, coverY + 15);

      pdf.setTextColor(156, 163, 175);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(examTitle, margin + 8, coverY + 23);

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(26);
      pdf.text(`${sub.score}%`, pageWidth - margin - 8, coverY + 18, { align: "right" });

      pdf.setTextColor(156, 163, 175);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("SCORE", pageWidth - margin - 8, coverY + 25, { align: "right" });

      pdf.setDrawColor(55, 65, 81);
      pdf.line(margin + 8, coverY + 35, pageWidth - margin - 8, coverY + 35);

      pdf.setTextColor(156, 163, 175);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("STUDENT", margin + 8, coverY + 43);
      pdf.text("DATE", pageWidth - margin - 8, coverY + 43, { align: "right" });

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(studentName, margin + 8, coverY + 49);
      pdf.text(completedDate, pageWidth - margin - 8, coverY + 49, { align: "right" });

      // ── Summary Cards ─────────────────────────────────────────────────
      const cardsY = margin + 86;
      const gap = 4;
      const cardW = (contentWidth - gap * 3) / 4;
      const summaryCards = [
        { title: "Score", value: `${sub.score}%`, sub: sub.score >= 60 ? "Passing" : "Below passing", accent: sub.score >= 60 ? green : red, bg: sub.score >= 60 ? [220, 252, 231] : [254, 226, 226] },
        { title: "Correct", value: `${sub.total_correct}/${sub.total_questions}`, sub: "answers", accent: dark, bg: panel },
        { title: "Time Spent", value: formatDuration(sub.time_spent), sub: "duration", accent: dark, bg: panel },
        { title: "Status", value: sub.status === "submitted" ? "Submitted" : (sub.status || "—"), sub: "submission state", accent: green, bg: [220, 252, 231] },
      ];

      summaryCards.forEach((c, i) => {
        const x = margin + (cardW + gap) * i;
        pdf.setFillColor(...c.bg);
        pdf.setDrawColor(...border);
        pdf.roundedRect(x, cardsY, cardW, 29, 3, 3, "FD");
        pdf.setTextColor(...muted);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(c.title.toUpperCase(), x + 5, cardsY + 8);
        pdf.setTextColor(...c.accent);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(String(c.value), x + 5, cardsY + 18);
        pdf.setTextColor(...muted);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.text(c.sub, x + 5, cardsY + 25);
      });

      // ── Questions Table ─────────────────────────────────────────────────
      const addPageHeader = (title, subtitle) => {
        pdf.addPage();
        pdf.setFillColor(...dark);
        pdf.rect(0, 0, pageWidth, 30, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text(title, margin, 13);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(subtitle, margin, 21);
        return 40;
      };

      let y = addPageHeader("Question Breakdown", `${sub.total_correct} correct / ${(sub.total_questions || 0) - (sub.total_correct || 0)} wrong`);

      const tableBody = answers.map((a) => {
        const opts = parseOptions(a.options);
        const userOpt = opts.find(o => o.label === a.user_answer);
        const correctOpt = opts.find(o => o.label === a.correct_answer);
        const result = a.is_correct === true ? "Correct" : (a.is_correct === false ? "Wrong" : "Recorded");
        
        // Convert LaTeX to readable text for PDF
        const questionText = latexToText(a.question_text).substring(0, 100);
        
        const userAnswerText = a.user_answer 
          ? `${a.user_answer}${userOpt ? ". " + latexToText(userOpt.text).substring(0, 30) : ""}`
          : "Skipped";
        
        const correctAnswerText = `${a.correct_answer}${correctOpt ? ". " + latexToText(correctOpt.text).substring(0, 30) : ""}`;

        return [
          String(a.question_number || "-"),
          questionText,
          userAnswerText,
          correctAnswerText,
          result,
        ];
      });

      autoTable(pdf, {
        startY: y,
        head: [["#", "Question", "Student Answer", "Correct Answer", "Result"]],
        body: tableBody,
        theme: "grid",
        margin: { left: margin, right: margin },
        headStyles: { fillColor: dark, textColor: 255, fontSize: 8.5, halign: "left" },
        styles: { fontSize: 8, cellPadding: 2.6, lineColor: border, lineWidth: 0.1, overflow: "linebreak", valign: "middle" },
        bodyStyles: { textColor: [31, 41, 55] },
        rowPageBreak: "avoid",
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 82 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
          4: { cellWidth: 24, halign: "center", fontStyle: "bold" },
        },
        didParseCell: (hookData) => {
          if (hookData.section !== "body" || hookData.column.index !== 4) return;
          const result = String(hookData.cell.raw);
          if (result === "Correct") hookData.cell.styles.textColor = green;
          else if (result === "Wrong") hookData.cell.styles.textColor = red;
          else if (result === "Recorded") hookData.cell.styles.textColor = muted;
        },
        didDrawPage: () => {
          pdf.setTextColor(...muted);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.text("ChineseMath Submission Report", margin, pageHeight - 6);
        },
      });

      // ── Page Numbers ──────────────────────────────────────────────────
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setTextColor(...muted);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
      }

      pdf.save(filename);
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
                className={`bg-white rounded-xl border p-5 transition ${
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
    </AdminLayout>
  );
}
