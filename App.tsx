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
    initializeScriptBasic, generateNextPlotSegment, generateNextBeat, 
    generateAvatarImage, refineText, generateSceneImage, regenerateFuturePlot, 
    generateSingleCharacter, completeCharacterProfile, chatWithCharacter, 
    evolveCharacterFromChat, generateNextChapterPlan, autoCompleteStory, 
    generateNovelVersion, refineCharacterTrait
} from './services/aiService';
import { authService } from './services/authService';

// --- Safe UUID ---
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const NOVEL_STYLES_MAP: Record<NovelStyle, string> = {
    'STANDARD': '标准小说风格', 'JIN_YONG': '金庸 (武侠)', 'CIXIN_LIU': '刘慈欣 (科幻)',
    'HEMINGWAY': '海明威 (简练)', 'AUSTEN': '简·奥斯汀 (细腻)', 'LU_XUN': '鲁迅 (犀利)'
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, errorMsg: string}> {
  constructor(props: any) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, errorMsg: error?.message || 'Unknown Error' }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
           <AlertCircle size={64} className="text-red-500 mb-6" />
           <h1 className="text-2xl text-white font-bold mb-2">Something went wrong</h1>
           <p className="text-zinc-500 mb-6 max-w-md">{this.state.errorMsg}</p>
           <button onClick={() => window.location.reload()} className="bg-white text-black px-6 py-2 rounded-full font-bold">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Components ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, size = 'md' }: any) => {
  const sizeClasses = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-8 py-4 text-base" };
  const variants: any = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700",
    ghost: "hover:bg-zinc-800/50 text-zinc-400 hover:text-white",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:opacity-50 active:scale-95 ${sizeClasses[size]} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
};

const Avatar = ({ url, name, size = 'md', className='' }: any) => {
  const sizes: any = { sm: "w-8 h-8 text-[10px]", md: "w-10 h-10 text-xs", lg: "w-16 h-16 text-sm", xl: "w-24 h-24 text-base" };
  return url ? 
    <img src={url} alt={name} className={`${sizes[size]} rounded-full object-cover border border-zinc-700 ${className}`} /> :
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white ${className}`}>{name?.[0]}</div>
};

// --- Main App ---
export default function App() { return <ErrorBoundary><MainApp /></ErrorBoundary>; }

function MainApp() {
  // Auth & Settings
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => JSON.parse(localStorage.getItem('skena_settings') || '{"activeProvider":"GEMINI"}'));
  
  // Data
  const [scripts, setScripts] = useState<Script[]>([]);
  const [globalCharacters, setGlobalCharacters] = useState<GlobalCharacter[]>([]);
  
  // Navigation State
  // VIEW: DASHBOARD -> CHAR_SELECT -> PLOT_BUILDER -> STAGE
  const [view, setView] = useState<'DASHBOARD' | 'CHAR_SELECT' | 'PLOT_BUILDER' | 'STAGE' | 'CHAT'>('DASHBOARD');
  
  // Creation Flow State
  const [selectedCastIds, setSelectedCastIds] = useState<string[]>([]);
  const [promptInput, setPromptInput] = useState('');
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [turnProcessing, setTurnProcessing] = useState(false);
  const [directorInput, setDirectorInput] = useState('');
  const [userInputs, setUserInputs] = useState<{[key:string]:string}>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Modals
  const [showCharModal, setShowCharModal] = useState(false);
  const [editingChar, setEditingChar] = useState<Partial<GlobalCharacter> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [notification, setNotification] = useState<any>(null);

  // Init
  useEffect(() => {
    const init = async () => {
       const u = await authService.getCurrentUser();
       if (u) {
           setCurrentUser(u);
           setScripts(await authService.getScripts(u.id));
           setGlobalCharacters(await authService.getGlobalCharacters(u.id));
       }
    };
    init();
  }, []);

  // Persist
  useEffect(() => { if (currentUser) authService.saveScripts(currentUser.id, scripts); }, [scripts]);
  useEffect(() => { if (currentUser) authService.saveGlobalCharacters(currentUser.id, globalCharacters); }, [globalCharacters]);

  // Scroll to bottom
  useEffect(() => { if (view === 'STAGE') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [currentScript?.history, view]);

  // Game Loop
  useEffect(() => {
      if (view !== 'STAGE' || !currentScript || !isPlaying || turnProcessing) return;
      
      const loop = async () => {
          setTurnProcessing(true);
          try {
              // 1. Check for Director/God commands
              let forcedCommand = directorInput ? directorInput : null;
              if (directorInput) setDirectorInput(''); // Consume command

              // 2. Generate Beat
              const currentIdx = currentScript.currentPlotIndex || 0;
              const targetPlot = currentScript.plotPoints[currentIdx] || "Ending";
              
              const beat = await generateNextBeat(currentScript, forcedCommand, targetPlot, 'zh-CN', appSettings);
              
              // 3. Update History
              const newMsg: Message = {
                  id: generateId(),
                  characterId: beat.characterId,
                  content: beat.content,
                  type: beat.type,
                  timestamp: Date.now()
              };
              
              const updatedScript = {
                  ...currentScript,
                  history: [...currentScript.history, newMsg],
                  lastUpdated: Date.now()
              };
              
              setCurrentScript(updatedScript);
              setScripts(s => s.map(sc => sc.id === updatedScript.id ? updatedScript : sc));

              // 4. Check if we need to auto-advance plot (Simple logic: randomly or if explicitly told)
              // For now, we rely on user manually clicking "Next Chapter" in UI or God Mode
          } catch (e) {
              console.error(e);
              setIsPlaying(false);
          } finally {
              setTurnProcessing(false);
          }
      };

      const timer = setTimeout(loop, 1500); // 1.5s delay for reading
      return () => clearTimeout(timer);
  }, [view, isPlaying, turnProcessing, currentScript, directorInput]);

  // --- Handlers ---

  const showNotif = (title: string, msg: string, type='success') => {
      setNotification({title, msg, type});
      setTimeout(() => setNotification(null), 3000);
  };

  const handleStartCreation = () => {
      setSelectedCastIds([]);
      setPromptInput('');
      setView('CHAR_SELECT');
  };

  const handleCharSelectConfirm = () => {
      if (selectedCastIds.length === 0) {
          showNotif("Oops", "请至少选择一位演员", 'error');
          return;
      }
      setView('PLOT_BUILDER');
  };

  const handleInitializeScript = async () => {
      if (!currentUser || !promptInput.trim()) return;
      setIsGenerating(true);
      try {
          const selectedChars = globalCharacters.filter(c => selectedCastIds.includes(c.id));
          const baseData = await initializeScriptBasic(promptInput, selectedChars, 'zh-CN', appSettings);
          
          const newScript: Script = {
              id: generateId(),
              ownerId: currentUser.id,
              title: baseData.title!,
              premise: baseData.premise!,
              setting: baseData.setting!,
              plotPoints: baseData.plotPoints || [],
              possibleEndings: [],
              characters: baseData.characters!,
              history: [{
                  id: generateId(), characterId: 'narrator', type: 'narration',
                  content: `故事开始：${baseData.setting}。\n${baseData.premise}`, timestamp: Date.now()
              }],
              currentPlotIndex: 0,
              lastUpdated: Date.now()
          };
          setCurrentScript(newScript);
      } catch (e) {
          showNotif("Error", "初始化失败，请重试", 'error');
      } finally {
          setIsGenerating(false);
      }
  };

  const handleAddPlotPoint = async () => {
      if (!currentScript) return;
      setIsGenerating(true);
      try {
          const nextPoint = await generateNextPlotSegment(currentScript, appSettings);
          setCurrentScript(prev => prev ? {...prev, plotPoints: [...prev.plotPoints, nextPoint]} : null);
      } catch (e) {
          showNotif("Error", "剧情生成失败", 'error');
      } finally {
          setIsGenerating(false);
      }
  };

  const handleStartShow = () => {
      if (currentScript) {
          setScripts(prev => [...prev.filter(s => s.id !== currentScript.id), currentScript]);
          setView('STAGE');
      }
  };

  // --- Renderers ---

  const renderDashboard = () => (
      <div className="h-screen bg-zinc-950 flex flex-col items-center p-6 overflow-hidden">
          <header className="w-full max-w-6xl flex justify-between items-center mb-12">
              <div className="flex items-center gap-2 text-2xl font-bold text-white"><Cloud className="text-indigo-500"/> Daydreaming</div>
              <div className="flex gap-4">
                  <Button variant="ghost" onClick={() => setShowSettings(true)} icon={Settings}>设置</Button>
                  <Button variant="ghost" onClick={() => { authService.logout(); window.location.reload(); }} icon={LogOut}>退出</Button>
              </div>
          </header>

          <main className="w-full max-w-4xl flex-1 flex flex-col items-center text-center">
              <h1 className="text-6xl font-black text-white mb-6 tracking-tight">唯梦境与爱不可辜负</h1>
              <p className="text-zinc-400 text-xl mb-12 max-w-2xl">选择你钟爱的角色，构筑你的专属剧场。AI 导演已就位。</p>
              
              <Button size="lg" onClick={handleStartCreation} icon={Sparkles} className="rounded-full px-12 py-6 text-xl shadow-2xl shadow-indigo-500/30">
                  开始编织梦境
              </Button>

              <div className="mt-20 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                   {scripts.slice(0, 3).map(s => (
                       <div key={s.id} onClick={() => { setCurrentScript(s); setView('STAGE'); }} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-all group">
                           <h3 className="font-bold text-white mb-2 group-hover:text-indigo-400">{s.title}</h3>
                           <p className="text-zinc-500 text-sm line-clamp-2">{s.premise}</p>
                           <div className="mt-4 flex -space-x-2">
                               {s.characters.slice(0,3).map(c => <Avatar key={c.id} name={c.name} url={c.avatarUrl} size="sm" />)}
                           </div>
                       </div>
                   ))}
              </div>
          </main>
      </div>
  );

  const renderCharSelect = () => (
      <div className="h-screen bg-zinc-950 flex flex-col">
          <header className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
              <Button variant="ghost" icon={ChevronLeft} onClick={() => setView('DASHBOARD')}>返回</Button>
              <h2 className="text-xl font-bold text-white">第1步：选择主演</h2>
              <Button onClick={handleCharSelectConfirm} disabled={selectedCastIds.length === 0} icon={ArrowRight}>下一步</Button>
          </header>
          <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
                  <div onClick={() => { setEditingChar({}); setShowCharModal(true); }} className="aspect-[3/4] rounded-2xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-900 transition-all">
                      <Plus className="text-zinc-500 mb-2"/>
                      <span className="text-zinc-500 font-bold">新建角色</span>
                  </div>
                  {globalCharacters.map(char => (
                      <div key={char.id} 
                           onClick={() => setSelectedCastIds(ids => ids.includes(char.id) ? ids.filter(id => id !== char.id) : [...ids, char.id])}
                           className={`relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer transition-all border-2 ${selectedCastIds.includes(char.id) ? 'border-indigo-500 scale-105 shadow-xl shadow-indigo-500/20' : 'border-transparent hover:border-zinc-600'}`}>
                          {char.avatarUrl ? <img src={char.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-4xl font-bold text-zinc-600">{char.name[0]}</div>}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                              <h3 className="font-bold text-white">{char.name}</h3>
                              <p className="text-xs text-zinc-400 line-clamp-1">{char.role || 'Role'}</p>
                          </div>
                          {selectedCastIds.includes(char.id) && <div className="absolute top-2 right-2 bg-indigo-600 rounded-full p-1"><CheckCircle size={16} className="text-white"/></div>}
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderPlotBuilder = () => (
      <div className="h-screen bg-zinc-950 flex flex-col">
          <header className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
              <Button variant="ghost" icon={ChevronLeft} onClick={() => setView('CHAR_SELECT')}>重选角色</Button>
              <h2 className="text-xl font-bold text-white">第2步：剧情构筑</h2>
              <Button onClick={handleStartShow} disabled={!currentScript || currentScript.plotPoints.length === 0} icon={Play} variant="success">开始演绎</Button>
          </header>
          
          <div className="flex-1 overflow-y-auto p-8 flex justify-center">
              <div className="w-full max-w-3xl space-y-8">
                  {/* Phase 1: Initial Prompt */}
                  {!currentScript && (
                      <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 text-center animate-fade-in">
                          <Cloud size={48} className="text-indigo-500 mx-auto mb-4" />
                          <h3 className="text-2xl font-bold text-white mb-2">你的灵感是什么？</h3>
                          <p className="text-zinc-400 mb-6">输入一个简单的想法，AI 将为你搭建舞台。</p>
                          <textarea 
                              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-white text-lg focus:border-indigo-500 outline-none mb-6 min-h-[120px]" 
                              placeholder="例如：三个侦探被困在暴风雪山庄..."
                              value={promptInput}
                              onChange={e => setPromptInput(e.target.value)}
                          />
                          <Button onClick={handleInitializeScript} disabled={isGenerating || !promptInput} size="lg" className="w-full" icon={isGenerating ? Loader2 : Sparkles}>
                              {isGenerating ? "正在构筑世界..." : "生成剧本基础"}
                          </Button>
                      </div>
                  )}

                  {/* Phase 2: Plot Editing */}
                  {currentScript && (
                      <div className="space-y-6 animate-fade-in">
                          <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                              <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">剧本标题</label>
                              <input className="bg-transparent text-2xl font-bold text-white w-full outline-none" value={currentScript.title} onChange={e => setCurrentScript({...currentScript, title: e.target.value})}/>
                              <label className="text-xs font-bold text-zinc-500 uppercase block mt-4 mb-1">故事背景</label>
                              <textarea className="bg-transparent text-zinc-300 w-full outline-none resize-none" rows={2} value={currentScript.premise} onChange={e => setCurrentScript({...currentScript, premise: e.target.value})}/>
                          </div>

                          <div className="space-y-4">
                              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Film size={18}/> 剧情节点 (Plot Points)</h3>
                              {currentScript.plotPoints.map((pt, idx) => (
                                  <div key={idx} className="flex gap-4 items-start group">
                                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 mt-2">{idx + 1}</div>
                                      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-all relative">
                                          <textarea 
                                              className="w-full bg-transparent text-zinc-200 outline-none resize-none" 
                                              rows={3}
                                              value={pt}
                                              onChange={e => {
                                                  const newPts = [...currentScript.plotPoints];
                                                  newPts[idx] = e.target.value;
                                                  setCurrentScript({...currentScript, plotPoints: newPts});
                                              }}
                                          />
                                          <button onClick={() => {
                                              const newPts = currentScript.plotPoints.filter((_, i) => i !== idx);
                                              setCurrentScript({...currentScript, plotPoints: newPts});
                                          }} className="absolute top-2 right-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                      </div>
                                  </div>
                              ))}
                              
                              <div className="flex gap-4 ml-12">
                                  <Button variant="secondary" onClick={() => setCurrentScript({...currentScript, plotPoints: [...currentScript.plotPoints, ""]})} icon={Plus}>手动添加</Button>
                                  <Button variant="primary" onClick={handleAddPlotPoint} disabled={isGenerating} icon={isGenerating ? Loader2 : Sparkles}>
                                      {isGenerating ? "AI 思考中..." : "AI 生成下一幕"}
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
      const progress = ((currentScript.currentPlotIndex || 0) + 1) / Math.max(1, currentScript.plotPoints.length) * 100;
      
      return (
          <div className="h-screen bg-zinc-950 flex flex-col">
              {/* Header */}
              <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 z-20">
                  <div className="flex items-center gap-4">
                      <Button variant="ghost" icon={ChevronLeft} onClick={() => { setIsPlaying(false); setView('DASHBOARD'); }}>离开</Button>
                      <div>
                          <h2 className="font-bold text-white text-sm">{currentScript.title}</h2>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                              {isPlaying ? "直播中" : "已暂停"}
                              <span className="ml-2">进度: {Math.round(progress)}%</span>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <Button size="sm" variant={isPlaying ? 'danger' : 'success'} icon={isPlaying ? Pause : Play} onClick={() => setIsPlaying(!isPlaying)}>
                          {isPlaying ? "暂停" : "继续演绎"}
                      </Button>
                  </div>
              </header>

              {/* Chat Area */}
              <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0B0B0F] relative">
                  <div className="max-w-3xl mx-auto space-y-6 pb-20">
                      {currentScript.history.map(msg => {
                          const char = currentScript?.characters.find(c => c.id === msg.characterId);
                          const isNarrator = msg.type === 'narration' || msg.characterId === 'narrator';
                          
                          if (isNarrator) {
                              return (
                                  <div key={msg.id} className="flex justify-center my-6">
                                      <div className="bg-zinc-800/50 text-zinc-400 text-xs px-4 py-1.5 rounded-full border border-zinc-700/50 max-w-lg text-center leading-relaxed">
                                          {msg.content}
                                      </div>
                                  </div>
                              );
                          }

                          // Character Message (Left)
                          return (
                              <div key={msg.id} className="flex gap-3 items-end group animate-fade-in">
                                  <Avatar name={char?.name || "?"} url={char?.avatarUrl} size="md" className="mb-1 ring-2 ring-zinc-800" />
                                  <div className="flex flex-col gap-1 max-w-[80%]">
                                      <span className="text-[10px] text-zinc-500 ml-1">{char?.name}</span>
                                      <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-md bg-zinc-800 text-zinc-200 rounded-bl-none border border-zinc-700/50`}>
                                          {msg.content}
                                          {msg.type === 'action' && <span className="block mt-2 text-xs text-zinc-500 italic">*{msg.content}*</span>}
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                      
                      {turnProcessing && (
                          <div className="flex gap-3 items-end opacity-50">
                              <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse"></div>
                              <div className="bg-zinc-800 p-4 rounded-2xl rounded-bl-none w-24 h-10 animate-pulse"></div>
                          </div>
                      )}
                      <div ref={chatEndRef} />
                  </div>
              </main>

              {/* Input Area (Director) */}
              <footer className="bg-zinc-900 border-t border-zinc-800 p-4">
                  <div className="max-w-3xl mx-auto flex gap-2">
                      <div className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl flex items-center px-4 focus-within:border-indigo-500 transition-colors">
                          <Crown size={16} className="text-amber-500 mr-2" />
                          <input 
                              className="bg-transparent border-none text-white w-full py-3 focus:outline-none placeholder-zinc-600"
                              placeholder="上帝指令 (例如: '突然下雨了', '让这两人吵架')"
                              value={directorInput}
                              onChange={e => setDirectorInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && setDirectorInput('') /* Logic handled in loop */}
                          />
                      </div>
                      <Button onClick={() => setDirectorInput('')} icon={Send} disabled={!directorInput}>发送</Button>
                  </div>
              </footer>
          </div>
      );
  };

  // --- Login Screen ---
  if (!currentUser) {
     return (
        <div className="h-screen flex items-center justify-center bg-zinc-950 text-white">
           <div className="text-center">
              <Cloud size={64} className="mx-auto mb-4 text-indigo-500" />
              <h1 className="text-4xl font-bold mb-8">Daydreaming</h1>
              <input className="bg-zinc-900 border border-zinc-700 px-6 py-3 rounded-xl outline-none text-center block w-full mb-4" placeholder="Enter Username" onKeyDown={(e:any) => { if(e.key==='Enter') authService.login(e.target.value).then(u=>setCurrentUser(u)); }} />
              <Button onClick={() => authService.login("User").then(u=>setCurrentUser(u))}>Enter Dream</Button>
           </div>
        </div>
     ); 
  }

  // --- Router ---
  return (
    <>
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in ${notification.type==='error'?'bg-red-900/80 text-red-100':'bg-zinc-800 text-white border border-zinc-700'}`}>
            {notification.type==='error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
            <div><h4 className="font-bold">{notification.title}</h4><p className="text-xs">{notification.msg}</p></div>
        </div>
      )}
      
      {view === 'DASHBOARD' && renderDashboard()}
      {view === 'CHAR_SELECT' && renderCharSelect()}
      {view === 'PLOT_BUILDER' && renderPlotBuilder()}
      {view === 'STAGE' && renderStage()}
      
      {showCharModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-zinc-900 w-full max-w-lg rounded-2xl p-6 border border-zinc-700">
                <h3 className="text-xl font-bold text-white mb-4">创建新角色</h3>
                <div className="space-y-4">
                    <div><label className="text-xs text-zinc-500 uppercase">姓名</label><input className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-lg text-white" value={editingChar?.name||''} onChange={e=>setEditingChar({...editingChar, name:e.target.value})} placeholder="例如: 林黛玉"/></div>
                    <Button onClick={async () => {
                         if(!editingChar?.name) return;
                         const filled = await completeCharacterProfile(editingChar, appSettings);
                         setEditingChar(filled);
                    }} icon={Sparkles} size="sm" variant="secondary" className="w-full">AI 自动完善设定</Button>
                    
                    <div><label className="text-xs text-zinc-500 uppercase">职业/身份 (Role)</label><input className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-lg text-white" value={editingChar?.role||''} onChange={e=>setEditingChar({...editingChar, role:e.target.value})} placeholder="例如: 侦探 / 医生"/></div>

                    <div><label className="text-xs text-zinc-500 uppercase">性格</label><textarea className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-lg text-white" rows={2} value={editingChar?.personality||''} onChange={e=>setEditingChar({...editingChar, personality:e.target.value})}/></div>
                    <div><label className="text-xs text-zinc-500 uppercase">语言风格</label><textarea className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-lg text-white" rows={2} value={editingChar?.speakingStyle||''} onChange={e=>setEditingChar({...editingChar, speakingStyle:e.target.value})}/></div>
                    
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={()=>setShowCharModal(false)}>取消</Button>
                        <Button onClick={async () => {
                             const newChar: GlobalCharacter = {
                                 id: generateId(), ownerId: currentUser.id, name: editingChar?.name!,
                                 personality: editingChar?.personality||'', speakingStyle: editingChar?.speakingStyle||'',
                                 visualDescription: editingChar?.visualDescription||'', avatarUrl: editingChar?.avatarUrl,
                                 createdAt: Date.now(), gender: editingChar?.gender||'Unknown', age: editingChar?.age||'Unknown',
                                 role: editingChar?.role || 'Protagonist'
                             };
                             if (!newChar.avatarUrl) {
                                 try { newChar.avatarUrl = await generateAvatarImage(newChar, appSettings); } catch(e){}
                             }
                             setGlobalCharacters([...globalCharacters, newChar]);
                             setShowCharModal(false);
                        }}>保存角色</Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showSettings && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
               <div className="bg-zinc-900 p-6 rounded-2xl w-full max-w-md border border-zinc-700">
                   <h3 className="text-xl font-bold text-white mb-4">设置 API Key</h3>
                   <input className="w-full bg-zinc-950 border border-zinc-700 p-3 rounded-lg text-white mb-4" type="password" placeholder="Gemini API Key" value={appSettings.apiKey||''} onChange={e=>setAppSettings({...appSettings, apiKey:e.target.value})} />
                   <Button onClick={()=>{localStorage.setItem('skena_settings', JSON.stringify(appSettings)); setShowSettings(false);}}>保存</Button>
               </div>
          </div>
      )}
    </>
  );
}