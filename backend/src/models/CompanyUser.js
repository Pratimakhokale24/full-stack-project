import mongoose from 'mongoose';

const CompanyUserSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  salt: { type: String, required: true },
}, { timestamps: true });

CompanyUserSchema.virtual('id').get(function() { return this._id?.toString(); });
CompanyUserSchema.set('toJSON', { virtuals: true });
CompanyUserSchema.set('toObject', { virtuals: true });

export default mongoose.model('CompanyUser', CompanyUserSchema);