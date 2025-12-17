import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GoogleGenAI, Type } from "@google/genai";
import connectDB from './src/config/db.js';
import Job from './src/models/Job.js';
import Candidate from './src/models/Candidate.js';
import CompanyUser from './src/models/CompanyUser.js';

dotenv.config();
connectDB();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3002;

// ESM-friendly __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow local frontend (both 3000 and 3001)
app.use(cors());
app.use(express.json());

// Store resumes on disk under uploads/jobs/<jobId>/
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const jobId = req.params.jobId || 'unknown';
    const uploadDir = path.join(__dirname, 'uploads', 'jobs', jobId);
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
      // Fallback: ensure at least base uploads directory exists
      fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const safeOriginal = file.originalname.replace(/[^\w\.-]/g, '_');
    cb(null, `${Date.now()}-${safeOriginal}`);
  }
});
const upload = multer({ storage });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Sanitize candidate names to avoid PDF headers, control chars, and leading non-letters
function sanitizeCandidateName(name) {
  const str = String(name || '');
  const cleaned = str
    // Remove leading PDF headers like %PDF-1.5
    .replace(/^\s*%PDF-[0-9.]+\s*/i, '')
    // Remove any leading non-letter characters
    .replace(/^[^A-Za-z]+/, '')
    // Strip ASCII control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim();
  return cleaned || 'Candidate';
}

// Health/help root route so opening http://localhost:3002 works
app.get('/', (req, res) => {
  res.type('text').send('Backend is running. Use /api endpoints. Example: POST /api/jobs, GET /api/jobs/:id, POST /api/jobs/:jobId/screen');
});

// Simple API index with available endpoints
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Job Screening API',
    endpoints: [
      { method: 'POST', path: '/api/jobs', description: 'Analyze JD and create job' },
      { method: 'GET', path: '/api/jobs/:id', description: 'Get job details with candidates' },
      { method: 'POST', path: '/api/jobs/:jobId/screen', description: 'Upload resume and screen for job' },
      { method: 'POST', path: '/api/draft-email', description: 'Draft interview email' },
      { method: 'POST', path: '/api/auth/register', description: 'Register a company account' },
      { method: 'POST', path: '/api/auth/login', description: 'Login to a company account' }
    ]
  });
});

// Simple password hashing using Node crypto (no external deps)
const hashPassword = (password, salt) => {
  return crypto.createHash('sha256').update(String(password) + String(salt)).digest('hex');
};

// Register a company account
app.post('/api/auth/register', async (req, res) => {
  try {
    const { companyName, email, password } = req.body || {};
    if (!companyName || !email || !password) {
      return res.status(400).json({ error: 'companyName, email, and password are required.' });
    }
    const existing = await CompanyUser.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Account with this email already exists.' });
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const user = new CompanyUser({ companyName, email: String(email).toLowerCase(), passwordHash, salt });
    await user.save();
    res.status(201).json({ id: user._id.toString(), companyName: user.companyName, email: user.email });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register.' });
  }
});

// Login to company account
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }
    const user = await CompanyUser.findOne({ email: String(email).toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const hashed = hashPassword(password, user.salt);
    if (hashed !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    // Issue a simple opaque token (not JWT) for client-side tracking
    const token = crypto.randomBytes(24).toString('hex');
    res.json({ token, user: { id: user._id.toString(), companyName: user.companyName, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login.' });
  }
});

// Endpoint to analyze a job description and create a new job entry
app.post('/api/jobs', async (req, res) => {
    console.log('Received request to /api/jobs with body:', req.body);
    const { jdText, jobTitle, companyName } = req.body;
    if (!jdText || !jobTitle || !companyName) {
        return res.status(400).json({ error: 'Job description, title, and company name are required.' });
    }

    try {
        // Canonical skills we track; we detect synonyms/variants in text
        const skillsKeywords = [
          "javascript", "react", "node.js", "python", "java", "c++", "c#", "go", "ruby", "php", "swift", "kotlin",
          "typescript", "sql", "nosql", "mongodb", "postgres", "mysql", "docker", "kubernetes", "aws", "azure", "gcp"
        ];

        const jdLower = jdText.toLowerCase();
        const jdNormalized = jdLower.replace(/[\s\W_]+/g, '');

        const makeVariants = (skill) => {
          const s = skill.toLowerCase();
          const base = s.replace(/[\s\W_]+/g, '');
          const variants = new Set([s, base]);
          if (s === 'node.js' || s === 'nodejs' || s === 'node js') {
            variants.add('node.js'); variants.add('nodejs'); variants.add('node js');
          }
          if (s === 'javascript' || s === 'js') { variants.add('javascript'); variants.add('js'); }
          if (s === 'typescript' || s === 'ts') { variants.add('typescript'); variants.add('ts'); }
          if (s === 'react' || s === 'reactjs' || s === 'react js') {
            variants.add('react'); variants.add('reactjs'); variants.add('react js');
          }
          if (s === 'c++' || s === 'cpp' || s === 'c plus plus') { variants.add('c++'); variants.add('cpp'); variants.add('cplusplus'); }
          if (s === 'c#' || s === 'c sharp' || s === 'csharp') { variants.add('c#'); variants.add('csharp'); variants.add('c sharp'); }
          if (s === 'kubernetes' || s === 'k8s') { variants.add('kubernetes'); variants.add('k8s'); }
          if (s === 'aws' || s === 'amazon web services') { variants.add('aws'); variants.add('amazon web services'); }
          if (s === 'gcp' || s === 'google cloud' || s === 'google cloud platform') { variants.add('gcp'); variants.add('google cloud'); variants.add('google cloud platform'); }
          if (s === 'mongodb' || s === 'mongo db') { variants.add('mongodb'); variants.add('mongo db'); }
          if (s === 'postgres' || s === 'postgresql') { variants.add('postgres'); variants.add('postgresql'); }
          return Array.from(variants);
        };

        const textContainsInJD = (skill) => {
          const variants = makeVariants(skill);
          return variants.some(v => (
            jdLower.includes(v) ||
            jdNormalized.includes(v.replace(/[\s\W_]+/g, ''))
          ));
        };

        const extractedSkills = skillsKeywords.filter(skill => textContainsInJD(skill));

        const details = {
            summary: `A ${jobTitle} role at ${companyName}.`,
            requiredSkills: extractedSkills,
            experience: "Not specified"
        };
        
        const newJob = new Job({
            companyName,
            title: jobTitle,
            ...details
        });
        console.log('New job created:', newJob);
        await newJob.save();
        console.log('Job saved to database');

        res.status(201).json(newJob);
    } catch (error) {
        console.error("Error creating job:", error);
        res.status(500).json({ error: 'Failed to analyze the job description and create job entry.' });
    }
});

// Endpoint to get a job and its candidates by ID
app.get('/api/jobs/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid job ID' });
        }
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
app.post('/api/jobs/:jobId/screen', upload.single('resume'), async (req, res) => {
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ error: 'Invalid job ID' });
    }
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: 'A resume file is required.' });
    }
    // Accept missing fileName and infer from uploaded file metadata
    const fileName = req.body.fileName || file.originalname || path.basename(file.path);

    try {
        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found.' });
        }

        // Read resume text from saved file (supports .txt best; PDF/others would need parsers)
        let resumeText = '';
        let resumeLatin1 = '';
        try {
          const buf = fs.readFileSync(file.path);
          resumeText = buf.toString('utf-8');
          // Also keep a latin1 representation to catch plain ASCII in PDFs/DOCs
          resumeLatin1 = buf.toString('latin1');
        } catch (e) {
          resumeText = '';
          resumeLatin1 = '';
        }

        const resumeTextLower = (resumeText || '').toLowerCase();
        const resumeTextNormalized = resumeTextLower.replace(/[\s\W_]+/g, '');
        const resumeLatin1Lower = (resumeLatin1 || '').toLowerCase();
        const resumeLatin1Normalized = resumeLatin1Lower.replace(/[\s\W_]+/g, '');

        // Helper to check presence using multiple variants
        const makeVariants = (skill) => {
          const s = skill.toLowerCase();
          const base = s.replace(/[\s\W_]+/g, '');
          const variants = new Set([s, base]);
          if (s === 'node.js' || s === 'nodejs' || s === 'node js') {
            variants.add('node.js'); variants.add('nodejs'); variants.add('node js');
          }
          if (s === 'javascript' || s === 'js') { variants.add('javascript'); variants.add('js'); }
          if (s === 'typescript' || s === 'ts') { variants.add('typescript'); variants.add('ts'); }
          if (s === 'react' || s === 'reactjs' || s === 'react js') {
            variants.add('react'); variants.add('reactjs'); variants.add('react js');
          }
          if (s === 'c++' || s === 'cpp' || s === 'c plus plus') { variants.add('c++'); variants.add('cpp'); variants.add('cplusplus'); }
          if (s === 'c#' || s === 'c sharp' || s === 'csharp') { variants.add('c#'); variants.add('csharp'); variants.add('c sharp'); }
          if (s === 'kubernetes' || s === 'k8s') { variants.add('kubernetes'); variants.add('k8s'); }
          if (s === 'aws' || s === 'amazon web services') { variants.add('aws'); variants.add('amazon web services'); }
          if (s === 'gcp' || s === 'google cloud' || s === 'google cloud platform') { variants.add('gcp'); variants.add('google cloud'); variants.add('google cloud platform'); }
          if (s === 'mongodb' || s === 'mongo db') { variants.add('mongodb'); variants.add('mongo db'); }
          if (s === 'postgres' || s === 'postgresql') { variants.add('postgres'); variants.add('postgresql'); }
          return Array.from(variants);
        };

        const textContainsSkill = (skill) => {
          const variants = makeVariants(skill);
          return variants.some(v => (
            resumeTextLower.includes(v) ||
            resumeTextNormalized.includes(v.replace(/[\s\W_]+/g, '')) ||
            resumeLatin1Lower.includes(v) ||
            resumeLatin1Normalized.includes(v.replace(/[\s\W_]+/g, ''))
          ));
        };

        // Keyword matching using required skills, with graceful fallback
        const requiredSkillsOrig = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
        const requiredSkills = requiredSkillsOrig.map(skill => (typeof skill === 'string' ? skill.toLowerCase() : String(skill).toLowerCase()));
        let extractedSkills = [];
        if (requiredSkills.length > 0) {
          extractedSkills = requiredSkills.filter(skill => textContainsSkill(skill));
        } else {
          // Fallback to a common skills list if job has no requiredSkills
          const defaultSkills = [
            'javascript','react','node.js','python','java','c++','c#','go','ruby','php','swift','kotlin','typescript','sql','nosql',
            'mongodb','postgres','mysql','docker','kubernetes','aws','azure','gcp'
          ];
          extractedSkills = defaultSkills.filter(skill => textContainsSkill(skill));
        }

        // Calculate match score robustly
        let matchScore = 0;
        if (requiredSkills.length > 0) {
          const denom = requiredSkills.length;
          matchScore = denom > 0 ? Math.round((extractedSkills.length / denom) * 100) : 0;
        } else {
          // Fallback scoring: each matched default skill adds 10 points, capped at 100
          matchScore = Math.min(100, extractedSkills.length * 10);
        }
        if (!Number.isFinite(matchScore) || Number.isNaN(matchScore)) {
          matchScore = 0;
        }

        // Basic info extraction (simple regex, can be improved)
        const nameMatch = resumeText.match(/^([^\n\r]+)/);
        const emailMatch = resumeText.match(/[\w\.-]+@[\w\.-]+/);
        
        let candidateName = nameMatch ? nameMatch[0].trim() : '';
        // Sanitize obvious non-text headers
        candidateName = sanitizeCandidateName(candidateName);
        if (candidateName === 'Candidate' || candidateName === 'Unknown' || !candidateName) {
          // Fallback: try deriving from original filename
          const base = (file.originalname || fileName || '').replace(/\.[^\.]+$/, '');
          const derived = base.replace(/[\-_]+/g, ' ').replace(/\s+/g, ' ').trim();
          candidateName = sanitizeCandidateName(derived);
        }
        const candidateEmail = emailMatch ? emailMatch[0].trim() : 'Not found';

        const reasoning = requiredSkills.length > 0
          ? `Matched ${extractedSkills.length} of ${requiredSkills.length} required skills. Found: ${extractedSkills.join(', ')}.`
          : (extractedSkills.length > 0
              ? `Detected relevant skills: ${extractedSkills.join(', ')}.`
              : `No matching skills detected. Ensure the resume is text-based or includes specific keywords.`);

        const screeningResult = {
            name: candidateName,
            email: candidateEmail,
            extractedSkills,
            matchScore,
            reasoning,
        };

        const candidateData = {
            fileName,
            ...screeningResult,
            matchedSkills: extractedSkills,
            companyName: job.companyName,
            jobTitle: job.title,
            job: jobId,
            resumePath: file.path,
            resumeOriginalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        };

        const newCandidate = new Candidate(candidateData);
        await newCandidate.save();

        job.candidates.push(newCandidate._id);
        await job.save();

        res.status(201).json({ ...newCandidate.toObject(), id: newCandidate._id.toString() });

    } catch (error) {
        console.error(`Error screening candidate ${fileName}:`, error);
        res.status(500).json({
            id: `${Date.now()}-${fileName}`,
            fileName: fileName,
            name: `Error processing ${fileName}`,
            email: "",
            matchScore: 0,
            reasoning: "The server failed to analyze this resume.",
            extractedSkills: [],
        });
    }
});

// Endpoint to draft an interview email (stateless, no DB interaction needed)
app.post('/api/draft-email', async (req, res) => {
    const { candidateName, jobTitle, companyName } = req.body;
    const safeName = sanitizeCandidateName(candidateName);
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
1.  **Greeting:** Start with "Hi ${safeName},"
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
        // Graceful fallback: return a deterministic template when AI is unavailable or API key invalid
        const subject = `Interview Invitation for ${jobTitle} at ${companyName}`;
        const body = [
          `Hi ${safeName},`,
          ``,
          `Thank you for your interest in the ${jobTitle} role at ${companyName}. We were impressed with your background and would like to invite you to a 30-minute interview to discuss your experience and the role in more detail.`,
          ``,
          `Please reply with a few time slots of your availability over the next week, and we will send a calendar invite accordingly.`,
          ``,
          `Best regards,`,
          `The Hiring Team`,
        ].join('\n');
        res.json({ subject, body });
    }
});

const server = app.listen(port, () => {
    console.log(`Backend server listening on http://localhost:${port}`);
});

server.on('error', (err) => {
    if ((err.code || '') === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Either stop the other process or set PORT to a free port.`);
        console.error('Tips: On Windows, run "netstat -ano | findstr :' + port + '" to find PID, then "taskkill /PID <pid> /F".');
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});