import mongoose, { Document, Schema, Types } from 'mongoose';
import { Candidate as ICandidate } from '../types';

// Extend the Candidate model to include job linkage and file metadata
// Avoid redeclaring fields with different types by omitting them from ICandidate
export interface ICandidateModel extends Document, Omit<ICandidate, 'id' | 'job' | 'resumePath' | 'resumeOriginalName' | 'mimeType' | 'size'> {
  job: Types.ObjectId;
  resumePath: string;
  resumeOriginalName: string;
  mimeType: string;
  size: number;
}

const CandidateSchema: Schema = new Schema({
  fileName: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  matchScore: { type: Number, required: true },
  reasoning: { type: String, required: true },
  extractedSkills: [{ type: String }],

  job: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  resumePath: { type: String, required: true },
  resumeOriginalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
}, {
  timestamps: true,
});

// Virtual id mirrors _id for consistent frontend consumption
CandidateSchema.virtual('id').get(function(this: any) {
  return this._id?.toString();
});

CandidateSchema.set('toJSON', { virtuals: true });

export default mongoose.model<ICandidateModel>('Candidate', CandidateSchema);