import mongoose from "mongoose";

const pdcaCycleSchema = new mongoose.Schema(
  {
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    menteeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    cycleNumber: { type: Number },
    title: { type: String },
    phase: { type: String, enum: ["Plan", "Do", "Check", "Act"], default: "Plan" },
    plan: { type: String },
    do: { type: String },
    check: { type: String },
    act: { type: String },
    status: { type: String, enum: ["In Progress", "Completed", "Active", "Review"], default: "In Progress" },
    targetDate: { type: Date },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const capstoneSubmissionSchema = new mongoose.Schema(
  {
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    milestone: { type: Number, required: true },
    fileUrl: { type: String },
    notes: { type: String },
    status: { type: String, enum: ["submitted", "approved", "rejected"], default: "submitted" },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const menteeObservationSchema = new mongoose.Schema(
  {
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    menteeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    observation: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    action: { type: String },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const mentorFeedbackSchema = new mongoose.Schema(
  {
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    category: { type: String, required: true },
    feedbackText: { type: String, required: true },
  },
  { timestamps: true }
);

export const PDCACycle = mongoose.model("PDCACycle", pdcaCycleSchema);
export const CapstoneSubmission = mongoose.model("CapstoneSubmission", capstoneSubmissionSchema);
export const MenteeObservation = mongoose.model("MenteeObservation", menteeObservationSchema);
export const MentorFeedback = mongoose.model("MentorFeedback", mentorFeedbackSchema);
