const fs = require('fs');

const upgradedGrowthCycleTab = `
import React, { useState, useEffect } from "react";
import { getMyPDCACycles, submitPDCADo, submitPDCAAct } from "../services/api";

const S = {
  label: { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { width: "100%", padding: "12px 14px", border: "2px solid #e2e8f0", borderRadius: 12, fontSize: 14, outline: "none", transition: "all 0.2s" },
  primaryBtn: { background: "linear-gradient(135deg, #4f46e5, #3b82f6)", color: "white", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)", transition: "all 0.2s" },
  exportBtn: { background: "transparent", color: "#64748b", border: "1px solid #cbd5e1", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer" }
};

export default function GrowthCycleTab({ user, setToast }) {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [doModalCycle, setDoModalCycle] = useState(null);
  const [doText, setDoText] = useState("");
  const [submittingDo, setSubmittingDo] = useState(false);

  const [actModalCycle, setActModalCycle] = useState(null);
  const [actText, setActText] = useState("");
  const [submittingAct, setSubmittingAct] = useState(false);

  const fetchCycles = () => {
    setLoading(true);
    getMyPDCACycles()
      .then(res => setCycles(res.cycles || []))
      .catch(err => console.error("Failed to fetch PDCA", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const openDoModal = (cycle) => {
    setDoModalCycle(cycle);
    setDoText(cycle.doText || "");
  };

  const closeDoModal = () => {
    setDoModalCycle(null);
    setDoText("");
  };

  const handleSubmitDo = async (e) => {
    e.preventDefault();
    if (!doText) {
      setToast?.({ msg: "Please write your Do (Action Taken).", type: "error" });
      return;
    }
    setSubmittingDo(true);
    try {
      await submitPDCADo(doModalCycle._id, doText);
      setToast?.({ msg: "Work submitted successfully!", type: "success" });
      closeDoModal();
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to submit work.", type: "error" });
    } finally {
      setSubmittingDo(false);
    }
  };

  const openActModal = (cycle) => {
    setActModalCycle(cycle);
    setActText(cycle.actText || "");
  };

  const closeActModal = () => {
    setActModalCycle(null);
    setActText("");
  };

  const handleSubmitAct = async (e) => {
    e.preventDefault();
    if (!actText) {
      setToast?.({ msg: "Please write your Act (Next Steps).", type: "error" });
      return;
    }
    setSubmittingAct(true);
    try {
      await submitPDCAAct(actModalCycle._id, actText);
      setToast?.({ msg: "Act submitted successfully!", type: "success" });
      closeActModal();
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to submit Act.", type: "error" });
    } finally {
      setSubmittingAct(false);
    }
  };

  const statusMeta = (status) => {
    switch(status) {
      case "planned": return { label: "Needs Do (Your turn)", bg: "#fef3c7", color: "#b45309", icon: "✍️" };
      case "do_submitted": return { label: "Do Submitted", bg: "#e0e7ff", color: "#4338ca", icon: "⏳" };
      case "checked": return { label: "Needs Act (Your turn)", bg: "#ede9fe", color: "#6d28d9", icon: "✨" };
      case "completed": return { label: "Completed", bg: "#d1fae5", color: "#059669", icon: "🏆" };
      default: return { label: status, bg: "#f1f5f9", color: "#475569", icon: "📌" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40, animation: "fadeIn 0.5s ease-out" }}>
      <div style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", padding: "32px 24px", borderRadius: 20, color: "white", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 10 }}>
            <span>🔄</span> My Growth Cycles
          </h2>
          <p style={{ margin: 0, opacity: 0.8, fontSize: 15, maxWidth: "600px" }}>Work on the plans assigned by your mentor and record your progress in the PDCA cycle.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 16 }}>Loading your cycles...</div>
      ) : cycles.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: "white", borderRadius: 20, border: "2px dashed #cbd5e1", color: "#64748b", boxShadow: "0 4px 6px rgba(0,0,0,0.02)" }}>
          <span style={{ fontSize: 40, display: "block", marginBottom: 16 }}>🌱</span>
          <h3 style={{ fontSize: 18, color: "#1e293b", margin: "0 0 8px" }}>No Growth Cycles Yet</h3>
          <p style={{ margin: 0 }}>Your mentor hasn't assigned any plans for you yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {cycles.map((item, i) => {
            const meta = statusMeta(item.status);
            return (
              <div key={item._id} style={{ background: "white", borderRadius: 20, padding: 24, border: "1px solid #f1f5f9", boxShadow: "0 10px 25px rgba(0,0,0,0.03)", transition: "transform 0.2s ease" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, borderBottom: "1px solid #f8fafc", paddingBottom: 16 }}>
                  <div>
                    <h4 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Cycle {item.cycleNumber}: {item.planTitle}</h4>
                    <div style={{ fontSize: 13, color: "#64748b" }}>Mentor: {item.mentorId?.name || "Unknown"}</div>
                  </div>
                  <span style={{ background: meta.bg, color: meta.color, padding: "6px 12px", borderRadius: 12, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                    {meta.icon} {meta.label}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "#f8fafc", borderLeft: "4px solid #4f46e5", padding: "16px", borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>PLAN (Mentor's Strategy)</div>
                    <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.plan}</div>
                  </div>

                  {item.doText ? (
                    <div style={{ background: "#fffbeb", borderLeft: "4px solid #f59e0b", padding: "16px", borderRadius: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#b45309", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>DO (Your Action)</div>
                      <div style={{ fontSize: 14, color: "#78350f", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.doText}</div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => openDoModal(item)} style={{ ...S.primaryBtn, width: "100%", background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                        Submit Your Work (DO)
                      </button>
                    </div>
                  )}

                  {item.checkFeedback && (
                    <div style={{ background: "#ecfdf5", borderLeft: "4px solid #10b981", padding: "16px", borderRadius: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#047857", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>CHECK (Mentor's Review)</div>
                      <div style={{ fontSize: 14, color: "#065f46", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.checkFeedback}</div>
                    </div>
                  )}

                  {item.status === "checked" && !item.actText && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => openActModal(item)} style={{ ...S.primaryBtn, width: "100%", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}>
                        Submit Next Steps (ACT)
                      </button>
                    </div>
                  )}

                  {item.actText && (
                    <div style={{ background: "#f5f3ff", borderLeft: "4px solid #8b5cf6", padding: "16px", borderRadius: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#6d28d9", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>ACT (Your Next Steps)</div>
                      <div style={{ fontSize: 14, color: "#4c1d95", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.actText}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DO MODAL */}
      {doModalCycle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 24, padding: "32px", width: "100%", maxWidth: 600, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 20px" }}>Submit Work (DO)</h3>
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#4f46e5", marginBottom: 8 }}>THE PLAN</div>
              <div style={{ fontSize: 14, color: "#334155", whiteSpace: "pre-wrap" }}>{doModalCycle.plan}</div>
            </div>
            <label style={S.label}>What did you do? (Action Taken)</label>
            <textarea autoFocus style={{ ...S.input, minHeight: 140, marginBottom: 24, borderColor: "#f59e0b" }} value={doText} onChange={e => setDoText(e.target.value)} placeholder="Describe how you executed the plan..." />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={closeDoModal} style={S.exportBtn}>Cancel</button>
              <button onClick={handleSubmitDo} disabled={submittingDo} style={{ ...S.primaryBtn, background: "#f59e0b", opacity: submittingDo ? 0.7 : 1 }}>
                {submittingDo ? "Submitting..." : "Submit DO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACT MODAL */}
      {actModalCycle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 24, padding: "32px", width: "100%", maxWidth: 600, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 20px" }}>Submit Next Steps (ACT)</h3>
            <div style={{ background: "#ecfdf5", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid #a7f3d0" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#059669", marginBottom: 8 }}>MENTOR's CHECK (REVIEW)</div>
              <div style={{ fontSize: 14, color: "#065f46", whiteSpace: "pre-wrap" }}>{actModalCycle.checkFeedback}</div>
            </div>
            <label style={S.label}>What are your next steps? (Adjustments)</label>
            <textarea autoFocus style={{ ...S.input, minHeight: 140, marginBottom: 24, borderColor: "#8b5cf6" }} value={actText} onChange={e => setActText(e.target.value)} placeholder="Based on feedback, what will you change?" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={closeActModal} style={S.exportBtn}>Cancel</button>
              <button onClick={handleSubmitAct} disabled={submittingAct} style={{ ...S.primaryBtn, background: "#8b5cf6", opacity: submittingAct ? 0.7 : 1 }}>
                {submittingAct ? "Submitting..." : "Submit ACT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/pages/GrowthCycleTab.js', upgradedGrowthCycleTab, 'utf8');
