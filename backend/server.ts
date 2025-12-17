
import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";
import { JobDetails, Candidate } from '../frontend/types.ts';

dotenv.config();

const app = express();
const port = 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Setup for handling file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Endpoint to summarize a job description
// Fix: Use imported Request and Response types for route handlers.
app.post('/api/summarize', async (req: Request, res: Response) => {
    const { jdText, jobTitle } = req.body;
    if (!jdText || !jobTitle) {
        return res.status(400).json({ error: 'Job description and title are required.' });
    }

    try {
        const model = 'gemini-2.5-pro';
        const response = await ai.models.generateContent({
            model,
            contents: `Analyze the following job description for a "${jobTitle}" position. Extract a concise summary (2-3 sentences), a list of essential technical skills, and the required years of experience.
---
${jdText}
---`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING, description: "A concise 2-3 sentence summary of the role." },
                        requiredSkills: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "A list of essential technical skills mentioned."
                        },
                        experience: { type: Type.STRING, description: "The required years of experience (e.g., '5+ years')." }
                    },
                    required: ["summary", "requiredSkills", "experience"]
                }
            }
        });

        const text = response.text;
        if (!text) {
            console.error('AI model response was empty or invalid for summarize.');
            return res.status(500).json({ error: 'Failed to get a valid response from the AI model.' });
        }

        const jsonStr = text.trim();
        const details = JSON.parse(jsonStr);
        res.json(details);
    } catch (error) {
        console.error("Error summarizing job description:", error);
        res.status(500).json({ error: 'Failed to analyze the job description.' });
    }
});

// Endpoint to screen a candidate's resume
// Fix: Use imported Request and Response types for route handlers.
app.post('/api/screen', upload.single('resume'), async (req: Request, res: Response) => {
    const jobDetails: JobDetails = JSON.parse(req.body.jobDetails);
    const file = req.file;
    const fileName = req.body.fileName;
    
    if (!jobDetails || !file || !fileName) {
        return res.status(400).json({ error: 'Job details and a resume file are required.' });
    }

    try {
        const model = 'gemini-2.5-flash';
        const promptPart = {
            text:`Critically analyze the attached candidate's resume against the following job requirements.

**Job Requirements:**
- Title: ${jobDetails.title}
- Required Skills: ${jobDetails.requiredSkills.join(', ')}
- Experience: ${jobDetails.experience}

Please provide the following in a strict JSON format:
1. The candidate's full name.
2. The candidate's email address.
3. A list of skills from the resume that directly match the required skills.
4. A strict match score (0-100). Be very critical. A score of 85+ is for perfect matches only. A score below 50 is for unqualified candidates.
5. A brief reasoning (2-3 sentences) for the score, highlighting strengths and, more importantly, weaknesses. Specifically mention any key required skills that are missing.`
        };

        const filePart = {
          inlineData: {
            mimeType: file.mimetype,
            data: file.buffer.toString('base64'),
          },
        };
        
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [promptPart, filePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "Candidate's full name." },
                        email: { type: Type.STRING, description: "Candidate's email address." },
                        extractedSkills: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "List of skills from the resume that match the job's required skills."
                        },
                        matchScore: { type: Type.INTEGER, description: "A strict match score from 0 to 100." },
                        reasoning: { type: Type.STRING, description: "Brief reasoning for the score, including missing skills." },
                    },
                    required: ["name", "email", "extractedSkills", "matchScore", "reasoning"]
                }
            }
        });

        const text = response.text;
        if (!text) {
            console.error('AI model response was empty or invalid for screen.');
            return res.status(500).json({ error: 'Failed to get a valid response from the AI model.' });
        }

        const jsonStr = text.trim();
        const screeningResult = JSON.parse(jsonStr);

        const candidate: Candidate = {
            id: `${Date.now()}-${fileName}`,
            fileName,
            ...screeningResult
        };
        res.json(candidate);
    } catch (error) {
        console.error(`Error screening candidate ${fileName}:`, error);
        res.status(500).json({
             id: `${Date.now()}-${fileName}`,
            fileName: fileName,
            name: `Error processing ${fileName}`,
            email: "",
            matchScore: 0,
            reasoning: "AI failed to analyze this resume. It might be in an unsupported format or the API call failed.",
            extractedSkills: [],
        });
    }
});


// Endpoint to draft an interview email
// Fix: Use imported Request and Response types for route handlers.
app.post('/api/draft-email', async (req: Request, res: Response) => {
    const { candidateName, jobTitle, companyName } = req.body;
    if (!candidateName || !jobTitle || !companyName) {
        return res.status(400).json({ error: 'Candidate name, job title, and company name are required.' });
    }

    try {
        const model = 'gemini-2.5-flash';
        const response = await ai.models.generateContent({
            model,
            contents: `Draft a professional and friendly interview invitation email based on the following details.

**Details:**
- Candidate's Name: ${candidateName}
- Job Title: ${jobTitle}
- Company Name: ${companyName}

**Instructions for the email body:**
1.  **Greeting:** Start with "Hi ${candidateName},"
2.  **Paragraph 1:** Thank them for their application for the ${jobTitle} position at ${companyName}. Express interest in their profile.
3.  **Paragraph 2:** Invite them for a 30-minute interview to discuss their experience and learn more about the role.
4.  **Paragraph 3:** Ask them to provide a few time slots of their availability for the upcoming week.
5.  **Closing:** Sign off with a warm closing like "Best regards," followed by "The Hiring Team".

**Crucial Formatting Requirement:**
- The email body MUST use newline characters (\\n) to create clear paragraphs. For example: "Paragraph 1.\\n\\nParagraph 2."

The tone must be professional, warm, and encouraging. Do not include placeholders like "[Your Company Name]" or "[Hiring Manager Name]".`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subject: { type: Type.STRING, description: `The subject line for the email. Example: "Interview Invitation for ${jobTitle} at ${companyName}"` },
                        body: { type: Type.STRING, description: "The full body of the email, formatted with newlines between paragraphs." }
                    },
                    required: ["subject", "body"]
                }
            }
        });
        
        const text = response.text;
        if (!text) {
            console.error('AI model response was empty or invalid for draft-email.');
            return res.status(500).json({ error: 'Failed to get a valid response from the AI model.' });
        }
        
        const jsonStr = text.trim();
        const emailContent = JSON.parse(jsonStr);
        res.json(emailContent);
    } catch (error) {
        console.error("Error drafting email:", error);
        res.status(500).json({ error: 'Failed to draft the interview email.' });
    }
});


app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
});
