import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface CompanyInfoStepProps {
  onContinue: (companyName: string, position: string) => void;
  initialData?: { companyName: string, position: string };
}

const CompanyInfoStep: React.FC<CompanyInfoStepProps> = ({ onContinue, initialData }) => {
  const [companyName, setCompanyName] = useState(initialData?.companyName || '');
  const [position, setPosition] = useState(initialData?.position || '');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!companyName.trim() || !position.trim()) {
      setError('Both company name and position are required.');
      return;
    }
    setError('');
    onContinue(companyName, position);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">1. Company & Position</h2>
        <p className="text-slate-500 mt-1">
          First, let's get some basic details about the role you're hiring for.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="company-name" className="block text-sm font-medium leading-6 text-slate-900">
            Company Name
          </label>
          <div className="mt-2">
            <Input
              id="company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              required
            />
          </div>
        </div>
        <div>
          <label htmlFor="position" className="block text-sm font-medium leading-6 text-slate-900">
            Position / Job Title
          </label>
          <div className="mt-2">
            <Input
              id="position"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g., Senior Frontend Engineer"
              required
            />
          </div>
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end">
        <Button onClick={handleContinue} disabled={!companyName.trim() || !position.trim()}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default CompanyInfoStep;