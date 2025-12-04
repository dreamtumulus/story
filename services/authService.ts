

import { User, Script, GlobalCharacter, ChatSession } from "../types";

// Keys for local storage
const USERS_KEY = 'skena_users';
const CURRENT_USER_KEY = 'skena_current_user';
const SCRIPTS_KEY = 'skena_all_scripts';
const CHARACTERS_KEY = 'skena_global_characters';
const CHATS_KEY = 'skena_chat_sessions';

export const authService = {
  // Register a new user
  register: (username: string): User => {
    const usersStr = localStorage.getItem(USERS_KEY);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    
    if (users.find(u => u.username === username)) {
      throw new Error("Username already exists");
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      createdAt: Date.now()
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser)); // Auto login
    return newUser;
  },

  // Login existing user
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

  // --- Script Management ---
  saveScripts: (userId: string, scripts: Script[]) => {
    const allScriptsStr = localStorage.getItem(SCRIPTS_KEY);
    let allScripts: Script[] = allScriptsStr ? JSON.parse(allScriptsStr) : [];
    
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

  // --- Global Character Management ---
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

  // --- Chat Session Management ---
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