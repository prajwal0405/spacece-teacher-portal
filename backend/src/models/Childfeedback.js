import mongoose from "mongoose";

/**
 * Teacher-side AI-generated feedback for a specific child.
 * Freeform teacher notes are converted by AI into a standardized
 * structure (strengths / areas needing support / recommendation),
 * which the teacher can edit before submitting to admin.
 */
const childFeedbackSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: "Child", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Original teacher input, kept for traceability/audit.
    freeformText: { type: String, required: true },

    // Final, teacher-approved structured fields (may equal or differ
    // from the raw AI output, since the teacher can edit before submit).
    strengths: { type: String, default: "" },
    areasNeedingSupport: { type: String, default: "" },
    recommendation: { type: String, default: "" },

    // Was AI actually used, or a local fallback template.
    aiProvider: { type: String, default: "local" },

    status: { type: String, enum: ["submitted"], default: "submitted" },
    reviewStatus: { type: String, enum: ["pending", "reviewed"], default: "pending" },
  },
  { timestamps: true }
);

export const ChildFeedback = mongoose.model("ChildFeedback", childFeedbackSchema);