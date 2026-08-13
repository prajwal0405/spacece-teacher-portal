const fs = require('fs');
const path = require('path');

const newPDCATab = `
import { 
  getPDCACycles, 
  submitPDCAPlanDraft, 
  updatePDCAPlanDraft, 
  publishPDCAPlan, 
  savePDCACheckDraft, 
  submitPDCACheck 
} from "../services/api";

const S = {
  label: { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { width: "100%", padding: "12px 14px", border: "2px solid #e2e8f0", borderRadius: 12, fontSize: 14, outline: "none", transition: "all 0.2s", marginBottom: 16 },
  primaryBtn: { background: "linear-gradient(135deg, #4f46e5, #3b82f6)", color: "white", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)", transition: "all 0.2s" },
  secondaryBtn: { background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer" },
};

export function PDCATab({ user, setToast, onUserUpdate }) {
  const mentees = user?.mentorProfile?.assignedTeachers || [];
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [planModal, setPlanModal] = useState(null); // null = closed, {} = new, { ...cycle } = edit
  const [planForm, setPlanForm] = useState({});

  const [checkModal, setCheckModal] = useState(null);
  const [checkForm, setCheckForm] = useState({});
  
  const [submitting, setSubmitting] = useState(false);

  const fetchCycles = () => {
    setLoading(true);
    getPDCACycles()
      .then(res => setHistory(res.cycles || []))
      .catch(err => console.error("Failed to fetch PDCA", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCycles(); }, []);

  // PLAN Workflow
  const openPlanModal = (cycle = null) => {
    setPlanModal(cycle || {});
    setPlanForm({
      menteeId: cycle?.menteeId?._id || mentees[0]?._id || "",
      planTitle: cycle?.planTitle || "",
      planObjective: cycle?.planObjective || "",
      planArea: cycle?.planArea || "",
      planExpectedOutcomes: cycle?.planExpectedOutcomes || "",
      planActivities: cycle?.planActivities || "",
      planStartDate: cycle?.planStartDate ? new Date(cycle.planStartDate).toISOString().split('T')[0] : "",
      planTargetDate: cycle?.planTargetDate ? new Date(cycle.planTargetDate).toISOString().split('T')[0] : "",
      planInstructions: cycle?.planInstructions || ""
    });
  };

  const handlePlanAction = async (isPublish) => {
    if (!planForm.menteeId || !planForm.planTitle) {
      setToast?.({ msg: "Mentee and Title are required.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      let cycleId = planModal?._id;
      if (!cycleId) {
        // Create Draft
        const res = await submitPDCAPlanDraft(planForm);
        cycleId = res.cycle._id;
        setToast?.({ msg: "Draft created successfully.", type: "success" });
      } else {
        // Update Draft
        await updatePDCAPlanDraft(cycleId, planForm);
        setToast?.({ msg: "Draft updated successfully.", type: "success" });
      }

      if (isPublish) {
        await publishPDCAPlan(cycleId);
        setToast?.({ msg: "Plan Published to Teacher!", type: "success" });
      }

      setPlanModal(null);
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to save plan.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  // CHECK Workflow
  const openCheckModal = (cycle) => {
    setCheckModal(cycle);
    setCheckForm({
      checkFeedback: cycle.checkFeedback || "",
      checkScore: cycle.checkScore || "",
      checkStrengths: cycle.checkStrengths || "",
      checkGaps: cycle.checkGaps || "",
      checkRecommendations: cycle.checkRecommendations || "",
      revisionRequired: cycle.revisionRequired || false
    });
  };

  const handleCheckAction = async (isSubmit) => {
    if (isSubmit && !checkForm.checkFeedback) {
      setToast?.({ msg: "Feedback is required to submit.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      if (isSubmit) {
        await submitPDCACheck(checkModal._id, checkForm);
        setToast?.({ msg: checkForm.revisionRequired ? "Revision requested." : "Review submitted successfully!", type: "success" });
        setCheckModal(null);
      } else {
        await savePDCACheckDraft(checkModal._id, checkForm);
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
      case "DRAFT": return { label: "Draft", bg: "#f1f5f9", color: "#475569" };
      case "PLAN_PUBLISHED": return { label: "Waiting for Teacher Do", bg: "#e0e7ff", color: "#4338ca" };
      case "DO_IN_PROGRESS": return { label: "Teacher Working (DO)", bg: "#fef3c7", color: "#b45309" };
      case "DO_SUBMITTED": return { label: "Needs Your Review (CHECK)", bg: "#fca5a5", color: "#991b1b" };
      case "CHECK_IN_PROGRESS": return { label: "Drafting Review", bg: "#f1f5f9", color: "#475569" };
      case "CHECK_COMPLETED": return { label: "Waiting for Teacher Act", bg: "#ede9fe", color: "#6d28d9" };
      case "ACT_IN_PROGRESS": return { label: "Teacher Working (ACT)", bg: "#fae8ff", color: "#a21caf" };
      case "ACT_SUBMITTED":
      case "COMPLETED": return { label: "Cycle Completed", bg: "#d1fae5", color: "#059669" };
      default: return { label: status, bg: "#f1f5f9", color: "#475569" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #4f46e5, #3b82f6)", padding: "30px 24px", borderRadius: 16, color: "white" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Growth Cycles (PDCA)</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>Assign structured plans and review teacher progress</p>
        </div>
        <button onClick={() => openPlanModal()} style={{ background: "white", color: "#4f46e5", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>
          + Create Growth Plan
        </button>
      </div>

      <SectionCard title="Active & Past Cycles">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading...</div>
        ) : history.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 12 }}>
            No Growth Cycles created yet. Click "Create Growth Plan" to start.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {history.map(cycle => {
              const meta = getStatusDisplay(cycle.status);
              return (
                <div key={cycle._id} style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontSize: 16, color: "#0f172a" }}>Cycle {cycle.cycleNumber}: {cycle.planTitle}</h4>
                      <div style={{ fontSize: 13, color: "#64748b" }}>Teacher: {cycle.menteeId?.name}</div>
                    </div>
                    <span style={{ background: meta.bg, color: meta.color, padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>{meta.label}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13, color: "#334155" }}>
                    <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, borderLeft: "3px solid #4f46e5" }}>
                      <strong style={{ color: "#4f46e5" }}>PLAN</strong>
                      <div>{cycle.planObjective || cycle.planActivities}</div>
                    </div>
                    
                    {cycle.doActivitiesCompleted && (
                      <div style={{ background: "#fffbeb", padding: 12, borderRadius: 8, borderLeft: "3px solid #f59e0b" }}>
                        <strong style={{ color: "#b45309" }}>DO</strong>
                        <div>{cycle.doActivitiesCompleted}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    {cycle.status === "DRAFT" && (
                      <button onClick={() => openPlanModal(cycle)} style={S.secondaryBtn}>Edit Draft</button>
                    )}
                    {["DO_SUBMITTED", "CHECK_IN_PROGRESS"].includes(cycle.status) && (
                      <button onClick={() => openCheckModal(cycle)} style={{ ...S.primaryBtn, background: "#10b981" }}>Review & Check Output</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* PLAN MODAL */}
      {planModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 24, padding: 32, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 20, margin: "0 0 20px" }}>{planModal._id ? "Edit Growth Plan" : "Create Growth Plan"}</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Select Teacher</label>
                <select style={S.input} value={planForm.menteeId} onChange={e => setPlanForm({...planForm, menteeId: e.target.value})} disabled={!!planModal._id}>
                  {mentees.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Plan Title *</label>
                <input style={S.input} type="text" value={planForm.planTitle} onChange={e => setPlanForm({...planForm, planTitle: e.target.value})} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Development Objective</label>
                <textarea style={{ ...S.input, minHeight: 60 }} value={planForm.planObjective} onChange={e => setPlanForm({...planForm, planObjective: e.target.value})} />
              </div>

              <div>
                <label style={S.label}>Area of Improvement</label>
                <input style={S.input} type="text" value={planForm.planArea} onChange={e => setPlanForm({...planForm, planArea: e.target.value})} />
              </div>

              <div>
                <label style={S.label}>Expected Outcomes</label>
                <input style={S.input} type="text" value={planForm.planExpectedOutcomes} onChange={e => setPlanForm({...planForm, planExpectedOutcomes: e.target.value})} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Planned Activities / Actions</label>
                <textarea style={{ ...S.input, minHeight: 80 }} value={planForm.planActivities} onChange={e => setPlanForm({...planForm, planActivities: e.target.value})} />
              </div>

              <div>
                <label style={S.label}>Start Date</label>
                <input style={S.input} type="date" value={planForm.planStartDate} onChange={e => setPlanForm({...planForm, planStartDate: e.target.value})} />
              </div>

              <div>
                <label style={S.label}>Target Completion Date</label>
                <input style={S.input} type="date" value={planForm.planTargetDate} onChange={e => setPlanForm({...planForm, planTargetDate: e.target.value})} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Instructions / Resources</label>
                <textarea style={{ ...S.input, minHeight: 60 }} value={planForm.planInstructions} onChange={e => setPlanForm({...planForm, planInstructions: e.target.value})} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
              <button onClick={() => setPlanModal(null)} style={S.secondaryBtn}>Cancel</button>
              <button onClick={() => handlePlanAction(false)} disabled={submitting} style={S.secondaryBtn}>Save Draft</button>
              <button onClick={() => handlePlanAction(true)} disabled={submitting} style={S.primaryBtn}>Publish Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* CHECK MODAL */}
      {checkModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 24, padding: 32, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 20, margin: "0 0 20px" }}>Review Teacher Output (CHECK)</h3>
            
            <div style={{ background: "#fffbeb", padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <strong style={{ color: "#b45309", fontSize: 11 }}>TEACHER'S DO SUBMISSION</strong>
              <div style={{ fontSize: 13, color: "#78350f" }}>
                <strong>Activities:</strong> {checkModal.doActivitiesCompleted}<br/>
                <strong>Notes:</strong> {checkModal.doNotes}<br/>
                <strong>Reflections:</strong> {checkModal.doReflections}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Review Comments / Feedback *</label>
                <textarea style={{ ...S.input, minHeight: 80 }} value={checkForm.checkFeedback} onChange={e => setCheckForm({...checkForm, checkFeedback: e.target.value})} />
              </div>

              <div>
                <label style={S.label}>Strengths</label>
                <textarea style={{ ...S.input, minHeight: 60 }} value={checkForm.checkStrengths} onChange={e => setCheckForm({...checkForm, checkStrengths: e.target.value})} />
              </div>

              <div>
                <label style={S.label}>Areas for Improvement (Gaps)</label>
                <textarea style={{ ...S.input, minHeight: 60 }} value={checkForm.checkGaps} onChange={e => setCheckForm({...checkForm, checkGaps: e.target.value})} />
              </div>

              <div>
                <label style={S.label}>Score / Rating</label>
                <input style={S.input} type="text" value={checkForm.checkScore} onChange={e => setCheckForm({...checkForm, checkScore: e.target.value})} placeholder="e.g. 4/5 or Good" />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={S.label}>Recommendations</label>
                <textarea style={{ ...S.input, minHeight: 60 }} value={checkForm.checkRecommendations} onChange={e => setCheckForm({...checkForm, checkRecommendations: e.target.value})} />
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, background: "#fef2f2", padding: 12, borderRadius: 8, border: "1px solid #fecaca" }}>
                <input type="checkbox" id="revisionRequired" checked={checkForm.revisionRequired} onChange={e => setCheckForm({...checkForm, revisionRequired: e.target.checked})} style={{ width: 18, height: 18 }} />
                <label htmlFor="revisionRequired" style={{ fontSize: 14, color: "#991b1b", fontWeight: 700, cursor: "pointer", margin: 0 }}>
                  Revision Required (Sends cycle back to Teacher's DO phase)
                </label>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setCheckModal(null)} style={S.secondaryBtn}>Cancel</button>
              <button onClick={() => handleCheckAction(false)} disabled={submitting} style={S.secondaryBtn}>Save Draft</button>
              <button onClick={() => handleCheckAction(true)} disabled={submitting} style={{ ...S.primaryBtn, background: "#10b981" }}>Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

let workspace = fs.readFileSync('src/mentor/Mentortabs.jsx', 'utf8');
const oldIndex = workspace.indexOf('export function PDCATab');
if (oldIndex !== -1) {
  workspace = workspace.substring(0, oldIndex);
}
workspace += newPDCATab;

fs.writeFileSync('src/mentor/Mentortabs.jsx', workspace, 'utf8');
console.log("Successfully patched Mentortabs.jsx");
