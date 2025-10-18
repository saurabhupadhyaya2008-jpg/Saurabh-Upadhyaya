
export enum AppState {
  ResumeUpload = 'ResumeUpload',
  Analyzing = 'Analyzing',
  AnalysisResult = 'AnalysisResult',
  InteractionChoice = 'InteractionChoice',
  ChatInterview = 'ChatInterview',
  LiveAudioInterview = 'LiveAudioInterview',
  Summarizing = 'Summarizing',
  InterviewResult = 'InterviewResult',
}

export interface SuggestedProject {
    title: string;
    description: string;
    skillsGained: string[];
}

export interface ResumeAnalysis {
  score: number;
  strengths: string[];
  areasForImprovement: string[];
  suggestedKeywords: string[];
  experienceGaps: string[];
  suggestedProjects: SuggestedProject[];
}

export enum ChatRole {
    User = 'user',
    Model = 'model',
}

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface InterviewResults {
    summary: string;
    performanceRating: number;
    demonstratedSkills: string[];
}
