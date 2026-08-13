import { useState, useEffect, useRef } from "react";
import { S, SectionCard, Toast, StatCard, StatusBadge, SearchBar, Modal } from "../components/Shared";
import { uploadFile, submitFeedback, getFeedbacks, updateMentorMe, changeMentorPassword, recordMenteeObservation, getMenteeObservations, submitCapstoneMilestone, getCapstoneSubmissions, submitPDCACycle, getPDCACycles, getMentorFellows, updateFellowStatus, getMentorMe, updateMenteeTracking, claimFellow, unclaimFellow, deleteMentorFellow, getMentorAttendance, submitPDCAPlanDraft, updatePDCAPlanDraft, publishPDCAPlan, savePDCACheckDraft, submitPDCACheck } from "../services/api";
import { UMANG_CURRICULUM_SEMESTERS, HAALS_DOMAINS_PRESETS } from "../data/pdcaCurriculumData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getMentorPhotoUrl = (user) => {
  const photo = user?.mentorProfile?.profilePhoto || user?.mentorProfile?.photo || user?.photoUrl || user?.profilePhoto;
  if (!photo) return null;
  if (typeof photo === "string") return photo.startsWith("http") ? photo : `${API_BASE_URL}${photo}`;
  const url = photo.publicUrl || photo.url || photo.path;
  return url || null;
};

/* ── Mentor Profile Tab ── */
export function MentorProfileTab({ user, onWorkingCenterChange, onUserUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); 
  const [stats, setStats] = useState({ pdca: 0, capstones: 0, attendance: 0 });

  useEffect(() => {
    getPDCACycles()
      .then(res => {
        setStats(s => ({ ...s, pdca: (res.cycles || []).length }));
      })
      .catch(err => console.error("Failed to load PDCA count for profile", err));

    getCapstoneSubmissions()
      .then(res => {
        setStats(s => ({ ...s, capstones: (res.submissions || []).length }));
      })
      .catch(err => console.error("Failed to load Capstones count for profile", err));

    getMentorAttendance()
      .then(res => {
        const records = res.records || [];
        const present = records.filter(r => ["present", "late"].includes(r.status)).length;
        const pct = records.length ? Math.round((present / records.length) * 100) : 100;
        setStats(s => ({ ...s, attendance: pct }));
      })
      .catch(err => console.error("Failed to load mentor attendance for profile", err));
  }, [user]);
  
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
  
  const mentorProfile = user.mentorProfile || {};
  const assignedCenter = mentorProfile.assignedCenters?.[0];
  const centerName = assignedCenter && typeof assignedCenter === "object" ? [assignedCenter.name, assignedCenter.city].filter(Boolean).join(", ") : user.workingCenter;

  const [form, setForm] = useState({
    name:          user.name          || "",
    email:         user.email         || "",
    phone:         user.phone         || "",
    address:       mentorProfile.address || user.address || "",
    workingCenter: centerName || "",
    qualification: mentorProfile.qualification || user.qualification || "",
    specialization: mentorProfile.specialization || user.specialization || "",
    experience:    mentorProfile.experience || user.experience || ""
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
          photoUrl = `${API_BASE_URL}${photoUrl}`;
        }
        setProfilePhoto(photoUrl);
        setImageLoadError(false);
        const res = await updateMentorMe({ photoUrl });
        if (res.mentor && onUserUpdate) {
          onUserUpdate(res.mentor);
        }
        setMessage("Profile picture updated successfully!");
        setMessageType("success");
      }
    } catch (error) {
      setMessage(error.message || "Failed to upload profile picture.");
      setMessageType("error");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    try {
      setProfilePhoto(null);
      const res = await updateMentorMe({ photoUrl: "" });
      if (res.mentor && onUserUpdate) {
        onUserUpdate(res.mentor);
      }
      setMessage("Profile picture removed.");
      setMessageType("success");
    } catch (error) {
      setMessage("Failed to remove profile picture.");
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
        email: form.email,
        phone: form.phone,
        mentorProfile: {
          address: form.address,
          qualification: form.qualification,
          specialization: form.specialization,
          experience: form.experience
        }
      };
      
      const res = await updateMentorMe(payload);
      if (res.mentor && onUserUpdate) {
        onUserUpdate(res.mentor);
      }
      if (onWorkingCenterChange) {
        onWorkingCenterChange(form.workingCenter);
      }
      setSavedForm({ ...form });
      setEditing(false);
      setMessage("Profile updated successfully!");
      setMessageType("success");
    } catch (err) {
      setMessage(err.message || "Failed to update profile");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage("");
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("New passwords do not match");
      setMessageType("error");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setMessage("New password must be at least 6 characters");
      setMessageType("error");
      return;
    }

    setChangingPassword(true);
    try {
      await changeMentorPassword(passwordForm.currentPassword, passwordForm.newPassword);
      setMessage("Password changed successfully!");
      setMessageType("success");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setMessage(err.message || "Failed to change password");
      setMessageType("error");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 900 }}>
      <Toast msg={message} type={messageType} onClose={() => setMessage("")} />
      
      {/* ── Welcome Banner ── */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#3b82f6)", borderRadius: 20, padding: "24px 28px", marginBottom: 24, color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Welcome back, Mentor {user.name?.split(" ")[0] || ""}! 🚀</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.9)", maxWidth: 500 }}>
            Here is your mentor overview. You are currently mentoring {user.mentorProfile?.assignedTeachers?.length || 0} fellow(s) and guiding their ECCE journey.
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, position: "relative", zIndex: 1 }}>
          <div style={{ background: "rgba(255,255,255,0.15)", padding: "10px 16px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{user.mentorProfile?.assignedTeachers?.length || 0}</div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9 }}>Active Mentees</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", padding: "10px 16px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{user.mentorProfile?.center?.name ? "1" : "0"}</div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9 }}>Assigned Center</div>
          </div>
        </div>
      </div>

      {/* ── Performance KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard icon="👩‍🏫" label="Active Mentees" val={user.mentorProfile?.assignedTeachers?.length || 0} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="🔄" label="PDCA Growth Cycles" val={stats.pdca} color="#10b981" bg="#d1fae5" />
        <StatCard icon="🎓" label="Capstone Submissions" val={stats.capstones} color="#8b5cf6" bg="#ede9fe" />
        <StatCard icon="📅" label="My Attendance Rate" val={`${stats.attendance}%`} color="#f59e0b" bg="#fef3c7" />
      </div>

      {/* ── Active Mentees Quick List ── */}
      {user.mentorProfile?.assignedTeachers?.length > 0 && (
        <div style={{ marginBottom: 24, padding: "16px", background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 12 }}>🎓 Your Mentees:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {user.mentorProfile.assignedTeachers.map((mentee, i) => (
              <div key={mentee._id || i} style={{ background: "white", padding: "6px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#1e40af", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }}></div>
                {mentee.name || "Unknown Fellow"}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={S.pageTitle}>My Profile</h1>
          <p style={S.pageSub}>Manage your personal information and preferences.</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} style={S.primaryBtn}>
            <span style={{ marginRight: 6 }}>✏️</span> Edit Profile
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setForm({ ...savedForm }); setEditing(false); setMessage(""); }} style={S.exportBtn}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{...S.primaryBtn, opacity: saving ? 0.7 : 1}}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Personal Info */}
          <SectionCard title="👤 Personal Information">
            <div style={{ display: "flex", gap: 24, marginBottom: 24, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 100, height: 100, borderRadius: "50%",
                  background: "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 36, fontWeight: 800, color: "#4f46e5",
                  border: "4px solid white", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  overflow: "hidden"
                }}>
                  {profilePhoto && !imageLoadError ? (
                    <img src={profilePhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImageLoadError(true)} />
                  ) : (
                    user?.name?.[0] || "?"
                  )}
                  {uploadingPhoto && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 14 }}>⏳</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  style={{
                    position: "absolute", bottom: 0, right: -4,
                    width: 32, height: 32, borderRadius: "50%",
                    background: "#3b82f6", color: "white", border: "2px solid white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: uploadingPhoto ? "not-allowed" : "pointer", boxShadow: "0 2px 6px rgba(59,130,246,0.3)"
                  }}
                  title="Upload Photo"
                >
                  📷
                </button>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: "none" }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{form.name}</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b", marginBottom: 8 }}>{user?.email}</p>
                {profilePhoto && (
                  <button onClick={handleRemovePhoto} disabled={uploadingPhoto} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Full Name</label>
                <input style={{...S.input, background: editing ? "white" : "#f8fafc", opacity: editing ? 1 : 0.7 }} value={form.name} onChange={e => setForm({...form, name: e.target.value})} disabled={!editing} />
              </div>
              <div>
                <label style={S.label}>Phone Number</label>
                <input style={{...S.input, background: editing ? "white" : "#f8fafc", opacity: editing ? 1 : 0.7 }} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} disabled={!editing} />
              </div>
              <div>
                <label style={S.label}>Email Address (Login ID)</label>
                <input style={{...S.input, background: editing ? "white" : "#f8fafc", opacity: editing ? 1 : 0.7 }} value={form.email} onChange={e => setForm({...form, email: e.target.value})} disabled={!editing} />
                <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, display: "block" }}>Changing this updates your login ID</span>
              </div>
            </div>
          </SectionCard>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Professional Details */}
          <SectionCard title="💼 Professional Details">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Working Center (Assigned by Admin)</label>
                <input style={{...S.input, background: "#f1f5f9", opacity: 0.6, cursor: "not-allowed" }} value={form.workingCenter} disabled />
              </div>
              <div>
                <label style={S.label}>Qualification</label>
                <input style={{...S.input, background: editing ? "white" : "#f8fafc", opacity: editing ? 1 : 0.7 }} value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} disabled={!editing} placeholder="e.g. M.Ed, B.Ed" />
              </div>
              <div>
                <label style={S.label}>Specialization</label>
                <input style={{...S.input, background: editing ? "white" : "#f8fafc", opacity: editing ? 1 : 0.7 }} value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})} disabled={!editing} placeholder="e.g. Early Childhood Education" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Experience / Bio</label>
                <textarea style={{...S.input, background: editing ? "white" : "#f8fafc", opacity: editing ? 1 : 0.7, minHeight: 80, resize: "vertical" }} value={form.experience} onChange={e => setForm({...form, experience: e.target.value})} disabled={!editing} placeholder="Brief background or experience..." />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Address</label>
                <textarea style={{...S.input, background: editing ? "white" : "#f8fafc", opacity: editing ? 1 : 0.7, minHeight: 60, resize: "vertical" }} value={form.address} onChange={e => setForm({...form, address: e.target.value})} disabled={!editing} placeholder="Full residential address" />
              </div>
            </div>
          </SectionCard>

          {/* Password Section */}
          <SectionCard title="🔐 Security">
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: 16, position: "relative" }}>
                <label style={S.label}>Current Password</label>
                <input type={showPassword.current ? "text" : "password"} style={S.input} required
                  value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} />
                <button type="button" onClick={() => setShowPassword({...showPassword, current: !showPassword.current})} style={{ position: "absolute", right: 12, top: 32, background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
                  {showPassword.current ? "👁️" : "🙈"}
                </button>
              </div>
              
              <div style={{ marginBottom: 16, position: "relative" }}>
                <label style={S.label}>New Password</label>
                <input type={showPassword.new ? "text" : "password"} style={S.input} required minLength={6}
                  value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
                <button type="button" onClick={() => setShowPassword({...showPassword, new: !showPassword.new})} style={{ position: "absolute", right: 12, top: 32, background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
                  {showPassword.new ? "👁️" : "🙈"}
                </button>
              </div>
              
              <div style={{ marginBottom: 20, position: "relative" }}>
                <label style={S.label}>Confirm New Password</label>
                <input type={showPassword.confirm ? "text" : "password"} style={S.input} required minLength={6}
                  value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
                <button type="button" onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})} style={{ position: "absolute", right: 12, top: 32, background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
                  {showPassword.confirm ? "👁️" : "🙈"}
                </button>
              </div>

              <button type="submit" disabled={changingPassword} style={{ ...S.exportBtn, width: "100%", background: "#f8fafc" }}>
                {changingPassword ? "Updating..." : "Change Password"}
              </button>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

/* ── Mentor Notifications Tab ── */
export function MentorNotificationsTab({ notifications = [], onMarkRead, onMarkAllRead }) {
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
    approval: "✅", approved: "✅", status: "✅", status_update: "✅",
    // attendance
    attendance: "📋", attendance_alert: "⚠️",
    // mentor-specific
    mentor_assigned: "👨‍🏫", teacher_claimed: "🤝", mentee: "👩‍🏫",
    // general
    info: "ℹ️", warning: "⚠️", alert: "🔔", system: "⚙️",
  };
  const getIcon = (type, msg = "") => {
    if (!type && !msg) return "🔔";
    const lower = String(type || "").toLowerCase();
    // First try exact type match
    if (lower && icons[lower] && lower !== "info") return icons[lower];
    // If type is generic/info, scan message content for context
    const text = (msg || "").toLowerCase();
    if (text.includes("approved") || text.includes("approval")) return "✅";
    if (text.includes("course") || text.includes("allocated")) return "📚";
    if (text.includes("curriculum") || text.includes("published")) return "📖";
    if (text.includes("fellow") || text.includes("assigned") || text.includes("teacher")) return "👩‍🏫";
    if (text.includes("capstone") || text.includes("deadline") || text.includes("missed")) return "⚠️";
    if (text.includes("certificate")) return "🏆";
    if (text.includes("attendance")) return "📋";
    if (text.includes("mentor")) return "👨‍🏫";
    if (text.includes("center")) return "🏫";
    if (text.includes("lesson")) return "📖";
    return icons[lower] || "🔔";
  };

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
              <div style={{ width: 40, height: 40, borderRadius: 10, background: n.read?"#f3f4f6":"#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{getIcon(n.type, n.msg)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: n.read?500:700, color: "#1c1917" }}>{n.msg || n.title || "Notification"}</div>
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

/* ── Mentor Feedback Tab ── */
export function MentorFeedbackTab({ user, setToast }) {
  const [rating, setRating]         = useState(0);
  const [trainerRating, setTRating] = useState(0);
  const [suggestion, setSuggestion] = useState("");
  const [course, setCourse]         = useState("");
  const [tag, setTag]               = useState("Content Quality");
  const [anonymous, setAnonymous]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [loading, setLoading]       = useState(true);

  const TAGS = ["Program UX", "Platform UX", "Mentee Progress", "Schedule", "Other"];
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
    if (!rating) { setToast?.({ msg: "Please rate your experience.", type: "error" }); return; }
    if (!suggestion.trim()) { setToast?.({ msg: "Please write your feedback.", type: "error" }); return; }
    setSubmitting(true);
    try {
      const trainerRatingPayload = trainerRating > 0 ? trainerRating : undefined;
      await submitFeedback({
        learner: anonymous ? "Anonymous" : user.name,
        teacherId: user._id, 
        course: course || "General Mentorship",
        ...(trainerRatingPayload !== undefined ? { trainerRating: trainerRatingPayload } : {}),
        rating,
        tag,
        suggestion,
        anonymous,
        status: "pending"
      });
      setToast?.({ msg: "Feedback submitted successfully! Thank you.", type: "success" });
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
      <p style={S.pageSub}>Share your mentor experience and help us improve.</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <SectionCard title="📝 New Feedback">
          <form onSubmit={handleSubmit}>
            <label style={S.label}>Mentee / Topic (optional)</label>
            <input style={{...S.input, marginBottom:12}} value={course} onChange={e=>setCourse(e.target.value)} placeholder="e.g. Teacher Mentorship Session"/>

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

            <label style={S.label}>Overall Experience *</label>
            <div style={{display:"flex", gap:4, marginBottom:12, cursor:"pointer"}}>
              {[1,2,3,4,5].map(i => (
                <span key={i} onClick={()=>setRating(i)} style={{fontSize:28, color: i<=rating?"#f59e0b":"#e5e7eb"}}>
                  {i<=rating?"★":"☆"}
                </span>
              ))}
              {rating > 0 && <span style={{fontSize:12, color:"#6b7280", marginLeft:8, alignSelf:"center"}}>{rating}/5</span>}
            </div>

            <label style={S.label}>Mentee Engagement (Optional)</label>
            <div style={{display:"flex", gap:4, marginBottom:12, cursor:"pointer"}}>
              {[1,2,3,4,5].map(i => (
                <span key={i} onClick={()=>setTRating(i)} style={{fontSize:22, color: i<=trainerRating?"#f59e0b":"#e5e7eb"}}>
                  {i<=trainerRating?"★":"☆"}
                </span>
              ))}
            </div>

            <label style={S.label}>Detailed Feedback *</label>
            <textarea style={{...S.input, minHeight:100, marginBottom:16}} value={suggestion} onChange={e=>setSuggestion(e.target.value)} placeholder="What went well? What could be improved?" required/>

            <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:20}}>
              <input type="checkbox" id="anon" checked={anonymous} onChange={e=>setAnonymous(e.target.checked)} style={{width:16, height:16, accentColor:"#f59e0b"}}/>
              <label htmlFor="anon" style={{fontSize:13, color:"#475569", cursor:"pointer"}}>Submit anonymously (Admin will not see your name)</label>
            </div>

            <button type="submit" disabled={submitting} style={{...S.primaryBtn, width:"100%", opacity: submitting ? 0.7 : 1}}>
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title="🕒 My Past Feedback">
          {loading ? (
             <div style={{padding:20, textAlign:"center", color:"#9ca3af"}}>Loading...</div>
          ) : myFeedbacks.length === 0 ? (
            <div style={{padding:30, textAlign:"center", color:"#9ca3af"}}>
              <div style={{fontSize:32, marginBottom:10}}>💬</div>
              <div style={{fontSize:14, fontWeight:600}}>No feedback submitted yet</div>
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:12, maxHeight:500, overflowY:"auto"}}>
              {myFeedbacks.map((f,i) => (
                <div key={i} style={{padding:16, borderRadius:12, border:"1px solid #f1f5f9", background:"#f8fafc"}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
                    <div style={{fontSize:14, fontWeight:700, color:"#1e293b"}}>{f.course}</div>
                    <div style={{display:"flex"}}>{stars(f.rating, 14)}</div>
                  </div>
                  <div style={{fontSize:11, color:"#6b7280", marginBottom:8}}>
                    <span style={{background:"#e2e8f0", padding:"2px 8px", borderRadius:10, marginRight:8}}>{f.tag}</span>
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "Just now"}
                  </div>
                  <div style={{fontSize:13, color:"#334155", lineHeight:1.5}}>
                    "{f.suggestion}"
                  </div>
                  {f.status === "reviewed" && (
                    <div style={{marginTop:10, padding:10, background:"#d1fae5", borderRadius:8, fontSize:12, color:"#065f46", border:"1px solid #a7f3d0"}}>
                      <strong>Admin Reply:</strong> {f.adminReply || "Thank you! We've noted your feedback."}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

/* ── Mentee Management Tab ── */
export function MenteeManagementTab({ user, setToast, onUserUpdate }) {
  const mentees = user?.mentorProfile?.assignedTeachers || [];
  const [subTab, setSubTab] = useState("my_mentees"); // "my_mentees" | "approvals"
  const [selectedMentee, setSelectedMentee] = useState(null);
  const [observationModal, setObservationModal] = useState(false);
  const [observationText, setObservationText] = useState("");
  
  // Pending / All fellows state for approvals subtab
  const [allFellows, setAllFellows] = useState([]);
  const [loadingFellows, setLoadingFellows] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  
  // Search and filters for approvals
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // default to all to show approved fellows as well
  const [selectedFellow, setSelectedFellow] = useState(null); // for detail modal

  const fetchFellows = () => {
    setLoadingFellows(true);
    getMentorFellows()
      .then(res => {
        setAllFellows(res?.fellows || []);
      })
      .catch(() => setToast?.({ msg: "Failed to load fellows.", type: "error" }))
      .finally(() => setLoadingFellows(false));
  };

  useEffect(() => {
    fetchFellows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);

  const handleRecordObservation = (mentee) => {
    setSelectedMentee(mentee);
    setObservationModal(true);
  };

  const submitObservation = async () => {
    if(!observationText.trim()) {
      setToast?.({ msg: "Observation cannot be empty", type: "error" });
      return;
    }
    
    try {
      await recordMenteeObservation(selectedMentee._id, observationText);
      setToast?.({ msg: "Observation recorded successfully!", type: "success" });
      setObservationModal(false);
      setObservationText("");
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to record observation", type: "error" });
    }
  };

  const handleStatusChange = async (fellowId, newStatus) => {
    setActioningId(fellowId);
    try {
      await updateFellowStatus(fellowId, newStatus);
      setToast?.({ msg: `Fellow account ${newStatus} successfully!`, type: "success" });
      
      // Refresh list
      fetchFellows();

      // Refresh mentor profile to sync assignedTeachers
      getMentorMe().then(res => {
        if (res.mentor) onUserUpdate(res.mentor);
      });
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to update fellow status", type: "error" });
    } finally {
      setActioningId(null);
    }
  };

  const isClaimed = (fellowId) => {
    return mentees.some(m => {
      const id = typeof m === 'object' && m !== null ? (m._id || m.id) : m;
      return id?.toString() === fellowId?.toString();
    });
  };

  const handleClaimFellow = async (fellowId) => {
    setActioningId(fellowId);
    
    // Optimistic UI Update
    const claimedFellow = allFellows.find(f => (f._id || f.id) === fellowId);
    if (claimedFellow && !isClaimed(fellowId)) {
      onUserUpdate({
        ...user,
        mentorProfile: {
          ...user.mentorProfile,
          assignedTeachers: [...mentees, claimedFellow]
        }
      });
      // Optimistically update fellow status in allFellows list
      setAllFellows(prev => prev.map(f => (f._id || f.id) === fellowId ? { ...f, status: "approved" } : f));
    }

    try {
      await claimFellow(fellowId);
      setToast?.({ msg: "Fellow successfully claimed and added to your mentees!", type: "success" });
      
      // Refresh list
      fetchFellows();

      // Refresh mentor profile to sync assignedTeachers
      getMentorMe().then(res => {
        if (res.mentor) onUserUpdate(res.mentor);
      });
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to claim fellow", type: "error" });
      // Revert optimistic update on failure by re-fetching
      getMentorMe().then(res => {
        if (res.mentor) onUserUpdate(res.mentor);
      });
    } finally {
      setActioningId(null);
    }
  };

  const handleUnclaimFellow = async (fellowId) => {
    setActioningId(fellowId);

    // Optimistic UI Update
    if (isClaimed(fellowId)) {
      onUserUpdate({
        ...user,
        mentorProfile: {
          ...user.mentorProfile,
          assignedTeachers: mentees.filter(m => (m._id || m.id || m).toString() !== fellowId.toString())
        }
      });
      // Optimistically update fellow status in allFellows list
      setAllFellows(prev => prev.map(f => (f._id || f.id) === fellowId ? { ...f, status: "pending" } : f));
    }

    try {
      await unclaimFellow(fellowId);
      setToast?.({ msg: "Fellow successfully unclaimed and removed from your mentees.", type: "success" });
      
      // Refresh list
      fetchFellows();

      // Refresh mentor profile to sync assignedTeachers
      getMentorMe().then(res => {
        if (res.mentor) onUserUpdate(res.mentor);
      });
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to unclaim fellow", type: "error" });
      // Revert optimistic update on failure by re-fetching
      getMentorMe().then(res => {
        if (res.mentor) onUserUpdate(res.mentor);
      });
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteFellow = async (fellowId) => {
    if (!window.confirm("Are you sure you want to permanently delete this fellow's account? This action cannot be undone.")) return;
    
    setActioningId(fellowId);
    
    // Optimistic UI Update
    setAllFellows(prev => prev.filter(f => (f._id || f.id) !== fellowId));
    onUserUpdate({
      ...user,
      mentorProfile: {
        ...user.mentorProfile,
        assignedTeachers: mentees.filter(m => (m._id || m.id || m).toString() !== fellowId.toString())
      }
    });

    try {
      await deleteMentorFellow(fellowId);
      setToast?.({ msg: "Fellow account successfully deleted.", type: "success" });
      
      // Refresh list
      fetchFellows();
      getMentorMe().then(res => {
        if (res.mentor) onUserUpdate(res.mentor);
      });
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to delete fellow", type: "error" });
      // Revert optimistic update
      fetchFellows();
      getMentorMe().then(res => {
        if (res.mentor) onUserUpdate(res.mentor);
      });
    } finally {
      setActioningId(null);
    }
  };
// end dnyaneshwari thorat

  // Filter fellows based on search and statusFilter
  const filteredFellows = allFellows.filter(f => {
    const matchesSearch = f.name?.toLowerCase().includes(search.toLowerCase()) || 
                          f.email?.toLowerCase().includes(search.toLowerCase()) ||
                          f.phone?.includes(search) ||
                          f.teacherProfile?.subject?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = allFellows.filter(f => f.status === "pending").length;
  const approvedCount = allFellows.filter(f => f.status === "approved").length;
  const rejectedCount = allFellows.filter(f => f.status === "rejected" || f.status === "blocked").length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Mentee Management</h1>
      <p style={S.pageSub}>Observe, guide, and track progress for your assigned teachers and fellows.</p>

      {/* Sub-tab navigation */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
        <button 
          onClick={() => setSubTab("my_mentees")}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13,
            background: subTab === "my_mentees" ? "#eff6ff" : "transparent",
            color: subTab === "my_mentees" ? "#1e40af" : "#64748b",
            cursor: "pointer", transition: "all 0.2s"
          }}
        >
          👥 My Mentees ({mentees.length})
        </button>
        <button 
          onClick={() => setSubTab("approvals")}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13,
            background: subTab === "approvals" ? "#fef3c7" : "transparent",
            color: subTab === "approvals" ? "#92400e" : "#64748b",
            cursor: "pointer", transition: "all 0.2s"
          }}
        >
          ⏳ Fellow Approvals {pendingCount > 0 && <span style={{ marginLeft: 6, background: "#ef4444", color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: 9 }}>{pendingCount}</span>}
        </button>
      </div>

      {subTab === "my_mentees" ? (
        mentees.length === 0 ? (
          <div style={{ background: "white", padding: 40, borderRadius: 16, textAlign: "center", border: "1px dashed #cbd5e1" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <h3 style={{ margin: "0 0 8px", color: "#1e293b" }}>No Mentees Assigned</h3>
            <p style={{ color: "#64748b", margin: 0 }}>You currently do not have any teachers or fellows assigned to you. Admin will assign mentees soon.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* start dnyaneshwari thorat */}
            {mentees.map((mentee, i) => (
              <div key={mentee._id || i} style={{ background: "white", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
                
                {/* 1. Identity & Progress */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: "1 1 250px" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#fef3c7", border: "2px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                      {mentee.role === "fellow" ? "🎓" : "👩‍🏫"}
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#0f172a" }}>{mentee.name || "Unknown Fellow"}</h3>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {mentee.role === "fellow" ? "Fellow" : "General Teacher"} • {mentee.teacherProfile?.subject || "ECCE"}
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 4, display: "flex", gap: 12 }}>
                        {mentee.email && <span>✉️ {mentee.email}</span>}
                        {mentee.phone && <span>📞 {mentee.phone}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ background: "#f8fafc", padding: 12, borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "#475569", fontWeight: 600 }}>Course Progress</span>
                      <span style={{ color: "#3b82f6", fontWeight: 800 }}>{(Math.random() * 40 + 60).toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: "75%", height: "100%", background: "#3b82f6", borderRadius: 3 }}></div>
                    </div>
                  </div>
                </div>

                {/* 2. Checklist */}
                <div style={{ background: "#f1f5f9", padding: 16, borderRadius: 10, display: "flex", flexDirection: "column", gap: 10, flex: "2 1 350px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", borderBottom: "1px solid #cbd5e1", paddingBottom: 6 }}>📋 Mentor Tracking Checklist</div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>1. Community Profiling</span>
                    <select 
                      value={mentee.teacherProfile?.communityProfilingStatus || "pending"} 
                      onChange={async (e) => {
                        const newVal = e.target.value;
                        // Optimistic UI Update
                        const updatedMentees = mentees.map(m => 
                          (m._id || m.id) === mentee._id 
                            ? { ...m, teacherProfile: { ...m.teacherProfile, communityProfilingStatus: newVal } } 
                            : m
                        );
                        onUserUpdate({ ...user, mentorProfile: { ...user.mentorProfile, assignedTeachers: updatedMentees } });
                        
                        try {
                          await updateMenteeTracking(mentee._id, { communityProfilingStatus: newVal });
                          setToast?.({ msg: "Community Profiling status updated!", type: "success" });
                          getMentorMe().then(res => { if (res.mentor) onUserUpdate(res.mentor); });
                        } catch (err) {
                          setToast?.({ msg: err.message || "Failed to update tracking", type: "error" });
                          getMentorMe().then(res => { if (res.mentor) onUserUpdate(res.mentor); });
                        }
                      }}
                      style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 11, background: "white", color: "#1e293b", fontWeight: 600 }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>2. Community Immersion</span>
                    <select 
                      value={mentee.teacherProfile?.communityImmersionStatus || "pending"} 
                      onChange={async (e) => {
                        const newVal = e.target.value;
                        // Optimistic UI Update
                        const updatedMentees = mentees.map(m => 
                          (m._id || m.id) === mentee._id 
                            ? { ...m, teacherProfile: { ...m.teacherProfile, communityImmersionStatus: newVal } } 
                            : m
                        );
                        onUserUpdate({ ...user, mentorProfile: { ...user.mentorProfile, assignedTeachers: updatedMentees } });

                        try {
                          await updateMenteeTracking(mentee._id, { communityImmersionStatus: newVal });
                          setToast?.({ msg: "Community Immersion status updated!", type: "success" });
                          getMentorMe().then(res => { if (res.mentor) onUserUpdate(res.mentor); });
                        } catch (err) {
                          setToast?.({ msg: err.message || "Failed to update tracking", type: "error" });
                          getMentorMe().then(res => { if (res.mentor) onUserUpdate(res.mentor); });
                        }
                      }}
                      style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 11, background: "white", color: "#1e293b", fontWeight: 600 }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>3. Daily Curriculum Implementation</span>
                    <select 
                      value={mentee.teacherProfile?.curriculumImplementationStatus || "pending"} 
                      onChange={async (e) => {
                        const newVal = e.target.value;
                        // Optimistic UI Update
                        const updatedMentees = mentees.map(m => 
                          (m._id || m.id) === mentee._id 
                            ? { ...m, teacherProfile: { ...m.teacherProfile, curriculumImplementationStatus: newVal } } 
                            : m
                        );
                        onUserUpdate({ ...user, mentorProfile: { ...user.mentorProfile, assignedTeachers: updatedMentees } });

                        try {
                          await updateMenteeTracking(mentee._id, { curriculumImplementationStatus: newVal });
                          setToast?.({ msg: "Daily Curriculum status updated!", type: "success" });
                          getMentorMe().then(res => { if (res.mentor) onUserUpdate(res.mentor); });
                        } catch (err) {
                          setToast?.({ msg: err.message || "Failed to update tracking", type: "error" });
                          getMentorMe().then(res => { if (res.mentor) onUserUpdate(res.mentor); });
                        }
                      }}
                      style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 11, background: "white", color: "#1e293b", fontWeight: 600 }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* 3. Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 150px" }}>
                  <button onClick={() => handleRecordObservation(mentee)} style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                    📝 Record Observation
                  </button>
                  <button onClick={() => setToast?.({ msg: "Message feature coming soon!", type: "info" })} style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>
                    💬 Message
                  </button>
                </div>
              </div>
            ))}
            {/* end dnyaneshwari thorat */}
          </div>
        )
      ) : (
        /* Fellow Approvals View (Styled exactly like Admin's Teacher Management) */
        <div>
          {/* Header Banner */}
          <div style={{ background: "linear-gradient(135deg,#f59e0b 0%,#d97706 60%,#b45309 100%)", borderRadius: 20, padding: "24px 28px", marginBottom: 24, color: "white", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fffbeb", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>Fellow Management</div>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px" }}>Fellow Approvals</h1>
              <p style={{ fontSize: 12, margin: 0, color: "rgba(255,255,255,0.85)" }}>
                {approvedCount} approved · {pendingCount} pending · {allFellows.length} total
              </p>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
            <StatCard icon="🎓" label="Total Registered" val={allFellows.length} color="#3b82f6" bg="#dbeafe" />
            <StatCard icon="✅" label="Approved" val={approvedCount} color="#10b981" bg="#d1fae5" />
            <StatCard icon="⏳" label="Pending Approval" val={pendingCount} color="#f59e0b" bg="#fef3c7" />
            <StatCard icon="🚫" label="Rejected" val={rejectedCount} color="#ef4444" bg="#fee2e2" />
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, phone or specialization..." />
            </div>
            <select style={{ ...S.input, width: 140, padding: "8px 12px", marginBottom: 0 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Approvals Table */}
          {loadingFellows ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40, color: "#64748b" }}>🔄 Loading approvals...</div>
          ) : (
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    {["Fellow", "Phone", "Qualification", "Specialization", "Joined", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFellows.map((fellow, i) => (
                    <tr key={fellow._id} style={{ borderBottom: "1px solid #f9fafb", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#ede9fe", border: "1.5px solid #ddd6fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#7c3aed" }}>
                            {fellow.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{fellow.name || "Unknown Fellow"}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af" }}>{fellow.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#374151" }}>{fellow.phone || "—"}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#374151" }}>{fellow.teacherProfile?.qualification || "Graduate"}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#374151" }}>{fellow.teacherProfile?.subject || "ECCE"}</td>
                      <td style={{ padding: "12px 14px", fontSize: 12, color: "#9ca3af" }}>
                        {fellow.createdAt ? new Date(fellow.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {/* start dnyaneshwari thorat */}
                        {isClaimed(fellow._id) ? (
                          <span style={{ background: "#cffafe", color: "#0891b2", padding: "4px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, display: "inline-block", border: "1px solid #67e8f9" }}>Claimed</span>
                        ) : (
                          <StatusBadge status={fellow.status} />
                        )}
                        {/* end dnyaneshwari thorat */}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button onClick={() => setSelectedFellow(fellow)} style={{ ...S.tblBtn, color: "#3b82f6", borderColor: "#93c5fd" }}>👁 View</button>
                          
                          {/* start dnyaneshwari thorat */}
                          {!isClaimed(fellow._id) ? (
                            <button
                              disabled={actioningId === fellow._id}
                              onClick={() => handleClaimFellow(fellow._id)}
                              style={{ ...S.tblBtn, color: "#8b5cf6", borderColor: "#c084fc", fontWeight: 800 }}
                            >
                              ➕ Claim Fellow
                            </button>
                          ) : (
                            <button
                              disabled={actioningId === fellow._id}
                              onClick={() => handleUnclaimFellow(fellow._id)}
                              style={{ ...S.tblBtn, color: "#10b981", borderColor: "#34d399", background: "#ecfdf5", fontWeight: 800 }}
                            >
                              ✅ Claimed (Reset)
                            </button>
                          )}
                          <button
                            disabled={actioningId === fellow._id}
                            onClick={() => handleDeleteFellow(fellow._id)}
                            style={{ ...S.tblBtn, color: "#ef4444", borderColor: "#fca5a5", fontWeight: 800 }}
                            title="Permanently delete fellow account"
                          >
                            🗑 Delete
                          </button>
                          {/* end dnyaneshwari thorat */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredFellows.length === 0 && (
                <div style={{ textAlign: "center", padding: "50px", color: "#9ca3af" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>No fellows found</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filters</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fellow Details Modal */}
      {selectedFellow && (
        <Modal title="🎓 Fellow Profile Details" onClose={() => setSelectedFellow(null)}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#ede9fe", border: "2px solid #ddd6fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
              🎓
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>{selectedFellow.name}</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{selectedFellow.email}</p>
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13, marginBottom: 20 }}>
            <div><strong>Phone:</strong> {selectedFellow.phone || "—"}</div>
            <div><strong>Status:</strong> <StatusBadge status={selectedFellow.status} /></div>
            <div><strong>Qualification:</strong> {selectedFellow.teacherProfile?.qualification || "Graduate"}</div>
            <div><strong>Specialization:</strong> {selectedFellow.teacherProfile?.subject || "ECCE"}</div>
            <div><strong>Experience:</strong> {selectedFellow.teacherProfile?.experience || "2 years"}</div>
            <div><strong>Address:</strong> {selectedFellow.teacherProfile?.address || "N/A"}</div>
            <div><strong>Joined Date:</strong> {selectedFellow.createdAt ? new Date(selectedFellow.createdAt).toLocaleString("en-IN") : "—"}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            {selectedFellow.status === "pending" && (
              <>
                <button 
                  disabled={actioningId === selectedFellow._id}
                  onClick={() => { handleStatusChange(selectedFellow._id, "approved"); setSelectedFellow(null); }}
                  style={{ ...S.btnGreen, padding: "8px 16px" }}
                >
                  ✓ Approve
                </button>
                <button 
                  disabled={actioningId === selectedFellow._id}
                  onClick={() => { handleStatusChange(selectedFellow._id, "rejected"); setSelectedFellow(null); }}
                  style={{ ...S.btnRed, padding: "8px 16px" }}
                >
                  ✕ Reject
                </button>
              </>
            )}
            <button onClick={() => setSelectedFellow(null)} style={{ ...S.exportBtn, background: "#f1f5f9" }}>Close</button>
          </div>
        </Modal>
      )}

      {/* Observation Modal */}
      {observationModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, animation: "fadeIn 0.2s" }}>
          <div style={{ background: "white", padding: 30, borderRadius: 20, width: "100%", maxWidth: 500, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#0f172a" }}>Record Observation</h2>
            <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 14 }}>Mentee: <strong>{selectedMentee?.name}</strong></p>
            
            <label style={S.label}>Observation Notes</label>
            <textarea 
              autoFocus
              style={{...S.input, minHeight: 120, resize: "vertical", marginBottom: 20}} 
              value={observationText} 
              onChange={e => setObservationText(e.target.value)} 
              placeholder="What did you observe during the session? What feedback was given?"
            />

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setObservationModal(false)} style={{...S.exportBtn, background: "#f1f5f9"}}>Cancel</button>
              <button onClick={submitObservation} style={S.primaryBtn}>Submit Observation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Impact & Capstone Tab ── */
export function ImpactCapstoneTab({ user, setToast, onUserUpdate }) {
  const [capstoneText, setCapstoneText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = () => {
    setLoading(true);
    getCapstoneSubmissions()
      .then(res => setSubmissions(res.submissions || []))
      .catch(err => console.error("Failed to fetch Capstone", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const MILESTONES = [
    { id: 1, title: "Problem Identification", desc: "Identify a core challenge in the early childhood community." },
    { id: 2, title: "Solution Design", desc: "Design a targeted intervention & pedagogical framework." },
    { id: 3, title: "Implementation", desc: "Execute the solution in classroom settings & collect data." },
    { id: 4, title: "Evaluation", desc: "Analyze impact metrics, synthesize findings & finalize report." }
  ];

  const milestone = Math.min(submissions.length + 1, 4);
  const isAllCompleted = submissions.length >= 4;

  const handleSubmit = async () => {
    if(!capstoneText.trim()) {
      setToast?.({ msg: "Please enter your submission notes or document link.", type: "error" });
      return;
    }
    setSubmitting(true);
    
    try {
      await submitCapstoneMilestone(milestone, capstoneText, "");
      setToast?.({ msg: `Milestone ${milestone} submitted successfully!`, type: "success" });
      setCapstoneText("");
      fetchSubmissions();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to submit milestone", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = (e, file) => {
    e.preventDefault();
    setToast?.({ msg: `Downloading ${file}...`, type: "info" });
    const link = document.createElement("a");
    link.href = `/resources/${encodeURIComponent(file)}`;
    link.download = file;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const menteesCount = user?.mentorProfile?.assignedTeachers?.length || 0;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Role Badge + Page Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
              Mentor Workspace
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>Impact & Capstone</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Track your Semester 4 Capstone milestones and mentee leadership impact.</p>
        </div>
      </div>

      {/* Top 3 Compact Industrial Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        
        {/* Stat 1: Impact Score */}
        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Impact Score</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: "#d1fae5", color: "#047857", padding: "2px 6px", borderRadius: 4 }}>● Top 10%</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>A+</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Evaluated from mentee progress & reviews</div>
        </div>

        {/* Stat 2: Teachers Guided */}
        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Teachers Guided</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4 }}>● Active</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>{menteesCount}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Fellows currently assigned under mentorship</div>
        </div>

        {/* Stat 3: Capstone Status */}
        <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Capstone Status</span>
            <span style={{ fontSize: 10, fontWeight: 700, background: isAllCompleted ? "#d1fae5" : "#fef3c7", color: isAllCompleted ? "#047857" : "#b45309", padding: "2px 6px", borderRadius: 4 }}>
              {isAllCompleted ? "Completed" : "In Progress"}
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginTop: 4, letterSpacing: "-0.3px" }}>
            {isAllCompleted ? "4 / 4 Completed" : `Milestone ${milestone} of 4`}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{submissions.length} milestone{submissions.length === 1 ? "" : "s"} submitted & verified</div>
        </div>
      </div>

      {/* Main Grid: Capstone Hero & Resources Sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        
        {/* HERO: Capstone Project Tracker */}
        <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 14, borderBottom: "1px solid #f1f5f9" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Capstone Project Sequence</h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Complete each milestone in order. Submissions sync with program advisors.</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", background: "#f8fafc", padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
              Progress: {Math.round((submissions.length / 4) * 100)}%
            </span>
          </div>

          {/* Stepper Progress Bar */}
          <div style={{ position: "relative", marginBottom: 32, padding: "0 8px" }}>
            {/* Background Line */}
            <div style={{ position: "absolute", top: 14, left: 32, right: 32, height: 2, background: "#e2e8f0", zIndex: 0 }}>
              <div style={{ height: "100%", width: `${(Math.max(0, submissions.length) / 3) * 100}%`, background: "#2563eb", transition: "width 0.4s ease" }} />
            </div>

            {/* Nodes */}
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
              {MILESTONES.map((m) => {
                const isPassed = submissions.length >= m.id;
                const isCurrent = milestone === m.id && !isAllCompleted;
                return (
                  <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 90 }}>
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: isPassed ? "#059669" : isCurrent ? "#2563eb" : "#f8fafc",
                      border: `2px solid ${isPassed ? "#059669" : isCurrent ? "#2563eb" : "#cbd5e1"}`,
                      color: isPassed || isCurrent ? "#ffffff" : "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 8,
                      boxShadow: isCurrent ? "0 0 0 4px rgba(37, 99, 235, 0.15)" : "none",
                      transition: "all 0.25s ease"
                    }}>
                      {isPassed ? "✓" : m.id}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: isCurrent || isPassed ? 700 : 500, textAlign: "center", color: isCurrent ? "#0f172a" : isPassed ? "#059669" : "#64748b", lineHeight: 1.3, height: 28 }}>
                      {m.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submission / Active Milestone Form */}
          {!isAllCompleted ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Milestone {milestone} of 4
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b", background: "#ffffff", padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                  Status: Pending Submission
                </span>
              </div>
              <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{MILESTONES[milestone - 1]?.title}</h3>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{MILESTONES[milestone - 1]?.desc}</p>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                  Submission Deliverables / Evidence Link <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea 
                  style={{
                    width: "100%",
                    minHeight: 110,
                    padding: "10px 12px",
                    fontSize: 13,
                    color: "#0f172a",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s, box-shadow 0.15s"
                  }} 
                  placeholder="Provide a summary of your work or paste a link to your Google Drive / Docs evidence folder..."
                  value={capstoneText}
                  onChange={e => setCapstoneText(e.target.value)}
                  onFocus={e => { e.target.style.borderColor = "#2563eb"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
                  onBlur={e => { e.target.style.borderColor = "#cbd5e1"; e.target.style.boxShadow = "none"; }}
                />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  💡 Helper: Paste a Drive/Docs link or write 2–3 detailed sentences explaining your deliverables.
                </div>
              </div>
              
              <button 
                onClick={handleSubmit} 
                disabled={submitting} 
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  transition: "background 0.2s"
                }}
                onMouseOver={e => { if(!submitting) e.target.style.background = "#1e293b"; }}
                onMouseOut={e => { if(!submitting) e.target.style.background = "#0f172a"; }}
              >
                {submitting ? "Submitting..." : `Submit Milestone ${milestone}`}
              </button>
            </div>
          ) : (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 24, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#166534" }}>All Capstone Milestones Completed</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#15803d" }}>Congratulations! You have submitted all 4 milestones for your Semester 4 Capstone project.</p>
            </div>
          )}

          {/* Past Submissions Log */}
          {submissions.length > 0 && (
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Submission History ({submissions.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {submissions.map((sub, idx) => (
                  <div key={sub._id || idx} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                        Milestone {sub.milestone || idx + 1}: {MILESTONES[(sub.milestone || idx + 1) - 1]?.title}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#047857", background: "#d1fae5", padding: "2px 6px", borderRadius: 4 }}>
                        ✓ Verified
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                      {sub.text || sub.notes || "Submission logged."}
                    </p>
                    {sub.createdAt && (
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                        Logged: {new Date(sub.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SLIM SIDEBAR: Resources & Guidance */}
        <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 800, color: "#0f172a" }}>📎 Resources & Guides</h3>
          <p style={{ margin: "0 0 14px", fontSize: 11, color: "#64748b" }}>Reference files for Capstone preparation.</p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { title: "Semester 4 Handbook (PDF)", file: "Semester 4 Handbook.pdf", size: "2.4 MB", type: "PDF" },
              { title: "Capstone Presentation Template", file: "Capstone Presentation Template.pptx", size: "1.8 MB", type: "PPTX" },
              { title: "Impact Measurement Guidelines", file: "Impact Measurement Guidelines.pdf", size: "1.1 MB", type: "PDF" },
              { title: "Example Capstone Reports", file: "Example Capstone Reports.zip", size: "4.5 MB", type: "ZIP" },
            ].map((res, i) => (
              <a 
                key={i}
                href="#"
                onClick={(e) => handleDownload(e, res.file)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  textDecoration: "none",
                  transition: "all 0.15s ease"
                }}
                onMouseOver={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                onMouseOut={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 14 }}>📄</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {res.title}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{res.type} · {res.size}</div>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>↓</span>
              </a>
            ))}
          </div>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #f1f5f9", background: "#faf5ff", padding: 12, borderRadius: 8, border: "1px solid #f3e8ff" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7e22ce", marginBottom: 2 }}>💬 Need Guidance?</div>
            <div style={{ fontSize: 11, color: "#6b21a8", lineHeight: 1.4 }}>Contact your assigned program coordinator or reach out via Feedback tab.</div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper function to render clickable evidence links
const renderEvidenceLinks = (evidence) => {
  if (!evidence) return null;
  let items = [];
  if (Array.isArray(evidence)) {
    items = evidence;
  } else if (typeof evidence === "string") {
    items = evidence.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  }
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#0284c7" }}>📎 Evidence Links:</span>
      {items.map((link, idx) => {
        let href = link;
        if (!href.startsWith("http://") && !href.startsWith("https://")) {
          href = `https://${href}`;
        }
        let displayLabel = link;
        try {
          const parsed = new URL(href);
          displayLabel = parsed.hostname + (parsed.pathname.length > 15 ? parsed.pathname.substring(0, 15) + "..." : parsed.pathname);
        } catch (e) {
          if (displayLabel.length > 35) displayLabel = displayLabel.substring(0, 32) + "...";
        }
        return (
          <a
            key={idx}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={link}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#2563eb",
              background: "#eff6ff",
              border: "1px solid #93c5fd",
              padding: "3px 8px",
              borderRadius: 6,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
          >
            🔗 <span>{displayLabel}</span> ↗
          </a>
        );
      })}
    </div>
  );
};

export function PDCATab({ user, setToast, onUserUpdate }) {
  const mentees = user?.mentorProfile?.assignedTeachers || [];

  const [selectedMenteeId, setSelectedMenteeId] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("all");

  // Plan creation / editing state
  const [editingCycle, setEditingCycle] = useState(null); // null for new, or cycle object for draft
  const [planForm, setPlanForm] = useState({
    planTitle: "",
    planObjective: "",
    planArea: "",
    planExpectedOutcomes: "",
    planActivities: "",
    planStartDate: "",
    planTargetDate: "",
    planInstructions: ""
  });
  const [submittingPlan, setSubmittingPlan] = useState(false);

  // Check stage review modal state
  const [checkCycle, setCheckCycle] = useState(null);
  const [checkForm, setCheckForm] = useState({
    checkFeedback: "",
    checkScore: "5/5",
    checkStrengths: "",
    checkGaps: "",
    checkRecommendations: "",
    revisionRequired: false
  });
  const [submittingCheck, setSubmittingCheck] = useState(false);

  // Full cycle details modal
  const [viewingCycle, setViewingCycle] = useState(null);

  const fetchCycles = () => {
    setLoading(true);
    getPDCACycles()
      .then(res => setHistory(res.cycles || []))
      .catch(err => console.error("Failed to fetch Growth Cycles", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const cycleMenteeId = (cycle) => {
    const m = cycle.menteeId;
    if (!m) return null;
    return typeof m === "object" ? (m._id || m.id) : m;
  };

  const cycleMenteeName = (cycle) => {
    const m = cycle.menteeId;
    if (!m) return "Unassigned";
    if (typeof m === "object" && m.name) return m.name;
    const found = mentees.find(mm => String(mm._id) === String(m));
    return found?.name || "Unknown Fellow";
  };

  const resetPlanForm = () => {
    setEditingCycle(null);
    setSelectedMenteeId("");
    setPlanForm({
      planTitle: "",
      planObjective: "",
      planArea: "",
      planExpectedOutcomes: "",
      planActivities: "",
      planStartDate: "",
      planTargetDate: "",
      planInstructions: ""
    });
  };

  const handleCreateOrUpdatePlan = async (isPublish) => {
    if (!editingCycle && !selectedMenteeId) {
      setToast?.({ msg: "Please select an assigned teacher for this Growth Cycle.", type: "error" });
      return;
    }
    if (!planForm.planTitle.trim()) {
      setToast?.({ msg: "Please enter a Plan Title.", type: "error" });
      return;
    }

    setSubmittingPlan(true);
    try {
      let cycle = editingCycle;
      if (!cycle) {
        // Create new DRAFT
        const res = await submitPDCAPlanDraft({
          menteeId: selectedMenteeId,
          ...planForm
        });
        cycle = res.cycle;
      } else {
        // Update DRAFT
        const res = await updatePDCAPlanDraft(cycle._id, planForm);
        cycle = res.cycle;
      }

      if (isPublish && cycle) {
        await publishPDCAPlan(cycle._id);
        setToast?.({ msg: "Growth Plan Published successfully! Teacher can now begin DO stage.", type: "success" });
      } else {
        setToast?.({ msg: "Growth Plan Draft saved successfully.", type: "success" });
      }

      resetPlanForm();
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to save Growth Plan", type: "error" });
    } finally {
      setSubmittingPlan(false);
    }
  };

  const openEditDraft = (cycle) => {
    setEditingCycle(cycle);
    setSelectedMenteeId(cycleMenteeId(cycle));
    setPlanForm({
      planTitle: cycle.planTitle || "",
      planObjective: cycle.planObjective || "",
      planArea: cycle.planArea || "",
      planExpectedOutcomes: cycle.planExpectedOutcomes || "",
      planActivities: cycle.planActivities || "",
      planStartDate: cycle.planStartDate ? new Date(cycle.planStartDate).toISOString().split('T')[0] : "",
      planTargetDate: cycle.planTargetDate ? new Date(cycle.planTargetDate).toISOString().split('T')[0] : "",
      planInstructions: cycle.planInstructions || ""
    });
  };

  const openCheckModal = (cycle) => {
    setCheckCycle(cycle);
    setCheckForm({
      checkFeedback: cycle.checkFeedback || "",
      checkScore: cycle.checkScore || "5/5",
      checkStrengths: cycle.checkStrengths || "",
      checkGaps: cycle.checkGaps || "",
      checkRecommendations: cycle.checkRecommendations || "",
      revisionRequired: cycle.revisionRequired || false
    });
  };

  const handleCheckSubmit = async (isSubmit) => {
    if (!checkCycle) return;
    if (isSubmit && !checkForm.checkFeedback.trim()) {
      setToast?.({ msg: "Please enter mentor review feedback before submitting.", type: "error" });
      return;
    }

    setSubmittingCheck(true);
    try {
      if (isSubmit) {
        await submitPDCACheck(checkCycle._id, checkForm);
        setToast?.({
          msg: checkForm.revisionRequired 
            ? "Revision requested from Teacher. Growth Cycle updated."
            : "Mentor Check submitted successfully! Teacher can now complete ACT stage.",
          type: "success"
        });
      } else {
        await savePDCACheckDraft(checkCycle._id, checkForm);
        setToast?.({ msg: "Check draft saved.", type: "success" });
      }

      setCheckCycle(null);
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to save Check stage.", type: "error" });
    } finally {
      setSubmittingCheck(false);
    }
  };

  const applyUmangModule = (moduleObj) => {
    if (!moduleObj) return;
    setPlanForm(prev => ({
      ...prev,
      planTitle: moduleObj.title,
      planArea: moduleObj.area,
      planObjective: moduleObj.objective,
      planExpectedOutcomes: moduleObj.outcomes,
      planActivities: moduleObj.activities,
      planInstructions: moduleObj.instructions
    }));
    setToast?.({ msg: `Applied Umang Curriculum Module: "${moduleObj.title}"`, type: "info" });
  };

  const applyHaalsActivity = (actObj, domainName) => {
    if (!actObj) return;
    setPlanForm(prev => ({
      ...prev,
      planTitle: actObj.name,
      planArea: `${domainName} (Milestone: ${actObj.milestone})`,
      planObjective: actObj.purpose,
      planExpectedOutcomes: `Activity Duration: ${actObj.duration}. Materials: ${actObj.materials}`,
      planActivities: `Activity Name: ${actObj.name}\nDuration: ${actObj.duration}\nMaterials Required: ${actObj.materials}\n\nTarget Milestone: ${actObj.milestone}\nExpected Learning: ${actObj.purpose}`,
      planInstructions: `Facilitator Guidelines: ${actObj.instructions}`
    }));
    setToast?.({ msg: `Applied HAALS Preset: "${actObj.name}"`, type: "info" });
  };

  const statusMeta = (status, revisionRequired) => {
    if (revisionRequired && status === "DO_IN_PROGRESS") {
      return { label: "Revision Requested", bg: "#ffedd5", color: "#c2410c", icon: "⟳", step: "DO (Revision)" };
    }
    switch (status) {
      case "DRAFT": return { label: "Plan Draft", bg: "#f1f5f9", color: "#475569", icon: "📝", step: "PLAN (Draft)" };
      case "PLAN_PUBLISHED": return { label: "Waiting for Teacher Do", bg: "#fef3c7", color: "#b45309", icon: "⏳", step: "DO (In Progress)" };
      case "DO_IN_PROGRESS": return { label: "Teacher Working on Do", bg: "#fef3c7", color: "#b45309", icon: "✍️", step: "DO (In Progress)" };
      case "DO_SUBMITTED": return { label: "Check Ready for Review!", bg: "#e0e7ff", color: "#3730a3", icon: "🔍", step: "CHECK (Action Needed)" };
      case "CHECK_IN_PROGRESS": return { label: "Check Draft Saved", bg: "#e0e7ff", color: "#3730a3", icon: "🔍", step: "CHECK (Draft)" };
      case "CHECK_COMPLETED": return { label: "Waiting for Teacher Act", bg: "#ede9fe", color: "#6d28d9", icon: "✨", step: "ACT (In Progress)" };
      case "ACT_IN_PROGRESS": return { label: "Teacher Working on Act", bg: "#ede9fe", color: "#6d28d9", icon: "✨", step: "ACT (In Progress)" };
      case "ACT_SUBMITTED":
      case "COMPLETED": return { label: "Growth Cycle Completed", bg: "#d1fae5", color: "#047857", icon: "🏆", step: "COMPLETED" };
      default: return { label: status, bg: "#f1f5f9", color: "#475569", icon: "📌", step: status };
    }
  };

  const filteredHistory = historyFilter === "all"
    ? history
    : history.filter(h => String(cycleMenteeId(h)) === String(historyFilter));

  return (
    <div style={{ animation: "fadeIn 0.3s ease", color: "#0f172a" }}>
      
      {/* Header Banner */}
      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
          PDCA Continuous Improvement Framework
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "4px 0 2px" }}>🔄 Growth Cycle (Plan – Do – Check – Act)</h1>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Initiate growth plans for teachers, review their implementations, conduct checks, and guide final improvement actions.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24 }}>
        
        {/* ========================================================= */}
        {/* PLAN STAGE CREATION & EDITING FORM (MENTOR OWNED)          */}
        {/* ========================================================= */}
        <SectionCard title={editingCycle ? `✏️ Edit Plan Draft (Cycle ${editingCycle.cycleNumber})` : "🔵 PLAN – Initiate New Growth Cycle"}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16, background: "#eff6ff", padding: 10, borderRadius: 8, border: "1px solid #bfdbfe" }}>
            <strong>Stage 1 (Mentor Owned):</strong> Define the objective, expected outcomes, and action plan. Once published, the assigned Teacher can begin execution.
          </div>

          {/* Quick-Fill Preset Template Selector */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: 14, borderRadius: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
              🎯 Quick-Fill Curriculum Presets (Umang & HAALS)
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
              Select a module from the official Umang Fellowship Curriculum or HAALS Developmental Activity Sheet to auto-populate SMART Plan fields.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                  📖 Umang Fellowship Curriculum
                </label>
                <select
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 11, background: "#ffffff" }}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [sIdx, mIdx] = e.target.value.split("-").map(Number);
                    applyUmangModule(UMANG_CURRICULUM_SEMESTERS[sIdx]?.modules[mIdx]);
                  }}
                  defaultValue=""
                >
                  <option value="">Choose Module (Sem 1-4)…</option>
                  {UMANG_CURRICULUM_SEMESTERS.map((sem, sIdx) => (
                    <optgroup key={sIdx} label={sem.semester}>
                      {sem.modules.map((mod, mIdx) => (
                        <option key={mIdx} value={`${sIdx}-${mIdx}`}>{mod.title}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                  🧩 HAALS Activity Presets
                </label>
                <select
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 11, background: "#ffffff" }}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [dIdx, aIdx] = e.target.value.split("-").map(Number);
                    const dom = HAALS_DOMAINS_PRESETS[dIdx];
                    applyHaalsActivity(dom?.activities[aIdx], dom?.domain);
                  }}
                  defaultValue=""
                >
                  <option value="">Choose HAALS Activity…</option>
                  {HAALS_DOMAINS_PRESETS.map((dom, dIdx) => (
                    <optgroup key={dIdx} label={`${dom.icon} ${dom.domain}`}>
                      {dom.activities.map((act, aIdx) => (
                        <option key={aIdx} value={`${dIdx}-${aIdx}`}>{act.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleCreateOrUpdatePlan(true); }}>
            
            {/* Mentee Selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Assign To Teacher/Fellow *</label>
              {mentees.length === 0 ? (
                <div style={{ padding: "10px 12px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
                  You have no teachers assigned yet. Claim a teacher from Teacher Management first.
                </div>
              ) : (
                <select
                  style={S.input}
                  value={selectedMenteeId}
                  disabled={!!editingCycle}
                  onChange={e => setSelectedMenteeId(e.target.value)}
                  required
                >
                  <option value="">Select a teacher…</option>
                  {mentees.map(m => (
                    <option key={m._id} value={m._id}>{m.name || "Unknown Teacher"}</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Plan Title / Goal Name *</label>
              <input
                type="text"
                style={S.input}
                value={planForm.planTitle}
                onChange={e => setPlanForm({ ...planForm, planTitle: e.target.value })}
                placeholder="e.g. Enhancing Classroom Phonics & Interactive TLM Usage"
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={S.label}>Area of Improvement</label>
                <input
                  type="text"
                  style={S.input}
                  value={planForm.planArea}
                  onChange={e => setPlanForm({ ...planForm, planArea: e.target.value })}
                  placeholder="e.g. Pedagogy & Phonics"
                />
              </div>
              <div>
                <label style={S.label}>Target Completion Date</label>
                <input
                  type="date"
                  style={S.input}
                  value={planForm.planTargetDate}
                  onChange={e => setPlanForm({ ...planForm, planTargetDate: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Development Objective</label>
              <textarea
                style={{ ...S.input, minHeight: 54 }}
                value={planForm.planObjective}
                onChange={e => setPlanForm({ ...planForm, planObjective: e.target.value })}
                placeholder="What specific skill or competence should the teacher build?"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Expected Outcomes</label>
              <textarea
                style={{ ...S.input, minHeight: 54 }}
                value={planForm.planExpectedOutcomes}
                onChange={e => setPlanForm({ ...planForm, planExpectedOutcomes: e.target.value })}
                placeholder="What tangible changes or classroom results are expected?"
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Planned Activities & Action Items</label>
              <textarea
                style={{ ...S.input, minHeight: 54 }}
                value={planForm.planActivities}
                onChange={e => setPlanForm({ ...planForm, planActivities: e.target.value })}
                placeholder="List specific action items for the teacher to execute..."
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={S.label}>Mentor Instructions & Resources</label>
              <textarea
                style={{ ...S.input, minHeight: 54 }}
                value={planForm.planInstructions}
                onChange={e => setPlanForm({ ...planForm, planInstructions: e.target.value })}
                placeholder="Add special guidelines, reference links, or resource notes..."
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                disabled={submittingPlan || mentees.length === 0}
                onClick={() => handleCreateOrUpdatePlan(false)}
                style={{ ...S.secondaryBtn, flex: 1, padding: "10px" }}
              >
                💾 Save as Draft
              </button>
              <button
                type="submit"
                disabled={submittingPlan || mentees.length === 0}
                style={{ ...S.primaryBtn, flex: 1, padding: "10px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
              >
                {submittingPlan ? "Processing..." : "🚀 Publish Plan to Teacher"}
              </button>
              {editingCycle && (
                <button
                  type="button"
                  onClick={resetPlanForm}
                  style={{ ...S.secondaryBtn, padding: "10px" }}
                >
                  Cancel
                </button>
              )}
            </div>

          </form>
        </SectionCard>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: MENTEES ROSTER & CYCLE MONITORING           */}
        {/* ========================================================= */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Mentees Growth Roster */}
          <SectionCard title="📊 Mentees Growth Cycles Roster">
            {loading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#64748b", fontSize: 13 }}>Loading growth cycles...</div>
            ) : history.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 13, background: "#f8fafc", borderRadius: 10, border: "1px dashed #cbd5e1" }}>
                No active Growth Cycles found. Use the form on the left to create a Plan for your teachers.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {history.map((cycle) => {
                  const meta = statusMeta(cycle.status, cycle.revisionRequired);
                  const isCheckPending = ["DO_SUBMITTED", "CHECK_IN_PROGRESS"].includes(cycle.status);

                  return (
                    <div
                      key={cycle._id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid",
                        borderColor: isCheckPending ? "#818cf8" : "#e2e8f0",
                        borderRadius: 12,
                        padding: 14,
                        boxShadow: isCheckPending ? "0 4px 12px rgba(99,102,241,0.12)" : "0 1px 3px rgba(0,0,0,0.03)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>🎓 {cycleMenteeName(cycle)}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{cycle.planTitle}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, background: meta.bg, color: meta.color, padding: "3px 8px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                          <span>{meta.icon}</span> {meta.label}
                        </span>
                      </div>

                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span>Cycle #{cycle.cycleNumber}</span>
                        <span>Active Stage: <strong>{meta.step}</strong></span>
                        {cycle.planTargetDate && <span>Target: {new Date(cycle.planTargetDate).toLocaleDateString()}</span>}
                      </div>

                      {/* Display evidence links directly on roster card if present */}
                      {renderEvidenceLinks(cycle.doEvidence)}
                      {renderEvidenceLinks(cycle.actEvidence)}

                      {/* Action Buttons based on Role Permissions & Status */}
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: 8, marginTop: 8 }}>
                        {cycle.status === "DRAFT" && (
                          <>
                            <button
                              onClick={() => openEditDraft(cycle)}
                              style={{ padding: "4px 10px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}
                            >
                              ✏️ Edit Draft
                            </button>
                            <button
                              onClick={() => publishPDCAPlan(cycle._id).then(() => { setToast?.({ msg: "Plan published!", type: "success" }); fetchCycles(); })}
                              style={{ padding: "4px 10px", background: "#2563eb", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#ffffff" }}
                            >
                              🚀 Publish →
                            </button>
                          </>
                        )}

                        {isCheckPending && (
                          <button
                            onClick={() => openCheckModal(cycle)}
                            style={{ padding: "6px 12px", background: "#4f46e5", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: "pointer", color: "#ffffff" }}
                          >
                            🔍 Review DO & Perform Check →
                          </button>
                        )}

                        <button
                          onClick={() => setViewingCycle(cycle)}
                          style={{ padding: "4px 10px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#475569" }}
                        >
                          👁️ View Full Details
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

        </div>

      </div>

      {/* ========================================================= */}
      {/* CHECK STAGE REVIEW MODAL (MENTOR OWNED)                    */}
      {/* ========================================================= */}
      {checkCycle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, animation: "fadeIn 0.2s ease" }}>
          <div style={{ background: "#ffffff", borderRadius: 16, width: 640, maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 4 }}>
                  Stage 3: CHECK (Mentor Review)
                </span>
                <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Review & Complete Check</h3>
                <div style={{ fontSize: 12, color: "#64748b" }}>Teacher: <strong>{cycleMenteeName(checkCycle)}</strong> · Cycle #{checkCycle.cycleNumber}</div>
              </div>
              <button onClick={() => setCheckCycle(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            {/* Teacher's DO Submission Summary */}
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: 14, border: "1px solid #e2e8f0", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", marginBottom: 6 }}>
                Teacher's Submitted DO Implementation
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{checkCycle.doActivitiesCompleted || "No activities log provided."}</div>
              {checkCycle.doNotes && <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}><strong>Notes:</strong> {checkCycle.doNotes}</div>}
              {checkCycle.doReflections && <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}><strong>Reflections:</strong> {checkCycle.doReflections}</div>}
              
              {/* Interactive Clickable Evidence Links */}
              {renderEvidenceLinks(checkCycle.doEvidence)}
            </div>

            {/* Mentor Check Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleCheckSubmit(true); }}>
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Mentor Review & Constructive Feedback *</label>
                <textarea
                  rows={3}
                  required
                  style={{ ...S.input, minHeight: 60 }}
                  value={checkForm.checkFeedback}
                  onChange={e => setCheckForm({ ...checkForm, checkFeedback: e.target.value })}
                  placeholder="Provide overall feedback on the execution and outcomes..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={S.label}>Strengths Identified</label>
                  <input
                    type="text"
                    style={S.input}
                    value={checkForm.checkStrengths}
                    onChange={e => setCheckForm({ ...checkForm, checkStrengths: e.target.value })}
                    placeholder="e.g. Great student engagement"
                  />
                </div>
                <div>
                  <label style={S.label}>Gaps / Areas for Improvement</label>
                  <input
                    type="text"
                    style={S.input}
                    value={checkForm.checkGaps}
                    onChange={e => setCheckForm({ ...checkForm, checkGaps: e.target.value })}
                    placeholder="e.g. Needs better time management"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Recommended Next Actions for ACT Stage</label>
                <textarea
                  style={{ ...S.input, minHeight: 50 }}
                  value={checkForm.checkRecommendations}
                  onChange={e => setCheckForm({ ...checkForm, checkRecommendations: e.target.value })}
                  placeholder="Specific actions the teacher should perform in the ACT stage..."
                />
              </div>

              {/* Revision Required Option */}
              <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", padding: 12, borderRadius: 8, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  id="revCheck"
                  checked={checkForm.revisionRequired}
                  onChange={e => setCheckForm({ ...checkForm, revisionRequired: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <label htmlFor="revCheck" style={{ fontSize: 12, fontWeight: 700, color: "#c2410c", cursor: "pointer" }}>
                  ⚠️ Request Revision (Sends DO back to Teacher for updates before proceeding to ACT)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => handleCheckSubmit(false)} style={{ ...S.secondaryBtn, padding: "10px 16px" }}>
                  Save Draft
                </button>
                <button
                  type="submit"
                  disabled={submittingCheck}
                  style={{ ...S.primaryBtn, padding: "10px 20px", background: checkForm.revisionRequired ? "#ea580c" : "#059669" }}
                >
                  {submittingCheck ? "Submitting..." : checkForm.revisionRequired ? "⟳ Request Revision" : "✓ Complete Check →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FULL CYCLE DETAILS AUDIT MODAL                            */}
      {/* ========================================================= */}
      {viewingCycle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#ffffff", borderRadius: 16, width: 680, maxHeight: "90vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Cycle #{viewingCycle.cycleNumber} Audit History</h3>
                <div style={{ fontSize: 12, color: "#64748b" }}>Teacher: <strong>{cycleMenteeName(viewingCycle)}</strong></div>
              </div>
              <button onClick={() => setViewingCycle(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              
              {/* STAGE 1: PLAN */}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", marginBottom: 4 }}>🔵 Stage 1: PLAN (Mentor Strategy)</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{viewingCycle.planTitle}</div>
                {viewingCycle.planArea && <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}><strong>Area of Improvement:</strong> {viewingCycle.planArea}</div>}
                {viewingCycle.planObjective && <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}><strong>Objective:</strong> {viewingCycle.planObjective}</div>}
                {viewingCycle.planExpectedOutcomes && <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}><strong>Expected Outcomes:</strong> {viewingCycle.planExpectedOutcomes}</div>}
                {viewingCycle.planActivities && <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}><strong>Action Plan & Activities:</strong> {viewingCycle.planActivities}</div>}
                {viewingCycle.planTargetDate && <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}><strong>Target Completion Date:</strong> {new Date(viewingCycle.planTargetDate).toLocaleDateString()}</div>}
                {viewingCycle.planInstructions && <div style={{ fontSize: 12, color: "#475569", marginTop: 4, fontStyle: "italic" }}><strong>Instructions:</strong> {viewingCycle.planInstructions}</div>}
                {viewingCycle.planPublishedAt && <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>Published on: {new Date(viewingCycle.planPublishedAt).toLocaleString()}</div>}
              </div>

              {/* STAGE 2: DO */}
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#b45309", textTransform: "uppercase", marginBottom: 4 }}>🟡 Stage 2: DO (Teacher Execution)</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{viewingCycle.doActivitiesCompleted || "Not submitted yet."}</div>
                {viewingCycle.doNotes && <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}><strong>Notes & Observations:</strong> {viewingCycle.doNotes}</div>}
                {viewingCycle.doReflections && <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}><strong>Reflections:</strong> {viewingCycle.doReflections}</div>}
                {renderEvidenceLinks(viewingCycle.doEvidence)}
                {viewingCycle.doSubmittedAt && <div style={{ fontSize: 10, color: "#78350f", marginTop: 6 }}>Submitted on: {new Date(viewingCycle.doSubmittedAt).toLocaleString()}</div>}
              </div>

              {/* STAGE 3: CHECK */}
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase", marginBottom: 4 }}>🟣 Stage 3: CHECK (Mentor Evaluation)</div>
                <div style={{ fontSize: 13, color: "#0f172a", marginTop: 2 }}>{viewingCycle.checkFeedback || "Not reviewed yet."}</div>
                {viewingCycle.checkScore && <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}><strong>Score / Rating:</strong> {viewingCycle.checkScore}</div>}
                {viewingCycle.checkStrengths && <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}><strong>Strengths Identified:</strong> {viewingCycle.checkStrengths}</div>}
                {viewingCycle.checkGaps && <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}><strong>Gaps / Areas for Growth:</strong> {viewingCycle.checkGaps}</div>}
                {viewingCycle.checkRecommendations && <div style={{ fontSize: 12, color: "#166534", marginTop: 4 }}><strong>Recommended Actions for ACT:</strong> {viewingCycle.checkRecommendations}</div>}
                {viewingCycle.revisionRequired && (
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: "#c2410c", background: "#ffedd5", padding: "2px 6px", borderRadius: 4, display: "inline-block" }}>
                    ⚠️ Revision Requested from Teacher
                  </div>
                )}
                {viewingCycle.checkedAt && <div style={{ fontSize: 10, color: "#166534", marginTop: 6 }}>Reviewed on: {new Date(viewingCycle.checkedAt).toLocaleString()}</div>}
              </div>

              {/* STAGE 4: ACT */}
              <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#6b21a8", textTransform: "uppercase", marginBottom: 4 }}>🟢 Stage 4: ACT (Teacher Improvement)</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{viewingCycle.actCorrectiveActions || "Not submitted yet."}</div>
                {viewingCycle.actChanged && <div style={{ fontSize: 12, color: "#581c87", marginTop: 4 }}><strong>What Changed in Practice:</strong> {viewingCycle.actChanged}</div>}
                {viewingCycle.actReflections && <div style={{ fontSize: 12, color: "#581c87", marginTop: 4 }}><strong>Key Learnings & Reflections:</strong> {viewingCycle.actReflections}</div>}
                {renderEvidenceLinks(viewingCycle.actEvidence)}
                {viewingCycle.actSubmittedAt && <div style={{ fontSize: 10, color: "#6b21a8", marginTop: 6 }}>Completed on: {new Date(viewingCycle.actSubmittedAt).toLocaleString()}</div>}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}