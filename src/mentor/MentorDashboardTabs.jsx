import { useState, useEffect, useRef } from "react";
import { S, SectionCard, Toast } from "../components/Shared";
import { uploadFile, submitFeedback, getFeedbacks, updateMentorMe, changeMentorPassword, recordMenteeObservation, submitCapstoneMilestone, submitPDCACycle } from "../services/api";

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
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Notifications</h1>
          <p style={S.pageSub}>Stay updated with alerts and messages.</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button onClick={onMarkAllRead} style={S.exportBtn}>
            ✓ Mark all as read
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
                {n.type === "alert" ? "⚠️" : n.type === "success" ? "🎉" : "📩"}
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
  const [selectedMentee, setSelectedMentee] = useState(null);
  const [observationModal, setObservationModal] = useState(false);
  const [observationText, setObservationText] = useState("");

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
      const res = await recordMenteeObservation(selectedMentee._id, observationText);
      if (res.user) onUserUpdate(res.user);
      setToast?.({ msg: "Observation recorded successfully!", type: "success" });
      setObservationModal(false);
      setObservationText("");
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to record observation", type: "error" });
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Mentee Management</h1>
      <p style={S.pageSub}>Observe, guide, and track progress for your assigned teachers.</p>

      {mentees.length === 0 ? (
        <div style={{ background: "white", padding: 40, borderRadius: 16, textAlign: "center", border: "1px dashed #cbd5e1" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <h3 style={{ margin: "0 0 8px", color: "#1e293b" }}>No Mentees Assigned</h3>
          <p style={{ color: "#64748b", margin: 0 }}>You currently do not have any teachers assigned to you. Admin will assign mentees soon.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {mentees.map((mentee, i) => (
            <div key={mentee._id || i} style={{ background: "white", padding: 20, borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#fef3c7", border: "2px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                  👩‍🏫
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#0f172a" }}>{mentee.name}</h3>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{mentee.teacherProfile?.subject || "General Teacher"}</div>
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 10, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "#475569", fontWeight: 600 }}>Course Progress</span>
                  <span style={{ color: "#3b82f6", fontWeight: 800 }}>{(Math.random() * 40 + 60).toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: "75%", height: "100%", background: "#3b82f6", borderRadius: 3 }}></div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => handleRecordObservation(mentee)} style={{ flex: 1, background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  📝 Record Observation
                </button>
                <button onClick={() => setToast?.({ msg: "Message feature coming soon!", type: "info" })} style={{ flex: 1, background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  💬 Message
                </button>
              </div>
            </div>
          ))}
        </div>
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

  const MILESTONES = [
    { id: 1, title: "Problem Identification", desc: "Identify a core challenge in the community." },
    { id: 2, title: "Solution Design", desc: "Design a targeted intervention." },
    { id: 3, title: "Implementation", desc: "Execute the solution and collect data." },
    { id: 4, title: "Evaluation", desc: "Analyze impact and finalize the report." }
  ];

  const milestone = user?.mentorProfile?.capstoneMilestone || 1;

  const handleSubmit = async () => {
    if(!capstoneText.trim()) {
      setToast?.({ msg: "Please enter your submission notes.", type: "error" });
      return;
    }
    setSubmitting(true);
    
    try {
      const res = await submitCapstoneMilestone(capstoneText, "");
      if (res.user) onUserUpdate(res.user);
      setToast?.({ msg: "Capstone milestone submitted successfully!", type: "success" });
      setCapstoneText("");
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to submit milestone", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = (e, file) => {
  e.preventDefault();
  setToast?.({ msg: `${file} is not available yet. Please check back later.`, type: "error" });
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
          <div style={{ fontSize: 13, marginTop: 4, color: "#10b981", fontWeight: 600 }}>Active mentees</div>
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
  const [pdcaForm, setPdcaForm] = useState({ plan: "", do: "", check: "", act: "" });
  const [submitting, setSubmitting] = useState(false);
  const history = user?.mentorProfile?.pdcaCycles || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!pdcaForm.plan || !pdcaForm.do || !pdcaForm.check || !pdcaForm.act) {
      setToast?.({ msg: "Please fill out all PDCA fields.", type: "error" });
      return;
    }
    setSubmitting(true);
    
    try {
      const res = await submitPDCACycle(pdcaForm.plan, pdcaForm.do, pdcaForm.check, pdcaForm.act);
      if (res.user) onUserUpdate(res.user);
      setToast?.({ msg: "PDCA cycle recorded successfully!", type: "success" });
      setPdcaForm({ plan: "", do: "", check: "", act: "" });
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to save PDCA cycle", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <h1 style={S.pageTitle}>Documentation (PDCA)</h1>
      <p style={S.pageSub}>Record and reflect on your Plan-Do-Check-Act cycles.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <SectionCard title="🔄 New PDCA Cycle">
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{...S.label, display: "flex", alignItems: "center", gap: 6}}>
                <span style={{background: "#e0e7ff", color: "#4f46e5", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 900}}>P</span>
                PLAN (Objective & Strategy)
              </label>
              <textarea style={{...S.input, minHeight: 60}} value={pdcaForm.plan} onChange={e=>setPdcaForm({...pdcaForm, plan: e.target.value})} placeholder="What is the goal? What is the plan?" required />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{...S.label, display: "flex", alignItems: "center", gap: 6}}>
                <span style={{background: "#fef3c7", color: "#d97706", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 900}}>D</span>
                DO (Action Taken)
              </label>
              <textarea style={{...S.input, minHeight: 60}} value={pdcaForm.do} onChange={e=>setPdcaForm({...pdcaForm, do: e.target.value})} placeholder="How was the plan executed?" required />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{...S.label, display: "flex", alignItems: "center", gap: 6}}>
                <span style={{background: "#d1fae5", color: "#059669", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 900}}>C</span>
                CHECK (Results & Observations)
              </label>
              <textarea style={{...S.input, minHeight: 60}} value={pdcaForm.check} onChange={e=>setPdcaForm({...pdcaForm, check: e.target.value})} placeholder="What were the outcomes? What worked well?" required />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{...S.label, display: "flex", alignItems: "center", gap: 6}}>
                <span style={{background: "#fee2e2", color: "#dc2626", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 900}}>A</span>
                ACT (Next Steps & Adjustments)
              </label>
              <textarea style={{...S.input, minHeight: 60}} value={pdcaForm.act} onChange={e=>setPdcaForm({...pdcaForm, act: e.target.value})} placeholder="What changes will you make for the next cycle?" required />
            </div>

            <button type="submit" disabled={submitting} style={{...S.primaryBtn, width: "100%", opacity: submitting ? 0.7 : 1}}>
              {submitting ? "Saving..." : "Save PDCA Cycle"}
            </button>
          </form>
        </SectionCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <SectionCard title="📚 PDCA History">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {history.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No PDCA cycles recorded yet.</div>
              ) : history.map((item, i) => (
                <div key={item._id || i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{new Date(item.date).toLocaleDateString("en-US", { month:"short", day:"2-digit", year:"numeric" })}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, background: "#d1fae5", color: "#059669", padding: "2px 8px", borderRadius: 10 }}>{item.status || "Completed"}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>{item.plan.substring(0, 60) + (item.plan.length > 60 ? "..." : "")}</div>
                  <button onClick={() => setToast?.({ msg: `Plan: ${item.plan}\nDo: ${item.do}\nCheck: ${item.check}\nAct: ${item.act}`, type: "info" })} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}>View Full Cycle →</button>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="💡 PDCA Tips">
            <ul style={{ paddingLeft: 20, margin: 0, color: "#475569", fontSize: 13, lineHeight: 1.6 }}>
              <li style={{marginBottom: 8}}>Keep objectives SMART (Specific, Measurable, Achievable, Relevant, Time-bound).</li>
              <li style={{marginBottom: 8}}>Document data and specific observations in the <strong>Check</strong> phase.</li>
              <li>Use the <strong>Act</strong> phase to refine your strategy for the next iteration.</li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

