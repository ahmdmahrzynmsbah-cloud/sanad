import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User as UserIcon,
  Sparkles,
  Scale,
  Copy,
  Check,
  BookOpen,
  ShieldCheck,
  Crown,
  Clock,
  Landmark,
  FileText,
  Shield,
  PanelRight,
  PanelLeft,
  Plus,
  Layers,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { User, ChatMessage, Conversation, SystemBranding } from '../types';
import { ChatSidebar } from './ChatSidebar';
import { SanadServicesSidebar } from './SanadServicesSidebar';
import { useSync } from '../utils/sync';

interface ChatPortalProps {
  currentUser: User;
  lawsCount: number;
  branding?: SystemBranding;
  onLogout?: () => void;
}

const SAMPLE_QUESTIONS = [
  'كيف تُحسب ضريبة الدخل السنوية لموظف دخله 90,000 شيكل سنوياً؟',
  'ما هي النسبة العامة لضريبة القيمة المضافة وما السلع المعفاة منها؟',
  'ما هي شروط الإعفاء الجمركي للطرود البريدية ومشتريات التجارة الإلكترونية؟',
  'ما هي الرسوم والجمارك المفروضة على استيراد سيارة ركوب أو سيارة كهربائية؟',
];

export const ChatPortal: React.FC<ChatPortalProps> = ({
  currentUser,
  lawsCount,
  branding,
  onLogout,
}) => {
  const systemName = branding?.systemName || 'مساعد الجمارك والضرائب';
  const logoType = branding?.logoType || 'preset';
  const logoPreset = branding?.logoPreset || 'scale';
  const logoUrl = branding?.logoUrl;
  const logoAccentColor = branding?.logoAccentColor || '#d4af37';

  const renderBotIcon = () => {
    if ((logoType === 'url' || logoType === 'upload') && logoUrl) {
      return <img src={logoUrl} alt={systemName} className="w-full h-full object-contain p-0.5 rounded" />;
    }
    switch (logoPreset) {
      case 'shield':
        return <Shield className="w-4 h-4" style={{ color: logoAccentColor }} />;
      case 'landmark':
        return <Landmark className="w-4 h-4" style={{ color: logoAccentColor }} />;
      case 'scroll':
      case 'file':
        return <FileText className="w-4 h-4" style={{ color: logoAccentColor }} />;
      case 'book':
        return <BookOpen className="w-4 h-4" style={{ color: logoAccentColor }} />;
      case 'scale':
      default:
        return <Scale className="w-4 h-4" style={{ color: logoAccentColor }} />;
    }
  };

  const getWelcomeMessage = (): ChatMessage => ({
    id: 'welcome-' + Date.now(),
    sender: 'bot',
    text: `مرحباً بك أخي الكريم **${currentUser.fullName || currentUser.username}** في **${systemName}**.

أنا مساعدك الافتراضي المتخصص في القوانين والأنظمة المالية الصادرة عن وزارة المالية والإدارة العامة للجمارك والمكوس وضريبة الدخل.

أجيبك حصرياً بالاستناد إلى **نصوص القوانين والتشريعات المعتمدة في قاعدة المعرفة**. يمكنك طرح أي سؤال حول:
- **ضريبة الدخل**: الإعفاءات السنوية، والشرائح والنسب وحساب الاستحقاق.
- **ضريبة القيمة المضافة**: النسبة العامة (16%)، والسلع والخدمات المعفاة.
- **الجمارك والمكوس**: إعفاءات الطرود البريدية، ورسوم استيراد المركبات والبضائع.

تفضل بكتابة استفسارك أو اختر من الأسئلة الاسترشادية أدناه.`,
    timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
  });

  // Responsive Sidebar States
  // Right Sidebar (Chat history): Mobile drawer open state & desktop collapse state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Left Sidebar (Sanad suite services): Mobile drawer open state & desktop collapse state
  const [isMobileServicesOpen, setIsMobileServicesOpen] = useState<boolean>(false);
  const [isServicesCollapsed, setIsServicesCollapsed] = useState<boolean>(false);

  // Local storage key for user's conversations
  const storageKey = `pal_tax_convs_${currentUser.id}`;

  // Conversations State
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [];
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0].id;
      }
    } catch {}
    return null;
  });

  // Current active messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: Conversation[] = JSON.parse(saved);
        if (parsed.length > 0 && parsed[0].messages?.length > 0) {
          return parsed[0].messages;
        }
      }
    } catch {}
    return [getWelcomeMessage()];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Sync conversations from backend API upon mounting
  const fetchCloudConversations = async () => {
    try {
      const res = await fetch(`/api/conversations?userId=${encodeURIComponent(currentUser.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.conversations && Array.isArray(data.conversations)) {
          setConversations(data.conversations);
          localStorage.setItem(storageKey, JSON.stringify(data.conversations));
        }
      }
    } catch (err) {
      console.warn('Could not sync conversations from server:', err);
    }
  };

  useEffect(() => {
    fetchCloudConversations();
  }, [currentUser.id]);

  useSync(['conversations'], () => {
    fetchCloudConversations();
  });

  // Helper to persist conversations locally and to API
  const persistConversation = (conv: Conversation) => {
    setConversations((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === conv.id);
      let updated: Conversation[];
      if (existingIdx !== -1) {
        updated = [...prev];
        updated[existingIdx] = conv;
      } else {
        updated = [conv, ...prev];
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Background sync to server API
    fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conv),
    }).catch((e) => console.warn('Background sync conversation error:', e));
  };

  // Helper to generate a clean, informative title from user prompt
  const generateConversationTitle = (query: string): string => {
    const clean = query.replace(/[\r\n]+/g, ' ').trim();
    if (clean.length <= 35) return clean;
    return clean.slice(0, 35) + '...';
  };

  // Switch to a conversation
  const handleSelectConversation = (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setActiveConversationId(conv.id);
      setMessages(conv.messages && conv.messages.length > 0 ? conv.messages : [getWelcomeMessage()]);
    }
  };

  // Start a new chat
  const handleNewChat = () => {
    setActiveConversationId(null);
    const newWelcome = getWelcomeMessage();
    setMessages([newWelcome]);
    setInputPrompt('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Rename conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c));
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      await fetch(`/api/conversations/${encodeURIComponent(id)}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (e) {
      console.error('Failed to rename conversation on server:', e);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    if (activeConversationId === id) {
      if (updated.length > 0) {
        setActiveConversationId(updated[0].id);
        setMessages(updated[0].messages);
      } else {
        handleNewChat();
      }
    }

    try {
      await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete conversation on server:', e);
    }
  };

  // Clear all conversations
  const handleClearAllConversations = async () => {
    setConversations([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    handleNewChat();

    try {
      await fetch(`/api/conversations?userId=${encodeURIComponent(currentUser.id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to clear conversations on server:', e);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessagesWithUser = [...messages, userMessage];
    setMessages(updatedMessagesWithUser);
    setInputPrompt('');
    setLoading(true);

    const nowIso = new Date().toISOString();
    let currentConvId = activeConversationId;
    let currentConvTitle = '';

    if (!currentConvId) {
      currentConvId = 'conv-' + Date.now();
      currentConvTitle = generateConversationTitle(query);
      setActiveConversationId(currentConvId);
    } else {
      const existing = conversations.find((c) => c.id === currentConvId);
      currentConvTitle = existing?.title || generateConversationTitle(query);
    }

    const inProgressConv: Conversation = {
      id: currentConvId,
      userId: currentUser.id,
      title: currentConvTitle,
      messages: updatedMessagesWithUser,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    persistConversation(inProgressConv);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationHistory: updatedMessagesWithUser.slice(-10),
          userId: currentUser.id,
        }),
      });

      if (!res.ok) {
        throw new Error('فشل الاتصال بخدمة المستشار الذكي');
      }

      const data = await res.json();
      const botResponseText = data.reply || 'عذراً، لم أتمكن من استرجاع إجابة مطابقة في الوقت الحالي.';

      const botMessage: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...updatedMessagesWithUser, botMessage];
      setMessages(finalMessages);

      const completedConv: Conversation = {
        id: currentConvId,
        userId: currentUser.id,
        title: currentConvTitle,
        messages: finalMessages,
        createdAt: inProgressConv.createdAt || nowIso,
        updatedAt: new Date().toISOString(),
      };
      persistConversation(completedConv);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: 'err-' + Date.now(),
        sender: 'bot',
        text: '⚠️ تعذر الوصول إلى قاعدة المعرفة حالياً. يرجى المحاولة مرة أخرى لاحقاً.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      const finalMessages = [...updatedMessagesWithUser, errorMessage];
      setMessages(finalMessages);

      const completedConv: Conversation = {
        id: currentConvId,
        userId: currentUser.id,
        title: currentConvTitle,
        messages: finalMessages,
        createdAt: inProgressConv.createdAt || nowIso,
        updatedAt: new Date().toISOString(),
      };
      persistConversation(completedConv);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full w-full min-h-0 overflow-hidden bg-[#f8faf9] p-1.5 sm:p-3 gap-2 sm:gap-3">
      {/* 1. Floating Modern Persistent & Collapsible Sidebar (Right: Chat History) */}
      <ChatSidebar
        isOpen={isMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        currentUser={currentUser}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onClearAllConversations={handleClearAllConversations}
        onLogout={onLogout}
        branding={branding}
      />

      {/* 2. Main Chat View Container (Center) */}
      <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden max-w-5xl mx-auto w-full gap-1.5 sm:gap-2">
        {/* Top Status & Quick Bar */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl px-2.5 sm:px-3.5 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-700 flex-wrap">
            {/* Mobile Open History Sidebar Button (Right) */}
            <button
              id="mobile-toggle-sidebar-btn"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors flex items-center gap-1 cursor-pointer font-bold text-xs shrink-0 min-h-[36px]"
              title="سجل الاستشارات"
            >
              <PanelRight className="w-4 h-4 text-emerald-800" />
              <span>السجل</span>
              {conversations.length > 0 && (
                <span className="bg-emerald-900 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {conversations.length}
                </span>
              )}
            </button>

            {/* Mobile Open Sanad Suite Services Button (Left) */}
            <button
              id="mobile-toggle-sanad-services-btn"
              onClick={() => setIsMobileServicesOpen(true)}
              className="lg:hidden p-1.5 rounded-xl border border-[#d4af37]/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 transition-colors flex items-center gap-1 cursor-pointer font-bold text-xs shrink-0 min-h-[36px]"
              title="منظومة سند المتكاملة"
            >
              <Layers className="w-4 h-4 text-[#d4af37]" />
              <span>منظومة سند</span>
            </button>

            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
              <span className="font-semibold text-zinc-800">قاعدة المعرفة:</span>
              <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-lg border border-zinc-200 font-medium text-[11px]">
                {lawsCount} تشريعات مفعلة
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {currentUser.isSubscribed ? (
              <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-600" />
                مشترك دائم
              </span>
            ) : (
              <span className="bg-zinc-100 text-zinc-800 border border-zinc-200 text-[11px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-700" />
                تجريبي ({currentUser.remainingTrialDays ?? currentUser.trialDays ?? 7} يوم)
              </span>
            )}

            <button
              id="chat-new-session-btn"
              onClick={handleNewChat}
              className="bg-emerald-900 hover:bg-emerald-800 text-white flex items-center gap-1 text-[11px] font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer shrink-0 min-h-[36px]"
              title="بدء محادثة جديدة"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-300" />
              <span>محادثة جديدة</span>
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5 touch-scroll">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 sm:gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border overflow-hidden ${
                  msg.sender === 'bot'
                    ? 'bg-[#0f241d] text-[#d4af37] border-[#1d473a]'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                {msg.sender === 'bot' ? renderBotIcon() : <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600" />}
              </div>

              {/* Bubble Container */}
              <div
                className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-xs relative group ${
                  msg.sender === 'user'
                    ? 'bg-[#103025] text-white rounded-tr-xs'
                    : 'bg-[#fafcfb] text-zinc-900 border border-zinc-200/70 rounded-tl-xs'
                }`}
              >
                {/* Header inside bot message */}
                {msg.sender === 'bot' && (
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-100 text-[11px] text-emerald-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      {systemName} • إفادة نظامية
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 font-normal">{msg.timestamp}</span>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="text-zinc-400 hover:text-zinc-800 p-1 rounded transition-colors"
                        title="نسخ الإجابة"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Content */}
                {msg.sender === 'user' ? (
                  <p className="whitespace-pre-wrap font-medium text-white">{msg.text}</p>
                ) : (
                  <div className="markdown-body space-y-2 text-zinc-800">
                    <Markdown
                      components={{
                        h1: ({ children }) => (
                          <h3 className="text-sm sm:text-base font-bold text-zinc-900 mt-2 mb-1 border-b border-zinc-100 pb-1">
                            {children}
                          </h3>
                        ),
                        h2: ({ children }) => (
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-800 mt-2 mb-1">
                            {children}
                          </h4>
                        ),
                        h3: ({ children }) => (
                          <h5 className="text-xs font-bold text-zinc-800 mt-1.5 mb-1">
                            {children}
                          </h5>
                        ),
                        p: ({ children }) => (
                          <p className="my-1.5 leading-relaxed text-[13px] sm:text-sm">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside space-y-1 my-2 pr-1 text-zinc-700">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside space-y-1.5 my-2 pr-1 text-zinc-800 font-medium">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        strong: ({ children }) => (
                          <strong className="font-bold text-zinc-950 bg-amber-50/80 px-1 rounded">
                            {children}
                          </strong>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-r-4 border-emerald-800 pr-3 my-2 text-zinc-600 italic bg-zinc-50 py-1 rounded-l">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {msg.text}
                    </Markdown>
                  </div>
                )}

                {msg.sender === 'user' && (
                  <div className="text-[10px] text-emerald-200/70 text-left mt-1 font-mono">
                    {msg.timestamp}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#0f241d] text-[#d4af37] border border-[#1d473a] flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-[#fafcfb] border border-zinc-200/70 rounded-2xl rounded-tl-xs p-3.5 text-xs text-zinc-600 shadow-2xs flex items-center gap-3">
                <span className="w-4 h-4 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin"></span>
                <span className="font-medium text-emerald-950">
                  جاري مطابقة الاستفسار مع نصوص القوانين والأنظمة الفلسطينية المعتمدة...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Questions */}
        <div className="py-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-amber-500" />
              مقترحات:
            </span>
            {SAMPLE_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => handleSendMessage(q)}
                className="px-3 py-1 bg-white border border-zinc-200/80 rounded-full text-[11px] text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors shadow-2xs truncate max-w-[280px] disabled:opacity-50 cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Input Bar */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-1.5 shadow-2xs shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              id="chat-query-input"
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={loading}
              placeholder="اكتب استفسارك الضريبي أو الجمركي هنا (مثال: ما هي شروط إعفاء الطرد البريدي؟)..."
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 bg-transparent focus:outline-none placeholder-zinc-400"
            />
            <button
              id="chat-send-btn"
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="px-4 py-2.5 bg-[#103025] hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            >
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5 rotate-180" />
            </button>
          </form>
        </div>

        {/* Footer / Developer Credit */}
        <div className="text-center mt-2 text-[10px] sm:text-[11px] text-zinc-400 shrink-0">
          تم تطوير وتصميم هذه المنصة الذكية باحترافية عالية بواسطة{' '}
          <a
            href="https://wa.me/201034859313"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#d4af37] font-bold hover:text-[#e2bd40] transition-colors"
          >
            شركة Fox Tech
          </a>
        </div>
      </div>

      {/* 3. Floating Modern Persistent & Collapsible Sidebar (Left: Sanad Suite Services) */}
      <SanadServicesSidebar
        isOpenMobile={isMobileServicesOpen}
        onCloseMobile={() => setIsMobileServicesOpen(false)}
        isCollapsed={isServicesCollapsed}
        onToggleCollapse={() => setIsServicesCollapsed((prev) => !prev)}
      />
    </div>
  );
};
