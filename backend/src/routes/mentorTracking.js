import express from "express";
import { PDCACycle, CapstoneSubmission, MenteeObservation, MentorFeedback } from "../models/MentorTracking.js";
import { User } from "../models/User.js";
import { TeacherAttendanceRecord } from "../models/Attendance.js";
import { CurriculumPlan, CurriculumPhase } from "../models/Curriculum.js";
import multer from "multer";
import * as xlsx from "xlsx";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

// Note: We expect the router to be mounted such that requireAuth and requireRole("mentor")
// are applied before reaching these routes, or we'll apply them in server.js.

const router = express.Router();

// --- PDCA Cycles ---
router.get("/pdca", async (req, res, next) => {
  try {
    const cycles = await PDCACycle.find({ mentorId: req.user.id }).populate("menteeId", "name email").sort({ createdAt: -1 });
    res.json({ success: true, cycles });
  } catch (err) {
    next(err);
  }
});

router.post("/pdca", async (req, res, next) => {
  try {
    const cycle = await PDCACycle.create({
      mentorId: req.user.id,
      ...req.body
    });
    const populatedCycle = await PDCACycle.findById(cycle._id).populate("menteeId", "name email");
    res.status(201).json({ success: true, cycle: populatedCycle });
  } catch (err) {
    next(err);
  }
});

// --- Capstone Submissions ---
router.get("/capstone", async (req, res, next) => {
  try {
    const submissions = await CapstoneSubmission.find({ mentorId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, submissions });
  } catch (err) {
    next(err);
  }
});

router.post("/capstone", async (req, res, next) => {
  try {
    const submission = await CapstoneSubmission.create({
      mentorId: req.user.id,
      ...req.body
    });
    res.status(201).json({ success: true, submission });
  } catch (err) {
    next(err);
  }
});

// --- Mentee Observations ---
router.get("/observations", async (req, res, next) => {
  try {
    const observations = await MenteeObservation.find({ mentorId: req.user.id }).populate("menteeId", "name email").sort({ createdAt: -1 });
    res.json({ success: true, observations });
  } catch (err) {
    next(err);
  }
});

router.post("/observations", async (req, res, next) => {
  try {
    const observation = await MenteeObservation.create({
      mentorId: req.user.id,
      ...req.body
    });
    const populatedObs = await MenteeObservation.findById(observation._id).populate("menteeId", "name email");
    res.status(201).json({ success: true, observation: populatedObs });
  } catch (err) {
    next(err);
  }
});

// --- Feedback ---
router.post("/feedback", async (req, res, next) => {
  try {
    const feedback = await MentorFeedback.create({
      mentorId: req.user.id,
      ...req.body
    });
    res.status(201).json({ success: true, feedback });
  } catch (err) {
    next(err);
  }
});

// --- Assigned Mentees (Fellows) ---
router.get("/mentees", async (req, res, next) => {
  try {
    const mentor = await User.findById(req.user.id).populate({
      path: "mentorProfile.assignedTeachers",
      select: "name email photoUrl role teacherProfile"
    });
    if (!mentor) {
      return res.status(404).json({ success: false, message: "Mentor not found" });
    }
    res.json({ success: true, mentees: mentor.mentorProfile.assignedTeachers || [] });
  } catch (err) {
    next(err);
  }
});


// --- Mentee Attendance (Fellow Attendance) ---
router.get("/fellow-attendance", async (req, res, next) => {
  try {
    const mentor = await User.findById(req.user.id).select("mentorProfile");
    if (!mentor) {
      return res.status(404).json({ success: false, message: "Mentor not found" });
    }
    
    const menteeIds = mentor.mentorProfile.assignedTeachers || [];
    
    const attendanceRecords = await TeacherAttendanceRecord.find({
      teacher: { $in: menteeIds }
    }).populate("teacher", "name email").sort({ attendanceDate: -1 });
    
    res.json({ success: true, records: attendanceRecords });
  } catch (err) {
    next(err);
  }
});

router.post("/fellow-attendance", async (req, res, next) => {
  try {
    const record = await TeacherAttendanceRecord.create({
      ...req.body,
      markedBy: req.user.id
    });
    
    const populatedRecord = await TeacherAttendanceRecord.findById(record._id).populate("teacher", "name email");
    res.status(201).json({ success: true, record: populatedRecord });
  } catch (err) {
    next(err);
  }
});

// --- Curriculum Management ---
router.get("/curriculum", async (req, res, next) => {
  try {
    const plans = await CurriculumPlan.find({ mentor: req.user.id }).sort({ createdAt: -1 });
    const fullPlans = await Promise.all(plans.map(async (plan) => {
      const phases = await CurriculumPhase.find({ plan: plan._id }).sort({ phaseNumber: 1 });
      return { ...plan.toObject(), phases };
    }));
    res.json({ success: true, curriculum: fullPlans });
  } catch (err) {
    next(err);
  }
});

router.post("/curriculum/bulk-upload", upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    const { fellowId, splitType = "4-weeks" } = req.body;
    
    if (!file || !fellowId) {
      return res.status(400).json({ success: false, message: "File and fellowId are required" });
    }

    const safeFileName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const uploadPath = path.join(__dirname, "../../../public", safeFileName);
    await fs.writeFile(uploadPath, file.buffer);

    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const topics = rows.map(r => {
      const keys = Object.keys(r);
      const titleKey = keys.find(k => /topic|title|name/i.test(k));
      const descKey = keys.find(k => /description|desc|details|time/i.test(k));
      
      let title = r[titleKey];
      if (!title) {
        // Fallback: exclude 'no', 'sr'
        const possibleTitleKey = keys.find(k => !/no\.|id|sr|sn/i.test(k));
        title = r[possibleTitleKey] || Object.values(r)[0];
      }

      return {
        title: String(title || "Untitled Topic"),
        description: descKey ? String(r[descKey]) : ""
      };
    }).filter(t => t.title && t.title !== "Untitled Topic" && t.title !== "undefined");

    let targetFellowIds = [];
    if (fellowId === 'all') {
      const mentor = await User.findById(req.user.id);
      targetFellowIds = mentor?.mentorProfile?.assignedTeachers || [];
      if (targetFellowIds.length === 0) {
        return res.status(400).json({ success: false, message: "No assigned fellows to broadcast to." });
      }
    } else {
      targetFellowIds = [fellowId];
    }

    let planTitle = "AI Generated Course Schedule (Bulk)";
    let durationType = "4-weeks";
    
    if (splitType === "direct") {
      let firstPlan = null;
      for (const targetId of targetFellowIds) {
        const plan = await CurriculumPlan.create({
          mentor: req.user.id,
          assignedFellow: targetId,
          title: "Directly Assigned Curriculum",
          durationType: "1-phase",
          status: "published",
          sourceFileName: file.originalname,
          sourceFileUrl: safeFileName
        });

        const createdPhases = await CurriculumPhase.insertMany([{
          plan: plan._id,
          phaseNumber: 1,
          semester: "Semester 1",
          title: "Full Curriculum",
          topics
        }]);
        if (!firstPlan) firstPlan = { ...plan.toObject(), phases: createdPhases };
      }
      return res.status(201).json({ success: true, plan: firstPlan, message: `Directly assigned ${topics.length} topics.` });
    }

    let phaseCount = 4;
    let labelType = "Week";
    if (splitType === "4-semesters") {
      planTitle = "1-Year Semester-wise Schedule";
      durationType = "1-year";
      labelType = "Semester";
    }

    let firstPlan = null;
    for (const targetId of targetFellowIds) {
      const plan = await CurriculumPlan.create({
        mentor: req.user.id,
        assignedFellow: targetId,
        title: planTitle,
        durationType,
        status: "draft",
        sourceFileName: file.originalname,
        sourceFileUrl: safeFileName
      });

      let phasesToCreate = [];
      const topicsPerPhase = Math.ceil(topics.length / phaseCount);
      for (let i = 0; i < phaseCount; i++) {
        const phaseTopics = topics.slice(i * topicsPerPhase, (i + 1) * topicsPerPhase);
        if (phaseTopics.length > 0) {
          phasesToCreate.push({
            plan: plan._id,
            phaseNumber: i + 1,
            semester: labelType === "Semester" ? `Semester ${i + 1}` : "Semester 1",
            title: `${labelType} ${i + 1} Focus`,
            topics: phaseTopics
          });
        }
      }

      const createdPhases = await CurriculumPhase.insertMany(phasesToCreate);
      if (!firstPlan) firstPlan = { ...plan.toObject(), phases: createdPhases };
    }

    res.status(201).json({ success: true, plan: firstPlan, message: `AI split ${topics.length} topics into schedule.` });
  } catch (err) {
    console.error("Bulk upload error:", err);
    next(err);
  }
});

router.post("/curriculum/add-topic", async (req, res, next) => {
  try {
    const { planId, phaseId, title, description } = req.body;
    
    if (!phaseId || !title) {
      return res.status(400).json({ success: false, message: "Phase ID and title are required" });
    }

    const phase = await CurriculumPhase.findById(phaseId);
    if (!phase) {
      return res.status(404).json({ success: false, message: "Phase not found" });
    }
    
    phase.topics.push({ title, description });
    await phase.save();

    // Fetch the updated plan to return
    const plan = await CurriculumPlan.findById(planId);
    const phases = await CurriculumPhase.find({ plan: planId }).sort({ phaseNumber: 1 });
    
    res.json({ success: true, plan: { ...plan.toObject(), phases } });
  } catch (err) {
    console.error("Add topic error:", err);
    next(err);
  }
});

router.post("/curriculum/publish/:planId", async (req, res, next) => {
  try {
    const plan = await CurriculumPlan.findById(req.params.planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    plan.status = "published";
    await plan.save();
    res.json({ success: true, message: "Curriculum Published successfully" });
  } catch (err) {
    next(err);
  }
});

router.delete("/curriculum/topic/:planId/:phaseId/:topicId", async (req, res, next) => {
  try {
    const { planId, phaseId, topicId } = req.params;
    
    const phase = await CurriculumPhase.findById(phaseId);
    if (!phase) {
      return res.status(404).json({ success: false, message: "Phase not found" });
    }
    
    phase.topics = phase.topics.filter(t => t._id.toString() !== topicId);
    await phase.save();

    // Fetch the updated plan to return
    const plan = await CurriculumPlan.findById(planId);
    const phases = await CurriculumPhase.find({ plan: planId }).sort({ phaseNumber: 1 });
    
    res.json({ success: true, plan: { ...plan.toObject(), phases } });
  } catch (err) {
    console.error("Delete topic error:", err);
    next(err);
  }
});

export default router;
