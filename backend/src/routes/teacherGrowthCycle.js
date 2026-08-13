import express from "express";
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

// Helper function to find a cycle belonging to the teacher/fellow
async function getTeacherCycle(cycleId, userId) {
  const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
  return PDCACycle.findOne({
    _id: cycleId,
    $or: [
      { menteeId: userId },
      { menteeId: userObjId }
    ]
  });
}

// Fellow/Teacher: list Growth Cycles assigned to me by my mentor
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userObjId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;

    const cycles = await PDCACycle.find({
      $or: [
        { menteeId: userId },
        { menteeId: userObjId }
      ],
      status: { $ne: "DRAFT" }
    })
      .populate("mentorId", "name email photoUrl")
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

    const cycle = await getTeacherCycle(req.params.id, req.user.id);
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

    const cycle = await getTeacherCycle(req.params.id, req.user.id);
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
    cycle.revisionRequired = false;
    await cycle.save();

    try {
      const { createAndEmitNotification } = await import("../socket.js");
      await createAndEmitNotification({
        recipientId: cycle.mentorId,
        title: "Teacher Submitted Growth Cycle DO",
        body: `${req.user.name || "Your teacher"} submitted their DO implementation for Cycle ${cycle.cycleNumber}. Please review and complete Check.`,
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

    const cycle = await getTeacherCycle(req.params.id, req.user.id);
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

    const cycle = await getTeacherCycle(req.params.id, req.user.id);
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
        body: `${req.user.name || "Your teacher"} completed Cycle ${cycle.cycleNumber}.`,
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
