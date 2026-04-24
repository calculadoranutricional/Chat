import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, signInWithGoogle } from './lib/firebase';
import { chatService, Chat, Message } from './services/chatService';
import { 
  Plus, 
  MessageSquare, 
  Send, 
  LogOut, 
  User as UserIcon, 
  Trash2, 
  Menu, 
  X,
  Sparkles,
  Bot,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await chatService.createUserProfile(u);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user]);

  useEffect(() => {
    if (currentChatId && user) {
      loadMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChats = async () => {
    if (!user) return;
    try {
      setErrorStatus(null);
      const fetchedChats = await chatService.getChats(user.uid);
      setChats(fetchedChats);
    } catch (error: any) {
      console.error(error);
      setErrorStatus(error.message);
    }
  };

  const loadMessages = async (chatId: string) => {
    if (!user) return;
    try {
      setErrorStatus(null);
      const fetchedMessages = await chatService.getMessages(chatId, user.uid);
      setMessages(fetchedMessages);
    } catch (error: any) {
      console.error(error);
      setErrorStatus(error.message);
    }
  };

  const createNewChat = async () => {
    if (!user) return;
    try {
      setErrorStatus(null);
      const newChatId = await chatService.createChat(user.uid);
      await loadChats();
      setCurrentChatId(newChatId);
      setSidebarOpen(false); // On mobile focus chat
    } catch (error: any) {
      console.error(error);
      setErrorStatus(error.message);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (window.confirm("¿Estás seguro de que quieres eliminar este chat?")) {
      try {
        setErrorStatus(null);
        await chatService.deleteChat(chatId);
        await loadChats();
        if (currentChatId === chatId) {
          setCurrentChatId(null);
        }
      } catch (error: any) {
        console.error(error);
        setErrorStatus(error.message);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !user) return;

    let chatId = currentChatId;
    const prompt = inputText.trim();
    setInputText('');
    setIsSending(true);
    setErrorStatus(null);

    try {
      // 1. Create chat if doesn't exist
      if (!chatId) {
        chatId = await chatService.createChat(user.uid, prompt.slice(0, 30) + "...");
        setCurrentChatId(chatId);
        await loadChats();
      }

      // 2. Add user message locally
      const userMessage: Message = { userId: user.uid, role: 'user', content: prompt, createdAt: new Date() };
      setMessages(prev => [...prev, userMessage]);

      // 3. Add to Firestore
      await chatService.addMessage(chatId!, user.uid, 'user', prompt);

      // 4. Generate Gemini response
      const geminiText = await chatService.generateGeminiResponse(messages, prompt);

      // 5. Add model message locally
      const modelMessage: Message = { userId: user.uid, role: 'model', content: geminiText, createdAt: new Date() };
      setMessages(prev => [...prev, modelMessage]);

      // 6. Add to Firestore
      await chatService.addMessage(chatId!, user.uid, 'model', geminiText);
    } catch (error: any) {
      console.error(error);
      setErrorStatus(error.message);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-[#1a1c2c] via-[#4a1942] to-[#252a5e] overflow-hidden relative">
        {/* Background Mesh Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] animate-pulse" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center max-w-lg px-6"
        >
          <div className="mb-8 inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/20 text-white shadow-2xl">
            <Sparkles className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-6xl font-black text-white mb-6 tracking-tight">Gemini<span className="text-blue-400 font-light italic">Plus</span></h1>
          <p className="text-xl text-white/60 mb-10 leading-relaxed">
            Inteligencia artificial de próxima generación con acceso instantáneo vía Google.
          </p>
          <button 
            onClick={signInWithGoogle}
            className="group flex items-center justify-center gap-3 w-full bg-white text-neutral-900 py-4 px-8 rounded-2xl font-bold text-lg hover:bg-neutral-100 transition-all shadow-xl hover:shadow-2xl active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 rounded-full" />
            Empezar ahora con Google
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <div className="mt-16 flex gap-12 justify-center opacity-20">
            <Bot className="w-10 h-10 text-white" />
            <MessageSquare className="w-10 h-10 text-white" />
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#1a1c2c] text-white font-sans overflow-hidden relative">
      {/* Mesh Background for App */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          x: sidebarOpen ? 0 : -320,
          width: sidebarOpen ? 320 : 0
        }}
        className={cn(
          "fixed lg:relative z-50 h-full bg-white/5 backdrop-blur-2xl border-r border-white/10 overflow-hidden flex flex-col transition-all duration-300 m-0 lg:m-4 lg:rounded-3xl shadow-2xl",
          !sidebarOpen && "lg:w-0 lg:m-0 border-none"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-400 to-emerald-400 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            </div>
            Gemini<span className="text-blue-400 font-light italic text-sm ml-1">Plus</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 mb-8">
          <button 
            onClick={createNewChat}
            className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white p-4 rounded-xl font-bold transition-all group shadow-inner"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            Nueva charla
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
          <div className="text-[10px] uppercase tracking-widest text-white/40 px-2 font-bold mb-2">Recientes</div>
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                setCurrentChatId(chat.id);
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 w-full p-4 rounded-xl text-left transition-all group border",
                currentChatId === chat.id 
                  ? "bg-white/15 border-white/10 shadow-lg" 
                  : "bg-transparent border-transparent text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate text-sm font-medium">{chat.title}</span>
              <Trash2 
                className="w-4 h-4 opacity-0 group-hover:opacity-60 hover:text-red-400 transition-all" 
                onClick={(e) => handleDeleteChat(e, chat.id)}
              />
            </button>
          ))}
        </div>

        <div className="p-6 mt-auto border-t border-white/10">
          <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-full bg-indigo-500 overflow-hidden shadow-lg border-2 border-white/20">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-bold truncate">{user.displayName}</div>
              <div className="text-[10px] text-emerald-400 font-medium">Google Auth Activo</div>
            </div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 w-full p-3 text-xs text-white/40 hover:text-white/80 hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-md border border-white/10 m-4 rounded-2xl z-30 shadow-xl">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg border border-white/5">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              <h2 className="text-sm font-bold text-white/90 truncate max-w-[200px] sm:max-w-md">
                {currentChatId ? chats.find(c => c.id === currentChatId)?.title : 'Modelo: Gemini 3 Flash'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2">
                <div className="w-5 h-5 bg-white/90 rounded-full flex items-center justify-center text-[10px] text-black font-black">G</div>
                <span className="text-[11px] text-white/40 font-bold uppercase tracking-widest">Sincronizado</span>
             </div>
          </div>
        </header>

        {/* Error Alert */}
        <AnimatePresence>
          {errorStatus && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 bg-red-500 text-white text-xs font-bold flex items-center justify-between overflow-hidden"
            >
              <div className="flex-1 truncate pr-4">
                Error de base de datos: {errorStatus}
              </div>
              <button onClick={() => setErrorStatus(null)} className="p-1 hover:bg-white/20 rounded">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
          {!currentChatId && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-40">
              <Sparkles className="w-20 h-20 mb-6 text-blue-400" />
              <h3 className="text-2xl font-black text-white mb-2">Gemini Pro</h3>
              <p className="text-sm font-medium text-white/60 italic">¡Hola! Estoy listo para ayudarte con tu cuenta de Google. ¿En qué puedo asistirte hoy?</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "flex gap-4 p-5 rounded-3xl",
                    msg.role === 'user' 
                      ? "bg-indigo-600/30 border border-indigo-400/30 ml-auto max-w-[85%] flex-row-reverse" 
                      : "bg-white/5 backdrop-blur-sm border border-white/10 mr-auto max-w-[85%]"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center border shadow-lg",
                    msg.role === 'user' ? "bg-indigo-500 border-indigo-400" : "bg-blue-500/20 border-blue-500/40"
                  )}>
                    {msg.role === 'user' ? <span className="text-[10px] font-bold">TÚ</span> : <span className="text-blue-400 text-xs font-bold">G</span>}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-white/90">
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isSending && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4 p-5 mr-auto max-w-[85%] bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1.5 h-9">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={handleSendMessage}
              className="relative group"
            >
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 flex items-center shadow-2xl transition-all focus-within:border-white/20 focus-within:bg-white/10">
                <button type="button" className="p-3 text-white/30 hover:text-white/60 transition-colors">
                  <Plus className="w-6 h-6" />
                </button>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Pregunta lo que quieras..."
                  rows={1}
                  className="bg-transparent border-none focus:ring-0 text-sm flex-1 px-4 text-white placeholder-white/20 outline-none resize-none font-medium min-h-[48px] max-h-40 flex items-center pt-3"
                />
                <div className="flex gap-2 pr-2">
                  <button 
                    type="submit"
                    disabled={isSending || !inputText.trim()}
                    className="w-14 h-11 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 disabled:grayscale disabled:opacity-40 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Send className="w-5 h-5 text-white transform -rotate-12 group-hover:rotate-0 transition-transform" />
                  </button>
                </div>
              </div>
            </form>
            <div className="mt-4 text-[10px] text-center text-white/20 font-black uppercase tracking-[0.25em]">
              Potenciado por Gemini 3 Flash & Firebase
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
