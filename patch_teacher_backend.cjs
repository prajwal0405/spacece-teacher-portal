const fs = require('fs');
const path = require('path');

const newContent = `import express from "express";
import mongoose from "mongoose";
import { PDCACycle } from "../models/MentorTracking.js";

const router = express.Router();

function requireDbConnection(req, res, next) {
  const state = mongoose.connection.readyState;
  if (state !== 1) {
    return res.status(503).json({ success: false, message: "Database connection is not ready." });
  }
  next();
}

router.use(requireDbConnection);

// Fellow/Teacher: list Growth Cycles assigned to me by my mentor
router.get("/", async (req, res, next) => {
  try {
    const cycles = await PDCACycle.find({ menteeId: req.user.id, status: { $ne: "DRAFT" } })
      .populate("mentorId", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, cycles });
  } catch (err) {
    next(err);
  }
});

// Fellow/Teacher: Save DO Draft
router.patch("/:id/do/draft", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid cycle id." });
    }
    
    const cycle = await PDCACycle.findOne({ _id: req.params.id, menteeId: req.user.id });
    if (!cycle) return res.status(404).json({ success: false, message: "Growth Cycle not found." });
    if (!["PLAN_PUBLISHED", "DO_IN_PROGRESS"].includes(cycle.status)) {
      return res.status(400).json({ success: false, message: "Not ready for Do phase." });
    }

    const updatableFields = ["doActivitiesCompleted", "doNotes", "doReflections", "doEvidence"];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) cycle[field] = req.body[field];
    });

    cycle.status = "DO_IN_PROGRESS";
    await cycle.save();
    
    const populated = await cycle.populate("mentorId", "name email");
    res.json({ success: true, cycle: populated });
  } catch (err) {
    next(err);
  }
});

// Fellow/Teacher: Submit DO
router.patch("/:id/do/submit", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid cycle id." });
    }
    
    const cycle = await PDCACycle.findOne({ _id: req.params.id, menteeId: req.user.id });
    if (!cycle) return res.status(404).json({ success: false, message: "Growth Cycle not found." });
    if (!["PLAN_PUBLISHED", "DO_IN_PROGRESS"].includes(cycle.status)) {
      return res.status(400).json({ success: false, message: "Not ready to submit Do." });
    }

    const updatableFields = ["doActivitiesCompleted", "doNotes", "doReflections", "doEvidence"];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) cycle[field] = req.body[field];
    });

    cycle.doSubmittedAt = new Date();
    cycle.status = "DO_SUBMITTED";
    
    // Clear any previous revision flags
    cycle.revisionRequired = false;
    await cycle.save();

    try {
      const { createAndEmitNotification } = await import("../socket.js");
      await createAndEmitNotification({
        recipientId: cycle.mentorId,
        title: "Fellow Submitted Growth Cycle Do",
        body: \`\${req.user.name || "Your fellow"} submitted their Do for Cycle \${cycle.cycleNumber}. Please review and add your Check.\`,
        type: "in_app",
      });
    } catch (notifyErr) {
      console.warn("[growth-cycle:do] notification failed:", notifyErr.message);
    }

    const populated = await cycle.populate("mentorId", "name email");
    res.json({ success: true, cycle: populated });
  } catch (err) {
    next(err);
  }
});

// Fellow/Teacher: Save ACT Draft
router.patch("/:id/act/draft", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid cycle id." });
    }
    
    const cycle = await PDCACycle.findOne({ _id: req.params.id, menteeId: req.user.id });
    if (!cycle) return res.status(404).json({ success: false, message: "Growth Cycle not found." });
    if (!["CHECK_COMPLETED", "ACT_IN_PROGRESS"].includes(cycle.status)) {
      return res.status(400).json({ success: false, message: "Not ready for Act phase." });
    }

    const updatableFields = ["actCorrectiveActions", "actChanged", "actReflections", "actEvidence"];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) cycle[field] = req.body[field];
    });

    cycle.status = "ACT_IN_PROGRESS";
    await cycle.save();
    
    const populated = await cycle.populate("mentorId", "name email");
    res.json({ success: true, cycle: populated });
  } catch (err) {
    next(err);
  }
});

// Fellow/Teacher: Submit ACT
router.patch("/:id/act/submit", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid cycle id." });
    }
    
    const cycle = await PDCACycle.findOne({ _id: req.params.id, menteeId: req.user.id });
    if (!cycle) return res.status(404).json({ success: false, message: "Growth Cycle not found." });
    if (!["CHECK_COMPLETED", "ACT_IN_PROGRESS"].includes(cycle.status)) {
      return res.status(400).json({ success: false, message: "Not ready to submit Act." });
    }

    const updatableFields = ["actCorrectiveActions", "actChanged", "actReflections", "actEvidence"];
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) cycle[field] = req.body[field];
    });

    cycle.actSubmittedAt = new Date();
    cycle.status = "COMPLETED";
    await cycle.save();

    try {
      const { createAndEmitNotification } = await import("../socket.js");
      await createAndEmitNotification({
        recipientId: cycle.mentorId,
        title: "Growth Cycle Completed",
        body: \`\${req.user.name || "Your fellow"} completed Cycle \${cycle.cycleNumber}.\`,
        type: "in_app",
      });
    } catch (notifyErr) {
      console.warn("[growth-cycle:act] notification failed:", notifyErr.message);
    }

    const populated = await cycle.populate("mentorId", "name email");
    res.json({ success: true, cycle: populated });
  } catch (err) {
    next(err);
  }
});

export default router;
`;

const filePath = path.join(__dirname, 'backend', 'src', 'routes', 'teacherGrowthCycle.js');
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Successfully replaced teacherGrowthCycle.js");
