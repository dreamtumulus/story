
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Play, Pause, Save, Settings, 
  Sparkles, MessageSquare, Edit3, Trash2, 
  ChevronRight, ChevronLeft, Image as ImageIcon,
  Users, Globe, Trophy, Share2, Download, Copy, Star, Mic, Send,
  Wand2, RefreshCw, LayoutDashboard, Film, BookOpen, Crown, Clapperboard,
  LogOut, User as UserIcon, Key, X, AlertCircle, Loader2, Shuffle,
  Cloud, Zap, SkipForward, Upload, Heart, Smile, BrainCircuit, Video,
  Filter, FileText, Book, CheckCircle, ArrowRight
} from 'lucide-react';
import { Script, Character, Message, Language, Achievement, User, AppSettings, GlobalCharacter, ChatMessage, ChatSession, NovelStyle } from './types';
import { 
    generateNextBeat, generateAvatarImage, 
    refineText, generateSceneImage, regenerateFuturePlot, generateSingleCharacter,
    completeCharacterProfile, chatWithCharacter, evolveCharacterFromChat,
    generateNextChapterPlan, autoCompleteStory, generateNovelVersion,
    refineCharacterTrait, generateScriptBasic, generateNextPlotSegment
} from './services/aiService';
import { authService } from './services/authService';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const NOVEL_STYLES_MAP: Record<NovelStyle, string> = {
    'STANDARD': '标准小说风格',
    'JIN_YONG': '金庸 (武侠风格)',
    'CIXIN_LIU': '刘慈欣 (科幻风格)',
    'HEMINGWAY': '海明威 (简洁有力)',
    'AUSTEN': '简·奥斯汀 (细腻情感)',
    'LU_XUN': '鲁迅 (犀利讽刺)'
};

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, errorMsg: string}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error?.message || 'Unknown Error' };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught Error in Component:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-center p-8">
           <AlertCircle size={64} className="text-red-500 mb-6" />
           <h1 className="text-3xl font-bold text-white mb-2">出错了 (Something went wrong)</h1>
           <p className="text-zinc-500 mb-8 max-w-md">界面渲染时发生意外错误。请尝试刷新页面。</p>
           <button onClick={() => window.location.reload()} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold">刷新页面</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CHAR_COLORS = ['#fca5a5', '#86efac', '#93c5fd', '#fcd34d', '#d8b4fe', '#f472b6', '#67e8f9', '#cbd5e1', '#fdba74', '#a5b4fc'];
const getCharacterColor = (charId: string) => {
    if (charId === 'narrator') return '#fbbf24';
    let hash = 0;
    for (let i = 0; i < charId.length; i++) hash = charId.charCodeAt(i) + ((hash << 5) - hash);
    return CHAR_COLORS[Math.abs(hash) % CHAR_COLORS.length];
};

const Logo = ({ className = "" }: { className?: string }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative w-8 h-8 flex items-center justify-center">
            <Cloud className="text-white w-8 h-8 drop-shadow-[0_0_10px_rgba(165,180,252,0.5)]" fill="currentColor" fillOpacity={0.2} strokeWidth={2.5} />
            <Play size={10} className="absolute text-indigo-600 fill-indigo-600 ml-0.5" />
        </div>
        <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white tracking-tight">Daydreaming (梦幻微剧场)</span>
    </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, size = 'md' }: any) => {
  const sizeClasses: any = { sm: "px-3 py-1.5 text-sm", md: "px-5 py-2.5", lg: "px-8 py-4 text-lg" };
  const base = "flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
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

const Avatar = ({ url, name, size = 'md' }: any) => {
  const sizeClasses: any = { sm: "w-8 h-8 text-xs", md: "w-12 h-12 text-sm", lg: "w-24 h-24 text-lg", xl: "w-48 h-48 text-2xl", '2xl': "w-64 h-64 text-4xl" };
  if (url) return <img src={url} alt={name} className={`${sizeClasses[size]} rounded-full object-cover border-2 border-zinc-700 shadow-xl flex-shrink-0 bg-zinc-800`} />;
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border-2 border-zinc-700 shadow-xl text-zinc-400 font-bold select-none flex-shrink-0`}>
      {name ? name.substring(0, 2).toUpperCase() : '?'}
    </div>
  );
};

const SmartTextarea = ({ value, onChange, onAIRequest, label, rows = 3, placeholder = "" }: any) => {
  const [loading, setLoading] = useState(false);
  const handleAI = async () => { setLoading(true); await onAIRequest(); setLoading(false); };
  return (
    <div className="relative group">
      <div className="flex justify-between items-center mb-1">
        <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">{label}</label>
        <button onClick={handleAI} disabled={loading} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors bg-indigo-500/10 px-2 py-0.5 rounded hover:bg-indigo-500/20">
          {loading ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />} AI优化
        </button>
      </div>
      <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 focus:border-indigo-500 outline-none resize-none transition-all shadow-sm group-hover:border-zinc-700" rows={rows} value={value} onChange={onChange} placeholder={placeholder}/>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
       <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authInput, setAuthInput] = useState('');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [lang, setLang] = useState<Language>('zh-CN');
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('skena_settings');
    return saved ? JSON.parse(saved) : { apiKey: '', activeProvider: 'GEMINI' };
  });

  // Views: DASHBOARD -> CHAR_SELECT -> PLOT_BUILDER -> STAGE (Group Chat UI)
  const [view, setView] = useState<'DASHBOARD' | 'CHAR_SELECT' | 'PLOT_BUILDER' | 'STAGE' | 'CHAT'>('DASHBOARD');
  
  const [dashboardTab, setDashboardTab] = useState<'SCRIPTS' | 'TEMPLATES' | 'CHARACTERS' | 'COMMUNITY' | 'ACHIEVEMENTS'>('CHARACTERS');
  const [scripts, setScripts] = useState<Script[]>([]);
  const [globalCharacters, setGlobalCharacters] = useState<GlobalCharacter[]>([]);
  
  // Selection State
  const [selectedCastIds, setSelectedCastIds] = useState<string[]>([]);
  const [creationPrompt, setCreationPrompt] = useState('');

  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Plot Builder State
  const [isAddingPlot, setIsAddingPlot] = useState(false);

  // Stage State
  const [isPlaying, setIsPlaying] = useState(false);
  const [turnProcessing, setTurnProcessing] = useState(false);
  const [userInputs, setUserInputs] = useState<{[key: string]: string}>({});
  const [directorInput, setDirectorInput] = useState('');
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  
  // Other Modals
  const [showCharModal, setShowCharModal] = useState(false);
  const [editingChar, setEditingChar] = useState<Partial<GlobalCharacter> | null>(null);
  const [isCharAutoFilling, setIsCharAutoFilling] = useState(false);
  const [isAvatarGenerating, setIsAvatarGenerating] = useState(false);
  
  const [activeChatSession, setActiveChatSession] = useState<ChatSession | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [sessionUpdated, setSessionUpdated] = useState(false);

  const [showNovelModal, setShowNovelModal] = useState(false);
  const [novelStyle, setNovelStyle] = useState<NovelStyle>('STANDARD');
  const [generatedNovelText, setGeneratedNovelText] = useState('');
  const [isGeneratingNovel, setIsGeneratingNovel] = useState(false);
  const [autoCompleteNovel, setAutoCompleteNovel] = useState(false);

  const [notification, setNotification] = useState<{title: string, msg: string, type?: 'error' | 'success'} | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const directorQueueRef = useRef<string[]>([]);

  // Init
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          const [userScripts, userChars] = await Promise.all([
             authService.getScripts(user.id),
             authService.getGlobalCharacters(user.id)
          ]);
          setScripts(userScripts);
          setGlobalCharacters(userChars);
        }
      } catch (e) { console.error(e); } finally { setIsAppLoading(false); }
    };
    initAuth();
  }, []);

  // Sync
  useEffect(() => { if (currentUser) authService.saveScripts(currentUser.id, scripts); }, [scripts, currentUser]);
  useEffect(() => { if (currentUser) authService.saveGlobalCharacters(currentUser.id, globalCharacters); }, [globalCharacters, currentUser]);
  useEffect(() => { if (view === 'STAGE' && chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [currentScript?.history, view]);

  // Game Loop
  useEffect(() => {
    if (!currentScript || view !== 'STAGE') return;
    if (turnProcessing || isReconstructing || !isPlaying || isFastForwarding) return;

    const gameLoop = async () => {
      setTurnProcessing(true);
      try {
        let forcedCommand = null;
        if (directorQueueRef.current.length > 0) {
            forcedCommand = directorQueueRef.current.shift() || null;
            if (forcedCommand) {
                // Pause temporarily to handle reconstruction manually
                setIsPlaying(false);
                setIsReconstructing(true);
                const newPlot = await regenerateFuturePlot(currentScript, forcedCommand, appSettings);
                updateScriptState({ ...currentScript, plotPoints: newPlot });
                handleUpdateScriptHistory({ id: generateId(), characterId: 'narrator', content: `[系统]: ${forcedCommand}`, type: 'narration', timestamp: Date.now() });
                setIsReconstructing(false);
                setIsPlaying(true); // Resume
                setTurnProcessing(false);
                return;
            }
        }

        const currentPlotIndex = currentScript.currentPlotIndex || 0;
        const targetPlot = currentScript.plotPoints[currentPlotIndex] || currentScript.plotPoints[currentScript.plotPoints.length - 1];

        const nextBeat = await generateNextBeat(currentScript, forcedCommand, targetPlot, lang, appSettings);
        handleUpdateScriptHistory({ id: generateId(), characterId: nextBeat.characterId, content: nextBeat.content, type: nextBeat.type, timestamp: Date.now() });
      } catch (e: any) {
        setIsPlaying(false);
        showNotification("演绎暂停", `AI请求失败: ${e.message}`, 'error');
      } finally {
        setTurnProcessing(false);
      }
    };
    const timer = setTimeout(gameLoop, 800); // 稍微放慢一点节奏
    return () => clearTimeout(timer);
  }, [isPlaying, currentScript, view, turnProcessing, lang, appSettings, isReconstructing, isFastForwarding]);

  // Handlers
  const handleLogin = async () => {
    if (!authInput.trim()) return;
    try {
      let user;
      if (authMode === 'LOGIN') user = await authService.login(authInput);
      else user = await authService.register(authInput);
      setCurrentUser(user);
      setScripts(await authService.getScripts(user.id));
      setGlobalCharacters(await authService.getGlobalCharacters(user.id));
      setAuthInput('');
    } catch (e: any) { showNotification("Auth Error", e.message, 'error'); }
  };
  const handleLogout = () => { authService.logout(); setCurrentUser(null); setView('DASHBOARD'); };
  const showNotification = (title: string, msg: string, type: 'error' | 'success' = 'success') => { setNotification({title, msg, type}); setTimeout(() => setNotification(null), 5000); };
  
  const updateScriptState = (updatedScript: Script) => {
    updatedScript.lastUpdated = Date.now();
    setCurrentScript(updatedScript);
    setScripts(prev => prev.map(s => s.id === updatedScript.id ? updatedScript : s));
  };

  const handleUpdateScriptHistory = (message: Message) => {
    if (!currentScript) return;
    setCurrentScript(prev => {
        if (!prev) return null;
        const newScript = { ...prev, history: [...prev.history, message], lastUpdated: Date.now() };
        setScripts(all => all.map(s => s.id === newScript.id ? newScript : s));
        return newScript;
    });
  };

  // --- Step 1: Initialize Script from Selection ---
  const handleStartCreation = () => {
      setSelectedCastIds([]);
      setCreationPrompt('');
      setView('CHAR_SELECT');
  };

  const handleInitPlotBuilder = async () => {
      if (!currentUser || selectedCastIds.length === 0) {
          showNotification("提示", "请至少选择一位角色", 'error');
          return;
      }
      setIsGenerating(true);
      try {
          const cast = globalCharacters.filter(c => selectedCastIds.includes(c.id));
          const basicInfo = await generateScriptBasic(creationPrompt, cast, lang, appSettings);
          
          // Map GlobalCharacters to Script Characters
          const scriptChars: Character[] = cast.map(c => ({
              id: generateId(),
              name: c.name,
              role: "Protagonist",
              personality: c.personality || "普通",
              speakingStyle: c.speakingStyle || "正常",
              visualDescription: c.visualDescription || "普通人",
              avatarUrl: c.avatarUrl,
              isUserControlled: false,
              isGlobal: true,
              globalId: c.id,
              gender: c.gender || "未知",
              age: c.age || "未知"
          }));

          const newScript: Script = {
              id: generateId(),
              ownerId: currentUser.id,
              title: basicInfo.title,
              premise: creationPrompt,
              setting: basicInfo.setting,
              plotPoints: [], // Empty initially
              possibleEndings: [],
              characters: scriptChars,
              history: [],
              currentPlotIndex: 0,
              lastUpdated: Date.now()
          };
          
          setScripts(prev => [newScript, ...prev]);
          setCurrentScript(newScript);
          setView('PLOT_BUILDER');
      } catch (e) {
          showNotification("错误", "初始化剧本失败", 'error');
      } finally {
          setIsGenerating(false);
      }
  };

  // --- Step 2: Plot Building ---
  const handleAddNextScene = async () => {
      if (!currentScript) return;
      setIsAddingPlot(true);
      try {
          const nextPoint = await generateNextPlotSegment(currentScript, appSettings);
          updateScriptState({ ...currentScript, plotPoints: [...currentScript.plotPoints, nextPoint] });
      } catch (e) {
          showNotification("错误", "生成剧情失败", 'error');
      } finally {
          setIsAddingPlot(false);
      }
  };

  const handleStartShow = () => {
      if (!currentScript || currentScript.plotPoints.length === 0) {
          showNotification("请等待", "请至少创建一个剧情节点！", 'error');
          return;
      }
      
      // Explicitly Reset flags
      setTurnProcessing(false);
      setIsPlaying(true); // Auto-play on enter

      // Add initial narration if empty
      if (currentScript.history.length === 0) {
          const intro: Message = {
              id: generateId(), characterId: 'narrator', type: 'narration',
              content: `故事开始于：${currentScript.setting}。${currentScript.premise}`,
              timestamp: Date.now()
          };
          updateScriptState({...currentScript, history: [intro]});
      }
      setView('STAGE');
  };

  // --- Character & Chat Handlers (Similar to before) ---
  const handleSaveGlobalCharacter = async () => {
     if (!editingChar?.name || !currentUser) return;
     const newChar: GlobalCharacter = {
          id: editingChar.id || generateId(), ownerId: currentUser.id, name: editingChar.name,
          gender: editingChar.gender || "未知", age: editingChar.age || "未知",
          personality: editingChar.personality || "普通", speakingStyle: editingChar.speakingStyle || "正常",
          visualDescription: editingChar.visualDescription || "普通人", avatarUrl: editingChar.avatarUrl,
          createdAt: Date.now(), memories: editingChar.memories || [],
          role: editingChar.role
     };
     setGlobalCharacters(prev => {
         const exists = prev.find(c => c.id === newChar.id);
         return exists ? prev.map(c => c.id === newChar.id ? newChar : c) : [...prev, newChar];
     });
     if (!newChar.avatarUrl) {
         generateAvatarImage(newChar, appSettings).then(url => setGlobalCharacters(p => p.map(c => c.id === newChar.id ? {...c, avatarUrl: url} : c))).catch(()=>{});
     }
     setShowCharModal(false); setEditingChar(null);
  };

  // --- Render Views ---

  if (!currentUser) {
    return (
      <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center">
         <div className="z-10 bg-zinc-900 p-8 rounded-2xl border border-zinc-800 w-full max-w-sm">
             <Logo className="mb-6 justify-center scale-125"/>
             <div className="flex bg-zinc-800 p-1 rounded-lg mb-4">
                 <button className={`flex-1 py-1 text-sm ${authMode==='LOGIN'?'bg-zinc-700 text-white':'text-zinc-500'}`} onClick={()=>setAuthMode('LOGIN')}>登录</button>
                 <button className={`flex-1 py-1 text-sm ${authMode==='REGISTER'?'bg-zinc-700 text-white':'text-zinc-500'}`} onClick={()=>setAuthMode('REGISTER')}>注册</button>
             </div>
             <input className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white mb-4" value={authInput} onChange={e=>setAuthInput(e.target.value)} placeholder="用户名" />
             <Button onClick={handleLogin} className="w-full">{authMode === 'LOGIN' ? '进入剧场' : '创建账户'}</Button>
         </div>
      </div>
    );
  }

  const renderDashboard = () => (
      <div className="h-screen bg-zinc-950 flex flex-col relative overflow-hidden">
          <header className="p-6 flex justify-between items-center z-10 border-b border-zinc-800 bg-zinc-900/50">
             <Logo />
             <div className="flex gap-2">
                 <Button size="sm" variant="ghost" icon={Settings} onClick={() => setShowSettings(true)}/>
                 <Button size="sm" variant="ghost" icon={LogOut} onClick={handleLogout}/>
             </div>
          </header>
          <div className="flex-1 overflow-y-auto p-6 md:p-12 z-10">
              <div className="max-w-6xl mx-auto">
                   {/* Main Action Area */}
                   <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-zinc-800 rounded-3xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-8">
                       <div>
                           <h1 className="text-4xl font-bold text-white mb-4">开启你的故事</h1>
                           <p className="text-zinc-400 max-w-lg">选择角色，逐步构建剧情，实时演绎属于你的梦幻微剧。</p>
                       </div>
                       <Button size="lg" icon={Sparkles} onClick={handleStartCreation} className="shadow-xl scale-110">开始新故事</Button>
                   </div>

                   {/* Tabs */}
                   <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                       {['CHARACTERS', 'SCRIPTS'].map(t => (
                           <button key={t} onClick={() => setDashboardTab(t as any)} className={`px-4 py-2 rounded-full font-bold text-sm ${dashboardTab === t ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                               {t === 'CHARACTERS' ? '角色库' : '剧本列表'}
                           </button>
                       ))}
                   </div>
                   
                   {dashboardTab === 'CHARACTERS' && (
                       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                           <div onClick={() => { setEditingChar({}); setShowCharModal(true); }} className="cursor-pointer bg-zinc-900 border border-dashed border-zinc-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center p-6 transition-all">
                               <Plus className="text-zinc-500 mb-2"/>
                               <span className="text-sm font-bold text-zinc-400">新建角色</span>
                           </div>
                           {globalCharacters.map(c => (
                               <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all">
                                   <div className="flex justify-center mb-3"><Avatar name={c.name} url={c.avatarUrl} size="lg"/></div>
                                   <div className="text-center">
                                       <h3 className="font-bold text-white text-sm">{c.name}</h3>
                                       <p className="text-xs text-zinc-500">{c.gender}, {c.age}</p>
                                       <div className="flex justify-center gap-2 mt-3">
                                           <button onClick={() => { setEditingChar(c); setShowCharModal(true); }} className="p-1.5 bg-zinc-800 rounded text-zinc-400 hover:text-white"><Edit3 size={14}/></button>
                                       </div>
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
                   
                   {dashboardTab === 'SCRIPTS' && (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           {scripts.map(s => (
                               <div key={s.id} onClick={() => { setCurrentScript(s); setView('STAGE'); }} className="cursor-pointer bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-indigo-500/50 transition-all">
                                   <h3 className="font-bold text-white mb-2">{s.title}</h3>
                                   <p className="text-sm text-zinc-500 line-clamp-2">{s.premise}</p>
                                   <div className="mt-4 flex -space-x-2">
                                       {s.characters.slice(0,3).map(c => <Avatar key={c.id} name={c.name} url={c.avatarUrl} size="sm"/>)}
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
              </div>
          </div>
      </div>
  );

  const renderCharacterSelector = () => (
      <div className="h-screen bg-zinc-950 flex flex-col">
          <header className="p-6 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
              <Button variant="ghost" onClick={() => setView('DASHBOARD')} icon={ChevronLeft}>取消</Button>
              <h2 className="text-xl font-bold text-white">第一步：选择演员</h2>
              <Button disabled={selectedCastIds.length === 0} onClick={() => setView('PLOT_BUILDER')} icon={ArrowRight}>下一步</Button>
          </header>
          <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {globalCharacters.map(c => (
                      <div key={c.id} 
                           onClick={() => setSelectedCastIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                           className={`cursor-pointer rounded-2xl p-6 transition-all border-2 relative ${selectedCastIds.includes(c.id) ? 'bg-indigo-900/20 border-indigo-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
                          {selectedCastIds.includes(c.id) && <div className="absolute top-3 right-3 text-indigo-500"><CheckCircle size={20} fill="currentColor" className="text-white"/></div>}
                          <div className="flex justify-center mb-4"><Avatar name={c.name} url={c.avatarUrl} size="xl"/></div>
                          <div className="text-center">
                              <h3 className="font-bold text-white">{c.name}</h3>
                              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{c.personality}</p>
                          </div>
                      </div>
                  ))}
                  {globalCharacters.length === 0 && <div className="col-span-full text-center text-zinc-500 py-10">没有角色。请先在首页创建角色。</div>}
              </div>
          </div>
      </div>
  );

  const renderPlotBuilder = () => (
      <div className="h-screen bg-zinc-950 flex flex-col">
          <header className="p-6 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
               <div className="flex items-center gap-4">
                   <Button variant="ghost" onClick={() => setView('CHAR_SELECT')} icon={ChevronLeft}>上一步</Button>
                   <h2 className="text-xl font-bold text-white">第二步：构建剧情</h2>
               </div>
               <Button onClick={handleStartShow} disabled={!currentScript || currentScript.plotPoints.length === 0} icon={Play} variant="success">开始演绎</Button>
          </header>
          
          <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto space-y-8">
                  {/* Initial Prompt Section */}
                  {!currentScript && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-6">
                          <h3 className="text-2xl font-bold text-white">这个故事关于什么？</h3>
                          <textarea 
                             className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-white text-lg focus:border-indigo-500 outline-none" 
                             rows={4}
                             placeholder="例如：一位侦探审问一名声称来自未来的嫌疑人..."
                             value={creationPrompt}
                             onChange={e => setCreationPrompt(e.target.value)}
                          />
                          <Button onClick={handleInitPlotBuilder} disabled={isGenerating || !creationPrompt.trim()} size="lg" icon={isGenerating ? Loader2 : Sparkles}>
                              {isGenerating ? "初始化世界观..." : "初始化故事"}
                          </Button>
                      </div>
                  )}

                  {/* Interactive Plot Builder */}
                  {currentScript && (
                      <div className="space-y-6 animate-fade-in">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">标题</label>
                                  <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white font-bold" value={currentScript.title} onChange={e => updateScriptState({...currentScript, title: e.target.value})} />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">背景设定</label>
                                  <input className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white" value={currentScript.setting} onChange={e => updateScriptState({...currentScript, setting: e.target.value})} />
                              </div>
                          </div>
                          
                          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Film size={18}/> 剧情大纲</h3>
                              <div className="space-y-4 mb-6">
                                  {currentScript.plotPoints.map((p, i) => (
                                      <div key={i} className="flex gap-4 items-start group">
                                          <div className="w-6 h-6 rounded-full bg-indigo-900/50 text-indigo-400 flex items-center justify-center text-xs font-bold mt-1">{i+1}</div>
                                          <div className="flex-1">
                                              <textarea 
                                                className="w-full bg-transparent text-zinc-300 border-b border-transparent focus:border-zinc-700 outline-none resize-none" 
                                                rows={2}
                                                value={p}
                                                onChange={e => {
                                                    const newPts = [...currentScript.plotPoints];
                                                    newPts[i] = e.target.value;
                                                    updateScriptState({...currentScript, plotPoints: newPts});
                                                }}
                                              />
                                          </div>
                                          <button onClick={() => {
                                              const newPts = currentScript.plotPoints.filter((_, idx) => idx !== i);
                                              updateScriptState({...currentScript, plotPoints: newPts});
                                          }} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                      </div>
                                  ))}
                                  {currentScript.plotPoints.length === 0 && <div className="text-center text-zinc-600 py-4 italic">暂无剧情点。请在下方添加。</div>}
                              </div>
                              
                              <div className="flex gap-4">
                                  <Button onClick={handleAddNextScene} disabled={isAddingPlot} variant="secondary" className="flex-1" icon={isAddingPlot ? Loader2 : Sparkles}>
                                      {isAddingPlot ? "构思中..." : "AI 生成下一幕"}
                                  </Button>
                                  <Button onClick={() => updateScriptState({...currentScript, plotPoints: [...currentScript.plotPoints, "新场景"]})} variant="ghost" className="flex-1" icon={Plus}>
                                      手动添加
                                  </Button>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
  );

  const renderStage = () => {
    if (!currentScript) return null;
    const userChars = currentScript.characters.filter(c => c.isUserControlled);

    return (
        <div className="h-screen bg-zinc-950 flex flex-col relative">
            {/* Header */}
            <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center z-10 shadow-lg">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" icon={ChevronLeft} onClick={() => { setIsPlaying(false); setView('DASHBOARD'); }}>退出</Button>
                    <div>
                        <h2 className="text-white font-bold">{currentScript.title}</h2>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                             <span className={`flex items-center gap-1 ${isPlaying ? 'text-green-500' : 'text-red-500'}`}>
                                 <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                 {isPlaying ? '直播中' : '已暂停'}
                             </span>
                             <span>|</span>
                             <span>{currentScript.currentPlotIndex + 1} / {currentScript.plotPoints.length} 幕</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant={isPlaying ? 'danger' : 'success'} icon={turnProcessing ? Loader2 : (isPlaying ? Pause : Play)} onClick={() => setIsPlaying(!isPlaying)}>
                        {turnProcessing ? '思考中...' : (isPlaying ? '暂停' : '继续')}
                    </Button>
                </div>
            </div>

            {/* Chat/Stage Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-zinc-950">
                 {currentScript.history.map((msg, idx) => {
                     const char = currentScript.characters.find(c => c.id === msg.characterId);
                     const isNarration = msg.type === 'narration' || msg.characterId === 'narrator';
                     const isUserTurn = char?.isUserControlled || false; // Just to differentiate visually if needed, but in Chat UI, Left is Others, Right is Me (User)
                     
                     // In "Group Chat" metaphor: 
                     // AI Characters -> Left
                     // User Controlled Characters -> Right (like 'Me')
                     // Narration -> Center
                     
                     if (isNarration) {
                         return (
                             <div key={msg.id} className="flex justify-center my-6">
                                 <div className="bg-zinc-900/80 border border-zinc-800 px-6 py-3 rounded-full text-zinc-400 text-sm font-medium shadow-sm max-w-2xl text-center italic">
                                     {msg.content}
                                 </div>
                             </div>
                         );
                     }

                     return (
                         <div key={msg.id} className={`flex gap-4 max-w-3xl ${isUserTurn ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                             <div className="flex-shrink-0 mt-1">
                                 <Avatar name={char?.name || "?"} url={char?.avatarUrl} size="md" />
                             </div>
                             <div className={`flex flex-col ${isUserTurn ? 'items-end' : 'items-start'}`}>
                                 <span className="text-xs text-zinc-500 font-bold mb-1 ml-1">{char?.name}</span>
                                 <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-md ${
                                     isUserTurn 
                                     ? 'bg-indigo-600 text-white rounded-tr-none' 
                                     : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                                 }`}>
                                     {msg.content}
                                     {msg.type === 'action' && <span className="block mt-2 text-xs opacity-70 italic">*动作*</span>}
                                 </div>
                             </div>
                         </div>
                     );
                 })}
                 
                 {turnProcessing && (
                     <div className="flex gap-4 max-w-3xl mr-auto animate-pulse opacity-50">
                          <div className="w-10 h-10 rounded-full bg-zinc-800"></div>
                          <div className="h-12 w-48 bg-zinc-800 rounded-2xl rounded-tl-none"></div>
                     </div>
                 )}
                 <div ref={chatEndRef} className="h-4" />
            </div>

            {/* User Input Area (Right Side Prompt Box style) */}
            <div className="p-4 bg-zinc-900 border-t border-zinc-800">
                <div className="max-w-4xl mx-auto flex gap-4">
                    {/* Director Command */}
                    <div className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl flex items-center px-4 py-2 focus-within:border-indigo-500">
                        <Crown size={18} className="text-amber-500 mr-3" />
                        <input 
                            className="flex-1 bg-transparent border-none text-white focus:outline-none text-sm"
                            placeholder="导演指令 (上帝模式)..."
                            value={directorInput}
                            onChange={e => setDirectorInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (directorQueueRef.current.push(directorInput), setDirectorInput(''), setIsPlaying(true))}
                        />
                        <button onClick={() => { directorQueueRef.current.push(directorInput); setDirectorInput(''); setIsPlaying(true); }} disabled={!directorInput} className="text-xs font-bold text-amber-500 hover:text-amber-400 uppercase">插入指令</button>
                    </div>

                    {/* Character Inputs (if any user controlled chars) */}
                    {userChars.map(char => (
                         <div key={char.id} className="relative group">
                             <div className="w-12 h-12 rounded-full border-2 border-indigo-500 overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                                 <Avatar name={char.name} url={char.avatarUrl} size="md" />
                             </div>
                             {/* Pop-up Input Box for this character */}
                             <div className="absolute bottom-full right-0 mb-3 w-72 bg-zinc-800 border border-zinc-700 rounded-xl p-3 shadow-2xl invisible group-hover:visible focus-within:visible transition-all opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                                 <div className="text-xs font-bold text-zinc-400 mb-2">当前扮演: {char.name}</div>
                                 <textarea 
                                     className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm outline-none resize-none"
                                     rows={2}
                                     placeholder="输入对白..."
                                     value={userInputs[char.id] || ''}
                                     onChange={e => setUserInputs({...userInputs, [char.id]: e.target.value})}
                                     onKeyDown={e => {
                                         if(e.key==='Enter' && !e.shiftKey) {
                                             e.preventDefault();
                                             if(userInputs[char.id]) {
                                                 handleUpdateScriptHistory({id: generateId(), characterId: char.id, content: userInputs[char.id], type: 'dialogue', timestamp: Date.now()});
                                                 setUserInputs({...userInputs, [char.id]: ''});
                                             }
                                         }
                                     }}
                                 />
                                 <div className="flex justify-end mt-2">
                                     <button onClick={() => {
                                          if(userInputs[char.id]) {
                                              handleUpdateScriptHistory({id: generateId(), characterId: char.id, content: userInputs[char.id], type: 'dialogue', timestamp: Date.now()});
                                              setUserInputs({...userInputs, [char.id]: ''});
                                          }
                                     }} className="bg-indigo-600 text-white text-xs px-3 py-1 rounded hover:bg-indigo-500">发送</button>
                                 </div>
                             </div>
                         </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderCharacterModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Sparkles size={20} className="text-indigo-400"/> 
                      {editingChar?.id && globalCharacters.find(c => c.id === editingChar.id) ? "编辑角色" : "创建角色"}
                  </h2>
                  <button onClick={() => setShowCharModal(false)}><X className="text-zinc-500 hover:text-white"/></button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                  <div className="w-full md:w-1/3 bg-zinc-950 p-8 flex flex-col items-center border-r border-zinc-800 overflow-y-auto">
                      <div className="relative group">
                          <Avatar name={editingChar?.name || "?"} url={editingChar?.avatarUrl} size="2xl" />
                          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                              <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur flex items-center gap-2">
                                  <Upload size={14}/> 上传头像
                                  <input type="file" className="hidden" accept="image/*" onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file && editingChar) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => setEditingChar({ ...editingChar, avatarUrl: reader.result as string });
                                          reader.readAsDataURL(file);
                                      }
                                  }} />
                              </label>
                              <button onClick={async () => {
                                  if (!editingChar?.visualDescription) return;
                                  setIsAvatarGenerating(true);
                                  try {
                                      const url = await generateAvatarImage(editingChar as GlobalCharacter, appSettings);
                                      setEditingChar(p => ({...p!, avatarUrl: url}));
                                  } catch (e) {} finally { setIsAvatarGenerating(false); }
                              }} disabled={isAvatarGenerating || !editingChar?.visualDescription} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 disabled:opacity-50">
                                  {isAvatarGenerating ? <RefreshCw size={14} className="animate-spin"/> : <Wand2 size={14}/>} AI生成
                              </button>
                          </div>
                      </div>
                  </div>
                  <div className="w-full md:w-2/3 p-8 overflow-y-auto space-y-6 bg-zinc-900/50">
                      <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">姓名</label>
                          <div className="flex gap-2">
                              <input className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-lg text-white" value={editingChar?.name || ''} onChange={e => setEditingChar(p => ({...p!, name: e.target.value}))} placeholder="输入名字 (例如: 林黛玉)" />
                              <Button onClick={async () => {
                                  if (!editingChar?.name) return;
                                  setIsCharAutoFilling(true);
                                  try {
                                      const filled = await completeCharacterProfile(editingChar, appSettings);
                                      setEditingChar(p => ({...p, ...filled}));
                                  } catch(e){} finally { setIsCharAutoFilling(false); }
                              }} disabled={!editingChar?.name || isCharAutoFilling} variant="primary" icon={isCharAutoFilling ? RefreshCw : Sparkles}>{isCharAutoFilling ? "生成中..." : "✨ 一键生成"}</Button>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                          <div><label className="text-xs font-bold text-zinc-500 uppercase block mb-2">角色身份 (职业/定位)</label><input className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white" value={editingChar?.role || ''} onChange={e => setEditingChar(p => ({...p!, role: e.target.value}))} /></div>
                          <div><label className="text-xs font-bold text-zinc-500 uppercase block mb-2">性别</label><input className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white" value={editingChar?.gender || ''} onChange={e => setEditingChar(p => ({...p!, gender: e.target.value}))} /></div>
                          <div><label className="text-xs font-bold text-zinc-500 uppercase block mb-2">年龄</label><input className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white" value={editingChar?.age || ''} onChange={e => setEditingChar(p => ({...p!, age: e.target.value}))} /></div>
                      </div>
                      <SmartTextarea label="性格特征" value={editingChar?.personality || ''} onChange={e => setEditingChar(p => ({...p!, personality: e.target.value}))} onAIRequest={async () => {
                          const refined = await refineCharacterTrait(editingChar?.personality||'', editingChar?.name||'','Personality',lang,appSettings);
                          setEditingChar(p=>({...p!, personality: refined}));
                      }} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div><label className="text-xs font-bold text-zinc-500 uppercase block mb-2">语言风格</label><textarea className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-300 min-h-[100px]" rows={4} value={editingChar?.speakingStyle || ''} onChange={e => setEditingChar(p => ({...p!, speakingStyle: e.target.value}))} /></div>
                          <div><label className="text-xs font-bold text-zinc-500 uppercase block mb-2">外貌描述</label><textarea className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-300 min-h-[100px]" rows={4} value={editingChar?.visualDescription || ''} onChange={e => setEditingChar(p => ({...p!, visualDescription: e.target.value}))} /></div>
                      </div>
                  </div>
              </div>
              <div className="p-6 border-t border-zinc-800 bg-zinc-900 flex justify-end gap-4">
                  <Button variant="secondary" onClick={() => setShowCharModal(false)}>关闭</Button>
                  <Button variant="primary" onClick={handleSaveGlobalCharacter} icon={Save} className="px-8">保存</Button>
              </div>
          </div>
      </div>
  );

  return (
    <>
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in ${notification.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-500' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'}`}>
          {notification.type === 'error' ? <AlertCircle size={20}/> : <Sparkles size={20}/>}
          <div><h4 className="font-bold text-sm">{notification.title}</h4><p className="text-xs opacity-80">{notification.msg}</p></div>
        </div>
      )}
      {view === 'DASHBOARD' && renderDashboard()}
      {view === 'CHAR_SELECT' && renderCharacterSelector()}
      {view === 'PLOT_BUILDER' && renderPlotBuilder()}
      {view === 'STAGE' && renderStage()}
      {showCharModal && renderCharacterModal()}
    </>
  );
}
