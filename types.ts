

export enum Role {
  AI = 'AI',
  USER = 'USER'
}

export type Language = 'zh-CN' | 'en-US';

export interface User {
  id: string;
  username: string;
  avatar?: string;
  createdAt: number;
}

export interface AppSettings {
  apiKey?: string;
  baseUrl?: string;
  
  // New fields for multi-model support
  activeProvider?: 'GEMINI' | 'OPENROUTER';
  openRouterKey?: string;
  openRouterModel?: string; // e.g., 'google/gemini-2.0-flash-001'
}

export interface Character {
  id: string;
  name: string;
  role: string; // In a script, this is their role (e.g. Detective). 
  personality: string;
  speakingStyle: string;
  visualDescription: string;
  avatarUrl?: string; 
  isUserControlled: boolean;
  
  // New fields for Global Characters
  gender?: string;
  age?: string;
  isGlobal?: boolean; // If true, linked to a GlobalCharacter
  globalId?: string;
}

export interface GlobalCharacter {
  id: string;
  ownerId: string;
  name: string;
  gender: string;
  age: string;
  personality: string;
  speakingStyle: string;
  visualDescription: string;
  avatarUrl?: string;
  createdAt: number;
  
  // Memory & Evolution
  memories?: string[]; // Summarized facts/experiences from chats
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

export interface ChatSession {
  id: string;
  characterId: string; // Links to GlobalCharacter
  userId: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

export interface Message {
  id: string;
  characterId: string; // 'narrator' or character UUID
  content: string;
  type: 'dialogue' | 'action' | 'narration';
  timestamp: number;
  imageUrl?: string; // URL for scene illustration
}

export interface Script {
  id: string;
  ownerId: string; // Connect to User
  title: string;
  premise: string;
  setting: string;
  plotPoints: string[]; 
  possibleEndings: string[]; 
  characters: Character[];
  history: Message[];
  lastUpdated: number;
  
  // Progress Tracking
  currentPlotIndex: number;

  // Template & Community fields
  isTemplate?: boolean;
  author?: string;
  isPublished?: boolean;
  communityStats?: {
    likes: number;
    downloads: number;
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; 
  conditionType: 'SCRIPT_COUNT' | 'MESSAGE_COUNT' | 'CHAR_CONTROL' | 'TEMPLATE_CREATE';
  threshold: number;
  unlocked: boolean;
  unlockedAt?: number;
  reward?: string;
}

export interface GenerationConfig {
  apiKey?: string;
  modelText: string;
  modelImage: string;
}