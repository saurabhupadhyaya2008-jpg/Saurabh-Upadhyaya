import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ChatRole } from '../types';
import { startLiveInterviewSession, createAudioBlob } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audio';
import { BotIcon } from './icons/BotIcon';
import { UserIcon } from './icons/UserIcon';
// FIX: The type for a live session is `Session`, not `LiveSession`.
import { Session } from '@google/genai';
import { SignalIcon } from './icons/SignalIcon';
import { PhoneXMarkIcon } from './icons/PhoneXMarkIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { MicrophoneSlashIcon } from './icons/MicrophoneSlashIcon';

interface LiveAudioInterviewProps {
  resumeText: string;
  onComplete: (chatHistory: ChatMessage[]) => void;
}

type ConnectionState = "connecting" | "connected" | "ended" | "error";

const LiveAudioInterview: React.FC<LiveAudioInterviewProps> = ({ resumeText, onComplete }) => {
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  // FIX: The type for a live session is `Session`, not `LiveSession`.
  const sessionPromiseRef = useRef<Promise<Session> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // For audio playback
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sources = useRef(new Set<AudioBufferSourceNode>());

  // For audio visualizer
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);


  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcript]);


  const cleanup = useCallback(() => {
    console.log("Cleaning up audio resources...");
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
     if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if(outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    if(sessionPromiseRef.current){
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
  }, []);

  const drawVisualizer = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
        if (!analyserRef.current) return; // Stop if cleaned up
        animationFrameIdRef.current = requestAnimationFrame(draw);
        
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2.5;
            
            // Create a gradient for the bars
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            gradient.addColorStop(0, '#3B82F6'); // blue-500
            gradient.addColorStop(1, '#60A5FA'); // blue-400
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 2;
        }
    };
    draw();
  }, []);


  useEffect(() => {
    const startInterview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Setup output audio context
        // FIX: Added `(window as any)` to handle `webkitAudioContext` for cross-browser compatibility without TypeScript errors.
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        let currentInputTranscription = '';
        let currentOutputTranscription = '';

        sessionPromiseRef.current = startLiveInterviewSession(resumeText, {
          // FIX: Changed property to lowercase `onopen` to match the expected callback name.
          onopen: () => {
            setConnectionState('connected');
            // FIX: Added `(window as any)` to handle `webkitAudioContext` for cross-browser compatibility without TypeScript errors.
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = audioContextRef.current.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;

            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 128;
            analyserRef.current = analyser;

            const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createAudioBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            // Connect the audio graph: source -> analyser -> scriptProcessor -> destination
            source.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current.destination);

            // Start the visualizer
            drawVisualizer();
          },
          // FIX: Changed property to lowercase `onmessage` to match the expected callback name.
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscription += text;
            } else if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscription += text;
            }

            if (message.serverContent?.turnComplete) {
              const fullInput = currentInputTranscription.trim();
              const fullOutput = currentOutputTranscription.trim();
              
              setTranscript(prev => {
                  let newTranscript = [...prev];
                  if(fullInput) newTranscript.push({role: ChatRole.User, text: fullInput});
                  if(fullOutput) newTranscript.push({role: ChatRole.Model, text: fullOutput});
                  return newTranscript;
              });

              currentInputTranscription = '';
              currentOutputTranscription = '';
            }

            if (message.serverContent?.interrupted) {
                for (const source of sources.current.values()) {
                    source.stop(); // This will trigger 'ended' listeners
                }
                sources.current.clear(); // Ensure the set is empty
                setIsModelSpeaking(false);
                nextStartTimeRef.current = 0;
            }
            
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                setIsModelSpeaking(true); // Model starts speaking
                const outputCtx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                source.addEventListener('ended', () => {
                    sources.current.delete(source);
                    if (sources.current.size === 0) {
                        setIsModelSpeaking(false); // Model finished speaking
                    }
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sources.current.add(source);
            }
          },
          // FIX: Changed property to lowercase `onerror` to match the expected callback name.
          onerror: (e) => {
            console.error(e);
            setConnectionState('error');
            cleanup();
          },
          // FIX: Changed property to lowercase `onclose` to match the expected callback name.
          onclose: () => {
            console.log('Session closed.');
            setConnectionState('ended');
            cleanup();
          },
        });
      } catch (err) {
        console.error("Failed to get microphone permissions", err);
        setConnectionState('error');
      }
    };

    startInterview();

    return () => {
      cleanup();
    };
  }, [resumeText, cleanup, drawVisualizer]);

  const handleEndInterview = () => {
    setConnectionState("ended");
    cleanup();
    onComplete(transcript);
  }

  const handleToggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const renderStatus = () => {
      switch(connectionState) {
          case 'connecting':
              return <div className="flex items-center gap-2"><SignalIcon className="w-4 h-4 text-yellow-400 animate-pulse" /> Connecting...</div>
          case 'connected':
              return <div className="flex items-center gap-2"><SignalIcon className="w-4 h-4 text-green-400" /> Connected</div>
          case 'ended':
              return <div className="flex items-center gap-2"><SignalIcon className="w-4 h-4 text-slate-500" /> Interview Ended</div>
          case 'error':
              return <div className="flex items-center gap-2"><SignalIcon className="w-4 h-4 text-red-500" /> Connection Error</div>
      }
  }

  return (
    <div className="flex flex-col h-[70vh] max-h-[700px] w-full animate-fade-in">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-slate-100">Live Audio Interview</h2>
        <div className="h-5 mt-1 text-sm text-slate-400 flex items-center justify-center gap-4">
            {renderStatus()}
            {isMuted && connectionState === 'connected' && (
                <div className="flex items-center gap-2 text-yellow-400 animate-fade-in">
                    <MicrophoneSlashIcon className="w-4 h-4" />
                    <span>Muted</span>
                </div>
            )}
            {isModelSpeaking && connectionState === 'connected' && (
                <div className="flex items-center gap-2 text-purple-400 animate-fade-in">
                    <BotIcon className="w-5 h-5 animate-pulse"/>
                    <span>AI Speaking...</span>
                </div>
            )}
        </div>
      </div>

      <div className="w-full h-24 mb-4 flex items-center justify-center bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
        {connectionState === 'connected' ? (
            <canvas ref={canvasRef} className="w-full h-full" />
        ) : (
            <p className="text-slate-500 text-sm">Visualizer will appear when connected</p>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto p-4 bg-slate-900/50 rounded-lg space-y-4 min-h-[200px] transition-all duration-300 ${isModelSpeaking ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-slate-700'}`}>
        {transcript.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === ChatRole.User ? 'justify-end' : 'justify-start'}`}>
            {msg.role === ChatRole.Model && <div className="bg-slate-700 p-2 rounded-full"><BotIcon className="w-5 h-5 text-slate-300" /></div>}
            <div className={`max-w-md p-3 rounded-xl ${msg.role === ChatRole.User ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
            {msg.role === ChatRole.User && <div className="bg-slate-700 p-2 rounded-full"><UserIcon className="w-5 h-5 text-slate-300" /></div>}
          </div>
        ))}
         <div ref={messagesEndRef} />
      </div>
      <div className="mt-4">
        {connectionState === 'connected' ? (
           <div className="flex items-center gap-2">
            <button onClick={handleToggleMute} className="flex-1 flex items-center justify-center gap-2 bg-slate-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-500 transition-all">
                {isMuted ? <MicrophoneSlashIcon className="w-5 h-5"/> : <MicrophoneIcon className="w-5 h-5"/>}
                {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button onClick={handleEndInterview} className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-500 transition-all">
                <PhoneXMarkIcon className="w-5 h-5"/>
                End Interview
            </button>
           </div>
        ) : (
            <button onClick={() => onComplete(transcript)} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-500 transition-all transform hover:scale-105 disabled:bg-slate-700 disabled:cursor-not-allowed"
                disabled={connectionState !== 'ended' || transcript.length === 0}
            >
                See My Results
            </button>
        )}
      </div>
    </div>
  );
};

export default LiveAudioInterview;