import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./authContext";

import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminExams from "./pages/Admin/Exams";
import AdminExamEditor from "./pages/Admin/ExamEditor";
import AdminSubmissions from "./pages/Admin/Submissions";
import AdminSubmissionDetail from "./pages/Admin/SubmissionDetail";
import AdminUsers from "./pages/Admin/Users";
import AdminClassrooms from "./pages/Admin/Classrooms";
import ClassroomDetail from "./pages/Admin/ClassroomDetail";
import ExamLogs from "./pages/Admin/ExamLogs";
import RecycleBin from "./pages/Admin/RecycleBin";
import ExamMonitoring from "./pages/Admin/ExamMonitoring";
import ExamSessions from "./pages/Admin/ExamSessions";

import StudentDashboard from "./pages/Student/Dashboard";
import ExamCodeEntry from "./pages/Student/ExamCodeEntry";
import ExamGettingReady from "./pages/Student/ExamGettingReady";
import ExamPlayer from "./pages/Student/ExamPlayer";
import ExamResult from "./pages/Student/ExamResult";
import PhoneCameraSetup from "./pages/Student/PhoneCameraSetup";

function ExamPlayerKeyed() {
  const { examId } = useParams();
  return <ExamPlayer key={examId} />;
}

function ExamMonitoringKeyed() {
  const { examId } = useParams();
  return <ExamMonitoring examId={examId} />;
}

function PrivateRoute({ children, role }) {
  const { user, token } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return user.role === "admin"
      ? <Navigate to="/admin/dashboard" replace />
      : <Navigate to="/student/dashboard" replace />;
  }
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/3">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Admin */}
          <Route
            path="/admin/dashboard"
            element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>}
          />
          <Route
            path="/admin/exams"
            element={<PrivateRoute role="admin"><AdminExams /></PrivateRoute>}
          />
          <Route
            path="/admin/exams/new"
            element={<PrivateRoute role="admin"><AdminExamEditor /></PrivateRoute>}
          />
          <Route
            path="/admin/exams/:examId/edit"
            element={<PrivateRoute role="admin"><AdminExamEditor /></PrivateRoute>}
          />
          <Route
            path="/admin/submissions"
            element={<PrivateRoute role="admin"><AdminSubmissions /></PrivateRoute>}
          />
          <Route
            path="/admin/submissions/:submissionId"
            element={<PrivateRoute role="admin"><AdminSubmissionDetail /></PrivateRoute>}
          />
          <Route
            path="/admin/users"
            element={<PrivateRoute role="admin"><AdminUsers /></PrivateRoute>}
          />
          <Route
            path="/admin/classrooms"
            element={<PrivateRoute role="admin"><AdminClassrooms /></PrivateRoute>}
          />
          <Route
            path="/admin/classrooms/:id"
            element={<PrivateRoute role="admin"><ClassroomDetail /></PrivateRoute>}
          />
          <Route
            path="/admin/logs"
            element={<PrivateRoute role="admin"><ExamLogs /></PrivateRoute>}
          />
          <Route
            path="/admin/recycle-bin"
            element={<PrivateRoute role="admin"><RecycleBin /></PrivateRoute>}
          />
          <Route
            path="/admin/monitoring"
            element={<PrivateRoute role="admin"><ExamMonitoring /></PrivateRoute>}
          />
          <Route
            path="/admin/exams/:examId/monitor"
            element={<PrivateRoute role="admin"><ExamMonitoringKeyed /></PrivateRoute>}
          />
          <Route
            path="/admin/exam-sessions"
            element={<PrivateRoute role="admin"><ExamSessions /></PrivateRoute>}
          />
          <Route
            path="/admin/exam-sessions/:examId"
            element={<PrivateRoute role="admin"><ExamSessions /></PrivateRoute>}
          />
          <Route
            path="/admin/exam-sessions/:examId/:studentId"
            element={<PrivateRoute role="admin"><ExamSessions /></PrivateRoute>}
          />

          {/* Student */}
          <Route
            path="/student/dashboard"
            element={<PrivateRoute role="student"><StudentDashboard /></PrivateRoute>}
          />
          <Route
            path="/student/exam/join"
            element={<PrivateRoute role="student"><ExamCodeEntry /></PrivateRoute>}
          />
          <Route
            path="/student/exam-setup/:examId"
            element={<PrivateRoute role="student"><ExamGettingReady /></PrivateRoute>}
          />
          <Route
            path="/student/exam/:examId"
            element={<PrivateRoute role="student"><ExamPlayerKeyed /></PrivateRoute>}
          />
          <Route
            path="/student/exam/:examId/result"
            element={<PrivateRoute role="student"><ExamResult /></PrivateRoute>}
          />
          {/* Phone Camera Setup - No authentication required */}
          <Route
            path="/phone-camera/:examId/:studentId"
            element={<PhoneCameraSetup />}
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
