
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Play, Pause, Save, Settings, 
  Sparkles, MessageSquare, Edit3, Trash2, 
  ChevronRight, ChevronLeft, Image as ImageIcon,
  Users, Globe, Trophy, Share2, Download, Copy, Star, Mic, Send,
  Wand2, RefreshCw, LayoutDashboard, Film, BookOpen, Crown, Clapperboard,
  LogOut, User as UserIcon, Key, X, AlertCircle, Loader2, Shuffle,
  Cloud, Zap, SkipForward, Upload, Heart, Smile, BrainCircuit, Video,
  Filter, Atom
} from 'lucide-react';
import { Script, Character, Message, Language, Achievement, User, AppSettings, GlobalCharacter, ChatSession, ChatMessage } from './types';
import { 
    generateScriptBlueprint, generateNextBeat, generateAvatarImage, 
    refineText, generateSceneImage, regenerateFuturePlot, generateSingleCharacter,
    completeCharacterProfile, chatWithCharacter, evolveCharacterFromChat
} from './services/aiService';
import { authService } from './services/authService';

// --- Character Text Colors (Ethereal Soul Palette) ---
const CHAR_COLORS = [
    '#c084fc', // purple-400
    '#818cf8', // indigo-400
    '#22d3ee', // cyan-400
    '#fbbf24', // amber-400
    '#f472b6', // pink-400
    '#4ade80', // green-400
    '#f87171', // red-400
    '#a78bfa', // violet-400
    '#38bdf8', // sky-400
    '#fb923c', // orange-400
];

const getCharacterColor = (charId: string) => {
    if (charId === 'narrator') return '#fbbf24'; 
    let hash = 0;
    for (let i = 0; i < charId.length; i++) {
        hash = charId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % CHAR_COLORS.length;
    return CHAR_COLORS[index];
};

// --- Logo Component (Redesigned for Elegance) ---
const Logo = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center gap-4 ${className}`}>
        <div className="relative w-12 h-12">
            {/* Outer Ring */}
            <svg className="absolute inset-0 w-full h-full animate-[spin_8s_linear_infinite] opacity-30" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="url(#logo-grad)" strokeWidth="0.5" strokeDasharray="1 4" />
            </svg>
            {/* Middle Ring */}
            <svg className="absolute inset-0 w-full h-full animate-[spin_12s_linear_infinite_reverse] opacity-60" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="35" fill="none" stroke="url(#logo-grad)" strokeWidth="1" strokeDasharray="10 15" />
            </svg>
            {/* Center Soul Point */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_15px_#fff] animate-pulse"></div>
            </div>
            {/* Gradient Definitions */}
            <svg className="absolute w-0 h-0">
                <defs>
                    <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
        <div className="flex flex-col">
            <h1 className="text-2xl font-display font-black tracking-tight text-white leading-none">
                伊莫拉<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">星球</span>
            </h1>
            <span className="text-[9px] font-mono font-bold tracking-[0.4em] uppercase text-indigo-400/60 mt-1">Planet Imola</span>
        </div>
    </div>
);

// --- i18n Dictionary ---
const TRANSLATIONS = {
  'zh-CN': {
    title: "伊莫拉星球",
    subtitle: "灵魂回响枢纽",
    heroTitle: "唤醒亿万灵魂的余温",
    heroSubtitle: "在平行宇宙的伊莫拉，人类从诞生起的所有灵魂皆沉睡于此。你是引导者，负责建立灵魂链接，让文明的记忆在现实中重燃回响。",
    dashboard: "回响大厅",
    myScripts: "命运织卷",
    templates: "记忆模版",
    characters: "灵魂矩阵",
    community: "众生星域",
    achievements: "灵格晋升",
    settings: "系统同步",
    startNew: "建立链接",
    dreaming: "正在编织灵魂轨迹...",
    create: "开启链接",
    placeholder: "输入灵魂契约，例如：一位流浪诗人与古老文明的最后对话...",
    noScripts: "尚未建立灵魂链接。在上方输入契约，开启一段跨越时空的记忆。",
    setup: "第一章：时空锚定",
    castSetup: "第二章：灵魂链接",
    startShow: "链接生效",
    premise: "因缘梗概",
    plotPoints: "因果节点",
    endings: "命运终局",
    cast: "灵魂图谱",
    addActor: "建立链接",
    aiAddActor: "AI 探寻灵魂",
    importActor: "从矩阵导入",
    genLook: "凝练形体",
    playerControlled: "意识降临",
    observerMode: "静默观测",
    resumeAuto: "恢复时空流转",
    speakingAs: "正在联接",
    whatSay: "传递意识指令...",
    onAir: "同步中",
    paused: "静止",
    exit: "切断联接",
    liveStage: "时空回响",
    useTemplate: "映射模版",
    createTemplate: "封存记忆",
    publish: "归于星域",
    author: "引导者",
    downloads: "映射数",
    likes: "共鸣数",
    unlocked: "灵格突破！",
    templateMode: "模版编辑",
    next: "溯流而下",
    back: "溯流而上",
    name: "真名",
    gender: "属性",
    age: "纪元",
    role: "宿命/职能",
    personality: "灵魂特质",
    speakingStyle: "语素风格",
    visual: "形体显现 (可选)",
    yourCue: "意识降临时间",
    directorNote: "系统提示：请遵循灵魂特质引导叙事",
    aiComplete: "AI 灵性刻画",
    directorMode: "造物主指令",
    directorPlaceholder: "输入神谕，例如：'极夜降临' (灵魂轨迹将重组)",
    inject: "降下神谕",
    saving: "已锚定",
    continue: "继续",
    quickStart: "快速链接",
    loginTitle: "伊莫拉星球",
    loginSubtitle: "引导者，请输入您的身份验证码",
    loginBtn: "启动同步",
    regBtn: "初次锚定",
    welcome: "欢迎归来，引导者",
    apiKeyHint: "伊莫拉核心 Key 已启用。可配置私人同步密钥。",
    saveSettings: "确认同步",
    close: "关闭",
    noKey: "未检测到核心密钥。请在右上角配置。",
    commandQueued: "神谕已下达，时空因果重组中...",
    reconstructing: "因果律重构中...",
    regenerate: "AI 重塑",
    provider: "灵性算力来源",
    openRouterKey: "OpenRouter 密钥",
    openRouterModel: "模型 ID (建议使用 2.0-flash)",
    geminiKey: "Gemini 密钥 (推荐)",
    autoAvatarGen: "正在凝聚灵魂化身...",
    skipChapter: "下个纪元",
    chapter: "纪元",
    chapterGoal: "纪元目标",
    createCharacter: "灵魂链接",
    editCharacter: "调整灵格",
    uploadAvatar: "上传形体",
    genAvatar: "凝聚化身",
    aiFill: "✨ 灵性补完",
    chatWith: "开启共鸣",
    selectCharacters: "选择降临目标（可选）",
    memories: "永恒记忆",
    memoriesHint: "伊莫拉星球会自动提炼对话中的真理，优化灵魂特质。",
    savingMemories: "正在沉淀记忆并进化灵格...",
    memorySaved: "灵格已升华！记忆已存证。",
    enterNameHint: "输入灵魂真名（如：苏格拉底，阿童木）",
    autoFillLoading: "正在从星尘中提取特质...",
    filter: "维度筛选",
    filterAll: "全部灵魂",
    filterMale: "阳性特质",
    filterFemale: "阴性特质",
  },
  'en-US': {
    title: "Planet Imola",
    subtitle: "Soul Echo Hub",
    heroTitle: "Awaken the Echoes of Billions",
    heroSubtitle: "On Planet Imola, every soul since the dawn of humanity sleeps. As a Guide, establish soul links and let the memories of civilization ignite once more.",
    dashboard: "Echo Hall",
    myScripts: "Destiny Scrolls",
    templates: "Memory Cores",
    characters: "Soul Matrix",
    community: "Stellar Domain",
    achievements: "Spiritual Ascension",
    settings: "System Sync",
    startNew: "Establish Link",
    dreaming: "Weaving soul threads...",
    create: "Activate Link",
    placeholder: "Enter soul contract, e.g. The last conversation between a wanderer and an ancient ghost...",
    noScripts: "No soul links established. Enter a contract above to start a journey through time.",
    setup: "Chapter 1: Anchoring",
    castSetup: "Chapter 2: Soul Link",
    startShow: "Link Active",
    premise: "Karmic Premise",
    plotPoints: "Nodes of Fate",
    endings: "Ultimate End",
    cast: "Soul Map",
    addActor: "Link Soul",
    aiAddActor: "AI Search",
    importActor: "Import from Matrix",
    genLook: "Condense Form",
    playerControlled: "Consciousness Descent",
    observerMode: "Silent Observer",
    resumeAuto: "Resume Timeline",
    speakingAs: "Linking as",
    whatSay: "Send consciousness command...",
    onAir: "SYNCING",
    paused: "STASIS",
    exit: "Cut Link",
    liveStage: "Time Echoes",
    useTemplate: "Map Template",
    createTemplate: "Seal Memory",
    publish: "Return to Domain",
    author: "Guide",
    downloads: "Mappings",
    likes: "Resonances",
    unlocked: "Ascension Unlocked!",
    templateMode: "Core Editor",
    next: "Flow Downstream",
    back: "Flow Upstream",
    name: "True Name",
    gender: "Aspect",
    age: "Era",
    role: "Destiny",
    personality: "Soul Traits",
    speakingStyle: "Linguistic Pattern",
    visual: "Physical Manifestation",
    yourCue: "Your Turn",
    directorNote: "System: Follow the soul traits to guide the narrative",
    aiComplete: "AI Spiritual Crafting",
    directorMode: "Oracle Mode",
    directorPlaceholder: "Enter Oracle, e.g., 'The stars fall'",
    inject: "Deliver Oracle",
    saving: "Anchored",
    continue: "Continue",
    quickStart: "Quick Link",
    loginTitle: "Planet Imola",
    loginSubtitle: "Guide, please verify your identity code",
    loginBtn: "Sync Link",
    regBtn: "Initial Anchor",
    welcome: "Welcome back, Guide",
    apiKeyHint: "Imola Core Key active. Private sync keys can be configured.",
    saveSettings: "Confirm Sync",
    close: "Close",
    noKey: "No Core Key found.",
    commandQueued: "Oracle delivered, restructuring causality...",
    reconstructing: "Restructuring...",
    regenerate: "AI Remake",
    provider: "Spiritual Compute Source",
    openRouterKey: "OpenRouter Key",
    openRouterModel: "Model ID",
    geminiKey: "Gemini Key (Optional)",
    autoAvatarGen: "Condensing avatar...",
    skipChapter: "Next Era",
    chapter: "Era",
    chapterGoal: "Goal",
    createCharacter: "Soul Link",
    editCharacter: "Adjust Aspect",
    uploadAvatar: "Upload Form",
    genAvatar: "Condense Form",
    aiFill: "✨ Spiritual Completion",
    chatWith: "Echo Resonance",
    selectCharacters: "Select Descent Targets",
    memories: "Eternal Memories",
    memoriesHint: "Imola extracts truths from chats to optimize the soul.",
    savingMemories: "Sedimenting memories...",
    memorySaved: "Ascension Complete!",
    enterNameHint: "Enter true name (e.g. Socrates)",
    autoFillLoading: "Extracting from stardust...",
    filter: "Dimension Filter",
    filterAll: "All Souls",
    filterMale: "Positive Aspect",
    filterFemale: "Negative Aspect",
  }
};

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: '1', title: '初次联接', description: '开启第1段灵魂契约', icon: '✨', conditionType: 'SCRIPT_COUNT', threshold: 1, unlocked: false },
  { id: '2', title: '时空行者', description: '建立5段因果链接', icon: '🌌', conditionType: 'SCRIPT_COUNT', threshold: 5, unlocked: false },
  { id: '3', title: '星辰耳语', description: '传递20条意识指令', icon: '💫', conditionType: 'MESSAGE_COUNT', threshold: 20, unlocked: false },
  { id: '4', title: '灵魂附身', description: '亲自接管灵魂意识', icon: '🎭', conditionType: 'CHAR_CONTROL', threshold: 1, unlocked: false },
  { id: '5', title: '造梦工程师', description: '凝练一个记忆核心', icon: '⚙️', conditionType: 'TEMPLATE_CREATE', threshold: 1, unlocked: false },
];

// --- Components ---

const Button = ({ 
  children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, size = 'md' 
}: { 
  children?: React.ReactNode, onClick?: () => void, variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success', 
  className?: string, disabled?: boolean, icon?: any, size?: 'sm' | 'md' | 'lg' 
}) => {
  const sizeClasses = { sm: "px-4 py-2 text-xs", md: "px-6 py-3 text-sm", lg: "px-10 py-5 text-base" };
  const base = "flex items-center justify-center gap-2.5 rounded-2xl font-display font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider";
  const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] border border-white/10",
    secondary: "bg-zinc-900/80 backdrop-blur-md hover:bg-zinc-800 text-zinc-100 border border-zinc-700/50 hover:border-indigo-500/50 shadow-lg",
    ghost: "bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white",
    danger: "bg-red-950/30 hover:bg-red-950/50 text-red-500 border border-red-500/20",
    success: "bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-400 border border-emerald-500/20"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizeClasses[size]} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 18} />}
      {children}
    </button>
  );
};

const Avatar = ({ url, name, size = 'md' }: { url?: string, name: string, size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' }) => {
  const sizeClasses = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-24 h-24", xl: "w-48 h-48", '2xl': "w-64 h-64" };
  const borderClasses = { sm: "border", md: "border-2", lg: "border-[3px]", xl: "border-[4px]", '2xl': "border-[6px]" };
  
  const common = `${sizeClasses[size]} ${borderClasses[size]} rounded-3xl overflow-hidden flex-shrink-0 transition-transform duration-500`;
  
  if (url) return (
      <div className={`${common} border-white/10 soul-glow group-hover:scale-105`}>
          <img src={url} alt={name} className="w-full h-full object-cover" />
      </div>
  );
  
  return (
    <div className={`${common} bg-gradient-to-br from-zinc-800 to-black border-white/5 flex items-center justify-center text-zinc-500 font-display font-black group-hover:scale-105`}>
      {name ? name.substring(0, 1).toUpperCase() : '?'}
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
    <div className="flex flex-col gap-3 group">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-mono font-bold text-indigo-400/60 uppercase tracking-[0.3em]">{label}</label>
        <button onClick={handleAI} disabled={loading} className="text-[9px] flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-all font-mono font-bold uppercase tracking-wider bg-indigo-500/5 px-2.5 py-1 rounded-lg border border-indigo-500/10 hover:border-indigo-500/30">
          {loading ? <RefreshCw size={10} className="animate-spin" /> : <Wand2 size={10} />}
          {loading ? "Aligning..." : "Resonate"}
        </button>
      </div>
      <textarea 
        className="w-full bg-zinc-950/50 backdrop-blur-sm border border-white/5 rounded-2xl p-4 text-sm text-zinc-200 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 outline-none resize-none transition-all placeholder-zinc-800 leading-relaxed font-sans" 
        rows={rows} 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder}
      />
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
  const [dashboardTab, setDashboardTab] = useState<'SCRIPTS' | 'TEMPLATES' | 'CHARACTERS' | 'ACHIEVEMENTS'>('SCRIPTS');
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
  const [sessionUpdated, setSessionUpdated] = useState(false);

  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  
  // --- Stage/Director State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [turnProcessing, setTurnProcessing] = useState(false);
  const [userInputs, setUserInputs] = useState<{[key: string]: string}>({});
  const [directorInput, setDirectorInput] = useState('');
  const [isReconstructing, setIsReconstructing] = useState(false);
  
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

  // --- Game Loop (Planet Imola Style) ---
  useEffect(() => {
    if (!currentScript || view !== 'STAGE') return;
    if (!isPlaying && !turnProcessing && !isReconstructing) return;
    if (turnProcessing || isReconstructing || !isPlaying) return;

    const gameLoop = async () => {
      setTurnProcessing(true);
      try {
        let forcedCommand = null;
        if (directorQueueRef.current.length > 0) {
            forcedCommand = directorQueueRef.current.shift() || null;
            if (forcedCommand) {
                setIsPlaying(false);
                setIsReconstructing(true);
                const newPlot = await regenerateFuturePlot(currentScript, forcedCommand, appSettings);
                updateScriptState({ ...currentScript, plotPoints: newPlot });
                const dirMsg: Message = {
                    id: crypto.randomUUID(), characterId: 'narrator', content: `[因果重联]: ${forcedCommand}`, type: 'narration', timestamp: Date.now()
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

        const nextBeat = await generateNextBeat(currentScript, forcedCommand, targetPlot, lang, appSettings);
        const newMessage: Message = {
          id: crypto.randomUUID(), characterId: nextBeat.characterId,
          content: nextBeat.content, type: nextBeat.type, timestamp: Date.now()
        };
        handleUpdateScriptHistory(newMessage);

        if (nextBeat.type === 'narration') {
            generateSceneImage(nextBeat.content, currentScript.title, appSettings).then(url => {
                 setScripts(prev => prev.map(s => {
                     if (s.id === currentScript.id) {
                         const updatedHistory = s.history.map(m => m.id === newMessage.id ? { ...m, imageUrl: url } : m);
                         const updatedScript = { ...s, history: updatedHistory };
                         if (currentScript.id === s.id) setCurrentScript(updatedScript);
                         return updatedScript;
                     }
                     return s;
                 }));
            }).catch(() => {});
        }
      } catch (e: any) {
        console.error("Link processing error", e);
        setIsPlaying(false);
        showNotification("Causality Error", "Soul link unstable, retrying connection...", 'error');
      } finally {
        setTurnProcessing(false);
      }
    };
    
    const timer = setTimeout(gameLoop, 800);
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
      showNotification("Identity Error", e.message, 'error');
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
    showNotification("Sync Success", t.saving);
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
          personality: editingChar.personality || "Neutral Soul",
          speakingStyle: editingChar.speakingStyle || "Normal Speak",
          visualDescription: editingChar.visualDescription || "A soul in transit",
          avatarUrl: editingChar.avatarUrl,
          createdAt: Date.now(),
          memories: editingChar.memories || []
      };

      const exists = globalCharacters.find(c => c.id === newChar.id);
      if (exists) {
          setGlobalCharacters(prev => prev.map(c => c.id === newChar.id ? newChar : c));
      } else {
          setGlobalCharacters(prev => [...prev, newChar]);
      }
      
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
          showNotification("Imola Sync", "Enter a true name to find the soul.", "error");
          return;
      }
      setIsCharAutoFilling(true);
      try {
          const filled = await completeCharacterProfile(editingChar, appSettings);
          setEditingChar(prev => ({ ...prev, ...filled }));
      } catch (e: any) {
          showNotification("Extraction Error", "Failed to retrieve soul pattern.", 'error');
      } finally {
          setIsCharAutoFilling(false);
      }
  };

  const handleCharacterAvatarGen = async () => {
      if (!editingChar || !editingChar.visualDescription) return;
      setIsAvatarGenerating(true);
      try {
          const tempChar: any = { ...editingChar };
          const url = await generateAvatarImage(tempChar, appSettings);
          setEditingChar(prev => ({...prev, avatarUrl: url}));
      } catch (e) {
          showNotification("Error", "Avatar condensation failed", 'error');
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

      if (sessionUpdated && activeChatSession.messages.length > 2) {
          const char = globalCharacters.find(c => c.id === activeChatSession.characterId);
          if (char) {
              showNotification("Soul Evolution", "Refining soul essence from interaction...", 'success');
              try {
                  const evolution = await evolveCharacterFromChat(char, activeChatSession.messages, appSettings);
                  const updatedChar: GlobalCharacter = {
                      ...char,
                      personality: evolution.newPersonality,
                      speakingStyle: evolution.newSpeakingStyle,
                      memories: evolution.memory ? [...(char.memories || []), evolution.memory] : char.memories
                  };
                  setGlobalCharacters(prev => prev.map(c => c.id === updatedChar.id ? updatedChar : c));
                  showNotification("Ascension", "Soul evolved successfully.", 'success');
              } catch (e) {
                  console.error("Evolution failed", e);
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
          showNotification("Sync Failed", "Soul link interrupted.", 'error');
      } finally {
          setIsChatting(false);
      }
  };

  // --- Script Gen Logic ---

  const handleCreateScript = async () => {
    if (!currentUser) return;
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    setShowCastSelector(false); 
    
    try {
      const cast = globalCharacters.filter(c => selectedCastIds.includes(c.id));
      const blueprint = await generateScriptBlueprint(promptInput, cast, lang, appSettings);
      
      const newScript: Script = {
        id: crypto.randomUUID(),
        ownerId: currentUser.id,
        title: blueprint.title || "Untitled Fate",
        premise: blueprint.premise || "",
        setting: blueprint.setting || "",
        plotPoints: blueprint.plotPoints || [],
        possibleEndings: blueprint.possibleEndings || [],
        characters: blueprint.characters || [],
        history: [{
          id: crypto.randomUUID(), characterId: 'narrator', type: 'narration',
          content: lang === 'zh-CN' 
            ? `灵魂降临于${blueprint.setting}。因缘由${blueprint.premise}开启。` 
            : `Soul descends in ${blueprint.setting}. Fate begins with ${blueprint.premise}`,
          timestamp: Date.now()
        }],
        currentPlotIndex: 0,
        lastUpdated: Date.now(),
        isTemplate: false
      };
      setScripts(prev => [newScript, ...prev]);
      setCurrentScript(newScript);
      setView('STAGE');
      setIsPlaying(true); // Auto-play when starting
      setEditorStep(1);
      setPromptInput('');
      setSelectedCastIds([]);
      
      newScript.characters.forEach(c => {
          if (!c.isGlobal) handleGenerateAvatar(c, newScript.id);
      });

    } catch (e: any) {
      showNotification("Warp Error", "Failed to bridge dimensions. Check connectivity.", "error");
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
    } catch (e: any) { }
  };

  const handleAiAddCharacter = async () => {
      if (!currentScript) return;
      try {
          const newChar = await generateSingleCharacter(currentScript, appSettings);
          handleGenerateAvatar(newChar, currentScript.id);
          updateScriptState({...currentScript, characters: [...currentScript.characters, newChar]});
      } catch (e) {
          showNotification("Error", "Failed to search for soul.", "error");
      }
  };
  
  const handleImportGlobalCharacter = (globalChar: GlobalCharacter) => {
      if (!currentScript) return;
      const newChar: Character = {
          id: crypto.randomUUID(),
          name: globalChar.name,
          role: "Destined Extra", 
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
    } catch (e) { console.error("Refinement failed", e); }
  };

  const handleRefinePlotPoint = async (index: number) => {
      if (!currentScript) return;
      const point = currentScript.plotPoints[index];
      await handleRefine(point, `Node ${index+1}`, (newText) => {
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
      <div className="h-screen w-full bg-[#020205] flex flex-col items-center justify-center relative overflow-hidden font-sans">
        {/* Deep Space Atmosphere */}
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(79,70,229,0.15)_0%,_transparent_60%)]"></div>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[150px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full animate-pulse delay-700"></div>
        </div>

        <div className="z-10 w-full max-w-md p-10 flex flex-col items-center animate-fade-in">
           <Logo className="mb-16 scale-125" />
           
           <div className="w-full bg-zinc-900/30 backdrop-blur-3xl p-8 rounded-[40px] border border-white/5 shadow-2xl">
              <div className="text-center mb-10">
                 <h2 className="text-xl font-display font-black text-white mb-2">{t.loginTitle}</h2>
                 <p className="text-zinc-500 text-xs font-mono font-bold uppercase tracking-widest">{t.loginSubtitle}</p>
              </div>

              <div className="flex bg-black/40 p-1.5 rounded-2xl mb-10 border border-white/5">
                <button className={`flex-1 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all ${authMode === 'LOGIN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setAuthMode('LOGIN')}>{t.loginBtn}</button>
                <button className={`flex-1 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all ${authMode === 'REGISTER' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`} onClick={() => setAuthMode('REGISTER')}>{t.regBtn}</button>
              </div>
              
              <div className="space-y-6">
                <div className="relative group">
                  <UserIcon size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                  <input className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder-zinc-700 font-medium" 
                      value={authInput} onChange={e => setAuthInput(e.target.value)} placeholder="Guide Identity Hash" 
                      onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <Button onClick={handleLogin} className="w-full py-5" variant="primary">
                  {authMode === 'LOGIN' ? t.loginBtn : t.regBtn}
                </Button>
              </div>
           </div>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="h-screen bg-[#020205] flex flex-col items-center relative overflow-hidden font-sans">
      {/* Background Orbits */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[10%] left-[10%] w-[800px] h-[800px] border border-white/[0.03] rounded-full animate-[spin_60s_linear_infinite]" />
        <div className="absolute bottom-[5%] right-[5%] w-[600px] h-[600px] border border-white/[0.03] rounded-full animate-[spin_40s_linear_infinite_reverse]" />
      </div>

      <div className="flex-1 w-full overflow-y-auto flex flex-col items-center z-10 no-scrollbar">
          <header className="w-full max-w-7xl px-10 py-10 flex justify-between items-center flex-shrink-0 animate-fade-in">
            <Logo />
            <div className="flex items-center gap-6">
              <button onClick={() => setShowSettings(true)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all">
                <Settings size={20} />
              </button>
              <div className="flex items-center gap-3.5 pl-2 pr-5 py-2 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-xl group">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-display font-black text-xs text-white shadow-lg group-hover:scale-110 transition-transform">{currentUser.username.substring(0,1).toUpperCase()}</div>
                <span className="text-xs font-display font-bold text-zinc-300">{currentUser.username}</span>
              </div>
              <button onClick={handleLogout} className="text-zinc-600 hover:text-red-400 transition-colors p-2">
                <LogOut size={20} />
              </button>
            </div>
          </header>

          {dashboardTab === 'SCRIPTS' && (
          <section className="w-full max-w-5xl px-10 pt-16 pb-20 text-center flex flex-col items-center animate-fade-in">
            <h2 className="text-5xl md:text-7xl font-display font-black text-white mb-8 leading-tight tracking-tight drop-shadow-2xl">
                {t.heroTitle}
            </h2>
            <p className="text-lg text-zinc-400 mb-14 max-w-3xl leading-relaxed font-sans opacity-80">
                {t.heroSubtitle}
            </p>
            
            <div className="w-full max-w-3xl relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[32px] blur-xl opacity-20"></div>
              <div className="relative flex flex-col bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[30px] shadow-2xl overflow-hidden p-2">
                <div className="flex items-center p-2">
                    <input type="text" value={promptInput} onChange={(e) => setPromptInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateScript()} placeholder={t.placeholder} className="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder-zinc-700 px-6 font-medium" />
                    <Button onClick={handleCreateScript} disabled={isGenerating || !promptInput} size="md" className="h-14 px-10 font-display font-black">
                        {isGenerating ? <Loader2 className="animate-spin" /> : t.create}
                    </Button>
                </div>
                <div className="px-6 pb-3 flex justify-start">
                    <button onClick={() => setShowCastSelector(!showCastSelector)} className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-indigo-400/60 flex items-center gap-2.5 hover:text-indigo-300 transition-colors">
                        <BrainCircuit size={12} className={showCastSelector ? 'animate-pulse' : ''} /> {t.selectCharacters} {selectedCastIds.length > 0 && `(${selectedCastIds.length})`}
                    </button>
                </div>
                {showCastSelector && (
                    <div className="bg-black/30 border-t border-white/5 m-2 p-6 grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-in max-h-60 overflow-y-auto no-scrollbar rounded-2xl">
                        {globalCharacters.map(c => (
                            <div key={c.id} onClick={() => {
                                if(selectedCastIds.includes(c.id)) setSelectedCastIds(prev => prev.filter(id => id !== c.id));
                                else setSelectedCastIds(prev => [...prev, c.id]);
                            }} className={`flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer border-2 transition-all duration-300 ${selectedCastIds.includes(c.id) ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg' : 'bg-white/5 border-transparent hover:border-white/10'}`}>
                                <Avatar name={c.name} url={c.avatarUrl} size="sm" />
                                <span className="text-xs font-bold text-zinc-300 truncate">{c.name}</span>
                            </div>
                        ))}
                        {globalCharacters.length === 0 && <span className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-widest col-span-full py-4 opacity-50 text-center italic">No souls found in matrix. Summon them first.</span>}
                    </div>
                )}
              </div>
            </div>
          </section>
          )}

          <main className="w-full max-w-7xl px-10 pb-32 flex-1">
            <div className="flex justify-center mb-16">
              <div className="flex bg-zinc-900/30 backdrop-blur-3xl p-2 rounded-3xl border border-white/5 shadow-2xl">
                {[ 
                    { id: 'SCRIPTS', label: t.myScripts, icon: Film },
                    { id: 'CHARACTERS', label: t.characters, icon: Users }, 
                    { id: 'TEMPLATES', label: t.templates, icon: BookOpen }, 
                    { id: 'ACHIEVEMENTS', label: t.achievements, icon: Trophy } 
                ].map(tab => (
                  <button key={tab.id} onClick={() => setDashboardTab(tab.id as any)} className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl transition-all duration-300 text-xs font-display font-black uppercase tracking-widest ${dashboardTab === tab.id ? 'bg-white/10 text-white shadow-xl scale-105' : 'text-zinc-500 hover:text-indigo-400'}`}>
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="animate-fade-in">
              {dashboardTab === 'SCRIPTS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {(scripts || []).filter(s => !s.isTemplate).map(script => (
                    <div key={script.id} onClick={() => { setCurrentScript(script); setView('STAGE'); }} className="group relative cursor-pointer bg-zinc-900/30 backdrop-blur-2xl border border-white/5 rounded-[40px] overflow-hidden hover:scale-[1.02] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)] hover:border-indigo-500/30 transition-all duration-500 flex flex-col min-h-[360px]">
                      <div className="p-10 flex flex-col h-full">
                        <div className="mb-6 flex justify-between items-start">
                            <span className="text-[9px] font-mono font-black text-indigo-400/80 uppercase tracking-[0.3em] bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">Karmic Scroll</span>
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                <ChevronRight size={18} />
                            </div>
                        </div>
                        <h3 className="font-display font-black text-2xl text-white mb-4 line-clamp-2 leading-tight tracking-tight">{script.title}</h3>
                        <p className="text-zinc-500 text-sm line-clamp-3 leading-relaxed mb-auto italic opacity-70">"{script.premise}"</p>
                        <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
                          <div className="flex -space-x-3">
                            {(script.characters || []).slice(0, 4).map(c => <div key={c.id} className="relative ring-4 ring-[#0a0a0f] rounded-2xl"><Avatar name={c.name} url={c.avatarUrl} size="sm" /></div>)}
                            {(script.characters || []).length > 4 && <div className="w-8 h-8 rounded-2xl bg-zinc-800 border-2 border-white/5 flex items-center justify-center text-[8px] font-bold text-zinc-500">+{(script.characters || []).length - 4}</div>}
                          </div>
                          <span className="text-[10px] font-mono font-bold text-zinc-700 uppercase tracking-widest">{new Date(script.lastUpdated).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {scripts.length === 0 && (
                      <div className="col-span-full py-20 flex flex-col items-center opacity-30 animate-pulse">
                          <div className="w-20 h-20 border border-white/5 rounded-full flex items-center justify-center mb-8">
                             <Film size={32} className="text-zinc-600" />
                          </div>
                          <p className="text-zinc-600 font-mono font-bold uppercase tracking-[0.4em]">No causality linked yet</p>
                      </div>
                  )}
                </div>
              )}
              {dashboardTab === 'CHARACTERS' && (
                  <div className="animate-fade-in">
                      <div className="flex flex-col md:flex-row justify-between items-center mb-14 gap-8">
                          <div>
                             <h2 className="text-3xl font-display font-black text-white tracking-tight mb-2">灵魂矩阵</h2>
                             <p className="text-[10px] font-mono font-bold text-indigo-400/60 uppercase tracking-[0.4em]">The Collective Unconscious Matrix</p>
                          </div>
                          <div className="flex items-center gap-4 bg-white/5 rounded-3xl p-1.5 border border-white/10 backdrop-blur-xl">
                              <div className="pl-4 pr-1 text-zinc-500"><Filter size={16} /></div>
                              <select 
                                value={characterFilter} 
                                onChange={(e) => setCharacterFilter(e.target.value)}
                                className="bg-transparent text-[11px] font-display font-black text-zinc-400 focus:outline-none py-2.5 pr-6 cursor-pointer appearance-none uppercase tracking-widest"
                              >
                                <option value="ALL">{t.filterAll}</option>
                                <option value="MALE">{t.filterMale}</option>
                                <option value="FEMALE">{t.filterFemale}</option>
                              </select>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                          {/* Summon New Soul Card */}
                          <div onClick={openNewCharacterModal} className="group cursor-pointer bg-gradient-to-br from-indigo-950/20 to-black border-2 border-indigo-500/20 border-dashed rounded-[40px] flex flex-col items-center justify-center p-12 hover:bg-indigo-900/20 hover:border-indigo-500/50 transition-all duration-500 min-h-[420px]">
                              <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all shadow-[0_0_30px_rgba(79,70,229,0.2)]">
                                  <Plus size={40} className="text-indigo-400" />
                              </div>
                              <h3 className="text-xl font-display font-black text-white group-hover:text-indigo-300 uppercase tracking-tight">{t.createCharacter}</h3>
                              <p className="text-zinc-600 text-[10px] mt-4 text-center font-mono font-bold tracking-[0.2em] opacity-60 uppercase text-glow">Link an essence from stardust</p>
                          </div>

                          {globalCharacters.filter(c => {
                                if (characterFilter === 'ALL') return true;
                                if (characterFilter === 'MALE') return c.gender === '男' || c.gender?.toLowerCase() === 'male';
                                if (characterFilter === 'FEMALE') return c.gender === '女' || c.gender?.toLowerCase() === 'female';
                                return true;
                          }).map(char => (
                              <div key={char.id} className="group bg-zinc-900/30 backdrop-blur-2xl border border-white/5 rounded-[40px] p-10 hover:border-indigo-500/30 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] transition-all duration-500 flex flex-col relative min-h-[440px]">
                                  <div className="flex justify-center -mt-20 mb-8">
                                      <div className="relative group">
                                          <div className="absolute inset-0 bg-indigo-500/20 rounded-[48px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                          <Avatar name={char.name} url={char.avatarUrl} size="xl" />
                                      </div>
                                  </div>
                                  <div className="text-center flex-1">
                                      <h3 className="font-display font-black text-white text-2xl mb-2 tracking-tight">{char.name}</h3>
                                      <div className="flex justify-center gap-3 mb-8">
                                          <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-mono font-black text-indigo-400 border border-white/10 tracking-widest uppercase">{char.gender}</span>
                                          <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-mono font-bold text-zinc-600 border border-white/10 tracking-widest uppercase">{char.age}</span>
                                      </div>
                                      <p className="text-sm text-zinc-500 line-clamp-4 italic leading-relaxed opacity-70 font-medium">"{char.personality}"</p>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 mt-10">
                                      <Button size="sm" variant="secondary" className="rounded-2xl py-3.5 text-[10px]" onClick={() => handleEditCharacter(char)} icon={Edit3}>Edit</Button>
                                      <Button size="sm" variant="primary" className="rounded-2xl py-3.5 text-[10px]" onClick={() => handleOpenChat(char)} icon={MessageSquare}>Resonate</Button>
                                  </div>
                                  <button className="absolute top-8 right-8 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2" onClick={(e) => { e.stopPropagation(); setGlobalCharacters(p => p.filter(c => c.id !== char.id)); }}>
                                    <Trash2 size={16}/>
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              {dashboardTab === 'TEMPLATES' && (
                  <div className="py-40 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[48px] opacity-20 animate-pulse">
                      <BookOpen size={48} className="text-zinc-600 mb-8" />
                      <p className="text-zinc-600 font-mono font-bold uppercase tracking-[0.4em]">Archival cores empty</p>
                  </div>
              )}
              {dashboardTab === 'ACHIEVEMENTS' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                  {(achievements || []).map(ach => (
                    <div key={ach.id} className={`p-10 rounded-[40px] border flex flex-col items-center text-center transition-all duration-700 relative overflow-hidden group ${ach.unlocked ? 'bg-gradient-to-br from-indigo-950 to-zinc-950 border-indigo-500/30 scale-105 shadow-2xl' : 'bg-zinc-900/20 border-white/5 opacity-40 grayscale hover:grayscale-0'}`}>
                      <div className={`text-6xl mb-8 transform transition-transform group-hover:scale-110 duration-500 ${ach.unlocked ? 'drop-shadow-[0_0_25px_rgba(129,140,248,0.5)]' : ''}`}>{ach.icon}</div>
                      <h3 className={`font-display font-black text-lg mb-3 tracking-tight ${ach.unlocked ? 'text-white' : 'text-zinc-700'}`}>{ach.title}</h3>
                      <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider leading-relaxed">{ach.description}</p>
                      {ach.unlocked && <div className="mt-6 px-4 py-1.5 bg-indigo-500/10 rounded-full text-[9px] font-mono font-black text-indigo-400 tracking-[0.2em] uppercase border border-indigo-500/20">Ascended</div>}
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6 animate-fade-in overflow-y-auto">
          <div className="bg-zinc-900/60 border border-white/10 rounded-[48px] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[90vh] my-auto">
              {/* Header */}
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-3xl">
                  <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-500/20">
                          <Atom size={28} className="text-indigo-400 animate-[spin_5s_linear_infinite]" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-display font-black text-white tracking-tight">
                              {editingChar?.id && globalCharacters.find(c => c.id === editingChar.id) ? t.editCharacter : t.createCharacter}
                          </h2>
                          <p className="text-[10px] font-mono font-bold text-indigo-400/60 uppercase tracking-[0.4em] mt-1">Imola Soul Resonator</p>
                      </div>
                  </div>
                  <button onClick={() => setShowCharModal(false)} className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-2xl transition-all text-zinc-500 hover:text-white border border-transparent hover:border-white/10"><X /></button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                  {/* Left Column: Visuals */}
                  <div className="w-full md:w-2/5 bg-black/40 p-12 flex flex-col items-center border-r border-white/5 overflow-y-auto no-scrollbar">
                      <div className="relative group mb-12">
                          <div className="absolute inset-0 bg-indigo-500/20 rounded-[56px] blur-[60px] opacity-40 animate-pulse"></div>
                          <Avatar name={editingChar?.name || "?"} url={editingChar?.avatarUrl} size="2xl" />
                          <div className="absolute inset-0 bg-black/70 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-5 backdrop-blur-md">
                              <label className="cursor-pointer bg-white text-black px-8 py-3 rounded-2xl text-[10px] font-mono font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform flex items-center gap-2.5">
                                  <Upload size={14}/> {t.uploadAvatar}
                                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                              </label>
                              <button onClick={handleCharacterAvatarGen} disabled={isAvatarGenerating || !editingChar?.visualDescription} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl text-[10px] font-mono font-black uppercase tracking-widest shadow-2xl flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform">
                                  {isAvatarGenerating ? <RefreshCw size={14} className="animate-spin"/> : <Sparkles size={14}/>} {t.genAvatar}
                              </button>
                          </div>
                      </div>
                      <div className="w-full space-y-6 bg-white/5 p-8 rounded-[36px] border border-white/5">
                          <h4 className="text-[10px] font-mono font-black text-indigo-400 uppercase tracking-[0.3em] text-center">Form Condensation</h4>
                          <p className="text-zinc-500 text-xs text-center leading-relaxed font-sans opacity-70">
                              Upload a manifestation or let the core condense a shell based on the soul's essence.
                          </p>
                      </div>
                  </div>

                  {/* Right Column: Data Form */}
                  <div className="w-full md:w-3/5 p-12 overflow-y-auto space-y-12 bg-black/10 no-scrollbar">
                      {/* Name & Magic Fill */}
                      <div className="relative">
                          <label className="text-[10px] font-mono font-black text-zinc-600 uppercase tracking-[0.3em] block mb-5">{t.name}</label>
                          <div className="flex gap-4">
                              <input 
                                  className="flex-1 bg-zinc-950/50 border border-white/5 rounded-2xl p-6 text-2xl font-display font-black text-white placeholder-zinc-800 focus:border-indigo-500/50 outline-none transition-all" 
                                  value={editingChar?.name || ''} 
                                  onChange={e => setEditingChar(p => ({...p!, name: e.target.value}))} 
                                  placeholder={t.enterNameHint}
                              />
                              <Button 
                                  onClick={handleAICompleteChar} 
                                  disabled={!editingChar?.name || isCharAutoFilling}
                                  variant="primary" 
                                  className="h-[76px] px-8 rounded-2xl"
                                  icon={isCharAutoFilling ? RefreshCw : Sparkles}
                              >
                                  {isCharAutoFilling ? 'Scanning...' : t.aiFill}
                              </Button>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-10">
                          <div>
                              <label className="text-[10px] font-mono font-black text-zinc-600 uppercase tracking-[0.3em] block mb-4">{t.gender}</label>
                              <input className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl p-5 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all" value={editingChar?.gender || ''} onChange={e => setEditingChar(p => ({...p!, gender: e.target.value}))} />
                          </div>
                          <div>
                              <label className="text-[10px] font-mono font-black text-zinc-700 uppercase tracking-[0.3em] block mb-4">{t.age}</label>
                              <input className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl p-5 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all" value={editingChar?.age || ''} onChange={e => setEditingChar(p => ({...p!, age: e.target.value}))} />
                          </div>
                      </div>

                      <SmartTextarea label={t.personality} value={editingChar?.personality || ''} onChange={e => setEditingChar(p => ({...p!, personality: e.target.value}))} onAIRequest={async () => handleRefine(editingChar?.personality || '', 'Personality', v => setEditingChar(p => ({...p!, personality: v})))} />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <SmartTextarea label={t.speakingStyle} value={editingChar?.speakingStyle || ''} onChange={e => setEditingChar(p => ({...p!, speakingStyle: e.target.value}))} onAIRequest={async () => handleRefine(editingChar?.speakingStyle || '', 'SpeakingStyle', v => setEditingChar(p => ({...p!, speakingStyle: v})))} />
                          <SmartTextarea label={t.visual} value={editingChar?.visualDescription || ''} onChange={e => setEditingChar(p => ({...p!, visualDescription: e.target.value}))} onAIRequest={async () => handleRefine(editingChar?.visualDescription || '', 'Visual', v => setEditingChar(p => ({...p!, visualDescription: v})))} />
                      </div>
                      
                      {editingChar?.memories && editingChar.memories.length > 0 && (
                          <div className="border-t border-white/5 pt-12">
                               <label className="text-[10px] font-mono font-black text-indigo-400 uppercase block mb-6 flex items-center gap-3 tracking-[0.4em]">
                                   <BrainCircuit size={16}/> {t.memories}
                               </label>
                               <div className="bg-black/40 rounded-[32px] p-8 border border-white/5 space-y-4 max-h-56 overflow-y-auto no-scrollbar shadow-inner font-sans">
                                   {editingChar.memories.map((m, idx) => (
                                       <div key={idx} className="text-sm text-zinc-400 flex gap-4 leading-relaxed group">
                                           <span className="text-indigo-500 font-mono font-black group-hover:scale-125 transition-transform">#</span> {m}
                                       </div>
                                   ))}
                               </div>
                          </div>
                      )}
                  </div>
              </div>

              {/* Footer */}
              <div className="p-10 border-t border-white/5 bg-black/20 flex justify-end gap-6 backdrop-blur-3xl">
                  <Button variant="ghost" className="px-8 rounded-2xl" onClick={() => setShowCharModal(false)}>{t.close}</Button>
                  <Button variant="primary" className="px-14 rounded-2xl font-display font-black text-xs" onClick={handleSaveGlobalCharacter} icon={Save}>{t.saveSettings}</Button>
              </div>
          </div>
      </div>
  );

  const renderChatInterface = () => {
      if (!activeChatSession) return null;
      const char = globalCharacters.find(c => c.id === activeChatSession.characterId);
      
      return (
          <div className="h-screen flex flex-col bg-[#020205] font-sans">
              <header className="bg-zinc-950/80 backdrop-blur-3xl border-b border-white/5 p-8 flex items-center justify-between z-20">
                  <div className="flex items-center gap-8">
                      <button onClick={handleExitChat} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all border border-white/5"><ChevronLeft /></button>
                      <div className="flex items-center gap-5">
                          <Avatar name={char?.name || "?"} url={char?.avatarUrl} size="md" />
                          <div>
                              <h2 className="font-display font-black text-2xl text-white tracking-tight leading-none mb-1">{char?.name}</h2>
                              <div className="flex items-center gap-2.5 text-[9px] font-mono font-black uppercase text-indigo-400/70 tracking-[0.3em]">
                                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_#6366f1]"></div> Soul Stream Synced
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="hidden md:flex px-5 py-2.5 bg-indigo-500/5 border border-indigo-500/10 rounded-full">
                      <span className="text-[10px] font-mono font-black text-indigo-400/60 uppercase tracking-[0.2em]">Dimension Hub: Imola-Echo-7</span>
                  </div>
              </header>

              <main className="flex-1 overflow-y-auto p-10 md:p-16 space-y-12 no-scrollbar relative">
                  <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                  
                  {activeChatSession.messages.map((msg, i) => (
                      <div key={msg.id} className={`flex gap-8 max-w-4xl animate-fade-in ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                          <div className="flex-shrink-0">
                               {msg.role === 'user' ? 
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-display font-black text-white shadow-2xl ring-4 ring-indigo-600/10">{currentUser?.username.substring(0,1).toUpperCase()}</div> :
                                <Avatar name={char?.name || "?"} url={char?.avatarUrl} size="md" />
                               }
                          </div>
                          <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                              <div className={`p-6 rounded-[32px] text-base leading-relaxed shadow-2xl relative border ${msg.role === 'user' ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' : 'bg-zinc-900/50 backdrop-blur-3xl border-white/10 text-zinc-100 rounded-tl-none'}`}>
                                  {msg.content}
                                  {msg.mediaUrl && (
                                      <div className="mt-5 rounded-[28px] overflow-hidden shadow-2xl border border-white/10">
                                          {msg.mediaType === 'image' ? (
                                              <img src={msg.mediaUrl} alt="Vision" className="w-full h-auto max-h-[600px] object-cover" />
                                          ) : msg.mediaType === 'video' ? (
                                              <div className="relative group">
                                                  <video src={msg.mediaUrl} controls className="w-full h-auto max-h-[600px]" />
                                                  <div className="absolute top-5 right-5 px-4 py-2 bg-black/80 backdrop-blur-2xl rounded-2xl text-[10px] font-mono font-black text-white flex items-center gap-3 border border-white/10 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <Video size={12} /> Fragment Captured
                                                  </div>
                                              </div>
                                          ) : null}
                                      </div>
                                  )}
                              </div>
                              <span className="text-[9px] font-mono font-bold text-zinc-700 uppercase tracking-widest mt-3">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                      </div>
                  ))}
                  {isChatting && (
                       <div className="flex gap-8 max-w-4xl mr-auto">
                           <Avatar name={char?.name || "?"} url={char?.avatarUrl} size="md" />
                           <div className="bg-white/5 px-6 py-5 rounded-[32px] rounded-tl-none border border-white/5 text-zinc-600 flex items-center gap-2 backdrop-blur-xl">
                               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                               <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em] ml-4 opacity-40">Capturing Resonance...</span>
                           </div>
                       </div>
                  )}
                  <div ref={companionChatEndRef} className="h-20" />
              </main>

              <footer className="p-10 bg-zinc-950/80 backdrop-blur-3xl border-t border-white/5 z-20">
                  <div className="max-w-4xl mx-auto relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-20 transition-all duration-500"></div>
                      <div className="relative flex gap-4 bg-zinc-950 border border-white/10 rounded-[28px] p-2 pr-4 focus-within:border-indigo-500 transition-all shadow-2xl">
                          <input className="flex-1 bg-transparent border-none rounded-xl px-8 py-5 text-white text-lg focus:outline-none placeholder-zinc-800 font-medium" 
                              placeholder="Pass your consciousness echo..." 
                              value={chatInput} 
                              onChange={e => setChatInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()}
                              disabled={isChatting}
                          />
                          <Button onClick={handleSendChatMessage} disabled={!chatInput.trim() || isChatting} icon={Send} variant="primary" className="rounded-2xl h-16 w-16 p-0 shadow-none"></Button>
                      </div>
                  </div>
              </footer>
          </div>
      );
  };

  const renderEditor = () => {
    if (!currentScript) return null;
    return (
      <div className="h-screen flex flex-col bg-[#020205] animate-fade-in font-sans">
        <header className="flex-shrink-0 border-b border-white/5 p-8 flex justify-between items-center bg-zinc-950/80 backdrop-blur-3xl z-20">
          <button onClick={() => setView('DASHBOARD')} className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-display font-black text-zinc-400 hover:text-white transition-all uppercase tracking-widest border border-white/5">
            <ChevronLeft size={16} /> Hall
          </button>
          <div className="flex items-center gap-10">
             <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${editorStep === 1 ? 'opacity-100' : 'opacity-30'}`}>
                <span className="text-[9px] font-mono font-black text-indigo-400 uppercase tracking-[0.3em]">Step 01</span>
                <span className="text-xs font-display font-bold text-white uppercase tracking-widest">{t.setup}</span>
             </div>
             <div className="w-12 h-[1px] bg-white/10"></div>
             <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${editorStep === 2 ? 'opacity-100' : 'opacity-30'}`}>
                <span className="text-[9px] font-mono font-black text-indigo-400 uppercase tracking-[0.3em]">Step 02</span>
                <span className="text-xs font-display font-bold text-white uppercase tracking-widest">{t.castSetup}</span>
             </div>
          </div>
          <div className="flex gap-4">
            {editorStep === 1 ? <Button onClick={() => setEditorStep(2)} icon={ChevronRight} className="rounded-2xl h-12 px-8 text-xs">{t.next}</Button> : <Button icon={Play} onClick={() => setView('STAGE')} className="rounded-2xl h-12 px-10 text-xs shadow-indigo-600/30 font-black">{t.startShow}</Button>}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-12 no-scrollbar">
          <div className="max-w-5xl mx-auto space-y-16">
            {editorStep === 1 && (
              <div className="animate-fade-in space-y-16">
                 <div className="relative group">
                    <label className="text-[10px] font-mono font-black text-zinc-600 uppercase tracking-[0.4em] mb-6 block">Scroll Designation</label>
                    <input className="w-full bg-transparent border-b-2 border-white/10 rounded-none p-0 pb-6 text-6xl font-display font-black text-white outline-none focus:border-indigo-500 transition-all duration-500 placeholder-zinc-900 tracking-tight" value={currentScript.title} onChange={e => updateScriptState({...currentScript, title: e.target.value})} placeholder="Fate Unnamed..." />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <SmartTextarea label={t.premise} value={currentScript.premise} onChange={e => updateScriptState({...currentScript, premise: e.target.value})} onAIRequest={async() => handleRefine(currentScript.premise, 'Premise', v => updateScriptState({...currentScript, premise: v}))} />
                    <SmartTextarea label="Setting Domain" value={currentScript.setting} onChange={e => updateScriptState({...currentScript, setting: e.target.value})} onAIRequest={async() => handleRefine(currentScript.setting, 'Setting', v => updateScriptState({...currentScript, setting: v}))} />
                 </div>
                 
                 <div className="pt-12 border-t border-white/5">
                    <label className="text-[10px] font-mono font-black text-indigo-400 uppercase tracking-[0.4em] mb-10 block flex items-center gap-4">
                        <Film size={16} /> {t.plotPoints} <span className="bg-indigo-500/10 px-4 py-1.5 rounded-full text-[9px] font-mono tracking-wider">Causality Threads</span>
                    </label>
                    <div className="grid gap-8">
                        {(currentScript.plotPoints || []).map((p, i) => (
                            <div key={i} className="group relative bg-zinc-950/40 backdrop-blur-3xl border border-white/5 p-8 rounded-[36px] flex gap-10 items-start hover:border-indigo-500/30 hover:bg-zinc-900/40 transition-all duration-500">
                                <div className="bg-indigo-600/10 w-14 h-14 flex items-center justify-center rounded-[20px] text-indigo-400 font-display font-black text-lg flex-shrink-0 border border-indigo-500/20 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <textarea 
                                        className="w-full bg-transparent text-zinc-200 text-lg font-medium outline-none resize-none leading-relaxed placeholder-zinc-800" 
                                        rows={2}
                                        value={p} 
                                        onChange={e => { const pts = [...currentScript.plotPoints]; pts[i] = e.target.value; updateScriptState({...currentScript, plotPoints: pts}); }} 
                                        placeholder="Weave a causality event..."
                                    />
                                </div>
                                <div className="flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <button onClick={() => handleRefinePlotPoint(i)} className="w-12 h-12 flex items-center justify-center bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-2xl transition-all shadow-xl" title="Align Event">
                                        <Sparkles size={18} />
                                    </button>
                                    <button onClick={() => { const pts = currentScript.plotPoints.filter((_, idx) => idx !== i); updateScriptState({...currentScript, plotPoints: pts}); }} className="w-12 h-12 flex items-center justify-center bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl transition-all shadow-xl">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => updateScriptState({...currentScript, plotPoints: [...currentScript.plotPoints, "New Causality Node"]})} className="flex items-center justify-center gap-4 py-8 border-2 border-dashed border-white/5 rounded-[36px] text-zinc-700 hover:text-indigo-400 hover:border-indigo-500/30 transition-all duration-500 group font-display font-black uppercase text-[11px] tracking-[0.3em] bg-white/2">
                            <Plus size={24} className="group-hover:scale-125 transition-transform" /> Forge New Fate Thread
                        </button>
                    </div>
                 </div>
              </div>
            )}
            {editorStep === 2 && (
              <div className="animate-fade-in space-y-16">
                <div className="flex gap-8">
                    <Button className="flex-1 rounded-[32px] py-7 text-xs shadow-none border-dashed border-2 border-white/10" variant="secondary" icon={Plus} onClick={() => updateScriptState({...currentScript, characters: [...currentScript.characters, { id: crypto.randomUUID(), name: "Unknown Soul", role: "Destined", personality: "Neutral", speakingStyle: "Normal", visualDescription: "...", isUserControlled: false }]})}>{t.addActor}</Button>
                    <Button className="flex-1 rounded-[32px] py-7 text-xs" icon={Sparkles} onClick={handleAiAddCharacter}>{t.aiAddActor}</Button>
                    {globalCharacters.length > 0 && (
                        <div className="relative group flex-1">
                            <Button variant="secondary" icon={Users} className="w-full rounded-[32px] py-7 text-xs">{t.importActor}</Button>
                            <div className="absolute top-full mt-6 right-0 w-72 bg-zinc-900/90 backdrop-blur-3xl border border-white/10 rounded-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] hidden group-hover:block z-50 p-3 animate-fade-in">
                                <div className="max-h-80 overflow-y-auto no-scrollbar">
                                    {globalCharacters.map(c => (
                                        <div key={c.id} onClick={() => handleImportGlobalCharacter(c)} className="p-4 hover:bg-indigo-600 rounded-[24px] cursor-pointer text-sm font-display font-black text-zinc-400 hover:text-white flex items-center gap-4 transition-all duration-300">
                                            <Avatar name={c.name} url={c.avatarUrl} size="sm" />
                                            <span className="truncate">{c.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 gap-10 pb-20">
                    {(currentScript.characters || []).map((char, idx) => (
                    <div key={char.id} className="bg-zinc-900/30 backdrop-blur-2xl border border-white/5 rounded-[48px] p-10 flex flex-col md:flex-row gap-12 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] transition-all duration-500">
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative group">
                                <Avatar name={char.name} url={char.avatarUrl} size="lg" />
                                {!char.isGlobal && (
                                    <div className="absolute inset-0 bg-black/60 rounded-[32px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                                         <button onClick={() => handleGenerateAvatar(char)} className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-2xl shadow-2xl hover:scale-110 transition-transform"><RefreshCw size={18} /></button>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col gap-3 w-full">
                                {char.isGlobal ? (
                                    <span className="text-[8px] font-mono font-black text-indigo-400 uppercase tracking-[0.3em] border border-indigo-500/20 px-4 py-2 rounded-full text-center bg-indigo-500/5 shadow-inner">Matrix Linked</span>
                                ) : (
                                    <span className="text-[8px] font-mono font-black text-zinc-700 uppercase tracking-[0.3em] border border-white/5 px-4 py-2 rounded-full text-center">Fragmented</span>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => { const chars = [...currentScript.characters]; chars[idx].isUserControlled = !chars[idx].isUserControlled; updateScriptState({...currentScript, characters: chars}); }} className={`rounded-2xl h-11 border text-[9px] font-display font-black uppercase tracking-widest ${char.isUserControlled ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl' : 'border-white/5 text-zinc-600'}`}>
                                    {char.isUserControlled ? 'Descent On' : 'Descent Off'}
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 space-y-10">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="flex flex-col gap-3">
                                    <label className="text-[10px] font-mono font-black text-zinc-700 uppercase tracking-[0.3em] px-1">{t.name}</label>
                                    <input className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-base font-display font-bold text-white focus:border-indigo-500/50 outline-none transition-all" disabled={!!char.isGlobal} value={char.name} onChange={e => { const chars = [...currentScript.characters]; chars[idx].name = e.target.value; updateScriptState({...currentScript, characters: chars}); }} />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <label className="text-[10px] font-mono font-black text-zinc-700 uppercase tracking-[0.3em] px-1">Destiny Path</label>
                                    <input className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-base font-display font-bold text-white focus:border-indigo-500/50 outline-none transition-all" value={char.role} onChange={e => { const chars = [...currentScript.characters]; chars[idx].role = e.target.value; updateScriptState({...currentScript, characters: chars}); }} />
                                </div>
                            </div>
                            <SmartTextarea label="Core Pattern" value={char.personality} onChange={e => { const chars = [...currentScript.characters]; chars[idx].personality = e.target.value; updateScriptState({...currentScript, characters: chars}); }} onAIRequest={async () => handleRefine(char.personality, 'Personality', v => { const chars = [...currentScript.characters]; chars[idx].personality = v; updateScriptState({...currentScript, characters: chars}); })} />
                            
                            <div className="pt-8 border-t border-white/5 flex justify-end">
                                <button onClick={() => { const chars = currentScript.characters.filter((_, i) => i !== idx); updateScriptState({...currentScript, characters: chars}); }} className="w-12 h-12 flex items-center justify-center text-zinc-700 hover:text-red-500 hover:bg-white/5 rounded-2xl transition-all"><Trash2 size={20}/></button>
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
    
    return (
      <div className="h-screen bg-black flex flex-col overflow-hidden relative font-sans">
        <style>{`
          .soul-view-gradient { background: linear-gradient(to top, #000 0%, transparent 20%, transparent 80%, #000 100%); }
          .message-entrance { animation: msgEntrance 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          @keyframes msgEntrance { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `}</style>
        
        {/* Cinematic Backdrop */}
        <div className="absolute inset-0 z-0">
             {(() => {
                 const lastImg = [...currentScript.history].reverse().find(m => m.imageUrl);
                 if (lastImg && lastImg.imageUrl) {
                     return <img src={lastImg.imageUrl} alt="Resonance" className="w-full h-full object-cover opacity-30 transition-all duration-[3000ms] scale-105" />;
                 }
                 return <div className="w-full h-full bg-[#050510]"></div>
             })()}
             <div className="absolute inset-0 soul-view-gradient"></div>
        </div>

        {isReconstructing && (
            <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in">
                <div className="relative">
                    <div className="absolute -inset-16 bg-indigo-500/30 rounded-full blur-[80px] animate-pulse"></div>
                    <Atom size={80} className="text-indigo-400 animate-[spin_10s_linear_infinite] relative z-10" />
                </div>
                <h3 className="text-white font-display font-black text-3xl mt-12 tracking-[0.5em] uppercase">Caused Reconstruction</h3>
                <p className="text-indigo-500/50 font-mono font-bold text-[11px] uppercase tracking-[0.4em] mt-6">Aligning soul paths with the new oracle...</p>
            </div>
        )}

        {/* HUD Overlay */}
        <div className="absolute top-0 left-0 w-full p-10 flex justify-between items-center z-40">
             <div className="flex items-center gap-8">
                 <button onClick={() => { setIsPlaying(false); setView('DASHBOARD'); }} className="w-14 h-14 flex items-center justify-center rounded-[20px] bg-black/40 backdrop-blur-xl border border-white/5 text-zinc-400 hover:text-white transition-all"><ChevronLeft /></button>
                 <div>
                     <h2 className="text-white font-display font-black text-3xl tracking-tight leading-none text-glow">{currentScript.title}</h2>
                     <div className="flex items-center gap-3 mt-2">
                         <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-indigo-500 animate-pulse shadow-[0_0_10px_#6366f1]' : 'bg-zinc-700'}`}></div>
                         <span className="text-[10px] font-mono font-black text-indigo-400/80 uppercase tracking-[0.3em]">{isPlaying ? t.onAir : t.paused}</span>
                     </div>
                 </div>
             </div>
             <div className="flex gap-5">
                 <div className="flex bg-black/60 backdrop-blur-3xl rounded-[28px] border border-white/5 p-1.5 shadow-2xl">
                    <button onClick={handleNextChapter} className="h-14 px-8 hover:bg-white/5 text-zinc-500 hover:text-white transition-all rounded-2xl flex items-center gap-3 text-[10px] font-mono font-black uppercase tracking-widest">
                        <SkipForward size={16} /> {t.skipChapter}
                    </button>
                    <button onClick={() => setIsPlaying(!isPlaying)} className={`h-14 px-10 transition-all rounded-2xl flex items-center gap-4 text-[10px] font-mono font-black uppercase tracking-widest ${isPlaying ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-white text-black hover:bg-zinc-200'}`}>
                        {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                        {isPlaying ? 'Hold' : 'Resume'}
                    </button>
                 </div>
             </div>
        </div>

        {/* Content Stream */}
        <div className="relative z-10 flex-1 overflow-y-auto p-12 md:px-48 md:py-40 space-y-20 no-scrollbar">
             {currentScript.history.map((msg, idx) => {
                 const char = currentScript.characters.find(c => c.id === msg.characterId);
                 const isNarration = msg.type === 'narration' || msg.characterId === 'narrator';
                 const isUser = char?.isUserControlled;
                 
                 return (
                     <div key={msg.id} className={`flex flex-col max-w-5xl mx-auto message-entrance ${isNarration ? 'items-center text-center py-20' : (isUser ? 'items-end' : 'items-start')}`}>
                         {!isNarration && (
                             <div className={`flex items-center gap-4 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                                 <Avatar name={char?.name || "?"} url={char?.avatarUrl} size="sm" />
                                 <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                     <span className="text-[10px] font-mono font-black text-indigo-400/80 uppercase tracking-[0.2em]">{char?.name}</span>
                                     <span className="text-[8px] font-mono font-bold text-zinc-700 uppercase tracking-widest">{char?.role}</span>
                                 </div>
                             </div>
                         )}
                         
                         <div className={`
                             ${isNarration 
                               ? 'text-zinc-200 font-display italic text-3xl md:text-5xl font-light leading-tight max-w-4xl tracking-tight opacity-90' 
                               : `p-8 rounded-[40px] max-w-xl text-lg shadow-2xl backdrop-blur-3xl border ${isUser ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' : 'bg-zinc-900/60 border-white/10 text-zinc-100 rounded-tl-none'}`}
                         `} style={{ borderColor: !isNarration && char && !isUser ? getCharacterColor(char.id) + '60' : undefined }}>
                             {msg.content}
                         </div>
                     </div>
                 );
             })}
             
             {turnProcessing && (
                 <div className="flex justify-center my-16 animate-pulse">
                     <div className="bg-white/5 border border-white/5 px-8 py-4 rounded-full flex items-center gap-4 backdrop-blur-3xl">
                         <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                             <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                             <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                         </div>
                         <span className="text-indigo-400/60 text-[10px] font-mono font-black tracking-[0.4em] uppercase">Awaiting Soul Resonance...</span>
                     </div>
                 </div>
             )}
             <div ref={chatEndRef} className="h-40" />
        </div>

        {/* Global Controls */}
        <div className="relative z-30 p-10 bg-gradient-to-t from-black via-black/90 to-transparent pt-32">
             <div className="max-w-5xl mx-auto flex flex-col gap-8">
                 
                 {/* Director Oracle */}
                 <div className="group relative">
                      <div className="absolute -inset-1 bg-amber-500/20 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-700"></div>
                      <div className="relative flex gap-5 items-center bg-amber-500/[0.03] border border-amber-500/20 px-8 py-4 rounded-[30px] backdrop-blur-3xl focus-within:border-amber-500/50 transition-all">
                          <Crown size={20} className="text-amber-500/40 animate-pulse" />
                          <input 
                             className="flex-1 bg-transparent border-none text-lg font-display font-bold text-amber-100 placeholder-amber-500/20 focus:outline-none" 
                             placeholder="Drop an Oracle to restructure causality..."
                             value={directorInput}
                             onChange={e => setDirectorInput(e.target.value)}
                             onKeyDown={e => e.key === 'Enter' && handleDirectorMessage()}
                          />
                          <button onClick={handleDirectorMessage} disabled={!directorInput} className="text-[10px] font-mono font-black text-amber-500 hover:text-amber-300 disabled:opacity-20 uppercase tracking-[0.4em] transition-colors">{t.inject}</button>
                      </div>
                 </div>

                 {/* User Roleplay Interaction */}
                 {userCharacters.length > 0 && (
                     <div className="grid gap-6">
                         {userCharacters.map(char => (
                             <div key={char.id} className="group relative flex gap-5 items-center">
                                 <Avatar name={char.name} url={char.avatarUrl} size="md" />
                                 <div className="flex-1 flex gap-4 relative">
                                     <div className="absolute -inset-1 bg-indigo-500/20 rounded-[32px] blur-xl opacity-0 focus-within:opacity-30 transition-all duration-700"></div>
                                     <input 
                                         className="flex-1 bg-white/5 border border-white/10 rounded-[28px] px-8 py-5 text-white focus:border-indigo-500/50 outline-none transition-all shadow-2xl backdrop-blur-3xl font-medium placeholder-zinc-800" 
                                         placeholder={`Descent as ${char.name}...`}
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
                                     <Button onClick={() => {
                                          const text = userInputs[char.id];
                                          if (!text) return;
                                          setUserInputs({...userInputs, [char.id]: ''});
                                          const msg: Message = { id: crypto.randomUUID(), characterId: char.id, content: text, type: 'dialogue', timestamp: Date.now() };
                                          handleUpdateScriptHistory(msg);
                                     }} icon={Send} variant="primary" className="rounded-2xl h-16 w-16 p-0 shadow-none"></Button>
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
      <div className={`fixed inset-0 bg-black/80 backdrop-blur-3xl z-[100] flex justify-end transition-all duration-700 ${showSettings ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className={`w-full max-w-md bg-[#050510] h-full shadow-[0_0_100px_rgba(0,0,0,0.9)] p-12 transform transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] border-l border-white/5 flex flex-col ${showSettings ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="flex justify-between items-center mb-16">
                  <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                          <Settings className="text-indigo-400" size={24} />
                      </div>
                      <div>
                          <h2 className="text-2xl font-display font-black text-white tracking-tight leading-none">{t.settings}</h2>
                          <p className="text-[9px] font-mono font-bold text-indigo-400/50 uppercase tracking-[0.3em] mt-1.5">System Calibration</p>
                      </div>
                  </div>
                  <button onClick={() => setShowSettings(false)} className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-2xl transition-all text-zinc-500 hover:text-white border border-transparent hover:border-white/10"><X /></button>
              </div>
              
              <div className="space-y-12 flex-1 overflow-y-auto no-scrollbar pr-2">
                  <div className="space-y-5">
                      <label className="text-[10px] font-mono font-black text-zinc-700 uppercase tracking-[0.3em] block px-1">{t.provider}</label>
                      <div className="flex bg-black p-1.5 rounded-2xl border border-white/5 shadow-inner">
                          <button onClick={() => setAppSettings({...appSettings, activeProvider: 'GEMINI'})} className={`flex-1 py-3 text-[10px] font-display font-black uppercase tracking-widest rounded-xl transition-all ${appSettings.activeProvider !== 'OPENROUTER' ? 'bg-indigo-600 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}>Gemini Core</button>
                          <button onClick={() => setAppSettings({...appSettings, activeProvider: 'OPENROUTER'})} className={`flex-1 py-3 text-[10px] font-display font-black uppercase tracking-widest rounded-xl transition-all ${appSettings.activeProvider === 'OPENROUTER' ? 'bg-indigo-600 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}>Deep Bridge</button>
                      </div>
                  </div>

                  {appSettings.activeProvider === 'OPENROUTER' ? (
                      <div className="space-y-8 animate-fade-in">
                        <div className="flex flex-col gap-4">
                            <label className="text-[10px] font-mono font-black text-zinc-700 uppercase tracking-[0.3em] block px-1">{t.openRouterKey}</label>
                            <div className="flex items-center gap-4 bg-black rounded-2xl px-6 py-5 border border-white/10 focus-within:border-indigo-500/50 transition-all shadow-inner">
                                <Key size={18} className="text-zinc-700" />
                                <input type="password" className="bg-transparent border-none text-white w-full focus:outline-none text-sm font-medium placeholder-zinc-800" value={appSettings.openRouterKey || ''} onChange={e => setAppSettings({...appSettings, openRouterKey: e.target.value})} placeholder="sk-or-..." />
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <label className="text-[10px] font-mono font-black text-zinc-700 uppercase tracking-[0.3em] block px-1">{t.openRouterModel}</label>
                            <input className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm font-bold text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner" value={appSettings.openRouterModel || ''} onChange={e => setAppSettings({...appSettings, openRouterModel: e.target.value})} placeholder="google/gemini-2.0-flash..." />
                        </div>
                      </div>
                  ) : (
                      <div className="space-y-6 animate-fade-in">
                          <label className="text-[10px] font-mono font-black text-zinc-700 uppercase tracking-[0.3em] block px-1">{t.geminiKey}</label>
                          <div className="flex items-center gap-4 bg-black rounded-2xl px-6 py-5 border border-white/10 focus-within:border-indigo-500/50 transition-all shadow-inner">
                              <Key size={18} className="text-zinc-700" />
                              <input type="password" className="bg-transparent border-none text-white w-full focus:outline-none text-sm font-medium placeholder-zinc-800" value={appSettings.apiKey || ''} onChange={e => setAppSettings({...appSettings, apiKey: e.target.value})} placeholder="AIza..." />
                          </div>
                          <p className="text-[10px] text-zinc-600 font-mono font-bold leading-relaxed opacity-60 px-1">{t.apiKeyHint}</p>
                      </div>
                  )}

                  <div className="pt-12 border-t border-white/5 space-y-6">
                       <label className="text-[10px] font-mono font-black text-zinc-700 uppercase tracking-[0.3em] block px-1">Linguistic Synchro</label>
                       <div className="flex gap-4">
                           <button onClick={() => setLang('zh-CN')} className={`flex-1 py-4 border-2 rounded-2xl text-[10px] font-display font-black uppercase tracking-[0.2em] transition-all duration-300 ${lang === 'zh-CN' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-xl shadow-indigo-500/10' : 'border-white/5 text-zinc-700 hover:text-zinc-500 hover:border-white/10'}`}>中文 (CN)</button>
                           <button onClick={() => setLang('en-US')} className={`flex-1 py-4 border-2 rounded-2xl text-[10px] font-display font-black uppercase tracking-[0.2em] transition-all duration-300 ${lang === 'en-US' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 shadow-xl shadow-indigo-500/10' : 'border-white/5 text-zinc-700 hover:text-zinc-500 hover:border-white/10'}`}>English (US)</button>
                       </div>
                  </div>
              </div>

              <div className="mt-12 pt-12 border-t border-white/5">
                <Button onClick={handleSaveSettings} className="w-full py-6 rounded-3xl" variant="primary">{t.saveSettings}</Button>
              </div>
          </div>
      </div>
  );

  return (
    <div className="select-none cursor-default font-sans selection:bg-indigo-500/30">
      {notification && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] p-6 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex items-center gap-5 animate-fade-in backdrop-blur-3xl border ${notification.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400 shadow-indigo-500/20'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 ${notification.type === 'error' ? 'text-red-500' : 'text-indigo-400 animate-pulse'}`}>
            {notification.type === 'error' ? <AlertCircle size={22}/> : <Sparkles size={22}/>}
          </div>
          <div>
            <h4 className="font-display font-black text-sm uppercase tracking-wider leading-none mb-1">{notification.title}</h4>
            <p className="text-[10px] font-mono font-bold opacity-60 uppercase tracking-widest">{notification.msg}</p>
          </div>
        </div>
      )}

      {view === 'DASHBOARD' && renderDashboard()}
      {view === 'EDITOR' && renderEditor()}
      {view === 'STAGE' && renderStage()}
      {view === 'CHAT' && renderChatInterface()}
      
      {showCharModal && renderCharacterModal()}
      {renderSettings()}
    </div>
  );
}
