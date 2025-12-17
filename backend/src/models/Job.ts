import mongoose, { Document, Schema } from 'mongoose';
import { JobDetails as IJobDetails } from '../types';

// Fix: Omit the conflicting '_id' property from IJobDetails to prevent type collision with Mongoose's Document interface.
export interface IJobDetailsModel extends Omit<IJobDetails, '_id'>, Document {
    candidates: mongoose.Types.ObjectId[];
}

const JobSchema: Schema = new Schema({
  companyName: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  requiredSkills: [{ type: String }],
  experience: { type: String, required: true },
  candidates: [{ type: Schema.Types.ObjectId, ref: 'Candidate' }],
}, {
  timestamps: true,
});

// Virtual jobId mirrors the Mongo _id for convenience in clients
JobSchema.virtual('jobId').get(function(this: any) {
  return this._id?.toString();
});

JobSchema.set('toJSON', { virtuals: true });

export default mongoose.model<IJobDetailsModel>('Job', JobSchema);