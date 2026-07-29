import { useState, useEffect } from "react";
import { AttendanceBar, Modal, S, SearchBar, SectionCard, StatCard, StatusBadge, Toast } from "../components/Shared";
import { getAdminMentors, updateMentorStatus, updateMentorProfile, registerMentor, deleteMentor, getCenters, getClasses, blockMentor, unblockMentor, sendDirectMessageToMentor } from "../services/api";
import { t } from "../services/i18n";

// Reuse same base URL pattern as ActivityMonitoringTab
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Returns the mentor's real photo URL if available, otherwise DiceBear initials avatar
const avatarSrc = (mentor) =>
  mentor.photoUrl ||
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mentor.name)}`;

// Resolve a profile photo path to a full URL, or return null so we fall back to DiceBear
const getPhotoUrl = (photo) => {
  if (!photo) return null;
  const path = photo.publicUrl || photo.url || photo.path || (typeof photo === "string" ? photo : "");
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
};

const mapMentorFromApi = (t) => ({
  id: t._id || t.id,
  name: t.name,
  email: t.email,
  phone: t.phone || "",
  subject: t.mentorProfile?.subject || "N/A",
  address: t.mentorProfile?.address || "N/A",
  qualification: t.mentorProfile?.qualification || "N/A",
  experience: t.mentorProfile?.experience || "N/A",
  status: t.status === "blocked" ? "blocked" : (t.status || "pending"),
  joined: t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-IN") : "—",
  attendance: t.mentorProfile?.performanceRating ? Math.round(t.mentorProfile.performanceRating * 20) : 0,
  classes: t.mentorProfile?.lessonsCompleted || 0,
  assignedCenter: t.mentorProfile?.center?.name || "Not Assigned",
  centerId: t.mentorProfile?.center?._id || t.mentorProfile?.center || "",
  classId: (t.mentorProfile?.classes || [])[0]?._id || "",
  classIds: (t.mentorProfile?.classes || []).map(c => c?._id || c),
  classNames: (t.mentorProfile?.classes || []).map(c => c?.name || "—"),
  batch: (t.mentorProfile?.classes || []).map(c => c?.name).filter(Boolean).join(", ") || "—",
  // NEW: resolve real profile photo from any common API shape (including t.photoUrl from User model)
  photoUrl: t.photoUrl ? getPhotoUrl(t.photoUrl) : getPhotoUrl(
    t.mentorProfile?.profilePhoto ||
    t.mentorProfile?.photo ||
    t.profilePhoto ||
    t.photo ||
    null
  ),
  bio: t.mentorProfile?.bio || t.bio || "",
  dob: t.mentorProfile?.dob ? new Date(t.mentorProfile.dob).toLocaleDateString("en-IN") : "",
  gender: t.mentorProfile?.gender || "",
  languages: t.mentorProfile?.languages || [],
});

/* ─── Reusable mentor avatar with graceful fallback ─── */
function MentorAvatar({ mentor, size = 34, borderColor = "#e2e8f0", borderWidth = 1 }) {
  const [src, setSrc] = useState(avatarSrc(mentor));

  // If the real photo URL errors, fall back to DiceBear
  const handleError = () =>
    setSrc(`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mentor.name)}`);

  return (
    <img
      src={src}
      alt={mentor.name}
      onError={handleError}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        border: `${borderWidth}px solid ${borderColor}`,
        background: "#f3f4f6",
        flexShrink: 0,
      }}
    />
  );
}

/* ── Reject Modal ── */
function RejectModal({ mentor, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const reasons = ["Incomplete documents", "Invalid qualification", "Duplicate account", "Suspicious activity", "Other"];
  return (
    <Modal title={`✕ Reject — ${mentor.name}`} onClose={onClose}>
      <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#991b1b" }}>
        ⚠️ Mentor status will be marked as rejected.
      </div>
      <label style={S.label}>Reason *</label>
      <select style={{ ...S.input, marginBottom: 20 }} value={reason} onChange={e => setReason(e.target.value)}>
        <option value="">Select a reason...</option>
        {reasons.map(r => <option key={r}>{r}</option>)}
      </select>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { if (!reason) return; onConfirm(reason); }} style={{ ...S.btnRed, flex: 1, padding: "10px", fontSize: 13 }}>✕ Reject</button>
        <button onClick={onClose} style={{ ...S.tblBtn, flex: 1, padding: "10px", fontSize: 13 }}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ── Block Modal ── */
function BlockModal({ mentor, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const reasons = ["Policy violation", "Misconduct", "Fraudulent activity", "Repeated absence", "Other"];
  return (
    <Modal title={`🚫 Block — ${mentor.name}`} onClose={onClose}>
      <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "#991b1b" }}>
        ⚠️ Blocking suspends access. Mentor can be unblocked later.
      </div>
      <label style={S.label}>Reason *</label>
      <select style={{ ...S.input, marginBottom: 20 }} value={reason} onChange={e => setReason(e.target.value)}>
        <option value="">Select a reason...</option>
        {reasons.map(r => <option key={r}>{r}</option>)}
      </select>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => { if (!reason) return; onConfirm(reason); }} style={{ ...S.btnRed, flex: 1, padding: "10px", fontSize: 13 }}>🚫 Block Access</button>
        <button onClick={onClose} style={{ ...S.tblBtn, flex: 1, padding: "10px", fontSize: 13 }}>Cancel</button>
      </div>
    </Modal>
  );
}

/* ── Direct Message Modal ── */
function DirectMessageModal({ mentor, onClose, setToast }) {
  const [msg, setMsg]         = useState("");
  const [subject, setSubject] = useState("");
  const [channel, setChannel] = useState("in_app");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!subject.trim() || !msg.trim()) {
      setToast({ msg: "Subject and message cannot be empty.", type: "error" });
      return;
    }
    setSending(true);
    try {
      await sendDirectMessageToMentor(mentor.id, { subject: subject.trim(), body: msg.trim(), channel });
      setToast({ msg: `Message sent to ${mentor.name}!`, type: "success" });
      onClose();
    } catch (err) {
      setToast({ msg: err.message || "Failed to send message", type: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title={`💬 Message — ${mentor.name}`} onClose={onClose}>
      <label style={S.label}>Channel</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[{ val: "in_app", label: "📱 In-App" }, { val: "email", label: "📧 Email" }].map(c => (
          <button key={c.val} onClick={() => setChannel(c.val)}
            style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1.5px solid ${channel === c.val ? "#f59e0b" : "#e5e7eb"}`,
              background: channel === c.val ? "#fef3c7" : "white", color: channel === c.val ? "#92400e" : "#6b7280",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {c.label}
          </button>
        ))}
      </div>
      <label style={S.label}>To</label>
      <input style={{ ...S.input, marginBottom: 12, background: "#f3f4f6", color: "#6b7280" }}
        value={`${mentor.name} (${mentor.email})`} readOnly />
      <label style={S.label}>Subject *</label>
      <input style={{ ...S.input, marginBottom: 12 }} value={subject}
        onChange={e => setSubject(e.target.value)} placeholder="Message subject..." />
      <label style={S.label}>Message *</label>
      <textarea style={{ ...S.input, height: 120, resize: "none", marginBottom: 20 }}
        value={msg} onChange={e => setMsg(e.target.value)}
        placeholder={`Write a message to ${mentor.name.split(" ")[0]}...`} />
      <button onClick={send} disabled={sending}
        style={{ ...S.primaryBtn, width: "100%", opacity: sending ? 0.7 : 1 }}>
        {sending ? "Sending..." : "📤 Send Message"}
      </button>
    </Modal>
  );
}

/* ── Edit Mentor Modal ── */
function EditMentorModal({ mentor, onSave, onClose, setToast }) {
  const [form, setForm] = useState({
    name: mentor.name || "",
    email: mentor.email || "",
    phone: mentor.phone || "",
    subject: mentor.subject || "",
    qualification: mentor.qualification || "",
    experience: mentor.experience || "",
    address: mentor.address || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setToast({ msg: "Name and email are required.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      await updateMentorProfile(mentor.id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        mentorProfile: {
          subject: form.subject,
          qualification: form.qualification,
          experience: form.experience,
          address: form.address,
        },
      });
      setToast({ msg: "Mentor profile updated!", type: "success" });
      onSave();
      onClose();
    } catch (err) {
      setToast({ msg: err.message || "Failed to update mentor", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`✏️ Edit Mentor — ${mentor.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={S.label}>Full Name *</label>
            <input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mentor name" />
          </div>
          <div>
            <label style={S.label}>Email *</label>
            <input style={S.input} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="mentor@email.com" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <label style={S.label}>Phone</label>
            <input style={S.input} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label style={S.label}>Subject</label>
            <input style={S.input} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Early Childhood" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <label style={S.label}>Qualification</label>
            <select style={S.input} value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })}>
              {["", "Graduate", "Post-Graduate", "B.Ed", "D.El.Ed", "Other"].map(o => <option key={o} value={o}>{o || "Select..."}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Experience</label>
            <select style={S.input} value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })}>
              {["", "Fresher", "1-2 yrs", "3-5 yrs", "5-10 yrs", "10+ yrs"].map(o => <option key={o} value={o}>{o || "Select..."}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={S.label}>Address</label>
          <textarea style={{ ...S.input, height: 60, resize: "none" }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Mentor address" />
        </div>
        <button type="submit" disabled={saving} style={{ ...S.primaryBtn, width: "100%", marginTop: 16, opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving..." : "Save Changes →"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Change Center Modal ── */
function ChangeCenterModal({ mentor, centers = [], classes = [], onSave, onClose }) {
  const [selectedCenter, setSelectedCenter] = useState(mentor.centerId || "");
  const [selectedClassIds, setSelectedClassIds] = useState(mentor.classIds || []);

  const filteredClasses = selectedCenter
    ? classes.filter(c => String(c.center || c.centerId || c.center?._id) === String(selectedCenter))
    : [];

  useEffect(() => {
    if (selectedCenter) {
      const allIds = filteredClasses.map(c => c._id || c.id);
      setSelectedClassIds(allIds);
    } else {
      setSelectedClassIds([]);
    }
  }, [selectedCenter]);

  const toggleClass = (classId) => {
    setSelectedClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const selectAll = () => setSelectedClassIds(filteredClasses.map(c => c._id || c.id));
  const clearAll = () => setSelectedClassIds([]);

  return (
    <Modal title={`🏫 Change Center — ${mentor.name}`} onClose={onClose}>
      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "#0c4a6e" }}>
        ℹ️ Select a center — all classes will be auto-assigned. You can uncheck classes you don't want.
      </div>
      <label style={S.label}>Select Training Center</label>
      <select style={{ ...S.input, marginBottom: 12 }} value={selectedCenter}
        onChange={e => setSelectedCenter(e.target.value)}>
        <option value="">No Center Assigned</option>
        {centers.map(c => (
          <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
        ))}
      </select>

      {selectedCenter && filteredClasses.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ ...S.label, marginBottom: 0 }}>Select Classes ({selectedClassIds.length}/{filteredClasses.length})</label>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={selectAll}
                style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", fontWeight: 600, color: "#374151" }}>
                All
              </button>
              <button type="button" onClick={clearAll}
                style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", fontWeight: 600, color: "#374151" }}>
                None
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, marginBottom: 16, background: "#fafafa" }}>
            {filteredClasses.map(cls => (
              <label key={cls._id || cls.id}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#374151", background: selectedClassIds.includes(cls._id || cls.id) ? "#eff6ff" : "transparent", marginBottom: 2 }}>
                <input type="checkbox" checked={selectedClassIds.includes(cls._id || cls.id)}
                  onChange={() => toggleClass(cls._id || cls.id)}
                  style={{ accentColor: "#3b82f6", width: 14, height: 14 }} />
                <span>{cls.name}</span>
                {cls.ageGroup && <span style={{ fontSize: 10, color: "#9ca3af" }}>({cls.ageGroup})</span>}
              </label>
            ))}
          </div>
        </>
      )}

      {selectedCenter && filteredClasses.length === 0 && (
        <div style={{ textAlign: "center", padding: "16px", color: "#9ca3af", fontSize: 12, marginBottom: 16, background: "#f9fafb", borderRadius: 8, border: "1px dashed #e5e7eb" }}>
          No classes found for this center. Create classes first.
        </div>
      )}

      <button onClick={() => onSave(selectedCenter, null, selectedClassIds)} style={{ ...S.primaryBtn, width: "100%" }}>
        Save Center & Classes Assignment →
      </button>
    </Modal>
  );
}

/* ── Mentor Full Profile View ── */
function MentorProfileView({ mentor, centers = [], classes = [], onBack, onUpdate, setToast }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [showReject,   setShowReject]   = useState(false);
  const [showBlock,    setShowBlock]    = useState(false);
  const [showMsg,      setShowMsg]      = useState(false);
  const [showCourses,  setShowCourses]  = useState(false);
  const [showEdit,     setShowEdit]     = useState(false);
  // NEW: lightbox to view full-size profile photo
  const [photoLightbox, setPhotoLightbox] = useState(false);

  const isPending  = mentor.status === "pending";
  const isApproved = mentor.status === "approved";
  const isRejected = mentor.status === "rejected";
  const isBlocked  = mentor.status === "blocked";

  const doApprove = () =>
    updateMentorStatus(mentor.id, "approved")
      .then(() => { onUpdate(); setToast({ msg: "Mentor approved!", type: "success" }); })
      .catch(err => setToast({ msg: err.message, type: "error" }));

  const doReject = () =>
    updateMentorStatus(mentor.id, "rejected")
      .then(() => { onUpdate(); setShowReject(false); setToast({ msg: "Mentor rejected.", type: "error" }); })
      .catch(err => setToast({ msg: err.message, type: "error" }));

  const doBlock = () =>
    blockMentor(mentor.id)
      .then(() => { onUpdate(); setShowBlock(false); setToast({ msg: "Mentor blocked.", type: "error" }); })
      .catch(err => setToast({ msg: err.message, type: "error" }));

  const doUnblock = () =>
    unblockMentor(mentor.id)
      .then(() => { onUpdate(); setToast({ msg: "Mentor unblocked!", type: "success" }); })
      .catch(err => setToast({ msg: err.message, type: "error" }));

  const doDelete = () => {
    if (!window.confirm(`Are you sure you want to permanently delete ${mentor.name}?`)) return;
    deleteMentor(mentor.id)
      .then(() => { onBack(); setToast({ msg: "Mentor deleted.", type: "success" }); })
      .catch(err => setToast({ msg: err.message, type: "error" }));
  };

  const doChangeCenter = (centerId, classId, classIds) =>
    updateMentorProfile(mentor.id, { mentorProfile: { center: centerId, class: classId, classes: classIds || [] } })
      .then(() => { onUpdate(); setToast({ msg: "Center & classes assignment updated!", type: "success" }); setShowCourses(false); })
      .catch(err => setToast({ msg: err.message, type: "error" }));

  const quickActions = [
    { icon: "💬", label: "Send Message",   onClick: () => setShowMsg(true),     color: "#8b5cf6", bg: "#ede9fe" },
    { icon: "🏫", label: "Change Center",  onClick: () => setShowCourses(true), color: "#f59e0b", bg: "#fef3c7" },
    { icon: "✏️", label: "Edit Profile",   onClick: () => setShowEdit(true),    color: "#2563eb", bg: "#dbeafe" },
  ];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {showReject   && <RejectModal  mentor={mentor} onClose={() => setShowReject(false)}  onConfirm={doReject} />}
      {showBlock    && <BlockModal   mentor={mentor} onClose={() => setShowBlock(false)}   onConfirm={doBlock} />}
      {showMsg      && <DirectMessageModal mentor={mentor} onClose={() => setShowMsg(false)} setToast={setToast} />}
      {showCourses  && <ChangeCenterModal  mentor={mentor} centers={centers} classes={classes} onClose={() => setShowCourses(false)} onSave={doChangeCenter} />}
      {showEdit     && <EditMentorModal  mentor={mentor} onClose={() => setShowEdit(false)} onSave={() => { onUpdate(); }} setToast={setToast} />}

      {/* NEW: full-size photo lightbox */}
      {photoLightbox && mentor.photoUrl && (
        <div
          onClick={() => setPhotoLightbox(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1100,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: 24 }}>
          <img src={mentor.photoUrl} alt={mentor.name}
            style={{ maxWidth: "80vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 16,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)", border: "3px solid #f59e0b" }} />
          <button onClick={() => setPhotoLightbox(false)}
            style={{ position: "absolute", top: 20, right: 24, background: "rgba(255,255,255,0.15)",
              border: "none", color: "white", fontSize: 22, width: 40, height: 40,
              borderRadius: "50%", cursor: "pointer" }}>✕</button>
        </div>
      )}

      <button onClick={onBack} style={S.backBtn}>← Back to Mentors</button>

      {/* Profile Header — now shows real photo with click-to-enlarge */}
      <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid #f1f5f9",
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)", display: "flex", gap: 20, alignItems: "center", marginBottom: 20 }}>

        {/* Avatar / photo — clickable if a real photo exists */}
        <div
          onClick={() => mentor.photoUrl && setPhotoLightbox(true)}
          style={{ position: "relative", flexShrink: 0, cursor: mentor.photoUrl ? "zoom-in" : "default" }}
          title={mentor.photoUrl ? "Click to view full photo" : ""}>
          <MentorAvatar mentor={mentor} size={80} borderColor="#f59e0b" borderWidth={2.5} />
          {/* Badge indicating it's a real photo vs generated avatar */}
          {mentor.photoUrl ? (
            <span style={{ position: "absolute", bottom: 2, right: 2, background: "#10b981",
              borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 9, border: "2px solid white" }} title="Profile photo uploaded">📷</span>
          ) : (
            <span style={{ position: "absolute", bottom: 2, right: 2, background: "#9ca3af",
              borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 9, border: "2px solid white" }} title="Auto-generated avatar">🤖</span>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1c1917", margin: 0 }}>{mentor.name}</h2>
            <StatusBadge status={mentor.status} />
            {/* NEW: subtle label so admin knows photo source */}
            <span style={{ fontSize: 10, color: mentor.photoUrl ? "#10b981" : "#9ca3af",
              background: mentor.photoUrl ? "#d1fae5" : "#f3f4f6",
              border: `1px solid ${mentor.photoUrl ? "#86efac" : "#e5e7eb"}`,
              borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
              {mentor.photoUrl ? "📷 Photo uploaded" : "🤖 Auto avatar"}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 6px" }}>{mentor.subject} Mentor · {mentor.assignedCenter}</p>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#9ca3af", flexWrap: "wrap" }}>
            <span>📧 {mentor.email}</span>
            <span>📱 {mentor.phone}</span>
            {mentor.gender && <span>⚧ {mentor.gender}</span>}
            {mentor.dob   && <span>🎂 {mentor.dob}</span>}
          </div>
          {/* NEW: show bio if mentor filled it in */}
          {mentor.bio && (
            <p style={{ fontSize: 12, color: "#475569", margin: "8px 0 0", fontStyle: "italic",
              background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
              padding: "6px 10px", maxWidth: 480 }}>
              "{mentor.bio}"
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {isPending  && <><button onClick={doApprove} style={S.primaryBtn}>✓ Approve</button><button onClick={() => setShowReject(true)} style={S.btnRed}>✕ Reject</button></>}
          {isApproved && <button onClick={() => setShowBlock(true)} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>🚫 Block</button>}
          {isBlocked  && <button onClick={doUnblock} style={S.primaryBtn}>✓ Unblock</button>}
          {isRejected && <button onClick={doApprove} style={S.primaryBtn}>✓ Reactivate</button>}
          <button onClick={() => setShowEdit(true)} style={{ ...S.tblBtn, color: "#2563eb", borderColor: "#93c5fd" }}>✏️ Edit</button>
          <button onClick={doDelete} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }}>🗑️ Delete</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
        {quickActions.map((act, i) => (
          <button key={i} onClick={act.onClick}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 12,
              borderRadius: 12, border: "1px solid #f1f5f9", background: act.bg, color: act.color,
              fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            <span style={{ fontSize: 20 }}>{act.icon}</span>
            <span>{act.label}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, borderBottom: "1px solid #e5e7eb", marginBottom: 20 }}>
        {["overview", "activity"].map(sec => (
          <button key={sec} onClick={() => setActiveSection(sec)}
            style={{ padding: "10px 16px", background: "none", border: "none",
              borderBottom: activeSection === sec ? "2.5px solid #f59e0b" : "2.5px solid transparent",
              color: activeSection === sec ? "#d97706" : "#6b7280",
              fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
            {sec}
          </button>
        ))}
      </div>

      {activeSection === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <SectionCard title="👤 Registration Details">
            {/* NEW: show mentor's uploaded profile photo in a dedicated card slot */}
            {mentor.photoUrl && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Profile Photo</div>
                <div
                  onClick={() => setPhotoLightbox(true)}
                  style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", cursor: "zoom-in",
                    border: "2px solid #f59e0b", boxShadow: "0 2px 8px rgba(245,158,11,0.25)" }}
                  title="Click to enlarge">
                  <img src={mentor.photoUrl} alt={mentor.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { icon: "🎓", label: "Qualification",    val: mentor.qualification },
                { icon: "🏢", label: "Assigned Center",  val: mentor.assignedCenter },
                { icon: "💼", label: "Experience",       val: mentor.experience },
                { icon: "📅", label: "Joined",           val: mentor.joined },
                { icon: "📍", label: "Address",          val: mentor.address },
                { icon: "🗂️", label: "Class Assigned",   val: mentor.batch },
                ...(mentor.classNames?.length ? [{ icon: "📚", label: "Assigned Classes", val: mentor.classNames.join(", ") }] : []),
                ...(mentor.gender    ? [{ icon: "⚧",  label: "Gender",    val: mentor.gender }] : []),
                ...(mentor.dob       ? [{ icon: "🎂",  label: "DOB",       val: mentor.dob }]    : []),
                ...(mentor.languages?.length ? [{ icon: "🗣️", label: "Languages", val: mentor.languages.join(", ") }] : []),
              ].map((r, i) => (
                <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px", border: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{r.icon} {r.val}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="📊 Performance Statistics">
            {isApproved ? (
              <>
                <AttendanceBar val={mentor.attendance || 0} name="Overall Performance Rate" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
                  <div style={{ background: "#d1fae5", borderRadius: 10, padding: "12px", textAlign: "center", border: "1px solid #86efac" }}>
                    <div style={{ fontSize: 16 }}>✅</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917" }}>{mentor.classes}</div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>Lessons Completed</div>
                  </div>
                  <div style={{ background: "#dbeafe", borderRadius: 10, padding: "12px", textAlign: "center", border: "1px solid #93c5fd" }}>
                    <div style={{ fontSize: 16 }}>📋</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#1c1917" }}>{mentor.attendance}%</div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>Score Rate</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "30px", color: "#9ca3af" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                <div style={{ fontSize: 12 }}>Stats available after approval</div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {activeSection === "activity" && (
        <SectionCard title="🕓 Activity Log">
          {[
            { action: "Registered on platform", time: mentor.joined, icon: "👤", type: "info" },
            { action: `Assigned to center: ${mentor.assignedCenter}`, time: "—", icon: "🏫", type: "success" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8,
                background: a.type === "success" ? "#d1fae5" : "#dbeafe",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1c1917" }}>{a.action}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{a.time}</div>
              </div>
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN MENTOR MANAGEMENT TAB
   ══════════════════════════════════════════ */
export default function MentorManagementTab({ setToast }) {
  const [mentors, setMentors]   = useState([]);
  const [centers, setCenters]     = useState([]);
  const [classes, setClasses]     = useState([]);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [centerFilter, setCenterFilter] = useState("all");
  const [selected, setSelected]   = useState(null);
  const [addModal, setAddModal]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [toast, setLocalToast]    = useState({ msg: "", type: "" });
  const [newT, setNewT] = useState({
    name: "", email: "", phone: "", subject: "", address: "",
    qualification: "Graduate", experience: "Fresher", assignedCenter: "", assignedClasses: [], password: ""
  });

  const showToast = setToast || setLocalToast;

  const loadData = async () => {
    setLoading(true);
    try {
      const [mentorsRes, centersRes, classesRes] = await Promise.all([
        getAdminMentors(),
        getCenters(),
        getClasses()
      ]);
      setMentors((mentorsRes.mentors || []).map(mapMentorFromApi));
      setCenters(centersRes.centers || []);
      setClasses(classesRes.classes || []);
    } catch (err) {
      showToast({ msg: "Failed to fetch mentors: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = mentors.filter(t => {
    const q = search.toLowerCase();
    return (t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) ||
      t.phone.includes(q) || (t.subject || "").toLowerCase().includes(q))
      && (statusFilter === "all" || t.status === statusFilter)
      && (centerFilter === "all" || t.centerId === centerFilter);
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newT.name || !newT.email || !newT.phone || !newT.subject || !newT.password) {
      showToast({ msg: "Please fill in all required fields.", type: "error" }); return;
    }
    try {
      const res = await registerMentor({
        name: newT.name, email: newT.email, phone: newT.phone, password: newT.password,
        qualification: newT.qualification, subject: newT.subject,
        experience: newT.experience, address: newT.address,
        center: newT.assignedCenter || undefined,
        class: newT.assignedClasses.length === 1 ? newT.assignedClasses[0] : undefined,
        classIds: newT.assignedClasses.length > 0 ? newT.assignedClasses : undefined,
      });
      const newId = res.mentor?.id || res.mentor?._id;
      await updateMentorStatus(newId, "approved");
      if ((newT.assignedCenter || newT.assignedClasses.length > 0) && newId) {
        await updateMentorProfile(newId, {
          mentorProfile: {
            center: newT.assignedCenter || undefined,
            classes: newT.assignedClasses,
          }
        });
      }
      showToast({ msg: "Mentor registered, approved & assigned!", type: "success" });
      setAddModal(false);
      setNewT({ name: "", email: "", phone: "", subject: "", address: "", qualification: "Graduate", experience: "Fresher", assignedCenter: "", assignedClasses: [], password: "" });
      await loadData();
    } catch (err) {
      showToast({ msg: "Error: " + err.message, type: "error" });
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #fef3c7", borderTopColor: "#f59e0b", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: "#d97706" }}>Loading Mentors...</span>
    </div>
  );

  if (selected) {
    return (
      <MentorProfileView
        mentor={mentors.find(t => t.id === selected.id) || selected}
        centers={centers}
        classes={classes}
        onBack={() => { setSelected(null); loadData(); }}
        onUpdate={loadData}
        setToast={showToast}
      />
    );
  }

  const pending = mentors.filter(t => t.status === "pending").length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {!setToast && <Toast msg={toast.msg} type={toast.type} onClose={() => setLocalToast({ msg: "", type: "" })} />}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#f59e0b 0%,#d97706 60%,#b45309 100%)", borderRadius: 20, padding: "24px 28px", marginBottom: 24, color: "white", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#fffbeb", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>{t("Mentor Management")}</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 4px" }}>{t("All Mentors")}</h1>
            <p style={{ fontSize: 12, margin: 0, color: "rgba(255,255,255,0.85)" }}>{mentors.filter(t=>t.status==="approved").length} {t("approved")} · {pending} {t("pending")} · {mentors.length} {t("total")}</p>
          </div>
          <button onClick={() => setAddModal(true)} style={S.primaryBtn}>+ {t("Add Mentor")}</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
        <StatCard icon="👩‍🏫" label="Total Registered" val={mentors.length}  color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="✅" label="Approved"            val={mentors.filter(t=>t.status==="approved").length} color="#10b981" bg="#d1fae5" />
        <StatCard icon="⏳" label="Pending Approval"   val={pending}          color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="🚫" label="Rejected/Blocked"   val={mentors.filter(t=>t.status==="rejected"||t.status==="blocked").length} color="#ef4444" bg="#fee2e2" />
        {/* NEW: how many have uploaded a real photo */}
        <StatCard icon="📷" label="Photos Uploaded"    val={mentors.filter(t=>t.photoUrl).length} color="#8b5cf6" bg="#ede9fe" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, phone or subject..." />
        </div>
        <select style={{ ...S.input, width: 140, padding: "8px 12px", marginBottom: 0 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="blocked">Blocked</option>
          <option value="rejected">Rejected</option>
        </select>
        <select style={{ ...S.input, width: 180, padding: "8px 12px", marginBottom: 0 }} value={centerFilter} onChange={e => setCenterFilter(e.target.value)}>
          <option value="all">All Centers</option>
          {centers.map(c => <option key={c._id||c.id} value={c._id||c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 16, border: "1px solid #f1f5f9", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              {["Mentor", "Phone", "Center", "Joined", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: "1px solid #f9fafb", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* NEW: uses real photo when available */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <MentorAvatar mentor={t} size={38} borderColor={t.photoUrl ? "#f59e0b" : "#e2e8f0"} borderWidth={t.photoUrl ? 2 : 1} />
                      {/* tiny camera badge if real photo */}
                      {t.photoUrl && (
                        <span style={{ position: "absolute", bottom: -1, right: -1, background: "#10b981",
                          borderRadius: "50%", width: 13, height: 13, display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 7, border: "1.5px solid white" }}>📷</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: "#374151" }}>{t.phone || "—"}</td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: "#374151" }}>
                  <div>{t.assignedCenter}</div>
                  {t.classNames?.length > 0 ? (
                    <div style={{ fontSize: 10, color: "#10b981", marginTop: 2, fontWeight: 600 }}>
                      {t.classNames.length} class{t.classNames.length > 1 ? "es" : ""} assigned
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2, fontWeight: 600 }}>
                      No class assigned
                    </div>
                  )}
                </td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: "#9ca3af" }}>{t.joined}</td>
                <td style={{ padding: "12px 14px" }}><StatusBadge status={t.status} /></td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <button onClick={() => setSelected(t)}
                      style={{ ...S.tblBtn, color: "#3b82f6", borderColor: "#93c5fd" }}>👁 View</button>
                    {t.status === "pending" && (
                      <button onClick={async () => {
                        try { await updateMentorStatus(t.id, "approved"); await loadData(); showToast({ msg: `${t.name} approved!`, type: "success" }); }
                        catch (err) { showToast({ msg: err.message, type: "error" }); }
                      }} style={{ ...S.btnGreen }}>✓ Approve</button>
                    )}
                    {t.status === "approved" && (
                      <button onClick={async () => {
                        try { await blockMentor(t.id); await loadData(); showToast({ msg: `${t.name} blocked.`, type: "error" }); }
                        catch (err) { showToast({ msg: err.message, type: "error" }); }
                      }} style={{ ...S.btnRed }}>🚫 Block</button>
                    )}
                    {t.status === "blocked" && (
                      <button onClick={async () => {
                        try { await unblockMentor(t.id); await loadData(); showToast({ msg: `${t.name} unblocked!`, type: "success" }); }
                        catch (err) { showToast({ msg: err.message, type: "error" }); }
                      }} style={{ ...S.btnGreen }}>✓ Unblock</button>
                    )}
                    <button onClick={async () => {
                      if (!window.confirm(`Delete ${t.name} permanently?`)) return;
                      try { await deleteMentor(t.id); await loadData(); showToast({ msg: `${t.name} deleted.`, type: "success" }); }
                      catch (err) { showToast({ msg: err.message, type: "error" }); }
                    }} style={{ ...S.tblBtn, color: "#dc2626", borderColor: "#fca5a5" }} title="Delete mentor">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "50px", color: "#9ca3af" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>No mentors found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filters</div>
          </div>
        )}
      </div>

      {/* Add Mentor Modal */}
      {addModal && (
        <Modal title="👩‍🏫 Add New Mentor" onClose={() => setAddModal(false)}>
          <form onSubmit={handleAdd}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
              {[
                { key: "name",    label: "Full Name *",   icon: "👤", ph: "Priya Sharma" },
                { key: "subject", label: "Subject *",     icon: "📘", ph: "Early Childhood" },
                { key: "email",   label: "Email *",       icon: "📧", ph: "mentor@school.edu", type: "email" },
                { key: "phone",   label: "Phone *",       icon: "📱", ph: "+91 98765 43210" },
              ].map(f => (
                <div key={f.key}>
                  <label style={S.label}>{f.label}</label>
                  <div style={{ position: "relative" }}>
                    <span style={S.fieldIcon}>{f.icon}</span>
                    <input style={{ ...S.input, paddingLeft: 32 }} type={f.type || "text"}
                      value={newT[f.key]} onChange={e => setNewT({ ...newT, [f.key]: e.target.value })} placeholder={f.ph} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={S.label}>Qualification</label>
                <select style={S.input} value={newT.qualification} onChange={e => setNewT({ ...newT, qualification: e.target.value })}>
                  {["Graduate", "Post-Graduate", "B.Ed", "D.El.Ed", "Other"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Experience</label>
                <select style={S.input} value={newT.experience} onChange={e => setNewT({ ...newT, experience: e.target.value })}>
                  {["Fresher", "1-2 yrs", "3-5 yrs", "5-10 yrs", "10+ yrs"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={S.label}>Assigned Center</label>
              <select style={S.input} value={newT.assignedCenter} onChange={e => {
                const centerId = e.target.value;
                setNewT(prev => {
                  if (centerId) {
                    const allIds = classes.filter(c => String(c.center || c.centerId || c.center?._id) === String(centerId)).map(c => c._id || c.id);
                    return { ...prev, assignedCenter: centerId, assignedClasses: allIds };
                  }
                  return { ...prev, assignedCenter: centerId, assignedClasses: [] };
                });
              }}>
                <option value="">Select Center (optional)</option>
                {centers.map(c => <option key={c._id||c.id} value={c._id||c.id}>{c.name}</option>)}
              </select>
            </div>
            {newT.assignedCenter && (() => {
              const filteredCls = classes.filter(c => String(c.center || c.centerId || c.center?._id) === String(newT.assignedCenter));
              if (filteredCls.length === 0) return null;
              const allSelected = filteredCls.every(c => newT.assignedClasses.includes(c._id || c.id));
              return (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ ...S.label, marginBottom: 0 }}>Assigned Classes ({newT.assignedClasses.length}/{filteredCls.length})</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => setNewT(prev => ({ ...prev, assignedClasses: filteredCls.map(c => c._id || c.id) }))}
                        style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", fontWeight: 600, color: "#374151" }}>
                        All
                      </button>
                      <button type="button" onClick={() => setNewT(prev => ({ ...prev, assignedClasses: [] }))}
                        style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", fontWeight: 600, color: "#374151" }}>
                        None
                      </button>
                    </div>
                  </div>
                  <div style={{ maxHeight: 140, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, background: "#fafafa" }}>
                    {filteredCls.map(cls => (
                      <label key={cls._id || cls.id}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12, color: "#374151", background: newT.assignedClasses.includes(cls._id || cls.id) ? "#eff6ff" : "transparent", marginBottom: 2 }}>
                        <input type="checkbox" checked={newT.assignedClasses.includes(cls._id || cls.id)}
                          onChange={() => {
                            const id = cls._id || cls.id;
                            setNewT(prev => ({
                              ...prev,
                              assignedClasses: prev.assignedClasses.includes(id) ? prev.assignedClasses.filter(x => x !== id) : [...prev.assignedClasses, id]
                            }));
                          }}
                          style={{ accentColor: "#3b82f6", width: 14, height: 14 }} />
                        <span>{cls.name}</span>
                        {cls.ageGroup && <span style={{ fontSize: 10, color: "#9ca3af" }}>({cls.ageGroup})</span>}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div style={{ marginTop: 12 }}>
              <label style={S.label}>Password *</label>
              <div style={{ position: "relative" }}>
                <span style={S.fieldIcon}>🔒</span>
                <input style={{ ...S.input, paddingLeft: 32 }} type="password"
                  value={newT.password} onChange={e => setNewT({ ...newT, password: e.target.value })} placeholder="Set initial password" />
              </div>
            </div>
            <button type="submit" style={{ ...S.primaryBtn, width: "100%", marginTop: 20 }}>
              Add Mentor & Auto-Approve →
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
