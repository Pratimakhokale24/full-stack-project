import React, { useState, useRef, useEffect } from 'react';
import { Candidate, JobDetails } from '../types';
import { screenCandidate } from '../services/geminiService';
import { Button } from './ui/Button';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';

interface CandidatesStepProps {
  jobDetails: JobDetails;
  onScreened: (candidates: Candidate[]) => void;
  onBack: () => void;
  existingCandidates: Candidate[];
}

const CandidatesStep: React.FC<CandidatesStepProps> = ({ jobDetails, onScreened, onBack, existingCandidates }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [screenedCandidates, setScreenedCandidates] = useState<Candidate[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setScreenedCandidates(existingCandidates);
  }, [existingCandidates]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).filter(
        // Filter out files that have already been screened
        (file) => !screenedCandidates.some(c => c.fileName === file.name)
      );
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
    event.target.value = '';
  };
  
  const removeFile = (fileName: string) => {
    setFiles(files.filter(file => file.name !== fileName));
  };

  const handleScreen = async () => {
    if (files.length === 0) {
      setError('Please upload at least one new resume.');
      return;
    }
    if (!jobDetails._id) {
        setError('Job details are missing. Please go back and try again.');
        return;
    }
    setIsLoading(true);
    setError(null);
    setProgress(0);

    const newScreenedCandidates: Candidate[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const result = await screenCandidate(jobDetails._id, file);
            newScreenedCandidates.push(result);
        } catch (e) {
             console.error(`Failed to process ${file.name}`, e);
             newScreenedCandidates.push({
                id: `${Date.now()}-${file.name}`,
                fileName: file.name,
                name: `Error processing ${file.name}`,
                email: "",
                matchScore: 0,
                reasoning: "Failed to read or analyze this resume.",
                extractedSkills: [],
            });
        }
        setProgress(((i + 1) / files.length) * 100);
    }
    
    onScreened([...screenedCandidates, ...newScreenedCandidates]);
    setIsLoading(false);
    setFiles([]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">3. Upload & Screen Resumes</h2>
        <p className="text-slate-500 mt-1">
          Upload candidate resumes (.txt, .pdf) to see how they match up against the <span className="font-semibold text-indigo-500">{jobDetails.title}</span> role. Previously screened candidates are listed below.
        </p>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 cursor-pointer hover:border-indigo-500 transition-colors"
      >
        <div className="text-center">
          <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4 flex text-sm leading-6 text-gray-600">
            <span
              className="relative font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Upload new resumes
            </span>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs leading-5 text-gray-600">TXT & PDF files supported</p>
        </div>
        <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept=".txt,.pdf,.doc,.docx" onChange={handleFileChange} />
      </div>
      
      {(files.length > 0 || screenedCandidates.length > 0) && (
         <div className="space-y-4">
            {screenedCandidates.length > 0 && (
                <div>
                    <h3 className="font-semibold text-slate-700">Previously Screened:</h3>
                    <ul className="space-y-2 mt-2">
                        {screenedCandidates.map((candidate) => (
                             <li key={candidate.id} className="flex items-center justify-between bg-slate-100 p-2 rounded-md text-sm">
                                <span className="truncate pr-2 font-medium text-slate-600">{candidate.fileName}</span>
                                <span className="text-green-600 font-semibold text-xs">SCREENED</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {files.length > 0 && (
                 <div>
                    <h3 className="font-semibold text-slate-700">Ready to Screen:</h3>
                    <ul className="space-y-2 mt-2">
                    {files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between bg-indigo-50 p-2 rounded-md text-sm">
                            <span className="truncate pr-2">{file.name}</span>
                            <button onClick={() => removeFile(file.name)} className="text-red-500 hover:text-red-700 flex-shrink-0">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </li>
                    ))}
                    </ul>
                </div>
            )}
        </div>
      )}

      {isLoading && (
        <div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
           <p className="text-center text-sm mt-2 text-slate-600">Screening {files.length} candidate{files.length > 1 ? 's' : ''} ({Math.round(progress)}%)...</p>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-between items-center mt-4">
        <Button onClick={onBack} variant="outline">Back</Button>
        <Button onClick={handleScreen} disabled={isLoading || files.length === 0}>
          {isLoading ? 'Screening...' : `Screen ${files.length} New Candidate${files.length > 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
};

export default CandidatesStep;