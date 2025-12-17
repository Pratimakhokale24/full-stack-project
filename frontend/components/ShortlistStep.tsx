import React from 'react';
import { Candidate } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface ShortlistStepProps {
  candidates: Candidate[];
  onProceed: () => void;
  onBack: () => void;
}

const ShortlistStep: React.FC<ShortlistStepProps> = ({ candidates, onProceed, onBack }) => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">4. Shortlisted Candidates</h2>
        <p className="text-slate-500 mt-1">
          Based on our analysis, here are the top candidates with skills matching the job description, sorted by relevance.
        </p>
      </div>

      {candidates.length > 0 ? (
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <Card key={candidate.id} className="p-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{candidate.name}</h3>
                  <p className="text-sm text-slate-500">{candidate.email || 'No email found'}</p>
                </div>
                <div className="mt-2 sm:mt-0 text-lg font-bold text-indigo-600">
                  {candidate.matchScore}% Match
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{candidate.reasoning}</p>
              {candidate.extractedSkills.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase">Key Skills</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {candidate.extractedSkills.slice(0, 5).map((skill, i) => (
                      <span key={i} className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <h3 className="text-slate-700 font-semibold">No candidates met the shortlist criteria.</h3>
            <p className="text-slate-500 text-sm mt-1">Try uploading more resumes or adjusting your job description.</p>
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <Button onClick={onBack} variant="outline">Back</Button>
        <Button onClick={onProceed} disabled={candidates.length === 0}>
          Prepare Interview Invites
        </Button>
      </div>
    </div>
  );
};

export default ShortlistStep;
