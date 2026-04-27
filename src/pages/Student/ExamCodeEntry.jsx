import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiJoinExam, apiCheckExamStatus } from "../../api";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

export default function ExamCodeEntry() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const exam = await apiJoinExam(code);
      
      // Check if student has already submitted or was terminated
      try {
        const status = await apiCheckExamStatus(exam.id);
        if (status.status === 'submitted') {
          setError("You have already submitted this exam. You cannot retake it.");
          setLoading(false);
          return;
        }
        if (status.status === 'terminated') {
          setError("Your exam was terminated by the administrator. You cannot re-enter this exam.");
          setLoading(false);
          return;
        }
      } catch (statusError) {
        // If status check fails, continue anyway (might not be implemented yet)
        console.warn('Status check failed:', statusError);
      }
      
      // Navigate to getting ready page instead of directly to exam
      navigate(`/student/exam-setup/${exam.id}`);
    } catch (err) {
      setError(err.message || "Invalid exam code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
        <button
          onClick={() => navigate("/student/dashboard")}
          className="flex items-center space-x-2 text-gray-400 hover:text-gray-700 text-sm mb-6"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Enter Exam Code</h2>
          <p className="text-gray-500 text-sm mt-1">Get the code from your teacher</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-r mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            maxLength={10}
            required
            className="w-full text-center text-2xl font-mono tracking-widest border border-gray-200 rounded-xl px-4 py-4 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-gray-50 focus:bg-white uppercase"
          />
          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white py-3.5 rounded-xl font-semibold hover:bg-red-700 transition shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" /><span>Verifying...</span></>
            ) : (
              <><span>Start Exam</span><ArrowRight size={18} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
