const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("math_token");
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error("Cannot reach API server. Please try again in a few seconds.");
    }
    throw err;
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function apiLogin(identifier, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export async function apiGetMe() {
  return request("/api/auth/me");
}

// ─── Student: Exams ──────────────────────────────────────────────────────────

export async function apiJoinExam(code) {
  return request("/api/exams/join", { method: "POST", body: JSON.stringify({ code }) });
}

export async function apiGetExamQuestions(examId) {
  return request(`/api/exams/${examId}/questions`);
}

export async function apiSubmitExam(examId, answers, timeSpent) {
  return request(`/api/exams/${examId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers, timeSpent }),
  });
}

export async function apiGetMyResult(examId) {
  return request(`/api/exams/${examId}/result`);
}

export async function apiGetMyExams() {
  return request("/api/exams/my");
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function apiGetStats() {
  return request("/api/admin/stats");
}

export async function apiGetAdminExams() {
  return request("/api/admin/exams");
}

export async function apiGetAdminExamById(examId) {
  return request(`/api/admin/exams/${examId}`);
}

export async function apiCreateExam(data) {
  return request("/api/admin/exams", { method: "POST", body: JSON.stringify(data) });
}

export async function apiUpdateExam(examId, data) {
  return request(`/api/admin/exams/${examId}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function apiDeleteExam(examId) {
  return request(`/api/admin/exams/${examId}`, { method: "DELETE" });
}

export async function apiGetSubmissions(examId) {
  const qs = examId ? `?examId=${examId}` : "";
  return request(`/api/admin/submissions${qs}`);
}

export async function apiGetSubmissionDetail(submissionId) {
  return request(`/api/admin/submissions/${submissionId}`);
}

export async function apiGetUsers() {
  return request("/api/admin/users");
}

export async function apiCreateUser(data) {
  return request("/api/admin/users", { method: "POST", body: JSON.stringify(data) });
}

export async function apiDeleteUser(userId) {
  return request(`/api/admin/users/${userId}`, { method: "DELETE" });
}

// ─── Admin: Classrooms ───────────────────────────────────────────────────────

export async function apiGetClassrooms() {
  return request("/api/admin/classrooms");
}

export async function apiGetClassroomById(classroomId) {
  return request(`/api/admin/classrooms/${classroomId}`);
}

export async function apiCreateClassroom(data) {
  return request("/api/admin/classrooms", { method: "POST", body: JSON.stringify(data) });
}

export async function apiUpdateClassroom(classroomId, data) {
  return request(`/api/admin/classrooms/${classroomId}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function apiDeleteClassroom(classroomId) {
  return request(`/api/admin/classrooms/${classroomId}`, { method: "DELETE" });
}

export async function apiAddStudentToClassroom(classroomId, userId) {
  return request(`/api/admin/classrooms/${classroomId}/students`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function apiRemoveStudentFromClassroom(classroomId, userId) {
  return request(`/api/admin/classrooms/${classroomId}/students/${userId}`, { method: "DELETE" });
}

// ─── Exam Logs ───────────────────────────────────────────────────────────────

export async function apiLogExamEvent(examId, eventType, eventData = {}, submissionId = null) {
  return request("/api/exams/log", {
    method: "POST",
    body: JSON.stringify({ examId, eventType, eventData, submissionId }),
  });
}

export async function apiGetExamLogs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.examId) params.append("examId", filters.examId);
  if (filters.userId) params.append("userId", filters.userId);
  if (filters.eventType) params.append("eventType", filters.eventType);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);
  if (filters.limit) params.append("limit", filters.limit);
  
  const query = params.toString();
  return request(`/api/admin/logs${query ? `?${query}` : ""}`);
}

export async function apiGetExamLogStats(filters = {}) {
  const params = new URLSearchParams();
  if (filters.examId) params.append("examId", filters.examId);
  if (filters.userId) params.append("userId", filters.userId);
  
  const query = params.toString();
  return request(`/api/admin/logs/stats${query ? `?${query}` : ""}`);
}
