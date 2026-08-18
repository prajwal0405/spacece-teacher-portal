import { useState, useEffect, useRef } from "react";
import { Modal, S, StatCard, StatusBadge, Toast, SearchBar, SectionCard } from "../components/Shared";
import { getTeacherLessonPlans, submitLessonCompletion, uploadFile, getActivityBank, uploadActivityBank, getActivitySubmissions, submitActivityCompletion, deleteActivity, createActivityBank, getChildren } from "../services/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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
function CreateActivityModal({ onClose, onSuccess }) {
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
    </Modal>
  );
}

const DOMAIN_OPTIONS = [
  { id: "Cognitive", label: "🧠 Cognitive", bg: "#faf5ff", color: "#7c3aed", border: "#c084fc" },
  { id: "Language & Literacy", label: "💬 Language & Literacy", bg: "#eff6ff", color: "#2563eb", border: "#60a5fa" },
  { id: "Fine Motor", label: "🖐️ Fine Motor", bg: "#f0fdf4", color: "#166534", border: "#4ade80" },
  { id: "Gross Motor", label: "🏃 Gross Motor", bg: "#fff7ed", color: "#c2410c", border: "#fb923c" },
  { id: "Socio-Emotional", label: "🤝 Socio-Emotional", bg: "#fdf2f8", color: "#db2777", border: "#f472b6" }
];

/* ── Helper to resolve child's display name ── */
const getChildName = (c) => {
  if (!c) return "Student";
  return c.fullName || c.name || c.childName || (c.rollNo ? `Student (${c.rollNo})` : "Student");
};

/* ── Mark Complete Modal (requires proof submission) ── */
export function MarkCompleteModal({ activity, user, onSubmit, onClose }) {
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [docFiles, setDocFiles] = useState([]);
  const [roughNotes, setRoughNotes] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ECE Parameters State
  const [selectedDomains, setSelectedDomains] = useState(["Cognitive"]);
  const [groupMastery, setGroupMastery] = useState("Developing");
  const [followUpAction, setFollowUpAction] = useState("proceed_next");
  const [flaggedChildren, setFlaggedChildren] = useState([]);

  // Search-As-You-Type Roster Autocomplete State
  const [roster, setRoster] = useState([]);
  const [childSearchQuery, setChildSearchQuery] = useState("");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [showRosterDropdown, setShowRosterDropdown] = useState(false);
  const [childStatus, setChildStatus] = useState("needs_support");
  const [childNote, setChildNote] = useState("");
  const autocompleteRef = useRef(null);

  // STT Voice Speech Recognition State
  const [isRecording, setIsRecording] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const recognitionRef = useRef(null);
  const baseNotesRef = useRef("");

  const userCenter = user?.teacherProfile?.center?._id || user?.teacherProfile?.center?.id || user?.teacherProfile?.center || "";
  const userClass = (user?.teacherProfile?.classes || [])[0]?._id || (user?.teacherProfile?.classes || [])[0]?.id || (user?.teacherProfile?.classes || [])[0] || "";

  // Auto-close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowRosterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Class Student Roster with Fallbacks
  useEffect(() => {
    async function fetchRoster() {
      try {
        let list = [];
        if (userClass) {
          const res = await getTeacherChildren(userClass);
          list = res?.children || res?.data || [];
        }
        if (!list || list.length === 0) {
          const adminRes = await getChildren();
          list = adminRes?.children || adminRes?.data || [];
        }
        setRoster(list || []);
      } catch (err) {
        console.warn("Failed to fetch class roster:", err);
      }
    }
    fetchRoster();
  }, [userClass]);

  // Pre-fill initial domain if activity has default
  useEffect(() => {
    if (activity?.developmentalDomain) {
      const initial = Array.isArray(activity.developmentalDomain)
        ? activity.developmentalDomain
        : [activity.developmentalDomain];
      setSelectedDomains(initial);
    }
  }, [activity]);

  // STT Voice Mic Handler (Clean, Bulletproof Real-Time Speech Recognition)
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLanguage || "en-US";
      recognition.interimResults = true;
      recognition.continuous = true;

      const baseText = roughNotes ? roughNotes.trim() + " " : "";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        let finalStr = "";
        let interimStr = "";

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            finalStr += text + " ";
          } else {
            interimStr += text;
          }
        }

        setRoughNotes((baseText + finalStr + interimStr).trim());
      };

      recognition.onerror = (e) => {
        console.warn("Speech error:", e.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech Recognition Error:", e);
      setIsRecording(false);
    }
  };

  const toggleDomainChip = (domainId) => {
    setSelectedDomains((prev) =>
      prev.includes(domainId) ? prev.filter((d) => d !== domainId) : [...prev, domainId]
    );
  };

  const safeSearchQuery = (childSearchQuery || "").toLowerCase();
  const filteredRoster = roster.filter((c) =>
    getChildName(c).toLowerCase().includes(safeSearchQuery)
  );

  const handleSelectRosterChild = (childObj) => {
    const name = getChildName(childObj);
    setChildSearchQuery(name);
    setSelectedChildId(childObj._id || childObj.id);
    setShowRosterDropdown(false);
  };

  const handleSelectFromSelectDropdown = (idVal) => {
    setSelectedChildId(idVal);
    if (!idVal) {
      setChildSearchQuery("");
      return;
    }
    const found = roster.find((c) => (c._id || c.id) === idVal);
    if (found) {
      setChildSearchQuery(getChildName(found));
    }
  };

  const handleAddFlaggedChild = () => {
    const name = childSearchQuery.trim();
    if (!name) {
      setError("Please select a student from roster or enter a name for exception tagging.");
      return;
    }

    setFlaggedChildren((prev) => [
      ...prev,
      { child: selectedChildId || null, childName: name, status: childStatus, note: childNote.trim() }
    ]);

    setChildSearchQuery("");
    setSelectedChildId("");
    setChildNote("");
    setError("");
  };

  const handleRemoveFlaggedChild = (index) => {
    setFlaggedChildren((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDraftWithAI = async () => {
    if (!roughNotes.trim()) return;
    setIsDrafting(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/teacher/reports/draft-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("spaceece_auth_token")}`
        },
        body: JSON.stringify({ roughNotes })
      });
      const data = await response.json();
      if (response.ok) {
        setDescription(data.text || data.topic);
        if (data.groupMastery) setGroupMastery(data.groupMastery);
        if (data.followUpAction) setFollowUpAction(data.followUpAction);
        if (Array.isArray(data.developmentalDomain) && data.developmentalDomain.length > 0) {
          setSelectedDomains(data.developmentalDomain);
        }
        if (Array.isArray(data.flaggedChildren) && data.flaggedChildren.length > 0) {
          setFlaggedChildren((prev) => [...prev, ...data.flaggedChildren]);
        }
        setRoughNotes("");
      } else {
        setError(data.detail || data.message || "Failed to generate AI draft.");
      }
    } catch (err) {
      setError("Error connecting to server. Make sure backend is running.");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please write a description of the completed activity.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
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

      const res = await submitActivityCompletion(
        activity._id || activity.id,
        {
          center: userCenter,
          class: userClass,
          description,
          activityDate: new Date().toISOString(),
          activityBank: activity._id || activity.id,
          activityName: activity.activityName || activity.title,
          duration: activity.duration,
          level: activity.level,
          type: activity.type || "activity",
          ageGroup: activity.ageGroup,
          milestone: activity.milestone,
          developmentalDomain: selectedDomains,
          groupMastery,
          flaggedChildren,
          followUpAction,
          dayNumber: activity.dayNumber,
          notes: activity.notes,
          files: fileIds
        }
      );

      onSubmit?.(res?.submission || {
        _id: Date.now().toString(),
        activityBank: activity._id || activity.id,
        activityName: activity.activityName || activity.title,
        dayNumber: activity.dayNumber
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit completion report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`✅ Mark Complete: ${activity.activityName || activity.title}`} onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", borderRadius: 8, fontSize: 12 }}>
            {error}
          </div>
        )}

        {/* Read-Only Pre-populated Metadata Header Card */}
        <div style={{ padding: "12px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{activity.activityName || activity.title}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {activity.dayNumber && <span>Day {activity.dayNumber} · </span>}
              {activity.duration && <span>⏱️ {activity.duration} · </span>}
              <span>Level: {activity.level || "Foundation"}</span>
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 20, background: "#dbeafe", color: "#1d4ed8" }}>
            {activity.type || "Activity"}
          </span>
        </div>

        {/* AI Voice Assistant & Notepad (Toolbar layout - NO overlapping mic) */}
        <div style={{ padding: 14, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#92400e", display: "flex", alignItems: "center", gap: 6 }}>
              ✨ AI Voice & Text Assistant
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <select
                value={speechLanguage}
                onChange={(e) => setSpeechLanguage(e.target.value)}
                style={{ background: "white", border: "1px solid #fbbf24", borderRadius: 6, fontSize: 11, padding: "3px 6px", color: "#92400e", outline: "none" }}
              >
                <option value="en-IN">🇮🇳 English (India)</option>
                <option value="en-US">🌐 English (Global/US)</option>
                <option value="hi-IN">🇮🇳 Hindi (हिंदी)</option>
                <option value="gu-IN">🇮🇳 Gujarati (ગુજરાતી)</option>
                <option value="mr-IN">🇮🇳 Marathi (मराठी)</option>
                <option value="kn-IN">🇮🇳 Kannada (ಕನ್ನಡ)</option>
                <option value="te-IN">🇮🇳 Telugu (తెలుగు)</option>
                <option value="ta-IN">🇮🇳 Tamil (தமிழ்)</option>
              </select>

              <button
                type="button"
                onClick={toggleSpeechRecognition}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: "none",
                  background: isRecording ? "#ef4444" : "#f59e0b", color: "white",
                  fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 4
                }}
                title={isRecording ? "Stop Voice Recording" : "Start Voice Recording"}
              >
                {isRecording ? "⏹️ Recording..." : "🎙️ Voice Mic"}
              </button>

              <button
                type="button"
                onClick={handleDraftWithAI}
                disabled={isDrafting || !roughNotes.trim()}
                style={{
                  border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer",
                  background: roughNotes.trim() ? "#d97706" : "#cbd5e1", color: "white"
                }}
              >
                {isDrafting ? "Structuring..." : "Draft with AI ✨"}
              </button>
            </div>
          </div>

          <textarea
            style={{ ...S.input, height: 60, resize: "none", background: "white", border: "1px solid #fcd34d", fontSize: 12, margin: 0 }}
            value={roughNotes}
            onChange={(e) => setRoughNotes(e.target.value)}
            placeholder={isRecording ? "🎙️ Listening... speak observations now." : "Speak or type rough notes (e.g. 'Raj subtracted correctly with blocks. Priya needs support with numbers.')"}
          />
        </div>

        {/* 🧠 Target Developmental Domains (Multi-Select Chips) */}
        <div>
          <label style={{ ...S.label, marginBottom: 6 }}>Target Developmental Domains (Multi-Select)</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DOMAIN_OPTIONS.map((d) => {
              const isSelected = selectedDomains.includes(d.id);
              return (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => toggleDomainChip(d.id)}
                  style={{
                    padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    background: isSelected ? d.bg : "#ffffff",
                    color: isSelected ? d.color : "#64748b",
                    border: `1.5px solid ${isSelected ? d.border : "#e2e8f0"}`,
                    boxShadow: isSelected ? `0 2px 6px ${d.border}50` : "none",
                    transition: "all 0.15s ease"
                  }}
                >
                  {d.label} {isSelected ? "✓" : "+"}
                </button>
              );
            })}
          </div>
        </div>

        {/* 🏅 Overall Group Mastery Rubric */}
        <div>
          <label style={{ ...S.label, marginBottom: 6 }}>Overall Group Mastery Rubric</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { id: "Emerging", label: "🔴 Emerging", hint: "Class needs practice", bg: "#fef2f2", color: "#991b1b", border: "#fca5a5" },
              { id: "Developing", label: "🟡 Developing", hint: "Moderate understanding", bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
              { id: "Mastered", label: "🟢 Mastered", hint: "Class grasps skill", bg: "#ecfdf5", color: "#065f46", border: "#6ee7b7" }
            ].map((m) => {
              const isSelected = groupMastery === m.id;
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setGroupMastery(m.id)}
                  style={{
                    padding: "10px 6px", borderRadius: 10, textAlign: "center", cursor: "pointer",
                    background: isSelected ? m.bg : "#ffffff",
                    border: `2px solid ${isSelected ? m.border : "#e2e8f0"}`,
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: isSelected ? m.color : "#334155" }}>{m.label}</div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{m.hint}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 🔁 Next Planned Step Tag (followUpAction) */}
        <div>
          <label style={S.label}>Next Planned Step Tag (followUpAction)</label>
          <select
            value={followUpAction}
            onChange={(e) => setFollowUpAction(e.target.value)}
            style={{ ...S.input, height: 38, fontSize: 12, fontWeight: 600 }}
          >
            <option value="proceed_next">🟢 Proceed to Next Activity (Whole class ready)</option>
            <option value="repeat_activity">🟡 Repeat Activity Tomorrow (Whole class needs practice)</option>
            <option value="remediate_subgroup">🔴 Remediate Flagged Subgroup (Class moves on, 1-on-1 for tagged kids)</option>
          </select>
        </div>

        {/* ⚠️ Dual Roster Select & Autocomplete Child Tagger */}
        <div style={{ padding: 14, background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0" }}>
          <label style={{ ...S.label, marginBottom: 6 }}>Tag Exception Children (Lagging or Excelling)</label>

          {/* Quick Select Dropdown */}
          <div style={{ marginBottom: 8 }}>
            <select
              value={selectedChildId}
              onChange={(e) => handleSelectFromSelectDropdown(e.target.value)}
              style={{ ...S.input, height: 36, fontSize: 12, margin: 0, fontWeight: 600 }}
            >
              <option value="">Select Student from Class Roster...</option>
              {roster.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  👦 {getChildName(c)} {c.rollNo ? `(${c.rollNo})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Autocomplete Input with Click-Outside Ref */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative", marginBottom: 8 }} ref={autocompleteRef}>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type="text"
                placeholder="Or type student name manually..."
                value={childSearchQuery}
                onFocus={() => setShowRosterDropdown(true)}
                onChange={(e) => {
                  setChildSearchQuery(e.target.value);
                  setSelectedChildId("");
                  setShowRosterDropdown(true);
                }}
                style={{ ...S.input, height: 36, fontSize: 12, margin: 0 }}
              />

              {/* Floating Autocomplete Suggestions */}
              {showRosterDropdown && filteredRoster.length > 0 && (
                <div
                  style={{
                    position: "absolute", top: 40, left: 0, right: 0, background: "white", border: "1px solid #cbd5e1",
                    borderRadius: 8, boxShadow: "0 8px 16px rgba(0,0,0,0.1)", zIndex: 100, maxHeight: 160, overflowY: "auto"
                  }}
                >
                  {filteredRoster.map((c) => (
                    <div
                      key={c._id || c.id}
                      onClick={() => handleSelectRosterChild(c)}
                      style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontWeight: 600, color: "#1e293b" }}
                    >
                      👦 {getChildName(c)} {c.rollNo ? `(${c.rollNo})` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <select
              value={childStatus}
              onChange={(e) => setChildStatus(e.target.value)}
              style={{ ...S.input, height: 36, width: 140, fontSize: 11, fontWeight: 700, margin: 0 }}
            >
              <option value="needs_support">🔴 Needs Support</option>
              <option value="advanced">🟢 Advanced / Excelling</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Observation note (e.g. Needs help with counting)..."
              value={childNote}
              onChange={(e) => setChildNote(e.target.value)}
              style={{ ...S.input, height: 36, flex: 1, fontSize: 12, margin: 0 }}
            />
            <button
              type="button"
              onClick={handleAddFlaggedChild}
              style={{ padding: "8px 14px", borderRadius: 8, background: "#0f172a", color: "white", fontSize: 11, fontWeight: 800, border: "none", cursor: "pointer" }}
            >
              + Tag Child
            </button>
          </div>

          {/* List of Flagged Children Badges */}
          {flaggedChildren.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {flaggedChildren.map((f, i) => (
                <span
                  key={i}
                  style={{
                    padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
                    background: f.status === "advanced" ? "#d1fae5" : "#fee2e2",
                    color: f.status === "advanced" ? "#065f46" : "#991b1b",
                    border: `1px solid ${f.status === "advanced" ? "#6ee7b7" : "#fca5a5"}`
                  }}
                >
                  <span>{f.status === "advanced" ? "🌟" : "⚠️"} {f.childName} ({f.status === "advanced" ? "Advanced" : "Needs Help"}{f.note ? `: ${f.note}` : ""})</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFlaggedChild(i)}
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", fontWeight: 800, fontSize: 12 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Observation Description Summary */}
        <div>
          <label style={S.label}>Activity Description / Summary *</label>
          <textarea
            style={{ ...S.input, height: 70, resize: "none", margin: 0 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the completed activity, student observations, and key takeaways..."
            required
          />
        </div>

        {/* Proof Photo Uploads (Optional) */}
        <div>
          <label style={{ ...S.label, marginBottom: 4 }}>Upload Activity Photos (Optional)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setPhotos(Array.from(e.target.files))}
            style={{ width: "100%", fontSize: 11 }}
          />
          {photos.length > 0 && <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>📷 {photos.length} photo(s) selected</div>}
        </div>

        {/* Supporting Documents Uploads (Optional) */}
        <div>
          <label style={{ ...S.label, marginBottom: 4 }}>Upload Documents (Optional)</label>
          <input
            type="file"
            multiple
            onChange={(e) => setDocFiles(Array.from(e.target.files))}
            style={{ width: "100%", fontSize: 11 }}
          />
          {docFiles.length > 0 && <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>📎 {docFiles.length} document(s) selected</div>}
        </div>

        <button type="submit" disabled={submitting} style={{ ...S.primaryBtn, width: "100%", padding: 12, fontSize: 13, fontWeight: 800, marginTop: 6 }}>
          {submitting ? "Submitting Report..." : "📤 Submit Completion Report"}
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
                    href={`${API_BASE_URL}${f.publicUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#fff", border: "1px solid #10b981", borderRadius: 6, fontSize: 12, color: "#10b981", textDecoration: "none", fontWeight: 600 }}
                  >
                    ⬇️ Download {f.originalName || "Attachment"}
                  </a>
                  {isImage && (
                    <div style={{ marginTop: 8 }}>
                      <img src={`${API_BASE_URL}${f.publicUrl}`} alt={f.originalName} style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: 8, border: "1px solid #e5e7eb" }} />
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

/* ── Formats raw markdown report text into styled bullet lists ── */
function formatReportText(text) {
  if (!text) return null;

  // Split by specific bold headings (**Heading**:)
  const sections = text.split(/\*\*(Activity Summary|Student Observations|Next Steps & Action Plan)\*\*:/g);

  if (sections.length < 2) {
    return <p style={{ fontSize: "12.5px", color: "#374151", whiteSpace: "pre-line", margin: 0, lineHeight: "1.5" }}>{text}</p>;
  }

  const elements = [];
  for (let i = 1; i < sections.length; i += 2) {
    const heading = sections[i];
    const content = sections[i + 1] || "";

    // Split by newlines, dashes, or asterisks followed by spaces
    const bullets = content
      .split(/(?:\r?\n)?\s*[-*]\s+/)
      .map(b => b.trim())
      .filter(Boolean);

    elements.push(
      <div key={heading} style={{ marginBottom: 12 }}>
        <h6 style={{ fontSize: "11px", fontWeight: "800", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>
            {heading === "Activity Summary" && "📋"}
            {heading === "Student Observations" && "🔍"}
            {heading === "Next Steps & Action Plan" && "🚀"}
          </span>
          <span>{heading}</span>
        </h6>
        {bullets.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: "16px", listStyleType: "disc" }}>
            {bullets.map((bullet, idx) => (
              <li key={idx} style={{ fontSize: "12px", color: "#374151", lineHeight: "1.5", marginBottom: 4 }}>
                {bullet}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: "12.5px", color: "#374151", margin: 0, whiteSpace: "pre-line", lineHeight: "1.5" }}>{content.trim()}</p>
        )}
      </div>
    );
  }

  return <div>{elements}</div>;
}

/* ── Main Component ── */
export default function TrainingAndClassroomManager({ user }) {
  const [activeSubTab, setActiveSubTab] = useState("courses");
  const [reports, setReports] = useState([]);
  const [reportTopic, setReportTopic] = useState("");
  const [reportText, setReportText] = useState("");
  const [tabRoughNotes, setTabRoughNotes] = useState("");
  const [isTabDrafting, setIsTabDrafting] = useState(false);
  const [reportError, setReportError] = useState("");

  const [activeRecordingField, setActiveRecordingField] = useState(null); // 'roughNotes' | 'topic' | 'text' | null
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const recognitionRef = useRef(null);
  const activeFieldRef = useRef(null);
  const nextFieldRef = useRef(null);

  // Keep activeFieldRef in sync with activeRecordingField
  useEffect(() => {
    activeFieldRef.current = activeRecordingField;
  }, [activeRecordingField]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = speechLanguage;

      rec.onresult = (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          const field = activeFieldRef.current;
          if (field === "roughNotes") {
            setTabRoughNotes((prev) => {
              const cleaned = prev.trim();
              return cleaned ? cleaned + " " + finalTranscript.trim() : finalTranscript.trim();
            });
          } else if (field === "topic") {
            setReportTopic((prev) => {
              const cleaned = prev.trim();
              return cleaned ? cleaned + " " + finalTranscript.trim() : finalTranscript.trim();
            });
          } else if (field === "text") {
            setReportText((prev) => {
              const cleaned = prev.trim();
              return cleaned ? cleaned + " " + finalTranscript.trim() : finalTranscript.trim();
            });
          }
        }
      };

      rec.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setReportError("Microphone permission denied. Please allow microphone access in your browser settings.");
        } else {
          setReportError(`Speech recognition error: ${event.error}`);
        }
        setActiveRecordingField(null);
      };

      rec.onend = () => {
        const nextField = nextFieldRef.current;
        if (nextField) {
          nextFieldRef.current = null;
          setActiveRecordingField(nextField);
          try {
            rec.lang = speechLanguage;
            rec.start();
          } catch (err) {
            console.error("Speech recognition restart error:", err);
            setActiveRecordingField(null);
          }
        } else {
          setActiveRecordingField(null);
        }
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [speechLanguage]);

  const handleToggleSpeech = (field) => {
    if (!recognitionRef.current) {
      setReportError("Speech recognition is not supported in this browser. Please try Google Chrome.");
      return;
    }

    if (activeRecordingField === field) {
      recognitionRef.current.stop();
    } else {
      setReportError("");
      if (activeRecordingField) {
        nextFieldRef.current = field;
        recognitionRef.current.stop();
      } else {
        setActiveRecordingField(field);
        try {
          recognitionRef.current.lang = speechLanguage;
          recognitionRef.current.start();
        } catch (err) {
          console.error("Speech recognition start error:", err);
          setActiveRecordingField(null);
        }
      }
    }
  };

  const renderMicButton = (field) => {
    const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const isRecording = activeRecordingField === field;

    if (!isSupported) {
      return (
        <button
          type="button"
          title="Speech-to-text not supported in this browser"
          style={{
            position: "absolute",
            right: "12px",
            top: field === "topic" ? "50%" : "12px",
            transform: field === "topic" ? "translateY(-50%)" : "none",
            background: "none",
            border: "none",
            cursor: "not-allowed",
            opacity: 0.3,
            fontSize: "15px",
            padding: 4,
            zIndex: 5
          }}
          disabled
        >
          🔇
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => handleToggleSpeech(field)}
        title={isRecording ? "Listening... Click to stop" : "Click to speak / write with voice"}
        className={isRecording ? "mic-pulsing" : ""}
        style={{
          position: "absolute",
          right: "12px",
          top: field === "topic" ? "50%" : "12px",
          transform: field === "topic" ? "translateY(-50%)" : "none",
          background: isRecording ? "#ef4444" : "none",
          color: isRecording ? "white" : "#64748b",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          fontSize: "15px",
          width: "28px",
          height: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          zIndex: 5
        }}
      >
        {isRecording ? "🔴" : "🎙️"}
      </button>
    );
  };

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

  const storageKeyPrefix = `spaceece_teacher_${user?.email || 'default'}`;

  const loadData = async () => {
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
      const subs = submissionRes.submissions || submissionRes.activities || [];
      setSubmissions(subs);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const savedReps = localStorage.getItem(`${storageKeyPrefix}_reports`);
    if (savedReps) {
      setReports(JSON.parse(savedReps));
    } else {
      setReports([{ id: 1, date: "05/06/2026", topic: "Sensory Learning Integration", text: "Children adapted beautifully to sensory bins. High engagement noted with basic phonics." }]);
    }
  }, [storageKeyPrefix]);

  const handleAddReport = (e) => {
    e.preventDefault();
    if (!reportTopic.trim() || !reportText.trim()) return;
    const updatedReps = [
      {
        id: Date.now(),
        date: new Date().toLocaleDateString("en-IN"),
        topic: reportTopic.trim(),
        text: reportText.trim()
      },
      ...reports
    ];
    setReports(updatedReps);
    localStorage.setItem(`${storageKeyPrefix}_reports`, JSON.stringify(updatedReps));
    setReportTopic("");
    setReportText("");
    setToast({ msg: "Teaching notes and report saved successfully!", type: "success" });
  };

  const handleDraftWithAIForTab = async () => {
    if (!tabRoughNotes.trim()) return;
    setIsTabDrafting(true);
    setReportError("");
    try {
      const response = await fetch("http://localhost:5000/api/teacher/reports/draft-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("spaceece_auth_token")}`
        },
        body: JSON.stringify({ roughNotes: tabRoughNotes })
      });
      const data = await response.json();
      if (response.ok) {
        setReportTopic(data.topic);
        setReportText(data.text);
        setTabRoughNotes("");
      } else {
        setReportError(data.detail || data.message || "Failed to generate AI draft.");
      }
    } catch (err) {
      setReportError(err.message || "Error connecting to server. Make sure the backend is running.");
    } finally {
      setIsTabDrafting(false);
    }
  };

  // Check if a specific activity has been submitted as completed
  const isActivityCompleted = (activity) => {
    const activityId = String(activity._id || activity.activityId || activity.id || "");
    return submissions.some(sub => {
      const subBankId = String(sub.activityBank?._id || sub.activityBank?.id || sub.activityBank || "");
      const subActName = String(sub.activityName || sub.title || "").trim().toLowerCase();
      const actName = String(activity.activityName || activity.title || "").trim().toLowerCase();

      const matchId = Boolean(subBankId && activityId && subBankId === activityId);
      const matchName = Boolean(actName && subActName && actName === subActName);

      return matchId || matchName;
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
    setLessonAssignments(prev => prev.map(l => (l._id === assignmentId || l.id === assignmentId ? { ...l, status: "completed" } : l)));
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
          onSubmit={(newSub) => {
            setToast({ msg: "Activity completion report submitted for admin review!", type: "success" });
            if (newSub) {
              setSubmissions(prev => [newSub, ...prev]);
            }
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
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={S.pageTitle}>Training & Classroom Portal</h1>
          <p style={S.pageSub}>Access assigned courses, monitor training pathways, upload activities, and submit teaching notes.</p>
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
