import { useState, useEffect, useRef } from "react";
import { Modal, S, StatCard, StatusBadge, Toast, SearchBar } from "../components/Shared";
import { getTeacherLessonPlans, submitLessonCompletion, uploadFile, getActivityBank, uploadActivityBank, getActivitySubmissions, submitActivityCompletion, deleteActivity, createActivityBank } from "../services/api";

const formatDate = (value) => {
  if (!value) return "Not scheduled";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not scheduled";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/* ── Bulk Upload Modal ── */
function BulkUploadModal({ onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const downloadTemplate = () => {
    const headers = ["Milestone", "Activity Name", "Duration", "Materials Required", "Developmental Domain", "Purpose of Activity", "How to Conduct", "Facilitator's Role", "Expected Learning Outcomes", "Day", "Age Group", "Class Name", "Level", "Notes"];
    const row1 = ["Week 1 - Body Awareness", "Introduction to Shapes", "45 min", "Paper, Crayons, Shape cutouts", "Cognitive Development", "Help children identify and name basic shapes in their environment", "Show shapes to children, name them, then have children draw each shape. Use colorful manipulatives for tactile learning.", "Facilitator demonstrates each shape, guides children through drawing, and provides individual support", "Children can identify and draw 3 basic shapes (circle, square, triangle)", "Day 1", "3-4 Years", "Nursery", "Level 1", "Use colorful manipulatives"];
    const row2 = ["Week 1 - Body Awareness", "Shape Sorting Game", "40 min", "Shape cards, Baskets, Timer", "Cognitive Development", "Classify shapes by color and size through group play", "Divide children into groups. Give each group a basket of mixed shape cards. Ask them to sort by color first, then by shape.", "Facilitator observes group dynamics, provides hints when needed, and ensures inclusive participation", "Children can sort 10+ shapes correctly by color and shape", "Day 2", "3-4 Years", "Nursery", "Level 1", "Encourage teamwork"];
    const csvContent = [headers.join(","), row1.map(cell => `"${cell}"`).join(","), row2.map(cell => `"${cell}"`).join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Lesson_Plan_Template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = () => {
    const file = fileInputRef.current?.files[0];
    setFileName(file ? file.name : "");
    setError("");
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files[0];
    if (!file) {
      setError("Please select an Excel or CSV file to upload.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await uploadActivityBank(file);
      if (res.success) {
        onSuccess(`Successfully imported ${res.imported} activities!`);
        onClose();
      } else {
        setError(res.message || "Failed to import activities.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Network error uploading activities.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="📤 Submit Activity (Excel/CSV)" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {error && <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: 8, fontSize: 12 }}>{error}</div>}
        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
          Upload your lesson schedule and activity plan using an Excel (.xlsx/.xls) or CSV file.
          Each row should represent one day's lesson. The system will automatically parse it and generate one lesson card per row.
        </div>
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: 12, fontSize: 12, color: "#0369a1", lineHeight: 1.5 }}>
          <b>Expected columns:</b> Milestone, Activity Name, Duration, Materials Required, Developmental Domain, Purpose of Activity, How to Conduct, Facilitator's Role, Expected Learning Outcomes, Day, Age Group, Class Name, Level, Notes
        </div>
        <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, padding: 24, textAlign: "center" }}>
          <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} id="bulk-upload-input" />
          <label htmlFor="bulk-upload-input" style={{ cursor: "pointer", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 32 }}>{fileName ? "📄" : "📁"}</div>
            <div style={{ fontWeight: 600, color: "#3b82f6" }}>{fileName || "Click to select a file"}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Supports .xlsx, .xls, .csv</div>
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <button onClick={downloadTemplate} style={{ background: "none", border: "none", color: "#10b981", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
            Download Template
          </button>
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ ...S.primaryBtn, background: "white", color: "#6b7280", border: "1px solid #e2e8f0" }} onClick={onClose}>Cancel</button>
            <button style={S.primaryBtn} onClick={handleBulkUpload} disabled={submitting}>
              {submitting ? "Uploading..." : "Upload File"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Manual Activity Creation Form ── */
function CreateActivityModal({ onClose, onSuccess, user }) {
  const [form, setForm] = useState({
    activityName: "",
    milestone: "",
    duration: "",
    ageGroup: "",
    className: "",
    level: "",
    developmentalDomain: "",
    purposeOfActivity: "",
    howToConduct: "",
    facilitatorRole: "",
    materialsRequired: "",
    expectedLearningOutcomes: "",
    dayNumber: "",
    learningObjectives: "",
    activities: "",
    resources: "",
    instructions: "",
    expectedOutput: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.activityName.trim()) {
      setError("Activity Name is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
  const payload = { ...form };
  if (form.dayNumber) payload.dayNumber = Number(form.dayNumber);
  else delete payload.dayNumber;
  Object.keys(payload).forEach(k => { if (payload[k] === "") delete payload[k]; });
  payload.createdBy = user?._id || user?.id;
  const res = await createActivityBank(payload);
      if (res.success !== false) {
        onSuccess("Activity created successfully!");
        onClose();
      } else {
        setError(res.message || "Failed to create activity.");
      }
    } catch (err) {
      setError(err.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key, label, type = "input", required = false) => {
    if (type === "textarea") {
      return (
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>{label}{required && " *"}</label>
          <textarea
            style={{ ...S.input, height: 80, resize: "vertical" }}
            value={form[key]}
            onChange={set(key)}
            placeholder={`Enter ${label.toLowerCase()}...`}
          />
        </div>
      );
    }
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={S.label}>{label}{required && " *"}</label>
        <input
          style={S.input}
          type={type}
          value={form[key]}
          onChange={set(key)}
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      </div>
    );
  };

  const select = (key, label, options) => (
    <div style={{ marginBottom: 12 }}>
      <label style={S.label}>{label}</label>
      <select style={S.input} value={form[key]} onChange={set(key)}>
        <option value="">Select {label.toLowerCase()}...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <Modal title="✏️ Create Activity Manually" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <div style={{ padding: "8px 12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, fontSize: 12, color: "#0369a1", marginBottom: 16, lineHeight: 1.5 }}>
          Fill in the details below. All fields except Activity Name are optional — add as much detail as you need.
        </div>

        {/* Basic Info */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, marginTop: 4 }}>📋 Basic Information</div>
        {field("activityName", "Activity Name", "input", true)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {field("duration", "Duration (e.g. 45 min)")}
          {field("dayNumber", "Day Number", "number")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {select("ageGroup", "Age Group", ["0-1 Years", "1-2 Years", "2-3 Years", "3-4 Years", "4-5 Years", "5-6 Years", "6+ Years"])}
          {select("level", "Level", ["Level 1", "Level 2", "Level 3", "General"])}
        </div>
        {field("className", "Class Name")}

        {/* Classification */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, marginTop: 16 }}>🏷️ Classification</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {select("developmentalDomain", "Developmental Domain", ["Cognitive Development", "Language & Literacy", "Motor Development", "Social-Emotional", "Creative Expression", "Mathematical Thinking", "Science & Nature", "Sensory Play", "Physical Development", "General"])}
          {field("milestone", "Milestone")}
        </div>

        {/* Activity Details */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, marginTop: 16 }}>📝 Activity Details</div>
        {field("purposeOfActivity", "Purpose of Activity", "textarea")}
        {field("howToConduct", "How to Conduct", "textarea")}
        {field("facilitatorRole", "Facilitator's Role", "textarea")}

        {/* Resources & Outcomes */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, marginTop: 16 }}>📦 Resources & Outcomes</div>
        {field("materialsRequired", "Materials Required", "textarea")}
        {field("expectedLearningOutcomes", "Expected Learning Outcomes", "textarea")}

        {/* Additional Fields */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, marginTop: 16 }}>📎 Additional Details</div>
        {field("learningObjectives", "Learning Objectives", "textarea")}
        {field("activities", "Activities", "textarea")}
        {field("resources", "Resources", "textarea")}
        {field("instructions", "Instructions", "textarea")}
        {field("expectedOutput", "Expected Output", "textarea")}
        {field("notes", "Notes", "textarea")}

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button type="button" style={{ ...S.primaryBtn, background: "white", color: "#6b7280", border: "1px solid #e2e8f0", flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="submit" disabled={submitting} style={{ ...S.primaryBtn, flex: 1 }}>
            {submitting ? "Creating..." : "✅ Create Activity"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Activity Detail Modal (View Details for ActivityBank cards) ── */
function ActivityDetailModal({ activity, onClose }) {
  const Tag = ({ color, bg, border, children }) => (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color: color, border: `1px solid ${border}` }}>
      {children}
    </span>
  );

  const Section = ({ icon, label, value, placeholder, color = "#374151", bg = "#f9fafb", border = "#f3f4f6" }) => {
    const displayValue = value && String(value).trim() ? value : placeholder;
    if (!displayValue) return null;
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
        </div>
        <div style={{ padding: "12px 14px", background: bg, borderRadius: 10, border: `1px solid ${border}`, fontSize: 13, color: value && String(value).trim() ? color : "#94a3b8", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {displayValue}
        </div>
      </div>
    );
  };

  return (
    <Modal title={`📖 ${activity.activityName || "Activity Details"}`} onClose={onClose}>
      {/* Header Tags */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {activity.level && <Tag color="#1d4ed8" bg="#dbeafe" border="#bfdbfe">{activity.level}</Tag>}
        {activity.dayNumber && <Tag color="#92400e" bg="#fef3c7" border="#fde68a">Day {activity.dayNumber}</Tag>}
        {activity.ageGroup && <Tag color="#065f46" bg="#d1fae5" border="#a7f3d0">{activity.ageGroup}</Tag>}
        {activity.className && <Tag color="#6b21a8" bg="#f3e8ff" border="#d8b4fe">{activity.className}</Tag>}
        {activity.duration && <Tag color="#0369a1" bg="#e0f2fe" border="#bae6fd">⏱️ {activity.duration}</Tag>}
      </div>

      {/* Learning Objectives */}
      <Section
        icon="🎯"
        label="Learning Objectives"
        value={activity.learningObjectives || activity.purposeOfActivity}
        placeholder="Enter learning objectives..."
        color="#0369a1"
        bg="#f0f9ff"
        border="#bfdbfe"
      />

      {/* Activities */}
      <Section
        icon="🎪"
        label="Activities"
        value={activity.activities || activity.activityName}
        placeholder="Enter activities..."
        color="#7c3aed"
        bg="#faf5ff"
        border="#e9d5ff"
      />

      {/* Resources */}
      <Section
        icon="📦"
        label="Resources"
        value={activity.resources || activity.materialsRequired}
        placeholder="Enter resources..."
        color="#92400e"
        bg="#fffbeb"
        border="#fde68a"
      />

      {/* Instructions */}
      <Section
        icon="📝"
        label="Instructions"
        value={activity.instructions || activity.howToConduct}
        placeholder="Enter instructions..."
        color="#854d0e"
        bg="#fefce8"
        border="#fef08a"
      />

      {/* Expected Output */}
      <Section
        icon="🏆"
        label="Expected Output"
        value={activity.expectedOutput || activity.expectedLearningOutcomes}
        placeholder="Enter expected output..."
        color="#166534"
        bg="#f0fdf4"
        border="#bbf7d0"
      />

      {/* Milestone / Domain / Role */}
      {activity.milestone && (
        <Section
          icon="🏅"
          label="Milestone"
          value={activity.milestone}
          color="#5b21b6"
          bg="linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)"
          border="#e9d5ff"
        />
      )}

      {(activity.developmentalDomain || activity.type) && (
        <Section
          icon="🧠"
          label="Developmental Domain"
          value={activity.developmentalDomain || activity.type}
          color="#166534"
          bg="#f0fdf4"
          border="#bbf7d0"
        />
      )}

      {activity.facilitatorRole && (
        <Section
          icon="👩‍🏫"
          label="Facilitator's Role"
          value={activity.facilitatorRole}
          color="#9a3412"
          bg="#fff7ed"
          border="#fed7aa"
        />
      )}

      {activity.notes && (
        <Section
          icon="💡"
          label="Notes"
          value={activity.notes}
          color="#475569"
          bg="#f8fafc"
          border="#e2e8f0"
        />
      )}

      {/* Footer */}
      <div style={{ marginTop: 16, padding: "10px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#9ca3af" }}>
        <span>📅 Created: {formatDate(activity.createdAt)}</span>
        {activity.sourceRowNumber && <span>Row #{activity.sourceRowNumber}</span>}
      </div>
    </Modal>
  );
}

/* ── Mark Complete Modal (requires proof submission) ── */
function MarkCompleteModal({ activity, user, onSubmit, onClose }) {
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [docFiles, setDocFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const userCenter = user?.teacherProfile?.center?._id || user?.teacherProfile?.center?.id || user?.teacherProfile?.center || "";
  const userClass = (user?.teacherProfile?.classes || [])[0]?._id || (user?.teacherProfile?.classes || [])[0]?.id || (user?.teacherProfile?.classes || [])[0] || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please write a description of the completed activity.");
      return;
    }
    if (!userCenter || !userClass) {
    setError("No class assigned to your account. Please contact admin.");
    return;
    }
    setSubmitting(true);
    setError("");
    try {
      // Upload all files first
      const fileIds = [];
      const allFiles = [...photos, ...docFiles];
      for (const f of allFiles) {
        try {
          const uploadRes = await uploadFile(f);
          const id = uploadRes?.asset?._id || uploadRes?.asset?.id || uploadRes?.file?._id || uploadRes?.file?.id;
          if (id) fileIds.push(id);
        } catch (ue) {
          console.warn("File upload failed:", ue);
        }
      }

      await submitActivityCompletion({
        center: userCenter,
        class: userClass,
        description,
        activityDate: new Date().toISOString(),
        activityBank: activity._id || activity.id,
        activityName: activity.activityName,
        duration: activity.duration,
        level: activity.level,
        type: activity.type || activity.developmentalDomain,
        ageGroup: activity.ageGroup,
        milestone: activity.milestone,
        developmentalDomain: activity.developmentalDomain,
        purposeOfActivity: activity.purposeOfActivity,
        howToConduct: activity.howToConduct,
        facilitatorRole: activity.facilitatorRole,
        materialsRequired: activity.materialsRequired,
        expectedLearningOutcomes: activity.expectedLearningOutcomes,
        dayNumber: activity.dayNumber,
        learningObjectives: activity.learningObjectives,
        activities: activity.activities,
        resources: activity.resources,
        instructions: activity.instructions,
        expectedOutput: activity.expectedOutput,
        notes: activity.notes,
        files: fileIds
      });

      onSubmit();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit completion report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`✅ Mark Complete: ${activity.activityName}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <div style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a", marginBottom: 16, fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
          ⚠️ Please provide proof of completion. Upload activity photos, documents, and a written description of what was accomplished.
        </div>

        <label style={S.label}>Activity Description / Summary *</label>
        <textarea
          style={{ ...S.input, height: 90, resize: "none", marginBottom: 12 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the activity you completed, how students participated, key observations..."
          required
        />

        <label style={S.label}>Upload Activity Photos</label>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Select one or more photos as proof of activity</div>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setPhotos(Array.from(e.target.files))}
          style={{ marginBottom: 12, width: "100%", fontSize: 13 }}
        />
        {photos.length > 0 && (
          <div style={{ fontSize: 11, color: "#10b981", marginBottom: 12 }}>📷 {photos.length} photo(s) selected</div>
        )}

        <label style={S.label}>Upload Documents / Supporting Files (Optional)</label>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>PDF, Excel, Word, etc.</div>
        <input
          type="file"
          multiple
          onChange={(e) => setDocFiles(Array.from(e.target.files))}
          style={{ marginBottom: 20, width: "100%", fontSize: 13 }}
        />
        {docFiles.length > 0 && (
          <div style={{ fontSize: 11, color: "#10b981", marginBottom: 12 }}>📎 {docFiles.length} document(s) selected</div>
        )}

        <button type="submit" disabled={submitting} style={{ ...S.primaryBtn, width: "100%" }}>
          {submitting ? "Submitting..." : "📤 Submit Completion Report"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Lesson Detail Modal (for admin-assigned lesson plans) ── */
function LessonDetailModal({ assignment, onClose, onSubmitComplete }) {
  const [teachingNotes, setTeachingNotes] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (assignment.isActivity) {
    const act = assignment.originalActivity || {};
    return (
      <Modal title="📖 Submitted Activity" onClose={onClose}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <StatusBadge status="completed" />
          <span style={{ fontSize: 12, color: "#6b7280" }}>📅 {formatDate(act.activityDate || act.createdAt)}</span>
          {act.class?.name && <span style={{ fontSize: 12, color: "#6b7280" }}>🎒 {act.class.name}</span>}
        </div>
        
        <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>
            📝 Description
          </div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{act.description || "—"}</div>
        </div>

        {act.files && act.files.length > 0 && (
          <div style={{ marginBottom: 12, padding: "10px 12px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#065f46", textTransform: "uppercase", marginBottom: 8 }}>
              📎 Attached Files
            </div>
            {act.files.map((f, i) => {
              const isImage = f.mimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(f.originalName || "");
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <a 
                    href={`http://localhost:5000${f.publicUrl}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#fff", border: "1px solid #10b981", borderRadius: 6, fontSize: 12, color: "#10b981", textDecoration: "none", fontWeight: 600 }}
                  >
                    ⬇️ Download {f.originalName || "Attachment"}
                  </a>
                  {isImage && (
                    <div style={{ marginTop: 8 }}>
                      <img src={`http://localhost:5000${f.publicUrl}`} alt={f.originalName} style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {assignment.adminFeedback && (
          <div style={{ marginTop: 4, padding: "10px 12px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#065f46", textTransform: "uppercase", marginBottom: 4 }}>
              💬 Admin Feedback
            </div>
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{assignment.adminFeedback}</div>
          </div>
        )}
      </Modal>
    );
  }

  const plan = assignment.lessonPlan || {};
  const sections = [
    { icon: "🎯", label: "Learning Objectives", val: plan.objectives },
    { icon: "🎪", label: "Activities", val: plan.activities },
    { icon: "📦", label: "Resources", val: plan.resources },
    { icon: "📝", label: "Instructions", val: plan.instructions },
    { icon: "🏆", label: "Expected Output", val: plan.expectedOutput || plan.objectives },
    { icon: "💡", label: "Purpose & Notes", val: plan.purpose || plan.notes },
  ].filter(s => s.val);

  return (
    <Modal title={`📖 ${plan.title || "Lesson"}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <StatusBadge status={assignment.status} />
        <span style={{ fontSize: 12, color: "#6b7280" }}>📅 {formatDate(assignment.assignedDate)}</span>
        {assignment.class?.name && <span style={{ fontSize: 12, color: "#6b7280" }}>🎒 {assignment.class.name}</span>}
      </div>
      {sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 12, padding: "10px 12px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>
            {s.icon} {s.label}
          </div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{s.val || "—"}</div>
        </div>
      ))}
      {assignment.adminFeedback && (
        <div style={{ marginTop: 4, padding: "10px 12px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#065f46", textTransform: "uppercase", marginBottom: 4 }}>
            💬 Admin Feedback
          </div>
          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{assignment.adminFeedback}</div>
        </div>
      )}
    </Modal>
  );
}

/* ── Completion Submission Modal (for admin-assigned lesson plans) ── */
function CompleteLessonModal({ assignment, onSubmit, onClose }) {
  const [teachingNotes, setTeachingNotes] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);

  const plan = assignment.lessonPlan || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teachingNotes.trim() && !activityDescription.trim()) {
      setError("Please add teaching notes or an activity description before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      let fileId = null;
      if (file) {
        const uploadRes = await uploadFile(file);
        if (uploadRes && uploadRes.asset) {
          fileId = uploadRes.asset._id || uploadRes.asset.id;
        } else if (uploadRes && uploadRes.file) {
          fileId = uploadRes.file._id || uploadRes.file.id;
        } else {
          throw new Error("File upload failed.");
        }
      }
      await onSubmit(assignment._id || assignment.id, { 
        teachingNotes, 
        activityDescription,
        files: fileId ? [fileId] : []
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit completion report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`✅ Mark Complete: ${plan.title || "Lesson"}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <label style={S.label}>What did you teach today? (Activity Description)</label>
        <textarea
          style={{ ...S.input, height: 70, resize: "none", marginBottom: 12 }}
          value={activityDescription}
          onChange={(e) => setActivityDescription(e.target.value)}
          placeholder="Briefly describe what was covered in class..."
        />

        <label style={S.label}>Teaching Notes / Observations</label>
        <textarea
          style={{ ...S.input, height: 90, resize: "none", marginBottom: 16 }}
          value={teachingNotes}
          onChange={(e) => setTeachingNotes(e.target.value)}
          placeholder="How did the children respond? Any challenges or highlights?"
        />

        <label style={S.label}>Attach Document (Optional)</label>
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
          Supports any file type (PNG, JPG, PDFs, Excel, Videos, Zips, etc.)
        </div>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ marginBottom: 20, width: "100%", fontSize: 13 }}
        />

        <button type="submit" disabled={submitting} style={{ ...S.primaryBtn, width: "100%" }}>
          {submitting ? "Submitting..." : "📤 Submit Completion Report"}
        </button>
      </form>
    </Modal>
  );
}

/* ── Main Component ── */
export default function TrainingAndClassroomManager({ user }) {
  const [activityCards, setActivityCards] = useState([]);
  const [lessonAssignments, setLessonAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailAssignment, setDetailAssignment] = useState(null);
  const [detailActivity, setDetailActivity] = useState(null);
  const [completeActivity, setCompleteActivity] = useState(null);
  const [completeLessonAssignment, setCompleteLessonAssignment] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "" });

  const loadData = async () => {
  console.log("==> Fetching activities with createdBy:", user?._id || user?.id);
    setLoading(true);
    try {
      const [lessonRes, bankRes, submissionRes] = await Promise.all([
        getTeacherLessonPlans().catch(() => ({ assignments: [], lessonPlans: [] })),
        getActivityBank({ createdBy: (user?._id || user?.id) }).catch(() => ({ success: false, activities: [] })),
        getActivitySubmissions().catch(() => ({ activities: [] }))
      ]);

      // Lesson plan assignments from admin
      const lessons = lessonRes.assignments || lessonRes.lessonPlans || [];
      setLessonAssignments(lessons);

      // Activity bank cards from uploaded Excel
      const bankActivities = bankRes.activities || [];
      setActivityCards(bankActivities);

      // Already submitted completions (to mark cards as done)
      const subs = submissionRes.activities || [];
      setSubmissions(subs);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Check if a specific activity has been submitted as completed
  const isActivityCompleted = (activity) => {
    const activityId = String(activity._id || activity.activityId || "");
    return submissions.some(sub => {
      const subBankId = String(sub.activityBank || "");
      return (subBankId && subBankId === activityId) ||
        (sub.activityName === activity.activityName && sub.dayNumber === activity.dayNumber);
    });
  };

  // Build combined list: lesson assignments + activity bank cards
  const allItems = [
    ...lessonAssignments.map(l => ({
      id: l._id || l.id,
      type: "lesson",
      title: l.lessonPlan?.title || "Lesson Plan",
      description: l.lessonPlan?.instructions || l.lessonPlan?.objectives || "",
      date: l.assignedDate,
      status: l.status || "pending",
      className: l.class?.name || "",
      level: "",
      dayNumber: null,
      raw: l
    })),
    ...activityCards.map(a => ({
      id: a._id || a.id,
      type: "activity",
      title: a.dayNumber ? `Day ${a.dayNumber}: ${a.activityName}` : (a.activityName || "Activity"),
      description: a.learningObjectives || a.howToConduct || a.purposeOfActivity || a.milestone || "",
      date: a.createdAt,
      status: isActivityCompleted(a) ? "completed" : "pending",
      className: a.className || "",
      level: a.level || "",
      dayNumber: a.dayNumber,
      duration: a.duration || "",
      milestone: a.milestone || "",
      developmentalDomain: a.developmentalDomain || a.type || "",
      ageGroup: a.ageGroup || "",
      raw: a
    }))
  ];

  // Filter + search
  const filtered = allItems.filter((item) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && item.status === "pending") ||
      (filter === "completed" && (item.status === "completed" || item.status === "reviewed" || item.status === "approved"));
    const q = search.toLowerCase();
    const matchesSearch = !q || item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = allItems.filter(i => i.status === "pending").length;
  const completedCount = allItems.filter(i => i.status === "completed" || i.status === "reviewed" || i.status === "approved").length;

  const handleCompleteSubmit = async (assignmentId, payload) => {
    await submitLessonCompletion(assignmentId, payload);
    setToast({ msg: "Completion report submitted for admin review!", type: "success" });
    loadData();
  };

  const handleDeleteActivity = async (activity) => {
    const name = activity.activityName || "this activity";
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const id = String(activity._id || activity.id || "");
    if (!id || id === "undefined" || id === "null") {
      setToast({ msg: "Cannot delete: activity ID not found.", type: "error" });
      return;
    }
    try {
      console.log("Deleting activity:", id, activity);
      await deleteActivity(id);
      setToast({ msg: `"${name}" deleted successfully.`, type: "success" });
      loadData();
    } catch (err) {
      console.error("Delete error:", err);
      setToast({ msg: err.message || "Failed to delete. Please try again.", type: "error" });
    }
  };

  const filterBtn = (key, label) => (
    <button
      onClick={() => setFilter(key)}
      style={{ ...S.exportBtn, background: filter === key ? "#f59e0b" : "white", color: filter === key ? "white" : "#6b7280", borderColor: filter === key ? "#f59e0b" : "#e5e7eb" }}
    >
      {label}
    </button>
  );

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh", fontSize: 14, fontWeight: 600, color: "#d97706" }}>
        🔄 Loading Training & Lessons...
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: "", type: "" })} />

      {/* View Details: Activity Bank card */}
      {detailActivity && (
        <ActivityDetailModal activity={detailActivity} onClose={() => setDetailActivity(null)} />
      )}

      {/* View Details: Lesson Plan assignment */}
      {detailAssignment && (
        <LessonDetailModal 
          assignment={detailAssignment} 
          onClose={() => setDetailAssignment(null)} 
          onSubmitComplete={handleCompleteSubmit}
        />
      )}

      {/* Mark Complete: Activity Bank card */}
      {completeActivity && (
        <MarkCompleteModal
          activity={completeActivity}
          user={user}
          onSubmit={() => {
            setToast({ msg: "Activity completion report submitted for admin review!", type: "success" });
            setCompleteActivity(null);
            loadData();
          }}
          onClose={() => setCompleteActivity(null)}
        />
      )}

      {/* Mark Complete: Lesson Plan assignment */}
      {completeLessonAssignment && (
        <CompleteLessonModal
          assignment={completeLessonAssignment}
          onSubmit={handleCompleteSubmit}
          onClose={() => setCompleteLessonAssignment(null)}
        />
      )}

      {/* Upload Excel Modal */}
      {showActivityModal && (
        <BulkUploadModal
          onClose={() => setShowActivityModal(false)}
          onSuccess={(msg) => {
            setToast({ msg, type: "success" });
            loadData();
          }}
        />
      )}

      {/* Manual Create Modal */}
{showCreateModal && (
  <CreateActivityModal
    onClose={() => setShowCreateModal(false)}
    onSuccess={(msg) => {
      setToast({ msg, type: "success" });
      loadData();
    }}
    user={user}
  />
)}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h1 style={S.pageTitle}>Training & Lessons</h1>
          <p style={S.pageSub}>Lesson plans and activity schedules</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowCreateModal(true)} style={{ ...S.primaryBtn, padding: "10px 16px", background: "white", color: "#3b82f6", border: "1.5px solid #3b82f6" }}>
            ✏️ Add Activity
          </button>
          <button onClick={() => setShowActivityModal(true)} style={{ ...S.primaryBtn, padding: "10px 16px" }}>
            📤 Bulk Upload
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard icon="📋" label="Total Cards" val={allItems.length} color="#3b82f6" bg="#dbeafe" />
        <StatCard icon="⏳" label="Pending" val={pendingCount} color="#f59e0b" bg="#fef3c7" />
        <StatCard icon="✅" label="Completed" val={completedCount} color="#10b981" bg="#d1fae5" />
      </div>

      {/* Filters + Search */}
      <div style={{ background: "white", borderRadius: 14, padding: "14px 18px", border: "1px solid #f1f5f9", marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search lessons & activities..." />
        </div>
        {filterBtn("all", "All")}
        {filterBtn("pending", "Pending")}
        {filterBtn("completed", "Completed")}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "white", borderRadius: 16, border: "1px dashed #cbd5e1", color: "#94a3b8" }}>
          {allItems.length === 0
            ? "No lesson plans or activities yet. Click 'Submit Activity' to upload an Excel file."
            : "No items match your current filter."
          }
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
          {filtered.map((item) => {
            const isDone = item.status === "completed" || item.status === "reviewed" || item.status === "approved";
            return (
              <div
                key={item.id}
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: "18px 20px",
                  border: "1px solid #f1f5f9",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  borderLeft: `4px solid ${isDone ? "#10b981" : "#f59e0b"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", flex: 1 }}>{item.title}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {item.dayNumber && (
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 700, background: "#fef3c7", color: "#92400e" }}>
                        Day {item.dayNumber}
                      </span>
                    )}
                    {item.type === "activity" && (
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 700, background: "#dbeafe", color: "#1d4ed8" }}>
                        {item.level || "Activity"}
                      </span>
                    )}
                    <StatusBadge status={isDone ? "completed" : "pending"} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                  📅 {formatDate(item.date)}
                  {item.className && <span> · 🎒 {item.className}</span>}
                  {item.duration && <span> · ⏱️ {item.duration}</span>}
                </div>
                {(item.milestone || item.developmentalDomain) && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                    {item.milestone && (
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: "#faf5ff", color: "#7c3aed", border: "1px solid #e9d5ff" }}>
                        🏅 {item.milestone}
                      </span>
                    )}
                    {item.developmentalDomain && (
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }}>
                        🧠 {item.developmentalDomain}
                      </span>
                    )}
                  </div>
                )}
                <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5, marginBottom: 14, margin: 0, marginTop: 6 }}>
                  {(item.description || "No description provided.").slice(0, 120)}
                  {(item.description || "").length > 120 ? "..." : ""}
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => {
                      if (item.type === "activity") setDetailActivity(item.raw);
                      else setDetailAssignment(item.raw);
                    }}
                    style={{ ...S.tblBtn, flex: 1 }}
                  >
                    👁 View Details
                  </button>
                  {!isDone && (
                    <button
                      onClick={() => {
                        if (item.type === "activity") setCompleteActivity(item.raw);
                        else setCompleteLessonAssignment(item.raw);
                      }}
                      style={{ ...S.primaryBtn, flex: 1, padding: "8px 12px", fontSize: 12 }}
                    >
                      ✅ Mark Complete
                    </button>
                  )}
                  {item.type === "activity" && (
                    <button
                      onClick={() => handleDeleteActivity(item.raw)}
                      style={{ ...S.tblBtn, color: "#ef4444", borderColor: "#fca5a5", padding: "8px 10px", fontSize: 12, flex: "none" }}
                      title="Delete activity"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}