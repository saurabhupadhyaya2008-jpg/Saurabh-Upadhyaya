
import { GoogleGenAI, Type, LiveServerMessage, Modality, Blob } from "@google/genai";
import { ResumeAnalysis, ChatMessage, ChatRole, InterviewResults } from '../types';
import { encode } from '../utils/audio';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Resume Analysis ---

const suggestedProjectSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "A catchy, descriptive title for the suggested project."
        },
        description: {
            type: Type.STRING,
            description: "A brief 2-3 sentence description of what the project entails."
        },
        skillsGained: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of 2-4 key skills the candidate would gain by completing this project."
        }
    },
    required: ["title", "description", "skillsGained"]
};


const resumeAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        score: {
            type: Type.NUMBER,
            description: "A score from 0 to 100 representing the resume's quality for the target role."
        },
        strengths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of 3-5 key strengths of the resume relevant to the target role."
        },
        areasForImprovement: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of 3-5 concrete areas for resume improvement."
        },
        suggestedKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of relevant keywords for the target role missing from the resume."
        },
        experienceGaps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of 2-3 potential gaps in experience when comparing the resume to the target role."
        },
        suggestedProjects: {
            type: Type.ARRAY,
            items: suggestedProjectSchema,
            description: "A list of 1-2 tailored project ideas to help fill the identified experience gaps."
        }
    },
    required: ["score", "strengths", "areasForImprovement", "suggestedKeywords", "experienceGaps", "suggestedProjects"]
};

export const analyzeResume = async (resumeText: string, targetRole: string): Promise<ResumeAnalysis> => {
    const prompt = `
    Analyze the following resume text for a candidate targeting the role of "${targetRole}". Provide a detailed, constructive evaluation aimed at helping the candidate improve their resume and skills for this specific role.
    
    **Target Role:** ${targetRole}

    **Resume Text:**
    ---
    ${resumeText}
    ---
    
    Provide your analysis in the specified JSON format.
    - **score**: A realistic assessment of the resume's quality for the target role.
    - **strengths**: Highlight what is done well and is relevant to the role.
    - **areasForImprovement**: Actionable feedback on the resume's content and structure.
    - **suggestedKeywords**: Keywords relevant to the target role that are missing.
    - **experienceGaps**: Identify specific gaps in skills or experience based on typical requirements for the target role. Be specific.
    - **suggestedProjects**: Propose concrete project ideas that would help the candidate fill these gaps and strengthen their profile. The projects should be tailored and practical.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: resumeAnalysisSchema,
            }
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        return parsedJson as ResumeAnalysis;
    } catch (error) {
        console.error("Error analyzing resume with Gemini:", error);
        throw new Error("Failed to get analysis from Gemini API.");
    }
};

// --- Chat Interview ---

export const getNextChatQuestion = async (resumeText: string, chatHistory: ChatMessage[]): Promise<string> => {
    const historyForPrompt = chatHistory.map(msg => `${msg.role}: ${msg.text}`).join('\n');

    const prompt = `
    You are an expert technical interviewer conducting a chat-based screening interview. Your goal is to assess the candidate's skills based on their resume.
    
    **Candidate's Resume:**
    ---
    ${resumeText}
    ---

    **Interview Transcript so far:**
    ---
    ${historyForPrompt}
    ---

    **Your Task:**
    Based on the resume and the conversation history, ask the NEXT relevant question.
    - If the interview is just starting, ask an opening question related to a key project or experience on their resume.
    - If the candidate has just answered, ask a follow-up question or transition to a new topic from their resume.
    - Keep questions concise and focused.
    - Do not greet or use pleasantries, just provide the next question.
    - Do not say "Here is the next question:". Just ask the question directly.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text;
    } catch (error) {
        console.error("Error getting next chat question:", error);
        throw new Error("Failed to get next question from Gemini API.");
    }
};

// --- Live Audio Interview ---
interface LiveInterviewCallbacks {
    // FIX: Changed property names to lowercase to match the expected type for ai.live.connect callbacks.
    onmessage: (message: LiveServerMessage) => void;
    onopen: () => void;
    onclose: (e: CloseEvent) => void;
    onerror: (e: ErrorEvent) => void;
}

export const startLiveInterviewSession = (resumeText: string, callbacks: LiveInterviewCallbacks) => {
    const systemInstruction = `You are an expert technical interviewer conducting a real-time audio screening interview. Your goal is to assess the candidate's skills based on their resume. 
    - Ask questions related to the candidate's resume.
    - Keep your responses and questions concise.
    - Start with a brief greeting and then ask your first question.
    - After about 4-5 questions, thank the candidate and conclude the interview.
    
    Candidate's Resume:
    ---
    ${resumeText}
    ---
    `;

    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        },
    });
};


export function createAudioBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Interview Summary ---

const interviewSummarySchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A concise 2-3 sentence summary of the candidate's performance during the interview."
        },
        performanceRating: {
            type: Type.NUMBER,
            description: "A rating of the candidate's performance on a scale of 1 to 10."
        },
        demonstratedSkills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of key skills and qualities the candidate demonstrated during the conversation."
        }
    },
    required: ["summary", "performanceRating", "demonstratedSkills"]
};

export const summarizeInterview = async (chatHistory: ChatMessage[]): Promise<InterviewResults> => {
    const transcript = chatHistory.map(msg => `${msg.role === ChatRole.User ? 'Candidate' : 'Interviewer'}: ${msg.text}`).join('\n\n');

    const prompt = `
    Analyze the following interview transcript. The candidate was interviewed by an AI.
    Your task is to provide a performance summary.

    **Interview Transcript:**
    ---
    ${transcript}
    ---

    Provide a summary of the candidate's performance, a rating out of 10, and a list of demonstrated skills. Be objective and base your assessment solely on the provided transcript.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: interviewSummarySchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as InterviewResults;
    } catch (error) {
        console.error("Error summarizing interview:", error);
        throw new Error("Failed to summarize interview with Gemini API.");
    }
};
