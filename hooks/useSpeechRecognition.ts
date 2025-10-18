import { useState, useRef, useCallback } from 'react';

// FIX: Add type definitions for the Web Speech API to prevent TypeScript errors.
// These are not included in standard TypeScript lib definitions.
interface SpeechRecognitionEvent {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}


// Check for browser support and handle vendor prefixes
// FIX: Cast `window` to `any` to access non-standard properties and provide a type for the constructor. This resolves errors on this line.
const SpeechRecognition: SpeechRecognitionStatic | undefined = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// Check if the API is supported at all
const isSpeechRecognitionSupported = !!SpeechRecognition;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to hold the recognition instance
  // The error here is resolved because `SpeechRecognition` is now a known interface type.
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported || !SpeechRecognition) {
        setError("Speech recognition is not supported in this browser.");
        return;
    }
    if (isListening || recognitionRef.current) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = false; // Process single commands
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      const currentTranscript = event.results[0][0].transcript;
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      // Provide more user-friendly error messages
      if (event.error === 'no-speech') {
        setError('No speech was detected.');
      } else if (event.error === 'audio-capture') {
        setError('Microphone is not available.');
      } else if (event.error === 'not-allowed') {
        setError('Permission to use microphone was denied.');
      } else {
        setError(event.error);
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      // Automatically restart listening if it wasn't stopped manually
      // This creates a more continuous "listening" experience for the user
      if (recognitionRef.current) {
        recognition.start();
      }
    };

    recognition.start();

  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop(); // This will trigger 'onend'
      recognitionRef.current = null; // Prevent automatic restart
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSpeechRecognitionSupported,
  };
};
