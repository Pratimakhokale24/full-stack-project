export interface JobDetails {
  _id?: string; // MongoDB ID
  companyName: string;
  title: string;
  summary: string;
  requiredSkills: string[];
  experience: string;
}

export interface Candidate {
  id: string; // MongoDB _id as a string
  fileName: string;
  name: string;
  email: string;
  matchScore: number;
  reasoning: string;
  extractedSkills: string[];
  // New fields for persistence and association
  job?: string; // Job ObjectId as string
  resumePath?: string;
  resumeOriginalName?: string;
  mimeType?: string;
  size?: number;
}
