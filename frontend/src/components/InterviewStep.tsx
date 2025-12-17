import React, { useState } from 'react';
import { Candidate, JobDetails, InterviewInvite } from '../types';
import { draftInterviewEmail } from '../services/geminiService';
import { Button } from './ui/Button';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { Card } from './ui/Card';
import { Textarea } from './ui/Textarea';

interface InterviewStepProps {
  candidates: Candidate[];
  jobDetails: JobDetails;
  onRestart: () => void;
  onBack: () => void;
  onInviteGenerated?: (candidate: Candidate, invite: InterviewInvite) => void;
}

const InterviewStep: React.FC<InterviewStepProps> = ({ candidates, jobDetails, onRestart, onBack, onInviteGenerated }) => {
  const [generatedInvites, setGeneratedInvites] = useState<Record<string, InterviewInvite>>({});
  const [loadingInvite, setLoadingInvite] = useState<string | null>(null);

  const handleGenerateInvite = async (candidate: Candidate) => {
    setLoadingInvite(candidate.id);
    try {
      const emailContent = await draftInterviewEmail(candidate.name, jobDetails.title, jobDetails.companyName);
      setGeneratedInvites((prev) => ({ ...prev, [candidate.id]: emailContent }));
      onInviteGenerated?.(candidate, emailContent);
    } catch (error) {
      console.error(error);
      setGeneratedInvites((prev) => ({ ...prev, [candidate.id]: { subject: 'Error', body: 'Error generating email.'} }));
    } finally {
      setLoadingInvite(null);
    }
  };
  
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a small toast notification here for better UX
  };

  const handleSendEmail = (email: string, invite: InterviewInvite) => {
    const subject = encodeURIComponent(invite.subject);
    const body = encodeURIComponent(invite.body);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">5. Send Interview Invites</h2>
        <p className="text-slate-500 mt-1">
          Generate personalized interview invitations for your shortlisted candidates.
        </p>
      </div>

      <div className="space-y-4">
        {candidates.map((candidate) => (
          <Card key={candidate.id} className="p-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{candidate.name}</h3>
                <p className="text-sm text-slate-500">{candidate.email || 'No email provided'}</p>
              </div>
              <Button 
                onClick={() => handleGenerateInvite(candidate)} 
                disabled={!!loadingInvite}
                className="mt-3 sm:mt-0"
                variant="secondary"
              >
                {loadingInvite === candidate.id ? 'Generating...' : (
                    <>
                        <EnvelopeIcon className="w-5 h-5 mr-2" />
                        Generate Invite
                    </>
                )}
              </Button>
            </div>
            {generatedInvites[candidate.id] && (
              <div className="mt-4 border-t pt-4">
                <Textarea 
                  value={`Subject: ${generatedInvites[candidate.id].subject}\n\n${generatedInvites[candidate.id].body}`} 
                  readOnly 
                  rows={12} 
                />
                <div className="flex justify-end mt-2 gap-2">
                    <Button 
                      onClick={() => handleCopyToClipboard(`Subject: ${generatedInvites[candidate.id].subject}\n\n${generatedInvites[candidate.id].body}`)} 
                      variant="outline" 
                      size="sm"
                    >
                        Copy to Clipboard
                    </Button>
                    <Button 
                      onClick={() => handleSendEmail(candidate.email, generatedInvites[candidate.id])} 
                      variant="secondary" 
                      size="sm"
                      disabled={!candidate.email}
                    >
                        <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                        Send Email
                    </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      
       <div className="mt-6 text-center border-t pt-6">
            <h3 className="text-lg font-semibold text-slate-800">Process Complete!</h3>
            <p className="text-slate-500 mt-1">You've successfully screened and shortlisted candidates.</p>
            <div className="flex justify-center items-center gap-4 mt-4">
                <Button onClick={onBack} variant="outline">
                    Back to Shortlist
                </Button>
                <Button onClick={onRestart}>
                    Start a New Screening
                </Button>
            </div>
        </div>
    </div>
  );
};

export default InterviewStep;