export enum Step {
  CompanyInfo = 1,
  JobDescription = 2,
  Candidates = 3,
  Shortlist = 4,
  Interview = 5,
}

export interface JobDetails {
  companyName: string;
  title: string;
  summary: string;
  requiredSkills: string[];
  experience: string;
}

export interface Candidate {
  id: string;
  fileName: string;
  name: string;
  email: string;
  matchScore: number;
  reasoning: string;
  extractedSkills: string[];
}

export interface InterviewInvite {
  subject: string;
  body: string;
}
