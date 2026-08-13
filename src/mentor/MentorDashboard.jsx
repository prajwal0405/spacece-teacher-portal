import { useState, useEffect, useMemo } from "react";
import { Logo, Toast, Badge, StatusBadge, StatCard, SectionCard, S, globalCSS, DonutChart, ActivityItem, ProgressCard, BarChart } from "../components/Shared";
import { t } from "../services/i18n";
import { 
  getStoredSession, 
  getMyCenter, 
  getMentorMe, 
  getMentorFellows, 
  getActivities, 
  getChildren, 
  getMentorFellowsAttendance, 
  getCourseAssignments,
  getPDCACycles, 
  getCapstoneSubmissions, 
  getMenteeObservations 
} from "../services/api";
import { MentorProfileTab, MentorNotificationsTab, MentorFeedbackTab, MenteeManagementTab, ImpactCapstoneTab, PDCATab } from "./MentorDashboardTabs";
import MentorActivitiesTab from "./MentorActivitiesTab";
import MentorCurriculumTab from "./MentorCurriculumTab";
import { PendingApprovalsReminder } from "./PendingApprovalsReminder";
import TeacherManagementTab from "../admin/TeacherManagementTab";
import AttendanceTab from "../admin/AttendanceTab";
import GeotagAttendance from "../pages/GeotagAttendance";
import { calculateTeacherScore } from "../admin/OverviewTab";

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

/* ── OverviewTab ── */
function OverviewTab({ user, workingCenter }) {
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [children, setChildren] = useState([]);
  const [attendance, setAttendance] = useState([]);
  
  const [pdcaCount, setPdcaCount] = useState(0);
  const [capstoneSubmissionsCount, setCapstoneCount] = useState(0);
  const [observationsCount, setObservationsCount] = useState(0);
  const [mentorActivities, setMentorActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    let isInitialLoad = true;

    const fetchOverviewData = () => {
      Promise.all([
        getMentorFellows().catch(() => ({ fellows: [] })),
        getCourseAssignments().catch(() => ({ assignments: [] })),
        getActivities().catch(() => ({ activities: [] })),
        getChildren().catch(() => ({ children: [] })),
        getMentorFellowsAttendance().catch(() => ({ attendanceRecords: [] })),
        getPDCACycles().catch(() => ({ cycles: [] })),
        getCapstoneSubmissions().catch(() => ({ submissions: [] })),
        getMenteeObservations().catch(() => ({ observations: [] }))
      ])
        .then(([fellowsData, assignData, activData, childData, attendData, pdcaRes, capRes, obsRes]) => {
          if (ignore) return;
          setTeachers(fellowsData?.fellows || []);
          setAssignments(assignData?.assignments || []);
          setActivities(activData?.activities || []);
          setChildren(childData?.children || []);
          setAttendance(attendData?.attendanceRecords || []);
          
          const pdcas = pdcaRes.cycles || [];
          const caps = capRes.submissions || [];
          const obs = obsRes.observations || [];
          
          setPdcaCount(pdcas.filter(p => p.status === "Completed").length);
          setCapstoneCount(caps.length);
          setObservationsCount(obs.length);
          
          const merged = [
            ...pdcas.map(p => ({
              id: "pdca_" + p._id,
              title: `Completed PDCA Cycle (Mentee: ${p.menteeId?.name || "Fellow"})`,
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
              title: `Logged an Observation (Mentee: ${m.menteeId?.name || "Fellow"})`,
              date: new Date(m.createdAt || m.date),
              type: "observation"
            }))
          ].sort((a, b) => b.date - a.date).slice(0, 10);
          setMentorActivities(merged);
        })
        .catch(err => {
          if (!ignore) {
            console.error("Mentor Overview poll failed:", err);
            if (isInitialLoad) setError(err.message);
          }
        })
        .finally(() => {
          if (!ignore && isInitialLoad) setLoading(false);
          isInitialLoad = false;
        });
    };

    fetchOverviewData();
    const interval = setInterval(fetchOverviewData, 8000); // 8-second poll

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [user]);

  const myTeachers = useMemo(() => {
    return teachers.filter(t => String(t.assignedMentor?._id || t.assignedMentor) === String(user._id || user.id));
  }, [teachers, user]);

  const stats = useMemo(() => {
    const uniqueCenters = new Set(myTeachers.map(t => t.teacherProfile?.center?._id || t.teacherProfile?.center).filter(Boolean));
    const totalCenters = uniqueCenters.size;
    const totalChildren = children.length;
    const uniqueCourses = new Set(assignments.map(a => a.course?._id || a.course).filter(Boolean));
    const totalCourses = uniqueCourses.size;
    const pendingActivities = activities.filter(a => a.status === "pending").length;
    const pendingReviews = assignments.filter(a => ["submitted", "under_review"].includes(a.status)).length;
    const avgCourseCompletion = assignments.length
      ? Math.round(assignments.reduce((sum, a) => sum + (a.progressPercent || 0), 0) / assignments.length)
      : 0;
    const activeTeachers = myTeachers.filter(t => t.status === "approved").length;
    const inactiveTeachers = myTeachers.filter(t => t.status !== "approved").length;

    return {
      totalAssigned: myTeachers.length,
      totalCenters,
      totalChildren,
      totalCourses,
      pendingActivities,
      pendingReviews,
      avgCourseCompletion,
      activeTeachers,
      inactiveTeachers
    };
  }, [myTeachers, assignments, activities, children]);

  const attendanceToday = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayRecs = attendance.filter(r => {
      const dStr = new Date(r.attendanceDate).toDateString();
      return dStr === todayStr;
    });

    const present = todayRecs.filter(r => r.status === "present").length;
    const absent = todayRecs.filter(r => r.status === "absent").length;
    const late = todayRecs.filter(r => r.status === "late").length;
    const halfDay = todayRecs.filter(r => r.status === "half_day").length;

    return { present, absent, late, halfDay };
  }, [attendance]);

  const completionStats = useMemo(() => {
    const completed = assignments.filter(a => ["completed", "approved", "reviewed"].includes(a.status)).length;
    const inProgress = assignments.filter(a => ["in_progress", "submitted", "under_review", "revision"].includes(a.status)).length;
    const notStarted = assignments.filter(a => a.status === "assigned").length;

    return { completed, inProgress, notStarted };
  }, [assignments]);

  const monthlyReg = useMemo(() => buildMonthlyRegistrations(myTeachers), [myTeachers]);

  const leaderboardData = useMemo(() => {
    const approvedMyTeachers = myTeachers.filter(t => t.status === "approved");
    return approvedMyTeachers.map(t => {
      const score = calculateTeacherScore(t, assignments, attendance);
      return { teacher: t, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  }, [myTeachers, assignments, attendance]);

  const photoUrl = getMentorPhotoUrl(user);
  const semester = user?.mentorProfile?.fellowshipSemester || 3;
  const centerName = workingCenter
    ? [workingCenter.name, workingCenter.city].filter(Boolean).join(", ")
    : "Center not assigned";

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div style={{ fontSize: 16, fontWeight: "bold", color: "#64748b" }}>⏳ Loading Overview Tab...</div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", borderRadius: 20, padding: "24px 28px", marginBottom: 24, color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Good morning, {user.name?.split(" ")[0] || "Mentor"}!</h1>
          <p style={{ fontSize: 13, margin: 0, opacity: 0.88 }}>UMANG Fellowship - Semester {semester} - {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</p>
        </div>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", border: "3px solid rgba(255,255,255,0.3)", background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {photoUrl ? (
              <img src={photoUrl} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
            ) : (
              <span style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{user.name?.[0] || "?"}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, marginBottom: 24, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
        <span style={{ fontSize: 18 }}>🏫</span>
        <span>Working Center: {centerName}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 24 }}>
        {[
          { label: t("Assigned Teachers"), val: stats.totalAssigned, color: "#3b82f6", bg: "#dbeafe", icon: "👩‍🏫" },
          { label: t("Total Centers"),     val: stats.totalCenters,  color: "#f59e0b", bg: "#fef3c7", icon: "🏫" },
          { label: t("Children Enrolled"), val: stats.totalChildren, color: "#10b981", bg: "#d1fae5", icon: "👶" },
          { label: t("Assigned Courses"),  val: stats.totalCourses,  color: "#8b5cf6", bg: "#ede9fe", icon: "📚" }
        ].map((c, i) => (
          <StatCard key={i} label={c.label} val={c.val} color={c.color} bg={c.bg} icon={c.icon} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
        <ProgressCard title="Average Course Completion" val={stats.avgCourseCompletion} color="#3b82f6" bg="#dbeafe" icon="📈" />
        <div style={{ background: "white", borderRadius: 16, padding: "18px 20px", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Teacher Status</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{stats.activeTeachers}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Active</div>
            </div>
            <div style={{ borderLeft: "1px solid #e2e8f0", height: 30 }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#ef4444" }}>{stats.inactiveTeachers}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Pending/Inactive</div>
            </div>
          </div>
        </div>
        <div style={{ background: "white", borderRadius: 16, padding: "18px 20px", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Pending Reviews</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{stats.pendingActivities}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Activities</div>
            </div>
            <div style={{ borderLeft: "1px solid #e2e8f0", height: 30 }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#8b5cf6" }}>{stats.pendingReviews}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Course Submissions</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", gap: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SectionCard title={t("Platform Performance Summary")}>
            <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 20, padding: "10px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <DonutChart value={attendanceToday.present} max={Math.max(stats.totalAssigned, 1)} color="#10b981" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>Teachers Present Today</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{attendanceToday.present} of {stats.totalAssigned} teachers</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <DonutChart value={completionStats.completed} max={Math.max(assignments.length, 1)} color="#3b82f6" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>Completed Courses</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{completionStats.completed} of {assignments.length} assignments</div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 20, padding: "10px 0", borderTop: "1px solid #f1f5f9", marginTop: 10 }}>
              <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 15 }}>
                <span>Late Today: <strong>{attendanceToday.late}</strong></span>
                <span>Absent Today: <strong>{attendanceToday.absent}</strong></span>
                <span>Half Day Today: <strong>{attendanceToday.halfDay}</strong></span>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 15 }}>
                <span>In Progress: <strong>{completionStats.inProgress}</strong></span>
                <span>Not Started: <strong>{completionStats.notStarted}</strong></span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t("Teacher Registration Trends")}>
            <div style={{ height: 260 }}>
              <BarChart data={monthlyReg} />
            </div>
          </SectionCard>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SectionCard title={`🏆 ${t("Top Performing Teachers")}`}>
            {leaderboardData.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>{t("No approved teachers yet.")}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {leaderboardData.map(({ teacher: t, score }, i) => {
                  const rankBadges = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                  const rankColors = ["#f59e0b", "#64748b", "#b45309", "#475569", "#475569"];
                  const rankBg = ["#fef3c7", "#f1f5f9", "#ffedd5", "#f8fafc", "#f8fafc"];
                  return (
                    <div key={t._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: rankBg[i], color: rankColors[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                        {i < 3 ? rankBadges[i] : i + 1}
                      </div>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${rankColors[i]}22, ${rankColors[i]}44)`, color: rankColors[i], display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                        {t.name?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: rankColors[i] }}>{score}%</span>
                        </div>
                        <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${score}%`, height: "100%", background: rankColors[i], borderRadius: 3, transition: "width 0.8s" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title={t("Recent Activities")} style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: 350, overflowY: "auto" }}>
            {mentorActivities.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {mentorActivities.map((act) => (
                  <ActivityItem
                    key={act.id}
                    icon={act.type === "pdca" ? "📝" : act.type === "capstone" ? "🏆" : "👀"}
                    text={act.title}
                    time={act.date.toLocaleString()}
                    color={act.type === "pdca" ? "#f59e0b" : act.type === "capstone" ? "#3b82f6" : "#8b5cf6"}
                  />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 12 }}>
                No recent activity.
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar Avatar Component ── */
function SidebarAvatar({ user, size = 34 }) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = getMentorPhotoUrl(user);
  
  if (!photoUrl || imgError) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
        {user?.name?.[0] || "?"}
      </div>
    );
  }
  
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <img src={photoUrl} alt={user?.name} onError={() => setImgError(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0" }} />
      <span style={{ position: "absolute", bottom: 0, right: 0, background: "#10b981", borderRadius: "50%", width: 12, height: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, border: "1.5px solid white" }}>📷</span>
    </div>
  );
}

/* ── Main MentorDashboard Export ── */
export default function MentorDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [workingCenter, setWorkingCenter] = useState(null);
  const [toast, setToast] = useState({ msg: "", type: "" });
  // ADDED: live pending-fellow-approvals count, fed by the reminder poller below.
  // Used to show a badge on the "Mentee Management" nav item.
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  
  useEffect(() => {
    getMyCenter().then(res => {
      if (res.center) setWorkingCenter(res.center);
    }).catch(err => console.error("Failed to load working center", err));

    // start dnyaneshwari thorat
    const fetchMentorMe = () => {
      getMentorMe().then(res => {
        if (res.mentor) setCurrentUser(res.mentor);
      }).catch(err => console.error("Failed to load mentor profile", err));
    };
    fetchMentorMe();
    const interval = setInterval(fetchMentorMe, 8000); // 8-second poll for near-real-time updates
    return () => clearInterval(interval);
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
          setNotifications((data.notifications || []).map(n => {
            // Relative time like teacher side
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
            return {
              id: n._id,
              type: n.type || "info",
              msg: n.body ? `${n.title}: ${n.body}` : n.title || "",
              title: n.title,
              time: timeVal,
              read: n.read
            };
          }));
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
    { key: "mentees", label: "Teacher Management", icon: "👥", badge: pendingApprovalsCount },
    { key: "fellow_attendance", label: "Teacher Attendance", icon: "📅" },
    { key: "my_attendance", label: "My Attendance", icon: "📍" },
    { key: "activities", label: "Teacher Activities", icon: "📝" },
    { key: "curriculum", label: "Curriculum Management", icon: "📚" },
    { key: "impact", label: "Impact & Capstone", icon: "🏆" },
    { key: "documentation", label: "Growth Cycle", icon: "📝" },
    { key: "feedback", label: "Feedback", icon: "💬" },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case "overview": return <OverviewTab user={currentUser} workingCenter={workingCenter} />;
      case "mentees": return <TeacherManagementTab role="mentor" user={currentUser} setToast={setToast} onUserUpdate={setCurrentUser} />;
      case "fellow_attendance": return <AttendanceTab role="mentor" user={currentUser} setToast={setToast} />;
      case "my_attendance": return <GeotagAttendance user={currentUser} />;
      case "activities": return <MentorActivitiesTab user={currentUser} setToast={setToast} />;
      case "curriculum": return <MentorCurriculumTab user={currentUser} setToast={setToast} />;
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

      {/* ADDED: mounted once here (not inside a specific tab) so it keeps polling
          for pending fellow approvals no matter which tab the mentor is viewing.
          It drives the in-app toast above, the "email nudge" to the mentor's own
          login email via the backend, and the nav badge count via onPendingCountChange. */}
      <PendingApprovalsReminder setToast={setToast} onPendingCountChange={setPendingApprovalsCount} />
      
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
          <SidebarAvatar user={currentUser} size={34} />
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
          >⏻</button>
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
            <div style={{ fontSize: 18, fontWeight: 700, paddingBottom: 6, color: "#92400e" }}>⋮</div>
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