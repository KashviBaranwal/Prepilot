import mongoose from 'mongoose';
const qSchema = new mongoose.Schema({
  question: String,
  answer: { type: String, default: '' },
  score: { type: Number, default: null },
  feedback: { type: String, default: '' },
  strengths: [String],
  improvements: [String],
});
const interviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: String,
    level: String,
    questions: [qSchema],
    overallScore: { type: Number, default: null },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
  },
  { timestamps: true }
);
export default mongoose.model('Interview', interviewSchema);
