import React, { useState, useMemo, useEffect } from 'react';
import { Step, JobDetails, Candidate } from './types';
import StepTracker from './components/StepTracker';
import CompanyInfoStep from './components/CompanyInfoStep';
import JobDescriptionStep from './components/JobDescriptionStep';
import CandidatesStep from './components/CandidatesStep';
import ShortlistStep from './components/ShortlistStep';
import InterviewStep from './components/InterviewStep';
import { SparklesIcon } from './components/icons/SparklesIcon';

export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>(() => {
    try {
      const saved = localStorage.getItem('jobScreening_currentStep');
      return saved ? (JSON.parse(saved) as Step) : Step.CompanyInfo;
    } catch {
      return Step.CompanyInfo;
    }
  });

  const [jobDetails, setJobDetails] = useState<JobDetails | null>(() => {
    try {
      const saved = localStorage.getItem('jobScreening_jobDetails');
      return saved ? (JSON.parse(saved) as JobDetails) : null;
    } catch {
      return null;
    }
  });

  const [allCandidates, setAllCandidates] = useState<Candidate[]>(() => {
    try {
      const saved = localStorage.getItem('jobScreening_allCandidates');
      return saved ? (JSON.parse(saved) as Candidate[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('jobScreening_currentStep', JSON.stringify(currentStep));
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem('jobScreening_jobDetails', JSON.stringify(jobDetails));
  }, [jobDetails]);

  useEffect(() => {
    localStorage.setItem('jobScreening_allCandidates', JSON.stringify(allCandidates));
  }, [allCandidates]);

  const shortlistedCandidates = useMemo(() => {
    return allCandidates
      .filter((c) => c.extractedSkills.length > 0)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [allCandidates]);

  const handleCompanyInfoSubmit = (companyName: string, position: string) => {
    setJobDetails(prev => ({
      ...prev,
      companyName: companyName,
      title: position,
      summary: prev?.summary || '',
      requiredSkills: prev?.requiredSkills || [],
      experience: prev?.experience || '',
    }));
    setCurrentStep(Step.JobDescription);
  };

  const handleJobDescriptionAnalyzed = (details: Omit<JobDetails, 'companyName' | 'title'>) => {
    setJobDetails(prev => {
        if (!prev) return null;
        return { 
            ...prev,
            summary: details.summary,
            requiredSkills: details.requiredSkills,
            experience: details.experience,
        };
    });
    setCurrentStep(Step.Candidates);
  };

  const handleCandidatesScreened = (candidates: Candidate[]) => {
    setAllCandidates(candidates);
    setCurrentStep(Step.Shortlist);
  };

  const handleProceedToInterview = () => {
    setCurrentStep(Step.Interview);
  };

  const handleGoBack = () => {
    if (currentStep > Step.CompanyInfo) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleRestart = () => {
    setCurrentStep(Step.CompanyInfo);
    setJobDetails(null);
    setAllCandidates([]);
  };

  const renderCurrentStep = () => {
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
        return <CandidatesStep jobDetails={jobDetails!} onScreened={handleCandidatesScreened} onBack={handleGoBack} />;
      case Step.Shortlist:
        return (
          <ShortlistStep
            candidates={shortlistedCandidates}
            onProceed={handleProceedToInterview}
            onBack={handleGoBack}
          />
        );
      case Step.Interview:
        return <InterviewStep candidates={shortlistedCandidates} jobDetails={jobDetails!} onRestart={handleRestart} onBack={handleGoBack} />;
      default:
        return <div>Invalid Step</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 text-3xl md:text-4xl font-bold text-slate-900">
            <SparklesIcon className="w-8 h-8 text-indigo-500" />
            <h1>Job Screening Assistant</h1>
          </div>
          <p className="mt-2 text-slate-500 text-lg">
            Streamline your hiring process with AI-powered insights.
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <StepTracker currentStep={currentStep} />
          <div className="mt-8 bg-white p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300">
            {renderCurrentStep()}
          </div>
        </main>
        <footer className="text-center mt-12 text-slate-400 text-sm">
            <p>powerd by Student@2026</p>
        </footer>
      </div>
    </div>
  );
}