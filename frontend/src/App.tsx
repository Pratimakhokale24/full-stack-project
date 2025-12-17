import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Step, JobDetails, Candidate } from './types';
import StepTracker from './components/StepTracker';
import CompanyInfoStep from './components/CompanyInfoStep';
import JobDescriptionStep from './components/JobDescriptionStep';
import CandidatesStep from './components/CandidatesStep';
import ShortlistStep from './components/ShortlistStep';
import InterviewStep from './components/InterviewStep';
import Login from './components/Login';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { analyzeAndCreateJob, getJobDetails } from './services/geminiService';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [authed, setAuthed] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [companyNameState, setCompanyNameState] = useState<string | null>(() => localStorage.getItem('companyName'));
  const [userEmailState, setUserEmailState] = useState<string | null>(() => localStorage.getItem('userEmail'));

  const handleAuthed = (newToken: string) => {
    setToken(newToken);
    setAuthed(true);
    setCompanyNameState(localStorage.getItem('companyName'));
    setUserEmailState(localStorage.getItem('userEmail'));
  };
  const [currentStep, setCurrentStep] = useState<Step>(() => {
    try {
      const saved = localStorage.getItem('jobScreening_currentStep');
      return saved ? (JSON.parse(saved) as Step) : Step.CompanyInfo;
    } catch {
      return Step.CompanyInfo;
    }
  });

  const [jobId, setJobId] = useState<string | null>(() => localStorage.getItem('jobScreening_jobId'));
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCandidates, setSelectedCandidates] = useState<Candidate[]>([]);
  const [invitedCandidates, setInvitedCandidates] = useState<{ candidate: Candidate; invite: { subject: string; body: string } }[]>(() => {
    try {
      const saved = localStorage.getItem('jobScreening_invitedCandidates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist invited candidates to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('jobScreening_invitedCandidates', JSON.stringify(invitedCandidates));
    } catch {}
  }, [invitedCandidates]);


  useEffect(() => {
    localStorage.setItem('jobScreening_currentStep', JSON.stringify(currentStep));
  }, [currentStep]);

  useEffect(() => {
    if (jobId) {
      localStorage.setItem('jobScreening_jobId', jobId);
    } else {
      localStorage.removeItem('jobScreening_jobId');
    }
  }, [jobId]);
  
  const loadJobData = useCallback(async (id: string) => {
      try {
          const data = await getJobDetails(id);
          setJobDetails(data);
          setAllCandidates(data.candidates || []);
      } catch (error) {
          console.error("Failed to load job data", error);
          // If job not found on server, reset the app
          handleRestart();
      } finally {
          setIsLoading(false);
      }
  }, []);

  useEffect(() => {
      if (jobId) {
        loadJobData(jobId);
      } else {
        setIsLoading(false);
      }
  }, [jobId, loadJobData]);

  const shortlistedCandidates = useMemo(() => {
    // Threshold: require at least 3 matched skills between requiredSkills and candidate skills, plus a minimal score.
    const required = (jobDetails?.requiredSkills || []).map(s => s.toLowerCase());
    return allCandidates
      .filter((c) => {
        const score = typeof c.matchScore === 'number' ? c.matchScore : 0;
        const baseSkills = Array.isArray(c.matchedSkills) && c.matchedSkills.length > 0
          ? c.matchedSkills
          : (Array.isArray(c.extractedSkills) ? c.extractedSkills : []);
        const skills = baseSkills.map(s => s.toLowerCase());
        const matchCount = required.filter(req => skills.includes(req)).length;
        const meetsThreshold = required.length > 0 && matchCount >= 3;
        return meetsThreshold && score >= 30;
      })
      .sort((a, b) => {
        const aScore = typeof a.matchScore === 'number' ? a.matchScore : 0;
        const bScore = typeof b.matchScore === 'number' ? b.matchScore : 0;
        return bScore - aScore;
      });
  }, [allCandidates, jobDetails]);

  const handleCompanyInfoSubmit = (companyName: string, position: string) => {
    setJobDetails({
      companyName: companyName,
      title: position,
      summary: '',
      requiredSkills: [],
      experience: '',
    });
    setCurrentStep(Step.JobDescription);
  };

  const handleJobDescriptionAnalyzed = async (jdText: string) => {
    if (!jobDetails) return;
    const { companyName, title } = jobDetails;
    const createdJob = await analyzeAndCreateJob(jdText, title, companyName);
    setJobDetails(createdJob);
    setJobId(createdJob._id!);
    setAllCandidates([]); // Reset candidates for new job
    setCurrentStep(Step.Candidates);
  };

  const handleCandidatesScreened = (candidates: Candidate[]) => {
    setAllCandidates(candidates);
    setSelectedCandidates([]);
    setCurrentStep(Step.Shortlist);
  };

  const handleProceedToInterview = (selected: Candidate[]) => {
    setSelectedCandidates(selected);
    setCurrentStep(Step.Interview);
  };

  const handleInviteGenerated = (candidate: Candidate, invite: { subject: string; body: string }) => {
    setInvitedCandidates((prev) => {
      const withoutDup = prev.filter((ic) => ic.candidate.id !== candidate.id);
      return [...withoutDup, { candidate, invite }];
    });
  };

  const handleGoBack = () => {
    if (currentStep > Step.CompanyInfo) {
      setCurrentStep(currentStep - 1);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('companyName');
    localStorage.removeItem('userEmail');
    setToken(null);
    setAuthed(false);
    setShowMenu(false);
    handleRestart();
  };
  
  const handleRestart = () => {
    setCurrentStep(Step.CompanyInfo);
    setJobDetails(null);
    setAllCandidates([]);
    setJobId(null);
  };

  const renderCurrentStep = () => {
    if(isLoading) return <div className="text-center p-8">Loading session...</div>
    
    switch (currentStep) {
      case Step.CompanyInfo:
        return <CompanyInfoStep 
                    onContinue={handleCompanyInfoSubmit} 
                    initialData={jobDetails ? { companyName: jobDetails.companyName, position: jobDetails.title } : undefined}
                />;
      case Step.JobDescription:
        return <JobDescriptionStep 
                    jobDetails={jobDetails!} 
                    onAnalyzed={handleJobDescriptionAnalyzed} 
                    onBack={handleGoBack} 
                />;
      case Step.Candidates:
        return <CandidatesStep jobDetails={jobDetails!} onScreened={handleCandidatesScreened} onBack={handleGoBack} existingCandidates={allCandidates} />;
      case Step.Shortlist:
        return (
          <ShortlistStep
            candidates={shortlistedCandidates}
            requiredSkills={jobDetails?.requiredSkills || []}
            invitedCandidates={invitedCandidates}
            onProceed={handleProceedToInterview}
            onBack={handleGoBack}
          />
        );
      case Step.Interview:
        return <InterviewStep candidates={selectedCandidates.length > 0 ? selectedCandidates : shortlistedCandidates} jobDetails={jobDetails!} onRestart={handleRestart} onBack={handleGoBack} onInviteGenerated={handleInviteGenerated} />;
      default:
        // If state is inconsistent, offer to restart
        return (
            <div className="text-center">
                <p>An unexpected error occurred or your session is invalid.</p>
                <button onClick={handleRestart} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md">
                    Start Over
                </button>
            </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-10 relative">
          <div className="flex items-center justify-center gap-3 text-3xl md:text-4xl font-bold text-slate-900">
            <SparklesIcon className="w-8 h-8 text-indigo-500" />
            <h1>Job Screening Assistant</h1>
          </div>
          <p className="mt-2 text-slate-500 text-lg">
            Streamline your hiring process with AI-powered insights.
          </p>
          {authed && (
            <div className="absolute top-2 right-2">
              <button
                className="px-3 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-sm"
                onClick={() => setShowMenu((v) => !v)}
              >
                {(companyNameState || 'Company')} ▾
              </button>
              {showMenu && (
                <div className="mt-2 w-64 bg-white rounded-md shadow-lg border p-3 text-left">
                  <div className="mb-2">
                    <div className="text-sm font-semibold text-slate-800">{companyNameState || 'Company'}</div>
                    <div className="text-xs text-slate-500">{userEmailState || 'No email'}</div>
                  </div>
                  <hr className="my-2" />
                  <div className="flex flex-col gap-2">
                    <button
                      className="text-sm text-slate-700 hover:text-indigo-600 text-left"
                      onClick={() => { setCurrentStep(Step.Shortlist); setShowMenu(false); }}
                    >
                      Candidates shortlisted
                    </button>
                    <button
                      className="text-sm text-slate-700 hover:text-indigo-600 text-left"
                      onClick={() => { /* Profile is shown above; keep minimal per request */ setShowMenu(false); }}
                    >
                      Profile
                    </button>
                    <button
                      className="text-sm text-red-600 hover:text-red-700 text-left"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        <main className="max-w-4xl mx-auto">
          {!authed ? (
            <Login onAuthenticated={(t, _cn, _em) => handleAuthed(t)} />
          ) : (
            <>
              <StepTracker currentStep={currentStep} />
              <div className="mt-8 bg-white p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300">
                {renderCurrentStep()}
              </div>
            </>
          )}
        </main>
        <footer className="text-center mt-12 text-slate-400 text-sm">
            <p>powerd by Student@2026</p>
        </footer>
      </div>
    </div>
  );
}