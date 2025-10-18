
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatRole } from '../types';
import { getNextChatQuestion } from '../services/geminiService';
import { BotIcon } from './icons/BotIcon';
import { UserIcon } from './icons/UserIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';

interface ChatInterviewProps {
  resumeText: string;
  onComplete: (chatHistory: ChatMessage[]) => void;
  initialHistory: ChatMessage[];
}

const INTERVIEW_LENGTH = 5; // Number of user responses before concluding

const ChatInterview: React.FC<ChatInterviewProps> = ({ resumeText, onComplete, initialHistory }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialHistory);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userMessagesCount = messages.filter(m => m.role === ChatRole.User).length;
  const isInterviewOver = userMessagesCount >= INTERVIEW_LENGTH;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      setIsLoading(true);
      getNextChatQuestion(resumeText, []).then(firstQuestion => {
        setMessages([{ role: ChatRole.Model, text: firstQuestion }]);
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || isInterviewOver) return;

    const newMessages: ChatMessage[] = [...messages, { role: ChatRole.User, text: userInput }];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    if (userMessagesCount + 1 >= INTERVIEW_LENGTH) {
      setTimeout(() => {
        setMessages(prev => [...prev, {role: ChatRole.Model, text: "Thank you. That concludes our interview. I will now prepare your performance summary."}]);
        setIsLoading(false);
      }, 1000);
    } else {
       try {
        const nextQuestion = await getNextChatQuestion(resumeText, newMessages);
        setMessages(prev => [...prev, { role: ChatRole.Model, text: nextQuestion }]);
      } catch (error) {
        console.error("Failed to get next question:", error);
        setMessages(prev => [...prev, { role: ChatRole.Model, text: "I seem to be having a technical issue. Let's move on to the summary." }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-[70vh] max-h-[700px] w-full animate-fade-in">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-slate-100">AI Chat Interview</h2>
        <p className="text-slate-400">Answer the following questions based on your experience.</p>
        <p className="text-blue-400 text-sm mt-1">
          {isInterviewOver ? "Interview complete!" : `Question ${userMessagesCount + 1} of ${INTERVIEW_LENGTH}`}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-slate-900/50 rounded-lg border border-slate-700 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === ChatRole.User ? 'justify-end' : 'justify-start'}`}>
            {msg.role === ChatRole.Model && <div className="bg-slate-700 p-2 rounded-full"><BotIcon className="w-5 h-5 text-slate-300" /></div>}
            <div className={`max-w-md p-3 rounded-xl ${msg.role === ChatRole.User ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
            {msg.role === ChatRole.User && <div className="bg-slate-700 p-2 rounded-full"><UserIcon className="w-5 h-5 text-slate-300" /></div>}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3 justify-start">
            <div className="bg-slate-700 p-2 rounded-full"><BotIcon className="w-5 h-5 text-slate-300" /></div>
            <div className="max-w-md p-3 rounded-xl bg-slate-700 text-slate-200 rounded-bl-none">
              <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse-fast"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse-fast delay-150"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse-fast delay-300"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-4">
        {isInterviewOver ? (
          <button onClick={() => onComplete(messages)} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-500 transition-all transform hover:scale-105">
            See My Results
          </button>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
              disabled={isLoading}
            />
            <button type="submit" className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors" disabled={isLoading || !userInput.trim()}>
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChatInterview;
