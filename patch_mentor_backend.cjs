const fs = require('fs');
const path = require('path');

const newRoutes = `// --- PDCA / Growth Cycles ---

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
        body: \`Your mentor published "\${populated.planTitle}". Please review and start DO phase.\`,
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
          ? \`Your mentor requested revisions for Cycle \${cycle.cycleNumber}. Please update DO.\`
          : \`Feedback added for Cycle \${cycle.cycleNumber}. Please submit your Act.\`,
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

`;

const filePath = path.join(__dirname, 'backend', 'src', 'routes', 'mentorTracking.js');
const content = fs.readFileSync(filePath, 'utf8');

const startIndex = content.indexOf('// --- PDCA / Growth Cycles ---');
const endIndex = content.indexOf('// --- Capstone Submissions & Milestones ---');

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find section markers");
  process.exit(1);
}

const newContent = content.substring(0, startIndex) + newRoutes + content.substring(endIndex);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Successfully patched mentorTracking.js");
