import { User, Script, GlobalCharacter, ChatSession } from "../types";

// 本地存储的 Key 常量
// 我们使用 LocalStorage 来模拟后端数据库
const USERS_KEY = 'skena_users';
const CURRENT_USER_KEY = 'skena_current_user';
const SCRIPTS_KEY = 'skena_all_scripts';
const CHARACTERS_KEY = 'skena_global_characters';
const CHATS_KEY = 'skena_chat_sessions';

// 简易 UUID 生成器 (避免循环引用 aiService)
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const authService = {
  // 注册新用户
  register: (username: string): User => {
    const usersStr = localStorage.getItem(USERS_KEY);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    
    if (users.find(u => u.username === username)) {
      throw new Error("Username already exists");
    }

    const newUser: User = {
      id: generateId(),
      username,
      createdAt: Date.now()
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser)); // 注册后自动登录
    return newUser;
  },

  // 登录现有用户
  login: (username: string): User => {
    const usersStr = localStorage.getItem(USERS_KEY);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    
    const user = users.find(u => u.username === username);
    if (!user) {
      throw new Error("User not found");
    }
    
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const u = localStorage.getItem(CURRENT_USER_KEY);
    return u ? JSON.parse(u) : null;
  },

  // --- 剧本管理 (模拟数据库 CRUD) ---
  saveScripts: (userId: string, scripts: Script[]) => {
    const allScriptsStr = localStorage.getItem(SCRIPTS_KEY);
    let allScripts: Script[] = allScriptsStr ? JSON.parse(allScriptsStr) : [];
    
    // 过滤掉当前用户的旧数据，合并新数据
    const otherScripts = allScripts.filter(s => s.ownerId !== userId);
    const updatedStore = [...otherScripts, ...scripts];
    
    localStorage.setItem(SCRIPTS_KEY, JSON.stringify(updatedStore));
  },

  getScripts: (userId: string): Script[] => {
    const allScriptsStr = localStorage.getItem(SCRIPTS_KEY);
    if (!allScriptsStr) return [];
    
    const allScripts: Script[] = JSON.parse(allScriptsStr);
    return allScripts.filter(s => s.ownerId === userId);
  },

  // --- 全局角色管理 ---
  saveGlobalCharacters: (userId: string, chars: GlobalCharacter[]) => {
    const allCharsStr = localStorage.getItem(CHARACTERS_KEY);
    let allChars: GlobalCharacter[] = allCharsStr ? JSON.parse(allCharsStr) : [];
    
    const otherChars = allChars.filter(c => c.ownerId !== userId);
    const updatedStore = [...otherChars, ...chars];
    
    localStorage.setItem(CHARACTERS_KEY, JSON.stringify(updatedStore));
  },

  getGlobalCharacters: (userId: string): GlobalCharacter[] => {
    const allCharsStr = localStorage.getItem(CHARACTERS_KEY);
    if (!allCharsStr) return [];
    
    const allChars: GlobalCharacter[] = JSON.parse(allCharsStr);
    return allChars.filter(c => c.ownerId === userId);
  },

  // --- 聊天会话管理 (陪伴模式) ---
  saveChatSession: (session: ChatSession) => {
    const allChatsStr = localStorage.getItem(CHATS_KEY);
    let allChats: ChatSession[] = allChatsStr ? JSON.parse(allChatsStr) : [];
    
    const otherChats = allChats.filter(c => c.id !== session.id);
    const updatedStore = [...otherChats, session];
    
    localStorage.setItem(CHATS_KEY, JSON.stringify(updatedStore));
  },

  getChatSession: (userId: string, characterId: string): ChatSession | null => {
    const allChatsStr = localStorage.getItem(CHATS_KEY);
    if (!allChatsStr) return null;
    
    const allChats: ChatSession[] = JSON.parse(allChatsStr);
    return allChats.find(c => c.userId === userId && c.characterId === characterId) || null;
  }
};