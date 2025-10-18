import React, { useState, useEffect } from 'react';
import { AppState, ResumeAnalysis, ChatMessage, InterviewResults as InterviewResultsType } from './types';
import ResumeUpload from './components/ResumeUpload';
import ResumeAnalysisComponent from './components/ResumeAnalysis';
import InteractionChoice from './components/InteractionChoice';
import ChatInterview from './components/ChatInterview';
import InterviewResults from './components/InterviewResults';
import { analyzeResume, summarizeInterview } from './services/geminiService';
import Loader from './components/Loader';
import LiveAudioInterview from './components/LiveAudioInterview';
import VoiceCommandIndicator from './components/VoiceCommandIndicator';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.ResumeUpload);
  const [resumeText, setResumeText] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('');
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [interviewResults, setInterviewResults] = useState<InterviewResultsType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [voiceCommandFeedback, setVoiceCommandFeedback] = useState<string | null>(null);

  const { transcript, isListening, startListening, stopListening, error: speechError, resetTranscript } = useSpeechRecognition();

  const handleResumeSubmit = async () => {
    setAppState(AppState.Analyzing);
    setError(null);
    try {
      const analysis = await analyzeResume(resumeText, targetRole);
      setResumeAnalysis(analysis);
      setAppState(AppState.AnalysisResult);
    } catch (err) {
      setError('Failed to analyze resume. Please try again.');
      setAppState(AppState.ResumeUpload);
    }
  };

  const handleProceedToInteraction = () => {
    setAppState(AppState.InteractionChoice);
  };

  const handleInteractionChoice = (mode: 'chat' | 'audio') => {
    setChatHistory([]); 
    if (mode === 'chat') {
      setAppState(AppState.ChatInterview);
    } else {
      setAppState(AppState.LiveAudioInterview);
    }
  };
  
  const handleInterviewComplete = async (finalChatHistory: ChatMessage[]) => {
    setAppState(AppState.Summarizing);
    setError(null);
    setChatHistory(finalChatHistory);
    try {
      const summary = await summarizeInterview(finalChatHistory);
      setInterviewResults(summary);
      setAppState(AppState.InterviewResult);
    } catch(err) {
      setError('Failed to summarize interview. Please try again.');
      // Fallback to the last active interview state
      if(appState === AppState.ChatInterview) setAppState(AppState.ChatInterview)
      else setAppState(AppState.LiveAudioInterview);
    }
  };

  const handleRestart = () => {
    setAppState(AppState.ResumeUpload);
    setResumeText('');
    setTargetRole('');
    setResumeAnalysis(null);
    setInterviewResults(null);
    setError(null);
    setChatHistory([]);
  };

  // --- Voice Command Logic ---
  const isVoiceControlActive = appState === AppState.ResumeUpload || appState === AppState.InteractionChoice;

  useEffect(() => {
    if (isVoiceControlActive && !isListening) {
      startListening();
    } else if (!isVoiceControlActive && isListening) {
      stopListening();
    }
  }, [appState, isListening, startListening, stopListening, isVoiceControlActive]);


  useEffect(() => {
    if (!transcript) return;

    const command = transcript.toLowerCase().trim();
    setVoiceCommandFeedback(`Heard: "${command}"`);
    let commandProcessed = false;

    if (appState === AppState.ResumeUpload) {
      if (command.includes('analyze') || command.includes('submit')) {
        if (resumeText.trim() && targetRole.trim()) {
          handleResumeSubmit();
          commandProcessed = true;
        } else {
           setVoiceCommandFeedback("Please fill out the resume and target role first.");
        }
      }
    } else if (appState === AppState.InteractionChoice) {
      if (command.includes('chat')) {
        handleInteractionChoice('chat');
        commandProcessed = true;
      } else if (command.includes('audio') || command.includes('voice')) {
        handleInteractionChoice('audio');
        commandProcessed = true;
      }
    }
    
    // Reset after a delay
    setTimeout(() => {
        setVoiceCommandFeedback(null);
        if(commandProcessed) resetTranscript();
    }, 2000);

  }, [transcript, appState, resumeText, targetRole, resetTranscript]);


  const getAvailableCommands = (): string[] => {
    switch(appState) {
        case AppState.ResumeUpload:
            return ['"Analyze resume"'];
        case AppState.InteractionChoice:
            return ['"Start chat interview"', '"Start audio interview"'];
        default:
            return [];
    }
  }
  
  const renderContent = () => {
    switch (appState) {
      case AppState.ResumeUpload:
        return <ResumeUpload 
                    onSubmit={handleResumeSubmit} 
                    error={error}
                    resumeText={resumeText}
                    setResumeText={setResumeText}
                    targetRole={targetRole}
                    setTargetRole={setTargetRole}
                />;
      case AppState.Analyzing:
        return <Loader text="Analyzing your resume with AI..." />;
      case AppState.AnalysisResult:
        return resumeAnalysis && <ResumeAnalysisComponent analysis={resumeAnalysis} onNext={handleProceedToInteraction} />;
      case AppState.InteractionChoice:
        return <InteractionChoice onSelect={handleInteractionChoice} />;
      case AppState.ChatInterview:
        return <ChatInterview resumeText={resumeText} onComplete={handleInterviewComplete} initialHistory={chatHistory}/>;
      case AppState.LiveAudioInterview:
        return <LiveAudioInterview resumeText={resumeText} onComplete={handleInterviewComplete} />;
      case AppState.Summarizing:
        return <Loader text="Generating your performance report..." />;
      case AppState.InterviewResult:
        return interviewResults && <InterviewResults results={interviewResults} onRestart={handleRestart} />;
      default:
        return <ResumeUpload 
                    onSubmit={handleResumeSubmit} 
                    error={error}
                    resumeText={resumeText}
                    setResumeText={setResumeText}
                    targetRole={targetRole}
                    setTargetRole={setTargetRole}
                />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
            TalentGraph AI
          </h1>
          <p className="text-slate-400 mt-2">Your AI-Powered Career Co-pilot</p>
        </header>
        <main className="bg-slate-800/50 rounded-2xl shadow-2xl shadow-blue-500/10 backdrop-blur-sm border border-slate-700/50 overflow-hidden">
          <div className="p-6 md:p-10 min-h-[60vh] flex flex-col justify-center">
            {renderContent()}
          </div>
        </main>
        {isVoiceControlActive && (
          <VoiceCommandIndicator 
            isListening={isListening}
            feedback={voiceCommandFeedback}
            availableCommands={getAvailableCommands()}
            error={speechError}
          />
        )}
        <footer className="text-center mt-8 text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} TalentGraph. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;