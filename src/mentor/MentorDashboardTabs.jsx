import { useState, useEffect, useRef } from "react";
import { S, SectionCard, Toast, StatCard, StatusBadge, SearchBar, Modal } from "../components/Shared";
import { uploadFile, submitFeedback, getFeedbacks, updateMentorMe, changeMentorPassword, recordTeacherObservation, getTeacherObservations, submitCapstoneMilestone, getCapstoneSubmissions, submitPDCACycle, getPDCACycles, getMentorTeachers, updateTeacherStatus, getMentorMe, getMentorAssignedTeachers, addPdcaCycle } from "../services/api";

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
      <div style={{ background: "linear-gradient(135deg,#b45309,#f59e0b)", borderRadius: 20, padding: "24px 28px", marginBottom: 24, color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.3px" }}>Welcome back, Mentor {user.name?.split(" ")[0] || ""}! 🎓</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.9)", maxWidth: 500 }}>
            Here is your mentor overview. You are currently mentoring {user.mentorProfile?.assignedTeachers?.length || 0} Teacher(s) and guiding their ECCE journey.
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, position: "relative", zIndex: 1 }}>
          <div style={{ background: "rgba(255,255,255,0.15)", padding: "10px 16px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{user.mentorProfile?.assignedTeachers?.length || 0}</div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9 }}>Active Teachers</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", padding: "10px 16px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.2)" }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{user.mentorProfile?.center?.name ? "1" : "0"}</div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9 }}>Assigned Center</div>
          </div>
        </div>
      </div>

      {/* ── Active Teachers Quick List ── */}
      {user.mentorProfile?.assignedTeachers?.length > 0 && (
        <div style={{ marginBottom: 24, padding: "16px", background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 12 }}>🧑‍🏫 Your Teachers:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {user.mentorProfile.assignedTeachers.map((Teacher, i) => (
              <div key={Teacher._id || i} style={{ background: "white", padding: "6px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#b45309", border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }}></div>
                {Teacher.name || "Unknown Teacher"}
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
                  background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 36, fontWeight: 800, color: "#d97706",
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
                    background: "#f59e0b", color: "white", border: "2px solid white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: uploadingPhoto ? "not-allowed" : "pointer", boxShadow: "0 2px 6px rgba(245,158,11,0.3)"
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
                  {showPassword.current ? "🙈" : "👁️"}
                </button>
              </div>
              
              <div style={{ marginBottom: 16, position: "relative" }}>
                <label style={S.label}>New Password</label>
                <input type={showPassword.new ? "text" : "password"} style={S.input} required minLength={6}
                  value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} />
                <button type="button" onClick={() => setShowPassword({...showPassword, new: !showPassword.new})} style={{ position: "absolute", right: 12, top: 32, background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
                  {showPassword.new ? "🙈" : "👁️"}
                </button>
              </div>
              
              <div style={{ marginBottom: 20, position: "relative" }}>
                <label style={S.label}>Confirm New Password</label>
                <input type={showPassword.confirm ? "text" : "password"} style={S.input} required minLength={6}
                  value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} />
                <button type="button" onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})} style={{ position: "absolute", right: 12, top: 32, background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>
                  {showPassword.confirm ? "🙈" : "👁️"}
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
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Notifications</h1>
          <p style={S.pageSub}>Stay updated with alerts and messages.</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button onClick={onMarkAllRead} style={S.exportBtn}>
            ✅ Mark all as read
          </button>
        )}
      </div>

      <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {notifications.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>All caught up!</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>You have no new notifications.</div>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} style={{ 
              padding: 20, borderBottom: "1px solid #f1f5f9", 
              background: n.read ? "white" : "#f0fdf4",
              display: "flex", gap: 16, transition: "background 0.2s"
            }}>
              <div style={{ 
                width: 40, height: 40, borderRadius: "50%", 
                background: n.type === "alert" ? "#fee2e2" : n.type === "success" ? "#d1fae5" : "#e0e7ff",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0
              }}>
                {n.type === "alert" ? "⚠️" : n.type === "success" ? "✅" : "🔔"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: n.read ? 600 : 800, color: "#1e293b" }}>{n.msg}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", marginLeft: 16 }}>{n.time}</div>
                </div>
                {!n.read && (
                  <button onClick={() => onMarkRead(n.id)} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 12, fontWeight: 700, padding: 0, cursor: "pointer", marginTop: 8 }}>
                    Mark as read
                  </button>
                )}
              </div>
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

  const TAGS = ["Program UX", "Platform UX", "Teacher Progress", "Schedule", "Other"];
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
            <label style={S.label}>Teacher / Topic (optional)</label>
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

            <label style={S.label}>Teacher Engagement (Optional)</label>
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

/* ── Teacher Management Tab ── */
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
    { id: 1, title: "Problem Identification", desc: "Identify a core challenge in the community." },
    { id: 2, title: "Solution Design", desc: "Design a targeted intervention." },
    { id: 3, title: "Implementation", desc: "Execute the solution and collect data." },
    { id: 4, title: "Evaluation", desc: "Analyze impact and finalize the report." }
  ];

  const milestone = Math.min(submissions.length + 1, 4);

  const handleSubmit = async () => {
    if(!capstoneText.trim()) {
      setToast?.({ msg: "Please enter your submission notes.", type: "error" });
      return;
    }
    setSubmitting(true);
    
    try {
      await submitCapstoneMilestone(milestone, capstoneText, "");
      setToast?.({ msg: "Capstone milestone submitted successfully!", type: "success" });
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
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Impact & Capstone</h1>
      <p style={S.pageSub}>Track your Semester 4 Capstone project and overall community impact.</p>

      {/* Impact Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 30 }}>
        <div style={{ background: "linear-gradient(135deg, #10b981, #059669)", padding: 24, borderRadius: 16, color: "white" }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Impact Score</div>
          <div style={{ fontSize: 36, fontWeight: 900 }}>A+</div>
          <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>Top 10% of Mentors</div>
        </div>
        <div style={{ background: "white", padding: 24, borderRadius: 16, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Teachers Guided</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#0f172a" }}>{user?.mentorProfile?.assignedTeachers?.length || 0}</div>
          <div style={{ fontSize: 13, marginTop: 4, color: "#10b981", fontWeight: 600 }}>Active Teachers</div>
        </div>
        <div style={{ background: "white", padding: 24, borderRadius: 16, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Capstone Status</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", marginTop: 8 }}>Milestone {milestone}/4</div>
          <div style={{ fontSize: 13, marginTop: 4, color: "#f59e0b", fontWeight: 600 }}>In Progress</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 24 }}>
        <SectionCard title="🎓 Capstone Project Tracker">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 30, position: "relative" }}>
            <div style={{ position: "absolute", top: 15, left: 20, right: 20, height: 4, background: "#e2e8f0", zIndex: 0 }}>
              <div style={{ height: "100%", width: `${((milestone - 1) / 3) * 100}%`, background: "#3b82f6", transition: "width 0.4s ease" }}></div>
            </div>
            {MILESTONES.map(m => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1, width: 80 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: milestone > m.id ? "#3b82f6" : milestone === m.id ? "#eff6ff" : "white", border: `3px solid ${milestone >= m.id ? "#3b82f6" : "#cbd5e1"}`, color: milestone > m.id ? "white" : milestone === m.id ? "#3b82f6" : "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, marginBottom: 8, transition: "all 0.3s" }}>
                  {milestone > m.id ? "✓" : m.id}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, textAlign: "center", color: milestone >= m.id ? "#1e293b" : "#94a3b8" }}>{m.title}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, color: "#0f172a" }}>Current: {MILESTONES[milestone-1]?.title}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>{MILESTONES[milestone-1]?.desc}</p>
            
            <label style={S.label}>Submission Notes / Evidence Link</label>
            <textarea 
              style={{...S.input, minHeight: 100, marginBottom: 16}} 
              placeholder="Provide a summary of your work or link to your evidence folder (Drive/Docs)..."
              value={capstoneText}
              onChange={e => setCapstoneText(e.target.value)}
            />
            
            <button onClick={handleSubmit} disabled={submitting} style={{...S.primaryBtn, width: "100%", opacity: submitting ? 0.7 : 1}}>
              {submitting ? "Submitting..." : `Submit Milestone ${milestone}`}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="📎 Resources">
          <ul style={{ paddingLeft: 20, margin: 0, color: "#3b82f6", fontSize: 13, lineHeight: 2 }}>
            <li><a href="#" onClick={(e) => handleDownload(e, "Semester 4 Handbook.pdf")} style={{ color: "inherit", textDecoration: "none" }}>Semester 4 Handbook (PDF)</a></li>
            <li><a href="#" onClick={(e) => handleDownload(e, "Capstone Presentation Template.pptx")} style={{ color: "inherit", textDecoration: "none" }}>Capstone Presentation Template</a></li>
            <li><a href="#" onClick={(e) => handleDownload(e, "Impact Measurement Guidelines.pdf")} style={{ color: "inherit", textDecoration: "none" }}>Impact Measurement Guidelines</a></li>
            <li><a href="#" onClick={(e) => handleDownload(e, "Example Capstone Reports.zip")} style={{ color: "inherit", textDecoration: "none" }}>Example Capstone Reports</a></li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

/* ── Documentation (PDCA) Tab ── */
export function PDCATab({ user, setToast, onUserUpdate }) {
  const [pdcaList, setPdcaList] = useState([]);
  const [Teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [newPdcaTitle, setNewPdcaTitle] = useState('');
  const [newPdcaTeacher, setNewPdcaTeacher] = useState('');
  const [newPdcaPhase, setNewPdcaPhase] = useState('Plan');

  const fetchCycles = () => {
    setLoading(true);
    getPDCACycles()
      .then(res => setPdcaList(res.cycles || []))
      .catch(err => console.error("Failed to fetch PDCA", err))
      .finally(() => setLoading(false));
  };

  const fetchTeachers = () => {
    getMentorAssignedTeachers()
      .then(res => {
        if (res.Teachers && res.Teachers.length > 0) {
          setTeachers(res.Teachers);
          setNewPdcaTeacher(res.Teachers[0].name || res.Teachers[0].email);
        }
      })
      .catch(err => console.error("Failed to fetch Teachers", err));
  };

  useEffect(() => {
    fetchCycles();
    fetchTeachers();
  }, []);

  const handleAddPdca = async (e) => {
    e.preventDefault();
    if (!newPdcaTitle || !newPdcaTeacher) {
      setToast?.({ msg: "Please fill out all fields.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        Teacher: newPdcaTeacher,
        phase: newPdcaPhase,
        title: newPdcaTitle,
        status: "In Progress",
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 week later
      };
      await getMentorAssignedTeachers, addPdcaCycle(payload);
      setToast?.({ msg: "PDCA cycle recorded successfully!", type: "success" });
      setNewPdcaTitle('');
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to save PDCA cycle", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", padding: "16px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <SectionCard title="Documentation (PDCA Framework)">
        <p style={{ fontSize: "12px", color: "#64748b", marginTop: "-8px", marginBottom: "24px" }}>
          Plan-Do-Check-Act quality assurance process for Teacher community interventions.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
          
          {/* Form to log PDCA */}
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", height: "fit-content" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#0f172a", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#d97706" }}>➕</span> Log New PDCA Cycle
            </h3>

            <form onSubmit={handleAddPdca} style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
              <div>
                <label style={{ display: "block", color: "#475569", fontWeight: "600", marginBottom: "4px" }}>Teacher Teacher</label>
                <select 
                  value={newPdcaTeacher} 
                  onChange={(e) => setNewPdcaTeacher(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none" }}
                >
                  {Teachers.length === 0 ? <option value="">No Teachers found</option> : null}
                  {Teachers.map(m => (
                    <option key={m._id || m.id} value={m.name || m.email}>{m.name || m.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: "#475569", fontWeight: "600", marginBottom: "4px" }}>PDCA Phase</label>
                <select 
                  value={newPdcaPhase} 
                  onChange={(e) => setNewPdcaPhase(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none" }}
                >
                  <option value="Plan">Plan (Design & Goal Setting)</option>
                  <option value="Do">Do (Field Execution)</option>
                  <option value="Check">Check (Data Analysis & Evaluation)</option>
                  <option value="Act">Act (Scaling & Standardization)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", color: "#475569", fontWeight: "600", marginBottom: "4px" }}>Intervention Title</label>
                <input
                  type="text"
                  placeholder="e.g. Parent ECE Workshop in Sector 4"
                  value={newPdcaTitle}
                  onChange={(e) => setNewPdcaTitle(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none" }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  background: "#f59e0b",
                  color: "#fff",
                  fontWeight: "bold",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: submitting ? "not-allowed" : "pointer",
                  marginTop: "8px"
                }}
              >
                {submitting ? "Saving..." : "Add PDCA Tracker Entry"}
              </button>
            </form>
          </div>

          {/* PDCA Cards List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>Loading history...</div>
            ) : pdcaList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>No PDCA cycles found.</div>
            ) : (
              pdcaList.map((item) => (
                <div key={item._id || item.id} style={{
                  background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0",
                  display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ padding: "2px 8px", background: "#fef3c7", color: "#92400e", fontWeight: "bold", fontSize: "10px", borderRadius: "4px", textTransform: "uppercase" }}>
                        {item.phase}
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: "bold", color: "#0f172a" }}>{item.Teacher}</span>
                    </div>
                    <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", margin: 0 }}>{item.title}</h4>
                    <p style={{ fontSize: "11px", color: "#94a3b8", margin: "4px 0 0 0" }}>Target Completion: {item.targetDate || "N/A"}</p>
                  </div>
                  
                  <span style={{ padding: "4px 10px", background: "#f1f5f9", color: "#334155", fontWeight: "600", fontSize: "12px", borderRadius: "9999px" }}>
                    {item.status || "In Progress"}
                  </span>
                </div>
              ))
            )}
          </div>

        </div>
      </SectionCard>
    </div>
  );
}

