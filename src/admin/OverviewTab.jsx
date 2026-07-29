import { useEffect, useMemo, useState } from "react";
import { BarChart, S, SectionCard, StatCard, StatusBadge } from "../components/Shared";
import { getAdminDashboard, getAdminTeachers, getCenters, getCourseAssignments } from "../services/api";
import { t } from "../services/i18n";

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

/* ── Mini Donut Chart ── */
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

/* ── Activity Feed Item ── */
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

function OverviewTab() {
  const [stats, setStats]         = useState(null);
  const [teachers, setTeachers]   = useState([]);
  const [centers, setCenters]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    let ignore = false;
    let isInitialLoad = true;

    const fetchOverviewData = () => {
      Promise.all([getAdminDashboard(), getAdminTeachers(), getCenters(), getCourseAssignments()])
        .then(([dash, teachersData, centersData, assignData]) => {
          if (ignore) return;
          setStats(dash || {});
          setTeachers(teachersData?.teachers || []);
          setCenters(centersData?.centers || []);
          setAssignments(assignData?.assignments || []);
        })
        .catch(err => {
          if (!ignore) {
            console.error("Overview poll failed:", err);
            if (isInitialLoad) setError(err.message);
          }
        })
        .finally(() => {
          if (!ignore && isInitialLoad) setLoading(false);
          isInitialLoad = false;
        });
    };

    fetchOverviewData();
    const interval = setInterval(fetchOverviewData, 8000); // 8-second poll for near-real-time updates

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  const approvedTeachers = teachers.filter(t => t.status === "approved");
  const pendingTeachers  = teachers.filter(t => t.status === "pending");
  const rejectedTeachers = teachers.filter(t => t.status === "rejected");

  const monthlyReg    = useMemo(() => buildMonthlyRegistrations(teachers), [teachers]);
  const addedThisMonth = monthlyReg[monthlyReg.length - 1]?.val || 0;

  const topTeachers = [...approvedTeachers]
    .sort((a, b) => (b.teacherProfile?.performanceRating || 0) - (a.teacherProfile?.performanceRating || 0))
    .slice(0, 5);

  const recentActivities = useMemo(() => {
    const items = [];
    [...teachers].slice(0, 3).forEach(t => items.push({
      icon: t.status === "pending" ? "⏳" : "✅",
      text: `${t.name} ${t.status === "pending" ? "registered — awaiting approval" : "is an active teacher"}`,
      time: t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Recently",
      color: t.status === "pending" ? "#f59e0b" : "#10b981",
    }));
    assignments.slice(0, 2).forEach(a => items.push({
      icon: "📚",
      text: `${a.teacher?.name || "Teacher"} assigned to "${a.course?.title || "a course"}"`,
      time: a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Recently",
      color: "#3b82f6",
    }));
    return items.slice(0, 5);
  }, [teachers, assignments]);

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "4px solid #fef3c7", borderTopColor: "#f59e0b", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: "#d97706" }}>Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#dc2626" }}>Failed to load dashboard</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>

      {/* ── Hero Header ── */}
      <div style={{ background: "linear-gradient(135deg,#f59e0b 0%,#d97706 60%,#b45309 100%)", borderRadius: 20, padding: "28px 32px", marginBottom: 24, color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", bottom: -20, right: 80, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fffbeb", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>
                SpacECE Admin Panel
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
                {t(greeting)}, Admin! 👋
              </h1>
              <p style={{ fontSize: 13, margin: 0, color: "rgba(255,255,255,0.85)" }}>
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              {pendingTeachers.length > 0 && (
                <div style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fee2e2" }}>{pendingTeachers.length}</div>
                  <div style={{ fontSize: 10, color: "#fee2e2", fontWeight: 700 }}>Pending Approval</div>
                </div>
              )}
              <div style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>{approvedTeachers.length}</div>
                <div style={{ fontSize: 10, color: "white", fontWeight: 700 }}>Active Teachers</div>
              </div>
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div style={{ display: "flex", gap: 20, marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)", flexWrap: "wrap" }}>
            {[
              { label: "Centers",          val: stats?.totalCenters    ?? centers.length, icon: "🏫" },
              { label: "Children",         val: stats?.totalChildren   ?? 0,              icon: "👶" },
              { label: "Course Completion",val: `${stats?.courseCompletionPercent ?? 0}%`, icon: "📚" },
              { label: "Present Today",    val: stats?.teacherAttendanceToday ?? 0,       icon: "✅" },
              { label: "Pending Activities",val: stats?.pendingActivities ?? 0,           icon: "📋" },
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

      {/* ── KPI Cards Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { icon: "🏫", label: "Total Centers",     val: stats?.totalCenters ?? centers.length, color: "#f59e0b", bg: "#fef3c7", sub: `${centers.filter(c=>c.status==="active").length} active` },
          { icon: "👩‍🏫", label: "Total Teachers",   val: stats?.totalTeachers ?? teachers.length, color: "#10b981", bg: "#d1fae5", sub: `+${addedThisMonth} this month` },
          { icon: "⏳", label: "Pending Approvals", val: pendingTeachers.length, color: "#ef4444", bg: "#fee2e2", sub: pendingTeachers.length > 0 ? "Need attention" : "All clear ✓" },
          { icon: "👶", label: "Total Children",    val: stats?.totalChildren ?? 0, color: "#3b82f6", bg: "#dbeafe", sub: "Active enrollments" },
          { icon: "📚", label: "Course Completion", val: `${stats?.courseCompletionPercent ?? 0}%`, color: "#06b6d4", bg: "#cffafe", sub: "Assigned vs done" },
          { icon: "📋", label: "Pending Activities",val: stats?.pendingActivities ?? 0, color: "#8b5cf6", bg: "#ede9fe", sub: "Awaiting review" },
        ].map((s, i) => (
          <div key={i} style={{ background: "white", borderRadius: 16, padding: "18px 20px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderTop: `3px solid ${s.color}` }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#1c1917", letterSpacing: "-1px", lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, marginTop: 3 }}>{s.label}</div>
            {s.sub && <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Main Content Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Teacher Registration Chart */}
        <SectionCard title="📊 Teacher Registrations — Last 6 Months">
          {teachers.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13, padding: "20px 0", textAlign: "center" }}>No teacher records yet.</div>
          ) : (
            <>
              <BarChart data={monthlyReg} color="#f59e0b" height={150} />
              <div style={{ display: "flex", gap: 12, marginTop: 16, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
                {[
                  { label: "Total",    val: teachers.length,          color: "#374151" },
                  { label: "Approved", val: approvedTeachers.length,  color: "#10b981" },
                  { label: "Pending",  val: pendingTeachers.length,   color: "#f59e0b" },
                  { label: "Rejected", val: rejectedTeachers.length,  color: "#ef4444" },
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
        <SectionCard title="⚡ Platform Summary">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Teacher Attendance Today",  val: stats?.teacherAttendanceToday ?? 0, max: Math.max(stats?.totalTeachers ?? 1, 1),  color: "#10b981" },
              { label: "Course Completion Rate",    val: stats?.completedCourses  ?? 0,       max: Math.max(stats?.assignedCourses  ?? 1, 1), color: "#3b82f6" },
              { label: "Pending Lessons",           val: stats?.pendingLessons    ?? 0,       max: Math.max(stats?.assignedCourses  ?? 1, stats?.pendingLessons ?? 1), color: "#f59e0b" },
              { label: "Activity Reviews Needed",   val: stats?.pendingActivities ?? 0,       max: Math.max(stats?.pendingActivities ?? 1, 10),                        color: "#8b5cf6" },
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

      {/* ── Bottom Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
        {/* Top Teachers Leaderboard */}
        <SectionCard title="🏆 Top Performing Teachers">
          {topTeachers.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No approved teachers yet.</div>
          ) : [...topTeachers].map(t => ({...t, dynamicScore: getTeacherScore(t)})).sort((a,b)=> b.dynamicScore - a.dynamicScore).slice(0,5).map((t, i) => {
            const score = t.dynamicScore;
            const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
            return (
              <div key={t._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
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
          {topTeachers.length === 0 && (
            <div style={{ marginTop: 12, padding: "10px 12px", background: "#fef3c7", borderRadius: 8, fontSize: 11, color: "#92400e" }}>
              💡 Approve teachers to see their performance stats here.
            </div>
          )}
        </SectionCard>

        {/* Centers at a Glance */}
        <SectionCard title="🏫 Centers at a Glance">
          {centers.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No centers created yet.</div>
          ) : centers.slice(0, 5).map((c, i) => (
            <div key={c._id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10,
                background: c.status === "active" ? "linear-gradient(135deg,#fef3c7,#fbbf24)" : "#f3f4f6",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏫</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1917", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>{c.city || "—"} · {c.teachers?.length || 0} teachers</div>
              </div>
              <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                background: c.status === "active" ? "#d1fae5" : "#f3f4f6",
                color: c.status === "active" ? "#065f46" : "#6b7280", flexShrink: 0 }}>
                {c.status}
              </span>
            </div>
          ))}
          {centers.length > 5 && (
            <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", paddingTop: 8 }}>+{centers.length - 5} more centers</div>
          )}
        </SectionCard>

        {/* Recent Activity */}
        <SectionCard title="🕐 Recent Activity">
          {recentActivities.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No recent activity.</div>
          ) : recentActivities.map((a, i) => (
            <ActivityItem key={i} {...a} />
          ))}

          {/* Teacher Status Snapshot */}
          <div style={{ marginTop: 16, padding: "12px 14px", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Teacher Breakdown</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { label: "Approved", val: approvedTeachers.length,  color: "#10b981", bg: "#d1fae5" },
                { label: "Pending",  val: pendingTeachers.length,   color: "#f59e0b", bg: "#fef3c7" },
                { label: "Rejected", val: rejectedTeachers.length,  color: "#ef4444", bg: "#fee2e2" },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: s.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 9, color: s.color, fontWeight: 700 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default OverviewTab;
