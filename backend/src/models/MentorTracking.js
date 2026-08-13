import mongoose from "mongoose";

const pdcaCycleSchema = new mongoose.Schema(
  {
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    menteeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cycleNumber: { type: Number, required: true },
    
    // PLAN Stage (Mentor)
    planTitle: { type: String, required: true },
    planObjective: { type: String },
    planArea: { type: String },
    planExpectedOutcomes: { type: String },
    planActivities: { type: String },
    planStartDate: { type: Date },
    planTargetDate: { type: Date },
    planInstructions: { type: String },
    planPublishedAt: { type: Date },

    // DO Stage (Teacher)
    doActivitiesCompleted: { type: String },
    doNotes: { type: String },
    doReflections: { type: String },
    doEvidence: { type: [String] }, // Array of URLs/links
    doSubmittedAt: { type: Date },

    // CHECK Stage (Mentor)
    checkFeedback: { type: String },
    checkScore: { type: String },
    checkStrengths: { type: String },
    checkGaps: { type: String },
    checkRecommendations: { type: String },
    revisionRequired: { type: Boolean, default: false },
    checkedAt: { type: Date },

    // ACT Stage (Teacher)
    actCorrectiveActions: { type: String },
    actChanged: { type: String },
    actReflections: { type: String },
    actEvidence: { type: [String] },
    actSubmittedAt: { type: Date },

    // Core Tracking
    status: { 
      type: String, 
      enum: [
        "DRAFT", 
        "PLAN_PUBLISHED", 
        "DO_IN_PROGRESS", 
        "DO_SUBMITTED", 
        "CHECK_IN_PROGRESS", 
        "CHECK_COMPLETED", 
        "ACT_IN_PROGRESS", 
        "ACT_SUBMITTED", 
        "COMPLETED"
      ], 
      default: "DRAFT" 
    },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Cycle numbering is meant to be scoped per (mentor, mentee) - e.g. each
// fellow's own cycles start at 1 - so the uniqueness constraint should match
// that, not just (mentor, cycleNumber). Without menteeId in the index, two
// different fellows both getting "cycle 1" under the same mentor would
// collide on a duplicate-key error.
pdcaCycleSchema.index({ mentorId: 1, menteeId: 1, cycleNumber: 1 }, { unique: true });

const capstoneSubmissionSchema = new mongoose.Schema(
  {
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    milestone: { type: Number, required: true },
    fileUrl: { type: String },
    evidenceLink: { type: String },
    notes: { type: String },
    status: { type: String, enum: ["submitted", "approved", "rejected"], default: "submitted" },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },
  },
  { timestamps: true }
);

const menteeObservationSchema = new mongoose.Schema(
  {
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    menteeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    observation: { type: String, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const PDCACycle = mongoose.models.PDCACycle || mongoose.model("PDCACycle", pdcaCycleSchema);
export const CapstoneSubmission =
  mongoose.models.CapstoneSubmission || mongoose.model("CapstoneSubmission", capstoneSubmissionSchema);
export const MenteeObservation =
  mongoose.models.MenteeObservation || mongoose.model("MenteeObservation", menteeObservationSchema);