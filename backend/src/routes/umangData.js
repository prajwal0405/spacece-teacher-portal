import express from "express";
import { UmangCurriculumMonth, UmangGraduateDimension, UmangCapstoneTrack, UmangInterviewQuestion } from "../models/UmangData.js";

const router = express.Router();

router.get("/curriculum-months", async (req, res, next) => {
  try {
    const months = await UmangCurriculumMonth.find().sort({ monthId: 1 });
    res.json({ success: true, data: months });
  } catch (err) {
    next(err);
  }
});

router.get("/graduate-dimensions", async (req, res, next) => {
  try {
    const dimensions = await UmangGraduateDimension.find();
    res.json({ success: true, data: dimensions });
  } catch (err) {
    next(err);
  }
});

router.get("/capstone-tracks", async (req, res, next) => {
  try {
    const tracks = await UmangCapstoneTrack.find();
    res.json({ success: true, data: tracks });
  } catch (err) {
    next(err);
  }
});

router.get("/interview-questions", async (req, res, next) => {
  try {
    const questions = await UmangInterviewQuestion.find().sort({ questionId: 1 });
    res.json({ success: true, data: questions });
  } catch (err) {
    next(err);
  }
});

export default router;
