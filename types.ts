

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
  baseUrl?: string; // For proxy users
}

export interface Character {
  id: string;
  name: string;
  role: string; // e.g., "The Hero", "The Villain"
  personality: string; // Psychological traits
  speakingStyle: string; // New: How they talk (e.g., "Shouts, uses slang", "Formal, poetic")
  visualDescription: string;
  avatarUrl?: string; // Base64 or URL
  isUserControlled: boolean;
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
  plotPoints: string[]; // Key plot nodes
  possibleEndings: string[]; // Potential endings
  characters: Character[];
  history: Message[];
  lastUpdated: number;
  
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
  icon: string; // Emoji or icon name
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