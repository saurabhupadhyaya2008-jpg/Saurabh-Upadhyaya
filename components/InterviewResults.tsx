import React from 'react';
import { InterviewResults } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface InterviewResultsProps {
  results: InterviewResults;
  onRestart: () => void;
}

const InterviewResultsComponent: React.FC<InterviewResultsProps> = ({ results, onRestart }) => {
    
  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-400';
    if (rating >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  const isCertified = results.performanceRating >= 7;
  const ratingColorClass = getRatingColor(results.performanceRating);

  // Circular progress bar calculations
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  // Ensure score is within 0-10 for calculation
  const clampedScore = Math.max(0, Math.min(10, results.performanceRating));
  const scorePercentage = clampedScore / 10;
  const offset = circumference - scorePercentage * circumference;


  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
        {isCertified && (
            <div className="bg-green-500/10 p-4 rounded-full mb-4 border border-green-500/20">
                <CheckCircleIcon className="w-8 h-8 text-green-400" />
            </div>
        )}
      <h2 className="text-2xl font-bold text-slate-100">Interview Performance Report</h2>
      <p className="text-slate-400 mt-2 max-w-lg">
        Congratulations on completing the interview. Here is your performance analysis.
      </p>

      <div className="w-full max-w-2xl mt-8 text-left space-y-6">
        
        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 flex flex-col items-center">
            <p className="text-lg font-semibold text-slate-300 mb-4">Overall Performance Rating</p>
            <div className="relative w-40 h-40">
                <svg className="w-full h-full" viewBox="0 0 120 120">
                    <circle
                        className="text-slate-700"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="60"
                        cy="60"
                    />
                    <circle
                        className={ratingColorClass}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="60"
                        cy="60"
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${ratingColorClass}`}>
                        {results.performanceRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-slate-400">/ 10</span>
                </div>
            </div>
        </div>

        {isCertified && (
            <div className="flex items-center gap-4 bg-green-900/50 p-4 rounded-lg border border-green-700">
                <CheckCircleIcon className="w-10 h-10 text-green-400 flex-shrink-0"/>
                <div>
                    <h3 className="font-bold text-lg text-green-300">TalentGraph Certified</h3>
                    <p className="text-sm text-green-400">You've demonstrated strong skills and communication. This certification will be added to your profile.</p>
                </div>
            </div>
        )}
        
        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
             <h3 className="font-semibold text-lg text-slate-200 mb-3">AI Summary</h3>
             <p className="text-slate-300">{results.summary}</p>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
            <h3 className="font-semibold text-lg text-blue-400 mb-3">Demonstrated Skills</h3>
            <div className="flex flex-wrap gap-2">
                {results.demonstratedSkills.map((skill, index) => (
                    <span key={index} className="bg-slate-700 text-slate-200 text-sm font-medium px-3 py-1 rounded-full">{skill}</span>
                ))}
            </div>
        </div>
      </div>
      
      <button
        onClick={onRestart}
        className="mt-10 bg-slate-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-500 transition-colors"
        >
          Start Over
        </button>
    </div>
  );
};

export default InterviewResultsComponent;