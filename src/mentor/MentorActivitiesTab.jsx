import React, { useState, useEffect, useMemo, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const STATUS_META = {
  pending: { bg: "#fef3c7", color: "#92400e", label: "Pending Review", tint: "#f59e0b", badgeBg: "#fffbeb" },
  approved: { bg: "#d1fae5", color: "#065f46", label: "Approved", tint: "#10b981", badgeBg: "#ecfdf5" },
  flagged: { bg: "#ffedd5", color: "#c2410c", label: "Needs Rework", tint: "#f97316", badgeBg: "#fff7ed" },
  rejected: { bg: "#fee2e2", color: "#dc2626", label: "Rejected", tint: "#ef4444", badgeBg: "#fef2f2" },
};

function formatAge(dateString) {
  if (!dateString) return "";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function MentorActivitiesTab({ user, setToast }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Sorting State
  const [statusTab, setStatusTab] = useState("pending"); // "pending" | "approved" | "flagged" | "rejected" | "all"
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("oldest"); // "oldest" | "newest" | "fellow"

  // Selection for Batch Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Side Drawer Review Panel State
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("spaceece_auth_token");

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/activities?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error("Failed to fetch activities", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleSeedSamples = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/activities/seed-samples`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setToast?.({ msg: "Seeded 6 sample fellow submissions into queue!", type: "success" });
        await fetchActivities();
      }
    } catch (err) {
      setToast?.({ msg: "Failed to seed samples", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Filtered & Sorted Submissions
  const filteredSubmissions = useMemo(() => {
    return activities.filter((act) => {
      // Status Filter
      if (statusTab !== "all" && act.status !== statusTab) {
        if (statusTab === "reviewed" && act.status === "pending") return false;
        if (statusTab !== "reviewed" && act.status !== statusTab) return false;
      }

      // Search Filter
      const fellowName = act.teacher?.name || "";
      const title = act.activityName || "";
      const desc = act.description || "";
      const matchesSearch = !search || fellowName.toLowerCase().includes(search.toLowerCase()) || title.toLowerCase().includes(search.toLowerCase()) || desc.toLowerCase().includes(search.toLowerCase());

      // Module Filter
      const matchesModule = moduleFilter === "all" || (desc || "").includes(moduleFilter);

      // Type Filter
      const matchesType = typeFilter === "all" || (typeFilter === "photo" && (act.files || []).some(f => f.type === "image" || (f.url || "").match(/\.(jpg|jpeg|png)$/i))) || (typeFilter === "document" && (act.files || []).some(f => f.type === "pdf" || (f.url || "").match(/\.pdf$/i)));

      return matchesSearch && matchesModule && matchesType;
    }).sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.activityDate || a.createdAt) - new Date(b.activityDate || b.createdAt);
      if (sortBy === "newest") return new Date(b.activityDate || b.createdAt) - new Date(a.activityDate || a.createdAt);
      if (sortBy === "fellow") return (a.teacher?.name || "").localeCompare(b.teacher?.name || "");
      return 0;
    });
  }, [activities, statusTab, search, moduleFilter, typeFilter, sortBy]);

  // Counts
  const counts = useMemo(() => {
    return {
      pending: activities.filter((a) => a.status === "pending").length,
      approved: activities.filter((a) => a.status === "approved").length,
      flagged: activities.filter((a) => a.status === "flagged").length,
      rejected: activities.filter((a) => a.status === "rejected").length,
      total: activities.length,
    };
  }, [activities]);

  // Handle Review Submission Action
  const handleReviewAction = async (targetStatus, customFeedback = null) => {
    if (!selectedActivity) return;
    const textToSubmit = customFeedback !== null ? customFeedback : feedbackText;

    if (["flagged", "rejected"].includes(targetStatus) && !textToSubmit.trim()) {
      alert(`Feedback text is required when setting status to ${targetStatus === "flagged" ? "Needs Rework" : "Rejected"}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/activities/${selectedActivity._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: targetStatus,
          adminComments: textToSubmit,
          rating: rating
        }),
      });

      if (res.ok) {
        setToast?.({ msg: `Submission ${targetStatus === "approved" ? "Approved ✓" : targetStatus === "flagged" ? "Flagged for Rework ⟳" : "Rejected ✕"}`, type: "success" });
        await fetchActivities();

        // Move to next pending submission in drawer automatically
        const currentIndex = filteredSubmissions.findIndex(a => a._id === selectedActivity._id);
        if (currentIndex !== -1 && currentIndex < filteredSubmissions.length - 1) {
          openDrawer(filteredSubmissions[currentIndex + 1]);
        } else {
          setSelectedActivity(null);
        }
      }
    } catch (err) {
      setToast?.({ msg: "Failed to submit review", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Bulk approve ${selectedIds.length} selected submissions?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/activities/bulk-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ submissionIds: selectedIds, status: "approved", adminComments: "Bulk approved by mentor" }),
      });
      if (res.ok) {
        setToast?.({ msg: `Bulk approved ${selectedIds.length} submissions!`, type: "success" });
        setSelectedIds([]);
        await fetchActivities();
      }
    } catch (err) {
      setToast?.({ msg: "Failed bulk approve", type: "error" });
    }
  };

  const openDrawer = (act) => {
    setSelectedActivity(act);
    setFeedbackText(act.adminComments || "");
    setRating(act.rating || 5);
  };

  // Keyboard Shortcuts Listener inside Review Drawer
  const handleKeyDown = useCallback((e) => {
    if (!selectedActivity) return;
    // Don't trigger if typing inside feedback textarea
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

    if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      handleReviewAction("approved");
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      handleReviewAction("flagged");
    } else if (e.key === "x" || e.key === "X") {
      e.preventDefault();
      handleReviewAction("rejected");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const idx = filteredSubmissions.findIndex(a => a._id === selectedActivity._id);
      if (idx !== -1 && idx < filteredSubmissions.length - 1) openDrawer(filteredSubmissions[idx + 1]);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const idx = filteredSubmissions.findIndex(a => a._id === selectedActivity._id);
      if (idx > 0) openDrawer(filteredSubmissions[idx - 1]);
    }
  }, [selectedActivity, filteredSubmissions, feedbackText, rating]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const activeIndex = selectedActivity ? filteredSubmissions.findIndex(a => a._id === selectedActivity._id) : -1;

  return (
    <div style={{ animation: "fadeIn 0.3s ease", color: "#0f172a", fontFamily: "inherit" }}>
      
      {/* Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
              Mentor Inbox
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>Teacher Activity Submissions</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Review, grade, and provide actionable feedback on teacher/fellow deliverables.</p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkApprove}
              style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#059669", color: "#ffffff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              ⚡ Bulk Approve ({selectedIds.length})
            </button>
          )}
          <button 
            onClick={handleSeedSamples}
            style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            🌱 Seed Sample Submissions
          </button>
        </div>
      </div>

      {/* Top Interactive Stat Cards Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { id: "pending", label: "Pending Review", val: counts.pending, color: "#d97706", bg: "#fffbeb", hint: "Action required" },
          { id: "approved", label: "Approved", val: counts.approved, color: "#059669", bg: "#ecfdf5", hint: "Passed evaluation" },
          { id: "flagged", label: "Needs Rework", val: counts.flagged, color: "#ea580c", bg: "#fff7ed", hint: "Revision requested" },
          { id: "rejected", label: "Rejected", val: counts.rejected, color: "#dc2626", bg: "#fef2f2", hint: "Not accepted" },
        ].map(st => (
          <div
            key={st.id}
            onClick={() => setStatusTab(st.id)}
            style={{
              background: "#ffffff",
              padding: "16px 18px",
              borderRadius: 12,
              border: statusTab === st.id ? `2px solid ${st.color}` : "1px solid #e2e8f0",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{st.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: st.bg, color: st.color, padding: "2px 6px", borderRadius: 4 }}>● {st.hint}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{st.val}</div>
          </div>
        ))}
      </div>

      {/* Filter & Search Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 20, background: "#ffffff", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{ position: "relative", width: 260 }}>
            <span style={{ position: "absolute", left: 10, top: 8, color: "#94a3b8", fontSize: 14 }}>🔍</span>
            <input 
              type="text" 
              placeholder="Search by fellow or activity..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "7px 10px 7px 32px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Module Filter */}
          <select 
            value={moduleFilter} 
            onChange={e => setModuleFilter(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 600, outline: "none" }}
          >
            <option value="all">All Curriculum Modules</option>
            <option value="Semester 1">Semester 1 Modules</option>
            <option value="Semester 2">Semester 2 Modules</option>
            <option value="Semester 3">Semester 3 Modules</option>
            <option value="Semester 4">Semester 4 Modules</option>
          </select>

          {/* Type Filter */}
          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 600, outline: "none" }}
          >
            <option value="all">All Submission Types</option>
            <option value="document">📄 Documents / PDFs</option>
            <option value="photo">📷 Photos / TLM Media</option>
          </select>
        </div>

        {/* Sort & Select All */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Sort:</span>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 600, outline: "none" }}
          >
            <option value="oldest">Oldest First (Queue Priority)</option>
            <option value="newest">Newest First</option>
            <option value="fellow">Fellow Name</option>
          </select>
        </div>
      </div>

      {/* Submissions List Queue */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>Loading activity submission queue...</div>
      ) : filteredSubmissions.length === 0 ? (
        <div style={{ background: "#ffffff", border: "1px dashed #cbd5e1", borderRadius: 12, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
          <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>No Submissions Found</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>Your review queue is clear for this filter, or no submissions have been filed yet.</p>
          <button onClick={handleSeedSamples} style={{ padding: "9px 16px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            🌱 Seed Sample Submissions
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredSubmissions.map((act) => {
            const meta = STATUS_META[act.status] || STATUS_META.pending;
            const ageStr = formatAge(act.activityDate || act.createdAt);
            const isAging = act.status === "pending" && (Date.now() - new Date(act.activityDate || act.createdAt).getTime()) > 48 * 3600 * 1000;
            const isSelected = selectedIds.includes(act._id);

            // Extract linked module if present in description
            const modMatch = (act.description || "").match(/\[Linked Curriculum Module:\s*([^\]]+)\]/);
            const moduleName = modMatch ? modMatch[1] : "General ECCE Deliverable";
            const cleanDesc = (act.description || "").replace(/\[Linked Curriculum Module:[^\]]+\]/, "").trim();

            return (
              <div
                key={act._id}
                style={{
                  background: "#ffffff",
                  borderRadius: 10,
                  border: "1px solid",
                  borderColor: selectedActivity?._id === act._id ? "#2563eb" : "#e2e8f0",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
                  {/* Select Checkbox */}
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSelectedIds(prev => isSelected ? prev.filter(id => id !== act._id) : [...prev, act._id]);
                    }}
                    style={{ cursor: "pointer" }}
                  />

                  {/* Fellow Avatar */}
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#0f172a", fontSize: 15, border: "1px solid #cbd5e1" }}>
                    {(act.teacher?.name || "F")[0].toUpperCase()}
                  </div>

                  {/* Title & Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{act.teacher?.name || "Fellow"}</span>
                      <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                        {moduleName}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{act.activityName}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, display: "flex", gap: 12 }}>
                      <span>Submitted {ageStr}</span>
                      {isAging && <span style={{ color: "#ef4444", fontWeight: 800 }}>⚠️ Aging (&gt;48h)</span>}
                      {(act.files || []).length > 0 && <span>📎 {act.files.length} file(s) attached</span>}
                    </div>
                  </div>
                </div>

                {/* Status & Review CTA */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, background: meta.badgeBg, color: meta.color, padding: "4px 10px", borderRadius: 6, border: `1px solid ${meta.tint}40` }}>
                    ● {meta.label}
                  </span>

                  <button
                    onClick={() => openDrawer(act)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 6,
                      border: "none",
                      background: "#0f172a",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Review →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* SIDE-DRAWER REVIEW PANEL (RECOMMENDED QUEUE TRIAGE INBOX)  */}
      {/* ========================================================= */}
      {selectedActivity && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "flex-end", zIndex: 1000, animation: "fadeIn 0.2s ease" }}>
          <div 
            style={{ 
              width: 540, 
              background: "#ffffff", 
              height: "100%", 
              boxShadow: "-8px 0 25px rgba(0,0,0,0.15)", 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "space-between",
              animation: "slideInRight 0.25s ease"
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>
                    {(selectedActivity.teacher?.name || "F")[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{selectedActivity.teacher?.name}</h3>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{selectedActivity.teacher?.email}</div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedActivity(null)}
                  style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginTop: 10, padding: 10, background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", marginBottom: 2 }}>
                  Activity Deliverable
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{selectedActivity.activityName}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  Submitted {formatAge(selectedActivity.activityDate || selectedActivity.createdAt)}
                </div>
              </div>
            </div>

            {/* Drawer Content Body */}
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              
              {/* Submission Text / Description */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                  Fellow Submission Content & Reflection
                </label>
                <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#334155", lineHeight: 1.5, whitespace: "pre-wrap" }}>
                  {(selectedActivity.description || "").replace(/\[Linked Curriculum Module:[^\]]+\]/, "").trim() || "No text description provided."}
                </div>
              </div>

              {/* Attached Files & Photo Previews */}
              {(selectedActivity.files || []).length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>
                    Attached Media & File Assets ({selectedActivity.files.length})
                  </label>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedActivity.files.map((file, idx) => (
                      <div key={idx} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10 }}>
                        {file.type === "image" || (file.url || "").match(/\.(jpg|jpeg|png)$/i) ? (
                          <div>
                            <img src={file.url} alt={file.name} style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 6, marginBottom: 6 }} />
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>📷 {file.name}</div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 16 }}>📄</span>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{file.name || "Attachment"}</div>
                                <div style={{ fontSize: 10, color: "#64748b" }}>Document file</div>
                              </div>
                            </div>
                            <a 
                              href={file.url} 
                              download 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ padding: "4px 10px", background: "#f1f5f9", color: "#0f172a", borderRadius: 4, fontSize: 11, fontWeight: 700, textDecoration: "none" }}
                            >
                              ⬇️ Download / View
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback Input Section */}
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: 16, borderRadius: 10, marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#b45309", marginBottom: 6 }}>
                  Mentor Remarks & Feedback *
                </label>
                <textarea 
                  rows={3}
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Provide constructive feedback for the fellow... (Required for Needs Rework / Reject)"
                  style={{ width: "100%", padding: 10, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#78350f" }}>Score Rating:</span>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", opacity: star <= rating ? 1 : 0.3 }}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyboard Shortcuts Hint */}
              <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", background: "#f8fafc", padding: "6px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                ⌨️ Shortcuts: Press <strong>A</strong> (Approve), <strong>R</strong> (Needs Rework), <strong>X</strong> (Reject), <strong>→</strong> (Next), <strong>←</strong> (Prev)
              </div>
            </div>

            {/* Drawer Footer Actions & Prev/Next Queue Navigation */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#ffffff" }}>
              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <button 
                  disabled={submitting}
                  onClick={() => handleReviewAction("approved")}
                  style={{ flex: 1, padding: "10px", background: "#059669", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                >
                  ✓ Approve (A)
                </button>
                <button 
                  disabled={submitting}
                  onClick={() => handleReviewAction("flagged")}
                  style={{ flex: 1, padding: "10px", background: "#ea580c", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                >
                  ⟳ Rework (R)
                </button>
                <button 
                  disabled={submitting}
                  onClick={() => handleReviewAction("rejected")}
                  style={{ padding: "10px 14px", background: "#ef4444", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                >
                  ✕ Reject (X)
                </button>
              </div>

              {/* Queue Navigation Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#64748b" }}>
                <button 
                  disabled={activeIndex <= 0}
                  onClick={() => openDrawer(filteredSubmissions[activeIndex - 1])}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: activeIndex > 0 ? "pointer" : "not-allowed", opacity: activeIndex > 0 ? 1 : 0.4 }}
                >
                  ← Prev
                </button>

                <span>Submission {activeIndex + 1} of {filteredSubmissions.length}</span>

                <button 
                  disabled={activeIndex >= filteredSubmissions.length - 1}
                  onClick={() => openDrawer(filteredSubmissions[activeIndex + 1])}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: activeIndex < filteredSubmissions.length - 1 ? "pointer" : "not-allowed", opacity: activeIndex < filteredSubmissions.length - 1 ? 1 : 0.4 }}
                >
                  Next →
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}