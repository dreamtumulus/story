

export enum Role {
  AI = 'AI',
  USER = 'USER'
}

export type Language = 'zh-CN' | 'en-US';

// 用户信息定义
export interface User {
  id: string;
  username: string;
  avatar?: string;
  createdAt: number;
}

// 应用设置接口
export interface AppSettings {
  apiKey?: string; // Google Gemini API Key
  baseUrl?: string;
  
  // 多模型支持配置 (OpenRouter)
  activeProvider?: 'GEMINI' | 'OPENROUTER';
  openRouterKey?: string;
  openRouterModel?: string; // 例如: 'google/gemini-2.0-flash-001'
}

// 剧本中的角色定义 (Local Character)
// 这是特定于某个剧本的实例，可能会随着剧情发展而产生状态变化
export interface Character {
  id: string;
  name: string;
  role: string; // 在剧本中的角色定位 (例如: 侦探, 凶手)
  personality: string; // 性格特征
  speakingStyle: string; // 语言风格
  visualDescription: string; // 外貌描述 (用于生成头像)
  avatarUrl?: string; 
  isUserControlled: boolean; // 是否由用户扮演
  
  // 关联全局角色库的字段
  gender?: string;
  age?: string;
  isGlobal?: boolean; // 如果为true，则链接到 GlobalCharacter
  globalId?: string;
}

// 全局角色定义 (Global Character)
// 存储在角色库中，可以在多个剧本中复用，拥有长期记忆
export interface GlobalCharacter {
  id: string;
  ownerId: string;
  name: string;
  gender: string;
  age: string;
  role?: string; // Added role field
  personality: string;
  speakingStyle: string;
  visualDescription: string;
  avatarUrl?: string;
  createdAt: number;
  
  // 记忆与进化系统
  memories?: string[]; // 从聊天中总结的事实或经历，用于增强长期记忆
}

// 聊天消息结构
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  mediaUrl?: string; // 如果包含图片或视频
  mediaType?: 'image' | 'video';
}

// 聊天会话 (陪伴模式)
export interface ChatSession {
  id: string;
  characterId: string; // 关联 GlobalCharacter
  userId: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

// 剧本演绎中的单条消息 (对话/动作/旁白)
export interface Message {
  id: string;
  characterId: string; // 'narrator' 代表旁白，否则为角色UUID
  content: string;
  type: 'dialogue' | 'action' | 'narration';
  timestamp: number;
  imageUrl?: string; // 场景插图 URL
}

// 小说写作风格枚举
export type NovelStyle = 'STANDARD' | 'JIN_YONG' | 'CIXIN_LIU' | 'HEMINGWAY' | 'AUSTEN' | 'LU_XUN';

// 核心剧本结构
export interface Script {
  id: string;
  ownerId: string; // 关联 User
  title: string;
  premise: string; // 故事前提/梗概
  setting: string; // 场景设定
  plotPoints: string[]; // 剧情大纲 (章节列表)
  possibleEndings: string[]; 
  characters: Character[]; // 参与该剧本的角色列表
  history: Message[]; // 演绎历史记录 (即正文)
  lastUpdated: number;
  
  // 进度追踪
  currentPlotIndex: number; // 当前进行到的剧情节点索引

  // 模版与社区功能
  isTemplate?: boolean;
  author?: string;
  isPublished?: boolean;
  communityStats?: {
    likes: number;
    downloads: number;
  };

  // 小说导出内容
  novelText?: string;
}

// 成就系统
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

// 生成配置
export interface GenerationConfig {
  apiKey?: string;
  modelText: string;
  modelImage: string;
}