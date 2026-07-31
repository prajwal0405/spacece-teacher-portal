import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import ActivityBank from "../models/ActivityBank.js";
import { ActivitySubmission } from "../models/ActivitySubmission.js";
import AutomationTeacher from "../models/AutomationTeacher.js";
import DailyTaskAssignment from "../models/DailyTaskAssignment.js";
import TeacherNotification from "../models/TeacherNotification.js";
import TaskReplacementLog from "../models/TaskReplacementLog.js";
import { importActivitiesFromExcel } from "../services/activityImportService.js";
import { seedDummyTeachers } from "../services/seedDummyTeachersService.js";
import {
  generateDailyTaskAssignments,
  updateTaskStatus,
  reassignTeacherTasks,
  toDateKey
} from "../services/dailyTaskAllocationService.js";
import { getTeacherNotifications } from "../services/teacherNotificationService.js";
import { requireAuth } from "../auth.js";

const router = express.Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

router.post("/teachers/generate-dummy", async (_req, res) => {
  try {
    const result = await seedDummyTeachers();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/teachers", async (_req, res) => {
  try {
    const teachers = await AutomationTeacher.find().sort({ teacherId: 1 });
    res.json({ success: true, teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/teachers/:teacherId/availability", async (req, res) => {
  try {
    const teacher = await AutomationTeacher.findOneAndUpdate(
      { teacherId: req.params.teacherId },
      req.body,
      { new: true }
    );
    res.json({ success: true, teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/activities/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    console.log("==> UPLOAD REQUEST RECEIVED", { user: req.user, file: req.file });
    if (!req.file) {
      console.log("==> No file provided");
      return res.status(400).json({ success: false, message: "Excel file is required" });
    }



    const result = await importActivitiesFromExcel(req.file.path, req.user.id);
    console.log("==> IMPORT SUCCESS:", result);
    fs.unlink(req.file.path, () => {});
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("==> IMPORT ERROR:", error);
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/activities/import-sample", async (_req, res) => {
  try {
    const samplePath = path.join(process.cwd(), "src", "data", "FinalT2.xlsx");
    if (!fs.existsSync(samplePath)) {
      return res.status(404).json({ success: false, message: "Sample FinalT2.xlsx not found in src/data" });
    }

    const result = await importActivitiesFromExcel(samplePath);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fetch submissions for the authenticated user
router.get("/activities/submissions", requireAuth, async (req, res) => {
  try {
    const submissions = await ActivitySubmission.find({ teacher: req.user.id })
      .sort({ activityDate: -1 });
    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/activities/:id", requireAuth, async (req, res) => {
  try {
    if (!req.params.id || req.params.id === "undefined" || req.params.id === "null") {
      return res.status(400).json({ success: false, message: "Invalid activity ID" });
    }
    const activity = await ActivityBank.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ success: false, message: "Activity not found" });
    }
    await ActivityBank.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Activity deleted successfully" });
  } catch (error) {
    console.error("Delete activity error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/activities/batch/:batchId", requireAuth, async (req, res) => {
  try {
    const query = { importBatchId: req.params.batchId };
    if (req.user.role !== "admin") {
      query.createdBy = req.user.id;
    }
    const result = await ActivityBank.deleteMany(query);
    res.json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/activities", async (req, res) => {
  try {
    const query = {};
    if (req.query.level) query.level = req.query.level;
    if (req.query.className) query.className = req.query.className;
    if (req.query.createdBy) query.createdBy = req.query.createdBy;

    const activities = await ActivityBank.find(query)
      .sort({ level: 1, sourceRowNumber: 1 })
      .limit(Number(req.query.limit || 500));

    res.json({ success: true, activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/activities", requireAuth, async (req, res) => {
  try {
      console.log("==> Creating activity, req.user:", req.user);
    const { activityName, ageGroup, developmentalDomain, materialsRequired, expectedLearningOutcomes, duration, level, className, type, milestone, purposeOfActivity, howToConduct, facilitatorRole, dayNumber, learningObjectives, activities, resources, instructions, expectedOutput, notes } = req.body;
    
    if (!activityName) {
      return res.status(400).json({ success: false, message: "Activity Name is required" });
    }

    const activityId = `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const activity = await ActivityBank.create({
      activityId,
      activityName,
      milestone,
      purposeOfActivity,
      howToConduct,
      facilitatorRole,
      ageGroup,
      developmentalDomain,
      materialsRequired,
      expectedLearningOutcomes,
      duration,
      level,
      className,
      type,
      dayNumber,
      learningObjectives,
      activities,
      resources,
      instructions,
      expectedOutput,
      notes,
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/activities/summary", async (_req, res) => {
  try {
    const summary = await ActivityBank.aggregate([
      { $group: { _id: { className: "$className", level: "$level", type: "$type" }, count: { $sum: 1 } } },
      { $sort: { "_id.className": 1, "_id.level": 1, "_id.type": 1 } }
    ]);

    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/generate-daily", async (req, res) => {
  try {
    const result = await generateDailyTaskAssignments({
      date: req.body.date,
      activityCount: Number(req.body.activityCount || process.env.DAILY_ACTIVITY_COUNT || 4),
      levels: req.body.levels,
      replaceExisting: Boolean(req.body.replaceExisting)
    });

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/today", async (req, res) => {
  try {
    const dateKey = toDateKey(req.query.date);
    const assignments = await DailyTaskAssignment.find({ assignmentDate: dateKey })
      .populate("teacher")
      .populate("tasks.activity")
      .sort({ level: 1 });

    res.json({ success: true, date: dateKey, assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/teacher/:teacherId/today", async (req, res) => {
  try {
    const dateKey = toDateKey(req.query.date);
    const assignment = await DailyTaskAssignment.findOne({
      assignmentDate: dateKey,
      teacherId: req.params.teacherId
    }).populate("tasks.activity");

    res.json({ success: true, date: dateKey, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/teacher/:teacherId/notifications", async (req, res) => {
  try {
    const notifications = await getTeacherNotifications(req.params.teacherId);
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/assignments/:assignmentId/tasks/:taskId/status", async (req, res) => {
  try {
    const assignment = await updateTaskStatus({
      assignmentId: req.params.assignmentId,
      taskId: req.params.taskId,
      status: req.body.status
    });

    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/assignments/:assignmentId/reassign", async (req, res) => {
  try {
    const assignment = await reassignTeacherTasks({
      assignmentId: req.params.assignmentId,
      reason: req.body.reason
    });

    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/replacement-logs", async (_req, res) => {
  try {
    const logs = await TaskReplacementLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch("/notifications/:notificationId/read", async (req, res) => {
  try {
    const notification = await TeacherNotification.findByIdAndUpdate(
      req.params.notificationId,
      { readStatus: true },
      { new: true }
    );

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
