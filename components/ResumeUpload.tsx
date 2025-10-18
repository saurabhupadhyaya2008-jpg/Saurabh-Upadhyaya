import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
// Import pdf.js library and worker from a CDN
import * as pdfjsLib from 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.min.mjs';

// Set the worker source for pdf.js, which is required for it to run in a separate thread.
// @ts-ignore: This is the official way to set the worker source when using the library from a CDN.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

// Declare mammoth as a global variable since it's loaded from a script tag in index.html
declare var mammoth: any;

interface ResumeUploadProps {
  onSubmit: () => void;
  error?: string | null;
  resumeText: string;
  setResumeText: (text: string) => void;
  targetRole: string;
  setTargetRole: (role: string) => void;
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({ onSubmit, error, resumeText, setResumeText, targetRole, setTargetRole }) => {
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false); // State for PDF parsing

  const processFile = async (file: File) => {
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setResumeText(''); // Clear previous text

    try {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              // The items can be TextItem or TextMarkedContent, so we check for 'str' property.
              const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
              fullText += pageText + '\n\n'; // Add space between pages for readability
            }
            setResumeText(fullText.trim());
          } catch (pdfError) {
             console.error("Error parsing PDF:", pdfError);
             setFileName('Error parsing PDF. Please try a different file.');
          } finally {
             setIsParsing(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const reader = new FileReader();
          reader.onload = async (e) => {
              try {
                  const arrayBuffer = e.target?.result as ArrayBuffer;
                  const result = await mammoth.extractRawText({ arrayBuffer });
                  setResumeText(result.value);
              } catch (docxError) {
                  console.error("Error parsing DOCX:", docxError);
                  setFileName('Error parsing .docx file.');
              } finally {
                  setIsParsing(false);
              }
          };
          reader.readAsArrayBuffer(file);
      } else if (file.name.endsWith('.doc')) {
          setResumeText('');
          setFileName('Unsupported file type (.doc). Please use .docx instead.');
          setIsParsing(false);
      } else {
        // Handle plain text files
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setResumeText(text);
          setIsParsing(false);
        };
        reader.readAsText(file);
      }
    } catch (err) {
        console.error("Error processing file:", err);
        setFileName('Error processing file.');
        setIsParsing(false);
    }
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (resumeText.trim() && targetRole.trim() && !isParsing) {
      onSubmit();
    }
  };

  const getDropzoneText = () => {
      if (isParsing) return "Parsing file, please wait...";
      if (fileName) return fileName;
      return "Drag & drop your resume (.pdf, .docx, .txt) or click to upload";
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="bg-blue-500/10 p-4 rounded-full mb-4 border border-blue-500/20">
        <DocumentTextIcon className="w-8 h-8 text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-100">Upload Your Resume</h2>
      <p className="text-slate-400 mt-2 max-w-md">
        Provide your resume and target role. Our AI will analyze it to provide feedback and prepare for your interview.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-lg mt-8 space-y-6">
        <label
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          htmlFor="resume-upload"
          className={`relative block w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors ${isParsing ? 'cursor-wait border-yellow-500/50 bg-yellow-900/10' : 'cursor-pointer border-slate-600 hover:border-slate-500'}`}
        >
          <UploadIcon className="mx-auto h-12 w-12 text-slate-500" />
          <span className="mt-2 block text-sm font-semibold text-slate-300">
            {getDropzoneText()}
          </span>
          <input id="resume-upload" type="file" className="sr-only" accept=".txt,.log,.cfg,.conf,.ini,.csv,.tsv,.md,.json,.yaml,.pdf,.docx" onChange={handleFileChange} disabled={isParsing} />
        </label>
        
        <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center">
                <span className="bg-slate-800 px-2 text-sm text-slate-400">OR</span>
            </div>
        </div>

        <textarea
          value={resumeText}
          onChange={(e) => {
            setResumeText(e.target.value);
            if (fileName) setFileName('');
          }}
          placeholder="Paste your resume here..."
          rows={8}
          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow disabled:bg-slate-800"
          readOnly={isParsing}
        />
        
        <input
          type="text"
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          placeholder="Enter your target job role (e.g., Senior Frontend Developer)"
          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
          required
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}
        
        <button
          type="submit"
          disabled={!resumeText.trim() || !targetRole.trim() || isParsing}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
        >
          {isParsing ? 'Processing...' : 'Analyze Resume'}
        </button>
      </form>
    </div>
  );
};

export default ResumeUpload;