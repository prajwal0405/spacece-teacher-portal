import React, { useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function CurriculumTab({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [allPhases, setAllPhases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active expanded phase state
  const [activePhaseId, setActivePhaseId] = useState(null);

  // Submit Activity Modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitTarget, setSubmitTarget] = useState(null); // { assignmentId, phaseId, moduleName, deliverableTitle, itemKey }
  const [activityTitle, setActivityTitle] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem("spaceece_auth_token");

  useEffect(() => {
    fetchMyCurriculum();
  }, []);

  const fetchMyCurriculum = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/my-curriculum`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const assigns = data.assignments || [];
        const phases = data.allPhases || [];
        setAssignments(assigns);
        setAllPhases(phases);

        if (assigns.length > 0 && assigns[0].activePhase) {
          setActivePhaseId(assigns[0].activePhase._id);
        } else if (phases.length > 0) {
          setActivePhaseId(phases[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch my curriculum", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (assignmentId, phaseId, moduleIndex, itemKey, title) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/progress/toggle-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assignmentId, phaseId, moduleIndex, itemKey, title })
      });
      if (res.ok) {
        const data = await res.json();
        // Update local assignment state with new progressPercent & completedItems
        setAssignments(prev => prev.map(a => a._id === assignmentId ? { ...a, ...data.assignment, progressPercent: data.progressPercent } : a));
      }
    } catch (err) {
      console.error("Failed to toggle item completion", err);
    }
  };

  const handleOpenSubmitModal = (assignmentId, phaseId, curriculumName, moduleName, deliverableTitle, itemKey) => {
    setSubmitTarget({ assignmentId, phaseId, curriculumName, moduleName, deliverableTitle, itemKey });
    setActivityTitle(`${moduleName}: ${deliverableTitle}`);
    setDescriptionText("");
    setAttachedFiles([]);
    setSubmitModalOpen(true);
  };

  const handleSubmitActivityWork = async (e) => {
    e.preventDefault();
    if (!descriptionText.trim() || !activityTitle.trim() || !submitTarget) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/submit-activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          assignmentId: submitTarget.assignmentId,
          phaseId: submitTarget.phaseId,
          curriculumName: submitTarget.curriculumName,
          moduleName: submitTarget.moduleName,
          activityTitle: activityTitle.trim(),
          description: descriptionText.trim(),
          files: attachedFiles,
          itemKey: submitTarget.itemKey
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert("🎉 Activity submitted successfully to your Mentor for review!");
        setSubmitModalOpen(false);
        await fetchMyCurriculum();
      }
    } catch (err) {
      alert("Failed to submit activity. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 14, fontWeight: 700 }}>
        🔄 Loading My Curriculum...
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div style={{ background: "#ffffff", borderRadius: 16, border: "1px dashed #cbd5e1", padding: 48, textAlign: "center", margin: 20 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>📚</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>No Curriculum Assigned Yet</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b", maxWidth: 460, marginInline: "auto" }}>
          Your assigned Mentor has not published or assigned a specific curriculum plan to your profile yet. Once assigned, your interactive LMS modules and deliverables will appear right here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease", color: "#0f172a", fontFamily: "inherit" }}>
      
      {/* Top Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
              LMS Learning Workspace
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>📚 My Curriculum</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Interactive learning modules, practical activities, and field deliverables assigned by your mentor.</p>
        </div>
      </div>

      {assignments.map((assignment) => {
        const plan = assignment.plan || {};
        const mentorName = assignment.assignedBy?.name || user?.assignedMentor?.name || "Assigned Mentor";
        const pct = assignment.progressPercent || 0;
        const completedItemsMap = new Set((assignment.completedItems || []).map(i => i.itemKey));

        const planPhases = allPhases.filter(p => String(p.plan) === String(plan._id));
        const activePhaseObj = planPhases.find(p => p._id === activePhaseId) || planPhases[0] || {};

        return (
          <div key={assignment._id} style={{ marginBottom: 32 }}>
            
            {/* LMS Overview Card */}
            <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: 16, padding: 24, color: "#ffffff", marginBottom: 24, boxShadow: "0 10px 25px -5px rgba(15,23,42,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, background: "rgba(255,255,255,0.15)", color: "#f8fafc", padding: "3px 10px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      🎓 {plan.durationType === "2yr" ? "2-Year Framework" : "1-Year Framework"}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, background: pct >= 100 ? "#10b981" : "#3b82f6", color: "#ffffff", padding: "3px 10px", borderRadius: 6 }}>
                      {pct >= 100 ? "✓ Completed" : "● In Progress"}
                    </span>
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.5px" }}>{plan.title || "ECCE Fellowship Curriculum"}</h2>
                  <div style={{ fontSize: 13, color: "#94a3b8", display: "flex", gap: 16, alignItems: "center" }}>
                    <span>👨‍🏫 Assigned by: <strong style={{ color: "#ffffff" }}>{mentorName}</strong></span>
                    <span>📅 Assigned Date: {new Date(assignment.assignedAt || assignment.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                    {assignment.dueDate && <span style={{ color: "#f59e0b" }}>⏱ Due: {new Date(assignment.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>}
                  </div>
                </div>

                <div style={{ textAlign: "right", background: "rgba(255,255,255,0.07)", padding: "12px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Overall Progress</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#38bdf8", lineHeight: 1.1, marginTop: 2 }}>{pct}%</div>
                  <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 2 }}>{(assignment.completedItems || []).length} items completed</div>
                </div>
              </div>

              {/* Real-time Progress Bar */}
              <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#10b981" : "linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)", borderRadius: 10, transition: "width 0.4s ease" }} />
              </div>
            </div>

            {/* Semester Tabs / Phases Bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
              {planPhases.map((phase) => {
                const isSelected = phase._id === activePhaseId;
                return (
                  <button
                    key={phase._id}
                    onClick={() => setActivePhaseId(phase._id)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 10,
                      border: "1px solid",
                      borderColor: isSelected ? "#0f172a" : "#cbd5e1",
                      background: isSelected ? "#0f172a" : "#ffffff",
                      color: isSelected ? "#ffffff" : "#334155",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 4px 12px rgba(15,23,42,0.15)" : "none"
                    }}
                  >
                    <span>{isSelected ? "📖" : "📁"}</span>
                    <span>{phase.semester}: {phase.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Phase Content View */}
            {activePhaseObj && (
              <div style={{ background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Phase Overview</span>
                    <h3 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{activePhaseObj.semester} – {activePhaseObj.title}</h3>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(activePhaseObj.skillThemes || []).map((theme, i) => (
                      <span key={i} style={{ fontSize: 11, fontWeight: 700, background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: 4 }}>
                        🎯 {theme}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Modules & Lessons Breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {(activePhaseObj.modules || []).length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 13 }}>
                      No specific modules configured for this semester phase.
                    </div>
                  ) : (
                    (activePhaseObj.modules || []).map((mod, modIdx) => {
                      const modDeliverables = mod.deliverables || [];
                      const modAssessments = mod.assessmentMethods || [];
                      const modDelivery = mod.modeOfDelivery || [];

                      return (
                        <div key={modIdx} style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: 18 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                                Module {modIdx + 1} ({mod.durationWeeks || 4} Weeks Duration)
                              </div>
                              <h4 style={{ margin: "2px 0 6px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{mod.title}</h4>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {modDelivery.map((mode, i) => (
                                  <span key={i} style={{ fontSize: 10, fontWeight: 700, background: "#ffffff", color: "#0284c7", padding: "2px 6px", borderRadius: 4, border: "1px solid #bae6fd" }}>
                                    💡 Mode: {mode}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Deliverables & Practical Activities Checklist */}
                          {modDeliverables.length > 0 && (
                            <div style={{ marginTop: 14, background: "#ffffff", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                                📝 Required Deliverables & Field Activities
                              </div>
                              
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {modDeliverables.map((deliv, delivIdx) => {
                                  const itemKey = `${activePhaseObj._id}_mod${modIdx}_deliv${delivIdx}`;
                                  const isDone = completedItemsMap.has(itemKey);

                                  return (
                                    <div 
                                      key={delivIdx}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "8px 12px",
                                        borderRadius: 6,
                                        background: isDone ? "#ecfdf5" : "#f8fafc",
                                        border: "1px solid",
                                        borderColor: isDone ? "#a7f3d0" : "#e2e8f0"
                                      }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                                        <button
                                          onClick={() => handleToggleItem(assignment._id, activePhaseObj._id, modIdx, itemKey, deliv)}
                                          style={{
                                            width: 22, height: 22, borderRadius: 6, border: isDone ? "none" : "2px solid #cbd5e1",
                                            background: isDone ? "#059669" : "#ffffff", color: "#ffffff", fontWeight: 800, fontSize: 12,
                                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                                          }}
                                        >
                                          {isDone ? "✓" : ""}
                                        </button>

                                        <span style={{ fontSize: 13, fontWeight: 700, color: isDone ? "#065f46" : "#1e293b", textDecoration: isDone ? "line-through" : "none" }}>
                                          {isDone ? "✓" : "→"} {deliv}
                                        </span>
                                      </div>

                                      <div style={{ display: "flex", gap: 8 }}>
                                        <button
                                          onClick={() => handleOpenSubmitModal(assignment._id, activePhaseObj._id, plan.title, mod.title, deliv, itemKey)}
                                          style={{
                                            padding: "5px 12px",
                                            borderRadius: 6,
                                            border: "none",
                                            background: "#0f172a",
                                            color: "#ffffff",
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: "pointer"
                                          }}
                                        >
                                          📤 Submit Work →
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Evaluation & Assessment Guidelines */}
                          {modAssessments.length > 0 && (
                            <div style={{ marginTop: 10, fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontWeight: 800, color: "#475569" }}>Evaluation Standard:</span>
                              {modAssessments.map((ass, i) => (
                                <span key={i} style={{ background: "#ffffff", padding: "2px 6px", borderRadius: 4, border: "1px solid #e2e8f0", color: "#334155" }}>
                                  📋 {ass}
                                </span>
                              ))}
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        );
      })}

      {/* ========================================================= */}
      {/* SUBMIT ACTIVITY WORK MODAL (Direct to Mentor Review Inbox)  */}
      {/* ========================================================= */}
      {submitModalOpen && submitTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, animation: "fadeIn 0.2s ease" }}>
          <div style={{ background: "#ffffff", borderRadius: 16, width: 500, padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", animation: "slideUp 0.25s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: 4 }}>
                  Curriculum Deliverable Submission
                </span>
                <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Submit Activity Work</h3>
              </div>
              <button onClick={() => setSubmitModalOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            <form onSubmit={handleSubmitActivityWork}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>Activity Deliverable Title *</label>
                <input
                  type="text"
                  required
                  value={activityTitle}
                  onChange={e => setActivityTitle(e.target.value)}
                  style={{ width: "100%", padding: 9, fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>Reflection & Work Deliverable Notes *</label>
                <textarea
                  rows={4}
                  required
                  value={descriptionText}
                  onChange={e => setDescriptionText(e.target.value)}
                  placeholder="Describe your classroom/field execution, child observations, or learning outcomes..."
                  style={{ width: "100%", padding: 10, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setSubmitModalOpen(false)} style={{ padding: "9px 16px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "9px 18px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                >
                  {submitting ? "Submitting..." : "Submit to Mentor Inbox →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
