import mongoose from "mongoose";

const MaterialSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["pdf", "video", "link", "doc", "image"],
    default: "doc",
  },
  fileUrl: {
    type: String,
    default: "",
  },
  title: String,
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const ModuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  modeOfDelivery: [{ type: String }], // e.g. ["Bootcamp", "Field Visit", "Online", "Roleplay"]
  deliverables: [{ type: String }],  // e.g. ["Child observation sheets", "Milestone chart"]
  assessmentMethods: [{ type: String }], // e.g. ["Observation checklist", "Written evaluation"]
  durationWeeks: {
    type: Number,
    default: 4,
  },
  orderIndex: {
    type: Number,
    default: 0,
  },
  resources: [MaterialSchema],
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
    status: {
      type: String,
      enum: ["upcoming", "active", "closed"],
      default: "active",
    },
    skillThemes: [{ type: String }],
    modules: [ModuleSchema],
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
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    durationMonths: {
      type: Number,
      default: 12,
    },
    numSemesters: {
      type: Number,
      default: 4,
    },
    durationType: {
      type: String,
      default: "1yr",
    },
    skillThemes: [{ type: String }],
    assignedFellows: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    version: {
      type: Number,
      default: 1,
    },
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
    },
    assignedModules: [{ type: String }], // Array of module titles or IDs assigned
    completedItems: [
      {
        phaseId: String,
        moduleIndex: Number,
        itemKey: String, // e.g. "phaseId_moduleIdx_deliverableIdx"
        title: String,
        completedAt: { type: Date, default: Date.now }
      }
    ],
    progressPercent: {
      type: Number,
      default: 0
    },
    dueDate: Date,
    movementHistory: [
      {
        movedFromPhase: { type: mongoose.Schema.Types.ObjectId, ref: "CurriculumPhase" },
        movedToPhase: { type: mongoose.Schema.Types.ObjectId, ref: "CurriculumPhase" },
        movedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        movedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active",
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const CurriculumAssignment = mongoose.models.CurriculumAssignment || mongoose.model("CurriculumAssignment", curriculumAssignmentSchema);
