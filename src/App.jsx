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

import StudentDashboard from "./pages/Student/Dashboard";
import ExamCodeEntry from "./pages/Student/ExamCodeEntry";
import ExamPlayer from "./pages/Student/ExamPlayer";
import ExamResult from "./pages/Student/ExamResult";

function ExamPlayerKeyed() {
  const { examId } = useParams();
  return <ExamPlayer key={examId} />;
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
      <BrowserRouter>
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
            path="/student/exam/:examId"
            element={<PrivateRoute role="student"><ExamPlayerKeyed /></PrivateRoute>}
          />
          <Route
            path="/student/exam/:examId/result"
            element={<PrivateRoute role="student"><ExamResult /></PrivateRoute>}
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
