import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AppUser, IssueCategory, IssuePriority, CivicIssue } from '../types';
import { 
  Sparkles, MessageSquare, X, Send, Mic, MicOff, CheckCircle2, 
  MapPin, AlertTriangle, HelpCircle, ArrowRight, CornerDownLeft, 
  Loader2, LogIn, Edit2, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AudioVisualizer from './AudioVisualizer';

interface AIChatAssistantProps {
  user: AppUser | null;
  onUserChange?: (user: AppUser) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractedData?: {
    title: string | null;
    description: string | null;
    category: IssueCategory | null;
    priority: IssuePriority | null;
    address: string | null;
  };
  isReadyToSubmit?: boolean;
}

export default function AIChatAssistant({ user, onUserChange }: AIChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Namaste! Welcome to Community Hero AI Assistant. 🌟\nI can help you report local civic complaints (like potholes, water leaks, broken streetlights, or drainage problems) in English, Telugu (తెలుగు), or Hindi (हिंदी).\n\nYou can type your complaint below or click the microphone icon to speak!',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [speechLang, setSpeechLang] = useState<'te-IN' | 'hi-IN' | 'en-IN'>('en-IN');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Complaint submit details
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftCategory, setDraftCategory] = useState<IssueCategory>('other');
  const [draftPriority, setDraftPriority] = useState<IssuePriority>('medium');
  const [draftAddress, setDraftAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lastTicketId, setLastTicketId] = useState('');
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = speechLang;
      
      rec.onstart = () => {
        setIsRecording(true);
      };
      
      rec.onend = () => {
        setIsRecording(false);
      };
      
      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
      
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      };
      
      recognitionRef.current = rec;
    }
  }, [speechLang]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Voice speech-to-text is not supported in this browser window. Please try typing instead!");
      return;
    }

    if (isRecording) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(60); } catch (e) {}
      }
      recognitionRef.current.stop();
    } else {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([40, 30, 40]); } catch (e) {}
      }
      recognitionRef.current.lang = speechLang;
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    // Append User Message
    const userMsgId = Math.random().toString(36).substring(7);
    const newMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsTyping(true);

    try {
      // Send chat log to backend proxy endpoint
      // We map the full conversation history to feed back to the server
      const conversationHistory = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory })
      });

      const responseData = await res.json();
      if (responseData.success && responseData.data) {
        const payload = responseData.data;
        const assistantMsgId = Math.random().toString(36).substring(7);
        
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: payload.reply,
          timestamp: new Date(),
          extractedData: payload.extractedData,
          isReadyToSubmit: payload.isReadyToSubmit
        };

        setMessages(prev => [...prev, assistantMsg]);

        // If data is ready, synchronize with local draft state
        if (payload.isReadyToSubmit && payload.extractedData) {
          setDraftTitle(payload.extractedData.title || 'Civic issue reported');
          setDraftDescription(payload.extractedData.description || 'Details regarding the problem.');
          setDraftCategory(payload.extractedData.category || 'other');
          setDraftPriority(payload.extractedData.priority || 'medium');
          setDraftAddress(payload.extractedData.address || '');
          setSubmitSuccess(false);
          setIsEditingDraft(false);
        }
      } else {
        throw new Error(responseData.error || 'Failed parsing response');
      }
    } catch (err: any) {
      console.error('AI assistant chat endpoint error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: 'Oops, I encountered a connection hitch while consulting my model. Please retry or rephrase your complaint.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleDemoSignIn = () => {
    if (onUserChange) {
      const mockUser: AppUser = {
        uid: 'mock_citizen_456',
        email: 'jane.citizen@gmail.com',
        displayName: 'Jane Doe (Citizen)',
        photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        isAdmin: false
      };
      localStorage.setItem('mock_user', JSON.stringify(mockUser));
      onUserChange(mockUser);
    }
  };

  const submitComplaintDirectly = async () => {
    if (!user) return;
    if (!draftTitle || !draftDescription || !draftAddress) {
      alert("Please ensure the complaint title, description, and location are provided.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Geolocate or use default SF/Hyd center if browser coordinates aren't ready
      let latitude = 37.7749;
      let longitude = -122.4194;

      // Try fetching active location coordinates
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              latitude = pos.coords.latitude;
              longitude = pos.coords.longitude;
              resolve();
            },
            () => {
              // Fail silently, fallback to defaults
              resolve();
            },
            { timeout: 4000 }
          );
        });
      }

      const issueData: Omit<CivicIssue, 'id'> = {
        title: draftTitle.trim(),
        description: draftDescription.trim(),
        category: draftCategory,
        status: 'pending',
        priority: draftPriority,
        reporterName: user.displayName,
        reporterEmail: user.email,
        reporterUid: user.uid,
        latitude,
        longitude,
        address: draftAddress.trim(),
        upvotes: [],
        createdAt: new Date().toISOString(),
        statusHistory: [
          {
            status: 'pending',
            note: 'Complaint registered successfully via AI Chat Assistant.',
            updatedBy: 'AI Assistant',
            updatedAt: new Date().toISOString()
          }
        ],
        aiAnalysis: {
          categoryExplanation: 'Identified conversationally by AI Chat Assistant.',
          priorityExplanation: 'Urgency tier computed from hazard priority analysis.',
          summary: draftDescription.length > 100 ? `${draftDescription.substring(0, 100)}...` : draftDescription
        }
      };

      const docRef = await addDoc(collection(db, 'issues'), issueData);
      setLastTicketId(docRef.id);
      setSubmitSuccess(true);
      
      // Send a follow-up success confirmation inside message logs
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: `🎉 Outstanding! I've registered your civic complaint successfully in our system under Ticket ID: **${docRef.id}**.\n\nYou can track the progress live on the community dashboard immediately! Thank you for being a Community Hero. ❤️`,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.error('Error submitting complaint via chat:', err);
      alert('Failed to submit complaint to database. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryTheme = (cat: IssueCategory) => {
    switch (cat) {
      case 'potholes': return { label: '🛠️ Potholes', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'water_leakage': return { label: '💧 Water Leakage', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'garbage': return { label: '🗑️ Garbage Pile', bg: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'damaged_streetlights': return { label: '💡 Streetlights', bg: 'bg-yellow-50 text-yellow-800 border-yellow-200' };
      case 'road_accidents': return { label: '⚠️ Road Accidents', bg: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'drainage_problems': return { label: '🌊 Drainage', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      default: return { label: '📌 Other', bg: 'bg-slate-50 text-slate-800 border-slate-200' };
    }
  };

  const getPriorityTheme = (prio: IssuePriority) => {
    switch (prio) {
      case 'critical': return 'bg-rose-100 text-rose-800 border-rose-300 font-black';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
      case 'low': return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center justify-center" id="floating-ai-button-wrapper">
        <motion.button
          id="btn-ai-chat-toggle"
          onClick={() => setIsOpen(!isOpen)}
          className="relative bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-full p-4 shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border border-emerald-500/20 group cursor-pointer"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Decorative halo pulse effect */}
          <span className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping opacity-60" />
          
          <AnimatePresence mode="wait">
            {isOpen ? (
              <X key="close-icon" className="w-6 h-6 rotate-90" />
            ) : (
              <Sparkles key="sparkles-icon" className="w-6 h-6 animate-pulse" />
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Main Slide-up Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-chat-window-container"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 w-full max-w-[420px] h-[580px] bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col border-slate-200/50"
          >
            {/* Header portion */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-950/80 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">Community Hero AI</h3>
                  <div className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-[10px] text-slate-300 font-medium">Telugu, Hindi & English Assistant</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Language voice selection panel */}
            <div className="bg-slate-50 border-b border-slate-100 py-1.5 px-4 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-500 font-bold flex items-center space-x-1">
                <Mic className="w-3.5 h-3.5 text-slate-400" />
                <span>Speech Language:</span>
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setSpeechLang('en-IN')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    speechLang === 'en-IN' 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  🇬🇧 English
                </button>
                <button
                  onClick={() => setSpeechLang('te-IN')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    speechLang === 'te-IN' 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  తెలుగు
                </button>
                <button
                  onClick={() => setSpeechLang('hi-IN')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    speechLang === 'hi-IN' 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  हिंदी
                </button>
              </div>
            </div>

            {/* Chat message thread space */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Text bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed whitespace-pre-line ${
                      m.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Extract data box */}
                  {m.role === 'assistant' && m.isReadyToSubmit && (
                    <div className="w-full mt-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-md text-slate-800">
                      <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 mb-3">
                        <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-800">AI Complaint Form Draft</span>
                      </div>

                      {/* Display Edit / Show form fields */}
                      <div className="space-y-2 text-[11px]">
                        {isEditingDraft ? (
                          <div className="space-y-2 border border-slate-100 p-2 rounded-xl bg-slate-50/50">
                            <div>
                              <label className="font-bold text-[10px] text-slate-500">Title</label>
                              <input
                                type="text"
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                className="w-full text-xs p-1.5 border border-slate-200 rounded-lg mt-0.5 bg-white"
                              />
                            </div>
                            <div>
                              <label className="font-bold text-[10px] text-slate-500">Description</label>
                              <textarea
                                value={draftDescription}
                                onChange={(e) => setDraftDescription(e.target.value)}
                                className="w-full text-xs p-1.5 border border-slate-200 rounded-lg mt-0.5 bg-white h-16 resize-none"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="font-bold text-[10px] text-slate-500">Category</label>
                                <select
                                  value={draftCategory}
                                  onChange={(e) => setDraftCategory(e.target.value as IssueCategory)}
                                  className="w-full text-xs p-1 border border-slate-200 rounded-lg mt-0.5 bg-white"
                                >
                                  <option value="potholes">🛠️ Potholes</option>
                                  <option value="water_leakage">💧 Water Leakage</option>
                                  <option value="garbage">🗑️ Garbage</option>
                                  <option value="damaged_streetlights">💡 Streetlights</option>
                                  <option value="road_accidents">⚠️ Accidents</option>
                                  <option value="drainage_problems">🌊 Drainage</option>
                                  <option value="other">📌 Other</option>
                                </select>
                              </div>
                              <div>
                                <label className="font-bold text-[10px] text-slate-500">Priority</label>
                                <select
                                  value={draftPriority}
                                  onChange={(e) => setDraftPriority(e.target.value as IssuePriority)}
                                  className="w-full text-xs p-1 border border-slate-200 rounded-lg mt-0.5 bg-white"
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                  <option value="critical">Critical</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="font-bold text-[10px] text-slate-500">Address / Location</label>
                              <input
                                type="text"
                                value={draftAddress}
                                onChange={(e) => setDraftAddress(e.target.value)}
                                className="w-full text-xs p-1.5 border border-slate-200 rounded-lg mt-0.5 bg-white"
                              />
                            </div>
                            <div className="flex justify-end space-x-1.5 pt-1">
                              <button
                                onClick={() => setIsEditingDraft(false)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Done</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Reported Ticket</span>
                                <span className="font-bold text-slate-700 text-xs">{draftTitle}</span>
                              </div>
                              <button
                                onClick={() => setIsEditingDraft(true)}
                                className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center space-x-1 shrink-0 p-1 bg-emerald-50 rounded-lg text-[10px] cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit Draft</span>
                              </button>
                            </div>

                            <div>
                              <span className="font-bold text-slate-400 block uppercase text-[8px] tracking-wider">Description</span>
                              <p className="text-slate-600 leading-relaxed mt-0.5">{draftDescription}</p>
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getCategoryTheme(draftCategory).bg}`}>
                                {getCategoryTheme(draftCategory).label}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${getPriorityTheme(draftPriority)}`}>
                                {draftPriority} urgency
                              </span>
                            </div>

                            <div className="flex items-start space-x-1 pt-2 text-slate-500 border-t border-slate-100 mt-2">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{draftAddress || 'Detecting via GPS...'}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Action Submission controls */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                        {!user ? (
                          <div className="bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100">
                            <span className="text-[10px] text-slate-500 block leading-tight font-medium">To file this complaint, you need a citizen account.</span>
                            <button
                              onClick={handleDemoSignIn}
                              className="mt-1.5 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <LogIn className="w-3 h-3" />
                              <span>Log In (Citizen Demo)</span>
                            </button>
                          </div>
                        ) : submitSuccess ? (
                          <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-150">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Successfully filed! ticket: {lastTicketId.slice(0, 8)}...</span>
                          </div>
                        ) : (
                          <button
                            onClick={submitComplaintDirectly}
                            disabled={isSubmitting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Registering Ticket...</span>
                              </>
                            ) : (
                              <>
                                <span>🚀 File Civic Complaint Now</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {/* Typing loader */}
              {isTyping && (
                <div className="flex items-start space-x-1">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form space */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white border-t border-slate-150 flex items-center space-x-2 shrink-0"
              id="ai-chat-input-form"
            >
              {/* Voice microphone recorder trigger */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isRecording 
                    ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                }`}
                title={isRecording ? 'Listening... click to pause' : 'Speak to AI'}
              >
                {isRecording ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4" />}
              </button>

              {isRecording ? (
                <div className="flex-1 flex items-center justify-between px-3 h-[38px] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  <span className="text-[10px] text-rose-600 font-extrabold animate-pulse shrink-0 mr-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                    Listening...
                  </span>
                  <div className="flex-1 max-w-[180px] h-[24px] flex items-center justify-end">
                    <AudioVisualizer isRecording={isRecording} color="#e11d48" barCount={18} height={20} />
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type civic problem description..."
                  className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50"
                />
              )}

              <button
                type="submit"
                disabled={!inputText.trim() || isRecording}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-700/10 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
