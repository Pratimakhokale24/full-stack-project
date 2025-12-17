import React, { useMemo, useState, useEffect } from 'react';
import { Candidate } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface ShortlistStepProps {
  candidates: Candidate[];
  requiredSkills: string[];
  invitedCandidates?: { candidate: Candidate; invite: { subject: string; body: string } }[];
  onProceed: (selected: Candidate[]) => void;
  onBack: () => void;
}
const ShortlistStep: React.FC<ShortlistStepProps> = ({ candidates, requiredSkills, invitedCandidates = [], onProceed, onBack }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const selectedCandidates = useMemo(() => {
    const set = new Set(selectedIds);
    return candidates.filter(c => set.has(c.id));
  }, [selectedIds, candidates]);

  const lowerReq = useMemo(() => requiredSkills.map(s => s.toLowerCase()), [requiredSkills]);
  const allSelectedMeetThreshold = useMemo(() => {
    if (selectedCandidates.length === 0 || lowerReq.length === 0) return false;
    return selectedCandidates.every(c => {
      const baseSkills = (c.matchedSkills && c.matchedSkills.length > 0
        ? c.matchedSkills
        : (c.extractedSkills || []));
      const skills = baseSkills.map(s => s.toLowerCase());
      const matchCount = lowerReq.filter(req => skills.includes(req)).length;
      return matchCount >= 3;
    });
  }, [selectedCandidates, lowerReq]);

  // Auto-select candidates that meet the ≥3 matched skills threshold
  useEffect(() => {
    const qualifyingIds = candidates.filter(c => {
      const baseSkills = (c.matchedSkills && c.matchedSkills.length > 0
        ? c.matchedSkills
        : (c.extractedSkills || []));
      const skills = baseSkills.map(s => s.toLowerCase());
      const matchCount = lowerReq.filter(req => skills.includes(req)).length;
      return lowerReq.length > 0 && matchCount >= 3;
    }).map(c => c.id);
    setSelectedIds(qualifyingIds);
  }, [candidates, lowerReq]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">4. Shortlisted Candidates</h2>
        <p className="text-slate-500 mt-1">
          Based on our analysis, here are the top candidates with skills matching the job description, sorted by relevance.
        </p>
      </div>

      {invitedCandidates.length > 0 && (
        <div className="border rounded-lg p-4 bg-emerald-50">
          <h3 className="text-sm font-semibold text-emerald-700">Shortlisted & Email Generated</h3>
          <div className="mt-2 grid gap-3">
            {invitedCandidates.map(({ candidate, invite }) => (
              <div key={candidate.id} className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-slate-800">{candidate.name}</div>
                  <div className="text-xs text-slate-500">{candidate.email || 'No email'}</div>
                  <div className="mt-1 text-xs text-slate-600">Subject: {invite.subject}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">Invited</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div className="mt-3">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(candidate.id)}
                    onChange={() => toggle(candidate.id)}
                    disabled={(() => {
                      const baseSkills = (candidate.matchedSkills && candidate.matchedSkills.length > 0
                        ? candidate.matchedSkills
                        : (candidate.extractedSkills || []));
                      const skills = baseSkills.map(s => s.toLowerCase());
                      const matchCount = lowerReq.filter(req => skills.includes(req)).length;
                      return lowerReq.length > 0 && matchCount < 3;
                    })()}
                  />
                  Select candidate
                </label>
              </div>
              <p className="mt-3 text-sm text-slate-600">{candidate.reasoning}</p>
              {(() => {
                const baseSkills = (candidate.matchedSkills && candidate.matchedSkills.length > 0
                  ? candidate.matchedSkills
                  : (candidate.extractedSkills || []));
                const lower = baseSkills.map(s => s.toLowerCase());
                const matchedOriginal = requiredSkills.filter(rs => lower.includes(rs.toLowerCase()));
                return matchedOriginal.length > 0;
              })() && (
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase">Matched Required Skills</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    {(() => {
                      const baseSkills = (candidate.matchedSkills && candidate.matchedSkills.length > 0
                        ? candidate.matchedSkills
                        : (candidate.extractedSkills || []));
                      const lower = baseSkills.map(s => s.toLowerCase());
                      const matchedOriginal = requiredSkills.filter(rs => lower.includes(rs.toLowerCase()));
                      return `Matched ${matchedOriginal.length} of ${lowerReq.length} required skills. Found: ${matchedOriginal.join(', ')}`;
                    })()}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(() => {
                      const baseSkills = (candidate.matchedSkills && candidate.matchedSkills.length > 0
                        ? candidate.matchedSkills
                        : (candidate.extractedSkills || []));
                      const lower = baseSkills.map(s => s.toLowerCase());
                      const matchedOriginal = requiredSkills.filter(rs => lower.includes(rs.toLowerCase()));
                      return matchedOriginal.slice(0, 6);
                    })().map((skill, i) => (
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
        <div className="flex items-center gap-2">
          <Button onClick={onBack} variant="outline">Back</Button>
          <Button onClick={() => onProceed(selectedCandidates)} variant="outline" disabled={!allSelectedMeetThreshold || selectedCandidates.length === 0}>Next</Button>
        </div>
        <div className="flex flex-col items-end">
          {!allSelectedMeetThreshold && selectedCandidates.length > 0 && (
            <span className="text-xs text-red-600 mb-2">Selected candidate(s) must match at least 3 skills from the job description.</span>
          )}
          <Button onClick={() => onProceed(selectedCandidates)} disabled={!allSelectedMeetThreshold || selectedCandidates.length === 0}>
            Prepare Interview Invites
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShortlistStep;