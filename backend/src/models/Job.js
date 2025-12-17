import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  requiredSkills: [{ type: String }],
  experience: { type: String, required: true },
  candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }],
}, {
  timestamps: true,
});

// Expose a stable jobId derived from _id for client convenience
JobSchema.virtual('jobId').get(function() {
  return this._id?.toString();
});

// Ensure virtuals (like jobId) appear in JSON
JobSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Job', JobSchema);