import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  LogOut, 
  User as UserIcon, 
  Bot, 
  Sparkles, 
  ArrowRight,
  Loader2,
  Trash2,
  Plus,
  MessageSquare,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc,
  writeBatch
} from 'firebase/firestore';
import { useAuth, signInWithGoogle, logout, db } from './lib/firebase.ts';
import { GoogleGenAI } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const availableModels = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Equilibrado y versátil' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Máximo razonamiento' },
    { id: 'gemini-3.1-flash-lite-preview', name: 'Flash Lite', desc: 'Máxima velocidad' },
  ];
  
  const aiRef = useRef<any>(null);

  // Load history
  useEffect(() => {
    if (user) {
      const loadHistory = async () => {
        try {
          const q = query(
            collection(db, 'messages'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'asc')
          );
          const querySnapshot = await getDocs(q);
          const loadedMessages: Message[] = [];
          querySnapshot.forEach((doc) => {
            loadedMessages.push(doc.data() as Message);
          });
          setMessages(loadedMessages);
        } catch (error) {
          console.error("Error loading history:", error);
        } finally {
          setIsInitialLoading(false);
        }
      };
      loadHistory();
    } else {
      setMessages([]);
      setIsInitialLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (process.env.GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !aiRef.current || isTyping) return;

    const userMessage: Message = {
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      // Save user message to Firestore
      await addDoc(collection(db, 'messages'), {
        ...userMessage,
        userId: user!.uid
      });

      // Prepare history
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const result = await aiRef.current.models.generateContent({
        model: selectedModel,
        contents: [...history, { role: 'user', parts: [{ text: currentInput }] }],
      });

      const modelText = result.text || "Lo siento, no pude procesar eso.";
      
      const modelMessage: Message = {
        role: 'model',
        text: modelText,
        timestamp: Date.now()
      };

      // Save model response to Firestore
      await addDoc(collection(db, 'messages'), {
        ...modelMessage,
        userId: user!.uid
      });

      setMessages(prev => [...prev, modelMessage]);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      let errorMessage = "Hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.";
      
      if (error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429) {
        errorMessage = "El modelo está experimentando alta demanda. Por favor, espera un momento e intenta de nuevo.";
      } else if (error?.status === "NOT_FOUND" || error?.code === 404) {
        errorMessage = "El modelo seleccionado no está disponible en este momento. Por favor, intenta con otro.";
      } else if (error?.message?.includes("not found")) {
        errorMessage = "Error de configuración: Modelo no encontrado.";
      }

      setMessages(prev => [...prev, {
        role: 'model',
        text: errorMessage,
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = async () => {
    if (confirm("¿Estás seguro de que quieres borrar el historial?")) {
      try {
        const q = query(
          collection(db, 'messages'),
          where('userId', '==', user?.uid)
        );
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach((document) => {
          batch.delete(doc(db, 'messages', document.id));
        });
        await batch.commit();
        setMessages([]);
        setIsSidebarOpen(false);
      } catch (error) {
        console.error("Error clearing chat:", error);
        alert("Error al borrar el chat.");
      }
    }
  };

  if (authLoading || isInitialLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-bg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500 animate-pulse font-medium tracking-tight">Initializing Gemini Bridge...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-dark-bg px-4">
        {/* Glow Effects */}
        <div className="absolute -top-48 -left-48 h-[600px] w-[600px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-48 -right-48 h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/10 bg-dark-surface p-12 shadow-2xl shadow-black/80"
        >
          <div className="mb-10 flex flex-col items-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20">
              <Sparkles className="h-10 w-10" />
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-white mb-3">
              Gemini Bridge
            </h1>
            <p className="text-center text-slate-400 leading-relaxed font-medium">
              Gestión inteligente de diálogos <br /> impulsada por Google Gemini.
            </p>
          </div>

          <button
            onClick={signInWithGoogle}
            className="group relative flex w-full items-center justify-center gap-4 rounded-2xl border border-white/5 bg-white/5 py-5 font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              className="h-6 w-6" 
              alt="Google logo"
            />
            <span>Acceder con Google Workspace</span>
            <ArrowRight className="h-5 w-5 opacity-40 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
          </button>

          <div className="mt-10 flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Google Verified Auth</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-dark-bg text-slate-200 overflow-hidden font-sans border border-white/5">
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-dark-surface border-r border-white/5 flex flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-white">Gemini Bridge</h1>
            </div>
            <button className="lg:hidden p-2 text-slate-400" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <button 
            onClick={() => { setMessages([]); setIsSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium text-slate-300"
          >
            <Plus className="w-4 h-4" />
            New Dialogue
          </button>
        </div>

        <div className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold px-4 mb-3 mt-2 opacity-60">Recents</div>
          
          {messages.length > 0 ? (
            <div className="px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm flex items-center gap-3 cursor-default">
              <MessageSquare className="w-4 h-4" />
              Active Conversation
            </div>
          ) : (
            <div className="px-4 py-3 text-slate-600 text-sm italic">
              No recent activity
            </div>
          )}
          
          <div className="px-4 py-3 text-slate-500 text-sm flex items-center gap-3 hover:text-slate-300 transition-colors cursor-not-allowed opacity-50">
            <MessageSquare className="w-4 h-4" />
            API Integration...
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-3 p-2 group transition-all">
            {user.photoURL ? (
              <img src={user.photoURL} className="w-10 h-10 rounded-full border border-white/10 ring-2 ring-indigo-500/20" alt="Avatar" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">{user.displayName || 'Developer'}</p>
              <div className="flex items-center gap-1.5 leading-none mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Verified Session</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-500 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 shrink-0 border-b border-white/5 px-6 sm:px-8 flex items-center justify-between bg-dark-bg/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4 sm:gap-6 overflow-hidden">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-slate-300 focus:ring-0 cursor-pointer hover:text-white transition-colors outline-none"
              >
                {availableModels.map(m => (
                  <option key={m.id} value={m.id} className="bg-dark-surface text-slate-200">
                    {m.name}
                  </option>
                ))}
              </select>
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>
            </div>
            <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest leading-none">Proxy Security Active</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
             {messages.length > 0 && (
              <button 
                onClick={clearChat}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Flush Stream
              </button>
             )}
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] sm:text-xs font-mono text-slate-400">
              Cloud Run V2
            </div>
          </div>
        </header>

        {/* Chat View */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 chat-container"
        >
          <div className="max-w-4xl mx-auto space-y-10">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-24 text-center"
                >
                  <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/5 border border-white/5 text-indigo-500">
                    <Sparkles className="h-10 w-10 animate-pulse" />
                  </div>
                  <h3 className="font-display text-4xl font-semibold tracking-tight text-white mb-3">
                    Welcome back, {user.displayName?.split(' ')[0]}
                  </h3>
                  <p className="text-slate-400 max-w-sm mx-auto leading-relaxed text-sm font-medium mb-12">
                    How can I assist your workflow today? I'm connected and ready to process.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-lg mx-auto">
                    {[
                      "Analyze current security architecture",
                      "Draft a system instruction set",
                      "Optimize Firestore rule logic",
                      "Simulate a load test plan"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="group rounded-2xl border border-white/5 bg-dark-surface px-5 py-4 text-left text-sm text-slate-300 font-medium transition-all hover:border-indigo-500/30 hover:bg-white/5 active:scale-95 flex items-center justify-between"
                      >
                        {suggestion}
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-indigo-400" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((message, idx) => (
                  <motion.div
                    key={`${message.timestamp}-${idx}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 sm:gap-6 ${message.role === 'model' ? 'max-w-4xl pr-4' : 'max-w-3xl ml-auto flex-row-reverse pl-4'}`}
                  >
                    <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border ${
                      message.role === 'model' 
                        ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' 
                        : 'bg-slate-700 border-white/10 text-white'
                    }`}>
                      {message.role === 'model' ? (
                        <span className="text-xs font-bold font-mono">G</span>
                      ) : (
                        <span className="text-xs font-bold font-mono">U</span>
                      )}
                    </div>
                    <div className={`space-y-4 ${message.role === 'user' ? 'w-full' : ''}`}>
                      <div className={`p-5 rounded-3xl ${
                        message.role === 'model' 
                          ? 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none' 
                          : 'bg-indigo-600 text-white rounded-tr-none shadow-xl shadow-indigo-600/10'
                      }`}>
                        <p className="text-sm sm:text-base leading-relaxed tracking-tight font-medium">
                          {message.text}
                        </p>
                        
                        {message.role === 'model' && (
                           <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/30 border border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> GENAI STREAM
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/30 border border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div> SSL SYNCED
                            </div>
                          </div>
                        )}
                      </div>
                      <p className={`text-[11px] font-mono text-slate-600 ${message.role === 'user' ? 'text-right' : ''}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {message.role === 'model' ? 'Gemini API Node' : 'Client Origin'}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 sm:gap-6"
              >
                <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border bg-indigo-600/20 border-indigo-500/30 text-indigo-400">
                  <span className="text-xs font-bold font-mono">G</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-6 py-4 shadow-sm">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                    className="h-1.5 w-1.5 rounded-full bg-indigo-400" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                    className="h-1.5 w-1.5 rounded-full bg-indigo-400" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                    className="h-1.5 w-1.5 rounded-full bg-indigo-400" 
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-8 bg-dark-bg shrink-0">
          <div className="relative max-w-4xl mx-auto group">
            <form onSubmit={handleSendMessage}>
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                 <Sparkles className={`w-5 h-5 transition-colors ${isTyping ? 'text-indigo-500 animate-pulse' : 'text-slate-600'}`} />
              </div>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isTyping}
                placeholder="Message Gemini..." 
                className="w-full bg-dark-input border border-white/10 rounded-2xl py-4 pl-14 pr-24 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all shadow-2xl shadow-black/50 group-hover:border-white/20"
              />
              <div className="absolute inset-y-0 right-2 flex items-center gap-2">
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:text-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                >
                  {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Transmit'}
                </button>
              </div>
            </form>
          </div>
          <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Securely connected via Google Identity • API Keys protected via cloud proxy</p>
          </div>
        </div>
      </main>
    </div>
  );
}
