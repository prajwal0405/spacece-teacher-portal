import React, { useState, useEffect } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const DELIVERY_MODES = ["Bootcamp", "Field Visit", "Online", "Roleplay", "Peer Learning", "Workshop"];

export default function MentorCurriculumTab({ user, setToast }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "builder"
  
  // List view filters & search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "published" | "draft"
  const [sortBy, setSortBy] = useState("updatedAt"); // "updatedAt" | "title" | "duration"
  
  // Builder state
  const [activePlan, setActivePlan] = useState(null);
  const [phases, setPhases] = useState([]);
  const [builderTab, setBuilderTab] = useState("builder"); // "builder" | "overview" | "assign" | "settings"
  const [saveStatus, setSaveStatus] = useState("Saved ✓");
  const [expandedSemesters, setExpandedSemesters] = useState({});

  // Modals & Forms
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({ title: "", description: "", numSemesters: 4 });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [bulkImportPhaseId, setBulkImportPhaseId] = useState("");

  const [mentees, setMentees] = useState([]);
  const [selectedFellowIds, setSelectedFellowIds] = useState([]);

  // Manual Advancement Modal state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceSourcePhase, setAdvanceSourcePhase] = useState(null);
  const [advanceTargetPhase, setAdvanceTargetPhase] = useState(null);
  const [fellowProgressList, setFellowProgressList] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const token = localStorage.getItem("spaceece_auth_token");

  useEffect(() => {
    fetchPlans();
    fetchMentees();
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch curriculum assignments", err);
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch curriculum plans", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhases = async (planId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/plans/${planId}/phases`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPhases(data || []);
        // Expand all semesters by default
        const exp = {};
        (data || []).forEach(p => exp[p._id] = true);
        setExpandedSemesters(exp);
      }
    } catch (err) {
      console.error("Failed to fetch plan phases", err);
    }
  };

  const fetchMentees = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/fellows`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMentees(data.fellows || []);
      }
    } catch (err) {
      console.error("Failed to fetch mentees", err);
    }
  };

  const handleSeedUmangPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/seed-umang`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setToast?.({ msg: "Loaded UMANG Fellows Master 4-Semester Plan!", type: "success" });
        await fetchPlans();
        if (data.plan) {
          await openBuilder(data.plan);
        }
      }
    } catch (err) {
      setToast?.({ msg: "Failed to seed UMANG plan", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlanForm.title.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newPlanForm),
      });
      if (res.ok) {
        const data = await res.json();
        setToast?.({ msg: "Curriculum plan created successfully!", type: "success" });
        setShowNewPlanModal(false);
        setNewPlanForm({ title: "", description: "", numSemesters: 4 });
        await fetchPlans();
        openBuilder(data.plan || data);
      }
    } catch (err) {
      setToast?.({ msg: "Failed to create plan", type: "error" });
    }
  };

  const openBuilder = async (plan) => {
    setActivePlan(plan);
    setSelectedFellowIds((plan.assignedFellows || []).map(f => typeof f === "object" ? f._id : f));
    await fetchPhases(plan._id);
    setView("builder");
    setBuilderTab("builder");
  };

  const handleUpdatePlanMeta = async (updates) => {
    if (!activePlan) return;
    const updatedPlan = { ...activePlan, ...updates };
    setActivePlan(updatedPlan);
    setSaveStatus("Saving...");
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/plans/${activePlan._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const saved = await res.json();
        setActivePlan(saved);
        setSaveStatus("Saved ✓");
        fetchPlans();
      }
    } catch (err) {
      setSaveStatus("Error saving");
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this curriculum plan? This action cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/plans/${planId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setToast?.({ msg: "Plan deleted successfully", type: "success" });
        if (activePlan?._id === planId) setView("list");
        fetchPlans();
      }
    } catch (err) {
      setToast?.({ msg: "Failed to delete plan", type: "error" });
    }
  };

  // Phase & Module operations
  const handleUpdatePhase = async (phaseId, phaseUpdates) => {
    setSaveStatus("Saving...");
    const updatedPhases = phases.map(p => p._id === phaseId ? { ...p, ...phaseUpdates } : p);
    setPhases(updatedPhases);

    try {
      const targetPhase = updatedPhases.find(p => p._id === phaseId);
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/phases/${phaseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(targetPhase),
      });
      if (res.ok) {
        setSaveStatus("Saved ✓");
      }
    } catch (err) {
      setSaveStatus("Error saving phase");
    }
  };

  const handleAddModule = (phaseId) => {
    const phase = phases.find(p => p._id === phaseId);
    if (!phase) return;

    const newModule = {
      title: "New Module Title",
      modeOfDelivery: ["Bootcamp"],
      deliverables: ["Observation Notes"],
      assessmentMethods: ["Mentor Review"],
      durationWeeks: 4,
      orderIndex: (phase.modules || []).length
    };

    const updatedModules = [...(phase.modules || []), newModule];
    handleUpdatePhase(phaseId, { modules: updatedModules });
  };

  const handleAddSemesterPhase = async () => {
    if (!activePlan) return;
    const nextSemNumber = phases.length + 1;
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/plans/${activePlan._id}/phases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          phaseNumber: nextSemNumber,
          semester: `Semester ${nextSemNumber}`,
          title: `Semester ${nextSemNumber}: Advanced Competencies`,
          modules: []
        }),
      });
      if (res.ok) {
        await fetchPhases(activePlan._id);
        setToast?.({ msg: `Added Semester ${nextSemNumber}`, type: "success" });
      }
    } catch (err) {
      setToast?.({ msg: "Failed to add semester phase", type: "error" });
    }
  };

  function parseBulkModuleText(text, startingOrderIndex = 0) {
    if (!text || !text.trim()) return [];
    const lines = text.split("\n").filter(l => l.trim());

    return lines.map((line, idx) => {
      let parts = [];

      if (line.includes("\t")) {
        parts = line.split("\t");
      } else if (line.includes("|")) {
        parts = line.split("|");
      } else if (line.split(/\s{2,}/).length > 1) {
        parts = line.split(/\s{2,}/);
      } else if (line.includes(",")) {
        parts = line.split(",");
      } else {
        parts = [line];
      }

      const title = parts[0]?.trim() || `Imported Module ${idx + 1}`;
      const rawDelivery = parts[1]?.trim() || "";
      const rawDeliverables = parts[2]?.trim() || "";
      const rawAssessment = parts[3]?.trim() || "";

      // Parse Delivery Modes
      let modes = [];
      if (rawDelivery) {
        modes = rawDelivery.split(/[\/,;|]/).map(s => s.trim()).filter(Boolean);
      }
      if (modes.length === 0) modes = ["Bootcamp"];

      // Parse Deliverables
      let deliverables = [];
      if (rawDeliverables) {
        deliverables = rawDeliverables.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      }
      if (deliverables.length === 0) deliverables = ["Deliverable Notes"];

      // Parse Assessment Methods
      let assessments = [];
      if (rawAssessment) {
        assessments = rawAssessment.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      }
      if (assessments.length === 0) assessments = ["Mentor Observation"];

      return {
        title,
        modeOfDelivery: modes,
        deliverables: deliverables,
        assessmentMethods: assessments,
        durationWeeks: 4,
        orderIndex: startingOrderIndex + idx
      };
    });
  }

  const handleBulkImport = (phaseId) => {
    if (!bulkImportText.trim() || !phaseId) return;
    const phase = phases.find(p => p._id === phaseId);
    if (!phase) return;

    const importedModules = parseBulkModuleText(bulkImportText, (phase.modules || []).length);
    if (importedModules.length === 0) return;

    const updatedModules = [...(phase.modules || []), ...importedModules];
    handleUpdatePhase(phaseId, { modules: updatedModules });
    setShowBulkImportModal(false);
    setBulkImportText("");
    setToast?.({ msg: `Successfully imported ${importedModules.length} modules!`, type: "success" });
  };

  const handleAssignFellowsToPlan = async () => {
    if (!activePlan) return;
    try {
      await handleUpdatePlanMeta({ assignedFellows: selectedFellowIds });
      for (const fellowId of selectedFellowIds) {
        await fetch(`${API_BASE_URL}/api/mentor/curriculum/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ planId: activePlan._id, fellowId }),
        });
      }
      setToast?.({ msg: `Plan assigned to ${selectedFellowIds.length} mentees!`, type: "success" });
      setShowAssignModal(false);
      await fetchAssignments();
    } catch (err) {
      setToast?.({ msg: "Failed to assign plan", type: "error" });
    }
  };

  const handleOpenAdvanceModal = async (sourcePhase, targetPhase) => {
    setAdvanceSourcePhase(sourcePhase);
    setAdvanceTargetPhase(targetPhase);
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/plans/${activePlan._id}/fellow-progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.fellowsProgress || [];
        setFellowProgressList(list);
        const eligible = list.filter(f => f.isEligible).map(f => f.fellowId);
        setAdvanceSelectedFellowIds(eligible);
      }
    } catch (err) {
      console.error("Failed to fetch fellow progress", err);
    }
    setShowAdvanceModal(true);
  };

  const handleConfirmAdvanceFellows = async () => {
    if (!advanceTargetPhase || advanceSelectedFellowIds.length === 0) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/mentor/curriculum/plans/${activePlan._id}/advance-fellows`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sourcePhaseId: advanceSourcePhase?._id,
          targetPhaseId: advanceTargetPhase._id,
          fellowIds: advanceSelectedFellowIds,
        }),
      });
      if (res.ok) {
        setToast?.({ msg: `Advanced ${advanceSelectedFellowIds.length} fellows to ${advanceTargetPhase.semester}!`, type: "success" });
        setShowAdvanceModal(false);
        await fetchPhases(activePlan._id);
      }
    } catch (err) {
      setToast?.({ msg: "Failed to advance fellows", type: "error" });
    }
  };

  // Filtered & Sorted Plans
  const filteredPlans = plans.filter(p => {
    const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "duration") return (b.durationMonths || 12) - (a.durationMonths || 12);
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });

  const publishedCount = plans.filter(p => p.status === "published").length;
  const draftCount = plans.filter(p => p.status === "draft").length;
  const totalAssignedFellows = new Set(plans.flatMap(p => (p.assignedFellows || []).map(f => typeof f === "object" ? f._id : f))).size;

  return (
    <div style={{ animation: "fadeIn 0.3s ease", color: "#0f172a", fontFamily: "inherit" }}>
      
      {/* ========================================================= */}
      {/* SCREEN 1: CURRICULUM PLANS (LIST VIEW)                   */}
      {/* ========================================================= */}
      {view === "list" && (
        <div>
          {/* Header & Title */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                  Mentor Workspace
                </span>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.5px" }}>Curriculum Management</h1>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Build, publish, and assign multi-semester training frameworks for your fellows.</p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button 
                onClick={handleSeedUmangPlan}
                style={{
                  padding: "9px 15px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                🚀 Load UMANG Master Plan
              </button>
              <button 
                onClick={() => setShowNewPlanModal(true)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                + Create New Plan
              </button>
            </div>
          </div>

          {/* Interactive Stat Cards Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { id: "all", label: "Total Plans", val: plans.length, sub: "All frameworks", color: "#2563eb", bg: "#eff6ff" },
              { id: "published", label: "Published Plans", val: publishedCount, sub: "Active & live", color: "#059669", bg: "#ecfdf5" },
              { id: "draft", label: "Draft Plans", val: draftCount, sub: "In development", color: "#d97706", bg: "#fffbeb" },
              { id: "assigned", label: "Mentees Enrolled", val: totalAssignedFellows, sub: "Active fellows", color: "#7c3aed", bg: "#f5f3ff" },
            ].map(st => (
              <div 
                key={st.id}
                onClick={() => { if (st.id !== "assigned") setStatusFilter(st.id); }}
                style={{
                  background: "#ffffff",
                  padding: "16px 18px",
                  borderRadius: 12,
                  border: statusFilter === st.id ? `2px solid ${st.color}` : "1px solid #e2e8f0",
                  cursor: st.id !== "assigned" ? "pointer" : "default",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{st.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: st.bg, color: st.color, padding: "2px 6px", borderRadius: 4 }}>● {st.sub}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{st.val}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20, background: "#ffffff", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div style={{ position: "relative", width: 280 }}>
                <span style={{ position: "absolute", left: 10, top: 8, color: "#94a3b8", fontSize: 14 }}>🔍</span>
                <input 
                  type="text" 
                  placeholder="Search plans by title or keyword..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px 7px 32px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Status Filter Chips */}
              <div style={{ display: "flex", gap: 6 }}>
                {["all", "published", "draft"].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: "1px solid",
                      borderColor: statusFilter === st ? "#0f172a" : "#e2e8f0",
                      background: statusFilter === st ? "#0f172a" : "#ffffff",
                      color: statusFilter === st ? "#ffffff" : "#475569",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "capitalize"
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Sort:</span>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, fontWeight: 600, outline: "none" }}
              >
                <option value="updatedAt">Last Edited</option>
                <option value="title">Plan Title</option>
                <option value="duration">Duration</option>
              </select>
            </div>
          </div>

          {/* Plan Cards Grid */}
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>Loading curriculum plans...</div>
          ) : filteredPlans.length === 0 ? (
            <div style={{ background: "#ffffff", border: "1px dashed #cbd5e1", borderRadius: 12, padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📚</div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>No Curriculum Plans Found</h3>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>Load the pre-populated UMANG Master Plan or create your custom framework.</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                <button onClick={handleSeedUmangPlan} style={{ padding: "9px 16px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  🚀 Load UMANG Master Plan
                </button>
                <button onClick={() => setShowNewPlanModal(true)} style={{ padding: "9px 16px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  + Create New Plan
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
              {filteredPlans.map(plan => {
                const isPub = plan.status === "published";
                const numSem = plan.numSemesters || 4;
                const durMonths = plan.durationMonths || numSem * 6;
                const fellowsCount = (plan.assignedFellows || []).length;

                return (
                  <div 
                    key={plan._id}
                    style={{
                      background: "#ffffff",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      padding: 20,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      {/* Top Row: Status Tag + Duration */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: isPub ? "#d1fae5" : "#fef3c7", color: isPub ? "#047857" : "#b45309", padding: "2px 8px", borderRadius: 4 }}>
                          {isPub ? "● Published" : "● Draft"}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                          ⏱ {durMonths} Months ({numSem} Semesters)
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{plan.title}</h3>
                      <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b", lineHeight: 1.4, height: 34, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {plan.description || "Integrated ECCE & Leadership Development Framework for fellows."}
                      </p>

                      {/* Skill Themes */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                        {(plan.skillThemes || ["Child Development", "Parent Engagement"]).map((st, idx) => (
                          <span key={idx} style={{ fontSize: 10, fontWeight: 600, background: "#f8fafc", color: "#475569", padding: "3px 8px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                            {st}
                          </span>
                        ))}
                      </div>

                      {/* Assigned Mentees Avatar Stack */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid #f1f5f9", marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Mentees Enrolled:</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", background: "#f1f5f9", padding: "2px 8px", borderRadius: 12 }}>
                            {fellowsCount}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>
                          Edited {new Date(plan.updatedAt || plan.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button 
                        onClick={() => openBuilder(plan)}
                        style={{
                          flex: 1,
                          padding: "10px 14px",
                          background: "#0f172a",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6
                        }}
                      >
                        Manage Plan (Builder) →
                      </button>
                      <button 
                        onClick={() => { setActivePlan(plan); setSelectedFellowIds((plan.assignedFellows || []).map(f => typeof f === "object" ? f._id : f)); setShowAssignModal(true); }}
                        style={{
                          padding: "10px 12px",
                          background: "#ffffff",
                          color: "#0f172a",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                        title="Assign Fellows"
                      >
                        👥 Assign
                      </button>
                      <button 
                        onClick={() => handleDeletePlan(plan._id)}
                        style={{
                          padding: "10px 12px",
                          background: "#fef2f2",
                          color: "#ef4444",
                          border: "1px solid #fecaca",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                        title="Delete Plan"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Assigned Fellows Progress Tracker Roster */}
          <div style={{ marginTop: 32, background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>📊 Assigned Mentees Curriculum Progress</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Track real-time curriculum completion & active phase for assigned fellows.</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, background: "#eff6ff", color: "#2563eb", padding: "4px 10px", borderRadius: 6 }}>
                Total Assignments: {assignments.length}
              </span>
            </div>

            {assignments.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 13, background: "#f8fafc", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
                No fellows assigned to any curriculum plan yet. Select a plan above and click <strong>👥 Assign</strong> to enroll fellows.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <th style={{ padding: "10px 12px", borderRadius: "6px 0 0 6px" }}>Teacher / Fellow</th>
                      <th style={{ padding: "10px 12px" }}>Assigned Curriculum</th>
                      <th style={{ padding: "10px 12px" }}>Active Phase / Semester</th>
                      <th style={{ padding: "10px 12px" }}>Progress</th>
                      <th style={{ padding: "10px 12px" }}>Status</th>
                      <th style={{ padding: "10px 12px", borderRadius: "0 6px 6px 0", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(assign => {
                      const fellowName = assign.fellow?.name || "Teacher/Fellow";
                      const fellowEmail = assign.fellow?.email || "";
                      const planTitle = assign.plan?.title || "Curriculum Framework";
                      const phaseTitle = assign.activePhase ? `${assign.activePhase.semester}: ${assign.activePhase.title}` : "Semester 1 (Active)";
                      const pct = assign.progressPercent || 0;
                      const completedCount = (assign.completedItems || []).length;

                      return (
                        <tr key={assign._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>
                                {fellowName[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: "#0f172a" }}>{fellowName}</div>
                                <div style={{ fontSize: 11, color: "#64748b" }}>{fellowEmail}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px", fontWeight: 700, color: "#1e293b" }}>{planTitle}</td>
                          <td style={{ padding: "12px" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, background: "#f1f5f9", color: "#475569", padding: "3px 8px", borderRadius: 4 }}>
                              {phaseTitle}
                            </span>
                          </td>
                          <td style={{ padding: "12px", width: 180 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 7, background: "#e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#059669" : "#2563eb", borderRadius: 10, transition: "width 0.3s" }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", width: 38 }}>{pct}%</span>
                            </div>
                            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{completedCount} items completed</div>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{ fontSize: 11, fontWeight: 800, background: pct >= 100 ? "#d1fae5" : "#eff6ff", color: pct >= 100 ? "#047857" : "#1d4ed8", padding: "2px 8px", borderRadius: 4 }}>
                              {pct >= 100 ? "✓ Completed" : "● Active"}
                            </span>
                          </td>
                          <td style={{ padding: "12px", textAlign: "right" }}>
                            <button
                              onClick={() => {
                                const targetPlan = plans.find(p => p._id === assign.plan?._id);
                                if (targetPlan) {
                                  setActivePlan(targetPlan);
                                  setSelectedFellowIds((targetPlan.assignedFellows || []).map(f => typeof f === "object" ? f._id : f));
                                  setShowAssignModal(true);
                                }
                              }}
                              style={{ padding: "5px 10px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}
                            >
                              ⚙️ Manage Assignment
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SCREEN 2: SCROLLABLE DOCUMENT-STYLE BUILDER ("MANAGE PLAN") */}
      {/* ========================================================= */}
      {view === "builder" && activePlan && (
        <div>
          {/* Header Navigation Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, background: "#ffffff", padding: "14px 20px", borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button 
                onClick={() => setView("list")}
                style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", cursor: "pointer" }}
              >
                ← Back to Plans
              </button>
              
              {/* Inline Editable Title */}
              <div>
                <input 
                  type="text" 
                  value={activePlan.title}
                  onChange={e => handleUpdatePlanMeta({ title: e.target.value })}
                  style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", border: "none", outline: "none", background: "transparent", width: 360 }}
                />
                <div style={{ fontSize: 11, color: "#64748b", display: "flex", gap: 12, marginTop: 2 }}>
                  <span>⏱ {activePlan.durationMonths || 24} Months ({phases.length} Semesters)</span>
                  <span>👥 {selectedFellowIds.length} Mentees Enrolled</span>
                  <span style={{ color: "#059669", fontWeight: 700 }}>{saveStatus}</span>
                </div>
              </div>
            </div>

            {/* Status Switcher & Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <select 
                value={activePlan.status}
                onChange={e => handleUpdatePlanMeta({ status: e.target.value })}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 12,
                  fontWeight: 700,
                  background: activePlan.status === "published" ? "#d1fae5" : "#fef3c7",
                  color: activePlan.status === "published" ? "#047857" : "#b45309",
                  outline: "none"
                }}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>

              <button 
                onClick={() => setShowAssignModal(true)}
                style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                👥 Assign Mentees
              </button>
            </div>
          </div>

          {/* Builder Sub-Tabs */}
          <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #e2e8f0", marginBottom: 20 }}>
            {[
              { id: "builder", label: "📝 Curriculum Builder (Semesters & Modules)" },
              { id: "overview", label: "📋 Plan Overview & Skill Themes" },
              { id: "assign", label: "👥 Assigned Mentees" },
              { id: "settings", label: "⚙️ Settings & Versioning" },
            ].map(tb => (
              <button 
                key={tb.id}
                onClick={() => setBuilderTab(tb.id)}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: builderTab === tb.id ? "3px solid #0f172a" : "3px solid transparent",
                  background: "transparent",
                  color: builderTab === tb.id ? "#0f172a" : "#64748b",
                  fontSize: 13,
                  fontWeight: builderTab === tb.id ? 800 : 600,
                  cursor: "pointer"
                }}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {/* TAB 1: CURRICULUM BUILDER (DOCUMENT STYLE ACCORDIONS) */}
          {builderTab === "builder" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {phases.map((phase, pIdx) => {
                const isExp = expandedSemesters[phase._id] !== false;

                return (
                  <div key={phase._id} style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    {/* Semester Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isExp ? 12 : 0, paddingBottom: isExp ? 12 : 0, borderBottom: isExp ? "1px solid #f1f5f9" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button 
                          onClick={() => setExpandedSemesters({ ...expandedSemesters, [phase._id]: !isExp })}
                          style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "#64748b" }}
                        >
                          {isExp ? "▼" : "▶"}
                        </button>
                        <span style={{ fontSize: 11, fontWeight: 800, background: "#0f172a", color: "#ffffff", padding: "3px 8px", borderRadius: 4 }}>
                          {phase.semester || `Semester ${pIdx + 1}`}
                        </span>
                        <input 
                          type="text" 
                          value={phase.title}
                          onChange={e => handleUpdatePhase(phase._id, { title: e.target.value })}
                          style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", border: "none", outline: "none", width: 340 }}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button 
                          onClick={() => { setBulkImportPhaseId(phase._id); setShowBulkImportModal(true); }}
                          style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 11, fontWeight: 700, color: "#475569", cursor: "pointer" }}
                        >
                          📋 Bulk Import
                        </button>
                        <button 
                          onClick={() => handleAddModule(phase._id)}
                          style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#2563eb", fontSize: 11, fontWeight: 700, color: "#ffffff", cursor: "pointer" }}
                        >
                          + Add Module
                        </button>
                      </div>
                    </div>

                    {/* Schedule & Manual Advance Row */}
                    {isExp && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "8px 12px", borderRadius: 8, marginBottom: 14, border: "1px solid #e2e8f0", fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 700, color: "#64748b" }}>📅 Starts:</span>
                            <input 
                              type="date"
                              value={phase.startDate ? new Date(phase.startDate).toISOString().slice(0, 10) : ""}
                              onChange={e => handleUpdatePhase(phase._id, { startDate: e.target.value })}
                              style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 11, outline: "none" }}
                            />
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 700, color: "#64748b" }}>Ends:</span>
                            <input 
                              type="date"
                              value={phase.endDate ? new Date(phase.endDate).toISOString().slice(0, 10) : ""}
                              onChange={e => handleUpdatePhase(phase._id, { endDate: e.target.value })}
                              style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 11, outline: "none" }}
                            />
                          </div>

                          <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "2px 8px", borderRadius: 4 }}>
                            ● {phase.status || "active"}
                          </span>
                        </div>

                        {/* Manual Advance Action Button */}
                        {pIdx < phases.length - 1 && (
                          <button
                            onClick={() => handleOpenAdvanceModal(phase, phases[pIdx + 1])}
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
                            Move fellows to {phases[pIdx + 1].semester} →
                          </button>
                        )}
                      </div>
                    )}

                    {/* Semester Modules List */}
                    {isExp && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {(phase.modules || []).length === 0 ? (
                          <div style={{ background: "#f8fafc", padding: 20, borderRadius: 8, textAlign: "center", border: "1px dashed #cbd5e1", fontSize: 12, color: "#64748b" }}>
                            No modules in this semester yet. Click <strong>+ Add Module</strong> or <strong>Bulk Import</strong> to populate.
                          </div>
                        ) : (
                          (phase.modules || []).map((mod, mIdx) => (
                            <div key={mIdx} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                                  <span style={{ color: "#94a3b8", cursor: "grab", fontSize: 14 }}>⋮⋮</span>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Module {mIdx + 1}:</span>
                                  <input 
                                    type="text"
                                    value={mod.title}
                                    onChange={e => {
                                      const updatedMods = [...phase.modules];
                                      updatedMods[mIdx].title = e.target.value;
                                      handleUpdatePhase(phase._id, { modules: updatedMods });
                                    }}
                                    style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 8px", width: 300, outline: "none" }}
                                  />
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 11, color: "#64748b" }}>Duration:</span>
                                  <input 
                                    type="number"
                                    value={mod.durationWeeks || 4}
                                    onChange={e => {
                                      const updatedMods = [...phase.modules];
                                      updatedMods[mIdx].durationWeeks = Number(e.target.value);
                                      handleUpdatePhase(phase._id, { modules: updatedMods });
                                    }}
                                    style={{ width: 45, padding: "3px 6px", fontSize: 12, borderRadius: 4, border: "1px solid #cbd5e1" }}
                                  />
                                  <span style={{ fontSize: 11, color: "#64748b" }}>Wks</span>

                                  <button 
                                    onClick={() => {
                                      const updatedMods = phase.modules.filter((_, idx) => idx !== mIdx);
                                      handleUpdatePhase(phase._id, { modules: updatedMods });
                                    }}
                                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 13 }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              {/* Delivery Mode Tags */}
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
                                <div>
                                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>
                                    Mode of Delivery
                                  </label>
                                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                    {DELIVERY_MODES.map(mode => {
                                      const isSelected = (mod.modeOfDelivery || []).includes(mode);
                                      return (
                                        <button
                                          key={mode}
                                          onClick={() => {
                                            const current = mod.modeOfDelivery || [];
                                            const next = isSelected ? current.filter(m => m !== mode) : [...current, mode];
                                            const updatedMods = [...phase.modules];
                                            updatedMods[mIdx].modeOfDelivery = next;
                                            handleUpdatePhase(phase._id, { modules: updatedMods });
                                          }}
                                          style={{
                                            padding: "2px 6px",
                                            borderRadius: 4,
                                            border: "1px solid",
                                            borderColor: isSelected ? "#2563eb" : "#cbd5e1",
                                            background: isSelected ? "#eff6ff" : "#ffffff",
                                            color: isSelected ? "#1d4ed8" : "#64748b",
                                            fontSize: 10,
                                            fontWeight: 600,
                                            cursor: "pointer"
                                          }}
                                        >
                                          {mode}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Deliverables */}
                                <div>
                                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>
                                    Deliverables
                                  </label>
                                  <input 
                                    type="text"
                                    placeholder="Add deliverables (comma separated)..."
                                    value={(mod.deliverables || []).join(", ")}
                                    onChange={e => {
                                      const updatedMods = [...phase.modules];
                                      updatedMods[mIdx].deliverables = e.target.value.split(",").map(s => s.trim());
                                      handleUpdatePhase(phase._id, { modules: updatedMods });
                                    }}
                                    style={{ width: "100%", padding: "4px 8px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1", outline: "none" }}
                                  />
                                </div>

                                {/* Assessment Methods */}
                                <div>
                                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>
                                    Assessment Method
                                  </label>
                                  <input 
                                    type="text"
                                    placeholder="Add assessment method (comma separated)..."
                                    value={(mod.assessmentMethods || []).join(", ")}
                                    onChange={e => {
                                      const updatedMods = [...phase.modules];
                                      updatedMods[mIdx].assessmentMethods = e.target.value.split(",").map(s => s.trim());
                                      handleUpdatePhase(phase._id, { modules: updatedMods });
                                    }}
                                    style={{ width: "100%", padding: "4px 8px", fontSize: 11, borderRadius: 4, border: "1px solid #cbd5e1", outline: "none" }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Semester Phase CTA */}
              <button 
                onClick={handleAddSemesterPhase}
                style={{
                  padding: "14px",
                  borderRadius: 12,
                  border: "2px dashed #cbd5e1",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                + Add Next Semester / Phase
              </button>
            </div>
          )}

          {/* TAB 2: OVERVIEW & SKILL THEMES */}
          {builderTab === "overview" && (
            <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>Framework Overview & Description</h3>
              <textarea 
                value={activePlan.description || ""}
                onChange={e => handleUpdatePlanMeta({ description: e.target.value })}
                placeholder="Provide a detailed overview of the curriculum objectives, target outcomes, and field immersion strategy..."
                style={{ width: "100%", minHeight: 140, padding: 12, fontSize: 13, borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", marginBottom: 20 }}
              />

              <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 800 }}>Integrated Skill Themes</h3>
              <input 
                type="text"
                value={(activePlan.skillThemes || []).join(", ")}
                onChange={e => handleUpdatePlanMeta({ skillThemes: e.target.value.split(",").map(s => s.trim()) })}
                placeholder="Comma separated skill themes (e.g. Child Observation, Parent Engagement, Policy)..."
                style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 8, border: "1px solid #cbd5e1", outline: "none" }}
              />
            </div>
          )}

          {/* TAB 3: ASSIGNED MENTEES */}
          {builderTab === "assign" && (
            <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Enrolled Mentees ({selectedFellowIds.length})</h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Select fellows who are assigned to follow this curriculum plan.</p>
                </div>
                <button onClick={handleAssignFellowsToPlan} style={{ padding: "8px 16px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Save Assignments
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                {mentees.map(m => {
                  const isAssigned = selectedFellowIds.includes(m._id);
                  return (
                    <div 
                      key={m._id}
                      onClick={() => {
                        const next = isAssigned ? selectedFellowIds.filter(id => id !== m._id) : [...selectedFellowIds, m._id];
                        setSelectedFellowIds(next);
                      }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid",
                        borderColor: isAssigned ? "#2563eb" : "#e2e8f0",
                        background: isAssigned ? "#eff6ff" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 12
                      }}
                    >
                      <input type="checkbox" checked={isAssigned} readOnly />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{m.email}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {builderTab === "settings" && (
            <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>Plan Actions</h3>
              <div style={{ display: "flex", gap: 12 }}>
                <button 
                  onClick={() => handleDeletePlan(activePlan._id)}
                  style={{ padding: "10px 18px", background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  🗑️ Delete Plan Permanently
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* NEW PLAN MODAL                                            */}
      {/* ========================================================= */}
      {showNewPlanModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#ffffff", borderRadius: 12, padding: 24, width: 440, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>Create New Curriculum Plan</h3>
            <form onSubmit={handleCreatePlan}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Plan Title *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Early Childhood Educator Immersion Plan"
                  value={newPlanForm.title}
                  onChange={e => setNewPlanForm({ ...newPlanForm, title: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Number of Semesters</label>
                <select 
                  value={newPlanForm.numSemesters}
                  onChange={e => setNewPlanForm({ ...newPlanForm, numSemesters: Number(e.target.value) })}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none" }}
                >
                  <option value={2}>2 Semesters (1 Year / 12 Months)</option>
                  <option value={4}>4 Semesters (2 Years / 24 Months)</option>
                  <option value={6}>6 Semesters (3 Years / 36 Months)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowNewPlanModal(false)} style={{ padding: "8px 14px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: "8px 16px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Create & Open Builder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BULK IMPORT MODAL                                         */}
      {/* ========================================================= */}
      {showBulkImportModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#ffffff", borderRadius: 12, padding: 24, width: 620, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800 }}>📋 Quick Bulk Import Modules</h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>
              Paste lines copied from Word/Excel/Notion. Supports <strong>Tab (\t)</strong>, <strong>Spaces</strong>, <strong>Pipe (|)</strong>, or <strong>Commas</strong>.<br />
              <code>Module Title \t Delivery Mode \t Deliverables \t Assessment</code>
            </p>

            <textarea 
              value={bulkImportText}
              onChange={e => setBulkImportText(e.target.value)}
              placeholder="Induction & Community Entry    Bootcamp/Field Visit    Observation log    Facilitator observation"
              style={{ width: "100%", height: 130, padding: 12, fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", fontFamily: "monospace" }}
            />

            {/* Live Parsed Preview Table */}
            {bulkImportText.trim() && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                  Preview Detected Modules ({parseBulkModuleText(bulkImportText).length}):
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", maxHeight: 180, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                        <th style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0" }}>#</th>
                        <th style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0" }}>Title</th>
                        <th style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0" }}>Mode</th>
                        <th style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0" }}>Deliverables</th>
                        <th style={{ padding: "6px 10px", borderBottom: "1px solid #e2e8f0" }}>Assessment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseBulkModuleText(bulkImportText).map((mod, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ padding: "6px 10px", fontWeight: 700, color: "#0f172a" }}>{mod.title}</td>
                          <td style={{ padding: "6px 10px", color: "#2563eb" }}>{(mod.modeOfDelivery || []).join(", ")}</td>
                          <td style={{ padding: "6px 10px", color: "#475569" }}>{(mod.deliverables || []).join(", ")}</td>
                          <td style={{ padding: "6px 10px", color: "#059669" }}>{(mod.assessmentMethods || []).join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowBulkImportModal(false)} style={{ padding: "8px 14px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
              <button 
                disabled={!bulkImportText.trim()}
                onClick={() => handleBulkImport(bulkImportPhaseId)} 
                style={{ 
                  padding: "8px 16px", 
                  background: bulkImportText.trim() ? "#2563eb" : "#cbd5e1", 
                  color: "#ffffff", 
                  border: "none", 
                  borderRadius: 6, 
                  fontSize: 12, 
                  fontWeight: 700, 
                  cursor: bulkImportText.trim() ? "pointer" : "not-allowed" 
                }}
              >
                Import {parseBulkModuleText(bulkImportText).length} Modules →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ASSIGN FELLOWS MODAL                                      */}
      {/* ========================================================= */}
      {showAssignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#ffffff", borderRadius: 12, padding: 24, width: 480, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800 }}>👥 Assign Plan to Mentees</h3>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b" }}>{activePlan?.title}</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {mentees.map(m => {
                const isChecked = selectedFellowIds.includes(m._id);
                return (
                  <div 
                    key={m._id}
                    onClick={() => {
                      const next = isChecked ? selectedFellowIds.filter(id => id !== m._id) : [...selectedFellowIds, m._id];
                      setSelectedFellowIds(next);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid",
                      borderColor: isChecked ? "#2563eb" : "#e2e8f0",
                      background: isChecked ? "#eff6ff" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10
                    }}
                  >
                    <input type="checkbox" checked={isChecked} readOnly />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{m.name} ({m.email})</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowAssignModal(false)} style={{ padding: "8px 14px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleAssignFellowsToPlan} style={{ padding: "8px 16px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Confirm Assignments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MANUAL FELLOW ADVANCEMENT MODAL                           */}
      {/* ========================================================= */}
      {showAdvanceModal && advanceSourcePhase && advanceTargetPhase && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#ffffff", borderRadius: 12, padding: 24, width: 520, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800 }}>Move fellows from {advanceSourcePhase.semester} → {advanceTargetPhase.semester}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>Select fellows to manually advance to {advanceTargetPhase.title}.</p>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <button onClick={() => setAdvanceSelectedFellowIds(fellowProgressList.filter(f => f.isEligible).map(f => f.fellowId))} style={{ fontSize: 11, fontWeight: 700, background: "none", border: "none", color: "#2563eb", cursor: "pointer" }}>
                Select All Eligible
              </button>
              <button onClick={() => setAdvanceSelectedFellowIds([])} style={{ fontSize: 11, fontWeight: 700, background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                Deselect All
              </button>
            </div>

            {/* Fellow List with Modules Approved Ratio */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto", marginBottom: 20 }}>
              {fellowProgressList.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "#64748b" }}>No mentees currently enrolled on this plan.</div>
              ) : (
                fellowProgressList.map((f) => {
                  const isChecked = advanceSelectedFellowIds.includes(f.fellowId);
                  return (
                    <div
                      key={f.fellowId}
                      onClick={() => {
                        const next = isChecked ? advanceSelectedFellowIds.filter(id => id !== f.fellowId) : [...advanceSelectedFellowIds, f.fellowId];
                        setAdvanceSelectedFellowIds(next);
                      }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid",
                        borderColor: isChecked ? "#2563eb" : "#e2e8f0",
                        background: isChecked ? "#eff6ff" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="checkbox" checked={isChecked} readOnly />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{f.email}</div>
                        </div>
                      </div>

                      <span style={{ fontSize: 11, fontWeight: 700, color: f.isEligible ? "#059669" : "#d97706", background: f.isEligible ? "#d1fae5" : "#fffbeb", padding: "2px 8px", borderRadius: 4 }}>
                        Modules: {f.approvedCount}/{f.moduleCount} approved {f.isEligible ? "✓" : "⚠️"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowAdvanceModal(false)} style={{ padding: "8px 14px", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleConfirmAdvanceFellows} style={{ padding: "8px 16px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Move Selected ({advanceSelectedFellowIds.length}) →
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}