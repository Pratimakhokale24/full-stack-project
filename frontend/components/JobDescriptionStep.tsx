import React, { useState } from 'react';
import { JobDetails } from '../types';
import { summarizeJobDescription } from '../services/geminiService';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { SparklesIcon } from './icons/SparklesIcon';

interface JobDescriptionStepProps {
  jobDetails: JobDetails;
  onAnalyzed: (details: Omit<JobDetails, 'companyName' | 'title'>) => void;
  onBack: () => void;
}

const JobDescriptionStep: React.FC<JobDescriptionStepProps> = ({ jobDetails, onAnalyzed, onBack }) => {
  const [jdText, setJdText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!jdText.trim()) {
      setError('Please paste a job description.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const details = await summarizeJobDescription(jdText, jobDetails.title);
      onAnalyzed(details);
    } catch (err: any)
{
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">2. Paste Job Description</h2>
        <p className="text-slate-500 mt-1">
          Provide the job description for the <span className="font-semibold text-indigo-500">{jobDetails.title}</span> role at <span className="font-semibold text-indigo-500">{jobDetails.companyName}</span>.
        </p>
      </div>
      <Textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="e.g., Senior Frontend Engineer needed for a fast-growing startup..."
        rows={12}
        disabled={isLoading}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-between items-center">
        <Button onClick={onBack} variant="outline">Back</Button>
        <Button onClick={handleAnalyze} disabled={isLoading || !jdText.trim()}>
          {isLoading ? (
            'Analyzing...'
          ) : (
            <>
              <SparklesIcon className="w-5 h-5 mr-2" />
              Analyze & Continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default JobDescriptionStep;
