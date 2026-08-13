const fs = require('fs');
const path = require('path');

const newComponent = `import React, { useState, useEffect } from "react";
import { 
  getMyPDCACycles, 
  savePDCADoDraft, 
  submitPDCADo, 
  savePDCAActDraft, 
  submitPDCAAct 
} from "../services/api";

const S = {
  label: { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { width: "100%", padding: "12px 14px", border: "2px solid #e2e8f0", borderRadius: 12, fontSize: 14, outline: "none", transition: "all 0.2s", marginBottom: 16 },
  primaryBtn: { background: "linear-gradient(135deg, #4f46e5, #3b82f6)", color: "white", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)", transition: "all 0.2s" },
  secondaryBtn: { background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer" },
  card: { background: "white", borderRadius: 20, padding: 24, border: "1px solid #f1f5f9", boxShadow: "0 10px 25px rgba(0,0,0,0.03)", marginBottom: 24 }
};

export default function GrowthCycleTab({ user, setToast }) {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [doModalCycle, setDoModalCycle] = useState(null);
  const [doForm, setDoForm] = useState({ doActivitiesCompleted: "", doNotes: "", doReflections: "", doEvidence: "" });
  
  const [actModalCycle, setActModalCycle] = useState(null);
  const [actForm, setActForm] = useState({ actCorrectiveActions: "", actChanged: "", actReflections: "", actEvidence: "" });
  
  const [submitting, setSubmitting] = useState(false);

  const fetchCycles = () => {
    setLoading(true);
    getMyPDCACycles()
      .then(res => setCycles(res.cycles || []))
      .catch(err => console.error("Failed to fetch PDCA", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCycles(); }, []);

  // DO Workflow
  const openDoModal = (cycle) => {
    setDoModalCycle(cycle);
    setDoForm({
      doActivitiesCompleted: cycle.doActivitiesCompleted || "",
      doNotes: cycle.doNotes || "",
      doReflections: cycle.doReflections || "",
      doEvidence: cycle.doEvidence?.join("\\n") || ""
    });
  };

  const handleDoAction = async (isSubmit) => {
    if (isSubmit && !doForm.doActivitiesCompleted) {
      setToast?.({ msg: "Please describe the activities you completed.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...doForm,
        doEvidence: doForm.doEvidence.split("\\n").map(l => l.trim()).filter(Boolean)
      };
      
      if (isSubmit) {
        await submitPDCADo(doModalCycle._id, payload);
        setToast?.({ msg: "Work submitted to mentor!", type: "success" });
        setDoModalCycle(null);
      } else {
        await savePDCADoDraft(doModalCycle._id, payload);
        setToast?.({ msg: "Draft saved.", type: "success" });
      }
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Operation failed.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // ACT Workflow
  const openActModal = (cycle) => {
    setActModalCycle(cycle);
    setActForm({
      actCorrectiveActions: cycle.actCorrectiveActions || "",
      actChanged: cycle.actChanged || "",
      actReflections: cycle.actReflections || "",
      actEvidence: cycle.actEvidence?.join("\\n") || ""
    });
  };

  const handleActAction = async (isSubmit) => {
    if (isSubmit && !actForm.actCorrectiveActions) {
      setToast?.({ msg: "Please specify your corrective actions.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...actForm,
        actEvidence: actForm.actEvidence.split("\\n").map(l => l.trim()).filter(Boolean)
      };
      
      if (isSubmit) {
        await submitPDCAAct(actModalCycle._id, payload);
        setToast?.({ msg: "Act phase submitted! Cycle complete.", type: "success" });
        setActModalCycle(null);
      } else {
        await savePDCAActDraft(actModalCycle._id, payload);
        setToast?.({ msg: "Draft saved.", type: "success" });
      }
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Operation failed.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch(status) {
      case "PLAN_PUBLISHED": return { label: "Waiting for you to Do", bg: "#fef3c7", color: "#b45309" };
      case "DO_IN_PROGRESS": return { label: "Do In Progress", bg: "#e0e7ff", color: "#4338ca" };
      case "DO_SUBMITTED": return { label: "Waiting for Mentor Review", bg: "#f1f5f9", color: "#475569" };
      case "CHECK_IN_PROGRESS": return { label: "Mentor Reviewing", bg: "#f1f5f9", color: "#475569" };
      case "CHECK_COMPLETED": return { label: "Waiting for you to Act", bg: "#ede9fe", color: "#6d28d9" };
      case "ACT_IN_PROGRESS": return { label: "Act In Progress", bg: "#fae8ff", color: "#a21caf" };
      case "ACT_SUBMITTED":
      case "COMPLETED": return { label: "Cycle Completed", bg: "#d1fae5", color: "#059669" };
      default: return { label: status, bg: "#f1f5f9", color: "#475569" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40, animation: "fadeIn 0.5s ease-out" }}>
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", padding: "32px 24px", borderRadius: 20, color: "white" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px" }}>🔄 My Growth Cycles</h2>
        <p style={{ margin: 0, opacity: 0.8, fontSize: 15 }}>Execute the plans assigned by your mentor and record your progress.</p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading...</div>
      ) : cycles.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: "white", borderRadius: 20, border: "2px dashed #cbd5e1" }}>
          <h3>No active cycles</h3>
        </div>
      ) : (
        cycles.map(cycle => {
          const meta = getStatusDisplay(cycle.status);
          return (
            <div key={cycle._id} style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: 18, color: "#0f172a" }}>Cycle {cycle.cycleNumber}: {cycle.planTitle}</h4>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Mentor: {cycle.mentorId?.name}</div>
                </div>
                <div style={{ background: meta.bg, color: meta.color, padding: "6px 12px", borderRadius: 12, fontWeight: 700, fontSize: 12 }}>{meta.label}</div>
              </div>

              {/* 1. PLAN */}
              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12, marginBottom: 12, borderLeft: "4px solid #4f46e5" }}>
                <h5 style={{ margin: "0 0 8px", color: "#4f46e5", textTransform: "uppercase", fontSize: 11 }}>1. Plan (Mentor)</h5>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13, color: "#334155" }}>
                  <div><strong>Objective:</strong> {cycle.planObjective}</div>
                  <div><strong>Area:</strong> {cycle.planArea}</div>
                  <div style={{ gridColumn: "1 / -1" }}><strong>Activities:</strong> {cycle.planActivities}</div>
                  <div style={{ gridColumn: "1 / -1" }}><strong>Instructions:</strong> {cycle.planInstructions}</div>
                </div>
              </div>

              {/* 2. DO */}
              {cycle.doActivitiesCompleted && (
                <div style={{ background: "#fffbeb", padding: 16, borderRadius: 12, marginBottom: 12, borderLeft: "4px solid #f59e0b" }}>
                  <h5 style={{ margin: "0 0 8px", color: "#b45309", textTransform: "uppercase", fontSize: 11 }}>2. Do (Teacher)</h5>
                  <div style={{ fontSize: 13, color: "#78350f" }}>
                    <div><strong>Activities Completed:</strong> {cycle.doActivitiesCompleted}</div>
                    {cycle.doNotes && <div><strong>Notes:</strong> {cycle.doNotes}</div>}
                    {cycle.doEvidence?.length > 0 && <div><strong>Evidence Links:</strong> {cycle.doEvidence.join(", ")}</div>}
                  </div>
                </div>
              )}

              {/* ACTION: DO */}
              {["PLAN_PUBLISHED", "DO_IN_PROGRESS"].includes(cycle.status) && (
                <button onClick={() => openDoModal(cycle)} style={{ ...S.primaryBtn, width: "100%", background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  {cycle.status === "DO_IN_PROGRESS" ? "Continue DO Phase" : "Start DO Phase"}
                </button>
              )}

              {/* 3. CHECK */}
              {cycle.checkFeedback && (
                <div style={{ background: cycle.revisionRequired ? "#fee2e2" : "#ecfdf5", padding: 16, borderRadius: 12, marginBottom: 12, borderLeft: \`4px solid \${cycle.revisionRequired ? "#ef4444" : "#10b981"}\` }}>
                  <h5 style={{ margin: "0 0 8px", color: cycle.revisionRequired ? "#b91c1c" : "#047857", textTransform: "uppercase", fontSize: 11 }}>
                    3. Check (Mentor) {cycle.revisionRequired && " - REVISION REQUIRED"}
                  </h5>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13, color: cycle.revisionRequired ? "#7f1d1d" : "#065f46" }}>
                    <div style={{ gridColumn: "1 / -1" }}><strong>Feedback:</strong> {cycle.checkFeedback}</div>
                    <div><strong>Strengths:</strong> {cycle.checkStrengths}</div>
                    <div><strong>Gaps:</strong> {cycle.checkGaps}</div>
                    <div><strong>Score:</strong> {cycle.checkScore}</div>
                    <div><strong>Recommendations:</strong> {cycle.checkRecommendations}</div>
                  </div>
                </div>
              )}

              {/* 4. ACT */}
              {cycle.actCorrectiveActions && (
                <div style={{ background: "#f5f3ff", padding: 16, borderRadius: 12, marginBottom: 12, borderLeft: "4px solid #8b5cf6" }}>
                  <h5 style={{ margin: "0 0 8px", color: "#6d28d9", textTransform: "uppercase", fontSize: 11 }}>4. Act (Teacher)</h5>
                  <div style={{ fontSize: 13, color: "#4c1d95" }}>
                    <div><strong>Corrective Actions:</strong> {cycle.actCorrectiveActions}</div>
                    <div><strong>What Changed:</strong> {cycle.actChanged}</div>
                    {cycle.actReflections && <div><strong>Reflections:</strong> {cycle.actReflections}</div>}
                  </div>
                </div>
              )}

              {/* ACTION: ACT */}
              {["CHECK_COMPLETED", "ACT_IN_PROGRESS"].includes(cycle.status) && (
                <button onClick={() => openActModal(cycle)} style={{ ...S.primaryBtn, width: "100%", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>
                  {cycle.status === "ACT_IN_PROGRESS" ? "Continue ACT Phase" : "Start ACT Phase"}
                </button>
              )}
            </div>
          );
        })
      )}

      {/* DO MODAL */}
      {doModalCycle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 24, padding: 32, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 22, margin: "0 0 20px" }}>Submit Work (DO)</h3>
            <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#4f46e5" }}>THE PLAN</div>
              <div style={{ fontSize: 13, color: "#334155" }}>{doModalCycle.planActivities}</div>
            </div>

            <label style={S.label}>Activities Completed *</label>
            <textarea style={{ ...S.input, minHeight: 80 }} value={doForm.doActivitiesCompleted} onChange={e => setDoForm({...doForm, doActivitiesCompleted: e.target.value})} placeholder="What did you do?" />

            <label style={S.label}>Observations & Notes</label>
            <textarea style={{ ...S.input, minHeight: 80 }} value={doForm.doNotes} onChange={e => setDoForm({...doForm, doNotes: e.target.value})} />

            <label style={S.label}>Reflections</label>
            <textarea style={{ ...S.input, minHeight: 80 }} value={doForm.doReflections} onChange={e => setDoForm({...doForm, doReflections: e.target.value})} />

            <label style={S.label}>Evidence Links (One URL per line)</label>
            <textarea style={{ ...S.input, minHeight: 80 }} value={doForm.doEvidence} onChange={e => setDoForm({...doForm, doEvidence: e.target.value})} placeholder="https://drive.google.com/..." />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setDoModalCycle(null)} style={S.secondaryBtn}>Cancel</button>
              <button onClick={() => handleDoAction(false)} disabled={submitting} style={S.secondaryBtn}>Save Draft</button>
              <button onClick={() => handleDoAction(true)} disabled={submitting} style={{ ...S.primaryBtn, background: "#f59e0b" }}>Submit DO</button>
            </div>
          </div>
        </div>
      )}

      {/* ACT MODAL */}
      {actModalCycle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 24, padding: 32, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 22, margin: "0 0 20px" }}>Submit Next Steps (ACT)</h3>
            <div style={{ background: "#ecfdf5", padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#059669" }}>MENTOR'S FEEDBACK</div>
              <div style={{ fontSize: 13, color: "#065f46" }}>{actModalCycle.checkFeedback}</div>
            </div>

            <label style={S.label}>Corrective Actions *</label>
            <textarea style={{ ...S.input, minHeight: 80 }} value={actForm.actCorrectiveActions} onChange={e => setActForm({...actForm, actCorrectiveActions: e.target.value})} placeholder="What actions are you taking based on feedback?" />

            <label style={S.label}>What Changed?</label>
            <textarea style={{ ...S.input, minHeight: 80 }} value={actForm.actChanged} onChange={e => setActForm({...actForm, actChanged: e.target.value})} />

            <label style={S.label}>Reflections / Learning Outcomes</label>
            <textarea style={{ ...S.input, minHeight: 80 }} value={actForm.actReflections} onChange={e => setActForm({...actForm, actReflections: e.target.value})} />

            <label style={S.label}>Evidence Links (One URL per line)</label>
            <textarea style={{ ...S.input, minHeight: 80 }} value={actForm.actEvidence} onChange={e => setActForm({...actForm, actEvidence: e.target.value})} placeholder="https://drive.google.com/..." />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setActModalCycle(null)} style={S.secondaryBtn}>Cancel</button>
              <button onClick={() => handleActAction(false)} disabled={submitting} style={S.secondaryBtn}>Save Draft</button>
              <button onClick={() => handleActAction(true)} disabled={submitting} style={{ ...S.primaryBtn, background: "#8b5cf6" }}>Submit ACT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/pages/GrowthCycleTab.jsx', newComponent, 'utf8');
console.log("Successfully replaced GrowthCycleTab.jsx");
