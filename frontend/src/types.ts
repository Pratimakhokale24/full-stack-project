export enum Step {
  CompanyInfo = 1,
  JobDescription = 2,
  Candidates = 3,
  Shortlist = 4,
  Interview = 5,
}

export interface JobDetails {
  _id?: string; // MongoDB ID
  companyName: string;
  title: string;
  summary: string;
  requiredSkills: string[];
  experience: string;
}

export interface Candidate {
  _id?: string; // MongoDB ID
  id: string; // This will be the MongoDB _id as a string
  fileName: string;
  name: string;
  email: string;
  matchScore: number;
  reasoning: string;
  extractedSkills: string[];
  matchedSkills?: string[];
}

export interface InterviewInvite {
  subject: string;
  body: string;
}