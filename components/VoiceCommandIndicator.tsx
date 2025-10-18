import React from 'react';
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface VoiceCommandIndicatorProps {
  isListening: boolean;
  feedback: string | null;
  availableCommands: string[];
  error: string | null;
}

const VoiceCommandIndicator: React.FC<VoiceCommandIndicatorProps> = ({ isListening, feedback, availableCommands, error }) => {
  
  const getIndicatorContent = () => {
    if (error) {
      return <span className="text-red-400">Error: {error}</span>;
    }
    if (feedback) {
        return <span className="text-blue-300">{feedback}</span>
    }
    if (isListening) {
      return "Listening...";
    }
    return "Voice control inactive";
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl p-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MicrophoneIcon className={`w-6 h-6 ${isListening ? 'text-blue-400 animate-pulse-fast' : 'text-slate-500'}`} />
          <div className="text-sm">
            <p className="font-semibold text-slate-200">{getIndicatorContent()}</p>
            {availableCommands.length > 0 && (
                 <p className="text-slate-400 text-xs">
                    Try saying: {availableCommands.join(' or ')}
                </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceCommandIndicator;