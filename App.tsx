

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Play, Pause, Save, Settings, 
  Sparkles, MessageSquare, Edit3, Trash2, 
  ChevronRight, ChevronLeft, Image as ImageIcon,
  Users, Globe, Trophy, Share2, Download, Copy, Star, Mic, Send,
  Wand2, RefreshCw, LayoutDashboard, Film, BookOpen, Crown, Clapperboard,
  LogOut, User as UserIcon, Key, X, AlertCircle
} from 'lucide-react';
import { Script, Character, Message, Language, Achievement, User, AppSettings } from './types';
import { generateScriptBlueprint, generateNextBeat, generateAvatarImage, refineText, generateSceneImage } from './services/aiService';
import { authService } from './services/authService';

// --- i18n Dictionary ---
const TRANSLATIONS = {
  'zh-CN': {
    title: "梦幻微剧场",
    subtitle: "AI 即兴剧场",
    heroTitle: "你的下一个梦境，从这里开始",
    heroSubtitle: "输入任何想法，让 AI 为你编排一出好戏。掌控全场，或静观其变。",
    dashboard: "剧场大厅",
    myScripts: "我的剧本",
    templates: "模版库",
    community: "社区",
    achievements: "成就",
    settings: "设置",
    startNew: "创建新剧本",
    dreaming: "正在构思...",
    create: "生成剧本",
    placeholder: "例如：在火星殖民地的一次叛乱谈判...",
    noScripts: "暂无剧本。在上方输入灵感，开始你的第一部杰作。",
    setup: "第一步：剧本设定",
    castSetup: "第二步：角色设定",
    startShow: "开始演出",
    premise: "故事前提",
    plotPoints: "关键情节 (剧情节点)",
    endings: "可能的结局",
    cast: "演员表",
    addActor: "添加演员",
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
    role: "角色/职业",
    personality: "性格特征 (影响AI决策)",
    speakingStyle: "语言风格 (影响AI对话)",
    visual: "外貌描述 (影响头像)",
    yourCue: "轮到你表演了",
    directorNote: "导演提示：请根据角色性格输入对话",
    aiComplete: "AI补全/优化",
    directorMode: "上帝指令",
    directorPlaceholder: "输入指令... (指令将被优先执行)",
    inject: "注入指令",
    saving: "已保存",
    continue: "继续",
    quickStart: "快速开始",
    rateLimitTitle: "系统繁忙",
    rateLimitMsg: "已触流控限制，系统暂停以冷却。请稍后重试。",
    errorTitle: "演出中断",
    errorMsg: "发生了错误，自动播放已暂停。",
    loginTitle: "梦幻微剧场",
    loginSubtitle: "登录以保存您的创作",
    loginBtn: "登录",
    regBtn: "注册",
    welcome: "欢迎回来",
    apiKeyHint: "强烈建议输入您的 Gemini API Key 以获得更稳定的体验。它仅存储在您的浏览器中。",
    saveSettings: "保存设置",
    close: "关闭",
    noKey: "未检测到 API Key。请在右上角设置中配置。",
    commandQueued: "指令已缓存，将在下一幕生效..."
  },
  'en-US': {
    title: "Dream Micro-Theater",
    subtitle: "AI Improv Theater",
    heroTitle: "Where Stories Come Alive",
    heroSubtitle: "Turn any idea into a fully acted script. Direct the scene or play a role.",
    dashboard: "Dashboard",
    myScripts: "My Scripts",
    templates: "Templates",
    community: "Community",
    achievements: "Achievements",
    settings: "Settings",
    startNew: "Start New Scenario",
    dreaming: "Dreaming...",
    create: "Generate Script",
    placeholder: "e.g. A negotiation on a Mars colony...",
    noScripts: "No scripts yet. Enter an idea above to create your first masterpiece.",
    setup: "Step 1: Script Setup",
    castSetup: "Step 2: Cast Setup",
    startShow: "Start Show",
    premise: "Premise",
    plotPoints: "Key Plot Points",
    endings: "Possible Endings",
    cast: "Cast",
    addActor: "Add Actor",
    genLook: "Gen Look",
    playerControlled: "Player Controlled",
    observerMode: "Observer Mode",
    resumeAuto: "Resume Auto-Play",
    speakingAs: "Speaking as",
    whatSay: "Enter dialogue or action...",
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
    role: "Role",
    personality: "Personality",
    speakingStyle: "Speaking Style",
    visual: "Visual Description",
    yourCue: "Your Cue",
    directorNote: "Director's Note: Stay in character",
    aiComplete: "AI Complete/Refine",
    directorMode: "God Mode",
    directorPlaceholder: "Enter command... (Prioritized next turn)",
    inject: "Inject",
    saving: "Saved",
    continue: "Continue",
    quickStart: "Quick Start",
    rateLimitTitle: "Rate Limit Hit",
    rateLimitMsg: "System is cooling down. Auto-play paused.",
    errorTitle: "Error",
    errorMsg: "Something went wrong. Auto-play paused.",
    loginTitle: "Dream Micro-Theater",
    loginSubtitle: "Login to save your creations",
    loginBtn: "Login",
    regBtn: "Register",
    welcome: "Welcome back",
    apiKeyHint: "Enter your Gemini API Key for best experience. Stored locally.",
    saveSettings: "Save Settings",
    close: "Close",
    noKey: "No API Key found. Please configure in Settings.",
    commandQueued: "Command queued for next beat..."
  }
};

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: '1', title: '初露锋芒', description: '创建第1个剧本', icon: '📝', conditionType: 'SCRIPT_COUNT', threshold: 1, unlocked: false },
  { id: '2', title: '多产编剧', description: '创建5个剧本', icon: '📚', conditionType: 'SCRIPT_COUNT', threshold: 5, unlocked: false },
  { id: '3', title: '导演万岁', description: '发送20条消息', icon: '🎬', conditionType: 'MESSAGE_COUNT', threshold: 20, unlocked: false },
  { id: '4', title: '幕后黑手', description: '亲自扮演角色', icon: '🎭', conditionType: 'CHAR_CONTROL', threshold: 1, unlocked: false },
  { id: '5', title: '模版大师', description: '创建一个模版', icon: '📐', conditionType: 'TEMPLATE_CREATE', threshold: 1, unlocked: false },
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

const Avatar = ({ url, name, size = 'md' }: { url?: string, name: string, size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-sm", lg: "w-24 h-24 text-lg", xl: "w-48 h-48 text-2xl" };
  if (url) return <img src={url} alt={name} className={`${sizeClasses[size]} rounded-full object-cover border-2 border-zinc-700 shadow-md flex-shrink-0`} />;
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center border-2 border-zinc-700 shadow-md text-zinc-400 font-bold select-none flex-shrink-0`}>
      {name.substring(0, 2).toUpperCase()}
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
          {loading ? "Magic..." : "AI Improve"}
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
    return saved ? JSON.parse(saved) : { apiKey: '' };
  });

  // --- App View State ---
  const [view, setView] = useState<'DASHBOARD' | 'EDITOR' | 'STAGE'>('DASHBOARD');
  const [editorStep, setEditorStep] = useState<1 | 2>(1);
  const [dashboardTab, setDashboardTab] = useState<'SCRIPTS' | 'TEMPLATES' | 'COMMUNITY' | 'ACHIEVEMENTS'>('SCRIPTS');
  const [scripts, setScripts] = useState<Script[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('skena_achievements');
    return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
  });

  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  
  // --- Stage/Director State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [turnProcessing, setTurnProcessing] = useState(false);
  const [userInputs, setUserInputs] = useState<{[key: string]: string}>({});
  const [directorInput, setDirectorInput] = useState('');
  
  // Director Queue Buffer for God Mode
  const directorQueueRef = useRef<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [notification, setNotification] = useState<{title: string, msg: string, type?: 'error' | 'success'} | null>(null);

  const t = TRANSLATIONS[lang];

  // --- Auth Effects ---
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setScripts(authService.getScripts(user.id));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      authService.saveScripts(currentUser.id, scripts);
    }
  }, [scripts, currentUser]);

  useEffect(() => {
    if (view === 'STAGE' && chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentScript?.history, view]);

  // --- Game Loop ---
  useEffect(() => {
    if (!currentScript || view !== 'STAGE') return;
    if (!isPlaying && !turnProcessing) return;
    if (turnProcessing) return;

    const gameLoop = async () => {
      setTurnProcessing(true);
      try {
        if (!appSettings.apiKey && !process.env.API_KEY) throw new Error("No API Key");

        // CHECK DIRECTOR QUEUE (God Mode Logic)
        let forcedCommand = null;
        if (directorQueueRef.current.length > 0) {
            forcedCommand = directorQueueRef.current.shift() || null;
            // We add the command to history as a narrator note so the model sees it in context
            if (forcedCommand) {
                const dirMsg: Message = {
                    id: crypto.randomUUID(), characterId: 'narrator', content: `(Director Command): ${forcedCommand}`, type: 'narration', timestamp: Date.now()
                };
                handleUpdateScriptHistory(dirMsg);
                // We also pass it explicitly to the service to force the prompt context override
            }
        }

        const nextBeat = await generateNextBeat(currentScript, forcedCommand, lang, appSettings);
        
        // Auto-Generate Image for Narration events
        let imageUrl = undefined;
        if (nextBeat.type === 'narration') {
            try {
                imageUrl = await generateSceneImage(nextBeat.content, currentScript.title, appSettings);
            } catch (err) {
                console.warn("Image gen failed", err);
            }
        }

        const newMessage: Message = {
          id: crypto.randomUUID(), characterId: nextBeat.characterId,
          content: nextBeat.content, type: nextBeat.type, timestamp: Date.now(),
          imageUrl: imageUrl
        };
        handleUpdateScriptHistory(newMessage);

      } catch (e: any) {
        console.error("Game loop error", e);
        setIsPlaying(false);
        if (e.message === "No API Key") {
            showNotification("Config Error", t.noKey, 'error');
            setShowSettings(true);
        } else {
             const isRateLimit = e?.status === 429 || e?.code === 429 || e?.message?.includes('429');
             if (isRateLimit) showNotification(t.rateLimitTitle, t.rateLimitMsg, 'error');
             else showNotification(t.errorTitle, e.message || t.errorMsg, 'error');
        }
      } finally {
        setTurnProcessing(false);
      }
    };
    
    // Faster loop: 1.5s
    const timer = setTimeout(gameLoop, 1500);
    return () => clearTimeout(timer);
  }, [isPlaying, currentScript, view, turnProcessing, lang, appSettings]);

  // --- Handlers ---

  const handleLogin = () => {
    if (!authInput.trim()) return;
    try {
      let user;
      if (authMode === 'LOGIN') user = authService.login(authInput);
      else user = authService.register(authInput);
      setCurrentUser(user);
      setScripts(authService.getScripts(user.id));
      setAuthInput('');
    } catch (e: any) {
      showNotification("Auth Error", e.message, 'error');
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setScripts([]);
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

  const handleCreateScript = async () => {
    if (!currentUser) return;
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    try {
      const blueprint = await generateScriptBlueprint(promptInput, lang, appSettings);
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
        lastUpdated: Date.now(),
        isTemplate: false
      };
      setScripts(prev => [newScript, ...prev]);
      setCurrentScript(newScript);
      setView('EDITOR');
      setEditorStep(1);
      setPromptInput('');
    } catch (e: any) {
      showNotification("Error", "Failed to generate scenario. Check API Key.", "error");
      if (e.message.includes("API Key")) setShowSettings(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateTemplate = () => {
    if (!currentUser) return;
    const newTemplate: Script = {
      id: crypto.randomUUID(), ownerId: currentUser.id, title: "新模版", premise: "", setting: "", plotPoints: [], possibleEndings: [], characters: [],
      history: [], lastUpdated: Date.now(), isTemplate: true, author: currentUser.username
    };
    setScripts(prev => [newTemplate, ...prev]);
    setCurrentScript(newTemplate);
    setView('EDITOR'); setEditorStep(1); setDashboardTab('TEMPLATES');
  };

  const handleDirectorMessage = () => {
    if (!directorInput.trim() || !currentScript) return;
    // Push to Buffer
    directorQueueRef.current.push(directorInput);
    setDirectorInput('');
    showNotification("Director", t.commandQueued, "success");
    // Ensure play is active to process the command
    if (!isPlaying) setIsPlaying(true);
  };

  const handleGenerateAvatar = async (charId: string) => {
    if (!currentScript) return;
    const char = currentScript.characters.find(c => c.id === charId);
    if (!char) return;
    try {
      const url = await generateAvatarImage(char, appSettings);
      const updatedChars = currentScript.characters.map(c => c.id === charId ? { ...c, avatarUrl: url } : c);
      updateScriptState({ ...currentScript, characters: updatedChars });
    } catch (e) {
      showNotification("Error", "Avatar generation failed.", "error");
    }
  };

  const handleRefine = async (text: string, fieldType: string, callback: (newText: string) => void) => {
    if (!currentScript) return;
    try {
      const refined = await refineText(text, fieldType, currentScript, lang, appSettings);
      callback(refined);
    } catch (e) {
      console.error("Refine failed", e);
    }
  };

  // --- Views ---

  if (!currentUser) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <div className="z-10 bg-zinc-900/80 backdrop-blur-xl p-10 rounded-3xl border border-zinc-700 shadow-2xl w-full max-w-md animate-fade-in">
           <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">{t.loginTitle}</h1>
              <p className="text-zinc-400">{t.loginSubtitle}</p>
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>

      <header className="w-full max-w-6xl px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
            <Clapperboard size={18} />
          </div>
          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 tracking-tight">{t.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setShowSettings(true)} icon={Settings} size="sm"></Button>
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
             <UserIcon size={14}/> {currentUser.username}
          </div>
          <Button variant="ghost" onClick={handleLogout} icon={LogOut} size="sm" className="text-zinc-600 hover:text-red-400"></Button>
        </div>
      </header>

      <section className="w-full max-w-4xl px-6 pt-8 pb-16 text-center z-10 flex flex-col items-center">
        <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight drop-shadow-2xl">{t.heroTitle}</h1>
        <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl leading-relaxed">{t.heroSubtitle}</p>
        <div className="w-full max-w-2xl relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative flex items-center bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-2 shadow-2xl transition-all group-hover:border-indigo-500/50">
            <Sparkles className="text-indigo-400 ml-4 mr-2" />
            <input type="text" value={promptInput} onChange={(e) => setPromptInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateScript()} placeholder={t.placeholder} className="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder-zinc-500 h-12" />
            <Button onClick={handleCreateScript} disabled={isGenerating || !promptInput} size="md" className="rounded-xl px-6 shadow-none">
              {isGenerating ? t.dreaming : t.create}
            </Button>
          </div>
        </div>
      </section>

      <main className="w-full max-w-6xl px-6 pb-20 z-10 flex-1">
        <div className="flex justify-center mb-10">
          <div className="flex bg-zinc-900/80 backdrop-blur p-1 rounded-full border border-zinc-800">
            {[ { id: 'SCRIPTS', label: t.myScripts, icon: Film }, { id: 'TEMPLATES', label: t.templates, icon: BookOpen }, { id: 'ACHIEVEMENTS', label: t.achievements, icon: Trophy } ].map(tab => (
              <button key={tab.id} onClick={() => setDashboardTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-2 rounded-full transition-all text-sm font-bold ${dashboardTab === tab.id ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="animate-fade-in">
          {dashboardTab === 'SCRIPTS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scripts.filter(s => !s.isTemplate).map(script => (
                <div key={script.id} onClick={() => { setCurrentScript(script); setView('STAGE'); }} className="group cursor-pointer bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:scale-[1.02] hover:shadow-2xl hover:border-indigo-500/30 transition-all flex flex-col h-[280px]">
                  <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 w-full" />
                  <div className="p-6 flex flex-col h-full">
                    <h3 className="font-bold text-xl text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-2">{script.title}</h3>
                    <p className="text-zinc-400 text-sm line-clamp-3 mb-auto">{script.premise}</p>
                    <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                       <div className="flex -space-x-2 pl-2">
                         {script.characters.slice(0, 3).map(c => <div key={c.id} className="relative"><Avatar name={c.name} url={c.avatarUrl} size="sm" /></div>)}
                       </div>
                       <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-indigo-600 transition-colors"><Play size={14} fill="currentColor" /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {dashboardTab === 'TEMPLATES' && <div className="text-center py-20 text-zinc-500"><Button onClick={handleCreateTemplate} icon={Plus} variant="primary">{t.createTemplate}</Button></div>}
          {dashboardTab === 'ACHIEVEMENTS' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {achievements.map(ach => (
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
  );

  const renderEditor = () => {
    if (!currentScript) return null;
    return (
      <div className="h-screen flex flex-col bg-zinc-950 animate-fade-in">
        <header className="flex-shrink-0 border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-900 z-10">
          <Button variant="ghost" onClick={() => setView('DASHBOARD')} icon={ChevronLeft}>{t.dashboard}</Button>
          <div className="flex items-center gap-4 text-sm font-bold text-zinc-500">
             <span className={editorStep === 1 ? 'text-white' : ''}>1. {t.setup}</span> / <span className={editorStep === 2 ? 'text-white' : ''}>2. {t.castSetup}</span>
          </div>
          <div className="flex gap-2">
            {editorStep === 1 ? <Button onClick={() => setEditorStep(2)} icon={ChevronRight}>{t.next}</Button> : <Button icon={Play} onClick={() => setView('STAGE')}>{t.startShow}</Button>}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {editorStep === 1 && (
              <>
                 <div><label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Title</label><input className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-2xl font-bold text-white outline-none" value={currentScript.title} onChange={e => updateScriptState({...currentScript, title: e.target.value})} /></div>
                 <SmartTextarea label={t.premise} value={currentScript.premise} onChange={e => updateScriptState({...currentScript, premise: e.target.value})} onAIRequest={async() => handleRefine(currentScript.premise, 'Premise', v => updateScriptState({...currentScript, premise: v}))} />
                 <SmartTextarea label="Setting" value={currentScript.setting} onChange={e => updateScriptState({...currentScript, setting: e.target.value})} onAIRequest={async() => handleRefine(currentScript.setting, 'Setting', v => updateScriptState({...currentScript, setting: v}))} />
                 <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">{t.plotPoints}</label>
                    <div className="space-y-2">{currentScript.plotPoints.map((p, i) => <input key={i} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-zinc-300 outline-none" value={p} onChange={e => { const pts = [...currentScript.plotPoints]; pts[i] = e.target.value; updateScriptState({...currentScript, plotPoints: pts}); }} />)}</div>
                 </div>
              </>
            )}
            {editorStep === 2 && (
              <div className="space-y-6">
                <Button variant="secondary" icon={Plus} onClick={() => updateScriptState({...currentScript, characters: [...currentScript.characters, { id: crypto.randomUUID(), name: "New Char", role: "Extra", personality: "Neutral", speakingStyle: "Normal", visualDescription: "...", isUserControlled: false }]})}>{t.addActor}</Button>
                {currentScript.characters.map((char, idx) => (
                  <div key={char.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex gap-6">
                    <div className="flex flex-col items-center gap-2"><Avatar name={char.name} url={char.avatarUrl} size="lg" /><Button size="sm" variant="secondary" onClick={() => handleGenerateAvatar(char.id)}>{t.genLook}</Button></div>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                       <input className="bg-zinc-950 border border-zinc-700 rounded p-2 text-sm" value={char.name} onChange={e => { const chars = [...currentScript.characters]; chars[idx].name = e.target.value; updateScriptState({...currentScript, characters: chars}); }} />
                       <input className="bg-zinc-950 border border-zinc-700 rounded p-2 text-sm" value={char.role} onChange={e => { const chars = [...currentScript.characters]; chars[idx].role = e.target.value; updateScriptState({...currentScript, characters: chars}); }} />
                       <div className="col-span-2"><SmartTextarea label={t.personality} value={char.personality} onChange={e => { const chars = [...currentScript.characters]; chars[idx].personality = e.target.value; updateScriptState({...currentScript, characters: chars}); }} onAIRequest={async () => handleRefine(char.personality, 'Personality', v => { const chars = [...currentScript.characters]; chars[idx].personality = v; updateScriptState({...currentScript, characters: chars}); })} /></div>
                       <div className="flex items-center gap-2 cursor-pointer" onClick={() => { const chars = [...currentScript.characters]; chars[idx].isUserControlled = !chars[idx].isUserControlled; updateScriptState({...currentScript, characters: chars}); }}>
                          <div className={`w-8 h-4 rounded-full ${char.isUserControlled ? 'bg-indigo-600' : 'bg-zinc-600'}`}/> <span className="text-xs uppercase font-bold text-zinc-500">{t.playerControlled}</span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  };

  const renderStage = () => {
    if (!currentScript) return null;
    const userCharacters = currentScript.characters.filter(c => c.isUserControlled);
    return (
      <div className="h-screen bg-zinc-950 flex flex-col">
        <header className="flex-shrink-0 border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-900/90 backdrop-blur z-10 shadow-lg">
          <div className="flex items-center gap-4">
             <Button variant="ghost" onClick={() => { setIsPlaying(false); setView('DASHBOARD'); }}>{t.exit}</Button>
             <div><h1 className="font-bold text-zinc-100">{currentScript.title}</h1><p className="text-xs text-indigo-400 uppercase tracking-widest font-semibold">{t.liveStage}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${isPlaying ? 'bg-red-900/30 text-red-500 border border-red-900/50' : 'bg-zinc-800 text-zinc-500'}`}>
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />{isPlaying ? t.onAir : t.paused}
            </div>
            {isPlaying ? <Button onClick={() => setIsPlaying(false)} icon={Pause} variant="secondary">Pause</Button> : <Button onClick={() => setIsPlaying(true)} icon={Play} variant="primary">Action</Button>}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth bg-zinc-950/50">
          {currentScript.history.map((msg) => {
            const char = currentScript.characters.find(c => c.id === msg.characterId);
            const isUser = char?.isUserControlled;
            if (msg.type === 'narration') {
              return (
                <div key={msg.id} className="flex flex-col items-center my-8 animate-fade-in group w-full">
                   <div className="max-w-2xl text-center relative p-6 bg-zinc-900 border-y-2 border-amber-900/30 shadow-2xl rounded-sm">
                     <div className="text-amber-500/50 text-xs font-bold uppercase tracking-[0.2em] mb-2 font-serif">Narrator</div>
                     <p className="text-zinc-300 font-serif text-lg leading-relaxed italic">{msg.content}</p>
                   </div>
                   {msg.imageUrl && <div className="mt-4 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 max-w-2xl w-full animate-fade-in"><img src={msg.imageUrl} alt="Scene" className="w-full h-auto object-cover" /></div>}
                </div>
              );
            }
            if (msg.type === 'action') return <div key={msg.id} className="flex gap-4 max-w-3xl mx-auto items-start opacity-90 animate-fade-in my-2"><div className="mt-1"><Avatar name={char?.name || "?"} url={char?.avatarUrl} size="sm" /></div><div className="text-zinc-400 text-sm italic border-l-2 border-zinc-700 pl-3 py-1"><span className="font-bold text-zinc-300 not-italic mr-2">{char?.name}</span>{msg.content}</div></div>;
            return (
              <div key={msg.id} className={`flex gap-4 max-w-3xl mx-auto animate-fade-in ${isUser ? 'flex-row-reverse' : ''} my-4`}>
                <div className="flex-shrink-0 mt-2 transform hover:scale-105 transition-transform"><Avatar name={char?.name || "?"} url={char?.avatarUrl} size="md" /></div>
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
                  <span className="text-xs text-zinc-500 mb-1 ml-1 font-bold tracking-wide">{char?.name}</span>
                  <div className={`px-6 py-4 rounded-2xl text-zinc-100 shadow-xl leading-relaxed text-md ${isUser ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-tr-none border border-indigo-500/30' : 'bg-zinc-800 rounded-tl-none border border-zinc-700'}`}>{msg.content}</div>
                </div>
              </div>
            );
          })}
          {turnProcessing && <div className="flex justify-center py-4"><div className="flex gap-1"><div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce delay-0"></div><div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce delay-150"></div><div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce delay-300"></div></div></div>}
          <div ref={chatEndRef} />
        </main>

        <footer className="flex-shrink-0 bg-zinc-900 border-t border-zinc-800 p-4 transition-all duration-500 z-10 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4 bg-black/40 p-1.5 rounded-lg flex gap-2 border border-zinc-800/50 shadow-inner">
               <span className="text-amber-500 px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-r border-zinc-700 select-none whitespace-nowrap bg-amber-900/10 rounded"><Wand2 size={14}/> {t.directorMode}</span>
               <input className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-300 placeholder-zinc-600 px-2" placeholder={t.directorPlaceholder} value={directorInput} onChange={(e) => setDirectorInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleDirectorMessage()} />
               <button onClick={handleDirectorMessage} disabled={!directorInput.trim()} className="text-amber-500 hover:text-white disabled:opacity-30 text-xs font-bold px-4 uppercase bg-amber-500/10 hover:bg-amber-500/20 rounded transition-colors">{t.inject}</button>
            </div>
            {userCharacters.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                  {userCharacters.map(char => (
                    <div key={char.id} className="snap-center flex-1 min-w-[300px] bg-zinc-800 p-4 rounded-xl border-2 border-zinc-700 focus-within:border-indigo-500 shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                      <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><Avatar name={char.name} url={char.avatarUrl} size="sm" /><div><span className="text-sm font-bold text-white block">{char.name}</span><span className="text-[10px] text-zinc-500 uppercase">{char.role}</span></div></div></div>
                      <div className="relative"><textarea className="w-full bg-black/30 border border-zinc-700/50 rounded-lg p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:bg-black/50 transition-all resize-none h-20" placeholder={`${t.directorNote} (${char.speakingStyle})...`} value={userInputs[char.id] || ''} onChange={(e) => setUserInputs(prev => ({...prev, [char.id]: e.target.value}))} /></div>
                    </div>
                  ))}
                </div>
            ) : <div className="flex justify-center items-center gap-4 text-zinc-500 text-sm py-2"><Users size={16} /><span>{t.observerMode}</span>{!isPlaying && <Button size="sm" variant="secondary" onClick={() => setIsPlaying(true)}>{t.resumeAuto}</Button>}</div>}
          </div>
        </footer>
      </div>
    );
  };

  return (
    <>
       {notification && <div className={`fixed top-6 right-6 z-50 animate-fade-in text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border ${notification.type === 'error' ? 'bg-red-600 border-red-400/50' : 'bg-indigo-600 border-indigo-400/50'}`}><div><h4 className="font-bold text-sm uppercase tracking-wider">{notification.title}</h4><p className="text-sm font-medium">{notification.msg}</p></div></div>}
       {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings className="text-indigo-500"/> {t.settings}</h2><button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button></div>
              <div className="space-y-4">
                 <div><label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Gemini API Key</label><input className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" type="password" value={appSettings.apiKey} onChange={e => setAppSettings(prev => ({...prev, apiKey: e.target.value}))} placeholder="AIzaSy..." /><p className="text-xs text-zinc-500 mt-2">{t.apiKeyHint}</p></div>
                 <Button onClick={handleSaveSettings} className="w-full">{t.saveSettings}</Button>
              </div>
           </div>
        </div>
      )}
      {view === 'DASHBOARD' && renderDashboard()}
      {view === 'EDITOR' && renderEditor()}
      {view === 'STAGE' && renderStage()}
    </>
  );
}
