import { User, Script } from "../types";

// Keys for local storage
const USERS_KEY = 'skena_users';
const CURRENT_USER_KEY = 'skena_current_user';
const SCRIPTS_KEY = 'skena_all_scripts';

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

  // Save scripts associated with user
  saveScripts: (userId: string, scripts: Script[]) => {
    const allScriptsStr = localStorage.getItem(SCRIPTS_KEY);
    let allScripts: Script[] = allScriptsStr ? JSON.parse(allScriptsStr) : [];
    
    // Remove old versions of this user's scripts (simple replacement strategy)
    // We filter out scripts that belong to this user from the main storage
    // Then append the current state of the user's scripts
    const otherScripts = allScripts.filter(s => s.ownerId !== userId);
    const updatedStore = [...otherScripts, ...scripts];
    
    localStorage.setItem(SCRIPTS_KEY, JSON.stringify(updatedStore));
  },

  getScripts: (userId: string): Script[] => {
    const allScriptsStr = localStorage.getItem(SCRIPTS_KEY);
    if (!allScriptsStr) return [];
    
    const allScripts: Script[] = JSON.parse(allScriptsStr);
    return allScripts.filter(s => s.ownerId === userId);
  }
};
