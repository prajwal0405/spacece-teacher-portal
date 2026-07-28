import mongoose from "mongoose";

const MaterialSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["pdf", "video", "link", "doc", "image"],
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  title: String,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const TopicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  orderIndex: {
    type: Number,
    default: 0,
  },
  materials: [MaterialSchema],
});

const curriculumPhaseSchema = new mongoose.Schema(
  {
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CurriculumPlan",
      required: true,
    },
    phaseNumber: {
      type: Number,
      required: true,
    },
    semester: {
      type: String, // e.g. "Semester 1"
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    startDate: Date,
    endDate: Date,
    topics: [TopicSchema],
  },
  { timestamps: true }
);

export const CurriculumPhase = mongoose.models.CurriculumPhase || mongoose.model("CurriculumPhase", curriculumPhaseSchema);

const curriculumPlanSchema = new mongoose.Schema(
  {
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedFellow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
    },
    durationType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    sourceFileName: String,
    sourceFileUrl: String,
  },
  { timestamps: true }
);

export const CurriculumPlan = mongoose.models.CurriculumPlan || mongoose.model("CurriculumPlan", curriculumPlanSchema);

const curriculumAssignmentSchema = new mongoose.Schema(
  {
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CurriculumPlan",
      required: true,
    },
    fellow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    activePhase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CurriculumPhase",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "dropped"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const CurriculumAssignment = mongoose.models.CurriculumAssignment || mongoose.model("CurriculumAssignment", curriculumAssignmentSchema);
