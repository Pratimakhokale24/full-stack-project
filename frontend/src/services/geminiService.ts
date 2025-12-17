import { JobDetails, Candidate } from '../types';

const API_BASE_URL = 'http://localhost:3002/api';

export const analyzeAndCreateJob = async (jdText: string, jobTitle: string, companyName: string): Promise<JobDetails & { _id: string }> => {
    console.log('analyzeAndCreateJob called with:', { jdText, jobTitle, companyName });
    try {
        const response = await fetch(`${API_BASE_URL}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jdText, jobTitle, companyName }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to analyze job description.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error calling analyzeAndCreateJob API:", error);
        throw new Error("Failed to connect to the backend to analyze the job description.");
    }
};

export const getJobDetails = async (jobId: string): Promise<JobDetails & { candidates: Candidate[] }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch job details.');
        }
        const job = await response.json();
        // Map backend's _id to frontend's id for candidates
        const candidatesWithId = job.candidates.map((c: any) => ({ ...c, id: c._id }));
        return { ...job, candidates: candidatesWithId };
    } catch (error) {
        console.error("Error calling getJobDetails API:", error);
        throw new Error("Failed to connect to the backend to fetch job details.");
    }
};


export const screenCandidate = async (jobId: string, resumeFile: File): Promise<Candidate> => {
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('fileName', resumeFile.name);

    try {
        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/screen`, {
            method: 'POST',
            body: formData,
        });
        
        const result = await response.json();

        if (!response.ok) {
           return {
               id: result._id || `${Date.now()}-${resumeFile.name}`,
               fileName: resumeFile.name,
               name: result.name || `Error processing ${resumeFile.name}`,
               email: result.email || "",
               matchScore: result.matchScore || 0,
               reasoning: result.reasoning || "An unexpected error occurred on the backend.",
               extractedSkills: result.extractedSkills || [],
           };
        }
        
        return { ...result, id: result._id };

    } catch (error) {
        console.error(`Error calling screen API for ${resumeFile.name}:`, error);
        return {
            id: `${Date.now()}-${resumeFile.name}`,
            fileName: resumeFile.name,
            name: `Error processing ${resumeFile.name}`,
            email: "",
            matchScore: 0,
            reasoning: "Failed to connect to the backend to screen this resume.",
            extractedSkills: [],
        };
    }
};

export const draftInterviewEmail = async (candidateName: string, jobTitle: string, companyName: string): Promise<{ subject: string, body: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/draft-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ candidateName, jobTitle, companyName }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to draft email.');
        }

        return await response.json();

    } catch (error) {
        console.error("Error calling draft-email API:", error);
        throw new Error("Failed to connect to the backend to draft the interview invitation.");
    }
};