
import React from 'react';
import { ChatIcon } from './icons/ChatIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface InteractionChoiceProps {
  onSelect: (mode: 'chat' | 'audio') => void;
}

const InteractionChoice: React.FC<InteractionChoiceProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col items-center text-center animate-fade-in">
        <div className="bg-teal-500/10 p-4 rounded-full mb-4 border border-teal-500/20">
            <ChatIcon className="w-8 h-8 text-teal-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100">Choose Your Interview Mode</h2>
        <p className="text-slate-400 mt-2 max-w-md">
            Select how you'd like to proceed with the AI-powered screening.
        </p>

        <div className="w-full max-w-sm mt-8 grid grid-cols-1 gap-4">
            <button
                onClick={() => onSelect('chat')}
                className="group p-6 bg-slate-900/50 rounded-lg border border-slate-700 text-left hover:border-blue-500 hover:bg-blue-900/20 transition-all"
            >
                <div className="flex items-center gap-4">
                    <ChatIcon className="w-8 h-8 text-blue-400"/>
                    <div>
                        <h3 className="font-bold text-lg text-slate-100">AI Chat Interview</h3>
                        <p className="text-slate-400 text-sm">Engage in a text-based interview with our AI.</p>
                    </div>
                </div>
            </button>
             <button
                onClick={() => onSelect('audio')}
                className="group p-6 bg-slate-900/50 rounded-lg border border-slate-700 text-left hover:border-purple-500 hover:bg-purple-900/20 transition-all"
            >
                <div className="flex items-center gap-4">
                    <MicrophoneIcon className="w-8 h-8 text-purple-400"/>
                    <div>
                        <h3 className="font-bold text-lg text-slate-100">Live Audio Interview</h3>
                        <p className="text-slate-400 text-sm">Voice conversation with our AI interviewer.</p>
                    </div>
                </div>
            </button>
            <div className="group p-6 bg-slate-800 rounded-lg border border-slate-700 text-left opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-400">Live Video Interview <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Coming Soon</span></h3>
                        <p className="text-slate-500 text-sm">Face-to-face interview with an AI avatar.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default InteractionChoice;
