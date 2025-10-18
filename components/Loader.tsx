
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

interface LoaderProps {
  text: string;
}

const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4 h-full animate-fade-in">
        <SparklesIcon className="w-12 h-12 text-blue-400 animate-spin-slow" />
        <p className="text-lg text-slate-300 font-medium">{text}</p>
    </div>
  );
};

export default Loader;
