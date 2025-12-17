import React from 'react';
import { Step } from '../types';
import { BuildingIcon } from './icons/BuildingIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';

interface StepTrackerProps {
  currentStep: Step;
}

const steps = [
  { id: Step.CompanyInfo, name: 'Company Info', icon: BuildingIcon },
  { id: Step.JobDescription, name: 'Job Description', icon: BriefcaseIcon },
  { id: Step.Candidates, name: 'Screen Candidates', icon: UserPlusIcon },
  { id: Step.Shortlist, name: 'View Shortlist', icon: CheckCircleIcon },
  { id: Step.Interview, name: 'Send Invites', icon: EnvelopeIcon },
];

const StepTracker: React.FC<StepTrackerProps> = ({ currentStep }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''} flex-1`}>
            {step.id < currentStep ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-indigo-600" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600">
                  <step.icon className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
              </>
            ) : step.id === currentStep ? (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-600 bg-white">
                  <step.icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                </div>
                 <span className="absolute -bottom-6 text-center w-full text-xs font-semibold text-indigo-600 sm:text-sm">{step.name}</span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="h-0.5 w-full bg-gray-200" />
                </div>
                <div className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                    <step.icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default StepTracker;