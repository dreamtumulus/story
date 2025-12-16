import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Play, Pause, Save, Settings, 
  Sparkles, MessageSquare, Edit3, Trash2, 
  ChevronRight, ChevronLeft, Image as ImageIcon,
  Users, Globe, Trophy, Share2, Download, Copy, Star, Mic, Send,
  Wand2, RefreshCw, LayoutDashboard, Film, BookOpen, Crown, Clapperboard,
  LogOut, User as UserIcon, Key, X, AlertCircle, Loader2, Shuffle,
  Cloud, Zap, SkipForward, Upload, Heart, Smile, BrainCircuit, Video,
  Filter
} from 'lucide-react';
import { Script, Character, Message, Language, Achievement, User, AppSettings, GlobalCharacter, ChatSession, ChatMessage } from './types';
import { 
    generateScriptBlueprint, generateNextBeat, generateAvatarImage, 
    refineText, generateSceneImage, regenerateFuturePlot, generateSingleCharacter,
    completeCharacterProfile, chatWithCharacter, evolveCharacterFromChat
} from './services/aiService';
import { authService } from './services/authService';

// --- Character Text Colors (Pastel Palette) ---
const CHAR_COLORS = [
    '#fca5a5', // red-300
    '#86efac', // green-300
    '#93c5fd', // blue-300
    '#fcd34d', // amber-300
    '#d8b4fe', // purple-300
    '#f472b6', // pink-300
    '#67e8f9', // cyan-300
    '#cbd5e1', // slate-300
    '#fdba74', // orange-300
    '#a5b4fc', // indigo-300
];

const getCharacterColor = (charId: string) => {
    if (charId === 'narrator') return '#fbbf24'; // Amber for narrator
    let hash = 0;
    for (let i = 0; i < charId.length; i++) {
        hash = charId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % CHAR_COLORS.length;
    return CHAR_COLORS[index];
};

// --- Logo Component ---
const Logo = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative w-8 h-8 flex items-center justify-center">
            <Cloud className="text-white w-8 h-8 drop-shadow-[0_0_10px_rgba(165,180,252,0.5)]" fill="currentColor" fillOpacity={0.2} strokeWidth={2.5} />
            <Play size={10} className="absolute text-indigo-600 fill-indigo-600 ml-0.5" />
        </div>
        <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white tracking-tight">Daydreaming</span>
    </div>
);

// --- i18n Dictionary ---
const TRANSLATIONS = {
  'zh-CN': {
    title: "Daydreaming",
    subtitle: "白日梦剧场",
    heroTitle: "白日梦 · 触手可及",
    heroSubtitle: "你的每一次奇思妙想，都是一场即将上演的精彩大戏。AI 导演已就位。",
    dashboard: "剧场大厅",
    myScripts: "我的梦境",
    templates: "灵感库",
    characters: "角色库",
    community: "社区",
    achievements: "成就",
    settings: "设置",
    startNew: "开始做梦",
    dreaming: "正在编织梦境...",
    create: "生成剧本",
    placeholder: "例如：三个时间旅行者在史前时代的茶话会...",
    noScripts: "还没有梦境。在上方输入灵感，开始你的第一场白日梦。",
    setup: "第一幕：梦境构筑",
    castSetup: "第二幕：角色入梦",
    startShow: "大幕拉开",
    premise: "故事梗概",
    plotPoints: "关键节点",
    endings: "可能的结局",
    cast: "演员表",
    addActor: "手动添加",
    aiAddActor: "AI 创造角色",
    importActor: "从角色库导入",
    genLook: "生成形象",
    playerControlled: "玩家扮演",
    observerMode: "观察者模式",
    resumeAuto: "恢复自动播放",
    speakingAs: "正在扮演",
    whatSay: "请输入台词或动作...",
    onAir: "直播中",
    paused: "已暂停",
    exit: "退出",
    liveStage: "演出现场",
    useTemplate: "使用模版",
    createTemplate: "新建模版",
    publish: "发布到社区",
    author: "作者",
    downloads: "下载",
    likes: "点赞",
    unlocked: "解锁成就！",
    templateMode: "模版编辑模式",
    next: "下一步",
    back: "上一步",
    name: "姓名",
    gender: "性别",
    age: "年龄",
    role: "角色/职业",
    personality: "性格特征",
    speakingStyle: "语言风格",
    visual: "外貌描述 (可选)",
    yourCue: "轮到你表演了",
    directorNote: "导演提示：请根据角色性格输入对话",
    aiComplete: "AI 自动刻画",
    directorMode: "上帝指令",
    directorPlaceholder: "输入指令，如：'突然停电了' (AI将重构剧情)",
    inject: "注入指令",
    saving: "已保存",
    continue: "继续",
    quickStart: "快速开始",
    loginTitle: "Daydreaming",
    loginSubtitle: "登录以保存您的梦境",
    loginBtn: "登录",
    regBtn: "注册",
    welcome: "欢迎回来",
    apiKeyHint: "内置 Key 已启用。如有需要，可配置自定义 Key。",
    saveSettings: "保存设置",
    close: "关闭",
    noKey: "未检测到 API Key。请在右上角设置中配置。",
    commandQueued: "指令已缓存，正在重构时间线...",
    reconstructing: "正在重构时间线...",
    regenerate: "AI 重写",
    provider: "AI 模型服务商",
    openRouterKey: "OpenRouter API Key",
    openRouterModel: "OpenRouter Model ID (默认 gemini-2.0-flash-lite)",
    geminiKey: "Gemini API Key (可选)",
    autoAvatarGen: "正在为角色生成头像...",
    skipChapter: "下一章",
    chapter: "章节",
    chapterGoal: "本章目标",
    createCharacter: "新建角色",
    editCharacter: "编辑角色",
    uploadAvatar: "上传头像",
    genAvatar: "AI生成头像",
    aiFill: "✨ 一键补全设定",
    chatWith: "聊天",
    selectCharacters: "选择主演（可选）",
    memories: "长期记忆",
    memoriesHint: "AI 会根据聊天内容自动生成记忆，并优化性格。",
    savingMemories: "正在保存记忆并优化角色性格...",
    memorySaved: "角色已进化！记忆已更新。",
    enterNameHint: "输入角色名（如：林黛玉，孙悟空）",
    autoFillLoading: "正在刻画角色形象...",
    filter: "筛选",
    filterAll: "全部角色",
    filterMale: "男性",
    filterFemale: "女性",
  },
  'en-US': {
    title: "Daydreaming",
    subtitle: "Micro-Theater",
    heroTitle: "Daydreaming Made Real",
    heroSubtitle: "Every wild thought is a scene waiting to happen. The AI Director is ready.",
    dashboard: "Dashboard",
    myScripts: "My Dreams",
    templates: "Templates",
    characters: "Characters",
    community: "Community",
    achievements: "Achievements",
    settings: "Settings",
    startNew: "Start Dreaming",
    dreaming: "Dreaming...",
    create: "Generate Script",
    placeholder: "e.g. Three time travelers having tea in prehistoric times...",
    noScripts: "No dreams yet. Enter an idea above to start your first daydream.",
    setup: "Act 1: Setup",
    castSetup: "Act 2: Casting",
    startShow: "Curtain Up",
    premise: "Premise",
    plotPoints: "Plot Points",
    endings: "Endings",
    cast: "Cast",
    addActor: "Add Actor",
    aiAddActor: "AI Create Char",
    importActor: "Import Char",
    genLook: "Gen Look",
    playerControlled: "Player Controlled",
    observerMode: "Observer Mode",
    resumeAuto: "Resume Auto",
    speakingAs: "Speaking as",
    whatSay: "Enter dialogue...",
    onAir: "ON AIR",
    paused: "PAUSED",
    exit: "Exit",
    liveStage: "Live Stage",
    useTemplate: "Use Template",
    createTemplate: "Create Template",
    publish: "Publish",
    author: "Author",
    downloads: "Downloads",
    likes: "Likes",
    unlocked: "Achievement Unlocked!",
    templateMode: "Template Editor",
    next: "Next",
    back: "Back",
    name: "Name",
    gender: "Gender",
    age: "Age",
    role: "Role",
    personality: "Personality",
    speakingStyle: "Style",
    visual: "Visual (Optional)",
    yourCue: "Your Cue",
    directorNote: "Director's Note",
    aiComplete: "AI Auto-Complete",
    directorMode: "God Mode",
    directorPlaceholder: "Enter command e.g., 'Power outage'",
    inject: "Inject",
    saving: "Saved",
    continue: "Continue",
    quickStart: "Quick Start",
    loginTitle: "Daydreaming",
    loginSubtitle: "Login to save your dreams",
    loginBtn: "Login",
    regBtn: "Register",
    welcome: "Welcome back",
    apiKeyHint: "Default Key enabled. Configure custom key if needed.",
    saveSettings: "Save Settings",
    close: "Close",
    noKey: "No API Key found.",
    commandQueued: "Command queued...",
    reconstructing: "Reconstructing...",
    regenerate: "Regenerate",
    provider: "AI Provider",
    openRouterKey: "OpenRouter API Key",
    openRouterModel: "OpenRouter Model ID",
    geminiKey: "Gemini API Key (Optional)",
    autoAvatarGen: "Generating avatars...",
    skipChapter: "Next Chapter",
    chapter: "Chapter",
    chapterGoal: "Goal",
    createCharacter: "Create Character",
    editCharacter: "Edit Character",
    uploadAvatar: "Upload Avatar",
    genAvatar: "AI Avatar",
    aiFill: "✨ Magic Fill",
    chatWith: "Chat",
    selectCharacters: "Select Cast (Optional)",
    memories: "Memories",
    memoriesHint: "AI generates memories from chats and optimizes personality.",
    savingMemories: "Saving memories & evolving character...",
    memorySaved: "Character Evolved! Memory Saved.",
    enterNameHint: "Enter name (e.g. Sherlock Holmes)",
    autoFillLoading: "Crafting profile...",
    filter: "Filter",
    filterAll: "All Characters",
    filterMale: "Male",
    filterFemale: "Female",
  }
};

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: '1', title: '初次入梦', description: '创建第1个剧本', icon: '🌙', conditionType: 'SCRIPT_COUNT', threshold: 1, unlocked: false },
  { id: '2', title: '盗梦空间', description: '创建5个剧本', icon: '🌀', conditionType: 'SCRIPT_COUNT', threshold: 5, unlocked: false },
  { id: '3', title: '大导演', description: '发送20条消息', icon: '🎬', conditionType: 'MESSAGE_COUNT', threshold: 20, unlocked: false },
  { id: '4', title: '戏精附体', description: '亲自扮演角色', icon: '🎭', conditionType: 'CHAR_CONTROL', threshold: 1, unlocked: false },
  { id: '5', title: '造梦师', description: '创建一个模版', icon: '📐', conditionType: 'TEMPLATE_CREATE', threshold: 1, unlocked: false },
];

// --- Components ---

const Button = ({ 
  children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, size = 'md' 
}: { 
  children?: React.ReactNode, onClick?: () => void, variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success', 
  className?: string, disabled?: boolean, icon?: any, size?: 'sm' | 'md' | 'lg' 
}) => {
  const sizeClasses = { sm: "px-3 py-1.5 text-sm", md: "px-5 py-2.5", lg: "px-8 py-4 text-lg" };
  const base = "flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/20",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-600",
    ghost: "bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-white",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizeClasses[size]} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 18} />}
      {children}
    </button>
  );
};

const Avatar = ({ url, name, size = 'md' }: { url?: string, name: string, size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' }) => {
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-sm", lg: "w-24 h-24 text-lg", xl: "w-48 h-48 text-2xl", '2xl': "w-64 h-64 text-4xl" };
  if (url) return <img src={url} alt={name} className={`${sizeClasses[size]} rounded-full object-cover border-4 border-zinc-700 shadow-xl flex-shrink-0 bg-zinc-800`} />;
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border-4 border-zinc-700 shadow-xl text-zinc-400 font-bold select-none flex-shrink-0`}>
      {name ? name.substring(0, 2).toUpperCase() : '?'}
    </div>
  );
};

const SmartTextarea = ({
  value, onChange, onAIRequest, label, rows = 3, placeholder = ""
}: {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; onAIRequest: () => Promise<void>; label: string; rows?: number; placeholder?: string;
}) => {
  const [loading, setLoading] = useState(false);
  const handleAI = async () => {
    setLoading(true);
    await onAIRequest();
    setLoading(false);
  };
  return (
    <div className="relative group">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">{label}</label>
        <button onClick={handleAI} disabled={loading} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors bg-indigo-500/10 px-2 py-0.5 rounded hover:bg-indigo-500/20">
          {loading ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
          {loading ? "AI" : "AI"}
        </button>
      </div>
      <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none transition-all shadow-sm group-hover:border-zinc-700" rows={rows} value={value} onChange={onChange} placeholder={placeholder}/>
    </div>
  );
};

// --- Main App ---

export default function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authInput, setAuthInput] = useState('');

  // --- Config State ---
  const [lang, setLang] = useState<Language>('zh-CN');
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('skena_settings');
    return saved ? JSON.parse(saved) : { apiKey: '', activeProvider: 'GEMINI' };
  });

  // --- App View State ---
  const [view, setView] = useState<'DASHBOARD' | 'EDITOR' | 'STAGE' | 'CHAT'>('DASHBOARD');
  const [editorStep, setEditorStep] = useState<1 | 2>(1);
  // Default to CHARACTERS based on user feedback to make it more prominent
  const [dashboardTab, setDashboardTab] = useState<'SCRIPTS' | 'TEMPLATES' | 'CHARACTERS' | 'COMMUNITY' | 'ACHIEVEMENTS'>('CHARACTERS');
  const [scripts, setScripts] = useState<Script[]>([]);
  const [globalCharacters, setGlobalCharacters] = useState<GlobalCharacter[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('skena_achievements');
    return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
  });

  // --- Character Filter State ---
  const [characterFilter, setCharacterFilter] = useState('ALL');

  // --- Selection State for New Script ---
  const [selectedCastIds, setSelectedCastIds] = useState<string[]>([]);
  const [showCastSelector, setShowCastSelector] = useState(false);

  // --- Character Editor Modal State ---
  const [editingChar, setEditingChar] = useState<Partial<GlobalCharacter> | null>(null);
  const [showCharModal, setShowCharModal] = useState(false);
  const [isCharAutoFilling, setIsCharAutoFilling] = useState(false);
  const [isAvatarGenerating, setIsAvatarGenerating] = useState(false);

  // --- Chat State ---
  const [activeChatSession, setActiveChatSession] = useState<ChatSession | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [sessionUpdated, setSessionUpdated] = useState(false); // Track if we need to summarize on exit

  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  
  // --- Stage/Director State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [turnProcessing, setTurnProcessing] = useState(false);
  const [userInputs, setUserInputs] = useState<{[key: string]: string}>({});
  const [directorInput, setDirectorInput] = useState('');
  const [isReconstructing, setIsReconstructing] = useState(false);
  
  // Director Queue Buffer for God Mode
  const directorQueueRef = useRef<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const companionChatEndRef = useRef<HTMLDivElement>(null);
  const [notification, setNotification] = useState<{title: string, msg: string, type?: 'error' | 'success'} | null>(null);

  const t = TRANSLATIONS[lang];

  // --- Auth & Data Loading Effects ---
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setScripts(authService.getScripts(user.id));
      setGlobalCharacters(authService.getGlobalCharacters(user.id));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      authService.saveScripts(currentUser.id, scripts);
    }
  }, [scripts, currentUser]);

  useEffect(() => {
    if (currentUser) {
      authService.saveGlobalCharacters(currentUser.id, globalCharacters);
    }
  }, [globalCharacters, currentUser]);

  useEffect(() => {
    if (view === 'STAGE' && chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentScript?.history, view]);

  useEffect(() => {
    if (view === 'CHAT' && companionChatEndRef.current) {
        companionChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatSession?.messages, view]);

  // --- Game Loop (OPTIMIZED) ---
  useEffect(() => {
    if (!currentScript || view !== 'STAGE') return;
    if (!isPlaying && !turnProcessing && !isReconstructing) { /* Idle */ }
    if (turnProcessing || isReconstructing || !isPlaying) return;

    const gameLoop = async () => {
      setTurnProcessing(true);
      try {
        // God Mode Check
        let forcedCommand = null;
        if (directorQueueRef.current.length > 0) {
            forcedCommand = directorQueueRef.current.shift() || null;
            if (forcedCommand) {
                setIsPlaying(false);
                setIsReconstructing(true);
                const newPlot = await regenerateFuturePlot(currentScript, forcedCommand, appSettings);
                updateScriptState({ ...currentScript, plotPoints: newPlot });
                const dirMsg: Message = {
                    id: crypto.randomUUID(), characterId: 'narrator', content: `[SYSTEM OVERRIDE]: ${forcedCommand}`, type: 'narration', timestamp: Date.now()
                };
                handleUpdateScriptHistory(dirMsg);
                setIsReconstructing(false);
                setIsPlaying(true);
                setTurnProcessing(false);
                return;
            }
        }

        const currentPlotIndex = currentScript.currentPlotIndex || 0;
        const targetPlot = currentScript.plotPoints[currentPlotIndex] || currentScript.plotPoints[currentScript.plotPoints.length - 1];

        // 1. Generate Text (Fast)
        const nextBeat = await generateNextBeat(currentScript, forcedCommand, targetPlot, lang, appSettings);
        
        // 2. Add Message Immediately
        const newMessage: Message = {
          id: crypto.randomUUID(), characterId: nextBeat.characterId,
          content: nextBeat.content, type: nextBeat.type, timestamp: Date.now()
        };
        handleUpdateScriptHistory(newMessage);

        // 3. Generate Image Asynchronously (Non-blocking) if narration
        if (nextBeat.type === 'narration') {
            generateSceneImage(nextBeat.content, currentScript.title, appSettings).then(url => {
                 setScripts(prev => prev.map(s => {
                     if (s.id === currentScript.id) {
                         const updatedHistory = s.history.map(m => m.id === newMessage.id ? { ...m, imageUrl: url } : m);
                         const updatedScript = { ...s, history: updatedHistory };
                         if (currentScript.id === s.id) setCurrentScript(updatedScript); // update active state if match
                         return updatedScript;
                     }
                     return s;
                 }));
            }).catch(() => {});
        }

      } catch (e: any) {
        console.error("Game loop error", e);
        setIsPlaying(false);
      } finally {
        setTurnProcessing(false);
      }
    };
    
    // Aggressive loop speed for responsiveness
    const timer = setTimeout(gameLoop, 500);
    return () => clearTimeout(timer);
  }, [isPlaying, currentScript, view, turnProcessing, lang, appSettings, isReconstructing]);


  // --- Handlers ---

  const handleLogin = () => {
    if (!authInput.trim()) return;
    try {
      let user;
      if (authMode === 'LOGIN') user = authService.login(authInput);
      else user = authService.register(authInput);
      setCurrentUser(user);
      setScripts(authService.getScripts(user.id));
      setGlobalCharacters(authService.getGlobalCharacters(user.id));
      setAuthInput('');
    } catch (e: any) {
      showNotification("Auth Error", e.message, 'error');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setScripts([]);
    setGlobalCharacters([]);
    setView('DASHBOARD');
  };

  const handleSaveSettings = () => {
    localStorage.setItem('skena_settings', JSON.stringify(appSettings));
    setShowSettings(false);
    showNotification("Settings", t.saving);
  };

  const showNotification = (title: string, msg: string, type: 'error' | 'success' = 'success') => {
    setNotification({title, msg, type});
    setTimeout(() => setNotification(null), 5000);
  };

  const updateScriptState = (updatedScript: Script) => {
    updatedScript.lastUpdated = Date.now();
    setCurrentScript(updatedScript);
    setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s));
  };

  const handleUpdateScriptHistory = (message: Message) => {
    if (!currentScript) return;
    setCurrentScript(prev => {
        if (!prev) return null;
        const newScript = {
            ...prev,
            history: [...prev.history, message],
            lastUpdated: Date.now()
        };
        setScripts(all => all.map(s => s.id === newScript.id ? newScript : s));
        return newScript;
    });
  };

  // --- Global Character Management ---

  const openNewCharacterModal = () => {
      setEditingChar({
          id: crypto.randomUUID(),
          name: '', gender: '', age: '', personality: '', speakingStyle: '', visualDescription: '',
          avatarUrl: '', memories: []
      });
      setShowCharModal(true);
  };

  const handleEditCharacter = (char: GlobalCharacter) => {
      setEditingChar({ ...char });
      setShowCharModal(true);
  };

  const handleSaveGlobalCharacter = async () => {
      if (!editingChar || !editingChar.name || !currentUser) return;
      
      const newChar: GlobalCharacter = {
          id: editingChar.id || crypto.randomUUID(),
          ownerId: currentUser.id,
          name: editingChar.name,
          gender: editingChar.gender || "Unknown",
          age: editingChar.age || "Unknown",
          personality: editingChar.personality || "Neutral",
          speakingStyle: editingChar.speakingStyle || "Normal",
          visualDescription: editingChar.visualDescription || "A person",
          avatarUrl: editingChar.avatarUrl,
          createdAt: Date.now(),
          memories: editingChar.memories || []
      };

      // Check if updating
      const exists = globalCharacters.find(c => c.id === newChar.id);
      if (exists) {
          setGlobalCharacters(prev => prev.map(c => c.id === newChar.id ? newChar : c));
      } else {
          setGlobalCharacters(prev => [...prev, newChar]);
      }
      
      // Generate avatar if missing
      if (!newChar.avatarUrl) {
          try {
             const url = await generateAvatarImage(newChar, appSettings);
             setGlobalCharacters(prev => prev.map(c => c.id === newChar.id ? { ...c, avatarUrl: url } : c));
          } catch(e) {}
      }

      setShowCharModal(false);
      setEditingChar(null);
  };

  const handleAICompleteChar = async () => {
      if (!editingChar || !editingChar.name) {
          showNotification("Hint", "Please enter a name first!", "error");
          return;
      }
      setIsCharAutoFilling(true);
      try {
          const filled = await completeCharacterProfile(editingChar, appSettings);
          // If the AI returned emptiness (unlikely with retry, but possible with timeout), we should not wipe existing data
          setEditingChar(prev => ({
              ...prev,
              ...filled
          }));
      } catch (e: any) {
          showNotification("AI Error", "Failed to autocomplete. Check API Key.", 'error');
          console.error(e);
      } finally {
          setIsCharAutoFilling(false);
      }
  };

  const handleCharacterAvatarGen = async () => {
      if (!editingChar || !editingChar.visualDescription) return;
      setIsAvatarGenerating(true);
      try {
          // Temporarily construct a Character-like object
          const tempChar: any = { ...editingChar };
          const url = await generateAvatarImage(tempChar, appSettings);
          setEditingChar(prev => ({...prev, avatarUrl: url}));
      } catch (e) {
          showNotification("Error", "Avatar generation failed", 'error');
      } finally {
          setIsAvatarGenerating(false);
      }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && editingChar) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditingChar({ ...editingChar, avatarUrl: reader.result as string });
          };
          reader.readAsDataURL(file);
      }
  };

  // --- Companion Chat ---
  
  const handleOpenChat = (char: GlobalCharacter) => {
      if (!currentUser) return;
      let session = authService.getChatSession(currentUser.id, char.id);
      if (!session) {
          session = {
              id: crypto.randomUUID(),
              userId: currentUser.id,
              characterId: char.id,
              messages: [],
              lastUpdated: Date.now()
          };
      }
      setActiveChatSession(session);
      setSessionUpdated(false);
      setView('CHAT');
  };
  
  const handleExitChat = async () => {
      if (!activeChatSession || !currentUser) {
          setView('DASHBOARD');
          return;
      }

      // If we had a conversation, let's optimize the character!
      if (sessionUpdated && activeChatSession.messages.length > 2) {
          const char = globalCharacters.find(c => c.id === activeChatSession.characterId);
          if (char) {
              showNotification(t.memories, t.savingMemories, 'success');
              try {
                  const evolution = await evolveCharacterFromChat(char, activeChatSession.messages, appSettings);
                  
                  const updatedChar: GlobalCharacter = {
                      ...char,
                      personality: evolution.newPersonality,
                      speakingStyle: evolution.newSpeakingStyle,
                      memories: evolution.memory ? [...(char.memories || []), evolution.memory] : char.memories
                  };
                  
                  // Update global chars
                  setGlobalCharacters(prev => prev.map(c => c.id === updatedChar.id ? updatedChar : c));
                  showNotification(t.memories, t.memorySaved, 'success');
              } catch (e) {
                  console.error("Failed to evolve character", e);
              }
          }
      }

      setView('DASHBOARD');
  };

  const handleSendChatMessage = async () => {
      if (!activeChatSession || !chatInput.trim() || !currentUser) return;
      
      const char = globalCharacters.find(c => c.id === activeChatSession.characterId);
      if (!char) return;

      const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: chatInput,
          timestamp: Date.now()
      };

      const updatedSession = {
          ...activeChatSession,
          messages: [...activeChatSession.messages, userMsg],
          lastUpdated: Date.now()
      };
      setActiveChatSession(updatedSession);
      setSessionUpdated(true);
      setChatInput('');
      setIsChatting(true);

      try {
          const result = await chatWithCharacter(char, updatedSession.messages, userMsg.content, appSettings);
          const aiMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'model',
              content: result.text,
              timestamp: Date.now(),
              mediaUrl: result.mediaUrl,
              mediaType: result.mediaType
          };
          
          const finalSession = {
              ...updatedSession,
              messages: [...updatedSession.messages, aiMsg],
              lastUpdated: Date.now()
          };
          setActiveChatSession(finalSession);
          authService.saveChatSession(finalSession);
      } catch (e) {
          showNotification("Chat Error", "Failed to get response", 'error');
      } finally {
          setIsChatting(false);
      }
  };

  // --- Script Gen Logic ---

  const handleCreateScript = async () => {
    if (!currentUser) return;
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    setShowCastSelector(false); // Close dropdown if open
    
    try {
      // Find selected global chars
      const cast = globalCharacters.filter(c => selectedCastIds.includes(c.id));
      
      const blueprint = await generateScriptBlueprint(promptInput, cast, lang, appSettings);
      
      const newScript: Script = {
        id: crypto.randomUUID(),
        ownerId: currentUser.id,
        title: blueprint.title || "Untitled",
        premise: blueprint.premise || "",
        setting: blueprint.setting || "",
        plotPoints: blueprint.plotPoints || [],
        possibleEndings: blueprint.possibleEndings || [],
        characters: blueprint.characters || [],
        history: [{
          id: crypto.randomUUID(), characterId: 'narrator', type: 'narration',
          content: lang === 'zh-CN' 
            ? `场景开始于${blueprint.setting}。${blueprint.premise}` 
            : `The scene opens in ${blueprint.setting}. ${blueprint.premise}`,
          timestamp: Date.now()
        }],
        currentPlotIndex: 0,
        lastUpdated: Date.now(),
        isTemplate: false
      };
      setScripts(prev => [newScript, ...prev]);
      setCurrentScript(newScript);
      setView('EDITOR');
      setEditorStep(1);
      setPromptInput('');
      setSelectedCastIds([]);
      
      // Auto-generate avatars only for non-global chars (global chars already have avatars)
      newScript.characters.forEach(c => {
          if (!c.isGlobal) handleGenerateAvatar(c, newScript.id);
      });

    } catch (e: any) {
      showNotification("Error", "Failed to generate scenario. Check API Key.", "error");
      if (e.message.includes("API Key")) setShowSettings(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAvatar = async (char: Character, scriptId?: string) => {
    const targetScript = scriptId ? scripts.find(s => s.id === scriptId) : currentScript;
    if (!targetScript) return;
    
    try {
      const url = await generateAvatarImage(char, appSettings);
      if (currentScript && currentScript.id === targetScript.id) {
          const updatedChars = currentScript.characters.map(c => c.id === char.id ? { ...c, avatarUrl: url } : c);
          updateScriptState({ ...currentScript, characters: updatedChars });
      } else {
          setScripts(prev => prev.map(s => {
              if (s.id === targetScript.id) {
                  return { ...s, characters: s.characters.map(c => c.id === char.id ? { ...c, avatarUrl: url } : c) };
              }
              return s;
          }));
      }
    } catch (e: any) { console.warn("Avatar gen failed for", char.name); }
  };

  const handleAiAddCharacter = async () => {
      if (!currentScript) return;
      try {
          const newChar = await generateSingleCharacter(currentScript, appSettings);
          handleGenerateAvatar(newChar, currentScript.id);
          updateScriptState({...currentScript, characters: [...currentScript.characters, newChar]});
      } catch (e) {
          showNotification("Error", "Failed to create character", "error");
      }
  };
  
  const handleImportGlobalCharacter = (globalChar: GlobalCharacter) => {
      if (!currentScript) return;
      const newChar: Character = {
          id: crypto.randomUUID(),
          name: globalChar.name,
          role: "Extra", // Default role, user can edit
          personality: globalChar.personality,
          speakingStyle: globalChar.speakingStyle,
          visualDescription: globalChar.visualDescription,
          avatarUrl: globalChar.avatarUrl,
          gender: globalChar.gender,
          age: globalChar.age,
          isUserControlled: false,
          isGlobal: true,
          globalId: globalChar.id
      };
      updateScriptState({...currentScript, characters: [...currentScript.characters, newChar]});
  };

  const handleRefine = async (text: string, fieldType: string, callback: (newText: string) => void) => {
    if (!currentScript) return;
    try {
      const refined = await refineText(text, fieldType, currentScript, lang, appSettings);
      callback(refined);
    } catch (e) { console.error("Refine failed", e); }
  };

  const handleRefinePlotPoint = async (index: number) => {
      if (!currentScript) return;
      const point = currentScript.plotPoints[index];
      await handleRefine(point, `Plot Point ${index+1}`, (newText) => {
          const pts = [...currentScript.plotPoints];
          pts[index] = newText;
          updateScriptState({...currentScript, plotPoints: pts});
      });
  };

  const handleDirectorMessage = () => {
    if (!directorInput.trim() || !currentScript) return;
    directorQueueRef.current.push(directorInput);
    setDirectorInput('');
    if (!isPlaying) setIsPlaying(true);
  };

  const handleNextChapter = () => {
    if (!currentScript) return;
    const currentIndex = currentScript.currentPlotIndex || 0;
    if (currentIndex >= currentScript.plotPoints.length - 1) return;
    const newIndex = currentIndex + 1;
    const nextPlot = currentScript.plotPoints[newIndex];
    updateScriptState({ ...currentScript, currentPlotIndex: newIndex });
    const newMessage: Message = { id: crypto.randomUUID(), characterId: 'narrator', content: `>>> ${t.chapter} ${newIndex + 1}: ${nextPlot}`, type: 'narration', timestamp: Date.now() };
    handleUpdateScriptHistory(newMessage);
    if (!isPlaying) setIsPlaying(true);
  };

  // --- Views ---

  if (!currentUser) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center opacity-20 animate-fade-in"></div>
        <div className="z-10 bg-zinc-900/80 backdrop-blur-xl p-10 rounded-3xl border border-zinc-700 shadow-2xl w-full max-w-md animate-fade-in">
           <div className="text-center mb-8 flex flex-col items-center">
              <Logo className="mb-4 scale-150 origin-center" />
              <p className="text-zinc-400 mt-2">{t.loginSubtitle}</p>
           </div>
           
           <div className="flex bg-zinc-800 p-1 rounded-lg mb-6">
             <button className={`flex-1 py-2 rounded text-sm font-bold ${authMode === 'LOGIN' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500'}`} onClick={() => setAuthMode('LOGIN')}>{t.loginBtn}</button>
             <button className={`flex-1 py-2 rounded text-sm font-bold ${authMode === 'REGISTER' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500'}`} onClick={() => setAuthMode('REGISTER')}>{t.regBtn}</button>
           </div>
           
           <div className="space-y-4">
             <div>
               <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">{t.name}</label>
               <input className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none" 
                  value={authInput} onChange={e => setAuthInput(e.target.value)} placeholder="Username" 
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
               />
             </div>
             <Button onClick={handleLogin} className="w-full py-4 text-lg" variant="primary">
               {authMode === 'LOGIN' ? t.loginBtn : t.regBtn}
             </Button>
           </div>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="h-screen bg-zinc-950 flex flex-col items-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="flex-1 w-full overflow-y-auto flex flex-col items-center z-10 scroll-smooth">
          <header className="w-full max-w-6xl px-6 py-6 flex justify-between items-center z-10 flex-shrink-0">
            <Logo />
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setShowSettings(true)} icon={Settings} size="sm"></Button>
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                <UserIcon size={14}/> {currentUser.username}
              </div>
              <Button variant="ghost" onClick={handleLogout} icon={LogOut} size="sm" className="text-zinc-600 hover:text-red-400"></Button>
            </div>
          </header>

          {dashboardTab === 'SCRIPTS' && (
          <section className="w-full max-w-4xl px-6 pt-8 pb-16 text-center z-10 flex flex-col items-center">
            <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight drop-shadow-2xl">{t.heroTitle}</h1>
            <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl leading-relaxed">{t.heroSubtitle}</p>
            <div className="w-full max-w-2xl relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 transition duration-1000"></div>
              <div className="relative flex flex-col bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden">
                {/* Input Area */}
                <div className="flex items-center p-2">
                    <Sparkles className="text-indigo-400 ml-4 mr-2" />
                    <input type="text" value={promptInput} onChange={(e) => setPromptInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateScript()} placeholder={t.placeholder} className="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder-zinc-500 h-12" />
                    <Button onClick={handleCreateScript} disabled={isGenerating || !promptInput} size="md" className="rounded-xl px-6 shadow-none">
                    {isGenerating ? t.dreaming : t.create}
                    </Button>
                </div>
                {/* Character Selection */}
                <div className="px-4 pb-2 flex justify-start">
                    <button onClick={() => setShowCastSelector(!showCastSelector)} className="text-xs font-bold text-zinc-500 flex items-center gap-2 hover:text-indigo-400 transition-colors pb-2">
                        <Users size={12} /> {t.selectCharacters} {selectedCastIds.length > 0 && `(${selectedCastIds.length})`}
                    </button>
                </div>
                {showCastSelector && (
                    <div className="bg-zinc-950/50 border-t border-zinc-800 p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 animate-fade-in max-h-40 overflow-y-auto">
                        {globalCharacters.map(c => (
                            <div key={c.id} onClick={() => {
                                if(selectedCastIds.includes(c.id)) setSelectedCastIds(prev => prev.filter(id => id !== c.id));
                                else setSelectedCastIds(prev => [...prev, c.id]);
                            }} className={`flex items-center gap-2 p-2 rounded cursor-pointer border transition-all ${selectedCastIds.includes(c.id) ? 'bg-indigo-900/30 border-indigo-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
                                <Avatar name={c.name} url={c.avatarUrl} size="sm" />
                                <span className="text-xs truncate font-medium text-zinc-300">{c.name}</span>
                            </div>
                        ))}
                        {globalCharacters.length === 0 && <span className="text-zinc-500 text-xs col-span-full">No characters created yet. Go to Characters tab.</span>}
                    </div>
                )}
              </div>
            </div>
          </section>
          )}

          <main className="w-full max-w-6xl px-6 pb-20 z-10 flex-1 mt-8">
            <div className="flex justify-center mb-10">
              <div className="flex bg-zinc-900/80 backdrop-blur p-1 rounded-full border border-zinc-800">
                {[ { id: 'CHARACTERS', label: t.characters, icon: Users }, { id: 'SCRIPTS', label: t.myScripts, icon: Film }, { id: 'TEMPLATES', label: t.templates, icon: BookOpen }, { id: 'ACHIEVEMENTS', label: t.achievements, icon: Trophy } ].map(tab => (
                  <button key={tab.id} onClick={() => setDashboardTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all text-sm font-bold ${dashboardTab === tab.id ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="animate-fade-in">
              {dashboardTab === 'SCRIPTS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(scripts || []).filter(s => !s.isTemplate).map(script => (
                    <div key={script.id} onClick={() => { setCurrentScript(script); setView('STAGE'); }} className="group cursor-pointer bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:scale-[1.02] hover:shadow-2xl hover:border-indigo-500/30 transition-all flex flex-col h-[280px]">
                      <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 w-full" />
                      <div className="p-6 flex flex-col h-full">
                        <h3 className="font-bold text-xl text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-2">{script.title}</h3>
                        <p className="text-zinc-400 text-sm line-clamp-3 mb-auto">{script.premise}</p>
                        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                          <div className="flex -space-x-2 pl-2">
                            {(script.characters || []).slice(0, 3).map(c => <div key={c.id} className="relative"><Avatar name={c.name} url={c.avatarUrl} size="sm" /></div>)}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-600 transition-colors"><Play size={14} fill="currentColor" /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {dashboardTab === 'CHARACTERS' && (
                  <div>
                      <div className="flex justify-end mb-4">
                          <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                             <div className="px-2 text-zinc-500"><Filter size={14} /></div>
                             <select 
                                value={characterFilter} 
                                onChange={(e) => setCharacterFilter(e.target.value)}
                                className="bg-transparent text-sm text-zinc-300 focus:outline-none py-1 pr-2 cursor-pointer"
                             >
                                <option value="ALL">{t.filterAll}</option>
                                <option value="MALE">{t.filterMale}</option>
                                <option value="FEMALE">{t.filterFemale}</option>
                             </select>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {/* Create New Card */}
                          <div onClick={openNewCharacterModal} className="cursor-pointer bg-gradient-to-br from-indigo-900/20 to-zinc-900 border border-indigo-500/30 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 hover:bg-indigo-900/30 transition-all group min-h-[300px]">
                              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                  <Plus size={32} className="text-indigo-400" />
                              </div>
                              <h3 className="text-xl font-bold text-white group-hover:text-indigo-300">{t.createCharacter}</h3>
                              <p className="text-zinc-500 text-sm mt-2 text-center">Design a new persona with AI magic</p>
                          </div>

                          {globalCharacters.filter(c => {
                                if (characterFilter === 'ALL') return true;
                                if (characterFilter === 'MALE') return c.gender === '男' || c.gender?.toLowerCase() === 'male';
                                if (characterFilter === 'FEMALE') return c.gender === '女' || c.gender?.toLowerCase() === 'female';
                                return true;
                          }).map(char => (
                              <div key={char.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-indigo-500/50 hover:shadow-xl transition-all group flex flex-col relative min-h-[300px]">
                                  <div className="flex justify-center -mt-10 mb-4">
                                      <Avatar name={char.name} url={char.avatarUrl} size="xl" />
                                  </div>
                                  <div className="text-center mb-4 flex-1">
                                      <h3 className="font-bold text-white text-xl mb-1">{char.name}</h3>
                                      <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-2">Character</p>
                                      <div className="flex justify-center gap-2 mb-3">
                                          <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 border border-zinc-700">{char.gender}</span>
                                          <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 border border-zinc-700">{char.age}</span>
                                      </div>
                                      <p className="text-sm text-zinc-500 line-clamp-3 italic">"{char.personality}"</p>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 mt-auto">
                                      <Button size="sm" variant="secondary" className="text-xs" onClick={() => handleEditCharacter(char)} icon={Edit3}>{t.editCharacter}</Button>
                                      <Button size="sm" variant="primary" className="text-xs" onClick={() => handleOpenChat(char)} icon={MessageSquare}>{t.chatWith}</Button>
                                  </div>
                                  <button className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setGlobalCharacters(p => p.filter(c => c.id !== char.id)); }}>
                                    <Trash2 size={16}/>
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              {dashboardTab === 'TEMPLATES' && <div className="text-center py-20 text-zinc-500"><Button onClick={() => {}} icon={Plus} variant="secondary">Use Script as Template</Button></div>}
              {dashboardTab === 'ACHIEVEMENTS' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(achievements || []).map(ach => (
                    <div key={ach.id} className={`p-6 rounded-2xl border flex flex-col items-center text-center transition-all duration-500 ${ach.unlocked ? 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-indigo-500/50 scale-105' : 'bg-zinc-900 border-zinc-800 opacity-50 grayscale'}`}>
                      <div className="text-5xl mb-4">{ach.icon}</div>
                      <h3 className={`font-bold text-sm ${ach.unlocked ? 'text-white' : 'text-zinc-500'}`}>{ach.title}</h3>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
      </div>
    </div>
  );

  const renderCharacterModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
              {/* Header */}
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Sparkles size={20} className="text-indigo-400"/> 
                      {editingChar?.id && globalCharacters.find(c => c.id === editingChar.id) ? t.editCharacter : t.createCharacter}
                  </h2>
                  <button onClick={() => setShowCharModal(false)}><X className="text-zinc-500 hover:text-white"/></button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                  
                  {/* Left Column: Visuals */}
                  <div className="w-full md:w-1/3 bg-zinc-950 p-8 flex flex-col items-center border-r border-zinc-800 overflow-y-auto">
                      <div className="relative group">
                          <Avatar name={editingChar?.name || "?"} url={editingChar?.avatarUrl} size="2xl" />
                          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                              <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur flex items-center gap-2">
                                  <Upload size={14}/> {t.uploadAvatar}
                                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                              </label>
                              <button onClick={handleCharacterAvatarGen} disabled={isAvatarGenerating || !editingChar?.visualDescription} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                  {isAvatarGenerating ? <RefreshCw size={14} className="animate-spin"/> : <Wand2 size={14}/>} {t.genAvatar}
                              </button>
                          </div>
                      </div>
                      <p className="text-zinc-500 text-xs mt-4 text-center px-4">
                          Upload an image or use AI to generate one based on the visual description.
                      </p>
                  </div>

                  {/* Right Column: Data Form */}
                  <div className="w-full md:w-2/3 p-8 overflow-y-auto space-y-6 bg-zinc-900/50">
                      
                      {/* Name & Magic Fill */}
                      <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">{t.name}</label>
                          <div className="flex gap-2">
                              <input 
                                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-lg text-white placeholder-zinc-600 focus:border-indigo-500 outline-none transition-all" 
                                  value={editingChar?.name || ''} 
                                  onChange={e => setEditingChar(p => ({...p!, name: e.target.value}))} 
                                  placeholder={t.enterNameHint}
                              />
                              <Button 
                                  onClick={handleAICompleteChar} 
                                  disabled={!editingChar?.name || isCharAutoFilling}
                                  variant="primary" 
                                  className="whitespace-nowrap shadow-indigo-500/20"
                                  icon={isCharAutoFilling ? RefreshCw : Sparkles}
                              >
                                  {isCharAutoFilling ? t.autoFillLoading : t.aiFill}
                              </Button>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-2 ml-1">
                              Tip: Enter a name (e.g. "Sherlock Holmes") and click Magic Fill to auto-generate the soul!
                          </p>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">{t.gender}</label>
                              <input className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white" value={editingChar?.gender || ''} onChange={e => setEditingChar(p => ({...p!, gender: e.target.value}))} />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">{t.age}</label>
                              <input className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white" value={editingChar?.age || ''} onChange={e => setEditingChar(p => ({...p!, age: e.target.value}))} />
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">{t.personality}</label>
                          <textarea className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-300 min-h-[80px]" rows={3} value={editingChar?.personality || ''} onChange={e => setEditingChar(p => ({...p!, personality: e.target.value}))} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">{t.speakingStyle}</label>
                              <textarea className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-300 min-h-[100px]" rows={4} value={editingChar?.speakingStyle || ''} onChange={e => setEditingChar(p => ({...p!, speakingStyle: e.target.value}))} />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">{t.visual}</label>
                              <textarea className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-300 min-h-[100px]" rows={4} value={editingChar?.visualDescription || ''} onChange={e => setEditingChar(p => ({...p!, visualDescription: e.target.value}))} />
                          </div>
                      </div>
                      
                      {/* Memories Section */}
                      {editingChar?.memories && editingChar.memories.length > 0 && (
                          <div className="border-t border-zinc-800 pt-6">
                               <label className="text-xs font-bold text-indigo-400 uppercase block mb-3 flex items-center gap-2">
                                   <BrainCircuit size={14}/> {t.memories}
                               </label>
                               <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-2 max-h-32 overflow-y-auto">
                                   {editingChar.memories.map((m, idx) => (
                                       <div key={idx} className="text-xs text-zinc-400 flex gap-2">
                                           <span className="text-indigo-500">•</span> {m}
                                       </div>
                                   ))}
                               </div>
                          </div>
                      )}

                  </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-4">
                  <Button variant="secondary" onClick={() => setShowCharModal(false)}>{t.close}</Button>
                  <Button variant="primary" onClick={handleSaveGlobalCharacter} icon={Save} className="px-8">{t.saveSettings}</Button>
              </div>
          </div>
      </div>
  );

  const renderChatInterface = () => {
      if (!activeChatSession) return null;
      const char = globalCharacters.find(c => c.id === activeChatSession.characterId);
      
      return (
          <div className="h-screen flex flex-col bg-zinc-950">
              <header className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <Button variant="ghost" onClick={handleExitChat} icon={ChevronLeft}>{t.back}</Button>
                      <div className="flex items-center gap-3">
                          <Avatar name={char?.name || "?"} url={char?.avatarUrl} size="md" />
                          <div>
                              <h2 className="font-bold text-white">{char?.name}</h2>
                              <div className="flex items-center gap-1.5 text-xs text-green-400"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Online</div>
                          </div>
                      </div>
                  </div>
              </header>
              <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                  {activeChatSession.messages.map(msg => (
                      <div key={msg.id} className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                          <div className={`flex-shrink-0 ${msg.role === 'user' ? 'mt-1' : ''}`}>
                               {msg.role === 'user' ? 
                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">{currentUser?.username.substring(0,2).toUpperCase()}</div> :
                                <Avatar name={char?.name || "?"} url={char?.avatarUrl} size="md" />
                               }
                          </div>
                          <div className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-200 rounded-tl-none'}`}>
                              {/* Text Content */}
                              {msg.content}
                              
                              {/* Media Content (Image/Video) */}
                              {msg.mediaUrl && (
                                  <div className="mt-3 rounded-xl overflow-hidden shadow-lg border border-white/10">
                                      {msg.mediaType === 'image' ? (
                                          <img src={msg.mediaUrl} alt="Generated" className="w-full h-auto max-h-96 object-cover" />
                                      ) : msg.mediaType === 'video' ? (
                                          <div className="relative">
                                              <video src={msg.mediaUrl} controls className="w-full h-auto max-h-96" />
                                              <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] text-white flex items-center gap-1">
                                                  <Video size={10} /> AI Video
                                              </div>
                                          </div>
                                      ) : null}
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
                  {isChatting && (
                       <div className="flex gap-4 max-w-3xl mr-auto animate-pulse">
                           <Avatar name={char?.name || "?"} url={char?.avatarUrl} size="md" />
                           <div className="bg-zinc-800 p-4 rounded-2xl rounded-tl-none text-zinc-500 flex items-center gap-1">
                               <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                               <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-75"></span>
                               <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce delay-150"></span>
                           </div>
                       </div>
                  )}
                  <div ref={companionChatEndRef} />
              </main>
              <footer className="p-4 bg-zinc-900 border-t border-zinc-800">
                  <div className="max-w-4xl mx-auto flex gap-2">
                      <input className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all" 
                          placeholder="Type a message..." 
                          value={chatInput} 
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()}
                          disabled={isChatting}
                      />
                      <Button onClick={handleSendChatMessage} disabled={!chatInput.trim() || isChatting} icon={Send} variant="primary" className="rounded-xl"></Button>
                  </div>
              </footer>
          </div>
      );
  };

  const renderEditor = () => {
    if (!currentScript) return null;
    return (
      <div className="h-screen flex flex-col bg-zinc-950 animate-fade-in">
        <header className="flex-shrink-0 border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-900 z-10">
          <Button variant="ghost" onClick={() => setView('DASHBOARD')} icon={ChevronLeft}>{t.dashboard}</Button>
          <div className="flex items-center gap-4 text-sm font-bold text-zinc-500">
             <span className={`px-3 py-1 rounded-full ${editorStep === 1 ? 'bg-zinc-800 text-white' : ''}`}>1. {t.setup}</span> 
             <span className="text-zinc-700">/</span>
             <span className={`px-3 py-1 rounded-full ${editorStep === 2 ? 'bg-zinc-800 text-white' : ''}`}>2. {t.castSetup}</span>
          </div>
          <div className="flex gap-2">
            {editorStep === 1 ? <Button onClick={() => setEditorStep(2)} icon={ChevronRight}>{t.next}</Button> : <Button icon={Play} onClick={() => setView('STAGE')}>{t.startShow}</Button>}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {editorStep === 1 && (
              <>
                 <div><label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Title</label><input className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-2xl font-bold text-white outline-none focus:border-indigo-500" value={currentScript.title} onChange={e => updateScriptState({...currentScript, title: e.target.value})} /></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SmartTextarea label={t.premise} value={currentScript.premise} onChange={e => updateScriptState({...currentScript, premise: e.target.value})} onAIRequest={async() => handleRefine(currentScript.premise, 'Premise', v => updateScriptState({...currentScript, premise: v}))} />
                    <SmartTextarea label="Setting" value={currentScript.setting} onChange={e => updateScriptState({...currentScript, setting: e.target.value})} onAIRequest={async() => handleRefine(currentScript.setting, 'Setting', v => updateScriptState({...currentScript, setting: v}))} />
                 </div>
                 
                 <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 block flex items-center gap-2">
                        {t.plotPoints} <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px]">Step-by-Step</span>
                    </label>
                    <div className="grid gap-4">
                        {(currentScript.plotPoints || []).map((p, i) => (
                            <div key={i} className="group relative bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex gap-4 items-start hover:border-indigo-500/30 transition-all">
                                <div className="bg-zinc-800 w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 font-bold text-xs flex-shrink-0">
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <textarea 
                                        className="w-full bg-transparent text-zinc-300 text-sm outline-none resize-none leading-relaxed" 
                                        rows={2}
                                        value={p} 
                                        onChange={e => { const pts = [...currentScript.plotPoints]; pts[i] = e.target.value; updateScriptState({...currentScript, plotPoints: pts}); }} 
                                    />
                                </div>
                                <button onClick={() => handleRefinePlotPoint(i)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-zinc-800 rounded text-indigo-400 transition-all" title="AI Improve">
                                    <Sparkles size={16} />
                                </button>
                                <button onClick={() => { const pts = currentScript.plotPoints.filter((_, idx) => idx !== i); updateScriptState({...currentScript, plotPoints: pts}); }} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-zinc-800 rounded text-red-400 transition-all">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <button onClick={() => updateScriptState({...currentScript, plotPoints: [...currentScript.plotPoints, "New Event"]})} className="flex items-center justify-center gap-2 py-3 border border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-white hover:border-zinc-600 transition-all">
                            <Plus size={16} /> Add Beat
                        </button>
                    </div>
                 </div>
              </>
            )}
            {editorStep === 2 && (
              <div className="space-y-6">
                <div className="flex gap-4">
                    <Button className="flex-1" variant="secondary" icon={Plus} onClick={() => updateScriptState({...currentScript, characters: [...currentScript.characters, { id: crypto.randomUUID(), name: "New Char", role: "Extra", personality: "Neutral", speakingStyle: "Normal", visualDescription: "...", isUserControlled: false }]})}>{t.addActor}</Button>
                    <Button className="flex-1 bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border-emerald-500/30 hover:border-emerald-500/50" icon={Sparkles} onClick={handleAiAddCharacter}>{t.aiAddActor}</Button>
                    {globalCharacters.length > 0 && (
                        <div className="relative group">
                            <Button variant="secondary" icon={Users}>{t.importActor}</Button>
                            <div className="absolute top-full mt-2 right-0 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl hidden group-hover:block z-50">
                                {globalCharacters.map(c => (
                                    <div key={c.id} onClick={() => handleImportGlobalCharacter(c)} className="p-3 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300 flex items-center gap-2">
                                        <Avatar name={c.name} url={c.avatarUrl} size="sm" />
                                        {c.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                    {(currentScript.characters || []).map((char, idx) => (
                    <div key={char.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex gap-6 hover:shadow-xl transition-all">
                        <div className="flex flex-col items-center gap-3">
                            <Avatar name={char.name} url={char.avatarUrl} size="lg" />
                            {!char.isGlobal && <Button size="sm" variant="secondary" onClick={() => handleGenerateAvatar(char)} className="text-xs px-2 py-1 h-8">{t.genLook}</Button>}
                            {char.isGlobal && <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider border border-indigo-500/30 px-2 rounded-full">Linked</span>}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 block">{t.name}</label>
                            <input className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" disabled={!!char.isGlobal} value={char.name} onChange={e => { const chars = [...currentScript.characters]; chars[idx].name = e.target.value; updateScriptState({...currentScript, characters: chars}); }} />
                        </div>
                        <div className="col-span-1">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 block">{t.role}</label>
                            <input className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" value={char.role} onChange={e => { const chars = [...currentScript.characters]; chars[idx].role = e.target.value; updateScriptState({...currentScript, characters: chars}); }} />
                        </div>
                        <div className="col-span-2"><SmartTextarea label={t.personality} value={char.personality} onChange={e => { const chars = [...currentScript.characters]; chars[idx].personality = e.target.value; updateScriptState({...currentScript, characters: chars}); }} onAIRequest={async () => handleRefine(char.personality, 'Personality', v => { const chars = [...currentScript.characters]; chars[idx].personality = v; updateScriptState({...currentScript, characters: chars}); })} /></div>
                        
                        <div className="col-span-2 pt-2 border-t border-zinc-800 flex justify-between items-center">
                             <div className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-zinc-800 transition-colors" onClick={() => { const chars = [...currentScript.characters]; chars[idx].isUserControlled = !chars[idx].isUserControlled; updateScriptState({...currentScript, characters: chars}); }}>
                                <div className={`w-8 h-4 rounded-full transition-colors ${char.isUserControlled ? 'bg-indigo-600' : 'bg-zinc-600'}`}/> <span className="text-xs uppercase font-bold text-zinc-500">{t.playerControlled}</span>
                            </div>
                            <button onClick={() => { const chars = currentScript.characters.filter((_, i) => i !== idx); updateScriptState({...currentScript, characters: chars}); }} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  };

  const renderStage = () => {
    if (!currentScript) return null;
    const userCharacters = (currentScript.characters || []).filter(c => c.isUserControlled);
    const currentPlotIndex = currentScript.currentPlotIndex || 0;
    const totalPlots = Math.max(1, currentScript.plotPoints.length);
    const progress = ((currentPlotIndex + 1) / totalPlots) * 100;
    
    const customStyles = (
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-up {
            animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
    );

    return (
      <div className="h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black flex flex-col overflow-hidden relative">
        {customStyles}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        {isReconstructing && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
                <div className="relative">
                    <div className="absolute -inset-4 bg-indigo-500/30 rounded-full blur-xl animate-pulse"></div>
                    <Loader2 size={48} className="text-indigo-400 animate-spin relative z-10" />
                </div>
                <h3 className="text-white font-bold text-xl mt-6 tracking-widest uppercase">{t.reconstructing}</h3>
                <p className="text-zinc-500 text-sm mt-2">{t.commandQueued}</p>
            </div>
        )}

        {/* Header Overlay */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
             <div className="flex items-center gap-4">
                 <Button variant="ghost" icon={ChevronLeft} onClick={() => { setIsPlaying(false); setView('DASHBOARD'); }}>{t.exit}</Button>
                 <div>
                     <h2 className="text-white font-bold text-lg shadow-black drop-shadow-lg">{currentScript.title}</h2>
                     <p className="text-zinc-400 text-xs flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div> {isPlaying ? t.onAir : t.paused}</p>
                 </div>
             </div>
             <div className="flex gap-2">
                 <Button size="sm" variant="secondary" icon={SkipForward} onClick={handleNextChapter}>{t.skipChapter}</Button>
                 <Button size="sm" variant={isPlaying ? 'danger' : 'success'} icon={isPlaying ? Pause : Play} onClick={() => setIsPlaying(!isPlaying)}>
                     {isPlaying ? t.paused : t.resumeAuto}
                 </Button>
             </div>
        </div>

        {/* Scene Background */}
        <div className="absolute inset-0 bg-zinc-900">
             {(() => {
                 const lastImg = [...currentScript.history].reverse().find(m => m.imageUrl);
                 if (lastImg && lastImg.imageUrl) {
                     return <img src={lastImg.imageUrl} alt="Scene" className="w-full h-full object-cover opacity-50 transition-all duration-1000" />;
                 }
                 return <div className="w-full h-full flex items-center justify-center text-zinc-800 font-bold text-9xl select-none opacity-20">SCENE</div>
             })()}
             <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent"></div>
        </div>

        {/* Script Log */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-20 space-y-6 mask-image-linear-gradient">
             {currentScript.history.map((msg, idx) => {
                 const char = currentScript.characters.find(c => c.id === msg.characterId);
                 const isNarration = msg.type === 'narration' || msg.characterId === 'narrator';
                 const isUser = char?.isUserControlled;
                 
                 return (
                     <div key={msg.id} className={`flex flex-col max-w-4xl mx-auto animate-slide-up ${isNarration ? 'items-center text-center my-10' : (isUser ? 'items-end' : 'items-start')}`}>
                         {!isNarration && (
                             <div className={`flex items-center gap-2 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
                                 <span className="text-xs font-bold text-zinc-400">{char?.name}</span>
                             </div>
                         )}
                         
                         <div className={`
                             ${isNarration 
                               ? 'text-zinc-300 italic text-lg md:text-xl font-serif leading-relaxed max-w-2xl text-shadow-sm' 
                               : `p-4 rounded-2xl max-w-lg text-md shadow-lg backdrop-blur-sm border border-white/5 ${isUser ? 'bg-indigo-600/80 text-white rounded-tr-none' : 'bg-zinc-800/80 text-zinc-100 rounded-tl-none'}`}
                         `} style={{ borderColor: !isNarration && char ? getCharacterColor(char.id) + '40' : 'transparent' }}>
                             {msg.content}
                         </div>
                     </div>
                 );
             })}
             
             {turnProcessing && (
                 <div className="flex justify-center my-8 animate-pulse">
                     <span className="text-zinc-500 text-xs tracking-widest uppercase flex items-center gap-2">
                         <Sparkles size={12} /> Directing...
                     </span>
                 </div>
             )}
             <div ref={chatEndRef} className="h-20" />
        </div>

        {/* Controls */}
        <div className="relative z-20 p-6 bg-zinc-950/90 border-t border-zinc-800 backdrop-blur-xl">
             <div className="max-w-4xl mx-auto flex flex-col gap-4">
                 
                 {/* God Mode Input */}
                 <div className="flex gap-2 items-center">
                      <div className="bg-amber-500/10 text-amber-500 p-2 rounded-lg">
                          <Crown size={16} />
                      </div>
                      <input 
                         className="flex-1 bg-transparent border-none text-sm text-amber-200 placeholder-amber-500/30 focus:outline-none" 
                         placeholder={t.directorPlaceholder}
                         value={directorInput}
                         onChange={e => setDirectorInput(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && handleDirectorMessage()}
                      />
                      <button onClick={handleDirectorMessage} disabled={!directorInput} className="text-xs font-bold text-amber-500 hover:text-amber-400 disabled:opacity-50 uppercase tracking-wider">{t.inject}</button>
                 </div>

                 {/* User Roleplay Inputs (if any active characters) */}
                 {userCharacters.length > 0 && (
                     <div className="grid gap-2">
                         {userCharacters.map(char => (
                             <div key={char.id} className="flex gap-2">
                                 <div className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-indigo-500 overflow-hidden">
                                    <Avatar name={char.name} url={char.avatarUrl} size="sm" />
                                 </div>
                                 <div className="flex-1 flex gap-2">
                                     <input 
                                         className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 text-white focus:border-indigo-500 outline-none transition-all" 
                                         placeholder={`${t.speakingAs} ${char.name}...`}
                                         value={userInputs[char.id] || ''}
                                         onChange={e => setUserInputs({...userInputs, [char.id]: e.target.value})}
                                         onKeyDown={async (e) => {
                                             if (e.key === 'Enter' && userInputs[char.id]) {
                                                 const text = userInputs[char.id];
                                                 setUserInputs({...userInputs, [char.id]: ''});
                                                 const msg: Message = { id: crypto.randomUUID(), characterId: char.id, content: text, type: 'dialogue', timestamp: Date.now() };
                                                 handleUpdateScriptHistory(msg);
                                             }
                                         }}
                                     />
                                     <Button size="sm" icon={Send} onClick={() => {
                                          const text = userInputs[char.id];
                                          if (!text) return;
                                          setUserInputs({...userInputs, [char.id]: ''});
                                          const msg: Message = { id: crypto.randomUUID(), characterId: char.id, content: text, type: 'dialogue', timestamp: Date.now() };
                                          handleUpdateScriptHistory(msg);
                                     }} />
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end transition-opacity ${showSettings ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className={`w-full max-w-md bg-zinc-900 h-full shadow-2xl p-6 transform transition-transform duration-300 border-l border-zinc-800 ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-white">{t.settings}</h2>
                  <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white"><X /></button>
              </div>
              
              <div className="space-y-6">
                  <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">{t.provider}</label>
                      <div className="flex bg-zinc-800 p-1 rounded-lg">
                          <button onClick={() => setAppSettings({...appSettings, activeProvider: 'GEMINI'})} className={`flex-1 py-2 text-sm font-bold rounded ${appSettings.activeProvider !== 'OPENROUTER' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400'}`}>Gemini</button>
                          <button onClick={() => setAppSettings({...appSettings, activeProvider: 'OPENROUTER'})} className={`flex-1 py-2 text-sm font-bold rounded ${appSettings.activeProvider === 'OPENROUTER' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400'}`}>OpenRouter</button>
                      </div>
                  </div>

                  {appSettings.activeProvider === 'OPENROUTER' ? (
                      <>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">{t.openRouterKey}</label>
                            <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2 border border-zinc-700 focus-within:border-indigo-500">
                                <Key size={16} className="text-zinc-500" />
                                <input type="password" className="bg-transparent border-none text-white w-full focus:outline-none text-sm" value={appSettings.openRouterKey || ''} onChange={e => setAppSettings({...appSettings, openRouterKey: e.target.value})} placeholder="sk-or-..." />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">{t.openRouterModel}</label>
                            <input className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white text-sm focus:border-indigo-500 outline-none" value={appSettings.openRouterModel || ''} onChange={e => setAppSettings({...appSettings, openRouterModel: e.target.value})} placeholder="google/gemini-2.0-flash-lite-preview-02-05:free" />
                        </div>
                      </>
                  ) : (
                      <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">{t.geminiKey}</label>
                          <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2 border border-zinc-700 focus-within:border-indigo-500">
                              <Key size={16} className="text-zinc-500" />
                              <input type="password" className="bg-transparent border-none text-white w-full focus:outline-none text-sm" value={appSettings.apiKey || ''} onChange={e => setAppSettings({...appSettings, apiKey: e.target.value})} placeholder="AIza..." />
                          </div>
                          <p className="text-xs text-zinc-500 mt-2">{t.apiKeyHint}</p>
                      </div>
                  )}

                  <div className="pt-6 border-t border-zinc-800">
                       <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Language / 语言</label>
                       <div className="flex gap-2">
                           <button onClick={() => setLang('zh-CN')} className={`flex-1 py-2 border rounded-lg text-sm font-bold ${lang === 'zh-CN' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'border-zinc-700 text-zinc-400'}`}>中文</button>
                           <button onClick={() => setLang('en-US')} className={`flex-1 py-2 border rounded-lg text-sm font-bold ${lang === 'en-US' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'border-zinc-700 text-zinc-400'}`}>English</button>
                       </div>
                  </div>

                  <Button onClick={handleSaveSettings} className="w-full mt-4" variant="primary">{t.saveSettings}</Button>
              </div>
          </div>
      </div>
  );

  return (
    <>
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in ${notification.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-500' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'}`}>
          {notification.type === 'error' ? <AlertCircle size={20}/> : <Sparkles size={20}/>}
          <div>
            <h4 className="font-bold text-sm">{notification.title}</h4>
            <p className="text-xs opacity-80">{notification.msg}</p>
          </div>
        </div>
      )}

      {view === 'DASHBOARD' && renderDashboard()}
      {view === 'EDITOR' && renderEditor()}
      {view === 'STAGE' && renderStage()}
      {view === 'CHAT' && renderChatInterface()}
      
      {showCharModal && renderCharacterModal()}
      {renderSettings()}
    </>
  );
}