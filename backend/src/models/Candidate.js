import mongoose from 'mongoose';

const CandidateSchema = new mongoose.Schema({
  // Basic screening fields
  fileName: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  matchScore: { type: Number, required: true },
  reasoning: { type: String, required: true },
  extractedSkills: [{ type: String }],
  matchedSkills: [{ type: String }],

  // Denormalized job/company context for convenience
  companyName: { type: String },
  jobTitle: { type: String },

  // Association and file storage metadata
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  resumePath: { type: String, required: true },
  resumeOriginalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
}, {
  timestamps: true,
});

// Virtual id mirrors _id for consistent frontend consumption
CandidateSchema.virtual('id').get(function() {
  return this._id?.toString();
});

// Ensure virtuals appear in JSON and toObject responses
CandidateSchema.set('toJSON', { virtuals: true });
CandidateSchema.set('toObject', { virtuals: true });

export default mongoose.model('Candidate', CandidateSchema);