import { JobDetails, Candidate } from '../types';

const API_BASE_URL = 'localhost url';

export const summarizeJobDescription = async (jdText: string, jobTitle: string): Promise<Omit<JobDetails, 'companyName' | 'title'>> => {
    try {
        const response = await fetch(`${API_BASE_URL}/summarize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jdText, jobTitle }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to analyze job description.');
        }

        return await response.json();

    } catch (error) {
        console.error("Error calling summarize API:", error);
        throw new Error("Failed to connect to the backend to analyze the job description.");
    }
};

export const screenCandidate = async (jobDetails: JobDetails, resumeFile: File): Promise<Candidate> => {
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jobDetails', JSON.stringify(jobDetails));
    formData.append('fileName', resumeFile.name);

    try {
        const response = await fetch(`${API_BASE_URL}/screen`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
           // Use the error structure returned by the backend
           return {
               id: result.id || `${Date.now()}-${resumeFile.name}`,
               fileName: resumeFile.name,
               name: result.name || `Error processing ${resumeFile.name}`,
               email: result.email || "",
               matchScore: result.matchScore || 0,
               reasoning: result.reasoning || "An unexpected error occurred on the backend.",
               extractedSkills: result.extractedSkills || [],
           };
        }
        
        return result;

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
