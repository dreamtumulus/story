
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Play, Pause, Save, Settings, 
  Sparkles, MessageSquare, Edit3, Trash2, 
  ChevronRight, ChevronLeft, Image as ImageIcon,
  Users, Globe, Trophy, Share2, Download, Copy, Star, Mic, Send,
  Wand2, RefreshCw, LayoutDashboard, Film, BookOpen, Crown, Clapperboard,
  LogOut, User as UserIcon, Key, X, AlertCircle, Loader2, Shuffle,
  Cloud, Zap
} from 'lucide-react';
import { Script, Character, Message, Language, Achievement, User, AppSettings } from './types';
import { 
    generateScriptBlueprint, generateNextBeat, generateAvatarImage, 
    refineText, generateSceneImage, regenerateFuturePlot, generateSingleCharacter 
} from './services/aiService';
import { authService } from './services/authService';

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
    personality: "性格特征",
    speakingStyle: "语言风格",
    visual: "外貌描述",
    yourCue: "轮到你表演了",
    directorNote: "导演提示：请根据角色性格输入对话",
    aiComplete: "AI补全/优化",
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
  },
  'en-US': {
    title: "Daydreaming",
    subtitle: "Micro-Theater",
    heroTitle: "Daydreaming Made Real",
    heroSubtitle: "Every wild thought is a scene waiting to happen. The AI Director is ready.",
    dashboard: "Dashboard",
    myScripts: "My Dreams",
    templates: "Templates",
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
    role: "Role",
    personality: "Personality",
    speakingStyle: "Style",
    visual: "Visual",
    yourCue: "Your Cue",
    directorNote: "Director's Note",
    aiComplete: "AI Complete",
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

const Avatar = ({ url, name, size = 'md' }: { url?: string, name: string, size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-sm", lg: "w-24 h-24 text-lg", xl: "w-48 h-48 text-2xl" };
  if (url) return <img src={url} alt={name} className={`${sizeClasses[size]} rounded-full object-cover border-2 border-zinc-700 shadow-md flex-shrink-0 bg-zinc-800`} />;
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border-2 border-zinc-700 shadow-md text-zinc-400 font-bold select-none flex-shrink-0`}>
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
    // Default to GEMINI if not set
    return saved ? JSON.parse(saved) : { apiKey: '', activeProvider: 'GEMINI' };
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
  const [isReconstructing, setIsReconstructing] = useState(false);
  
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
    if (!isPlaying && !turnProcessing && !isReconstructing) {
       // Just a guard
    }
    if (turnProcessing || isReconstructing || !isPlaying) return;

    const gameLoop = async () => {
      setTurnProcessing(true);
      try {
        // Default Key now handled in aiService, so we don't throw here if empty
        
        // CHECK DIRECTOR QUEUE (God Mode Logic)
        let forcedCommand = null;
        if (directorQueueRef.current.length > 0) {
            forcedCommand = directorQueueRef.current.shift() || null;
            
            // IF COMMAND EXISTS: Trigger Butterfly Effect
            if (forcedCommand) {
                setIsPlaying(false);
                setIsReconstructing(true);
                
                // 1. Regenerate Future Plot
                const newPlot = await regenerateFuturePlot(currentScript, forcedCommand, appSettings);
                updateScriptState({ ...currentScript, plotPoints: newPlot });
                
                // 2. Inject command into history
                const dirMsg: Message = {
                    id: crypto.randomUUID(), characterId: 'narrator', content: `[SYSTEM OVERRIDE]: ${forcedCommand}`, type: 'narration', timestamp: Date.now()
                };
                handleUpdateScriptHistory(dirMsg);

                // 3. Resume
                setIsReconstructing(false);
                setIsPlaying(true); // Restart loop to handle reaction
                setTurnProcessing(false);
                return; // Exit this loop iteration to allow state to settle
            }
        }

        const nextBeat = await generateNextBeat(currentScript, forcedCommand, lang, appSettings);
        
        let imageUrl = undefined;
        if (nextBeat.type === 'narration') {
            try {
                imageUrl = await generateSceneImage(nextBeat.content, currentScript.title, appSettings);
            } catch (err) {
                // Ignore image fail
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
        if (e.message?.includes("API Key")) {
            showNotification("Config Error", t.noKey, 'error');
            setShowSettings(true);
        }
      } finally {
        setTurnProcessing(false);
      }
    };
    
    const timer = setTimeout(gameLoop, 1500);
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

  // Modified to trigger avatar generation automatically
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
      
      // Auto-generate avatars for all characters
      showNotification("Magic", t.autoAvatarGen);
      newScript.characters.forEach(c => handleGenerateAvatar(c, newScript.id));

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
    directorQueueRef.current.push(directorInput);
    setDirectorInput('');
    // Ensure play is active to process the command
    if (!isPlaying) setIsPlaying(true);
  };

  const handleGenerateAvatar = async (char: Character, scriptId?: string) => {
    // If scriptId is provided, we might be in background mode, so we update the script in the main list
    // Otherwise we use currentScript
    const targetScript = scriptId ? scripts.find(s => s.id === scriptId) : currentScript;
    if (!targetScript) return;
    
    try {
      const url = await generateAvatarImage(char, appSettings);
      
      // Update logic handled differently if we are updating state vs just list
      if (currentScript && currentScript.id === targetScript.id) {
          const updatedChars = currentScript.characters.map(c => c.id === char.id ? { ...c, avatarUrl: url } : c);
          updateScriptState({ ...currentScript, characters: updatedChars });
      } else {
          // Background update for non-active script
          setScripts(prev => prev.map(s => {
              if (s.id === targetScript.id) {
                  return { ...s, characters: s.characters.map(c => c.id === char.id ? { ...c, avatarUrl: url } : c) };
              }
              return s;
          }));
      }
    } catch (e: any) {
      // Silent fail or simple log for background tasks to avoid spam
      console.warn("Avatar gen failed for", char.name);
    }
  };

  const handleAiAddCharacter = async () => {
      if (!currentScript) return;
      try {
          const newChar = await generateSingleCharacter(currentScript, appSettings);
          // Auto gen avatar for new char
          const scriptId = currentScript.id;
          handleGenerateAvatar(newChar, scriptId);
          
          updateScriptState({...currentScript, characters: [...currentScript.characters, newChar]});
      } catch (e) {
          showNotification("Error", "Failed to create character", "error");
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

  const handleRefinePlotPoint = async (index: number) => {
      if (!currentScript) return;
      const point = currentScript.plotPoints[index];
      await handleRefine(point, `Plot Point ${index+1}`, (newText) => {
          const pts = [...currentScript.plotPoints];
          pts[index] = newText;
          updateScriptState({...currentScript, plotPoints: pts});
      });
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>

      <header className="w-full max-w-6xl px-6 py-6 flex justify-between items-center z-10">
        <Logo />
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
          {dashboardTab === 'TEMPLATES' && <div className="text-center py-20 text-zinc-500"><Button onClick={handleCreateTemplate} icon={Plus} variant="primary">{t.createTemplate}</Button></div>}
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
  );

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
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                    {(currentScript.characters || []).map((char, idx) => (
                    <div key={char.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex gap-6 hover:shadow-xl transition-all">
                        <div className="flex flex-col items-center gap-3">
                            <Avatar name={char.name} url={char.avatarUrl} size="lg" />
                            <Button size="sm" variant="secondary" onClick={() => handleGenerateAvatar(char)} className="text-xs px-2 py-1 h-8">{t.genLook}</Button>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 block">{t.name}</label>
                            <input className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" value={char.name} onChange={e => { const chars = [...currentScript.characters]; chars[idx].name = e.target.value; updateScriptState({...currentScript, characters: chars}); }} />
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
                    <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
                    <Loader2 size={48} className="text-indigo-400 animate-spin relative z-10" />
                </div>
                <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mt-6 tracking-tight">{t.reconstructing}</h2>
                <p className="text-zinc-500 mt-2 font-mono text-sm">{t.commandQueued}</p>
            </div>
        )}

        <header className="flex-shrink-0 border-b border-zinc-800/50 p-4 flex justify-between items-center bg-zinc-900/60 backdrop-blur-xl z-20 shadow-lg">
          <div className="flex items-center gap-4">
             <Button variant="ghost" onClick={() => { setIsPlaying(false); setView('DASHBOARD'); }} className="hover:bg-white/10">{t.exit}</Button>
             <div>
                <h1 className="font-bold text-zinc-100 text-lg tracking-tight drop-shadow-md flex items-center gap-2">
                    {currentScript.title} 
                    {appSettings.activeProvider === 'OPENROUTER' && <span className="text-[9px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-700">OPENROUTER</span>}
                </h1>
                <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold opacity-80">{t.liveStage}</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-colors ${isPlaying ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50'}`}>
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />{isPlaying ? t.onAir : t.paused}
            </div>
            {isPlaying ? 
                <Button onClick={() => setIsPlaying(false)} icon={Pause} variant="secondary" className="bg-zinc-800/80 backdrop-blur border-zinc-700 hover:bg-zinc-700">Pause</Button> : 
                <Button onClick={() => setIsPlaying(true)} icon={Play} variant="primary" className="shadow-indigo-500/20">Action</Button>
            }
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth z-10">
          {(currentScript.history || []).map((msg, idx) => {
            const char = currentScript.characters.find(c => c.id === msg.characterId);
            const isUser = char?.isUserControlled;
            
            // Narration Card
            if (msg.type === 'narration') {
              return (
                <div key={msg.id} className="flex flex-col items-center my-10 animate-slide-up w-full">
                   <div className="relative max-w-3xl w-full">
                     <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-900/40 to-transparent"></div>
                     <div className="relative z-10 mx-auto max-w-2xl text-center p-8 bg-zinc-950/80 backdrop-blur-md border-y border-zinc-800/50 shadow-2xl rounded-sm">
                       <div className="text-amber-500/70 text-xs font-bold uppercase tracking-[0.3em] mb-4 flex items-center justify-center gap-2">
                          <span className="w-8 h-[1px] bg-amber-500/50"></span> SCENE <span className="w-8 h-[1px] bg-amber-500/50"></span>
                       </div>
                       <p className="text-zinc-200 font-serif text-xl leading-relaxed tracking-wide italic antialiased">{msg.content}</p>
                     </div>
                   </div>
                   {msg.imageUrl && (
                       <div className="mt-6 rounded-lg overflow-hidden shadow-2xl border border-zinc-800/50 max-w-2xl w-full animate-fade-in ring-1 ring-white/5">
                           <img src={msg.imageUrl} alt="Scene" className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity duration-700" />
                       </div>
                   )}
                </div>
              );
            }
            
            // Action Text
            if (msg.type === 'action') {
                return (
                    <div key={msg.id} className="flex gap-4 max-w-4xl mx-auto items-center justify-center animate-slide-up my-4 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="text-zinc-500 text-sm font-medium italic px-4 py-1 rounded-full bg-zinc-900/50 border border-zinc-800/50 flex items-center gap-2">
                             <span className="text-zinc-300 not-italic font-bold">{char?.name}</span> {msg.content}
                        </div>
                    </div>
                );
            }

            // Dialogue Bubble (IMPROVED UI for Distinction)
            return (
              <div key={msg.id} className={`flex gap-6 max-w-5xl mx-auto animate-slide-up ${isUser ? 'flex-row-reverse' : ''} group my-8`}>
                <div className={`flex-shrink-0 mt-4 transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg rounded-full z-10 ${isUser ? 'order-1' : 'order-first'}`}>
                    <div className={`rounded-full p-1 ${isUser ? 'bg-gradient-to-br from-indigo-500 to-purple-500' : 'bg-gradient-to-br from-zinc-600 to-zinc-800'}`}>
                        <Avatar name={char?.name || "?"} url={char?.avatarUrl} size="lg" />
                    </div>
                </div>
                
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] relative`}>
                  {/* Distinct background box for speaker clarity */}
                  <div className={`absolute -inset-4 rounded-xl -z-10 blur-xl opacity-0 transition-opacity group-hover:opacity-100 ${isUser ? 'bg-indigo-900/20' : 'bg-zinc-800/20'}`}></div>
                  
                  {/* Speaker Name Tag */}
                  <span className={`text-[10px] mb-1.5 px-3 py-0.5 rounded-full font-bold tracking-widest uppercase border backdrop-blur-sm shadow-sm ${isUser ? 'bg-indigo-900/50 text-indigo-200 border-indigo-500/30' : 'bg-zinc-800/50 text-zinc-400 border-zinc-700'}`}>
                    {char?.name} • {char?.role}
                  </span>
                  
                  <div className={`
                    relative px-8 py-6 shadow-2xl backdrop-blur-md border
                    text-lg md:text-xl font-medium leading-relaxed tracking-wide
                    ${isUser 
                        ? 'bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl rounded-tr-sm border-indigo-400/20 text-white shadow-indigo-900/20' 
                        : 'bg-zinc-800/95 rounded-2xl rounded-tl-sm border-zinc-700/50 text-zinc-100 shadow-black/40'
                    }
                  `}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
          
          {turnProcessing && (
              <div className="flex justify-center py-8 animate-pulse">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800/50">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-0"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150"></div>
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-300"></div>
                      <span className="text-xs font-bold text-zinc-500 ml-2 uppercase tracking-wider">Generating</span>
                  </div>
              </div>
          )}
          <div ref={chatEndRef} className="h-4" />
        </main>

        <footer className="flex-shrink-0 bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-800/50 p-6 z-20 shadow-2xl relative">
          <div className="max-w-4xl mx-auto space-y-4">
            
            {/* Director Input Bar */}
            <div className="bg-black/40 p-1 rounded-xl flex gap-2 border border-zinc-800/50 shadow-inner group focus-within:border-amber-900/50 transition-colors">
               <div className="px-3 flex items-center justify-center bg-zinc-900/50 rounded-lg mr-1">
                   <span className="text-amber-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2 select-none">
                       <Clapperboard size={14} className="text-amber-500"/>
                   </span>
               </div>
               <input 
                  className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-200 placeholder-zinc-600 px-2 py-3 font-medium" 
                  placeholder={t.directorPlaceholder} 
                  value={directorInput} 
                  onChange={(e) => setDirectorInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleDirectorMessage()} 
               />
               <button 
                  onClick={handleDirectorMessage} 
                  disabled={!directorInput.trim()} 
                  className="text-amber-500 hover:text-amber-950 disabled:opacity-30 text-xs font-bold px-5 uppercase bg-amber-500/10 hover:bg-amber-500 rounded-lg transition-all"
               >
                  {t.inject}
               </button>
            </div>

            {/* User Controls */}
            {userCharacters.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2 pt-2 snap-x scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                  {userCharacters.map(char => (
                    <div key={char.id} className="snap-center flex-1 min-w-[320px] bg-zinc-800/80 backdrop-blur p-4 rounded-xl border border-zinc-700/50 hover:border-indigo-500/50 hover:bg-zinc-800 transition-all shadow-lg relative overflow-hidden group">
                      <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                              <div className="ring-2 ring-indigo-500/30 rounded-full"><Avatar name={char.name} url={char.avatarUrl} size="sm" /></div>
                              <div>
                                  <span className="text-sm font-bold text-white block tracking-wide">{char.name}</span>
                                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{char.role}</span>
                              </div>
                          </div>
                      </div>
                      <div className="relative">
                          <textarea 
                              className="w-full bg-zinc-950/50 border border-zinc-700/50 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-950 transition-all resize-none h-20 leading-relaxed" 
                              placeholder={`${t.directorNote} (${char.speakingStyle})...`} 
                              value={userInputs[char.id] || ''} 
                              onChange={(e) => setUserInputs(prev => ({...prev, [char.id]: e.target.value}))} 
                          />
                      </div>
                    </div>
                  ))}
                </div>
            ) : (
                <div className="flex justify-center items-center gap-3 text-zinc-500 text-sm py-4 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">
                    <Users size={16} />
                    <span className="font-medium tracking-wide">{t.observerMode}</span>
                    {!isPlaying && <Button size="sm" variant="secondary" onClick={() => setIsPlaying(true)} className="ml-2">{t.resumeAuto}</Button>}
                </div>
            )}
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
                 
                 {/* Provider Switch */}
                 <div className="bg-zinc-950 p-1 rounded-lg flex border border-zinc-800">
                     <button onClick={() => setAppSettings(p => ({...p, activeProvider: 'GEMINI'}))} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${(!appSettings.activeProvider || appSettings.activeProvider === 'GEMINI') ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>GEMINI (Google)</button>
                     <button onClick={() => setAppSettings(p => ({...p, activeProvider: 'OPENROUTER'}))} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${appSettings.activeProvider === 'OPENROUTER' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>OPENROUTER</button>
                 </div>

                 {(!appSettings.activeProvider || appSettings.activeProvider === 'GEMINI') && (
                     <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">{t.geminiKey}</label>
                        <input className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none placeholder-zinc-600" type="password" value={appSettings.apiKey || ''} onChange={e => setAppSettings(prev => ({...prev, apiKey: e.target.value}))} placeholder={t.apiKeyHint} />
                        <p className="text-[10px] text-zinc-500 mt-2">{t.apiKeyHint}</p>
                     </div>
                 )}

                 {appSettings.activeProvider === 'OPENROUTER' && (
                     <div className="space-y-4 animate-fade-in">
                         <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">{t.openRouterKey}</label>
                            <input className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none placeholder-zinc-600" type="password" value={appSettings.openRouterKey || ''} onChange={e => setAppSettings(prev => ({...prev, openRouterKey: e.target.value}))} placeholder="sk-or-..." />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">{t.openRouterModel}</label>
                            <input className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none placeholder-zinc-600" type="text" value={appSettings.openRouterModel || ''} onChange={e => setAppSettings(prev => ({...prev, openRouterModel: e.target.value}))} placeholder="google/gemini-2.0-flash-lite-preview-02-05:free" />
                         </div>
                     </div>
                 )}

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