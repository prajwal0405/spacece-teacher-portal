import { useState, useEffect, useRef } from "react";
import { Logo, Toast, Badge, StatusBadge, StatCard, SectionCard, S, globalCSS } from "../components/Shared";
import { t, setLanguage, getLanguageList, getCurrentLanguage, LANG_CHANGE_EVENT } from "../services/i18n";
// Start: Snehal change
import { updateTeacherNotificationPreference, getParentModules, getParentSessionAssignments, submitParentSessionFeedback } from "../services/api";
// End: Snehal change
import AttendanceManager from "./AttendanceManager";
import TrainingAndClassroomManager from "./TrainingAndClassroomManager";
import GeotagAttendance from "./GeotagAttendance";
import ProctoredAssessment from "./Proctoredassessment";      // now reading/notes based, same filename
import TeacherCourseNotes from "./TeacherCourseNotes";    // NEW — replaces the old video CoursesTab
import LessonPlannerTab from "./LessonPlannerTab";     
import {
  getTeacherProgress,
  getNotifications,
  markNotificationRead,
  askTeacherChatbot,
  updateCourseAssignmentProgress,
  resetCourseAssignmentProgress,
  updateTeacherMe,
  getTeacherMe,
  uploadFile,
  changeTeacherPassword,
  submitFeedback,
  getFeedbacks,
  updateTeacherLanguage,
  getTeacherCertificates,
  getTeacherChildren,
  createTeacherChild,
  getTeacherClasses
} from "../services/api";
// Start: Dnyaneshwari Thorat
import { downloadCertificatePdf, viewCertificatePdf } from "../services/api";
// Start: Dnyaneshwari Thorat
import { onSocketEvent } from "../services/socket";
// End: Dnyaneshwari Thorat
// End: Dnyaneshwari Thorat

/* Resolve a profile photo path to a full URL */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/* Returns teacher's real photo URL or DiceBear fallback */
const getTeacherPhotoUrl = (teacher) => {
  const photo = teacher?.teacherProfile?.profilePhoto || teacher?.teacherProfile?.photo || teacher?.photoUrl || teacher?.profilePhoto;
  if (!photo) return null;
  if (typeof photo === "string") return photo.startsWith("http") ? photo : `${API_BASE_URL}${photo}`;
  const url = photo.publicUrl || photo.url || photo.path;
  return url || null;
};

/* ── Sidebar Avatar Component ── */
function SidebarAvatar({ teacher, size = 34 }) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = getTeacherPhotoUrl(teacher);
  
  if (!photoUrl || imgError) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
        {teacher?.name?.[0] || "?"}
      </div>
    );
  }
  
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <img src={photoUrl} alt={teacher?.name} onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }} />
      <span style={{ position: "absolute", bottom: 0, right: 0, background: "#10b981", borderRadius: "50%", width: 12, height: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, border: "1.5px solid white" }}>📷</span>
    </div>
  );
}

/* ── Under Construction Placeholder ── */
function UnderConstructionTab({ label = "This page", icon = "🚧" }) {
  return (
    <div style={{ animation: "fadeIn 0.3s ease", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{
        background: "white",
        borderRadius: 20,
        padding: "48px 56px",
        textAlign: "center",
        border: "1px dashed #fbbf24",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        maxWidth: 460
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917", marginBottom: 8 }}>
          {label} is under work
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
          This section is currently being built and is not connected yet. Please check back soon — thank you for your patience!
        </div>
      </div>
    </div>
  );
}

/* ── OverviewTab ── */
function OverviewTab({ user, setActiveTab, courses = [], assignments = [], lessons = [], activities = [], summary = {} }) {
  const attendance = summary.attendanceRate !== undefined ? summary.attendanceRate : 0;
  const attColor   = attendance>=85 ? "#10b981" : attendance>=70 ? "#f59e0b" : "#ef4444";
  const photoUrl = getTeacherPhotoUrl(user);

  // Start: Dnyaneshwari Thorat
  const isVisibleCourse = (item) => {
    const title = item?.course?.title || item?.title || "";
    return !title.toLowerCase().includes("ai testing");
  };

  const isFinishedCourse = (item) =>
    item?.status === "completed" ||
    item?.status === "approved" ||
    item?.progressPercent === 100;

  const visibleAssignments = assignments.filter(isVisibleCourse);
  const activeAssignments = visibleAssignments.filter((item) => !isFinishedCourse(item));
  const featuredAssignments = visibleAssignments.slice(0, 5);
  const featuredCourseProgress = visibleAssignments.slice(0, 3);
  // End: Dnyaneshwari Thorat

  const certificatesCount = courses.filter(c => c.status === "completed" || c.progressPercent === 100).length;
  const pendingTasksCount = activeAssignments.filter(a => a.status === "assigned" || a.status === "revision").length;
  const gradedAssignments = visibleAssignments.filter(a => a.score !== null && a.score !== undefined);
  const averageScore = gradedAssignments.length ? Math.round(gradedAssignments.reduce((sum, a) => sum + Number(a.score || 0), 0) / gradedAssignments.length) : 0;
  const centerName = user.teacherProfile?.center
    ? [user.teacherProfile.center.name, user.teacherProfile.center.city].filter(Boolean).join(", ")
    : (user.workingCenter || "Center not assigned");
  const classNames = (user.teacherProfile?.classes || []).map(c => c?.name).filter(Boolean);
  const className = classNames.length > 0 ? classNames.join(", ") : "No class assigned";
  const studentsCount = summary.totalChildren || user.students || 0;
  
  // Get full class details for the assigned classes (use only classes array, ignore old class field)
  const allAssignedClasses = user.teacherProfile?.classes || [];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", borderRadius: 20, padding: "24px 28px", marginBottom: 24, color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Good morning, {user.name?.split(" ")[0] || "Teacher"}!</h1>
          <p style={{ fontSize: 13, margin: 0, opacity: 0.88 }}>{user.subject || user.teacherProfile?.subject || "Teacher"} - {className} - {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</p>
        </div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", border: "3px solid rgba(255,255,255,0.3)", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {photoUrl ? (
              <img src={photoUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{user.name?.[0] || "?"}</span>
            )}
          </div>
          {photoUrl && <span style={{ position: "absolute", bottom: 0, right: 0, background: "#10b981", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, border: "2px solid white" }}>📷</span>}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
        <span style={{ fontSize: 18 }}>@</span>
        <span>Working Center: {centerName}</span>
      </div>

      {/* ── My Assigned Class Section ── */}
      <div style={{ marginBottom: 20, marginTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📚</span> My Assigned Class
        </div>
        
        {allAssignedClasses.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {allAssignedClasses.map((cls, i) => (
              <div key={cls?._id || cls?.id || i} style={{
                background: "white", borderRadius: 14, padding: "16px",
                border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                borderLeft: "4px solid #f59e0b"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "linear-gradient(135deg,#fef3c7,#fbbf24)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, flexShrink: 0
                  }}>🏫</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{cls?.name || "Unknown Class"}</div>
                    {cls?.ageGroup && <div style={{ fontSize: 11, color: "#6b7280" }}>Age: {cls.ageGroup}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {cls?.curriculumLevel && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
                      <span style={{ color: "#f59e0b" }}>📚</span> {cls.curriculumLevel}
                    </div>
                  )}
                  {cls?.schedule && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
                      <span style={{ color: "#f59e0b" }}>⏰</span> {cls.schedule}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
                    <span style={{ color: "#f59e0b" }}>🏫</span> {centerName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: "white", borderRadius: 14, padding: "24px",
            border: "1px solid #e5e7eb", textAlign: "center"
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>No class assigned yet</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Contact admin to assign you to a class</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 16, marginBottom: 24, marginTop: 16 }}>
        <StatCard icon="ST" label="Total Students" val={studentsCount} color="#3b82f6" bg="#dbeafe"/>
        <StatCard icon="AT" label="Attendance" val={`${attendance}%`} color={attColor} bg={attendance>=85?"#d1fae5":attendance>=70?"#fef3c7":"#fee2e2"}/>
        <StatCard icon="GR" label="Avg Grade" val={gradedAssignments.length ? `${averageScore}%` : "N/A"} color="#8b5cf6" bg="#ede9fe"/>
        <StatCard icon="CE" label="Certificates" val={certificatesCount} color="#06b6d4" bg="#cffafe"/>
        <StatCard icon="TK" label="Pending Tasks" val={pendingTasksCount} color="#ef4444" bg="#fee2e2"/>
      </div>

      {/* Today's Activities Widget */}
      {(() => {
        const today = new Date().toISOString().split("T")[0];
        const todayLessons = lessons.filter(l => {
          const d = l.lessonPlan?.scheduleDate ? new Date(l.lessonPlan.scheduleDate).toISOString().split("T")[0] : "";
          return d === today;
        });
        // Start: Dnyaneshwari Thorat
        const todayAssignments = featuredAssignments;
        // End: Dnyaneshwari Thorat
        if (todayLessons.length === 0 && todayAssignments.length === 0) return null;
        return (
          <div style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)", borderRadius: 16, border: "1px solid #fcd34d", padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>📋</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#92400e" }}>Today's Activities</span>
              <span style={{ fontSize: 12, color: "#b45309", fontWeight: 600 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {todayLessons.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>📚 Lessons Today ({todayLessons.length})</div>
                  {todayLessons.map((l, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "white", borderRadius: 8, marginBottom: 6, border: "1px solid #fde68a" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: l.status === "completed" ? "#10b981" : "#f59e0b", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1917" }}>{l.lessonPlan?.title || "Lesson"}</div>
                      </div>
                      <StatusBadge status={l.status} />
                    </div>
                  ))}
                </div>
              )}
              {todayAssignments.length > 0 && (
                <div>
                  {/* Start: Dnyaneshwari Thorat */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>📘 Assigned Courses ({todayAssignments.length})</div>
                  {/* End: Dnyaneshwari Thorat */}
                  {todayAssignments.map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "white", borderRadius: 8, marginBottom: 6, border: "1px solid #fde68a" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.status === "revision" ? "#ef4444" : "#f59e0b", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        {/* Start: Dnyaneshwari Thorat */}
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1917" }}>{(a.course?.title || a.title || "Task").substring(0, 30)}</div>
                        {/* End: Dnyaneshwari Thorat */}
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <SectionCard title="My Attendance Summary">
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 220, paddingTop: 15 }}>
            {[{ month: "Current", val: attendance }].map((d, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <span style={{ marginBottom: 8, fontSize: 12, fontWeight: 800, color: d.val >= 90 ? "#10b981" : d.val >= 80 ? "#f59e0b" : "#ef4444" }}>{d.val}%</span>
                <div style={{ width: 36, height: `${d.val * 1.6}px`, borderRadius: "12px 12px 0 0", background: d.val >= 90 ? "linear-gradient(180deg,#34d399,#10b981)" : d.val >= 80 ? "linear-gradient(180deg,#fbbf24,#f59e0b)" : "linear-gradient(180deg,#f87171,#ef4444)", transition: "all .6s ease" }}/>
                <span style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{d.month}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Course Progress">
          {courses.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No assigned courses yet.</div>
          ) : (
            // Start: Dnyaneshwari Thorat
            featuredCourseProgress.map((c, i) => {
            // End: Dnyaneshwari Thorat
              const progress = c.progressPercent || 0;
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{c.course?.title?.split(" ").slice(0,3).join(" ") || "Course"}...</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#f59e0b" }}>{progress}%</span>
                  </div>
                  <div style={{ height: 6, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 2 }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#f59e0b,#d97706)", borderRadius: 4 }}/>
                  </div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{c.status || "Assigned"} · Due: {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "No deadline"}</div>
                </div>
              );
            })
          )}
          <button onClick={()=>setActiveTab("courses")} style={{ fontSize: 12, color: "#d97706", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 4 }}>View all courses →</button>
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <SectionCard title="Upcoming Lessons">
          {lessons.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No lessons assigned yet.</div>
          ) : (
            lessons.slice(0, 4).map((item) => (
              <div key={item._id} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.status === "completed" ? "#10b981" : "#f59e0b", marginTop: 5, flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{item.lessonPlan?.title || "Assigned lesson"}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{item.lessonPlan?.scheduleDate ? new Date(item.lessonPlan.scheduleDate).toLocaleDateString("en-IN") : "No date"}</div>
                </div>
                <StatusBadge status={item.status}/>
              </div>
            ))
          )}
          <button onClick={()=>setActiveTab("schedule")} style={{ fontSize: 12, color: "#d97706", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 8 }}>Full schedule {">"}</button>
        </SectionCard>

        <SectionCard title="Assignment Status">
          {assignments.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No assignments available.</div>
          ) : (
            assignments.slice(0, 4).map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: a.status==="approved"?"#10b981":a.status==="revision"?"#ef4444":"#f59e0b" }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1917" }}>{(a.title || a.course?.title || "Assignment").substring(0,28)}...</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No due date"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {a.score !== null && a.score !== undefined && <span style={{ fontSize: 11, fontWeight: 800, color: "#10b981" }}>{a.score}/100</span>}
                  <StatusBadge status={a.status}/>
                </div>
              </div>
            ))
          )}
          <button onClick={()=>setActiveTab("assignments")} style={{ fontSize: 12, color: "#d97706", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 8 }}>View all →</button>
        </SectionCard>
      </div>
    </div>
  );
}

/* NOTE: the old video-based `getCourseContent()` helper and `CoursesTab`
   component that used to live here have been removed. Course content is
   now topic-wise reading notes (no video), rendered by the imported
   `TeacherCourseNotes` component — see the "courses" case in
   renderContent() below. */

const formatTeacherDate = (value, options = {}) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", ...options });
};

const getAssignmentTitle = (item) => item.title || item.course?.title || "Assignment";
const isReviewedAssignment = (item) => item.score !== null && item.score !== undefined;
const isCertificateReady = (item) => item.status === "completed" || item.progressPercent === 100 || item.status === "approved" || item.status === "reviewed";

function ScheduleTab({ user, lessons = [] }) {
  const [filter, setFilter] = useState("all");
  const classNames = (user.teacherProfile?.classes || []).map(c => c?.name).filter(Boolean);
  const items = lessons
    .map((item) => ({
      id: item._id,
      title: item.lessonPlan?.title || "Assigned lesson",
      course: item.lessonPlan?.course?.title || "Training",
      date: item.lessonPlan?.scheduleDate || item.assignedDate,
      status: item.status || "pending",
      objectives: item.lessonPlan?.objectives || item.lessonPlan?.description || ""
    }))
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = items.filter((item) => item.date && new Date(item.date) >= today && item.status !== "completed");
  const completed = items.filter((item) => item.status === "completed").length;
  const visibleItems = items.filter((item) => {
    if (filter === "upcoming") return item.date && new Date(item.date) >= today && item.status !== "completed";
    if (filter === "completed") return item.status === "completed";
    if (filter === "pending") return item.status !== "completed";
    return true;
  });
  const filterBtn = (key, label) => (
    <button onClick={() => setFilter(key)} style={{ ...S.exportBtn, background: filter === key ? "#1e40af" : "white", color: filter === key ? "white" : "#6b7280", borderColor: filter === key ? "#1e40af" : "#e5e7eb" }}>
      {label}
    </button>
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Schedule</h1>
      <p style={S.pageSub}>Subject: {user.subject || user.teacherProfile?.subject || "Assigned teacher"} · {classNames.length > 0 ? classNames.join(", ") : "Class not assigned"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard icon="📅" label="Scheduled Lessons" val={items.length} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="⏳" label="Upcoming" val={upcoming.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Completed" val={completed} color="#10b981" bg="#d1fae5" />
      </div>
      <SectionCard title="Assigned Lesson Schedule">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {filterBtn("all", "All")}
          {filterBtn("upcoming", "Upcoming")}
          {filterBtn("pending", "Pending")}
          {filterBtn("completed", "Completed")}
        </div>
        {visibleItems.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", border: "1px dashed #cbd5e1", borderRadius: 12 }}>No lesson schedule found for this filter.</div>
        ) : visibleItems.map((item) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 16px", background: "white", borderRadius: 10, marginBottom: 8, border: "1px solid #f3f4f6", borderLeft: `4px solid ${item.status === "completed" ? "#10b981" : "#f59e0b"}` }}>
            <div style={{ width: 118, fontSize: 13, fontWeight: 800, color: "#d97706", flexShrink: 0 }}>{formatTeacherDate(item.date)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{item.course}</div>
              {item.objectives && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, lineHeight: 1.4 }}>{String(item.objectives).slice(0, 120)}</div>}
            </div>
            <StatusBadge status={item.status}/>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function GradesTab({ assignments = [] }) {
  const [filter, setFilter] = useState("all");
  const graded = assignments.filter(isReviewedAssignment);
  const average = graded.length ? Math.round(graded.reduce((sum, item) => sum + Number(item.score || 0), 0) / graded.length) : 0;
  const topScore = graded.length ? Math.max(...graded.map((item) => Number(item.score || 0))) : 0;
  const revisions = assignments.filter((item) => item.status === "revision").length;
  const visibleGrades = graded.filter((item) => {
    if (filter === "excellent") return Number(item.score || 0) >= 85;
    if (filter === "needs-work") return Number(item.score || 0) < 60;
    return true;
  });
  const filterBtn = (key, label) => (
    <button onClick={() => setFilter(key)} style={{ ...S.exportBtn, background: filter === key ? "#7c3aed" : "white", color: filter === key ? "white" : "#6b7280", borderColor: filter === key ? "#7c3aed" : "#e5e7eb" }}>
      {label}
    </button>
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>{t("Grades")}</h1>
      <p style={S.pageSub}>{t("Scores and feedback added by admin after review.")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard icon="%" label={t("Average Score")} val={graded.length ? average + "%" : "--"} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="#" label={t("Reviewed Assignments")} val={graded.length} color="#10b981" bg="#d1fae5" />
        <StatCard icon="★" label={t("Best Score")} val={graded.length ? topScore + "%" : "--"} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="↻" label={t("Needs Revision")} val={revisions} color="#ef4444" bg="#fee2e2" />
      </div>
      <SectionCard title={t("Reviewed Work")}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {filterBtn("all", t("All reviewed"))}
          {filterBtn("excellent", t("85% and above"))}
          {filterBtn("needs-work", t("Below 60%"))}
        </div>
        {visibleGrades.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", border: "1px dashed #cbd5e1", borderRadius: 12 }}>{t("No grades published for this filter.")}</div>
        ) : visibleGrades.map((item) => (
          <div key={item._id} style={{ padding: 14, border: "1px solid #f1f5f9", borderRadius: 10, marginBottom: 10, background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{getAssignmentTitle(item)}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{item.feedback || t("No written feedback added.")}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>{t("Reviewed:")} {formatTeacherDate(item.reviewedAt || item.updatedAt || item.createdAt)}</div>
              </div>
              <div style={{ minWidth: 92, textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: Number(item.score) >= 75 ? "#10b981" : Number(item.score) >= 60 ? "#f59e0b" : "#ef4444" }}>{item.score}/100</div>
                <StatusBadge status={item.status}/>
              </div>
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function AssignmentsTab({ assignments = [], onSubmitAssignment }) {
  const [filter, setFilter] = useState("all");
  const [uploadModal, setUploadModal] = useState(false);
  const [selectedFileObj, setSelectedFileObj] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFileObj(file);
      setSelectedFile({ name: file.name, size: (file.size / (1024 * 1024)).toFixed(2) + " MB" });
      if (!title) {
        setTitle(file.name.split(".")[0]);
      }
    }
  };

  const handleCloseModal = () => {
    setUploadModal(false);
    setSelectedFile(null);
    setSelectedFileObj(null);
    setSelectedAssignmentId(null);
    setNote("");
    setTitle("");
  };

  const handleSubmit = async () => {
    if (!selectedAssignmentId) return;
    setSubmitting(true);
    try {
      let uploadedFile = null;
      if (selectedFileObj) {
        const uploadRes = await uploadFile(selectedFileObj);
        if (uploadRes && uploadRes.asset) {
          uploadedFile = {
            asset: uploadRes.asset._id,
            name: uploadRes.asset.originalName || selectedFileObj.name,
            url: uploadRes.asset.publicUrl,
            uploadedAt: new Date().toISOString()
          };
        }
      }
      
      await onSubmitAssignment(selectedAssignmentId, {
        status: "submitted",
        title: title || undefined,
        feedback: note || "",
        submissionFiles: uploadedFile ? [uploadedFile] : undefined,
        score: null
      });
      handleCloseModal();
    } catch (err) {
      alert("Failed to submit assignment: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = assignments.filter(a => a.status === "assigned").length;
  const revisionCount = assignments.filter(a => a.status === "revision").length;
  const submittedCount = assignments.filter(a => a.status === "submitted" || a.status === "pending").length;
  const reviewedCount = assignments.filter(isReviewedAssignment).length;
  const visibleAssignments = assignments.filter((item) => {
    if (filter === "todo") return item.status === "assigned" || item.status === "revision";
    if (filter === "submitted") return item.status === "submitted" || item.status === "pending";
    if (filter === "reviewed") return isReviewedAssignment(item) || item.status === "approved" || item.status === "reviewed";
    return true;
  });
  const filterBtn = (key, label) => (
    <button onClick={() => setFilter(key)} style={{ ...S.exportBtn, background: filter === key ? "#d97706" : "white", color: filter === key ? "white" : "#6b7280", borderColor: filter === key ? "#d97706" : "#e5e7eb" }}>
      {label}
    </button>
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>My Assignments</h1>
          <p style={S.pageSub}>{pendingCount} assigned · {revisionCount} needs revision</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginBottom: 18 }}>
        <StatCard icon="✏️" label="To Submit" val={pendingCount + revisionCount} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="📤" label="Submitted" val={submittedCount} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="✅" label="Reviewed" val={reviewedCount} color="#10b981" bg="#d1fae5" />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {filterBtn("all", "All")}
        {filterBtn("todo", "To submit")}
        {filterBtn("submitted", "Submitted")}
        {filterBtn("reviewed", "Reviewed")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visibleAssignments.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", background: "white", borderRadius: 16, border: "1px dashed #cbd5e1", color: "#94a3b8" }}>
            No assignments assigned yet.
          </div>
        ) : (
          visibleAssignments.map(a => (
            <div key={a._id} style={{ background: "white", borderRadius: 14, padding: "16px 20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", borderLeft: `4px solid ${a.status==="approved"||a.status==="reviewed"?"#10b981":a.status==="revision"?"#ef4444":"#f59e0b"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 24 }}>{a.status==="approved"||a.status==="reviewed"?"✅":a.status==="revision"?"🔁":"📝"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>{getAssignmentTitle(a)}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{a.course?.title} · Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No deadline"}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {a.score !== null && a.score !== undefined && <span style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>{a.score}/100</span>}
                  <StatusBadge status={a.status}/>
                  {(a.status==="revision"||a.status==="assigned"||a.status==="pending") &&
                    <button
                      onClick={() => {
                        setSelectedAssignmentId(a._id);
                        setTitle(a.title || "");
                        setUploadModal(true);
                      }}
                      style={{ ...S.primaryBtn, padding: "6px 12px", fontSize: 12 }}
                    >
                      {a.status==="revision"?"Resubmit":a.status==="pending"?"Update Submission":"Submit"}
                    </button>
                  }
                </div>
              </div>
              {a.status==="revision" && a.feedback && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, fontSize: 12, color: "#991b1b" }}>
                  ⚠️ Revision required. Admin feedback: <b>{a.feedback}</b>
                </div>
              )}
              {a.status==="approved" && a.feedback && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, fontSize: 12, color: "#166534" }}>
                  ✓ Feedback: <b>{a.feedback}</b>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {uploadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "white", borderRadius: 20, padding: "28px", width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1c1917", margin: 0 }}>Submit Assignment</h3>
              <button onClick={handleCloseModal} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>
            <label style={S.label}>Assignment Title</label>
            <input style={{ ...S.input, marginBottom: 12 }} value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter assignment title"/>
            <label style={S.label}>Upload File</label>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.docx,.ppt,.pptx" style={{ display: "none" }}/>
            <div onClick={()=>fileInputRef.current?.click()} style={{ border: "2px dashed #fbbf24", borderRadius: 12, padding: "24px", textAlign: "center", marginBottom: 16, background: "#fffbeb", cursor: "pointer" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
              {selectedFile ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>📄 File Added Successfully!</div>
                  <div style={{ fontSize: 12, color: "#374151", marginTop: 4, fontWeight: 600, wordBreak: "break-all" }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Size: {selectedFile.size}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>Click to add from your device</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>PDF, DOCX, PPT up to 10MB</div>
                </>
              )}
            </div>
            <label style={S.label}>Notes (Optional)</label>
            <textarea style={{ ...S.input, height: 70, resize: "none", marginBottom: 20 }} value={note} onChange={e => setNote(e.target.value)} placeholder="Any notes for the reviewer..."/>
            <button onClick={handleSubmit} disabled={submitting} style={{ ...S.primaryBtn, width: "100%" }}>
              {submitting ? "Uploading & Submitting..." : "📤 Submit Assignment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CertificatesTab({ assignments = [], certificates: certs = [] }) {
  const displayCerts = certs.length > 0 ? certs : 
    assignments.filter((item) => item.status === "completed" || item.progressPercent === 100 || item.status === "approved");

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Certificates</h1>
      <p style={S.pageSub}>{displayCerts.length} certificate eligible course{displayCerts.length === 1 ? "" : "s"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
        {displayCerts.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", padding: 40, textAlign: "center", background: "white", borderRadius: 16, border: "1px dashed #cbd5e1", color: "#94a3b8" }}>
            Certificates will appear after an assigned course is completed and reviewed.
          </div>
        ) : displayCerts.map((item) => {
          const isRealCert = !!item.certificateNumber;
          const issuedDate = isRealCert ? item.issuedAt : (item.completedAt || item.updatedAt || item.createdAt);
          const courseTitle = item.course?.title || item.title || "Completed Course";
          const certId = isRealCert ? item.certificateNumber : `SPC-${String(item._id || "pending").slice(-8).toUpperCase()}`;
          return (
            <div key={item._id} style={{ background: isRealCert ? "linear-gradient(135deg,#fffbeb,#fef3c7)" : "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderRadius: 16, padding: "24px", border: isRealCert ? "2px solid #fbbf24" : "2px solid #86efac", boxShadow: isRealCert ? "0 4px 20px rgba(245,158,11,0.15)" : "0 4px 20px rgba(34,197,94,0.15)" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginBottom: 8, lineHeight: 1.4 }}>{courseTitle}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {isRealCert && item.grade && <Badge children={`Grade: ${item.grade}`} color="#059669" bg="#d1fae5"/>}
                {item.score !== null && item.score !== undefined && <Badge children={`Score: ${item.score}/100`} color="#059669" bg="#d1fae5"/>}
                <Badge children={issuedDate ? new Date(issuedDate).toLocaleDateString("en-IN") : "Date pending"} color="#d97706" bg="#fef3c7"/>
                {isRealCert && <Badge children={item.status === "issued" ? "Issued" : item.status} color="#7c3aed" bg="#ede9fe"/>}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>Credential ID: {certId}</div>
              {/* Start: Dnyaneshwari Thorat */}
              {isRealCert && (
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => viewCertificatePdf(item._id)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #d97706", background: "white", color: "#d97706", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                  >
                    👁️ View Certificate
                  </button>
                  <button
                    onClick={() => downloadCertificatePdf(item._id, `Certificate-${item.certificateNumber}.pdf`)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                  >
                    ⬇️ Download
                  </button>
                </div>
              )}
              {/* End: Dnyaneshwari Thorat */}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   PROFILE TAB  (Complete Implementation)
───────────────────────────────────────── */
function ProfileTab({ user, onWorkingCenterChange, onUserUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" | "error"
  
  const [profilePhoto, setProfilePhoto] = useState(user.photoUrl || null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  
  const teacherProfile = user.teacherProfile || {};
  const center = teacherProfile.center;
  const centerName = center && typeof center === "object" ? [center.name, center.city].filter(Boolean).join(", ") : user.workingCenter;

  const [form, setForm] = useState({
    name:          user.name          || "",
    phone:         user.phone         || "",
    address:       teacherProfile.address || user.address || "",
    workingCenter: centerName || "",
    subject:       teacherProfile.subject || user.subject || "",
    degree:        teacherProfile.qualification || user.qualification || "",
    expBio:        teacherProfile.experience || user.experience || ""
  });

  const [savedForm, setSavedForm] = useState({ ...form });

  useEffect(() => {
    if (user.photoUrl && user.photoUrl !== profilePhoto) {
      setProfilePhoto(user.photoUrl);
      setImageLoadError(false);
    }
  }, [user.photoUrl]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file (PNG/JPG/JPEG).");
      setMessageType("error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Image is too large. Please select a photo under 2MB.");
      setMessageType("error");
      return;
    }

    setUploadingPhoto(true);
    setMessage("");
    try {
      const uploadRes = await uploadFile(file);
      
      if (uploadRes && uploadRes.asset) {
        let photoUrl = uploadRes.asset.publicUrl;
        
        if (photoUrl.startsWith("/uploads/")) {
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
          photoUrl = `${API_BASE_URL}${photoUrl}`;
        }
        
        setProfilePhoto(photoUrl);
        setImageLoadError(false);
        
        const res = await updateTeacherMe({ photoUrl });
        
        if (res.teacher && onUserUpdate) {
          onUserUpdate(res.teacher);
        }
        
        setMessage("Profile picture updated successfully!");
        setMessageType("success");
      }
    } catch (error) {
      setMessage(error.message || "Failed to upload profile picture.");
      setMessageType("error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        photoUrl: profilePhoto,
        teacherProfile: {
          address: form.address,
          subject: form.subject,
          qualification: form.degree,
          experience: form.expBio
        }
      };
      console.log("Profile save payload:", payload);
      
      const res = await updateTeacherMe(payload);
      
      const updated = res.teacher || {};
      
      const updatedCenter = updated.teacherProfile?.center;
      const updatedCenterName = typeof updatedCenter === "object" ? [updatedCenter.name, updatedCenter.city].filter(Boolean).join(", ") : form.workingCenter;
      
      const nextForm = {
        ...form,
        name: updated.name || form.name,
        phone: updated.phone || form.phone,
        address: updated.teacherProfile?.address || form.address,
        subject: updated.teacherProfile?.subject || form.subject,
        degree: updated.teacherProfile?.qualification || form.degree,
        expBio: updated.teacherProfile?.experience || form.expBio,
        workingCenter: updatedCenterName
      };
      
      setForm(nextForm);
      setSavedForm(nextForm);
      
      if (updated.photoUrl && updated.photoUrl !== profilePhoto) {
        setProfilePhoto(updated.photoUrl);
      }
      
      if (onUserUpdate) {
        onUserUpdate(updated);
      }
      
      onWorkingCenterChange && onWorkingCenterChange(updatedCenterName);
      setMessage("Profile saved successfully!");
      setMessageType("success");
      setEditing(false);
    } catch (error) {
      setMessage(error.message || "Profile update failed.");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage("");
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage("Please fill in all password fields.");
      setMessageType("error");
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      setMessage("New password must be at least 8 characters long.");
      setMessageType("error");
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("New password and confirm password do not match.");
      setMessageType("error");
      return;
    }

    setChangingPassword(true);
    try {
      await changeTeacherPassword(passwordForm.currentPassword, passwordForm.newPassword);
      setMessage("Password changed successfully!");
      setMessageType("success");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage(error.message || "Failed to change password.");
      setMessageType("error");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...savedForm });
    setEditing(false);
    setMessage("");
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 800 }}>
      <Toast msg={message} type={messageType} onClose={() => { setMessage(""); setMessageType(""); }} />
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div>
          <h1 style={S.pageTitle}>My Profile</h1>
          <p style={S.pageSub}>View and manage your account information</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {editing && (
            <button onClick={handleCancel} style={S.exportBtn} disabled={saving}>✕ Cancel</button>
          )}
          <button
            onClick={editing ? handleSave : () => setEditing(true)}
            style={editing ? { ...S.primaryBtn, background: "linear-gradient(135deg,#10b981,#059669)", opacity: saving ? 0.7 : 1 } : S.primaryBtn}
            disabled={saving}
          >
            {editing ? (saving ? "💾 Saving..." : "💾 Save Changes") : "✏️ Edit Profile"}
          </button>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 16px" }}>📷 Profile Picture</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative" }}>
            {profilePhoto && !imageLoadError ? (
              <img 
                src={profilePhoto} 
                alt="Profile" 
                style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "3px solid #f59e0b" }}
                onError={(e) => {
                  console.error("Image failed to load:", profilePhoto);
                  console.error("Error event:", e);
                  setImageLoadError(true);
                }}
                onLoad={() => {
                  console.log("Image loaded successfully:", profilePhoto);
                  setImageLoadError(false);
                }}
              />
            ) : (
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: "white" }}>
                {form.name?.[0] || "U"}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: "50%", background: "#f59e0b", border: "2px solid white", color: "white", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? "⏳" : "📷"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: "none" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>
              {uploadingPhoto ? "Uploading..." : profilePhoto && !imageLoadError ? "Profile picture uploaded" : "No profile picture"}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Upload a professional photo (PNG/JPG, max 2MB)
            </div>
            {imageLoadError && (
              <div style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>
                Failed to load image
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 16px" }}>👤 Personal Information</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Full Name</label>
            {editing ? (
              <input 
                style={{ ...S.input, padding: "8px 12px", fontSize: 14, background: "white" }} 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
              />
            ) : (
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1c1917", padding: "8px 0" }}>{form.name}</div>
            )}
          </div>
          
          <div>
            <label style={S.label}>Email Address</label>
            <div style={{ fontSize: 14, color: "#6b7280", padding: "8px 0" }}>{user.email}</div>
          </div>
          
          <div>
            <label style={S.label}>Phone Number</label>
            {editing ? (
              <input 
                style={{ ...S.input, padding: "8px 12px", fontSize: 14, background: "white" }} 
                value={form.phone} 
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            ) : (
              <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>{form.phone || "Not added"}</div>
            )}
          </div>
          
          <div>
            <label style={S.label}>Subject Specialization</label>
            {editing ? (
              <input 
                style={{ ...S.input, padding: "8px 12px", fontSize: 14, background: "white" }} 
                value={form.subject} 
                onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Mathematics"
              />
            ) : (
              <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>{form.subject || "Not specified"}</div>
            )}
          </div>
        </div>
        
        <div>
          <label style={S.label}>Residential Address</label>
          {editing ? (
            <textarea 
              style={{ ...S.input, height: 80, fontSize: 14, background: "white", resize: "vertical" }} 
              value={form.address} 
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Your complete address"
            />
          ) : (
            <div style={{ fontSize: 14, color: "#374151", padding: "8px 0", lineHeight: 1.5 }}>{form.address || "Not added"}</div>
          )}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 16px" }}>💼 Professional Information</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Highest Qualification</label>
            {editing ? (
              <input 
                style={{ ...S.input, padding: "8px 12px", fontSize: 14, background: "white" }} 
                value={form.degree} 
                onChange={e => setForm({ ...form, degree: e.target.value })}
                placeholder="e.g. B.Ed, M.Ed"
              />
            ) : (
              <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>{form.degree || "Not specified"}</div>
            )}
          </div>
          
<div>
             <label style={S.label}>Working Center</label>
             <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>{form.workingCenter || "Not assigned"}</div>
             <div style={{ fontSize: 10, color: "#9ca3af", marginTop: -4 }}>(Assigned by admin)</div>
           </div>
        </div>
        
        <div>
          <label style={S.label}>Professional Work Experience</label>
          {editing ? (
            <textarea 
              style={{ ...S.input, height: 100, fontSize: 14, background: "white", resize: "vertical" }} 
              value={form.expBio} 
              onChange={e => setForm({ ...form, expBio: e.target.value })}
              placeholder="Describe your teaching experience, previous roles, and achievements..."
            />
          ) : (
            <div style={{ fontSize: 14, color: "#374151", padding: "8px 0", lineHeight: 1.6 }}>{form.expBio || "No experience details added"}</div>
          )}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 16px" }}>🔐 Account Information</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Account Status</label>
            <div style={{ padding: "8px 0" }}>
              <Badge children={user.status || "Active"} color={user.status === "approved" ? "#059669" : "#d97706"} bg={user.status === "approved" ? "#d1fae5" : "#fef3c7"} />
            </div>
          </div>
          
          <div>
            <label style={S.label}>Role</label>
            <div style={{ fontSize: 14, color: "#374151", padding: "8px 0", textTransform: "capitalize" }}>{user.role || "Teacher"}</div>
          </div>
          
          <div>
            <label style={S.label}>Batch/Cohort</label>
            <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>{user.batch || "SpacECE"}</div>
          </div>
          
          <div>
            <label style={S.label}>Member Since</label>
            <div style={{ fontSize: 14, color: "#374151", padding: "8px 0" }}>
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not available"}
            </div>
          </div>

<div>
              <label style={S.label}>{t("teacherLanguage")}</label>
              <div style={{ padding: "4px 0" }}>
                <select
                  style={{ ...S.input, padding: "6px 10px", background: "white", maxWidth: 160, fontSize: 12 }}
                  value={getCurrentLanguage()}
                  onChange={async (e) => {
                    const newLang = e.target.value;
                    setLanguage(newLang);
                    try {
                      await updateTeacherLanguage(newLang);
                      setMessage(t("Language") + " updated! Changes applied instantly.");
                      setMessageType("success");
                    } catch (err) {
                      console.error("Failed to save language preference:", err);
                      setMessage("Language updated locally");
                      setMessageType("success");
                    }
                  }}
                >
                  {getLanguageList().map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Language applies instantly — no reload needed.</div>
              </div>
            </div>

<div>
              <label style={S.label}>{t("preferredNotification") || "Preferred Notification Channel"}</label>
              <div style={{ padding: "4px 0" }}>
                <select
                  style={{ ...S.input, padding: "6px 10px", background: "white", maxWidth: 160, fontSize: 12 }}
                  value={user.preferredNotificationChannel || "in_app"}
                  onChange={async (e) => {
                    const newChannel = e.target.value;
                    try {
                      await updateTeacherNotificationPreference(newChannel);
                      setMessage("Notification preference saved!");
                      setMessageType("success");
                    } catch (err) {
                      console.error("Failed to save notification preference:", err);
                      setMessage("Notification preference updated locally");
                      setMessageType("success");
                    }
                  }}
                >
                  <option value="in_app">In-App Only</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="all">All Channels</option>
                </select>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Choose how you receive notifications.</div>
              </div>
            </div>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 20, padding: "28px", border: "1px solid #f1f5f9", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", margin: "0 0 16px" }}>🔒 Change Password</h3>
        
        <form onSubmit={handlePasswordChange}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={S.label}>Current Password</label>
              <div style={{ position: "relative" }}>
                <input 
                  style={{ ...S.input, paddingRight: "40px" }} 
                  type={showPassword.current ? "text" : "password"} 
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  disabled={changingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af" }}
                >
                  {showPassword.current ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            
            <div>
              <label style={S.label}>New Password</label>
              <div style={{ position: "relative" }}>
                <input 
                  style={{ ...S.input, paddingRight: "40px" }} 
                  type={showPassword.new ? "text" : "password"} 
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Min. 8 characters"
                  disabled={changingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af" }}
                >
                  {showPassword.new ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            
            <div>
              <label style={S.label}>Confirm New Password</label>
              <div style={{ position: "relative" }}>
                <input 
                  style={{ ...S.input, paddingRight: "40px" }} 
                  type={showPassword.confirm ? "text" : "password"} 
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  disabled={changingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af" }}
                >
                  {showPassword.confirm ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>
          
          <button 
            type="submit" 
            style={{ ...S.primaryBtn, background: "linear-gradient(135deg,#ef4444,#dc2626)", opacity: changingPassword ? 0.7 : 1 }}
            disabled={changingPassword}
          >
            {changingPassword ? "Updating Password..." : "🔒 Update Password"}
          </button>
        </form>
        
        <div style={{ marginTop: 12, padding: "12px", background: "#fef3c7", borderRadius: 8, border: "1px solid #fbbf24" }}>
          <div style={{ fontSize: 11, color: "#92400e", fontWeight: 700, marginBottom: 4 }}>🔐 Security Tips:</div>
          <ul style={{ fontSize: 11, color: "#78350f", margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
            <li>Use a strong password with at least 8 characters</li>
            <li>Include a mix of letters, numbers, and special characters</li>
            <li>Don't reuse passwords from other accounts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ notifications = [], onMarkRead, onMarkAllRead }) {
  // Start: Dnyaneshwari Thorat
  const icons = {
    // course-related
    course: "📚", course_assigned: "📚", course_allocated: "📚",
    // certificate
    certificate: "🏆", certificate_issued: "🏆", certificate_generated: "🏆",
    // lesson / session
    session: "📹", lesson: "📖", lesson_assigned: "📖",
    // assignment / task
    assignment: "📝", task: "📝", daily_task: "📝",
    // approvals
    approval: "✅", approved: "✅", status: "✅",
    // attendance
    attendance: "📋", attendance_alert: "⚠️",
    // general
    info: "ℹ️", warning: "⚠️", alert: "🔔", system: "⚙️",
  };
  const getIcon = (type) => {
    if (!type) return "🔔";
    const lower = String(type).toLowerCase();
    return icons[lower] || "🔔";
  };
  // End: Dnyaneshwari Thorat

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Notifications</h1>
          <p style={S.pageSub}>{notifications.filter(n=>!n.read).length} unread</p>
        </div>
        <button onClick={onMarkAllRead} style={S.exportBtn}>✓ Mark all read</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", background: "white", borderRadius: 16, border: "1px dashed #cbd5e1", color: "#94a3b8" }}>
            No notifications.
          </div>
        ) : (
          notifications.map(n=>(
            <div key={n.id} onClick={()=>!n.read && onMarkRead(n.id)} style={{ background: n.read?"white":"#fffbeb", borderRadius: 14, padding: "14px 18px", border: `1px solid ${n.read?"#f1f5f9":"#fbbf24"}`, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", borderLeft: `4px solid ${n.read?"#e5e7eb":"#f59e0b"}` }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: n.read?"#f3f4f6":"#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{getIcon(n.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: n.read?500:700, color: "#1c1917" }}>{n.msg}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{n.time}</div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }}/>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TeacherFeedbackTab({ user, setToast }) {
  const [rating, setRating]         = useState(0);
  const [trainerRating, setTRating] = useState(0);
  const [suggestion, setSuggestion] = useState("");
  const [course, setCourse]         = useState("");
  const [tag, setTag]               = useState("Content Quality");
  const [anonymous, setAnonymous]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [loading, setLoading]       = useState(true);

  const TAGS = ["Content Quality", "Platform UX", "Trainer", "Schedule", "Price"];
  const stars = (n, size=20) => Array.from({length:5},(_,i) => (
    <span key={i} style={{fontSize:size, cursor:"pointer", color: i < n ? "#f59e0b" : "#e5e7eb"}}>{i < n ? "★" : "☆"}</span>
  ));

  useEffect(() => {
    getFeedbacks()
      .then(data => {
        const mine = (data.feedbacks || []).filter(f =>
          (f.learner && f.learner !== "Anonymous" && f.learner === user.name) ||
          (f.teacherId && String(f.teacherId) === String(user._id))
        );
        setMyFeedbacks(mine);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setToast?.({ msg: "Please rate the course.", type: "error" }); return; }
    if (!suggestion.trim()) { setToast?.({ msg: "Please write your feedback.", type: "error" }); return; }
    setSubmitting(true);
    try {
      const trainerRatingPayload = trainerRating > 0 ? trainerRating : undefined;
      await submitFeedback({
        learner: anonymous ? "Anonymous" : user.name,
        teacherId: user._id,
        course: course || "General Training",
        ...(trainerRatingPayload !== undefined ? { trainerRating: trainerRatingPayload } : {}),
        rating,
        tag,
        suggestion,
        anonymous,
        status: "pending"
      });
      setToast?.({ msg: "Feedback submitted successfully! It will appear in your submissions once approved by admin.", type: "success" });
      setSuggestion(""); setRating(0); setTRating(0); setCourse(""); setAnonymous(false);
    } catch(err) {
      setToast?.({ msg: err.message || "Failed to submit feedback.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Submit Feedback</h1>
      <p style={S.pageSub}>Share your training experience and help us improve.</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <SectionCard title="📝 New Feedback">
          <form onSubmit={handleSubmit}>
            <label style={S.label}>Course / Training (optional)</label>
            <input style={{...S.input, marginBottom:12}} value={course} onChange={e=>setCourse(e.target.value)} placeholder="e.g. Child Development Basics"/>

            <label style={S.label}>Tag / Category</label>
            <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:12}}>
              {TAGS.map(tg => (
                <button type="button" key={tg} onClick={()=>setTag(tg)}
                  style={{padding:"5px 12px", borderRadius:20, border:"1.5px solid", fontSize:11, fontWeight:600, cursor:"pointer",
                    borderColor: tag===tg ? "#f59e0b" : "#e5e7eb",
                    background: tag===tg ? "#fef3c7" : "white",
                    color: tag===tg ? "#92400e" : "#6b7280"}}>
                  {tg}
                </button>
              ))}
            </div>

            <label style={S.label}>Course Rating *</label>
            <div style={{display:"flex", gap:4, marginBottom:12, cursor:"pointer"}}>
              {[1,2,3,4,5].map(i => (
                <span key={i} onClick={()=>setRating(i)} style={{fontSize:28, color: i<=rating?"#f59e0b":"#e5e7eb"}}>
                  {i<=rating?"★":"☆"}
                </span>
              ))}
              {rating > 0 && <span style={{fontSize:12, color:"#6b7280", marginLeft:8, alignSelf:"center"}}>{rating}/5</span>}
            </div>

            <label style={S.label}>Trainer Rating</label>
            <div style={{display:"flex", gap:4, marginBottom:12, cursor:"pointer"}}>
              {[1,2,3,4,5].map(i => (
                <span key={i} onClick={()=>setTRating(i)} style={{fontSize:22, color: i<=trainerRating?"#f59e0b":"#e5e7eb"}}>
                  {i<=trainerRating?"★":"☆"}
                </span>
              ))}
            </div>

            <label style={S.label}>Your Feedback *</label>
            <textarea style={{...S.input, height:100, resize:"vertical", marginBottom:12}}
              value={suggestion} onChange={e=>setSuggestion(e.target.value)}
              placeholder="Share your thoughts about the course content, trainer, or overall experience..."/>

            <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:16}}>
              <div onClick={()=>setAnonymous(!anonymous)}
                style={{width:38, height:22, borderRadius:11, background:anonymous?"#6366f1":"#e5e7eb", position:"relative", cursor:"pointer", transition:"background 0.3s"}}>
                <div style={{position:"absolute", top:2, left:anonymous?18:2, width:18, height:18, borderRadius:"50%", background:"white", transition:"left 0.3s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
              </div>
              <label style={{fontSize:12, color:"#374151", fontWeight:600, cursor:"pointer"}} onClick={()=>setAnonymous(!anonymous)}>
                🔒 Submit anonymously
              </label>
            </div>

            <button type="submit" disabled={submitting} style={{...S.primaryBtn, width:"100%"}}>
              {submitting ? "Submitting..." : "📤 Submit Feedback"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="📋 My Previous Submissions">
          {loading ? (
  <div style={{textAlign:"center", padding:30, color:"#9ca3af"}}>Loading...</div>
) : myFeedbacks.length === 0 ? (
  <div style={{textAlign:"center", padding:30, color:"#94a3b8"}}>
    <div style={{fontSize:36, marginBottom:8}}>💬</div>
    <div style={{fontSize:13}}>You haven't submitted any feedback yet.</div>
    <div style={{fontSize:11, marginTop:6, color:"#b45309"}}>
      Note: Submitted feedback appears here only after admin approval.
    </div>
  </div>
) : (
            <div style={{display:"flex", flexDirection:"column", gap:10}}>
              {myFeedbacks.map((f,i) => (
                <div key={f._id||i} style={{padding:"12px 14px", background:"#f9fafb", borderRadius:12, border:"1px solid #f3f4f6"}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                    <div style={{fontSize:13, fontWeight:700, color:"#1c1917"}}>{f.course || "General"}</div>
                    <StatusBadge status={f.status || "pending"}/>
                  </div>
                  <div style={{display:"flex", gap:4, marginBottom:6}}>
                    {[1,2,3,4,5].map(j=><span key={j} style={{fontSize:14, color:j<=f.rating?"#f59e0b":"#e5e7eb"}}>★</span>)}
                    <span style={{fontSize:11, color:"#6b7280", marginLeft:4}}>{f.rating}/5</span>
                  </div>
                  <div style={{fontSize:12, color:"#6b7280", fontStyle:"italic"}}>"{(f.suggestion||"").substring(0,80)}..."</div>
                  {f.adminResponse && (
                    <div style={{marginTop:8, padding:"6px 10px", background:"#f0f9ff", borderRadius:8, fontSize:11, color:"#0369a1"}}>
                      💬 Admin: {f.adminResponse}
                    </div>
                  )}
                  <div style={{fontSize:10, color:"#9ca3af", marginTop:6}}>
                    {f.tag} · {f.date || new Date(f.createdAt).toLocaleDateString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
// Snehal change: real sessions + status tracking + feedback connected to backend
/* ═══════════════════════════════════════════
   PARENT CAPACITY BUILDING TAB
═══════════════════════════════════════════ */
function ParentCapacityBuildingTab({ user, setToast }) {
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [sessionLang, setSessionLang] = useState("en");

  useEffect(() => {
    getParentModules({ lang: sessionLang })
      .then(res => {
        const list = res?.modules || [];
        setModules(list);
        if (list.length) setSelectedModuleId(prev => prev || list[0]._id);
      })
      .catch(() => setToast?.({ msg: "Failed to load modules.", type: "error" }));
  }, [sessionLang]);

  const selectedModule = modules.find(m => m._id === selectedModuleId);

  // Snehal change: real per-teacher session status, fetched from backend
  const [sessionAssignments, setSessionAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  const loadAssignments = () => {
    if (!selectedModuleId) return;
    setAssignmentsLoading(true);
    getParentSessionAssignments(selectedModuleId)
      .then(res => setSessionAssignments(res?.assignments || []))
      .catch(() => setToast?.({ msg: "Failed to load session status.", type: "error" }))
      .finally(() => setAssignmentsLoading(false));
  };

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModuleId]);

  const getAssignment = (sessionNumber) =>
    sessionAssignments.find(a => a.sessionNumber === sessionNumber);

  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const [sessionDetails, setSessionDetails] = useState({ date: "", duration: "", venue: "", parentsPresent: "" });
  const [participants, setParticipants] = useState([{ parentName: "", childName: "", contact: "", attendance: "Present" }]);
  const [feedback, setFeedback] = useState({
    parentParticipation: 0, parentEngagement: 0, understandingLevel: "Good",
    questionsAsked: "", challengesFaced: "", suggestions: "", overallRating: 0, remarks: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Snehal change: photo + attendance sheet upload state
  const [photoFile, setPhotoFile] = useState(null);
  const [attendanceFile, setAttendanceFile] = useState(null);
  const photoInputRef = useRef(null);
  const attendanceInputRef = useRef(null);

  const statusColor = (status) => {
    if (status === "Completed") return { c: "#059669", bg: "#d1fae5" };
    if (status === "In Progress") return { c: "#2563eb", bg: "#dbeafe" };
    return { c: "#d97706", bg: "#fef3c7" };
  };

  const openFeedback = (sess) => {
    const assignment = getAssignment(sess.sessionNumber);
    setSelectedSession(sess);
    setSelectedAssignment(assignment);
    setSessionDetails({ date: new Date().toISOString().split("T")[0], duration: "", venue: "", parentsPresent: "" });
    setParticipants([{ parentName: "", childName: "", contact: "", attendance: "Present" }]);
    setFeedback({ parentParticipation: 0, parentEngagement: 0, understandingLevel: "Good", questionsAsked: "", challengesFaced: "", suggestions: "", overallRating: 0, remarks: "" });
    setPhotoFile(null);
    setAttendanceFile(null);
    setFeedbackOpen(true);
  };

  const handleAddParticipant = () => {
    setParticipants([...participants, { parentName: "", childName: "", contact: "", attendance: "Present" }]);
  };

  const handleParticipantChange = (idx, field, value) => {
    const updated = [...participants];
    updated[idx][field] = value;
    setParticipants(updated);
  };

  // Snehal change: real submit — uploads files, then saves feedback + marks Completed
  const handleSubmitFeedback = async () => {
    if (!feedback.overallRating) {
      setToast?.({ msg: "Please give an overall session rating.", type: "error" });
      return;
    }
    if (!selectedAssignment?._id) {
      setToast?.({ msg: "Session assignment not found. Please refresh and try again.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      let photoUploadId, attendanceSheetUploadId;

      if (photoFile) {
        const photoRes = await uploadFile(photoFile);
        photoUploadId = photoRes?.asset?._id;
      }
      if (attendanceFile) {
        const attRes = await uploadFile(attendanceFile);
        attendanceSheetUploadId = attRes?.asset?._id;
      }

      await submitParentSessionFeedback(selectedAssignment._id, {
        sessionDetails,
        participants,
        feedback,
        photoUploadId,
        attendanceSheetUploadId
      });

      setToast?.({ msg: "Feedback submitted successfully!", type: "success" });
      setFeedbackOpen(false);
      setSelectedSession(null);
      setSelectedAssignment(null);
      loadAssignments();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to submit feedback.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const stars = (value, onChange, size = 22) => (
    <div style={{ display: "flex", gap: 4, cursor: "pointer" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} onClick={() => onChange(i)} style={{ fontSize: size, color: i <= value ? "#f59e0b" : "#e5e7eb" }}>{i <= value ? "★" : "☆"}</span>
      ))}
    </div>
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Parent Capacity Building</h1>
      <p style={S.pageSub}>Sessions assigned to you by the admin</p>

      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <select
          style={{ ...S.input, maxWidth: 340, border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", background: "white", fontWeight: 600, fontSize: 13, color: "#1c1917", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: "pointer", outline: "none" }}
          value={selectedModuleId}
          onChange={e => setSelectedModuleId(e.target.value)}
        >
          {modules.map(m => (
            <option key={m._id} value={m._id}>Module {m.moduleNumber}: {m.title}</option>
          ))}
        </select>

        <select
          style={{ ...S.input, maxWidth: 160, border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", background: "white", fontWeight: 600, fontSize: 13, color: "#1c1917", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: "pointer", outline: "none" }}
          value={sessionLang}
          onChange={e => setSessionLang(e.target.value)}
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>
      </div>

      {selectedModule && (
        <SectionCard title="">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {selectedModule.sessions.map(sess => {
              // Snehal change: pull real status for this session
              const assignment = getAssignment(sess.sessionNumber);
              const status = assignment?.status || "Pending";
              const sc = statusColor(status);
              return (
                <div key={sess.sessionNumber} style={{ background: "white", border: "1px solid #f1f5f9", borderRadius: 14, padding: "16px 20px", borderLeft: "4px solid #3b82f6" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917" }}>Session {sess.sessionNumber}: {sess.title}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{sess.objective}</div>
                    </div>
                    <Badge children={status} color={sc.c} bg={sc.bg} />
                  </div>

                  <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#fef3c7", textAlign: "left" }}>
                        <th style={{ padding: "6px 8px" }}>Time</th>
                        <th style={{ padding: "6px 8px" }}>Activity</th>
                        <th style={{ padding: "6px 8px" }}>Key Focus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sess.activities.map((a, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 8px" }}>{a.time}</td>
                          <td style={{ padding: "6px 8px" }}>{a.activity}</td>
                          <td style={{ padding: "6px 8px" }}>{a.keyFocus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sess.content?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Content</div>
                      {sess.content.map((block, ci) => (
                        <div key={ci} style={{ marginBottom: 8 }}>
                          {block.heading && <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{block.heading}</div>}
                          <div style={{ fontSize: 12, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{block.body}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {sess.reflection && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#1c1917", marginBottom: 6 }}>Reflection</div>
                      <div style={{ fontSize: 12, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{sess.reflection}</div>
                    </div>
                  )}
                  {sess.homePractice && (
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>Home Practice: {sess.homePractice}</div>
                  )}

                  {/* Snehal change: Mark as Completed / Start Session button */}
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    {status === "Completed" ? (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>✓ Session Completed</span>
                    ) : (
                      <button
                        onClick={() => openFeedback(sess)}
                        disabled={assignmentsLoading}
                        style={{ ...S.primaryBtn, padding: "8px 16px", fontSize: 12 }}
                      >
                        Mark as Completed
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {feedbackOpen && selectedSession && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "white", borderRadius: 20, padding: "28px", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1c1917", margin: 0 }}>Session Feedback — {selectedSession.title}</h3>
              <button onClick={() => setFeedbackOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>✕</button>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", marginBottom: 10 }}>Session Details</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={S.label}>Session Date</label>
                <input style={S.input} type="date" value={sessionDetails.date} onChange={e => setSessionDetails({ ...sessionDetails, date: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Duration</label>
                <input style={S.input} placeholder="e.g. 90 mins" value={sessionDetails.duration} onChange={e => setSessionDetails({ ...sessionDetails, duration: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Venue</label>
                <input style={S.input} value={sessionDetails.venue} onChange={e => setSessionDetails({ ...sessionDetails, venue: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Number of Parents Present</label>
                <input style={S.input} type="number" min="0" value={sessionDetails.parentsPresent} onChange={e => setSessionDetails({ ...sessionDetails, parentsPresent: e.target.value })} />
              </div>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", marginBottom: 10 }}>Participants</h4>
            {participants.map((p, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 100px", gap: 8, marginBottom: 8 }}>
                <input style={S.input} placeholder="Parent Name" value={p.parentName} onChange={e => handleParticipantChange(idx, "parentName", e.target.value)} />
                <input style={S.input} placeholder="Child Name" value={p.childName} onChange={e => handleParticipantChange(idx, "childName", e.target.value)} />
                <input style={S.input} placeholder="Contact Number" value={p.contact} onChange={e => handleParticipantChange(idx, "contact", e.target.value)} />
                <select style={S.input} value={p.attendance} onChange={e => handleParticipantChange(idx, "attendance", e.target.value)}>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
            ))}
            <button onClick={handleAddParticipant} style={{ ...S.exportBtn, marginBottom: 20 }}>+ Add Participant</button>

            {/* Snehal change: Photo + Attendance Sheet upload */}
            <h4 style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", marginBottom: 10 }}>Uploads</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={S.label}>Session Photo</label>
                <input type="file" ref={photoInputRef} accept="image/*" style={{ display: "none" }}
                  onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                <div onClick={() => photoInputRef.current?.click()} style={{ border: "2px dashed #fbbf24", borderRadius: 10, padding: "14px", textAlign: "center", cursor: "pointer", background: "#fffbeb" }}>
                  <div style={{ fontSize: 20 }}>📷</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: photoFile ? "#059669" : "#92400e" }}>
                    {photoFile ? photoFile.name : "Upload photo"}
                  </div>
                </div>
              </div>
              <div>
                <label style={S.label}>Attendance Sheet</label>
                <input type="file" ref={attendanceInputRef} accept="image/*,.pdf" style={{ display: "none" }}
                  onChange={e => setAttendanceFile(e.target.files?.[0] || null)} />
                <div onClick={() => attendanceInputRef.current?.click()} style={{ border: "2px dashed #fbbf24", borderRadius: 10, padding: "14px", textAlign: "center", cursor: "pointer", background: "#fffbeb" }}>
                  <div style={{ fontSize: 20 }}>📋</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: attendanceFile ? "#059669" : "#92400e" }}>
                    {attendanceFile ? attendanceFile.name : "Upload attendance sheet"}
                  </div>
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", marginBottom: 10 }}>Teacher Feedback</h4>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Parent Participation Rating</label>
              {stars(feedback.parentParticipation, (v) => setFeedback({ ...feedback, parentParticipation: v }))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Parent Engagement Rating</label>
              {stars(feedback.parentEngagement, (v) => setFeedback({ ...feedback, parentEngagement: v }))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Understanding Level</label>
              <select style={S.input} value={feedback.understandingLevel} onChange={e => setFeedback({ ...feedback, understandingLevel: e.target.value })}>
                <option>Excellent</option>
                <option>Good</option>
                <option>Average</option>
                <option>Poor</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Questions Asked</label>
              <textarea style={{ ...S.input, height: 60 }} value={feedback.questionsAsked} onChange={e => setFeedback({ ...feedback, questionsAsked: e.target.value })} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Challenges Faced</label>
              <textarea style={{ ...S.input, height: 60 }} value={feedback.challengesFaced} onChange={e => setFeedback({ ...feedback, challengesFaced: e.target.value })} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Suggestions</label>
              <textarea style={{ ...S.input, height: 60 }} value={feedback.suggestions} onChange={e => setFeedback({ ...feedback, suggestions: e.target.value })} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Overall Session Rating *</label>
              {stars(feedback.overallRating, (v) => setFeedback({ ...feedback, overallRating: v }), 26)}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Additional Remarks</label>
              <textarea style={{ ...S.input, height: 60 }} value={feedback.remarks} onChange={e => setFeedback({ ...feedback, remarks: e.target.value })} />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={S.exportBtn} onClick={() => setFeedbackOpen(false)}>Cancel</button>
              <button style={S.primaryBtn} disabled={submitting} onClick={handleSubmitFeedback}>{submitting ? "Submitting..." : "Submit Feedback"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/* ═══════════════════════════════════════════
   MAIN TEACHER DASHBOARD
═══════════════════════════════════════════ */
export default function TeacherDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab]         = useState("overview");
  const [toast, setToast]                 = useState({ msg: "", type: "" });
  const [currentUser, setCurrentUser]     = useState(user);
  const [workingCenter, setWorkingCenter] = useState(() => {
    const center = user?.teacherProfile?.center;
    if (typeof center === "object" && center?.name) {
      return [center.name, center.city].filter(Boolean).join(", ");
    }
    return user?.workingCenter || "";
  });

  const [courses, setCourses]             = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [lessons, setLessons]             = useState([]);
  const [activities, setActivities]       = useState([]);
  const [summary, setSummary]             = useState({});
  const [certificates, setCertificates]   = useState([]);
  const [teacherChildren, setTeacherChildren] = useState([]);
  const [teacherClasses, setTeacherClasses]  = useState([]);
  const [selectedChildClassId, setSelectedChildClassId] = useState("");
  const [childForm, setChildForm]         = useState({ name: "", age: "", gender: "Male", parentName: "", phone: "", email: "", address: "" });
  const [childSaving, setChildSaving]     = useState(false);
  const [loading, setLoading]            = useState(true);
  const [tabLoading, setTabLoading]      = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: "bot", text: `Hello ${user.name?.split(" ")[0] || "there"}! I'm your SpaceCE AI Assistant. How can I assist you with your class, attendance, courses, or lesson plans today?` }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const refreshCoreData = async () => {
    try {
      const [progressRes, notificationsRes, teacherRes, certificatesRes, classesRes] = await Promise.all([
        getTeacherProgress(),
        getNotifications(),
        getTeacherMe(),
        getTeacherCertificates(),
        getTeacherClasses(),
      ]);
      if (progressRes) {
        // Start: Dnyaneshwari Thorat
        const filteredCourses = (progressRes.courses || []).filter(c => {
          if (!c.course) return false;
          const title = c.course.title || "";
          return !title.toLowerCase().includes("ai testing");
        });
        setCourses(filteredCourses);
        // End: Dnyaneshwari Thorat
        setLessons(progressRes.lessons || []);
        setActivities(progressRes.activities || []);
        setSummary(progressRes.summary || {});
      }
      if (classesRes?.classes) {
        setTeacherClasses(classesRes.classes);
        if (!selectedChildClassId && classesRes.classes.length > 0) {
          setSelectedChildClassId(classesRes.classes[0]._id || classesRes.classes[0].id);
        }
      }
      if (notificationsRes?.notifications) {
        const mapped = notificationsRes.notifications.map(n => {
          let timeVal = "Just now";
          if (n.createdAt) {
            const diffMs = new Date() - new Date(n.createdAt);
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 60) timeVal = `${diffMins}m ago`;
            else {
              const diffHrs = Math.floor(diffMins / 60);
              if (diffHrs < 24) timeVal = `${diffHrs}h ago`;
              else timeVal = `${Math.floor(diffHrs / 24)}d ago`;
            }
          }
          return { id: n._id, type: n.type || "info", msg: n.body ? `${n.title}: ${n.body}` : n.title || "", time: timeVal, read: n.read };
        });
        setNotifications(mapped);
      }
      if (teacherRes?.teacher) setCurrentUser(teacherRes.teacher);
      if (certificatesRes?.certificates) setCertificates(certificatesRes.certificates);
    } catch (err) {
      console.error("Error fetching teacher dashboard data:", err);
    }
  };

  useEffect(() => {
    const center = currentUser?.teacherProfile?.center;
    if (center && typeof center === "object" && center.name) {
      const name = [center.name, center.city].filter(Boolean).join(", ");
      setWorkingCenter(name);
    } else if (currentUser?.workingCenter) {
      setWorkingCenter(currentUser.workingCenter);
    }
  }, [currentUser]);

  useEffect(() => {
    setLoading(true);
    refreshCoreData().finally(() => setLoading(false));
  }, [user]);

  // Start: Dnyaneshwari Thorat
  useEffect(() => {
    const unsubscribe = onSocketEvent("notification:new", (newNotif) => {
      let timeVal = "Just now";
      const mapped = {
        id: newNotif._id,
        type: newNotif.type || "info",
        msg: newNotif.body ? `${newNotif.title}: ${newNotif.body}` : newNotif.title || "",
        time: timeVal,
        read: newNotif.read
      };
      setNotifications((prev) => [mapped, ...prev]);
      setToast({ msg: `🔔 ${newNotif.title}`, type: "info" });
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);
  // End: Dnyaneshwari Thorat

  useEffect(() => {
    if (selectedChildClassId) {
      getTeacherChildren(selectedChildClassId)
        .then(res => { if (res?.children) setTeacherChildren(res.children); })
        .catch(err => console.error("Error loading children for class:", err));
    }
  }, [selectedChildClassId]);

  const handleTabSwitch = (tab) => {
    if (activeTab !== tab) setTabLoading(true);
    setActiveTab(tab);
    setTimeout(() => setTabLoading(false), 300);
  };

  const handleMarkDone = async (assignId, payload) => {
    try {
      await updateCourseAssignmentProgress(assignId, payload);
      setToast({ msg: "Progress saved! ✓", type: "success" });
      refreshCoreData();
    } catch (err) {
      setToast({ msg: "Failed to save progress.", type: "error" });
    }
  };

  const handleSubmitAssignment = async (assignId, payload) => {
    await updateCourseAssignmentProgress(assignId, payload);
    setToast({ msg: "Assignment submitted successfully! 📤", type: "success" });
    refreshCoreData();
  };

  // Start: Dnyaneshwari Thorat
  const handleRestartCourse = async (assignment) => {
    if (!assignment?._id) return;
    const title = assignment?.course?.title || assignment?.title || "this course";
    if (!window.confirm(`Restart ${title}? This will remove the certificate and reset course progress back to 0%.`)) return;
    try {
      await resetCourseAssignmentProgress(assignment._id);
      setToast({ msg: `Course restarted: ${title}`, type: "success" });
      await refreshCoreData();
    } catch (err) {
      console.error("Failed to reset course:", err);
      setToast({ msg: err.message || "Failed to restart course.", type: "error" });
    }
  };
  // End: Dnyaneshwari Thorat

  const handleMarkNotifRead = async (notifId) => {
    try {
      await markNotificationRead(notifId);
      refreshCoreData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotifRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => markNotificationRead(n.id)));
      setToast({ msg: "All notifications marked as read.", type: "success" });
      refreshCoreData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await askTeacherChatbot(userMsg);
      if (res && res.reply) {
        setChatMessages(prev => [...prev, { sender: "bot", text: res.reply }]);
      } else {
        setChatMessages(prev => [...prev, { sender: "bot", text: "I'm sorry, I'm having trouble connecting right now." }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: "bot", text: "Something went wrong. Please try again later." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const unreadCount = notifications.filter(n=>!n.read).length;
  const pendingAssignmentsCount = courses.filter(a=>a.status==="assigned"||a.status==="revision").length;

  const navItems = [
    { key: "overview",      label: "Teacher's Dashboard", icon: "📊" },
    { key: "children_att",  label: "Daily Attendance",    icon: "📋" },
    { key: "geotag",        label: "Geotag Attendance",   icon: "📍" },
    { key: "training",      label: "Training & Lessons",  icon: "🎓" },
    { key: "lesson_planner", label: "Lesson Planner", icon: "🗓️" },
    { key: "courses",       label: "My Courses",          icon: "📚" },
    { key: "parent_capacity", label: "Parent Capacity Building", icon: "👪" },
    { key: "assessment",    label: "Assessments",         icon: "📝" },
    //{ key: "schedule",      label: "Schedule",            icon: "📅" },
    //{ key: "grades",        label: "Grades",              icon: "📊" },
    //{ key: "assignments",   label: "Assignments",         icon: "✏️", badge: pendingAssignmentsCount },
    { key: "certificates",  label: "Certificates",        icon: "🏆" },
    { key: "notifications", label: "Notifications",       icon: "🔔", badge: unreadCount },
    { key: "feedback",      label: "Feedback",             icon: "💬" },
    { key: "profile",       label: "My Profile",          icon: "👤" },
  ];

  const enrichedUser = { ...currentUser, workingCenter };

  // Pages that are fully wired to backend/database and should render normally.
  // Every other page shows an "Under Construction" placeholder instead.
  // "courses" and "assessment" are now notes/assessment based (no video) —
  // both are fully wired, so they're included here.
  const WORKING_TABS = new Set(["overview", "children_att", "geotag", "profile", "training", "courses", "assessment", "certificates", "notifications", "feedback","lesson_planner", "parent_capacity"]);

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", fontSize: 16, fontWeight: 700, color: "#64748b" }}>
          🔄 Loading Portal Data...
        </div>
      );
    }
    if (tabLoading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
          🔄 Loading...
        </div>
      );
    }

    if (!WORKING_TABS.has(activeTab)) {
      const navItem = navItems.find(n => n.key === activeTab);
      return <UnderConstructionTab label={navItem ? t(navItem.label) : "This page"} icon={navItem?.icon || "🚧"} />;
    }

    switch(activeTab) {
      case "overview":      return <OverviewTab user={enrichedUser} setActiveTab={handleTabSwitch} courses={courses} assignments={courses} lessons={lessons} activities={activities} summary={summary}/>;
      case "children_att":  return <AttendanceManager user={enrichedUser}/>;
      case "geotag":        return <GeotagAttendance user={enrichedUser}/>;
      case "training":      return <TrainingAndClassroomManager user={enrichedUser}/>;
      case "lesson_planner": return <LessonPlannerTab user={enrichedUser} />;
      case "courses":
        return (
          <TeacherCourseNotes
            assignments={courses}
            onMarkDone={handleMarkDone}
            onGoToAssessment={() => handleTabSwitch("assessment")}
            onRestartCourse={handleRestartCourse}
          />
        );
      case "assessment":
        return <ProctoredAssessment assignments={courses} />;
      case "schedule":      return <ScheduleTab user={enrichedUser} lessons={lessons}/>;
      case "grades":        return <GradesTab assignments={courses}/>;
      case "assignments":   return <AssignmentsTab assignments={courses} onSubmitAssignment={handleSubmitAssignment}/>;
      case "parent_capacity": return <ParentCapacityBuildingTab user={enrichedUser} setToast={setToast} />;
      case "certificates":  return <CertificatesTab assignments={courses} certificates={certificates}/>;
      case "notifications": return <NotificationsTab notifications={notifications} onMarkRead={handleMarkNotifRead} onMarkAllRead={handleMarkAllNotifRead}/>;
      case "feedback":      return <TeacherFeedbackTab user={enrichedUser} setToast={setToast}/>;
      case "profile":       return <ProfileTab user={enrichedUser} onWorkingCenterChange={setWorkingCenter} onUserUpdate={setCurrentUser}/>;
      default:              return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI','Inter',-apple-system,sans-serif" }}>
      <style>{globalCSS}</style>
      <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast({msg:"",type:""})}/>

      <div style={{ width: 240, background: "white", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "2px 0 12px rgba(0,0,0,0.04)", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 16px 12px" }}>
          <Logo size={120}/>
          <div style={{ textAlign: "center", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe", margin: "6px auto 0", display: "inline-block", width: "fit-content" }}>
            🎓 {t("Teacher Panel")}
          </div>
        </div>
        <nav style={{ padding: "4px 10px", flex: 1 }}>
          {navItems.map(item=>(
            <button key={item.key} onClick={()=>setActiveTab(item.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "none", borderRadius: 10, background: activeTab===item.key?"#dbeafe":"transparent", color: activeTab===item.key?"#1e40af":"#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginBottom: 2, transition: "all 0.18s" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{t(item.label)}</span>
              {item.badge>0 && <span style={{ background: "#ef4444", color: "white", borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "1px 7px" }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
          <SidebarAvatar teacher={currentUser} size={34} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{currentUser.name?.split(" ")[0]}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.subject}</div>
          </div>
          <button onClick={onLogout} title={t("Sign Out")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af", padding: 4 }}>⏻</button>
        </div>
      </div>

      <div style={{ flex: 1, width: "0px", minWidth: "0px", padding: "28px 32px", overflowY: "auto", maxHeight: "100vh" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab("profile")}
            title={t("My Profile")}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 12px", borderRadius: 20,
              border: "1px solid #e2e8f0", background: "white",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              transition: "all 0.18s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(59,130,246,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}
          >
            <SidebarAvatar teacher={currentUser} size={28} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{currentUser.name?.split(" ")[0]}</span>
          </button>
        </div>
        {renderContent()}
      </div>

      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        {chatOpen && (
          <div style={{ width: 340, height: 460, background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(12px)", border: "1px solid #fbbf24", borderRadius: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.12)", marginBottom: 16, display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideUp 0.3s ease" }}>
            <div style={{ background: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)", padding: "16px 20px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>🤖</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "-0.2px" }}>SpaceCE Assistant</div>
                  <div style={{ fontSize: 10, opacity: 0.85, fontWeight: 700 }}>Online · Portal Helper</div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", color: "white", fontSize: 18, cursor: "pointer", padding: 0 }}>✕</button>
            </div>
            <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, background: "#fafbfc" }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: msg.sender === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: msg.sender === "user" ? "16px 16px 0 16px" : "16px 16px 16px 0",
                    background: msg.sender === "user" ? "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)" : "white",
                    color: msg.sender === "user" ? "white" : "#1c1917",
                    fontSize: 12.5,
                    fontWeight: 600,
                    lineHeight: 1.45,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    border: msg.sender === "user" ? "none" : "1px solid #f1f5f9"
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "white", padding: "12px 18px", borderRadius: "16px 16px 16px 0", border: "1px solid #f1f5f9", display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ width: 6, height: 6, background: "#d97706", borderRadius: "50%", display: "inline-block", animation: "bounce 1.4s infinite ease-in-out both" }} />
                    <span style={{ width: 6, height: 6, background: "#d97706", borderRadius: "50%", display: "inline-block", animation: "bounce 1.4s infinite ease-in-out both 0.2s" }} />
                    <span style={{ width: 6, height: 6, background: "#d97706", borderRadius: "50%", display: "inline-block", animation: "bounce 1.4s infinite ease-in-out both 0.4s" }} />
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: 12, background: "white", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Ask about attendance, courses..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendChatMessage()}
                style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 12px", fontSize: 12, outline: "none", fontWeight: 600 }}
              />
              <button
                onClick={handleSendChatMessage}
                style={{ background: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)", border: "none", color: "white", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(217,119,6,0.3)" }}
              >
                ➔
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)",
            border: "none",
            color: "white",
            fontSize: 24,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(217,119,6,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s ease"
          }}
        >
          💬
        </button>
      </div>
    </div>
  );
}
