import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { apiCreateExam, apiGetAdminExamById, apiUpdateExam } from "../../api";
import { ArrowLeft, ChevronDown, Loader2, Save, Trash2, Check, GripVertical, Edit2, X } from "lucide-react";
import RichTextEditor from "../../components/RichTextEditor";
import { renderMath } from "../../utils/math";

const TOTAL_QUESTIONS = 48;

const emptyQuestion = (index = 0) => ({
  id: `q-${index + 1}`,
  question_text: "",
  options: [
    { label: "A", text: "" },
    { label: "B", text: "" },
    { label: "C", text: "" },
    { label: "D", text: "" },
  ],
  correct_answer: "A",
  explanation: "",
});

function createQuestionList(source = []) {
  const incoming = Array.isArray(source) ? source : [];
  return Array.from({ length: TOTAL_QUESTIONS }, (_, index) => {
    const q = incoming[index];
    if (!q) return emptyQuestion(index);
    return {
      id: q.id || `q-${index + 1}`,
      question_text: q.question_text || "",
      options: Array.isArray(q.options)
        ? ["A", "B", "C", "D"].map((label, optionIndex) => {
            const opt = q.options[optionIndex];
            return {
              label,
              text: opt?.text || "",
            };
          })
        : [
            { label: "A", text: "" },
            { label: "B", text: "" },
            { label: "C", text: "" },
            { label: "D", text: "" },
          ],
      correct_answer: q.correct_answer || "",
      explanation: q.explanation || "",
    };
  });
}

export default function AdminExamEditor() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(examId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState("draft");
  const [questions, setQuestions] = useState(() => createQuestionList());
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [editingDetails, setEditingDetails] = useState(!isEdit); // Open for new exams
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState(null);
  const [draggedQuestionIdx, setDraggedQuestionIdx] = useState(null);
  const questionRefs = useRef([]);

  const completedCount = questions.filter(
    (q) =>
      q.question_text.trim() &&
      q.options.every((opt) => opt.text.trim()) &&
      q.correct_answer
  ).length;

  useEffect(() => {
    if (!isEdit) return;
    apiGetAdminExamById(examId)
      .then(({ exam, questions: qs }) => {
        setTitle(exam.title);
        setDescription(exam.description || "");
        setDuration(exam.duration_minutes);
        setStatus(exam.status);
        setQuestions(
          createQuestionList(
            qs.map((q) => ({
              id: q.id,
              question_text: q.question_text,
              options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
              correct_answer: q.correct_answer,
              explanation: q.explanation || "",
            }))
          )
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setFetchLoading(false));
  }, [examId, isEdit]);

  const updateQuestion = (idx, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIdx, optIdx, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const options = q.options.map((o, j) => (j === optIdx ? { ...o, text: value } : o));
        return { ...q, options };
      })
    );
  };

  const setCorrectAnswer = (qIdx, answer) => {
    updateQuestion(qIdx, "correct_answer", answer);
  };

  const toggleQuestion = (idx) => {
    if (expandedQuestionIdx === idx) {
      setExpandedQuestionIdx(null);
    } else {
      setExpandedQuestionIdx(idx);
      setTimeout(() => {
        questionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  const handleDragStart = (e, idx) => {
    setDraggedQuestionIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedQuestionIdx === null || draggedQuestionIdx === targetIdx) {
      setDraggedQuestionIdx(null);
      return;
    }

    const newQuestions = [...questions];
    const [draggedItem] = newQuestions.splice(draggedQuestionIdx, 1);
    newQuestions.splice(targetIdx, 0, draggedItem);
    setQuestions(newQuestions);

    // Update expanded index if needed
    if (expandedQuestionIdx === draggedQuestionIdx) {
      setExpandedQuestionIdx(targetIdx);
    } else if (expandedQuestionIdx !== null) {
      if (draggedQuestionIdx < expandedQuestionIdx && targetIdx >= expandedQuestionIdx) {
        setExpandedQuestionIdx(expandedQuestionIdx - 1);
      } else if (draggedQuestionIdx > expandedQuestionIdx && targetIdx <= expandedQuestionIdx) {
        setExpandedQuestionIdx(expandedQuestionIdx + 1);
      }
    }

    setDraggedQuestionIdx(null);
    setTimeout(() => {
      questionRefs.current[targetIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleDragEnd = () => {
    setDraggedQuestionIdx(null);
  };

  const deleteQuestion = (idx) => {
    if (!window.confirm(`Are you sure you want to delete Question ${idx + 1}?`)) return;
    
    const newQuestions = [...questions];
    newQuestions[idx] = emptyQuestion(idx);
    setQuestions(newQuestions);
    
    if (expandedQuestionIdx === idx) {
      setExpandedQuestionIdx(null);
    }
  };

  const getQuestionPreview = (question) => {
    const text = question.question_text.trim();
    if (!text) return 'Empty question';
    
    // Render with math support and truncate if needed
    const rendered = renderMath(text);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rendered;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    if (plainText.length > 60) {
      return renderMath(text.substring(0, 60) + '...');
    }
    return rendered;
  };

  const isQuestionComplete = (question) => {
    return question.question_text.trim() &&
           question.options.every((opt) => opt.text.trim()) &&
           question.correct_answer;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      setEditingDetails(true); // Open edit mode to show error
      return;
    }

    setLoading(true);
    setError("");
    setEditingDetails(false); // Close edit mode on save

    const authoredQuestions = questions.filter(
      (q) =>
        q.question_text.trim() &&
        q.options.every((opt) => opt.text.trim()) &&
        q.correct_answer
    );

    const payload = {
      title: title.trim(),
      description: description.trim(),
      duration_minutes: Number(duration),
      status,
      questions: authoredQuestions.map((q, index) => ({
        question_number: index + 1,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation || "",
      })),
    };

    try {
      if (isEdit) {
        await apiUpdateExam(examId, payload);
      } else {
        await apiCreateExam(payload);
      }
      navigate("/admin/exams");
    } catch (err) {
      setError(err.message || "Failed to save exam.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-expand first incomplete question on load
  useEffect(() => {
    if (!fetchLoading && expandedQuestionIdx === null) {
      const firstIncomplete = questions.findIndex(q => !isQuestionComplete(q));
      if (firstIncomplete !== -1) {
        setExpandedQuestionIdx(firstIncomplete);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLoading]);

  if (fetchLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => navigate("/admin/exams")}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600">
                  {completedCount}/{TOTAL_QUESTIONS} Complete
                </span>
                <button
                  type="submit"
                  form="exam-form"
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3" />
                      {isEdit ? "Update" : "Create"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Exam Details - Inline Edit */}
            {!editingDetails ? (
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-gray-900">
                  {title || "Untitled Exam"}
                </h1>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="px-2 py-0.5 bg-gray-100 rounded">{duration} min</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded capitalize">{status}</span>
                  {description && (
                    <span className="px-2 py-0.5 bg-gray-100 rounded max-w-xs truncate">
                      {description}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditingDetails(true)}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Edit exam details"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <div className="space-y-2 pb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Exam Title"
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-semibold focus:ring-1 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingDetails(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Close"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Duration (min)"
                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-transparent outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6">
          <form id="exam-form" onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Questions Accordion List */}
            <div className="space-y-2">
              {questions.map((question, idx) => {
                const isExpanded = expandedQuestionIdx === idx;
                const isComplete = isQuestionComplete(question);
                const isDragging = draggedQuestionIdx === idx;
                
                return (
                  <div
                    key={`question-${idx}`}
                    ref={(el) => (questionRefs.current[idx] = el)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white border rounded-lg overflow-hidden transition-all ${
                      isDragging ? 'opacity-50' : ''
                    } ${
                      isExpanded
                        ? 'border-indigo-400 shadow-md'
                        : isComplete
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="cursor-grab active:cursor-grabbing" title="Drag to reorder">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleQuestion(idx)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          <div className={`transform transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm ${isComplete ? 'text-green-700' : 'text-gray-700'}`}>
                              Q{idx + 1}
                            </span>
                            {isComplete && (
                              <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          {!isExpanded && (
                            <span 
                              className="text-xs text-gray-500 truncate ml-2"
                              dangerouslySetInnerHTML={{ __html: getQuestionPreview(question) }}
                            />
                          )}
                        </button>
                      </div>
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteQuestion(idx);
                        }}
                        className="p-1 hover:bg-red-100 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>

                    {/* Question Editor (Expanded) */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-100 bg-white">
                        <RichTextEditor
                          key={`question-${idx}-${question.id}`}
                          id={`question-${idx}`}
                          name="question_text"
                          label="Question Text"
                          placeholder="Type your question here..."
                          defaultValue={question.question_text}
                          onChange={(html) => updateQuestion(idx, "question_text", html)}
                          enableMath={true}
                        />

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                          <div className="space-y-2">
                            {question.options.map((opt, optIdx) => {
                              const isSelected = question.correct_answer === opt.label;
                              return (
                                <div 
                                  key={opt.label} 
                                  className={`flex items-start gap-2 p-2 rounded-lg border transition ${
                                    isSelected 
                                      ? 'border-green-500 bg-green-50' 
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <label className="flex items-center justify-center cursor-pointer mt-6">
                                    <input
                                      type="radio"
                                      name={`correct-${idx}`}
                                      checked={isSelected}
                                      onChange={() => setCorrectAnswer(idx, opt.label)}
                                      className="w-5 h-5 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
                                    />
                                  </label>
                                  <div className="flex-1">
                                    <RichTextEditor
                                      key={`option-${idx}-${optIdx}-${question.id}`}
                                      id={`option-${idx}-${optIdx}`}
                                      name={`option_${opt.label}`}
                                      label={`Option ${opt.label}`}
                                      placeholder={`Enter option ${opt.label}...`}
                                      defaultValue={opt.text}
                                      onChange={(html) => updateOption(idx, optIdx, html)}
                                      enableMath={true}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <RichTextEditor
                          key={`explanation-${idx}-${question.id}`}
                          id={`explanation-${idx}`}
                          name="explanation"
                          label="Explanation (Optional)"
                          placeholder="Explain the correct answer..."
                          defaultValue={question.explanation}
                          onChange={(html) => updateQuestion(idx, "explanation", html)}
                          enableMath={true}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
