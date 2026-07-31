const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const token = localStorage.getItem("spaceece_auth_token");
  
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

// Auth APIs
export function loginUser(credentials) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function registerTeacher(payload) {
  return request("/api/auth/register-teacher", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function requestPasswordReset(email) {
  return request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyPasswordResetToken(token) {
  return request("/api/auth/reset-password/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function resetPassword(token, password) {
  return request("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

// OTP-based Password Reset APIs
export function requestPasswordResetOtp(email) {
  return request("/api/auth/forgot-password-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyPasswordOtp(email, otp) {
  return request("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
}

// Start: Dnyaneshwari Thorat
export function sendSignupOtp(email) {
  return request("/api/auth/send-signup-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifySignupOtp(email, emailOtp) {
  return request("/api/auth/verify-signup-otp", {
    method: "POST",
    body: JSON.stringify({ email, emailOtp }),
  });
}
// End: Dnyaneshwari Thorat

export function getStoredSession() {
  const token = localStorage.getItem("spaceece_auth_token");
  const rawUser = localStorage.getItem("spaceece_user");

  if (!token || !rawUser) return null;

  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    localStorage.removeItem("spaceece_auth_token");
    localStorage.removeItem("spaceece_user");
    return null;
  }
}

export function storeSession({ token, user }) {
  localStorage.setItem("spaceece_auth_token", token);
  localStorage.setItem("spaceece_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("spaceece_auth_token");
  localStorage.removeItem("spaceece_user");
}

// File Upload API
export function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/upload", {
    method: "POST",
    body: formData
  });
}

// Center Management APIs
export function getCenters() {
  return request("/api/centers");
}

export function createCenter(centerData) {
  return request("/api/centers", {
    method: "POST",
    body: JSON.stringify(centerData)
  });
}

export function updateCenter(id, centerData) {
  return request(`/api/centers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(centerData)
  });
}

export function deleteCenter(id) {
  return request(`/api/centers/${id}`, {
    method: "DELETE"
  });
}

export function getCenterTeacherAssignments(centerId) {
  return request(`/api/centers/${centerId}/teacher-assignments`);
}

export function validateCenterAssignments(centerId) {
  return request(`/api/centers/${centerId}/validate-assignments`, {
    method: "POST"
  });
}

// Class Management APIs
export function getClasses(centerId = "") {
  const path = centerId ? `/api/admin/classes?centerId=${centerId}` : "/api/admin/classes";
  return request(path);
}

export function getClassLogs(classId = "") {
  const path = classId ? `/api/admin/classes/logs?classId=${classId}` : "/api/admin/classes/logs";
  return request(path);
}

export function createClass(classData) {
  return request("/api/admin/classes", {
    method: "POST",
    body: JSON.stringify(classData)
  });
}

export function updateClass(id, classData) {
  return request(`/api/admin/classes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(classData)
  });
}

export function deleteClass(id) {
  return request(`/api/admin/classes/${id}`, {
    method: "DELETE"
  });
}

// Children Management APIs
export function getChildren(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/api/admin/children?${searchParams.toString()}`);
}

export function getTeacherChildren(classId = "") {
  const url = classId ? `/api/teacher/children?classId=${classId}` : "/api/teacher/children";
  return request(url);
}

export function getTeacherClasses() {
  return request("/api/teacher/classes");
}

export function createTeacherChild(childData) {
  return request("/api/teacher/children", {
    method: "POST",
    body: JSON.stringify(childData)
  });
}

// Start: Dnyaneshwari Thorat
export function createTeacherChildrenBulk(childrenList) {
  return request("/api/teacher/children/bulk", {
    method: "POST",
    body: JSON.stringify({ children: childrenList })
  });
}
// End: Dnyaneshwari Thorat

// Start: Dnyaneshwari Thorat
export function deleteTeacherChild(id) {
  return request(`/api/teacher/children/${id}`, {
    method: "DELETE"
  });
}
// End: Dnyaneshwari Thorat

export function updateChild(id, childData) {
  return request(`/api/admin/children/${id}`, {
    method: "PATCH",
    body: JSON.stringify(childData)
  });
}

export function deleteChild(id) {
  return request(`/api/admin/children/${id}`, {
    method: "DELETE"
  });
}

// User Management APIs
export function getAdminUsers(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/api/admin/users?${searchParams.toString()}`);
}

export function updateUserRole(id, role) {
  return request(`/api/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function updateUserStatus(id, status) {
  return request(`/api/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteUser(id) {
  return request(`/api/admin/users/${id}`, {
    method: "DELETE",
  });
}

// Teacher Management APIs
export function getAdminTeachers() {
  return request("/api/admin/teachers");
}

export function updateTeacherProfile(id, teacherData) {
  return request(`/api/admin/teachers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(teacherData)
  });
}

export function updateTeacherStatus(id, status) {
  return request(`/api/admin/teachers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function assignTeacherToCenter(teacherId, centerId) {
  return request(`/api/admin/teachers/${teacherId}/assign-center`, {
    method: "PATCH",
    body: JSON.stringify({ centerId }),
  });
}

export function sendDirectMessageToTeacher(teacherId, payload) {
  return request(`/api/admin/teachers/${teacherId}/message`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteTeacher(id) {
  return request(`/api/admin/teachers/${id}`, {
    method: "DELETE"
  });
}

export function blockTeacher(id) {
  return request(`/api/admin/teachers/${id}/block`, {
    method: "PATCH"
  });
}

export function unblockTeacher(id) {
  return request(`/api/admin/teachers/${id}/unblock`, {
    method: "PATCH"
  });
}

export function getTeacherMe() {
  return request("/api/teacher/me");
}

export function updateTeacherMe(profileData) {
  return request("/api/teacher/me", {
    method: "PATCH",
    body: JSON.stringify(profileData)
  });
}

export function updateTeacherLanguage(lang) {
  return request("/api/teacher/me/language", {
    method: "PATCH",
    body: JSON.stringify({ language: lang })
  });
}

export function changeTeacherPassword(currentPassword, newPassword) {
  return request("/api/teacher/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

export function getTeacherProgress() {
  return request("/api/teacher/progress");
}

export function getTeacherGrades() {
  return request("/api/grades/teacher");
}

export function getTeacherSchedules() {
  return request("/api/schedules/teacher");
}

export function createSchedule(payload) {
  return request("/api/schedules", { method: "POST", body: JSON.stringify(payload) });
}

export function updateSchedule(id, payload) {
  return request(`/api/schedules/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteSchedule(id) {
  return request(`/api/schedules/${id}`, { method: "DELETE" });
}

export function getTeacherAssessmentResults() {
  return request("/api/teacher/assessment-results");
}

// Certificate APIs
export function getTeacherCertificates() {
  return request("/api/certificates/teacher");
}

export function getAdminCertificates() {
  return request("/api/certificates/admin");
}

export function generateCertificate(payload) {
  return request("/api/certificates/generate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function autoGenerateCertificate(assignmentId, force = false) {
  return request(`/api/certificates/auto-generate/${assignmentId}`, {
    method: "POST",
    body: JSON.stringify({ force })
  });
}

export function revokeCertificate(id) {
  return request(`/api/certificates/${id}/revoke`, {
    method: "PATCH"
  });
}

export function verifyCertificate(certNumber) {
  return request(`/api/certificates/verify/${certNumber}`);
}

export function getTrainerMe() {
  return request("/api/trainer/me");
}

export function getTrainerBatches() {
  return request("/api/trainer/batches");
}

export function getTrainerTeachers() {
  return request("/api/trainer/teachers");
}

export function createTrainerAssignment(assignmentData) {
  return request("/api/trainer/assignments", {
    method: "POST",
    body: JSON.stringify(assignmentData)
  });
}

export function reviewTrainerAssignment(assignmentId, reviewData) {
  return request(`/api/trainer/assignments/${assignmentId}/review`, {
    method: "PATCH",
    body: JSON.stringify(reviewData)
  });
}

export function getTrainerAttendanceSummary() {
  return request("/api/trainer/attendance/summary");
}

export function getTrainerPerformance() {
  return request("/api/trainer/performance");
}

export function askTeacherChatbot(message) {
  return request("/api/teacher/chatbot", {
    method: "POST",
    body: JSON.stringify({ message })
  });
}

// Course Management APIs
export function getCourses() {
  return request("/api/courses");
}

export function getParentModules(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/parent-modules${qs ? `?${qs}` : ""}`);
}
// Start: Snehal change
export function createParentModule(payload) {
  return request("/api/parent-modules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function getParentModuleAssignments(moduleId) {
  return request(`/api/parent-module-assignments?moduleId=${moduleId}`);
}

export function assignParentModule({ moduleId, classId, teacherId }) {
  return request("/api/parent-module-assignments", {
    method: "POST",
    body: JSON.stringify({ moduleId, classId, teacherId }),
  });
}

export function removeParentModuleAssignment(assignmentId) {
  return request(`/api/parent-module-assignments/${assignmentId}`, {
    method: "DELETE",
  });
}
export function updateParentModule(id, payload) {
  return request(`/api/parent-modules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
export function deleteParentModule(id) {
  return request(`/api/parent-modules/${id}`, {
    method: "DELETE",
  });
}
// End: Snehal change
// // Snehal change
export function getParentSessionAssignments(moduleId) {
  return request(`/api/parent-session-assignments?moduleId=${moduleId}`);
}
export function submitParentSessionFeedback(assignmentId, data) {
  return request(`/api/parent-session-assignments/${assignmentId}/feedback`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}
export function createCourse(courseData) {
  return request("/api/courses", {
    method: "POST",
    body: JSON.stringify(courseData)
  });
}

export function generateCourseFromAI(courseData) {
  return request("/api/courses/generate-from-ai", {
    method: "POST",
    body: JSON.stringify(courseData)
  });
}

export function updateCourse(id, courseData) {
  return request(`/api/courses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(courseData)
  });
}

export function deleteCourse(id) {
  return request(`/api/courses/${id}`, {
    method: "DELETE"
  });
}

export function assignCourse(courseId, payload) {
  return request(`/api/courses/${courseId}/assign`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getCourseAssignments() {
  return request("/api/admin/courses/assignments");
}

export function updateCourseAssignmentReview(assignmentId, payload) {
  return request(`/api/admin/courses/assignments/${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function updateCourseAssignmentProgress(assignmentId, payload) {
  return request(`/api/teacher/courses/assignments/${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

// Start: Dnyaneshwari Thorat
export function resetCourseAssignmentProgress(assignmentId) {
  return request(`/api/teacher/courses/assignments/${assignmentId}/reset`, {
    method: "POST"
  });
}
// End: Dnyaneshwari Thorat

export function getCourseNotes(courseId) {
  return request(`/api/courses/${courseId}/notes`);
}

export function createCourseNote(courseId, noteData) {
  return request(`/api/courses/${courseId}/notes`, {
    method: "POST",
    body: JSON.stringify(noteData)
  });
}

export function updateCourseNote(noteId, noteData) {
  return request(`/api/courses/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify(noteData)
  });
}

export function deleteCourseNote(noteId) {
  return request(`/api/courses/notes/${noteId}`, {
    method: "DELETE"
  });
}

export function getTeacherCourseNotes(courseId) {
  return request(`/api/teacher/courses/${courseId}/notes`);
}


// Lesson Plan APIs
export function getLessonPlans() {
  return request("/api/lesson-plans");
}

export function createLessonPlan(lessonData) {
  return request("/api/lesson-plans", {
    method: "POST",
    body: JSON.stringify(lessonData)
  });
}

export function updateLessonPlan(id, lessonData) {
  return request(`/api/lesson-plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(lessonData)
  });
}

export function deleteLessonPlan(id) {
  return request(`/api/lesson-plans/${id}`, {
    method: "DELETE"
  });
}

export function assignLessonPlan(payload) {
  return request("/api/lesson-plans/assign", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getAdminLessonAssignments() {
  return request("/api/admin/lesson-plans/assignments");
}

export function updateLessonPlanAssignment(id, payload) {
  return request(`/api/admin/lesson-plans/assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function getTeacherLessonPlans() {
  return request("/api/teacher/lesson-plans");
}


export function submitLessonCompletion(assignmentId, payload) {
  return request(`/api/teacher/lesson-plans/${assignmentId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getAdminLessonReports() {
  return request("/api/admin/lesson-plans/reports");
}

export function reviewLessonReport(reportId, payload) {
  return request(`/api/admin/lesson-plans/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function autoGenerateLessonPlan(data) {
  return request("/api/lesson-plans/auto-generate", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function autoPublishLessonPlan(data) {
  return request("/api/lesson-plans/auto-publish", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

// Activity APIs
export function getActivities(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/api/activities?${searchParams.toString()}`);
}

export function submitActivity(activityData) {
  return request("/api/activities", {
    method: "POST",
    body: JSON.stringify(activityData)
  });
}

export function reviewActivity(id, reviewData) {
  return request(`/api/activities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(reviewData)
  });
}

// Attendance APIs
export function getChildAttendance(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/api/attendance/children?${searchParams.toString()}`);
}

export function saveChildAttendance(payload) {
  return request("/api/attendance/children", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// Start: Dnyaneshwari Thorat
export function deleteChildAttendance(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/api/attendance/children?${searchParams.toString()}`, {
    method: "DELETE"
  });
}
// End: Dnyaneshwari Thorat

export function getTeacherAttendance(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/api/attendance/teachers?${searchParams.toString()}`);
}

export function saveTeacherAttendance(payload) {
  return request("/api/attendance/teachers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// Trainer APIs
export function getTrainers() {
  return request("/api/trainers");
}

export function createTrainer(trainerData) {
  return request("/api/trainers", {
    method: "POST",
    body: JSON.stringify(trainerData)
  });
}

export function updateTrainer(id, trainerData) {
  return request(`/api/trainers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(trainerData)
  });
}

export function deleteTrainer(id) {
  return request(`/api/trainers/${id}`, {
    method: "DELETE"
  });
}

// Trainer Messages APIs
export function getTrainerMessages(trainerId) {
  return request(`/api/trainers/${trainerId}/messages`);
}

export function sendTrainerMessage(trainerId, data) {
  return request(`/api/trainers/${trainerId}/messages`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function markTrainerMessageRead(messageId) {
  return request(`/api/trainers/messages/${messageId}/read`, {
    method: "PATCH"
  });
}

// Trainer Payouts APIs
export function getTrainerPayouts(trainerId) {
  return request(`/api/trainers/${trainerId}/payouts`);
}

export function createTrainerPayout(trainerId, data) {
  return request(`/api/trainers/${trainerId}/payouts`, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function markPayoutPaid(payoutId) {
  return request(`/api/trainers/payouts/${payoutId}/pay`, {
    method: "PATCH"
  });
}

// Notifications mark-all-read API
export function markAllNotificationsRead() {
  return request("/api/notifications/mark-all-read", {
    method: "POST"
  });
}

// Test SMS/WhatsApp APIs
export function testSmsNotification(to) {
  return request("/api/admin/settings/test-sms", {
    method: "POST",
    body: JSON.stringify({ to })
  });
}

export function testWhatsAppNotification(to) {
  return request("/api/admin/settings/test-whatsapp", {
    method: "POST",
    body: JSON.stringify({ to })
  });
}

// Feedback APIs
export function getFeedbacks() {
  return request("/api/feedbacks");
}

export function submitFeedback(feedbackData) {
  return request("/api/feedbacks", {
    method: "POST",
    body: JSON.stringify(feedbackData)
  });
}

export function updateFeedback(id, feedbackData) {
  return request(`/api/feedbacks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(feedbackData)
  });
}

// Portal Settings APIs
export function getPortalSettings() {
  return request("/api/admin/settings");
}

export function updatePortalSettings(settings) {
  return request("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ settings }),
  });
}

// Notifications APIs
export function getNotifications() {
  return request("/api/notifications");
}

export function markNotificationRead(id) {
  return request(`/api/notifications/${id}/read`, {
    method: "PATCH"
  });
}

export function getAdminNotifications() {
  return request("/api/admin/notifications");
}

export function sendAdminNotification(payload) {
  return request("/api/admin/notifications/broadcast", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteNotification(id) {
  return request(`/api/admin/notifications/${id}`, {
    method: "DELETE"
  });
}

export function testSmtpEmail(to) {
  return request("/api/admin/settings/test-email", {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}


// Automation APIs
export function getAutomationStatus() {
  return request("/api/automation/status");
}

export function sendAttendanceReminders(channel = "in_app") {
  return request("/api/automation/attendance-reminders", {
    method: "POST",
    body: JSON.stringify({ channel }),
  });
}

export function autoAssignCourse(courseId) {
  return request("/api/automation/auto-assign-courses", {
    method: "POST",
    body: JSON.stringify({ courseId }),
  });
}

// Reports/Analytics API
export function getAdminDashboard() {
  return request("/api/admin/dashboard");
}

export function getAdminAnalytics() {
  return request("/api/admin/reports/analytics");
}

export function getReportJobs() {
  return request("/api/admin/report-jobs");
}

export function createReportJob(reportData) {
  return request("/api/admin/report-jobs", {
    method: "POST",
    body: JSON.stringify(reportData)
  });
}

export function updateReportJob(id, reportData) {
  return request(`/api/admin/report-jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(reportData)
  });
}

// ── Admin SMTP/Twilio Config (persisted to Atlas) ──
export function saveSmtpConfig(smtpData) {
  return request("/api/admin/settings/smtp", {
    method: "POST",
    body: JSON.stringify(smtpData),
  });
}

export function saveTwilioConfig(twilioData) {
  return request("/api/admin/settings/twilio", {
    method: "POST",
    body: JSON.stringify(twilioData),
  });
}

// ── Admin language preference ──
export function updateAdminLanguage(lang) {
  return request("/api/admin/me/language", {
    method: "PATCH",
    body: JSON.stringify({ language: lang }),
  });
}

// ── Teacher notification preference ──
export function updateTeacherNotificationPreference(channel) {
  return request("/api/teacher/me/notification-preference", {
    method: "PATCH",
    body: JSON.stringify({ preferredNotificationChannel: channel }),
  });
}

// ═══════════════════════════════════════════════════
// PHASE 1: User Management APIs
// ═══════════════════════════════════════════════════

export function importUsers(users) {
  return request("/api/admin/users/import", { method: "POST", body: JSON.stringify({ users }) });
}

export function restoreUser(userId) {
  return request(`/api/admin/users/${userId}/restore`, { method: "PATCH" });
}

// ═══════════════════════════════════════════════════
// PHASE 1: Course Publishing APIs
// ═══════════════════════════════════════════════════

export function publishCourse(courseId) {
  return request(`/api/courses/${courseId}/publish`, { method: "POST" });
}

export function archiveCourse(courseId) {
  return request(`/api/courses/${courseId}/archive`, { method: "POST" });
}

export function reviewCourse(courseId) {
  return request(`/api/courses/${courseId}/review`, { method: "POST" });
}

// ═══════════════════════════════════════════════════
// PHASE 1: Schedule Conflict API
// ═══════════════════════════════════════════════════

export function checkScheduleConflicts(data) {
  return request("/api/schedules/check-conflicts", { method: "POST", body: JSON.stringify(data) });
}

// ═══════════════════════════════════════════════════
// PHASE 1: System Health & Admin Profile APIs
// ═══════════════════════════════════════════════════

export function getSystemHealth() {
  return request("/api/admin/system-health");
}

export function getAdminProfile() {
  return request("/api/admin/profile");
}

export function updateAdminProfile(data) {
  return request("/api/admin/profile", { method: "PATCH", body: JSON.stringify(data) });
}

export function changeAdminPassword(data) {
  return request("/api/admin/profile/change-password", { method: "POST", body: JSON.stringify(data) });
}

// ═══════════════════════════════════════════════════
// PHASE 2: Notification Engine APIs
// ═══════════════════════════════════════════════════

export function getNotificationHistory(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/admin/notifications/history${qs ? `?${qs}` : ""}`);
}

export function checkAutoTriggers() {
  return request("/api/admin/notifications/auto-triggers/check", { method: "POST" });
}

export function getDeadlineReminders() {
  return request("/api/teacher/deadline-reminders", { method: "POST" });
}

// ═══════════════════════════════════════════════════
// PHASE 3: AI/ML APIs
// ═══════════════════════════════════════════════════

export function analyzeSentiment(text) {
  return request("/api/ai/sentiment", { method: "POST", body: JSON.stringify({ text }) });
}

export function detectRiskFlags(text, description) {
  return request("/api/ai/risk-flags", { method: "POST", body: JSON.stringify({ text, description }) });
}

export function autoGradeAssessment(answers) {
  return request("/api/assessments/ai-grade", { method: "POST", body: JSON.stringify({ answers }) });
}

export function askEnhancedChatbot(message) {
  return request("/api/teacher/chatbot/enhanced", { method: "POST", body: JSON.stringify({ message }) });
}
// Daily Task Automation
// Daily Task Automation
export const generateDummyTeachers = async () => {
  const res = await fetch(`${API_BASE_URL}/api/daily-task-automation/teachers/generate-dummy`, { method: "POST" });
  return res.json();
};

export const uploadActivityBank = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/api/daily-task-automation/activities/upload`, {
    method: "POST",
    body: formData
  });
  return res.json();
};

export const generateDailyTasks = async ({ activityCount = 4, replaceExisting = false } = {}) => {
  const res = await fetch(`${API_BASE_URL}/api/daily-task-automation/generate-daily`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activityCount, replaceExisting })
  });
  return res.json();
};

export const getTodayAssignments = async () => {
  const res = await fetch(`${API_BASE_URL}/api/daily-task-automation/today`);
  return res.json();
};

export const getTeacherTodayTasks = async (teacherId) => {
  const res = await fetch(`${API_BASE_URL}/api/daily-task-automation/teacher/${teacherId}/today`);
  return res.json();
};

export const getTeacherNotifications = async (teacherId) => {
  const res = await fetch(`${API_BASE_URL}/api/daily-task-automation/teacher/${teacherId}/notifications`);
  return res.json();
};

export const updateTaskStatus = async (assignmentId, taskId, status) => {
  const res = await fetch(`${API_BASE_URL}/api/daily-task-automation/assignments/${assignmentId}/tasks/${taskId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  return res.json();
};
// ── Course Library (parsed from the .docx source of truth) ──
export function getCourseLibrary() {
  return request("/api/course-library");
}

export function getCourseLibraryDetail(libraryId) {
  return request(`/api/course-library/${libraryId}`);
}

// Admin: create an actual Course document from a library template (no video —
// modules/topics + notes are copied straight from the docx-derived library entry)
export function createCourseFromLibrary(libraryId) {
  return request("/api/courses/from-library", {
    method: "POST",
    body: JSON.stringify({ libraryId }),
  });
}

// ── Assessment bank + result persistence ──
export function getAssessmentBank(libraryId) {
  return request(`/api/assessment-bank/${libraryId}`);
}

// Teacher: submit a completed assessment attempt (persists to DB so admin can see it)
export function submitAssessmentResult(payload) {
  return request("/api/assessments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Teacher: fetch own past assessment results
export function getMyAssessmentResults() {
  return request("/api/assessments/mine");
}

// Admin: fetch every teacher's assessment results
export function getAdminAssessmentResults() {
  return request("/api/admin/assessments");
}


export async function downloadCertificatePdf(certificateId, filenameHint) {
  const token = localStorage.getItem("spaceece_auth_token");
  const res = await fetch(`${API_BASE_URL}/api/certificates/${certificateId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to download certificate");
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filenameHint || "certificate.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// Start: Dnyaneshwari Thorat
export async function viewCertificatePdf(certificateId) {
  const token = localStorage.getItem("spaceece_auth_token");
  const res = await fetch(`${API_BASE_URL}/api/certificates/${certificateId}/pdf?view=true`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Failed to view certificate");
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank");
}
// End: Dnyaneshwari Thorat
// ── Activity Bank API ──
export function createActivityBank(data) {
  return request("/api/daily-task-automation/activities", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

// ── Mentor Management APIs ──
export function updateMentorStatus(id, status) {
  return request(`/api/admin/mentors/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function updateMentorProfile(id, data) {
  return request(`/api/admin/mentors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function deleteMentor(id) {
  return request(`/api/admin/mentors/${id}`, {
    method: "DELETE"
  });
}


// ── Activity Bank: additional APIs ──
export function getActivityBank(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/api/daily-task-automation/activities?${searchParams.toString()}`);
}

export function getActivitySubmissions(params = {}) {
  const searchParams = new URLSearchParams(params);
  return request(`/api/daily-task-automation/activities/submissions?${searchParams.toString()}`);
}

export function submitActivityCompletion(assignmentId, taskId, payload) {
  return request(`/api/daily-task-automation/assignments/${assignmentId}/tasks/${taskId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteActivity(id) {
  return request(`/api/daily-task-automation/activities/${id}`, {
    method: "DELETE"
  });
}

export function blockMentor(id) {
  return request(`/api/admin/mentors/${id}/block`, {
    method: "PATCH"
  });
}

export function unblockMentor(id) {
  return request(`/api/admin/mentors/${id}/unblock`, {
    method: "PATCH"
  });
}

// ── Mentor APIs (missing stubs) ──
export function registerMentor(payload) {
  return request("/api/auth/register-mentor", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getAdminMentors() {
  return request("/api/admin/mentors");
}

export function getMyCenter() {
  return request("/api/mentor/center");
}

export function updateMentorMe(data) {
  return request("/api/mentor/me", {
    method: "PATCH",
    body: JSON.stringify(data)
  });
}

export function changeMentorPassword(currentPassword, newPassword) {
  return request("/api/mentor/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

// ── Mentor Tabs APIs ──
export function recordMenteeObservation(data) {
  return request("/api/mentor/observations", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function submitCapstoneMilestone(data) {
  return request("/api/mentor/capstone", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function submitPDCACycle(plan, doField, check, act) {
  return request("/api/mentor/pdca", {
    method: "POST",
    body: JSON.stringify({ plan, do: doField, check, act })
  });
}

export function generateAILessonPlan(data) {
     return request("/api/ai/generate-lesson-plan", {
       method: "POST",
       body: JSON.stringify(data),
     });
   }

   export function getCourseAssessment(courseId) {
  return request(`/api/courses/${courseId}/assessment`);
}
