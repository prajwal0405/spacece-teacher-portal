import { useEffect, useMemo, useState } from "react";
import { AttendanceBar, BarChart, S, SectionCard, StatCard, StatusBadge } from "../components/Shared";
import { getCourseAssignments, getTeacherAttendance, getAdminMentors, getCenters, getClasses, getChildren, getLessonPlans, getAdminLessonAssignments, getActivities, getCourses } from "../services/api";

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildMonthlyEnrollment(teachers) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const val = teachers.filter((teacher) => {
      const createdAt = teacher.createdAt ? new Date(teacher.createdAt) : null;
      return createdAt &&
        createdAt.getMonth() === date.getMonth() &&
        createdAt.getFullYear() === date.getFullYear();
    }).length;
    return {
      month: date.toLocaleString("en-IN", { month: "short" }),
      val,
    };
  });
}

function buildMonthlyActivity(allActivities) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - index) + 1, 0);
    const completed = allActivities.filter(a => {
      const d = a.reviewedAt || a.createdAt;
      if (!d) return false;
      const dt = new Date(d);
      return dt >= date && dt <= monthEnd && (a.status === "approved" || a.status === "completed");
    }).length;
    const total = allActivities.filter(a => {
      const d = a.createdAt;
      if (!d) return false;
      const dt = new Date(d);
      return dt >= date && dt <= monthEnd;
    }).length;
    return {
      month: date.toLocaleString("en-IN", { month: "short" }),
      val: completed,
      total,
    };
  });
}

const BarChartSimple = ({ data, color = "#f59e0b", height = 100, label = "val" }) => {
  const max = Math.max(...data.map(d => d[label] || 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#374151" }}>{d[label] || 0}</span>
          <div style={{ width: "100%", height: `${Math.max(((d[label] || 0) / max) * 100, 4)}%`, background: color, borderRadius: 4, transition: "height 0.3s" }} />
          <span style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600 }}>{d.month || d.name}</span>
        </div>
      ))}
    </div>
  );
};

export default function ReportsTab({ teachers = [], courses = [], setToast }) {
  const [activeReport, setActiveReport] = useState("teacherPerformance");
  const [assignments, setAssignments] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [centers, setCenters] = useState([]);
  const [classes, setClasses] = useState([]);
  const [children, setChildren] = useState([]);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [planAssignments, setPlanAssignments] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCourseAssignments(), getAdminMentors(), getTeacherAttendance(),
      getCenters(), getClasses(), getChildren(), getLessonPlans(),
      getAdminLessonAssignments(), getActivities()
    ]).then(([a, tr, at, ce, cl, ch, lp, pa, act]) => {
      setAssignments(a?.assignments || []);
      setMentors(tr?.mentors || []);
      setAttendanceRecords(at?.records || []);
      setCenters(ce?.centers || []);
      setClasses(cl?.classes || []);
      setChildren(ch?.children || []);
      setLessonPlans(lp?.lessonPlans || []);
      setPlanAssignments(pa?.assignments || []);
      setAllActivities(act?.activities || act?.submissions || []);
    }).catch(err => {
      console.error("Reports data load error:", err);
    }).finally(() => setLoading(false));
  }, []);

  const approvedTeachers = teachers.filter(t => t.status === "approved");
  const publishedCourses = courses.filter(c => c.status === "published");

  /* ── Teacher Performance Report ── */
  const teacherPerformance = useMemo(() => {
    return approvedTeachers.map(t => {
      const tAssignments = assignments.filter(a => String(a.teacher?._id || a.teacher) === String(t._id));
      const completed = tAssignments.filter(a => a.status === "completed" || a.status === "approved").length;
      const overdue = tAssignments.filter(a => {
        if (a.status === "completed" || a.status === "approved") return false;
        if (a.dueDate) return new Date(a.dueDate) < new Date();
        return false;
      }).length;
      const total = tAssignments.length || 1;
      const onTimeRate = Math.round((completed / total) * 100);
      const attendanceRecs = attendanceRecords.filter(r => String(r.teacher?._id || r.teacher) === String(t._id));
      const present = attendanceRecs.filter(r => ["present", "late"].includes(r.status)).length;
      const attendanceRate = attendanceRecs.length ? Math.round((present / attendanceRecs.length) * 100) : 0;
      const center = t.teacherProfile?.center;
      return { teacher: t, completed, overdue, total: tAssignments.length, onTimeRate, attendanceRate, centerName: center?.name || "—" };
    }).sort((a, b) => b.onTimeRate - a.onTimeRate);
  }, [approvedTeachers, assignments, attendanceRecords]);

  /* ── Class Progress Report ── */
  const classProgress = useMemo(() => {
    return classes.map(cls => {
      const clsTeachers = approvedTeachers.filter(t => {
        const clsIds = (t.teacherProfile?.classes || []).map(c => c?._id || c);
        return clsIds.includes(cls._id || cls.id);
      });
      const clsPlanAssignments = planAssignments.filter(pa => {
        const clsId = pa.class?._id || pa.class;
        return String(clsId) === String(cls._id || cls.id);
      });
      const totalPlans = clsPlanAssignments.length;
      const completedPlans = clsPlanAssignments.filter(pa => pa.status === "completed" || pa.status === "reviewed").length;
      const planPct = totalPlans ? Math.round((completedPlans / totalPlans) * 100) : 0;
      const clsChildren = children.filter(ch => String(ch.class?._id || ch.class) === String(cls._id || cls.id));
      const center = centers.find(c => (c._id || c.id) === (cls.center?._id || cls.center));
      return { cls, centerName: center?.name || "—", teacherCount: clsTeachers.length, childCount: clsChildren.length, totalPlans, completedPlans, planPct };
    });
  }, [classes, approvedTeachers, planAssignments, children, centers]);

  /* ── Child Development Report ── */
  const childDevelopment = useMemo(() => {
    return children.filter(ch => ch.status === "active").map(ch => {
      const cls = classes.find(c => (c._id || c.id) === (ch.class?._id || ch.class));
      const clsPlanAssignments = planAssignments.filter(pa => {
        const clsId = pa.class?._id || pa.class;
        return String(clsId) === String(ch.class?._id || ch.class);
      });
      const totalActivities = clsPlanAssignments.length;
      const completedActivities = clsPlanAssignments.filter(pa => pa.status === "completed" || pa.status === "reviewed").length;
      const progressPct = totalActivities ? Math.round((completedActivities / totalActivities) * 100) : 0;
      const childGrades = allActivities.filter(a => String(a.child?._id || a.child) === String(ch._id));
      const avgScore = childGrades.length ? Math.round(childGrades.reduce((sum, g) => sum + (g.score || 0), 0) / childGrades.length) : 0;
      return { child: ch, className: cls?.name || "—", centerName: ch.center?.name || "—", totalActivities, completedActivities, progressPct, avgScore };
    });
  }, [children, classes, planAssignments, allActivities]);

  /* ── Center Summary Report ── */
  const centerSummary = useMemo(() => {
    return centers.filter(c => c.status === "active").map(center => {
      const centerTeachers = approvedTeachers.filter(t => String(t.teacherProfile?.center?._id || t.teacherProfile?.center) === String(center._id));
      const centerClasses = classes.filter(c => String(c.center?._id || c.center) === String(center._id));
      const centerChildren = children.filter(ch => String(ch.center?._id || ch.center) === String(center._id));
      const centerAssignments = assignments.filter(a => {
        const t = teachers.find(te => String(te._id) === String(a.teacher?._id || a.teacher));
        return t && String(t.teacherProfile?.center?._id || t.teacherProfile?.center) === String(center._id);
      });
      const completed = centerAssignments.filter(a => a.status === "completed" || a.status === "approved").length;
      const completionRate = centerAssignments.length ? Math.round((completed / centerAssignments.length) * 100) : 0;
      return { center, teacherCount: centerTeachers.length, classCount: centerClasses.length, childCount: centerChildren.length, assignmentCount: centerAssignments.length, completionRate };
    });
  }, [centers, approvedTeachers, classes, children, assignments, teachers]);

  const monthlyActivity = useMemo(() => buildMonthlyActivity(allActivities), [allActivities]);

  const reportTabs = [
    { key: "teacherPerformance", label: "Teacher Performance", icon: "👩‍🏫" },
    { key: "classProgress", label: "Class Progress", icon: "🎒" },
    { key: "childDevelopment", label: "Child Development", icon: "👶" },
    { key: "centerSummary", label: "Center Summary", icon: "🏫" },
    { key: "monthlyActivity", label: "Monthly Activity", icon: "📊" },
    { key: "enrollment", label: "Enrollment Trend", icon: "📈" },
    { key: "completion", label: "Course Completion", icon: "✅" },
    { key: "attendance", label: "Attendance", icon: "📅" },
    { key: "mentor", label: "Mentors", icon: "🎓" },
  ];

  const exportTeacherPerformance = () => {
    downloadCsv("teacher-performance-report.csv", [
      ["Teacher", "Center", "Assignments Completed", "Overdue", "Total", "On-Time Rate", "Attendance Rate"],
      ...teacherPerformance.map(r => [r.teacher.name, r.centerName, r.completed, r.overdue, r.total, `${r.onTimeRate}%`, `${r.attendanceRate}%`])
    ]);
  };

  const exportClassProgress = () => {
    downloadCsv("class-progress-report.csv", [
      ["Class", "Center", "Teachers", "Children", "Plans Assigned", "Plans Completed", "Progress %"],
      ...classProgress.map(r => [r.cls.name, r.centerName, r.teacherCount, r.childCount, r.totalPlans, r.completedPlans, `${r.planPct}%`])
    ]);
  };

  const exportChildDevelopment = () => {
    downloadCsv("child-development-report.csv", [
      ["Child", "Class", "Center", "Activities Completed", "Total Activities", "Progress %"],
      ...childDevelopment.map(r => [r.child.fullName, r.className, r.centerName, r.completedActivities, r.totalActivities, `${r.progressPct}%`])
    ]);
  };

  const exportCenterSummary = () => {
    downloadCsv("center-summary-report.csv", [
      ["Center", "Teachers", "Classes", "Children", "Assignments", "Completion Rate"],
      ...centerSummary.map(r => [r.center.name, r.teacherCount, r.classCount, r.childCount, r.assignmentCount, `${r.completionRate}%`])
    ]);
  };

  const exportMonthlyActivity = () => {
    downloadCsv("monthly-activity-report.csv", [
      ["Month", "Completed", "Total"],
      ...monthlyActivity.map(r => [r.month, r.val, r.total])
    ]);
  };

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>🔄 Loading Reports...</div>;
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Reports & Analytics</h1>
      <p style={S.pageSub}>Comprehensive operational reports — all data exportable as CSV.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard icon="👩‍🏫" label="Teachers" val={approvedTeachers.length} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="🎒" label="Classes" val={classes.length} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="👶" label="Children" val={children.length} color="#10b981" bg="#d1fae5" />
        <StatCard icon="🏫" label="Centers" val={centers.filter(c => c.status === "active").length} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="📚" label="Courses" val={publishedCourses.length} color="#06b6d4" bg="#cffafe" />
        <StatCard icon="📝" label="Activities" val={allActivities.length} color="#ef4444" bg="#fee2e2" />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {reportTabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveReport(tab.key)} style={{
            padding: "8px 14px", borderRadius: 8, border: `1.5px solid ${activeReport === tab.key ? "#f59e0b" : "#e5e7eb"}`,
            background: activeReport === tab.key ? "#fef3c7" : "white", color: activeReport === tab.key ? "#92400e" : "#6b7280",
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Teacher Performance Report */}
      {activeReport === "teacherPerformance" && (
        <SectionCard title="Teacher Performance Report" action={<button style={S.exportBtn} onClick={exportTeacherPerformance}>Export CSV</button>}>
          {teacherPerformance.length === 0 ? <div style={{ color: "#9ca3af", fontSize: 13 }}>No teacher data.</div> : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                {["Teacher", "Center", "Completed", "Overdue", "On-Time Rate", "Attendance"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textAlign: "left", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {teacherPerformance.map(r => (
                  <tr key={r.teacher._id} style={{ borderBottom: "1px solid #f9fafb" }}>
                    <td style={{ padding: "12px", fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{r.teacher.name}</td>
                    <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{r.centerName}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: "#10b981", fontWeight: 700 }}>{r.completed}</td>
                    <td style={{ padding: "12px", fontSize: 13, color: r.overdue > 0 ? "#ef4444" : "#9ca3af", fontWeight: 700 }}>{r.overdue}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ height: 6, width: 60, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${r.onTimeRate}%`, background: r.onTimeRate >= 80 ? "#10b981" : r.onTimeRate >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: r.onTimeRate >= 80 ? "#10b981" : r.onTimeRate >= 50 ? "#f59e0b" : "#ef4444" }}>{r.onTimeRate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px", fontSize: 12, fontWeight: 600, color: r.attendanceRate >= 90 ? "#10b981" : "#f59e0b" }}>{r.attendanceRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      )}

      {/* Class Progress Report */}
      {activeReport === "classProgress" && (
        <SectionCard title="Class Progress Report" action={<button style={S.exportBtn} onClick={exportClassProgress}>Export CSV</button>}>
          {classProgress.length === 0 ? <div style={{ color: "#9ca3af", fontSize: 13 }}>No classes found.</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
              {classProgress.map(r => (
                <div key={r.cls._id} style={{ background: "#f9fafb", borderRadius: 12, padding: 16, border: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginBottom: 4 }}>{r.cls.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>{r.centerName} · {r.childCount} children · {r.teacherCount} teacher(s)</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: "#6b7280" }}>Lesson Plan Progress</span>
                    <span style={{ fontWeight: 700, color: r.planPct >= 80 ? "#10b981" : r.planPct >= 50 ? "#f59e0b" : "#ef4444" }}>{r.completedPlans}/{r.totalPlans} ({r.planPct}%)</span>
                  </div>
                  <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${r.planPct}%`, background: r.planPct >= 80 ? "#10b981" : r.planPct >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Child Development Report */}
      {activeReport === "childDevelopment" && (
        <SectionCard title="Child Development Report" action={<button style={S.exportBtn} onClick={exportChildDevelopment}>Export CSV</button>}>
          {childDevelopment.length === 0 ? <div style={{ color: "#9ca3af", fontSize: 13 }}>No active children.</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                  {["Child", "Class", "Center", "Progress", "Activities Done"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textAlign: "left", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {childDevelopment.slice(0, 50).map(r => (
                    <tr key={r.child._id} style={{ borderBottom: "1px solid #f9fafb" }}>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#1c1917" }}>{r.child.fullName}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>{r.className}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#6b7280" }}>{r.centerName}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ height: 6, width: 50, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${r.progressPct}%`, background: r.progressPct >= 80 ? "#10b981" : "#f59e0b", borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{r.progressPct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#374151" }}>{r.completedActivities}/{r.totalActivities}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* Center Summary Report */}
      {activeReport === "centerSummary" && (
        <SectionCard title="Center Summary Report" action={<button style={S.exportBtn} onClick={exportCenterSummary}>Export CSV</button>}>
          {centerSummary.length === 0 ? <div style={{ color: "#9ca3af", fontSize: 13 }}>No centers.</div> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
              {centerSummary.map(r => (
                <div key={r.center._id} style={{ background: "white", borderRadius: 14, padding: 18, border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", borderTop: "3px solid #8b5cf6" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1c1917", marginBottom: 10 }}>{r.center.name}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div style={{ textAlign: "center", padding: 8, background: "#f8fafc", borderRadius: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#f59e0b" }}>{r.teacherCount}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>Teachers</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 8, background: "#f8fafc", borderRadius: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#3b82f6" }}>{r.classCount}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>Classes</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 8, background: "#f8fafc", borderRadius: 8 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#10b981" }}>{r.childCount}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>Children</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: "#6b7280" }}>Completion Rate</span>
                      <span style={{ fontWeight: 700, color: r.completionRate >= 80 ? "#10b981" : "#f59e0b" }}>{r.completionRate}%</span>
                    </div>
                    <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${r.completionRate}%`, background: r.completionRate >= 80 ? "#10b981" : "#f59e0b", borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Monthly Activity Report */}
      {activeReport === "monthlyActivity" && (
        <SectionCard title="Monthly Activity Completion Report" action={<button style={S.exportBtn} onClick={exportMonthlyActivity}>Export CSV</button>}>
          <BarChartSimple data={monthlyActivity} color="#3b82f6" height={140} label="val" />
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
            {monthlyActivity.map((m, i) => (
              <div key={i} style={{ background: "#f9fafb", borderRadius: 8, padding: 10, textAlign: "center", border: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>{m.month}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#3b82f6" }}>{m.val}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>of {m.total} total</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Enrollment Trend */}
      {activeReport === "enrollment" && (
        <SectionCard title="Teacher Enrollment Trend" action={<button style={S.exportBtn} onClick={() => downloadCsv("teacher-enrollment.csv", [["Name", "Email", "Status", "Center", "Created"], ...teachers.map(t => [t.name, t.email, t.status, t.teacherProfile?.center?.name || "", t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN") : ""])])}>Export CSV</button>}>
          <BarChartSimple data={monthlyEnrollment} color="#f59e0b" height={120} />
        </SectionCard>
      )}

      {/* Course Completion */}
      {activeReport === "completion" && (
        <SectionCard title="Course Completion Report" action={<button style={S.exportBtn} onClick={() => {
          const data = publishedCourses.map(c => {
            const ca = assignments.filter(a => String(a.course?._id || a.course) === String(c._id));
            const comp = ca.filter(a => a.status === "completed" || a.status === "approved").length;
            return [c.title, ca.length, comp, ca.length ? `${Math.round(comp/ca.length*100)}%` : "0%"];
          });
          downloadCsv("course-completion.csv", [["Course", "Assigned", "Completed", "Rate"], ...data]);
        }}>Export CSV</button>}>
          {publishedCourses.map(c => {
            const ca = assignments.filter(a => String(a.course?._id || a.course) === String(c._id));
            const comp = ca.filter(a => a.status === "completed" || a.status === "approved").length;
            const pct = ca.length ? Math.round(comp / ca.length * 100) : 0;
            return (
              <div key={c._id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{c.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>{comp}/{ca.length} ({pct}%)</span>
                </div>
                <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </SectionCard>
      )}

      {/* Attendance */}
      {activeReport === "attendance" && (
        <SectionCard title="Teacher Attendance Report" action={<button style={S.exportBtn} onClick={() => {
          const data = approvedTeachers.map(t => {
            const recs = attendanceRecords.filter(r => String(r.teacher?._id || r.teacher) === String(t._id));
            const pres = recs.filter(r => ["present", "late"].includes(r.status)).length;
            return [t.name, recs.length ? `${Math.round(pres/recs.length*100)}%` : "N/A", recs.length];
          });
          downloadCsv("teacher-attendance.csv", [["Teacher", "Attendance %", "Records"], ...data]);
        }}>Export CSV</button>}>
          {approvedTeachers.map(t => {
            const recs = attendanceRecords.filter(r => String(r.teacher?._id || r.teacher) === String(t._id));
            const pres = recs.filter(r => ["present", "late"].includes(r.status)).length;
            const pct = recs.length ? Math.round(pres / recs.length * 100) : 0;
            return <AttendanceBar key={t._id} val={pct} name={`${t.name} (${recs.length} records)`} />;
          })}
        </SectionCard>
      )}

      {/* Mentors */}
      {activeReport === "mentor" && (
        <SectionCard title="Mentor Performance Report" action={<button style={S.exportBtn} onClick={() => downloadCsv("mentor-report.csv", [["Mentor", "Email", "Specialization", "Status"], ...mentors.map(m => [m.name, m.email, m.mentorProfile?.specialization || "N/A", m.status])])}>Export CSV</button>}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "2px solid #f3f4f6" }}>
              {["Mentor", "Email", "Specialization", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textAlign: "left", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {mentors.map(m => (
                <tr key={m._id} style={{ borderBottom: "1px solid #f9fafb" }}>
                  <td style={{ padding: "12px", fontSize: 13, fontWeight: 700 }}>{m.name}</td>
                  <td style={{ padding: "12px", fontSize: 12, color: "#6b7280" }}>{m.email}</td>
                  <td style={{ padding: "12px", fontSize: 13 }}>{m.mentorProfile?.specialization || "N/A"}</td>
                  <td style={{ padding: "12px" }}><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}
    </div>
  );
}
