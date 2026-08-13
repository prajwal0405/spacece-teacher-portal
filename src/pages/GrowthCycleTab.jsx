import React, { useState, useEffect } from "react";
import { getMyPDCACycles, submitPDCADo, submitPDCAAct, savePDCADoDraft, savePDCAActDraft } from "../services/api";

const S = {
  label: { display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { width: "100%", padding: "10px 14px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 13, outline: "none", transition: "all 0.2s" },
  primaryBtn: { background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)", transition: "all 0.2s" },
  secondaryBtn: { background: "#ffffff", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }
};

export default function GrowthCycleTab({ user, setToast }) {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  // DO stage drawer state
  const [doModalCycle, setDoModalCycle] = useState(null);
  const [doForm, setDoForm] = useState({});
  const [submittingDo, setSubmittingDo] = useState(false);

  // ACT stage drawer state
  const [actModalCycle, setActModalCycle] = useState(null);
  const [actForm, setActForm] = useState({});
  const [submittingAct, setSubmittingAct] = useState(false);

  const fetchCycles = () => {
    setLoading(true);
    getMyPDCACycles()
      .then(res => setCycles(res.cycles || []))
      .catch(err => console.error("Failed to fetch PDCA Growth Cycles", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const openDoModal = (cycle) => {
    setDoModalCycle(cycle);
    setDoForm({
      doActivitiesCompleted: cycle.doActivitiesCompleted || "",
      doNotes: cycle.doNotes || "",
      doReflections: cycle.doReflections || "",
      doEvidence: cycle.doEvidence?.join(', ') || ""
    });
  };

  const handleDoAction = async (isSubmit) => {
    if (!doModalCycle) return;
    if (isSubmit && !doForm.doActivitiesCompleted.trim()) {
      setToast?.({ msg: "Please describe the activities completed before submitting.", type: "error" });
      return;
    }
    setSubmittingDo(true);
    try {
      const payload = {
        ...doForm,
        doEvidence: doForm.doEvidence ? doForm.doEvidence.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      if (isSubmit) {
        await submitPDCADo(doModalCycle._id, payload);
        setToast?.({ msg: "DO stage submitted to mentor successfully!", type: "success" });
      } else {
        await savePDCADoDraft(doModalCycle._id, payload);
        setToast?.({ msg: "DO stage draft saved.", type: "success" });
      }
      setDoModalCycle(null);
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to save DO phase.", type: "error" });
    } finally {
      setSubmittingDo(false);
    }
  };

  const openActModal = (cycle) => {
    setActModalCycle(cycle);
    setActForm({
      actCorrectiveActions: cycle.actCorrectiveActions || "",
      actChanged: cycle.actChanged || "",
      actReflections: cycle.actReflections || "",
      actEvidence: cycle.actEvidence?.join(', ') || ""
    });
  };

  const handleActAction = async (isSubmit) => {
    if (!actModalCycle) return;
    if (isSubmit && !actForm.actCorrectiveActions.trim()) {
      setToast?.({ msg: "Please specify corrective actions before submitting.", type: "error" });
      return;
    }
    setSubmittingAct(true);
    try {
      const payload = {
        ...actForm,
        actEvidence: actForm.actEvidence ? actForm.actEvidence.split(',').map(s => s.trim()).filter(Boolean) : []
      };

      if (isSubmit) {
        await submitPDCAAct(actModalCycle._id, payload);
        setToast?.({ msg: "ACT stage submitted! Growth Cycle Completed! 🏆", type: "success" });
      } else {
        await savePDCAActDraft(actModalCycle._id, payload);
        setToast?.({ msg: "ACT stage draft saved.", type: "success" });
      }
      setActModalCycle(null);
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to save ACT phase.", type: "error" });
    } finally {
      setSubmittingAct(false);
    }
  };

  const statusMeta = (status, revisionRequired) => {
    if (revisionRequired && status === "DO_IN_PROGRESS") {
      return { label: "Revision Requested", bg: "#ffedd5", color: "#c2410c", icon: "⟳", banner: "Your mentor requested revisions to your DO stage." };
    }
    switch(status) {
      case "PLAN_PUBLISHED": return { label: "Needs DO (Your Turn)", bg: "#fef3c7", color: "#b45309", icon: "✍️", banner: "Plan published by mentor. Please execute DO activities." };
      case "DO_IN_PROGRESS": return { label: "DO Draft Saved", bg: "#fef3c7", color: "#b45309", icon: "✍️", banner: "You have a saved DO draft. Complete and submit." };
      case "DO_SUBMITTED": return { label: "DO Submitted (Waiting Check)", bg: "#e0e7ff", color: "#3730a3", icon: "⏳", banner: "DO submitted! Waiting for mentor review (CHECK)." };
      case "CHECK_IN_PROGRESS": return { label: "Mentor Reviewing Check", bg: "#e0e7ff", color: "#3730a3", icon: "⏳", banner: "Your mentor is currently reviewing your submission." };
      case "CHECK_COMPLETED": return { label: "Needs ACT (Your Turn)", bg: "#ede9fe", color: "#6d28d9", icon: "✨", banner: "Mentor check completed! Please review feedback and perform ACT." };
      case "ACT_IN_PROGRESS": return { label: "ACT Draft Saved", bg: "#ede9fe", color: "#6d28d9", icon: "✨", banner: "Complete your ACT stage to finalize this growth cycle." };
      case "ACT_SUBMITTED":
      case "COMPLETED": return { label: "Growth Cycle Completed", bg: "#d1fae5", color: "#047857", icon: "🏆", banner: "Congratulations! Growth Cycle completed successfully." };
      default: return { label: status, bg: "#f1f5f9", color: "#475569", icon: "📌", banner: "" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40, animation: "fadeIn 0.4s ease-out", color: "#0f172a" }}>
      
      {/* Header Banner */}
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", padding: "28px 24px", borderRadius: 20, color: "white", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 10 }}>
          <span>🔄</span> My Growth Cycles (PDCA)
        </h2>
        <p style={{ margin: 0, opacity: 0.85, fontSize: 14, maxWidth: "680px" }}>
          Follow the 4-stage professional growth cycle (Plan → Do → Check → Act) assigned by your mentor to continuously upgrade classroom practice.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 15 }}>Loading your assigned growth cycles...</div>
      ) : cycles.length === 0 ? (
        <div style={{ padding: 50, textAlign: "center", background: "white", borderRadius: 20, border: "2px dashed #cbd5e1", color: "#64748b" }}>
          <span style={{ fontSize: 42, display: "block", marginBottom: 14 }}>🌱</span>
          <h3 style={{ fontSize: 18, color: "#0f172a", margin: "0 0 6px", fontWeight: 800 }}>No Growth Cycles Assigned Yet</h3>
          <p style={{ margin: 0, fontSize: 14 }}>When your assigned mentor publishes a Growth Plan for you, it will appear here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {cycles.map((item) => {
            const meta = statusMeta(item.status, item.revisionRequired);
            const canDo = item.status === "PLAN_PUBLISHED" || item.status === "DO_IN_PROGRESS" || (item.revisionRequired && item.status === "DO_IN_PROGRESS");
            const isDoSubmitted = ["DO_SUBMITTED", "CHECK_IN_PROGRESS", "CHECK_COMPLETED", "ACT_IN_PROGRESS", "ACT_SUBMITTED", "COMPLETED"].includes(item.status) && !item.revisionRequired;
            const isCheckCompleted = ["CHECK_COMPLETED", "ACT_IN_PROGRESS", "ACT_SUBMITTED", "COMPLETED"].includes(item.status);
            const canAct = item.status === "CHECK_COMPLETED" || item.status === "ACT_IN_PROGRESS";
            const isCompleted = item.status === "COMPLETED" || item.status === "ACT_SUBMITTED";

            return (
              <div key={item._id} style={{ background: "#ffffff", borderRadius: 20, padding: 24, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                
                {/* Header Info */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, borderBottom: "1px solid #f1f5f9", paddingBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: 4 }}>
                      Cycle #{item.cycleNumber}
                    </span>
                    <h3 style={{ margin: "6px 0 2px", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{item.planTitle}</h3>
                    <div style={{ fontSize: 13, color: "#64748b" }}>Assigned by Mentor: <strong>{item.mentorId?.name || "Your Mentor"}</strong></div>
                  </div>

                  <span style={{ background: meta.bg, color: meta.color, padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{meta.icon}</span> {meta.label}
                  </span>
                </div>

                {/* Banner alert */}
                {meta.banner && (
                  <div style={{ background: meta.bg, border: `1px solid ${meta.color}40`, color: meta.color, padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>💡</span> {meta.banner}
                  </div>
                )}

                {/* 4-Stage Stepper Grid */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  
                  {/* STAGE 1: PLAN (Mentor Owned) */}
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: 16, borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        🔵 Stage 1: PLAN (Mentor Strategy & Objectives)
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: 4 }}>Published</span>
                    </div>

                    <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>
                      {item.planArea && <div style={{ marginBottom: 4 }}><strong>Area of Improvement:</strong> {item.planArea}</div>}
                      {item.planObjective && <div style={{ marginBottom: 4 }}><strong>Objective:</strong> {item.planObjective}</div>}
                      {item.planExpectedOutcomes && <div style={{ marginBottom: 4 }}><strong>Expected Outcomes:</strong> {item.planExpectedOutcomes}</div>}
                      {item.planActivities && <div style={{ marginBottom: 4 }}><strong>Action Plan & Activities:</strong> {item.planActivities}</div>}
                      {item.planTargetDate && <div style={{ marginBottom: 4 }}><strong>Target Completion Date:</strong> {new Date(item.planTargetDate).toLocaleDateString()}</div>}
                      {item.planInstructions && <div style={{ marginTop: 6, fontStyle: "italic", color: "#475569" }}><strong>Instructions:</strong> {item.planInstructions}</div>}
                    </div>
                  </div>

                  {/* STAGE 2: DO (Teacher Owned) */}
                  <div style={{ background: canDo ? "#fffef0" : isDoSubmitted ? "#fffbeb" : "#f8fafc", border: `1px solid ${canDo ? "#fde68a" : isDoSubmitted ? "#fcd34d" : "#e2e8f0"}`, padding: 16, borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        🟡 Stage 2: DO (Teacher Execution)
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: isDoSubmitted ? "#d1fae5" : canDo ? "#fef3c7" : "#f1f5f9", color: isDoSubmitted ? "#047857" : canDo ? "#b45309" : "#64748b", padding: "2px 6px", borderRadius: 4 }}>
                        {isDoSubmitted ? "✓ Submitted" : canDo ? "Action Required" : "Locked"}
                      </span>
                    </div>

                    {isDoSubmitted ? (
                      <div style={{ fontSize: 13, color: "#1e293b" }}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>{item.doActivitiesCompleted}</div>
                        {item.doNotes && <div style={{ fontSize: 12, color: "#475569" }}><strong>Notes:</strong> {item.doNotes}</div>}
                        {item.doReflections && <div style={{ fontSize: 12, color: "#475569" }}><strong>Reflections:</strong> {item.doReflections}</div>}
                        {(item.doEvidence || []).length > 0 && <div style={{ fontSize: 11, color: "#0284c7", fontWeight: 700, marginTop: 4 }}>📎 Evidence: {item.doEvidence.join(", ")}</div>}
                      </div>
                    ) : canDo ? (
                      <div>
                        <div style={{ fontSize: 13, color: "#78350f", marginBottom: 10 }}>Execute the planned activities and record your progress, reflections, and evidence links.</div>
                        <button
                          onClick={() => openDoModal(item)}
                          style={{ ...S.primaryBtn, background: "linear-gradient(135deg, #d97706, #b45309)", width: "100%" }}
                        >
                          ✍️ Fill & Submit DO Implementation →
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>Locked until Plan is published.</div>
                    )}
                  </div>

                  {/* STAGE 3: CHECK (Mentor Owned) */}
                  <div style={{ background: isCheckCompleted ? "#f0fdf4" : "#f8fafc", border: `1px solid ${isCheckCompleted ? "#bbf7d0" : "#e2e8f0"}`, padding: 16, borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        🟣 Stage 3: CHECK (Mentor Evaluation & Feedback)
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: isCheckCompleted ? "#d1fae5" : "#f1f5f9", color: isCheckCompleted ? "#047857" : "#64748b", padding: "2px 6px", borderRadius: 4 }}>
                        {isCheckCompleted ? "✓ Check Completed" : "Pending Review"}
                      </span>
                    </div>

                    {isCheckCompleted ? (
                      <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
                        <div style={{ marginBottom: 4 }}><strong>Mentor Feedback:</strong> {item.checkFeedback}</div>
                        {item.checkScore && <div style={{ marginBottom: 4 }}><strong>Rating/Score:</strong> {item.checkScore}</div>}
                        {item.checkStrengths && <div style={{ marginBottom: 4 }}><strong>Strengths Identified:</strong> {item.checkStrengths}</div>}
                        {item.checkGaps && <div style={{ marginBottom: 4 }}><strong>Gaps / Areas for Growth:</strong> {item.checkGaps}</div>}
                        {item.checkRecommendations && <div><strong>Recommendations for ACT:</strong> {item.checkRecommendations}</div>}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        {item.status === "DO_SUBMITTED" || item.status === "CHECK_IN_PROGRESS"
                          ? "Your mentor is currently evaluating your DO submission."
                          : "Locked until DO stage is submitted."}
                      </div>
                    )}
                  </div>

                  {/* STAGE 4: ACT (Teacher Owned) */}
                  <div style={{ background: isCompleted ? "#faf5ff" : canAct ? "#fff5f5" : "#f8fafc", border: `1px solid ${isCompleted ? "#e9d5ff" : canAct ? "#fecdd3" : "#e2e8f0"}`, padding: 16, borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#6b21a8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        🟢 Stage 4: ACT (Teacher Continuous Improvement)
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: isCompleted ? "#f3e8ff" : canAct ? "#ffe4e6" : "#f1f5f9", color: isCompleted ? "#7e22ce" : canAct ? "#be123c" : "#64748b", padding: "2px 6px", borderRadius: 4 }}>
                        {isCompleted ? "🏆 Growth Cycle Completed" : canAct ? "Action Required" : "Locked"}
                      </span>
                    </div>

                    {isCompleted ? (
                      <div style={{ fontSize: 13, color: "#581c87" }}>
                        <div style={{ fontWeight: 700, marginBottom: 2 }}>{item.actCorrectiveActions}</div>
                        {item.actChanged && <div style={{ fontSize: 12 }}><strong>Changes Implemented:</strong> {item.actChanged}</div>}
                        {item.actReflections && <div style={{ fontSize: 12 }}><strong>Reflections:</strong> {item.actReflections}</div>}
                        {(item.actEvidence || []).length > 0 && <div style={{ fontSize: 11, color: "#7e22ce", fontWeight: 700, marginTop: 4 }}>📎 Evidence: {item.actEvidence.join(", ")}</div>}
                      </div>
                    ) : canAct ? (
                      <div>
                        <div style={{ fontSize: 13, color: "#881337", marginBottom: 10 }}>Review your mentor's feedback above and record your corrective improvement actions to complete the Growth Cycle.</div>
                        <button
                          onClick={() => openActModal(item)}
                          style={{ ...S.primaryBtn, background: "linear-gradient(135deg, #7e22ce, #6b21a8)", width: "100%" }}
                        >
                          ✨ Fill & Submit ACT Stage →
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>Locked until Mentor completes Check.</div>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* DO MODAL / DRAWER */}
      {doModalCycle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "white", borderRadius: 20, padding: "28px", width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: 4 }}>
                  Stage 2: DO (Teacher Execution)
                </span>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "4px 0 0" }}>Submit DO Implementation</h3>
              </div>
              <button onClick={() => setDoModalCycle(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleDoAction(true); }}>
              <div style={{ background: "#eff6ff", borderRadius: 10, padding: 12, border: "1px solid #bfdbfe", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase" }}>Mentor Plan Strategy</div>
                <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 700, marginTop: 2 }}>{doModalCycle.planTitle}</div>
                <div style={{ fontSize: 12, color: "#334155" }}>{doModalCycle.planActivities}</div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Activities Executed / Implementation Log *</label>
                <textarea
                  rows={3}
                  required
                  autoFocus
                  style={{ ...S.input, minHeight: 70, borderColor: "#f59e0b" }}
                  value={doForm.doActivitiesCompleted}
                  onChange={e => setDoForm({ ...doForm, doActivitiesCompleted: e.target.value })}
                  placeholder="Describe what activities you carried out in your classroom..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={S.label}>Classroom Notes & Observations</label>
                  <textarea
                    style={{ ...S.input, minHeight: 60 }}
                    value={doForm.doNotes}
                    onChange={e => setDoForm({ ...doForm, doNotes: e.target.value })}
                    placeholder="Key observations during execution..."
                  />
                </div>

                <div>
                  <label style={S.label}>Teacher Reflections</label>
                  <textarea
                    style={{ ...S.input, minHeight: 60 }}
                    value={doForm.doReflections}
                    onChange={e => setDoForm({ ...doForm, doReflections: e.target.value })}
                    placeholder="What went well? What was challenging?"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Supporting Evidence (Comma-separated Links/Drive URLs)</label>
                <input
                  style={S.input}
                  type="text"
                  value={doForm.doEvidence}
                  onChange={e => setDoForm({ ...doForm, doEvidence: e.target.value })}
                  placeholder="e.g. https://drive.google.com/... , https://..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setDoModalCycle(null)} style={S.secondaryBtn}>Cancel</button>
                <button type="button" onClick={() => handleDoAction(false)} disabled={submittingDo} style={S.secondaryBtn}>Save Draft</button>
                <button
                  type="submit"
                  disabled={submittingDo}
                  style={{ ...S.primaryBtn, background: "linear-gradient(135deg, #d97706, #b45309)", opacity: submittingDo ? 0.7 : 1 }}
                >
                  {submittingDo ? "Submitting..." : "Submit DO to Mentor →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACT MODAL / DRAWER */}
      {actModalCycle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "white", borderRadius: 20, padding: "28px", width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #e2e8f0", paddingBottom: 12 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", background: "#f3e8ff", color: "#7e22ce", padding: "2px 8px", borderRadius: 4 }}>
                  Stage 4: ACT (Continuous Improvement)
                </span>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "4px 0 0" }}>Submit ACT & Finalize Growth Cycle</h3>
              </div>
              <button onClick={() => setActModalCycle(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleActAction(true); }}>
              <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 12, border: "1px solid #bbf7d0", marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase" }}>Mentor's Check Review & Recommendations</div>
                <div style={{ fontSize: 13, color: "#166534", marginTop: 2 }}>{actModalCycle.checkFeedback}</div>
                {actModalCycle.checkRecommendations && <div style={{ fontSize: 12, color: "#166534", fontStyle: "italic", marginTop: 4 }}><strong>Recommendations:</strong> {actModalCycle.checkRecommendations}</div>}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Corrective / Improvement Actions Implemented *</label>
                <textarea
                  rows={3}
                  required
                  autoFocus
                  style={{ ...S.input, minHeight: 70, borderColor: "#8b5cf6" }}
                  value={actForm.actCorrectiveActions}
                  onChange={e => setActForm({ ...actForm, actCorrectiveActions: e.target.value })}
                  placeholder="What specific improvements did you adopt based on mentor feedback?"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={S.label}>What Changed in Practice?</label>
                  <textarea
                    style={{ ...S.input, minHeight: 60 }}
                    value={actForm.actChanged}
                    onChange={e => setActForm({ ...actForm, actChanged: e.target.value })}
                    placeholder="Describe changes in student outcomes or teaching habits..."
                  />
                </div>

                <div>
                  <label style={S.label}>Key Learnings & Reflections</label>
                  <textarea
                    style={{ ...S.input, minHeight: 60 }}
                    value={actForm.actReflections}
                    onChange={e => setActForm({ ...actForm, actReflections: e.target.value })}
                    placeholder="Final takeaway and reflections..."
                  />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Supporting Evidence (Comma-separated Links/Drive URLs)</label>
                <input
                  style={S.input}
                  type="text"
                  value={actForm.actEvidence}
                  onChange={e => setActForm({ ...actForm, actEvidence: e.target.value })}
                  placeholder="e.g. https://drive.google.com/... , https://..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setActModalCycle(null)} style={S.secondaryBtn}>Cancel</button>
                <button type="button" onClick={() => handleActAction(false)} disabled={submittingAct} style={S.secondaryBtn}>Save Draft</button>
                <button
                  type="submit"
                  disabled={submittingAct}
                  style={{ ...S.primaryBtn, background: "linear-gradient(135deg, #7e22ce, #6b21a8)", opacity: submittingAct ? 0.7 : 1 }}
                >
                  {submittingAct ? "Submitting..." : "🏆 Complete Growth Cycle →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
