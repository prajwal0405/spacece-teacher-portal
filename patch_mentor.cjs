const fs = require('fs');

const newPDCATab = `
export function PDCATab({ user, setToast, onUserUpdate }) {
  const mentees = user?.mentorProfile?.assignedTeachers || [];
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);

  // Forms
  const [planForm, setPlanForm] = useState({ menteeId: mentees[0]?._id || "", planTitle: "", plan: "" });
  const [checkForm, setCheckForm] = useState({ cycleId: "", checkFeedback: "", cycleInfo: null });
  const [submitting, setSubmitting] = useState(false);

  const fetchCycles = () => {
    setLoading(true);
    getPDCACycles()
      .then(res => setHistory(res.cycles || []))
      .catch(err => console.error("Failed to fetch PDCA", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const handlePlanSubmit = async (e) => {
    e.preventDefault();
    if (!planForm.menteeId || !planForm.plan || !planForm.planTitle) {
      setToast?.({ msg: "Please fill out all plan fields.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const cyclesForMentee = history.filter(h => (h.menteeId?._id || h.menteeId) === planForm.menteeId);
      const cycleNumber = cyclesForMentee.length + 1;
      await submitPDCAPlan(planForm.menteeId, planForm.plan, cycleNumber, planForm.planTitle);
      setToast?.({ msg: "Plan assigned successfully!", type: "success" });
      setPlanForm({ ...planForm, planTitle: "", plan: "" });
      setIsPlanModalOpen(false);
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to assign plan.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const openCheckModal = (cycle) => {
    setCheckForm({ cycleId: cycle._id, checkFeedback: "", cycleInfo: cycle });
    setIsCheckModalOpen(true);
  };

  const handleCheckSubmit = async (e) => {
    e.preventDefault();
    if (!checkForm.checkFeedback) {
      setToast?.({ msg: "Please write your review.", type: "error" });
      return;
    }
    setSubmitting(true);
    try {
      await submitPDCACheck(checkForm.cycleId, checkForm.checkFeedback);
      setToast?.({ msg: "Check submitted successfully!", type: "success" });
      setCheckForm({ cycleId: "", checkFeedback: "", cycleInfo: null });
      setIsCheckModalOpen(false);
      fetchCycles();
    } catch (err) {
      setToast?.({ msg: err.message || "Failed to submit check.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const statusMeta = (status) => {
    switch(status) {
      case "planned": return { label: "Planned (Awaiting Do)", bg: "#e0e7ff", color: "#4338ca", icon: "📋" };
      case "do_submitted": return { label: "Do Submitted (Needs Review)", bg: "#fef3c7", color: "#b45309", icon: "⚡" };
      case "checked": return { label: "Checked (Awaiting Act)", bg: "#d1fae5", color: "#059669", icon: "✅" };
      case "completed": return { label: "Completed", bg: "#f3f4f6", color: "#374151", icon: "🎯" };
      default: return { label: status, bg: "#f1f5f9", color: "#475569", icon: "📌" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #4f46e5, #3b82f6)", padding: "30px 24px", borderRadius: 16, color: "white", boxShadow: "0 10px 25px rgba(59, 130, 246, 0.2)" }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Growth Cycles (PDCA)</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>Assign plans and monitor teacher progress</p>
        </div>
        <button onClick={() => setIsPlanModalOpen(true)} style={{ background: "white", color: "#4f46e5", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", display: "flex", gap: 8, alignItems: "center" }}>
          <span>+</span> Assign New Plan
        </button>
      </div>

      <SectionCard title="🔄 Active & Past Cycles">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading...</div>
        ) : history.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1" }}>
            No Growth Cycles created yet. Click "Assign New Plan" to start.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {history.map(item => {
              const meta = statusMeta(item.status);
              return (
                <div key={item._id} style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: 12, transition: "transform 0.2s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #f1f5f9", paddingBottom: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18 }}>{meta.icon}</span>
                        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Cycle {item.cycleNumber}: {item.planTitle}</h4>
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Mentee: {item.menteeId?.name || "Unknown"}</div>
                    </div>
                    <span style={{ background: meta.bg, color: meta.color, padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>{meta.label}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 13 }}>
                    <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, borderLeft: "3px solid #6366f1" }}>
                      <strong style={{ display: "block", color: "#4f46e5", marginBottom: 4 }}>Plan</strong>
                      <div style={{ color: "#334155", whiteSpace: "pre-wrap" }}>{item.planText || item.plan}</div>
                    </div>
                    
                    {item.doText && (
                      <div style={{ background: "#fffbeb", padding: 12, borderRadius: 8, borderLeft: "3px solid #f59e0b" }}>
                        <strong style={{ display: "block", color: "#b45309", marginBottom: 4 }}>Do (Action Taken)</strong>
                        <div style={{ color: "#78350f", whiteSpace: "pre-wrap" }}>{item.doText}</div>
                      </div>
                    )}
                  </div>

                  {item.checkFeedback && (
                    <div style={{ background: "#ecfdf5", padding: 12, borderRadius: 8, borderLeft: "3px solid #10b981", fontSize: 13 }}>
                      <strong style={{ display: "block", color: "#047857", marginBottom: 4 }}>Check (Your Review)</strong>
                      <div style={{ color: "#065f46", whiteSpace: "pre-wrap" }}>{item.checkFeedback}</div>
                    </div>
                  )}

                  {item.actText && (
                    <div style={{ background: "#f3f4f6", padding: 12, borderRadius: 8, borderLeft: "3px solid #6b7280", fontSize: 13 }}>
                      <strong style={{ display: "block", color: "#374151", marginBottom: 4 }}>Act (Teacher's Next Steps)</strong>
                      <div style={{ color: "#4b5563", whiteSpace: "pre-wrap" }}>{item.actText}</div>
                    </div>
                  )}

                  {item.status === "do_submitted" && (
                    <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                      <button onClick={() => openCheckModal(item)} style={{ background: "#10b981", color: "white", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)" }}>
                        Review & Check Output
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* MODALS */}
      {isPlanModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 24, padding: 32, width: "100%", maxWidth: 550, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}><span style={{background: "#e0e7ff", color: "#4338ca", padding: "4px 10px", borderRadius: 8}}>P</span> Assign Growth Plan</h3>
            <form onSubmit={handlePlanSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ ...S.label, color: "#475569" }}>Select Mentee</label>
                <select style={S.input} value={planForm.menteeId} onChange={e => setPlanForm({...planForm, menteeId: e.target.value})} required>
                  {mentees.map(m => <option key={m._id} value={m._id}>{m.name || "Unknown Fellow"}</option>)}
                </select>
                {mentees.length === 0 && <span style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>No mentees assigned yet. Claim a fellow first.</span>}
              </div>
              <div>
                <label style={{ ...S.label, color: "#475569" }}>Plan Title</label>
                <input style={S.input} type="text" value={planForm.planTitle} onChange={e => setPlanForm({...planForm, planTitle: e.target.value})} placeholder="e.g. Improve Classroom Engagement" required />
              </div>
              <div>
                <label style={{ ...S.label, color: "#475569" }}>Objective & Strategy (Plan)</label>
                <textarea style={{ ...S.input, minHeight: 100 }} value={planForm.plan} onChange={e => setPlanForm({...planForm, plan: e.target.value})} placeholder="What is the goal? What is the strategy?" required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setIsPlanModalOpen(false)} style={{ background: "transparent", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: 10, color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={submitting || !planForm.menteeId} style={{ background: "#4f46e5", color: "white", border: "none", padding: "10px 24px", borderRadius: 10, fontWeight: 700, cursor: "pointer", opacity: (submitting || !planForm.menteeId) ? 0.6 : 1 }}>
                  {submitting ? "Assigning..." : "Assign Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCheckModalOpen && checkForm.cycleInfo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 24, padding: 32, width: "100%", maxWidth: 600, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}><span style={{background: "#d1fae5", color: "#059669", padding: "4px 10px", borderRadius: 8}}>C</span> Review & Check Output</h3>
            
            <div style={{ background: "#f8fafc", padding: 16, borderRadius: 12, marginBottom: 16, border: "1px solid #e2e8f0" }}>
              <strong style={{ color: "#4f46e5", fontSize: 12, textTransform: "uppercase" }}>Original Plan</strong>
              <div style={{ fontSize: 14, color: "#334155", marginTop: 4, whiteSpace: "pre-wrap" }}>{checkForm.cycleInfo.planText || checkForm.cycleInfo.plan}</div>
            </div>

            <div style={{ background: "#fffbeb", padding: 16, borderRadius: 12, marginBottom: 20, border: "1px solid #fde68a" }}>
              <strong style={{ color: "#b45309", fontSize: 12, textTransform: "uppercase" }}>Teacher's Do Output</strong>
              <div style={{ fontSize: 14, color: "#78350f", marginTop: 4, whiteSpace: "pre-wrap" }}>{checkForm.cycleInfo.doText}</div>
            </div>

            <form onSubmit={handleCheckSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ ...S.label, color: "#475569" }}>Check Feedback (Results & Observations)</label>
                <textarea style={{ ...S.input, minHeight: 120, borderColor: "#10b981" }} value={checkForm.checkFeedback} onChange={e => setCheckForm({...checkForm, checkFeedback: e.target.value})} placeholder="What were the outcomes? Provide feedback to the teacher..." required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                <button type="button" onClick={() => setIsCheckModalOpen(false)} style={{ background: "transparent", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: 10, color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ background: "#10b981", color: "white", border: "none", padding: "10px 24px", borderRadius: 10, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? "Submitting..." : "Submit Check"}
                </button>
              </div>
            </form>
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
