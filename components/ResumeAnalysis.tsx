import React from 'react';
import { ResumeAnalysis } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface ResumeAnalysisProps {
  analysis: ResumeAnalysis;
  onNext: () => void;
}

const ResumeAnalysisComponent: React.FC<ResumeAnalysisProps> = ({ analysis, onNext }) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
      <div className="bg-purple-500/10 p-4 rounded-full mb-4 border border-purple-500/20">
        <SparklesIcon className="w-8 h-8 text-purple-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-100">AI Resume Analysis</h2>
      <p className="text-slate-400 mt-2 max-w-lg">
        Here's a breakdown of your resume's strengths and areas for improvement.
      </p>

      <div className="w-full max-w-3xl mt-8 text-left space-y-6">
        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 text-center">
            <p className="text-sm text-slate-400">Overall Score</p>
            <p className={`text-6xl font-bold ${getScoreColor(analysis.score)}`}>{analysis.score}<span className="text-3xl text-slate-500">/100</span></p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-lg text-green-400 mb-3">Strengths</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                    {analysis.strengths.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
             <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-lg text-yellow-400 mb-3">Areas for Improvement</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                    {analysis.areasForImprovement.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
             <h3 className="font-semibold text-lg text-blue-400 mb-3">Suggested Keywords</h3>
             <div className="flex flex-wrap gap-2">
                {analysis.suggestedKeywords.map((keyword, index) => (
                    <span key={index} className="bg-slate-700 text-slate-200 text-sm font-medium px-3 py-1 rounded-full">{keyword}</span>
                ))}
             </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
             <h3 className="font-semibold text-lg text-orange-400 mb-3">Identified Experience Gaps</h3>
             <ul className="list-disc list-inside space-y-2 text-slate-300">
                {analysis.experienceGaps.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        </div>
        
        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
             <h3 className="font-semibold text-lg text-indigo-400 mb-3">Tailored Project Suggestions</h3>
             <div className="space-y-4">
                {analysis.suggestedProjects.map((project, index) => (
                    <div key={index} className="bg-slate-800 p-4 rounded-md border border-slate-600/50">
                        <h4 className="font-bold text-slate-100">{project.title}</h4>
                        <p className="text-sm text-slate-400 mt-1 mb-3">{project.description}</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-400 font-semibold">Skills gained:</span>
                            {project.skillsGained.map((skill, i) => (
                                <span key={i} className="bg-slate-700 text-slate-200 text-xs font-medium px-2 py-1 rounded-full">{skill}</span>
                            ))}
                        </div>
                    </div>
                ))}
             </div>
        </div>
      </div>

       <button
        onClick={onNext}
        className="mt-10 inline-flex items-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-500 disabled:bg-slate-600 transition-all transform hover:scale-105"
        >
          Proceed to AI Interview
          <ChevronRightIcon className="w-5 h-5"/>
        </button>
    </div>
  );
};

export default ResumeAnalysisComponent;