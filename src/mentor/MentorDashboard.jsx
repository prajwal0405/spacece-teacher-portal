import { useState, useEffect, useMemo } from "react";
import { Logo, Toast, Badge, StatusBadge, StatCard, SectionCard, S, globalCSS, BarChart } from "../components/Shared";
import { t } from "../services/i18n";
import { getStoredSession, getMyCenter, getMentorMe } from "../services/api";
import { MentorProfileTab, MentorNotificationsTab, MentorFeedbackTab, ImpactCapstoneTab, PDCATab } from "./MentorDashboardTabs";
import TeacherActivitiesTab from "./TeacherActivitiesTab";
import MentorAttendanceTab from "./MentorAttendanceTab";
import TeacherCurriculumTab from "./TeacherCurriculumTab";
import TeacherManagementTab from "./TeacherManagementTab";
import AttendanceTab from "../admin/AttendanceTab";
import { getPDCACycles, getCapstoneSubmissions, getTeacherObservations } from "../services/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getMentorPhotoUrl = (user) => {
  const photo = user?.mentorProfile?.profilePhoto || user?.mentorProfile?.photo || user?.photoUrl || user?.profilePhoto;
  if (!photo) return null;
  if (typeof photo === "string") return photo.startsWith("http") ? photo : `${API_BASE_URL}${photo}`;
  const url = photo.publicUrl || photo.url || photo.path;
  return url || null;
};

/* ── Placeholder for tabs ── */
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

function buildMonthlyRegistrations(teachers) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.toLocaleString("en-IN", { month: "short" });
    const count = teachers.filter((t) => {
      const d = t.createdAt ? new Date(t.createdAt) : null;
      return d && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    }).length;
    months.push({ month, val: count });
  }
  return months;
}

function DonutChart({ value, max, color, size = 64 }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const r = 24, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={6} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="11" fontWeight="800" fill={color}>{pct}%</text>
    </svg>
  );
}

function ActivityItem({ icon, text, time, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f8fafc" }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}15`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#1c1917", lineHeight: 1.4 }}>{text}</div>
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{time}</div>
      </div>
    </div>
  );
}


function getTeacherScore(t) {
  if (t.teacherProfile?.performanceRating > 0) return Math.round(t.teacherProfile.performanceRating * 20);
  let dynamicScore = 0;
  const tp = t.teacherProfile || {};
  if (tp.communityProfilingStatus === "completed") dynamicScore += 25;
  if (tp.communityImmersionStatus === "completed") dynamicScore += 25;
  if (tp.curriculumImplementationStatus === "completed") dynamicScore += 25;
  if (tp.coursesCompleted > 0 && tp.coursesAssigned > 0) {
      dynamicScore += Math.round((tp.coursesCompleted / tp.coursesAssigned) * 25);
  } else if (tp.coursesCompleted > 0) {
      dynamicScore += 25;
  }
  return dynamicScore > 100 ? 100 : dynamicScore;
}

function getInitialsAvatar(name, i) {
  const initials = (name || "T").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["#ef4444", "#ef4444", "#ef4444", "#8b5cf6", "#3b82f6"];
  const color = colors[i % colors.length];
  return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, flexShrink: 0, boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
      {initials}
    </div>
  );
}

function OverviewTab({ user, workingCenter }) {
  const [pdcaCount, setPdcaCount] = useState(0);
  const [capstoneSubmissionsCount, setCapstoneCount] = useState(0);
  const [observationsCount, setObservationsCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  
  useEffect(() => {
    Promise.all([
      getPDCACycles().catch(()=>({cycles:[]})),
      getCapstoneSubmissions().catch(()=>({submissions:[]})),
      getTeacherObservations().catch(()=>({observations:[]}))
    ]).then(([pdcaRes, capRes, obsRes]) => {
      const pdcas = pdcaRes.cycles || [];
      const caps = capRes.submissions || [];
      const obs = obsRes.observations || [];
      
      setPdcaCount(pdcas.filter(p => p.status === "Completed").length);
      setCapstoneCount(caps.length);
      setObservationsCount(obs.length);
      
      const merged = [
        ...pdcas.map(p => ({
          id: "pdca_" + p._id,
          title: "Completed PDCA Cycle",
          date: new Date(p.createdAt || p.date),
          type: "pdca"
        })),
        ...caps.map(c => ({
          id: "cap_" + c._id,
          title: `Submitted Capstone Milestone ${c.milestone}`,
          date: new Date(c.createdAt || c.submittedAt),
          type: "capstone"
        })),
        ...obs.map(m => ({
          id: "obs_" + m._id,
          title: "Logged an Observation",
          date: new Date(m.createdAt || m.date),
          type: "observation"
        }))
      ].sort((a, b) => b.date - a.date).slice(0, 10);
      
      const activityMap = merged.map(item => {
        if (item.type === "pdca") return { icon: "🔄", text: item.title, time: item.date.toLocaleDateString(), color: "#3b82f6" };
        if (item.type === "capstone") return { icon: "🎓", text: item.title, time: item.date.toLocaleDateString(), color: "#10b981" };
        return { icon: "👁️", text: item.title, time: item.date.toLocaleDateString(), color: "#8b5cf6" };
      });
      setRecentActivities(activityMap);
    });
  }, []);

  const mentees = user?.mentorProfile?.assignedTeachers || [];
  const monthlyReg = useMemo(() => buildMonthlyRegistrations(mentees), [mentees]);
  
  const pendingMentees = mentees.filter(t => t.teacherProfile?.communityProfilingStatus === "pending" || t.teacherProfile?.communityImmersionStatus === "pending");
  const addedThisMonth = monthlyReg.length > 0 ? monthlyReg[monthlyReg.length - 1].val : 0;
  
  const totalCoursesAssigned = mentees.reduce((acc, t) => acc + (t.teacherProfile?.coursesAssigned || 1), 0);
  const totalCoursesCompleted = mentees.reduce((acc, t) => acc + (t.teacherProfile?.coursesCompleted || 0), 0);
  const courseCompletionPercent = totalCoursesAssigned > 0 ? Math.round((totalCoursesCompleted / totalCoursesAssigned) * 100) : 0;
  
  const pendingActivities = pdcaCount + capstoneSubmissionsCount; // Example stat

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Hero Header */}
      <div style={{ background: "linear-gradient(135deg,#f59e0b 0%,#d97706 60%,#b45309 100%)", borderRadius: 20, padding: "28px 32px", marginBottom: 24, color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", bottom: -20, right: 80, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fffbeb", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>
                SpacECE Mentor Panel
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
                Good morning, {user.name?.split(" ")[0] || "Mentor"}! ☀️
              </h1>
              <p style={{ fontSize: 13, margin: 0, color: "rgba(255,255,255,0.85)" }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              {pendingMentees.length > 0 && (
                <div style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fee2e2" }}>{pendingMentees.length}</div>
                  <div style={{ fontSize: 10, color: "#fee2e2", fontWeight: 700 }}>Pending Review</div>
                </div>
              )}
              <div style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>{mentees.length}</div>
                <div style={{ fontSize: 10, color: "white", fontWeight: 700 }}>Active Teachers</div>
              </div>
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div style={{ display: "flex", gap: 20, marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap" }}>
            {[
              { label: "Centers",          val: workingCenter ? 1 : 0, icon: "🏫" },
              { label: "Children",         val: mentees.length * 15, icon: "👶" }, // mock
              { label: "Course Completion",val: `${courseCompletionPercent}%`, icon: "📚" },
              { label: "PDCA Completed",   val: pdcaCount,       icon: "🔄" },
              { label: "Pending Reviews",  val: pendingMentees.length, icon: "⏳" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white", lineHeight: 1 }}>{item.val}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{item.label}</div>
                </div>
                {i < 4 && <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)", marginLeft: 12 }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { icon: "🏫", label: "Total Centers",     val: workingCenter ? 1 : 0, color: "#f59e0b", bg: "#fef3c7", sub: workingCenter?.name || "None" },
          { icon: "👩‍🏫", label: "Total Teachers",   val: mentees.length, color: "#10b981", bg: "#d1fae5", sub: `+${addedThisMonth} this month` },
          { icon: "⏳", label: "Pending Reviews", val: pendingMentees.length, color: "#ef4444", bg: "#fee2e2", sub: pendingMentees.length > 0 ? "Need attention" : "All clear ✨" },
          { icon: "👶", label: "Total Children",    val: mentees.length * 15, color: "#3b82f6", bg: "#dbeafe", sub: "Active enrollments" },
          { icon: "📚", label: "Course Completion", val: `${courseCompletionPercent}%`, color: "#06b6d4", bg: "#cffafe", sub: "Assigned vs done" },
          { icon: "🔄", label: "PDCA Cycles",val: pdcaCount, color: "#8b5cf6", bg: "#ede9fe", sub: "Completed" },
        ].map((s, i) => (
          <div key={i} style={{ background: "white", borderRadius: 16, padding: "18px 20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderTop: `3px solid ${s.color}` }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#1c1917", letterSpacing: "-1px", lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, marginTop: 3 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Teacher Registration Chart */}
        <SectionCard title="📊 Assigned Teacher Trend — Last 6 Months">
          {mentees.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13, padding: "20px 0", textAlign: "center" }}>No teacher records yet.</div>
          ) : (
            <>
              <BarChart data={monthlyReg} color="#f59e0b" height={150} />
              <div style={{ display: "flex", gap: 12, marginTop: 16, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
                {[
                  { label: "Total",    val: mentees.length,          color: "#374151" },
                  { label: "Active", val: mentees.length,  color: "#10b981" },
                  { label: "Pending Review",  val: pendingMentees.length,   color: "#f59e0b" }
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px", background: "#f9fafb", borderRadius: 8 }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        {/* Operational Summary */}
        <SectionCard title="🚀 Mentorship Summary">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Teacher PDCA Tasks",  val: pdcaCount, max: Math.max(pdcaCount + pendingActivities, 1),  color: "#10b981" },
              { label: "Course Completion Rate",    val: courseCompletionPercent,       max: 100, color: "#3b82f6" },
              { label: "Capstone Progress",           val: capstoneSubmissionsCount,       max: 4, color: "#f59e0b" },
              { label: "Pending Reviews",   val: pendingMentees.length,       max: mentees.length || 1,                        color: "#8b5cf6" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <DonutChart value={item.val} max={item.max} color={item.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: item.color, fontWeight: 800, marginTop: 2 }}>{item.val} / {item.max}</div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Bottom Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        {/* Top Teachers Leaderboard */}
        <SectionCard title="🏆 Top Performing Teachers">
          {mentees.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No approved teachers yet.</div>
          ) : [...mentees].map(t => ({...t, dynamicScore: getTeacherScore(t)})).sort((a,b)=> b.dynamicScore - a.dynamicScore).slice(0,5).map((t, i) => {
            const score = t.dynamicScore;
            const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
            return (
              <div key={t._id || `teacher-${i}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{medals[i]}</span>
                  {getInitialsAvatar(t.name, i)}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>{t.teacherProfile?.center?.name || "Spacece Mumbai Center"}</div>
                    <div style={{ height: 4, background: "#f3f4f6", borderRadius: 4, overflow: "hidden", width: 140 }}>
                      <div style={{ height: "100%", width: `${score}%`, background: score > 0 ? "#10b981" : "#f59e0b", borderRadius: 4, transition: "width 0.8s" }} />
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900, color: score > 0 ? "#10b981" : "#f59e0b", flexShrink: 0 }}>{score}%</span>
              </div>
            );
          })}
        </SectionCard>

        {/* Working Center */}
        <SectionCard title="🏫 Working Center">
          {!workingCenter ? (
            <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No center assigned.</div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10,
                background: "linear-gradient(135deg,#fef3c7,#fbbf24)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏫</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workingCenter.name}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>{workingCenter.city || "--"}</div>
              </div>
              <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                background: "#d1fae5", color: "#065f46", flexShrink: 0 }}>
                Active
              </span>
            </div>
          )}
        </SectionCard>

        {/* Recent Activity */}
        <SectionCard title="⚡ Recent Activity">
          {recentActivities.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No recent activity.</div>
          ) : recentActivities.map((a, i) => (
            <ActivityItem key={i} {...a} />
          ))}
        </SectionCard>
      </div>
    </div>
  );
}


export default function MentorDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [workingCenter, setWorkingCenter] = useState(null);
  const [toast, setToast] = useState({ msg: "", type: "" });
  
  useEffect(() => {
    getMyCenter().then(res => {
      if (res.center) setWorkingCenter(res.center);
    }).catch(err => console.error("Failed to load working center", err));

    // start dnyaneshwari thorat
    getMentorMe().then(res => {
      if (res.mentor) setCurrentUser(res.mentor);
    }).catch(err => console.error("Failed to load mentor profile", err));
    // end dnyaneshwari thorat
  }, []);

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("spaceece_auth_token");
        const res = await fetch(`${API_BASE_URL}/api/notifications`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setNotifications(data.notifications.map(n => ({
            id: n._id,
            type: n.type || "info",
            msg: n.body,
            title: n.title,
            time: new Date(n.createdAt).toLocaleTimeString(),
            read: n.read
          })) || []);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkNotifRead = async (id) => {
    try {
      const token = localStorage.getItem("spaceece_auth_token");
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleMarkAllNotifRead = async () => {
    try {
      const token = localStorage.getItem("spaceece_auth_token");
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };
  
  const unreadCount = notifications.filter(n=>!n.read).length;
  
  const navItems = [
    { key: "overview", label: "Overview", icon: "📊" },
    { key: "my_attendance", label: "My Attendance", icon: "📍" },
    { key: "attendance", label: "Teacher Attendance", icon: "👥" },
    { key: "teachers", label: "Teacher Management", icon: "👩‍🏫" },
    { key: "activities", label: "Teacher Activities", icon: "🎯" },
    { key: "curriculum", label: "Curriculum Management", icon: "📚" },
    { key: "impact", label: "Impact & Capstone", icon: "🏆" },
    { key: "documentation", label: "Documentation (PDCA)", icon: "📝" },
    { key: "feedback", label: "Feedback", icon: "💬" },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case "overview": return <OverviewTab user={currentUser} workingCenter={workingCenter} />;
      case "my_attendance": return <MentorAttendanceTab user={currentUser} setToast={setToast} />;
      case "attendance": return <AttendanceTab teachers={currentUser?.mentorProfile?.assignedTeachers || []} sessions={[]} isMentorView={true} />;
      case "teachers": return <TeacherManagementTab setToast={setToast} onTeacherAssigned={() => {
        getMentorMe().then(res => {
          if (res.mentor) setCurrentUser(res.mentor);
        }).catch(err => console.error(err));
      }} />;
      case "activities": return <TeacherActivitiesTab user={currentUser} setToast={setToast} />;
      case "curriculum": return <TeacherCurriculumTab user={currentUser} setToast={setToast} />;
      case "impact": return <ImpactCapstoneTab user={currentUser} setToast={setToast} onUserUpdate={setCurrentUser} />;
      case "documentation": return <PDCATab user={currentUser} setToast={setToast} onUserUpdate={setCurrentUser} />;
      case "notifications": return <MentorNotificationsTab notifications={notifications} onMarkRead={handleMarkNotifRead} onMarkAllRead={handleMarkAllNotifRead} />;
      case "feedback": return <MentorFeedbackTab user={currentUser} setToast={setToast} />;
      case "profile": return <MentorProfileTab user={currentUser} onWorkingCenterChange={setWorkingCenter} onUserUpdate={setCurrentUser} />;
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc", fontFamily: "'Segoe UI','Inter',-apple-system,sans-serif" }}>
      <style>{globalCSS}</style>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />
      
      {/* Sidebar - Matching Teacher Dashboard */}
      <div style={{ width: 240, background: "white", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "2px 0 12px rgba(0,0,0,0.04)", position: "relative", height: "100vh" }}>
        <div style={{ padding: "20px 16px 12px" }}>
          <Logo size={120}/>
          <div style={{ textAlign: "center", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "#dbeafe", color: "#1e40af", border: "1px solid #bfdbfe", margin: "6px auto 0", display: "inline-block", width: "fit-content" }}>
            🎓 {t("Mentor Panel")}
          </div>
        </div>
        <nav style={{ padding: "4px 10px", flex: 1, overflowY: "auto", marginBottom: 80 }}>
          {navItems.map(item=>(
            <button key={item.key} onClick={()=>setActiveTab(item.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", border: "none", borderRadius: 10, background: activeTab===item.key?"#dbeafe":"transparent", color: activeTab===item.key?"#1e40af":"#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "left", marginBottom: 2, transition: "all 0.18s" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{t(item.label)}</span>
              {item.badge > 0 && <span style={{ background: "#ef4444", color: "white", borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "1px 7px" }}>{item.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{ 
          position: "fixed", bottom: 0, left: 0, width: 240,
          padding: "12px 16px", borderTop: "1px solid #f1f5f9", 
          display: "flex", alignItems: "center", gap: 10, background: "white", zIndex: 50
        }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#f59e0b", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
            {(currentUser.name || "M").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917" }}>{currentUser.name?.split(" ")[0]}</div>
            <div style={{ fontSize: 10, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Mentor</div>
          </div>
          <button onClick={onLogout} title={t("Sign Out")} 
            style={{ 
              background:"transparent", border:"none", cursor:"pointer", 
              fontSize:22, color:"#ef4444", padding:"8px", 
              borderRadius: "8px", transition: "all 0.2s ease",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
            onMouseEnter={(e)=>e.currentTarget.style.background="#fee2e2"}
            onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}
          >🚪</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, width: "0px", minWidth: "0px", padding: "28px 32px", overflowY: "auto", maxHeight: "100vh" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, position: "relative" }}>
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              padding: "6px 12px", borderRadius: 20, background: "#fef3c7",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #fbbf24",
              transition: "all 0.2s ease", position: "relative"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#fde68a"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#fef3c7"}
          >
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4, background: "#ef4444", color: "white",
                borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 10, fontWeight: "bold", border: "2px solid white"
              }}>
                {unreadCount}
              </span>
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>{currentUser.name?.split(" ")[0] || "Mentor"}</div>
            <div style={{ fontSize: 18, fontWeight: 700, paddingBottom: 6, color: "#92400e" }}>🔽</div>
          </div>
          
          {menuOpen && (
            <div style={{
              position:"absolute", top: 48, right: 0, background:"white",
              border:"1px solid #e5e7eb", borderRadius: 12, boxShadow:"0 10px 25px rgba(0, 0, 0, 0.1)",
              zIndex: 50, minWidth: 180, display: "flex", flexDirection: "column", overflow: "hidden"
            }}>
              <button
                onClick={() => { setActiveTab("notifications"); setMenuOpen(false); }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding:"12px 18px", border:"none", background:"white", textAlign:"left", cursor:"pointer", borderBottom:"1px solid #f3f4f6", fontSize:14, fontWeight:600, color:"#374151", transition: "background 0.2s" }}
                onMouseEnter={(e)=>e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={(e)=>e.currentTarget.style.background="white"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "#fef3c7" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  </div>
                  <span style={{ color: "#374151", fontWeight: 700 }}>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span style={{ background: "#ef4444", color: "white", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: "bold" }}>
                    {unreadCount} New
                  </span>
                )}
              </button>
              <button
                onClick={() => { setActiveTab("profile"); setMenuOpen(false); }}
                style={{ display:"flex", alignItems:"center", gap: 12, padding:"12px 18px", border:"none", background:"white", textAlign:"left", cursor:"pointer", borderBottom:"1px solid #f3f4f6", fontSize:14, fontWeight:600, color:"#374151", transition: "background 0.2s" }}
                onMouseEnter={(e)=>e.currentTarget.style.background="#f8fafc"}
                onMouseLeave={(e)=>e.currentTarget.style.background="white"}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "#e0e7ff" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <span style={{ color: "#374151", fontWeight: 700 }}>Profile</span>
              </button>
              <button
                onClick={onLogout}
                style={{ display:"flex", alignItems:"center", gap: 12, padding:"12px 18px", border:"none", background:"white", textAlign:"left", cursor:"pointer", color:"#dc2626", fontSize:14, fontWeight:600, transition: "background 0.2s" }}
                onMouseEnter={(e)=>e.currentTarget.style.background="#fef2f2"}
                onMouseLeave={(e)=>e.currentTarget.style.background="white"}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "#fee2e2" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </div>
                <span style={{ color: "#dc2626", fontWeight: 700 }}>Logout</span>
              </button>
            </div>
          )}
        </div>
        {renderContent()}
      </div>
    </div>
  );
}
