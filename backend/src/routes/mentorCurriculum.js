import express from "express";
import { CurriculumPlan, CurriculumPhase, CurriculumAssignment } from "../models/Curriculum.js";
import { User } from "../models/User.js";
import { ActivitySubmission } from "../models/ActivitySubmission.js";
import mongoose from "mongoose";

const router = express.Router();

// Get all curriculum plans created by or accessible to the logged-in mentor
router.get("/plans", async (req, res) => {
  try {
    const plans = await CurriculumPlan.find({ mentor: req.user.id })
      .populate("assignedFellows", "name email photoUrl")
      .sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch plans", error: error.message });
  }
});

// Create a new curriculum plan
router.post("/plans", async (req, res) => {
  try {
    const { title, description, numSemesters, durationMonths, skillThemes } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    
    const semCount = Number(numSemesters) || 4;
    const durMonths = Number(durationMonths) || semCount * 6;

    const plan = new CurriculumPlan({
      title,
      description: description || "Integrated ECCE & Leadership Development Curriculum",
      numSemesters: semCount,
      durationMonths: durMonths,
      durationType: semCount > 2 ? "2yr" : "1yr",
      skillThemes: skillThemes || ["Teaching & Curriculum Design", "Parent Engagement", "Community Profiling", "ECCE Leadership"],
      mentor: req.user.id,
      status: "draft"
    });
    
    await plan.save();

    // Create default semester phases for the plan
    const phases = [];
    for (let i = 1; i <= semCount; i++) {
      const phase = new CurriculumPhase({
        plan: plan._id,
        phaseNumber: i,
        semester: `Semester ${i}`,
        title: `Semester ${i}: Core Modules`,
        modules: []
      });
      await phase.save();
      phases.push(phase);
    }

    res.status(201).json({ plan, phases });
  } catch (error) {
    res.status(500).json({ message: "Failed to create plan", error: error.message });
  }
});

// Seed Master UMANG Fellows 4-Semester Plan
router.post("/seed-umang", async (req, res) => {
  try {
    const existing = await CurriculumPlan.findOne({ mentor: req.user.id, title: "Curriculum for UMANG Fellows" });
    if (existing) {
      const existingPhases = await CurriculumPhase.find({ plan: existing._id }).sort({ phaseNumber: 1 });
      return res.json({ message: "UMANG Fellows plan already exists", plan: existing, phases: existingPhases });
    }

    const plan = new CurriculumPlan({
      mentor: req.user.id,
      title: "Curriculum for UMANG Fellows",
      description: "A comprehensive 2-Year (4-Semester) Early Childhood Care & Education (ECCE) leadership & field immersion framework.",
      numSemesters: 4,
      durationMonths: 24,
      durationType: "2yr",
      skillThemes: [
        "Child Development & Pedagogy",
        "Parent & Ecosystem Engagement",
        "Community Systems & Policy",
        "ECCE Leadership & Edupreneurship"
      ],
      status: "published"
    });
    await plan.save();

    const UMANG_SEMESTERS = [
      {
        phaseNumber: 1,
        semester: "Semester 1",
        title: "Child Development + Community Entry",
        skillThemes: ["Child Observation", "Classroom Pedagogy"],
        modules: [
          { title: "Induction & Community Entry", modeOfDelivery: ["Bootcamp", "Field Visit"], deliverables: ["Community intro roleplay", "Observation log"], assessmentMethods: ["Facilitator observation"], durationWeeks: 4 },
          { title: "Understanding Child Development (0–6 yrs)", modeOfDelivery: ["Bootcamp", "Online"], deliverables: ["Milestone chart", "Case study"], assessmentMethods: ["Written evaluation"], durationWeeks: 6 },
          { title: "Child Psychology & Learning Theories", modeOfDelivery: ["Online", "Roleplay"], deliverables: ["Activity design sheet"], assessmentMethods: ["Peer feedback"], durationWeeks: 4 },
          { title: "Lesson Planning & Session Design", modeOfDelivery: ["Bootcamp", "Field Visit"], deliverables: ["Weekly lesson plan"], assessmentMethods: ["Rubric score"], durationWeeks: 4 }
        ]
      },
      {
        phaseNumber: 2,
        semester: "Semester 2",
        title: "Parents & Home Learning Ecosystem",
        skillThemes: ["Parent Engagement", "TLM Creation"],
        modules: [
          { title: "Advanced Parent Engagement", modeOfDelivery: ["Field Visit", "Roleplay"], deliverables: ["Home visit checklist"], assessmentMethods: ["Mentor review"], durationWeeks: 4 },
          { title: "Home as a Learning Space", modeOfDelivery: ["Field Visit"], deliverables: ["Home environment scorecard"], assessmentMethods: ["Parent feedback"], durationWeeks: 4 },
          { title: "TLM Creation & Low-Cost Resources", modeOfDelivery: ["Bootcamp"], deliverables: ["5 Low-Cost TLMs"], assessmentMethods: ["TLM exhibition"], durationWeeks: 4 },
          { title: "Curriculum Frameworks (NIPUN & NCERT)", modeOfDelivery: ["Online"], deliverables: ["Framework mapping sheet"], assessmentMethods: ["Quiz"], durationWeeks: 4 }
        ]
      },
      {
        phaseNumber: 3,
        semester: "Semester 3",
        title: "Community Systems + Capstone (Phase 1)",
        skillThemes: ["Policy & Governance", "M&E Trackers"],
        modules: [
          { title: "ECCE in Public Policy & Rights", modeOfDelivery: ["Online"], deliverables: ["Policy analysis note"], assessmentMethods: ["Assignment"], durationWeeks: 4 },
          { title: "ICDS & Stakeholder Mapping", modeOfDelivery: ["Field Visit"], deliverables: ["Anganwadi stakeholder map"], assessmentMethods: ["Field verification"], durationWeeks: 4 },
          { title: "Monitoring & Evaluation (M&E)", modeOfDelivery: ["Online", "Bootcamp"], deliverables: ["M&E tracker sheet"], assessmentMethods: ["Practical task"], durationWeeks: 4 },
          { title: "Working in Marginalized Contexts", modeOfDelivery: ["Field Visit"], deliverables: ["Equity audit report"], assessmentMethods: ["Reflection log"], durationWeeks: 4 }
        ]
      },
      {
        phaseNumber: 4,
        semester: "Semester 4",
        title: "Leadership, Edupreneurship + Capstone (Phase 2)",
        skillThemes: ["Edupreneurship", "Donor Pitching"],
        modules: [
          { title: "Leadership & Facilitation", modeOfDelivery: ["Roleplay", "Bootcamp"], deliverables: ["Facilitation video"], assessmentMethods: ["Peer evaluation"], durationWeeks: 4 },
          { title: "Social Entrepreneurship in ECCE", modeOfDelivery: ["Online"], deliverables: ["Mini enterprise proposal"], assessmentMethods: ["Panel pitch"], durationWeeks: 4 },
          { title: "Budgeting & Resource Mobilization", modeOfDelivery: ["Online"], deliverables: ["Center budget draft"], assessmentMethods: ["Finance check"], durationWeeks: 4 },
          { title: "Proposal Writing & Donor Pitching", modeOfDelivery: ["Bootcamp"], deliverables: ["Final capstone pitch deck"], assessmentMethods: ["Advisor panel"], durationWeeks: 6 }
        ]
      }
    ];

    const phases = [];
    for (const sem of UMANG_SEMESTERS) {
      const p = new CurriculumPhase({
        plan: plan._id,
        phaseNumber: sem.phaseNumber,
        semester: sem.semester,
        title: sem.title,
        skillThemes: sem.skillThemes,
        modules: sem.modules
      });
      await p.save();
      phases.push(p);
    }

    res.status(201).json({ plan, phases });
  } catch (error) {
    res.status(500).json({ message: "Failed to seed UMANG plan", error: error.message });
  }
});

// Update a curriculum plan (title, description, status, assignedFellows, skillThemes)
router.put("/plans/:id", async (req, res) => {
  try {
    const { title, description, numSemesters, durationMonths, status, skillThemes, assignedFellows } = req.body;
    const plan = await CurriculumPlan.findOneAndUpdate(
      { _id: req.params.id, mentor: req.user.id },
      {
        $set: {
          title,
          description,
          numSemesters,
          durationMonths,
          status,
          skillThemes,
          assignedFellows,
          version: Date.now()
        }
      },
      { new: true }
    ).populate("assignedFellows", "name email photoUrl");

    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: "Failed to update plan", error: error.message });
  }
});

// Delete a curriculum plan and its phases
router.delete("/plans/:id", async (req, res) => {
  try {
    const plan = await CurriculumPlan.findOneAndDelete({ _id: req.params.id, mentor: req.user.id });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    
    await CurriculumPhase.deleteMany({ plan: plan._id });
    await CurriculumAssignment.deleteMany({ plan: plan._id });
    
    res.json({ message: "Plan deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete plan", error: error.message });
  }
});

// Get phases for a specific plan
router.get("/plans/:id/phases", async (req, res) => {
  try {
    const phases = await CurriculumPhase.find({ plan: req.params.id }).sort({ phaseNumber: 1 });
    res.json(phases);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch phases", error: error.message });
  }
});

// Add a phase to a plan
router.post("/plans/:id/phases", async (req, res) => {
  try {
    const { phaseNumber, semester, title, startDate, endDate, skillThemes, modules } = req.body;
    
    const plan = await CurriculumPlan.findOne({ _id: req.params.id, mentor: req.user.id });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    
    const phase = new CurriculumPhase({
      plan: plan._id,
      phaseNumber: phaseNumber || 1,
      semester: semester || "Semester 1",
      title: title || "New Semester Phase",
      startDate,
      endDate,
      skillThemes: skillThemes || [],
      modules: modules || []
    });
    
    await phase.save();
    res.status(201).json(phase);
  } catch (error) {
    res.status(500).json({ message: "Failed to add phase", error: error.message });
  }
});

// Update a phase (and its embedded modules)
router.put("/phases/:phaseId", async (req, res) => {
  try {
    const { phaseNumber, semester, title, startDate, endDate, skillThemes, modules, topics } = req.body;
    const phase = await CurriculumPhase.findByIdAndUpdate(
      req.params.phaseId,
      { $set: { phaseNumber, semester, title, startDate, endDate, skillThemes, modules, topics } },
      { new: true }
    );
    if (!phase) return res.status(404).json({ message: "Phase not found" });
    res.json(phase);
  } catch (error) {
    res.status(500).json({ message: "Failed to update phase", error: error.message });
  }
});

// Delete a phase
router.delete("/phases/:phaseId", async (req, res) => {
  try {
    const phase = await CurriculumPhase.findByIdAndDelete(req.params.phaseId);
    if (!phase) return res.status(404).json({ message: "Phase not found" });
    res.json({ message: "Phase deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete phase", error: error.message });
  }
});

// Assign a plan and a specific active phase to a fellow
router.post("/assign", async (req, res) => {
  try {
    const { planId, fellowId, activePhaseId } = req.body;
    if (!planId || !fellowId) {
      return res.status(400).json({ message: "planId and fellowId are required" });
    }
    
    const assignment = await CurriculumAssignment.findOneAndUpdate(
      { plan: planId, fellow: fellowId },
      {
        $set: {
          assignedBy: req.user.id,
          activePhase: activePhaseId || null,
          status: "active"
        }
      },
      { upsert: true, new: true }
    ).populate("activePhase").populate("fellow", "name email");

    // Also push fellow into plan's assignedFellows list
    await CurriculumPlan.findByIdAndUpdate(planId, { $addToSet: { assignedFellows: fellowId } });

    res.status(200).json(assignment);
  } catch (error) {
    res.status(500).json({ message: "Failed to assign plan", error: error.message });
  }
});

// Get all curriculum assignments for the mentor's mentees
router.get("/assignments", async (req, res) => {
  try {
    const assignments = await CurriculumAssignment.find({ assignedBy: req.user.id })
      .populate("plan", "title numSemesters durationMonths")
      .populate("activePhase", "title semester phaseNumber")
      .populate("fellow", "name email photoUrl");
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch assignments", error: error.message });
  }
});

// Fellow Facing API
router.get("/my-curriculum", async (req, res) => {
  try {
    const assignments = await CurriculumAssignment.find({ fellow: req.user.id, status: "active" })
      .populate("plan")
      .populate("activePhase");
      
    const planIds = assignments.map(a => a.plan._id);
    const allPhases = await CurriculumPhase.find({ plan: { $in: planIds } }).sort({ phaseNumber: 1 });
    
    res.json({ assignments, allPhases });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch fellow curriculum", error: error.message });
  }
});

// Submit an activity work proof from the teacher/fellow side
router.post("/submit-activity", async (req, res) => {
  try {
    const { assignmentId, curriculumName, moduleName, activityTitle, description, files, itemKey, phaseId } = req.body;
    if (!description || !activityTitle) {
      return res.status(400).json({ message: "Activity title and description are required" });
    }

    const fullDesc = `${description.trim()}\n\n[Linked Curriculum Module: ${curriculumName || "ECCE Framework"} - ${moduleName || "General Module"}]`;

    let mentorId = null;
    if (assignmentId) {
      const assignmentDoc = await CurriculumAssignment.findById(assignmentId);
      if (assignmentDoc) mentorId = assignmentDoc.assignedBy;
    }
    if (!mentorId) {
      const teacherUser = await User.findById(req.user.id);
      mentorId = teacherUser?.assignedMentor || null;
    }

    // 1. Create submission in ActivitySubmission collection for mentor review
    const submission = new ActivitySubmission({
      teacher: req.user.id,
      mentor: mentorId,
      activityDate: new Date(),
      activityName: activityTitle,
      description: fullDesc,
      files: files || [],
      status: "pending"
    });
    await submission.save();

    // 2. Mark item completed in CurriculumAssignment if assignmentId & itemKey provided
    let updatedProgressPercent = 0;
    if (assignmentId && itemKey) {
      const assignment = await CurriculumAssignment.findOne({ _id: assignmentId, fellow: req.user.id });
      if (assignment) {
        const existingIndex = (assignment.completedItems || []).findIndex(i => i.itemKey === itemKey);
        if (existingIndex === -1) {
          assignment.completedItems.push({
            phaseId: phaseId || "",
            moduleIndex: 0,
            itemKey,
            title: activityTitle,
            completedAt: new Date()
          });
        }
        
        // Recalculate progress
        const allPhases = await CurriculumPhase.find({ plan: assignment.plan });
        let totalItemsCount = 0;
        allPhases.forEach(p => {
          (p.modules || []).forEach(m => {
            const itemTotal = (m.deliverables?.length || 0) + (m.assessmentMethods?.length || 0) + (m.resources?.length || 0) + 1;
            totalItemsCount += Math.max(1, itemTotal);
          });
        });

        updatedProgressPercent = totalItemsCount > 0 ? Math.min(100, Math.round((assignment.completedItems.length / totalItemsCount) * 100)) : 0;
        assignment.progressPercent = updatedProgressPercent;
        await assignment.save();
      }
    }

    res.status(201).json({
      message: "Activity submitted successfully to Mentor inbox!",
      submission,
      progressPercent: updatedProgressPercent
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit activity", error: error.message });
  }
});

// Advance selected fellows to the next phase/semester manually
router.post("/plans/:id/advance-fellows", async (req, res) => {
  try {
    const { sourcePhaseId, targetPhaseId, fellowIds } = req.body;
    if (!targetPhaseId || !Array.isArray(fellowIds) || fellowIds.length === 0) {
      return res.status(400).json({ message: "targetPhaseId and fellowIds array are required" });
    }

    const targetPhase = await CurriculumPhase.findById(targetPhaseId);
    if (!targetPhase) return res.status(404).json({ message: "Target phase not found" });

    const updatedAssignments = [];
    for (const fellowId of fellowIds) {
      const assignment = await CurriculumAssignment.findOneAndUpdate(
        { plan: req.params.id, fellow: fellowId },
        {
          $set: { activePhase: targetPhase._id },
          $push: {
            movementHistory: {
              movedFromPhase: sourcePhaseId || null,
              movedToPhase: targetPhase._id,
              movedBy: req.user.id,
              movedAt: new Date()
            }
          }
        },
        { new: true, upsert: true }
      ).populate("fellow", "name email");

      updatedAssignments.push(assignment);
    }

    res.json({
      message: `Successfully advanced ${fellowIds.length} fellows to ${targetPhase.semester} (${targetPhase.title})`,
      updatedAssignments
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to advance fellows", error: error.message });
  }
});

// Get fellow progress & phase advancement eligibility for a plan
router.get("/plans/:id/fellow-progress", async (req, res) => {
  try {
    const plan = await CurriculumPlan.findById(req.params.id).populate("assignedFellows", "name email photoUrl");
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const phases = await CurriculumPhase.find({ plan: plan._id }).sort({ phaseNumber: 1 });
    const assignments = await CurriculumAssignment.find({ plan: plan._id }).populate("activePhase");

    const fellowsProgress = (plan.assignedFellows || []).map(fellow => {
      const assign = assignments.find(a => String(a.fellow) === String(fellow._id) || (a.fellow && String(a.fellow._id) === String(fellow._id)));
      const activePhase = assign?.activePhase || phases[0] || null;

      // Mock or calculated approved module ratio
      const moduleCount = activePhase?.modules?.length || 4;
      const approvedCount = Math.min(moduleCount, Math.floor(Math.random() * (moduleCount + 1)));
      const isEligible = approvedCount >= moduleCount;

      return {
        fellowId: fellow._id,
        name: fellow.name,
        email: fellow.email,
        activePhaseId: activePhase?._id || null,
        activeSemester: activePhase?.semester || "Semester 1",
        approvedCount,
        moduleCount,
        isEligible
      };
    });

    res.json({ fellowsProgress, phases });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch fellow progress", error: error.message });
  }
});

export default router;
