import mongoose from "mongoose";

const umangCurriculumMonthSchema = new mongoose.Schema(
  {
    monthId: { type: Number, required: true, unique: true },
    theme: { type: String, required: true },
    focus: { type: String, required: true },
    deliverable: { type: String, required: true },
    weeks: { type: String, required: true },
    color: { type: String, required: true },
    badge: { type: String, required: true },
    keyQuestion: { type: String, required: true },
    objectives: [{ type: String }],
    facilitatorNote: { type: String, required: true },
  },
  { timestamps: true }
);

const umangGraduateDimensionSchema = new mongoose.Schema(
  {
    dimension: { type: String, required: true, unique: true },
    attribute: { type: String, required: true },
  },
  { timestamps: true }
);

const umangCapstoneTrackSchema = new mongoose.Schema(
  {
    trackId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    focus: { type: String, required: true },
    example: { type: String, required: true },
    outcome: { type: String, required: true },
  },
  { timestamps: true }
);

const umangInterviewQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: Number, required: true, unique: true },
    cat: { type: String, required: true },
    q: { type: String, required: true },
  },
  { timestamps: true }
);

export const UmangCurriculumMonth = mongoose.model("UmangCurriculumMonth", umangCurriculumMonthSchema);
export const UmangGraduateDimension = mongoose.model("UmangGraduateDimension", umangGraduateDimensionSchema);
export const UmangCapstoneTrack = mongoose.model("UmangCapstoneTrack", umangCapstoneTrackSchema);
export const UmangInterviewQuestion = mongoose.model("UmangInterviewQuestion", umangInterviewQuestionSchema);
