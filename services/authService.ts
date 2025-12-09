import { User, Script, GlobalCharacter, ChatSession, AppSettings } from "../types";

const DB_NAME = 'DaydreamingDB';
const DB_VERSION = 1;

// --- IDB Helper Functions ---

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('scripts')) {
        db.createObjectStore('scripts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('characters')) {
        db.createObjectStore('characters', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chats')) {
        db.createObjectStore('chats', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

const dbOp = <T>(storeName: string, mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<any> | void): Promise<T> => {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      let request: IDBRequest<any>;

      try {
        const res = callback(store);
        if (res) request = res;
      } catch (e) {
        reject(e);
        return;
      }

      transaction.oncomplete = () => {
        resolve(request?.result as T);
      };

      transaction.onerror = () => reject(transaction.error);
    });
  });
};

// --- Migration Logic (LocalStorage -> IndexedDB) ---
// 自动迁移旧数据，防止用户更新后丢失数据
let migrationAttempted = false;
const migrateFromLocalStorage = async () => {
  if (migrationAttempted) return;
  migrationAttempted = true;

  try {
    const scriptsJson = localStorage.getItem('skena_all_scripts');
    if (scriptsJson) {
      const scripts: Script[] = JSON.parse(scriptsJson);
      const db = await openDB();
      const tx = db.transaction(['scripts'], 'readwrite');
      const store = tx.objectStore('scripts');
      for (const s of scripts) store.put(s);
      await new Promise<void>(resolve => { tx.oncomplete = () => resolve(); });
      localStorage.removeItem('skena_all_scripts'); // Clear after success
      console.log("Migrated scripts to IDB");
    }

    const charsJson = localStorage.getItem('skena_global_characters');
    if (charsJson) {
      const chars: GlobalCharacter[] = JSON.parse(charsJson);
      const db = await openDB();
      const tx = db.transaction(['characters'], 'readwrite');
      const store = tx.objectStore('characters');
      for (const c of chars) store.put(c);
      await new Promise<void>(resolve => { tx.oncomplete = () => resolve(); });
      localStorage.removeItem('skena_global_characters');
      console.log("Migrated characters to IDB");
    }

    const chatsJson = localStorage.getItem('skena_chat_sessions');
    if (chatsJson) {
        const chats: ChatSession[] = JSON.parse(chatsJson);
        const db = await openDB();
        const tx = db.transaction(['chats'], 'readwrite');
        const store = tx.objectStore('chats');
        for (const c of chats) store.put(c);
        await new Promise<void>(resolve => { tx.oncomplete = () => resolve(); });
        localStorage.removeItem('skena_chat_sessions');
    }
    
    // Users are small, but let's migrate them too for consistency
    const usersJson = localStorage.getItem('skena_users');
    if (usersJson) {
        const users: User[] = JSON.parse(usersJson);
        const db = await openDB();
        const tx = db.transaction(['users'], 'readwrite');
        const store = tx.objectStore('users');
        for (const u of users) store.put(u);
        await new Promise<void>(resolve => { tx.oncomplete = () => resolve(); });
        localStorage.removeItem('skena_users');
    }

  } catch (e) {
    console.error("Migration failed", e);
  }
};


// --- Service Implementation ---

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
  
  // 注册
  register: async (username: string): Promise<User> => {
    await migrateFromLocalStorage();
    const users = await dbOp<User[]>('users', 'readonly', store => store.getAll());
    
    if (users.find(u => u.username === username)) {
      throw new Error("Username already exists");
    }

    const newUser: User = {
      id: generateId(),
      username,
      createdAt: Date.now()
    };

    await dbOp('users', 'readwrite', store => store.add(newUser));
    localStorage.setItem('skena_current_user_id', newUser.id); // Keep lightweight session in LS
    return newUser;
  },

  // 登录
  login: async (username: string): Promise<User> => {
    await migrateFromLocalStorage();
    const users = await dbOp<User[]>('users', 'readonly', store => store.getAll());
    
    const user = users.find(u => u.username === username);
    if (!user) {
      throw new Error("User not found");
    }
    
    localStorage.setItem('skena_current_user_id', user.id);
    return user;
  },

  logout: () => {
    localStorage.removeItem('skena_current_user_id');
  },

  // 获取当前用户 (Async now)
  getCurrentUser: async (): Promise<User | null> => {
    await migrateFromLocalStorage();
    const userId = localStorage.getItem('skena_current_user_id');
    if (!userId) return null;
    
    try {
        const user = await dbOp<User>('users', 'readonly', store => store.get(userId));
        return user || null;
    } catch (e) {
        return null;
    }
  },

  // --- 剧本管理 (IndexedDB) ---
  
  // 保存剧本列表 (全量更新该用户的剧本)
  saveScripts: async (userId: string, scripts: Script[]) => {
    const db = await openDB();
    const tx = db.transaction(['scripts'], 'readwrite');
    const store = tx.objectStore('scripts');
    
    // 策略：我们不删除旧数据，而是覆盖/新增。
    // 如果需要完全同步（处理删除），逻辑会更复杂。这里假设 App.tsx 传递的是最新全集。
    // 为了防止孤儿数据，理论上应该先获取该用户的所有 script IDs，然后删除不在 newScripts 里的。
    // 这里采用简单策略：Put All。
    
    // 1. 获取库中所有属于该用户的剧本 (用于检测删除)
    // 注意：IDB 没有直接的 "where ownerId = X"。需要 cursor 遍历或 getAll。
    // getAll 是性能可接受的，因为是在客户端。
    
    const allScripts = await new Promise<Script[]>((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
    });
    
    const userScriptIds = allScripts.filter(s => s.ownerId === userId).map(s => s.id);
    const newScriptIds = scripts.map(s => s.id);
    
    // 2. 删除已经被用户移除的剧本
    const toDelete = userScriptIds.filter(id => !newScriptIds.includes(id));
    toDelete.forEach(id => store.delete(id));
    
    // 3. 保存新的/更新的剧本
    scripts.forEach(s => store.put(s));
    
    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  getScripts: async (userId: string): Promise<Script[]> => {
    await migrateFromLocalStorage();
    const allScripts = await dbOp<Script[]>('scripts', 'readonly', store => store.getAll());
    return allScripts.filter(s => s.ownerId === userId);
  },

  // --- 全局角色管理 (IndexedDB) ---
  
  saveGlobalCharacters: async (userId: string, chars: GlobalCharacter[]) => {
    const db = await openDB();
    const tx = db.transaction(['characters'], 'readwrite');
    const store = tx.objectStore('characters');
    
    // 同步逻辑：删除不存在的，更新存在的
    const allChars = await new Promise<GlobalCharacter[]>((resolve) => {
         const req = store.getAll();
         req.onsuccess = () => resolve(req.result);
    });
    
    const userCharIds = allChars.filter(c => c.ownerId === userId).map(c => c.id);
    const newCharIds = chars.map(c => c.id);
    
    const toDelete = userCharIds.filter(id => !newCharIds.includes(id));
    toDelete.forEach(id => store.delete(id));
    
    chars.forEach(c => store.put(c));
    
    return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
  },

  getGlobalCharacters: async (userId: string): Promise<GlobalCharacter[]> => {
    await migrateFromLocalStorage();
    const allChars = await dbOp<GlobalCharacter[]>('characters', 'readonly', store => store.getAll());
    return allChars.filter(c => c.ownerId === userId);
  },

  // --- 聊天会话管理 ---
  
  saveChatSession: async (session: ChatSession) => {
    await dbOp('chats', 'readwrite', store => store.put(session));
  },

  getChatSession: async (userId: string, characterId: string): Promise<ChatSession | null> => {
    await migrateFromLocalStorage();
    const allChats = await dbOp<ChatSession[]>('chats', 'readonly', store => store.getAll());
    return allChats.find(c => c.userId === userId && c.characterId === characterId) || null;
  }
};