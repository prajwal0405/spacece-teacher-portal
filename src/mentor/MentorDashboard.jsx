import { useState, useEffect } from "react";
import { Logo, Toast, Badge, StatusBadge, StatCard, SectionCard, S, globalCSS } from "../components/Shared";
import { t } from "../services/i18n";
import { getStoredSession, getMyCenter, getMentorMe } from "../services/api";
import { MentorProfileTab, MentorNotificationsTab, MentorFeedbackTab, MenteeManagementTab, ImpactCapstoneTab, PDCATab } from "./MentorDashboardTabs";
import MentorActivitiesTab from "./MentorActivitiesTab";
import MentorFellowAttendanceTab from "./MentorFellowAttendanceTab";
import MentorAttendanceTab from "./MentorAttendanceTab";
import MentorCurriculumTab from "./MentorCurriculumTab";
import { getPDCACycles, getCapstoneSubmissions, getMenteeObservations } from "../services/api";

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
function OverviewTab({ user, workingCenter }) {
  const [pdcaCount, setPdcaCount] = useState(0);
  const [capstoneSubmissionsCount, setCapstoneCount] = useState(0);
  const [observationsCount, setObservationsCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  
  useEffect(() => {
    Promise.all([
      getPDCACycles().catch(()=>({cycles:[]})),
      getCapstoneSubmissions().catch(()=>({submissions:[]})),
      getMenteeObservations().catch(()=>({observations:[]}))
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
      setRecentActivities(merged);
    });
  }, []);

  const photoUrl = getMentorPhotoUrl(user);
  const semester = user?.mentorProfile?.fellowshipSemester || 3;
  const mentees = user?.mentorProfile?.assignedTeachers || [];
  const centerName = workingCenter
    ? [workingCenter.name, workingCenter.city].filter(Boolean).join(", ")
    : "Center not assigned";

  const approvedFellowsCount = mentees.length; // all assigned mentees are approved fellows for this mentor
  
  let impactScoreRaw = (pdcaCount * 10) + (observationsCount * 5) + (capstoneSubmissionsCount * 15) + (approvedFellowsCount * 8);
  const impactScore = Math.min(impactScoreRaw, 100);
  
  const totalMilestones = 4;
  const capstoneProgress = Math.round((Math.min(capstoneSubmissionsCount, 4)) / totalMilestones * 100);

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
          {photoUrl && <span style={{ position: "absolute", bottom: 0, right: 0, background: "#10b981", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, border: "2px solid white" }}>📷</span>}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
        <span style={{ fontSize: 18 }}>@</span>
        <span>Working Center: {centerName}</span>
      </div>

      {/* ── My Assigned Mentees Section ── */}
      <div style={{ marginBottom: 20, marginTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1c1917", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>👥</span> My Assigned Mentees
        </div>
        
        {mentees.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* start dnyaneshwari thorat */}
            {mentees.map((mentee, i) => (
              <div key={mentee?._id || mentee?.id || i} style={{
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
                  }}>👩‍🏫</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917" }}>{mentee?.name || "Unknown Teacher"}</div>
                    {mentee?.teacherProfile?.subject && <div style={{ fontSize: 11, color: "#6b7280" }}>{mentee.teacherProfile.subject}</div>}
                  </div>
                </div>
              </div>
            ))}
            {/* end dnyaneshwari thorat */}
          </div>
        ) : (
          <div style={{
            background: "white", borderRadius: 14, padding: "24px",
            border: "1px solid #e5e7eb", textAlign: "center"
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#6b7280" }}>No mentees assigned yet</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Contact admin to assign teachers to you</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 16, marginBottom: 24, marginTop: 16 }}>
        <StatCard icon="👥" label="Assigned Mentees" val={mentees.length || "0"} color="#3b82f6" bg="#dbeafe"/>
        <StatCard icon="📈" label="Impact Score" val={impactScore} color="#10b981" bg="#d1fae5"/>
        <StatCard icon="📝" label="Observations" val={observationsCount} color="#8b5cf6" bg="#ede9fe"/>
        <StatCard icon="🏆" label="Capstone Progress" val={`${capstoneProgress}%`} color="#06b6d4" bg="#cffafe"/>
      </div>
      
      <SectionCard title="Recent Activity" icon="🕒">
         {recentActivities.length > 0 ? (
           <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
             {recentActivities.map((act) => (
               <div key={act.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                 <div style={{ width: 32, height: 32, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                   {act.type === "pdca" ? "📝" : act.type === "capstone" ? "🏆" : "👀"}
                 </div>
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{act.title}</div>
                   <div style={{ fontSize: 11, color: "#64748b" }}>{act.date.toLocaleString()}</div>
                 </div>
               </div>
             ))}
           </div>
         ) : (
           <div style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 12 }}>
             No recent activity.
           </div>
         )}
      </SectionCard>
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
    { key: "mentees", label: "Mentee Management", icon: "👥" },
    { key: "fellow_attendance", label: "Fellow Attendance", icon: "📅" },
    { key: "activities", label: "Fellow Activities", icon: "📝" },
    { key: "curriculum", label: "Curriculum Management", icon: "📚" },
    { key: "impact", label: "Impact & Capstone", icon: "🏆" },
    { key: "documentation", label: "Documentation (PDCA)", icon: "📝" },
    { key: "feedback", label: "Feedback", icon: "💬" },
  ];

  const renderContent = () => {
    switch(activeTab) {
      case "overview": return <OverviewTab user={currentUser} workingCenter={workingCenter} />;
      case "my_attendance": return <MentorAttendanceTab user={currentUser} setToast={setToast} />;
      case "mentees": return <MenteeManagementTab user={currentUser} setToast={setToast} onUserUpdate={setCurrentUser} />;
      case "fellow_attendance": return <MentorFellowAttendanceTab user={currentUser} setToast={setToast} />;
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
