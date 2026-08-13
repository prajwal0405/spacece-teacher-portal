import express from "express";
import mongoose from "mongoose";
import { PDCACycle, CapstoneSubmission, MenteeObservation } from "../models/MentorTracking.js";
import { sendNotificationEmail } from "../email.js"; // adjust path if email.js lives elsewhere

// Note: We expect the router to be mounted such that requireAuth and requireRole("mentor")
// are applied before reaching these routes, or we'll apply them in server.js.
const router = express.Router();

// ---------------------------------------------------------------------------
// DB CONNECTION GUARD
// ---------------------------------------------------------------------------
function requireDbConnection(req, res, next) {
  const state = mongoose.connection.readyState;
  if (state !== 1) {
    const stateNames = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
    console.error(
      `[mentorTracking] DB not ready. readyState=${state} (${stateNames[state] || "unknown"}). ` +
      `Check: cluster paused? IP allowlisted in Atlas Network Access? MONGO_URI correct in .env?`
    );
    return res.status(503).json({
      success: false,
      message: "Database connection is not ready. Please try again in a moment.",
      debug: { readyState: state, readyStateName: stateNames[state] || "unknown" },
    });
  }
  next();
}

router.use(requireDbConnection);

// --- Mentees ---
router.get("/mentees", async (req, res, next) => {
  try {
    const User = mongoose.model("User");
    const mentees = await User.find({ role: "teacher", assignedMentor: req.user.id })
      .select("name email phone status");
    res.json(mentees);
  } catch (err) {
    next(err);
  }
});

// --- PDCA / Growth Cycles ---

// Mentor: list all cycles they created
router.get("/pdca", async (req, res, next) => {
  try {
    const cycles = await PDCACycle.find({ mentorId: req.user.id })
      .populate("menteeId", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, cycles });
  } catch (err) {
    next(err);
  }
});

// Mentor: create a new cycle in DRAFT state
router.post("/pdca/draft", async (req, res, next) => {
  try {
    const { 
      menteeId, planTitle, planObjective, planArea, 
      planExpectedOutcomes, planActivities, planStartDate, 
      planTargetDate, planInstructions 
    } = req.body;

    if (!menteeId || !mongoose.Types.ObjectId.isValid(menteeId)) {
      return res.status(400).json({ success: false, message: "Valid menteeId is required" });
    }
    if (!planTitle || !planTitle.trim()) {
      return res.status(400).json({ success: false, message: "A Plan Title is required." });
    }

    const existingForMentee = await PDCACycle.countDocuments({
      mentorId: req.user.id,
      menteeId,
    });
    const cycleNumber = existingForMentee + 1;

    const cycle = await PDCACycle.create({
      mentorId: req.user.id,
      menteeId,
      cycleNumber,
      planTitle,
      planObjective,
      planArea,
      planExpectedOutcomes,
      planActivities,
      planStartDate,
      planTargetDate,
      planInstructions,
      status: "DRAFT",
    });

    const populated = await cycle.populate("menteeId", "name email");
    res.status(201).json({ success: true, cycle: populated });
  } catch (err) {
    next(err);
  }
});

// Mentor: Update a plan (must be DRAFT)
router.patch("/pdca/:id/plan", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid cycle id." });
    }
    
    const cycle = await PDCACycle.findOne({ _id: req.params.id, mentorId: req.user.id });
    if (!cycle) return res.status(404).json({ success: false, message: "Growth Cycle not found." });
    if (cycle.status !== "DRAFT") {
      return res.status(400).json({ success: false, message: "Can only edit plans in DRAFT status." });
    }

    const updatableFields = [
      "planTitle", "planObjective", "planArea", "planExpectedOutcomes",
      "planActivities", "planStartDate", "planTargetDate", "planInstructions"
    ];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) cycle[field] = req.body[field];
    });

    await cycle.save();
    const populated = await cycle.populate("menteeId", "name email");
    res.json({ success: true, cycle: populated });
  } catch (err) {
    next(err);
  }
});

// Mentor: Publish a plan
router.patch("/pdca/:id/publish", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid cycle id." });
    }
    
    const cycle = await PDCACycle.findOne({ _id: req.params.id, mentorId: req.user.id });
    if (!cycle) return res.status(404).json({ success: false, message: "Growth Cycle not found." });
    if (cycle.status !== "DRAFT") {
      return res.status(400).json({ success: false, message: "Can only publish DRAFT plans." });
    }

    cycle.status = "PLAN_PUBLISHED";
    cycle.planPublishedAt = new Date();
    await cycle.save();

    const populated = await cycle.populate("menteeId", "name email");

    try {
      const { createAndEmitNotification } = await import("../socket.js");
      await createAndEmitNotification({
        recipientId: cycle.menteeId,
        title: "New Growth Cycle Assigned",
        body: `Your mentor published "${populated.planTitle}". Please review and start DO phase.`,
        type: "in_app",
      });
    } catch (notifyErr) {
      console.warn("[pdca:publish] notification failed:", notifyErr.message);
    }

    res.json({ success: true, cycle: populated });
  } catch (err) {
    next(err);
  }
});

// Mentor: Save Check draft
router.patch("/pdca/:id/check/draft", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid cycle id." });
    }
    
    const cycle = await PDCACycle.findOne({ _id: req.params.id, mentorId: req.user.id });
    if (!cycle) return res.status(404).json({ success: false, message: "Growth Cycle not found." });
    if (!["DO_SUBMITTED", "CHECK_IN_PROGRESS"].includes(cycle.status)) {
      return res.status(400).json({ success: false, message: "Not ready for Check phase." });
    }

    const updatableFields = [
      "checkFeedback", "checkScore", "checkStrengths", "checkGaps", 
      "checkRecommendations", "revisionRequired"
    ];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) cycle[field] = req.body[field];
    });

    cycle.status = "CHECK_IN_PROGRESS";
    await cycle.save();
    
    const populated = await cycle.populate("menteeId", "name email");
    res.json({ success: true, cycle: populated });
  } catch (err) {
    next(err);
  }
});

// Mentor: Submit Check
router.patch("/pdca/:id/check/submit", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid cycle id." });
    }
    
    const cycle = await PDCACycle.findOne({ _id: req.params.id, mentorId: req.user.id });
    if (!cycle) return res.status(404).json({ success: false, message: "Growth Cycle not found." });
    if (!["DO_SUBMITTED", "CHECK_IN_PROGRESS"].includes(cycle.status)) {
      return res.status(400).json({ success: false, message: "Not ready to submit Check." });
    }

    const updatableFields = [
      "checkFeedback", "checkScore", "checkStrengths", "checkGaps", 
      "checkRecommendations", "revisionRequired"
    ];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) cycle[field] = req.body[field];
    });

    cycle.checkedAt = new Date();
    
    // Revision Workflow
    if (cycle.revisionRequired) {
      cycle.status = "DO_IN_PROGRESS"; // Send back to Teacher
    } else {
      cycle.status = "CHECK_COMPLETED"; // Proceed to Act
    }
    
    await cycle.save();
    
    const populated = await cycle.populate("menteeId", "name email");

    try {
      const { createAndEmitNotification } = await import("../socket.js");
      await createAndEmitNotification({
        recipientId: cycle.menteeId,
        title: cycle.revisionRequired ? "Revision Required for Growth Cycle" : "Mentor Reviewed Growth Cycle",
        body: cycle.revisionRequired 
          ? `Your mentor requested revisions for Cycle ${cycle.cycleNumber}. Please update DO.`
          : `Feedback added for Cycle ${cycle.cycleNumber}. Please submit your Act.`,
        type: "in_app",
      });
    } catch (notifyErr) {
      console.warn("[pdca:check_submit] notification failed:", notifyErr.message);
    }

    res.json({ success: true, cycle: populated });
  } catch (err) {
    next(err);
  }
});

// --- Capstone Submissions & Milestones ---
const MILESTONE_DEFINITIONS = [
  { id: 1, title: "Problem Identification", desc: "Identify a core challenge in the early childhood community." },
  { id: 2, title: "Solution Design", desc: "Design a targeted intervention & pedagogical framework." },
  { id: 3, title: "Implementation", desc: "Execute the solution in classroom settings & collect data." },
  { id: 4, title: "Evaluation", desc: "Analyze impact metrics, synthesize findings & finalize report." }
];

router.get("/capstone", async (req, res, next) => {
  try {
    const submissions = await CapstoneSubmission.find({ mentorId: req.user.id }).sort({ milestone: 1 });
    const completedCount = submissions.filter(s => s.status === "approved" || s.status === "submitted").length;
    const currentStage = Math.min(completedCount + 1, 4);

    const milestoneMap = new Map();
    submissions.forEach(s => milestoneMap.set(s.milestone, s));

    const milestones = MILESTONE_DEFINITIONS.map(m => {
      const sub = milestoneMap.get(m.id);
      let status = "locked";
      if (sub) {
        status = sub.status || "submitted";
      } else if (m.id === currentStage && completedCount < 4) {
        status = "in_progress";
      }
      return {
        ...m,
        status,
        submission: sub || null
      };
    });

    res.json({
      success: true,
      currentStage,
      status: completedCount >= 4 ? "completed" : "in_progress",
      impactScore: "A+",
      submissions,
      milestones
    });
  } catch (err) {
    next(err);
  }
});

router.post("/capstone", async (req, res, next) => {
  try {
    const { milestone, notes, text, evidenceLink, fileUrl } = req.body;
    const submissionNotes = notes || text || "";
    const mNum = Number(milestone) || 1;

    const submission = await CapstoneSubmission.findOneAndUpdate(
      { mentorId: req.user.id, milestone: mNum },
      {
        $set: {
          notes: submissionNotes,
          evidenceLink: evidenceLink || fileUrl || "",
          fileUrl: fileUrl || evidenceLink || "",
          status: "submitted",
          submittedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    res.status(201).json({ success: true, submission });
  } catch (err) {
    next(err);
  }
});

router.post("/capstone/milestones/:id/submit", async (req, res, next) => {
  try {
    const milestoneId = Number(req.params.id);
    const { notes, text, evidenceLink, fileUrl } = req.body;
    const submissionNotes = notes || text || "";

    const submission = await CapstoneSubmission.findOneAndUpdate(
      { mentorId: req.user.id, milestone: milestoneId },
      {
        $set: {
          notes: submissionNotes,
          evidenceLink: evidenceLink || fileUrl || "",
          fileUrl: fileUrl || evidenceLink || "",
          status: "submitted",
          submittedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, submission });
  } catch (err) {
    next(err);
  }
});

// --- Mentee Observations ---
router.get("/observations", async (req, res, next) => {
  try {
    const observations = await MenteeObservation.find({ mentorId: req.user.id })
      .populate("menteeId", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, observations });
  } catch (err) {
    next(err);
  }
});

router.post("/observations", async (req, res, next) => {
  try {
    const observation = await MenteeObservation.create({ mentorId: req.user.id, ...req.body });
    res.status(201).json({ success: true, observation });
  } catch (err) {
    next(err);
  }
});

// --- Pending Fellow Approvals count (used by reminder polling) ---
router.get("/pending-approvals-count", async (req, res, next) => {
  try {
    const { Fellow } = await import("../models/Fellow.js");
    const pendingCount = await Fellow.countDocuments({
      mentorId: req.user.id,
      status: "pending"
    });
    res.json({ success: true, pendingCount });
  } catch (err) {
    next(err);
  }
});

// --- Pending Fellow Approvals: email nudge ---
router.post("/notify-pending", async (req, res, next) => {
  try {
    console.log("[notify-pending] called by mentor:", req.user?.id);

    const { Fellow } = await import("../models/Fellow.js");
    const pendingFellows = await Fellow.find({
      mentorId: req.user.id,
      status: "pending"
    }).select("name");

    console.log("[notify-pending] pendingFellows found:", pendingFellows.length);

    if (pendingFellows.length === 0) {
      return res.json({ success: true, sent: false, reason: "no_pending", message: "No pending approvals." });
    }

    const listHtml = pendingFellows.map((f) => `<li>${f.name}</li>`).join("");
    const count = pendingFellows.length;

    const result = await sendNotificationEmail({
      recipient: req.user.id,
      title: `⏳ ${count} fellow${count > 1 ? "s" : ""} awaiting your approval`,
      body: `You have ${count} fellow${count > 1 ? "s" : ""} waiting for approval:<ul>${listHtml}</ul>`,
      category: "mentor_pending_approvals",
    });

    console.log("[notify-pending] sendNotificationEmail result:", result);

    res.json({
      success: true,
      sent: result.success,
      count,
      reason: result.success ? undefined : "email_send_failed",
      error: result.success ? undefined : result.error,
    });
  } catch (err) {
    console.error("[notify-pending] unhandled error:", err);
    next(err);
  }
});

export default router;