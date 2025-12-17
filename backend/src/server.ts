import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";
import connectDB from './config/db';
import Job from './models/Job';
import Candidate from './models/Candidate';
import { Candidate as ICandidate } from './types';

dotenv.config();
connectDB();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Endpoint to analyze a job description and create a new job entry
app.post('/api/jobs', async (req: Request, res: Response) => {
    const { jdText, jobTitle, companyName } = req.body;
    if (!jdText || !jobTitle || !companyName) {
        return res.status(400).json({ error: 'Job description, title, and company name are required.' });
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
        if (!text) throw new Error('AI model response was empty.');

        const details = JSON.parse(text.trim());
        
        const newJob = new Job({
            companyName,
            title: jobTitle,
            ...details
        });
        await newJob.save();

        res.status(201).json(newJob);
    } catch (error) {
        console.error("Error creating job:", error);
        res.status(500).json({ error: 'Failed to analyze the job description and create job entry.' });
    }
});

// Endpoint to get a job and its candidates by ID
app.get('/api/jobs/:id', async (req: Request, res: Response) => {
    try {
        const job = await Job.findById(req.params.id).populate('candidates');
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(job);
    } catch (error) {
        console.error("Error fetching job:", error);
        res.status(500).json({ error: 'Failed to fetch job details.' });
    }
});


// Endpoint to screen a candidate's resume for a specific job
app.post('/api/jobs/:jobId/screen', upload.single('resume'), async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const file = req.file;
    const fileName = req.body.fileName;
    
    if (!file || !fileName) {
        return res.status(400).json({ error: 'A resume file is required.' });
    }

    try {
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found.' });
        }

        const model = 'gemini-2.5-flash';
        const promptPart = {
            text:`Critically analyze the attached candidate's resume against the following job requirements.

**Job Requirements:**
- Title: ${job.title}
- Required Skills: ${job.requiredSkills.join(', ')}
- Experience: ${job.experience}

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
        if (!text) throw new Error('AI model response was empty for screen.');

        const screeningResult = JSON.parse(text.trim());

        const candidateData: Omit<ICandidate, 'id'> = {
            fileName,
            ...screeningResult
        };

        const newCandidate = new Candidate(candidateData);
        await newCandidate.save();

        // Fix: Cast `newCandidate._id` to `any` to resolve incorrect type inference by TypeScript.
        job.candidates.push(newCandidate._id as any);
        await job.save();

        // The 'id' field for the frontend is the MongoDB '_id'
        res.status(201).json({ ...newCandidate.toObject(), id: newCandidate.id.toString() });

    } catch (error) {
        console.error(`Error screening candidate ${fileName}:`, error);
        res.status(500).json({
            id: `${Date.now()}-${fileName}`,
            fileName: fileName,
            name: `Error processing ${fileName}`,
            email: "",
            matchScore: 0,
            reasoning: "We failed to analyze this resume. It might be in an unsupported format or the API call failed.",
            extractedSkills: [],
        });
    }
});


// Endpoint to draft an interview email (stateless, no DB interaction needed)
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
        if (!text) throw new Error('AI model response was empty for draft-email.');
        
        const emailContent = JSON.parse(text.trim());
        res.json(emailContent);
    } catch (error) {
        console.error("Error drafting email:", error);
        res.status(500).json({ error: 'Failed to draft the interview email.' });
    }
});


app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
});