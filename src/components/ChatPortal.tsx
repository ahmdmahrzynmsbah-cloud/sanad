import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User as UserIcon,
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
  FileUp,
  Sparkles,
  HelpCircle,
  MessageSquare,
  Home,
  Paperclip,
  Image as ImageIcon,
  Eye,
  X,
  Loader2,
  ScanText,
  CheckCircle2,
  AlertCircle,
  FileSearch,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { User, ChatMessage, Conversation, SystemBranding, Law, CitationSource, AttachedDocumentInfo } from '../types';
import { ChatSidebar } from './ChatSidebar';
import { SanadServicesSidebar } from './SanadServicesSidebar';
import { UserUploadQuotaBadge } from './UserUploadQuotaBadge';
import { SourceCitationBox } from './SourceCitationBox';
import { useSync } from '../utils/sync';
import { directFetchLawsFromFirestore } from '../services/clientFirestore';
import { generateClientKnowledgeFallback, isLegalTaxCustomsQuery, findCitationsForQuery, parseCitationsFromResponseText } from '../utils/localLegalSearch';
import { processChatUploadedDocument } from '../utils/tesseractOcr';
import { formatBytes } from '../utils/pdfParser';

interface ChatPortalProps {
  currentUser: User;
  lawsCount: number;
  branding?: SystemBranding;
  onLogout?: () => void;
  onOpenSubmitLaw?: () => void;
  onBackToHome?: () => void;
}

export const ChatPortal: React.FC<ChatPortalProps> = ({
  currentUser,
  lawsCount,
  branding,
  onLogout,
  onOpenSubmitLaw,
  onBackToHome,
}) => {
  const systemName = branding?.systemName || 'مساعد الجمارك والضرائب';
  const logoType = branding?.logoType || 'preset';
  const logoPreset = branding?.logoPreset || 'scale';
  const logoUrl = branding?.logoUrl;
  const logoAccentColor = branding?.logoAccentColor || '#d4af37';
  const chatbotLogoUrl = branding?.chatbotLogoUrl;
  const chatbotName = branding?.chatbotName || 'سَنَد';

  const renderBotIcon = () => {
    if (chatbotLogoUrl) {
      return (
        <img
          src={chatbotLogoUrl}
          alt={chatbotName}
          className="w-full h-full object-contain p-0.5 rounded"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
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

  const cleanLegacyWelcomeText = (text: string): string => {
    return text
      .replace(/يمكنك محادثتي وسؤالي عن أي شيء في أي وقت:\s*\n?/g, '')
      .replace(/- \*\*الدردشة والتحية\*\*:[^\n]*\n?/g, '')
      .replace(/- \*\*القوانين والتشريعات\*\*:[^\n]*\n?/g, '')
      .replace(/- \*\*الضرائب والجمارك\*\*:[^\n]*\n?/g, '')
      .replace(/أو اختر من الأسئلة الاسترشادية أدناه\.?/g, 'وسأقوم بالرد عليك وتوضيح كافة التفاصيل فوراً.');
  };

  const getWelcomeMessage = (): ChatMessage => ({
    id: 'welcome-' + Date.now(),
    sender: 'bot',
    text: `مرحباً بك أخي الكريم **${currentUser.fullName || currentUser.username}** في **${systemName}**.

أنا مستشارك الذكي ومساعدك التفاعلي في كل ما يتعلق بالقوانين والأنظمة المالية والضريبية والجمركية، بالإضافة للإجابة على جميع تساؤلاتك واستفساراتك العامة بكل ترحيب.

تفضل بكتابة استفسارك في الأسفل وسأقوم بالرد عليك وتوضيح كافة التفاصيل فوراً.`,
    timestamp: new Date().toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' }),
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
          const cleaned = parsed[0].messages.map((m) => {
            if (m.sender === 'bot') {
              return {
                ...m,
                text: cleanLegacyWelcomeText(m.text),
              };
            }
            return m;
          });
          return cleaned;
        }
      }
    } catch {}
    return [getWelcomeMessage()];
  });

  const [inputPrompt, setInputPrompt] = useState(() => {
    try {
      const initial = sessionStorage.getItem('sanad_initial_prompt');
      if (initial) {
        sessionStorage.removeItem('sanad_initial_prompt');
        return initial;
      }
    } catch {}
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Document Attachment & Tesseract OCR State
  interface AttachedFileState {
    file: File;
    fileName: string;
    fileSizeFormatted: string;
    extractedText: string;
    numPages: number;
    wordCount: number;
    isOcr: boolean;
    method: string;
    status: 'extracting' | 'ready' | 'error';
    progressPercent: number;
    progressText: string;
    errorMessage?: string;
  }

  const [attachedFile, setAttachedFile] = useState<AttachedFileState | null>(null);
  const [previewDocTextModal, setPreviewDocTextModal] = useState<AttachedDocumentInfo | null>(null);
  const [copiedModalText, setCopiedModalText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelected = async (file: File) => {
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(lowerName);
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');

    setAttachedFile({
      file,
      fileName: file.name,
      fileSizeFormatted: formatBytes(file.size),
      extractedText: '',
      numPages: 1,
      wordCount: 0,
      isOcr: isImage || isPdf,
      method: isImage ? 'tesseract_ocr' : isPdf ? 'tesseract_ocr' : 'file_parser',
      status: 'extracting',
      progressPercent: 12,
      progressText: isImage
        ? 'جاري تشغيل محرك Tesseract OCR للتعرف الضوئي على المستند المصور...'
        : isPdf
        ? 'جاري فحص ملف الـ PDF وتشغيل Tesseract OCR للصفحات الممسوحة...'
        : 'جاري استخراج وقراءة محتوى المستند بالكامل...',
    });

    try {
      const result = await processChatUploadedDocument(file, (p) => {
        setAttachedFile((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            progressPercent: p.percent,
            progressText: p.statusText,
            numPages: p.totalPages || prev.numPages,
          };
        });
      });

      setAttachedFile({
        file,
        fileName: result.fileName,
        fileSizeFormatted: result.fileSizeFormatted,
        extractedText: result.text,
        numPages: result.numPages,
        wordCount: result.wordCount,
        isOcr: result.isOcr,
        method: result.method,
        status: 'ready',
        progressPercent: 100,
        progressText: 'اكتمل استخراج النصوص بواسطة Tesseract بنجاح',
      });
    } catch (err: any) {
      console.error('[Chat OCR] File processing error:', err);
      setAttachedFile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'error',
          progressPercent: 100,
          errorMessage: 'تعذر استخراج النص تلقائياً من المستند. يرجى التأكد من صلاحية الملف والمحاولة مجدداً.',
        };
      });
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  useEffect(() => {
    scrollToBottom('smooth');
    const timer = setTimeout(() => scrollToBottom('auto'), 120);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  // Laws list for live client-side citation enrichment and fallback
  const [lawsList, setLawsList] = useState<Law[]>([]);

  const fetchLawsDatabase = async () => {
    try {
      const direct = await directFetchLawsFromFirestore();
      if (direct && direct.length > 0) {
        setLawsList(direct);
        return;
      }
      const res = await fetch('/api/laws');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setLawsList(data);
      }
    } catch (e) {
      console.warn('Could not load laws for citations:', e);
    }
  };

  useEffect(() => {
    fetchLawsDatabase();
  }, []);

  useSync(['laws', 'all'], () => {
    fetchLawsDatabase();
  });

  // Sync conversations from backend API upon mounting
  const fetchCloudConversations = async () => {
    try {
      const res = await fetch(`/api/conversations?userId=${encodeURIComponent(currentUser.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.conversations && Array.isArray(data.conversations)) {
          const cleanedConvs = data.conversations.map((c: Conversation) => ({
            ...c,
            messages: (c.messages || []).map((m: ChatMessage) =>
              m.sender === 'bot' ? { ...m, text: cleanLegacyWelcomeText(m.text) } : m
            ),
          }));
          setConversations(cleanedConvs);
          localStorage.setItem(storageKey, JSON.stringify(cleanedConvs));
        }
      }
    } catch (err) {
      console.warn('Could not sync conversations from server:', err);
    }
  };

  useEffect(() => {
    fetchCloudConversations();
  }, [currentUser.id]);

  useSync(['conversations', 'all'], () => {
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
    const rawQuery = (textToSend || inputPrompt).trim();
    if (loading) return;

    let query = rawQuery;
    let currentAttachedDoc: AttachedDocumentInfo | undefined = undefined;
    let attachedDocTextToSend = '';
    let attachedDocNameToSend = '';

    if (attachedFile && attachedFile.status === 'ready' && attachedFile.extractedText) {
      currentAttachedDoc = {
        fileName: attachedFile.fileName,
        fileSizeFormatted: attachedFile.fileSizeFormatted,
        numPages: attachedFile.numPages,
        wordCount: attachedFile.wordCount,
        isOcr: attachedFile.isOcr,
        method: attachedFile.method,
        extractedSnippet:
          attachedFile.extractedText.slice(0, 280) +
          (attachedFile.extractedText.length > 280 ? '...' : ''),
        fullExtractedText: attachedFile.extractedText,
      };
      attachedDocTextToSend = attachedFile.extractedText;
      attachedDocNameToSend = attachedFile.fileName;

      if (!query) {
        query = `يرجى قراءة وتحليل هذا المستند المرفق بالكامل (${attachedFile.fileName})، واستخراج كافة مواده وبنوده وتقديم ملخص تحليلي وافٍ ودقيق لأهم أحكامه.`;
      }
    }

    if (!query) return;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' }),
      attachedDoc: currentAttachedDoc,
    };

    const updatedMessagesWithUser = [...messages, userMessage];
    setMessages(updatedMessagesWithUser);
    setInputPrompt('');
    setAttachedFile(null);
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
    // Update local state and localStorage for immediate responsiveness without spamming backend sync
    setConversations((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === inProgressConv.id);
      let updated: Conversation[];
      if (existingIdx !== -1) {
        updated = [...prev];
        updated[existingIdx] = inProgressConv;
      } else {
        updated = [inProgressConv, ...prev];
      }
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          message: query,
          conversationHistory: updatedMessagesWithUser.slice(-10),
          userId: currentUser.id,
          username: currentUser.username,
          attachedDocumentText: attachedDocTextToSend || undefined,
          attachedDocumentName: attachedDocNameToSend || undefined,
        }),
      });

      let botResponseText = '';
      let isQueryLegal = isLegalTaxCustomsQuery(query);
      let resQueryType: 'legal' | 'general' = isQueryLegal ? 'legal' : 'general';
      let resSuggestedDetails: string[] | undefined = undefined;
      let botCitations: CitationSource[] | undefined = undefined;

      if (res.ok) {
        const data = await res.json();
        botResponseText = data.reply || 'عذراً، لم أتمكن من استرجاع إجابة مطابقة في الوقت الحالي.';
        if (typeof data.isLegal === 'boolean') isQueryLegal = data.isLegal;
        if (data.queryType) resQueryType = data.queryType;
        if (Array.isArray(data.suggestedDetails) && isQueryLegal && resQueryType === 'legal') {
          resSuggestedDetails = data.suggestedDetails;
        } else {
          resSuggestedDetails = undefined;
        }
        if (Array.isArray(data.citations) && data.citations.length > 0 && isQueryLegal && resQueryType === 'legal') {
          botCitations = data.citations;
        } else {
          botCitations = undefined;
        }
      } else {
        // Parse error response if provided by backend
        let serverError = '';
        let isFrozen = false;
        let isPending = false;
        try {
          const errData = await res.json();
          serverError = errData.error || '';
          if (errData.status === 'frozen' || errData.isFrozen) isFrozen = true;
          if (errData.status === 'pending') isPending = true;
        } catch {}

        if (res.status === 403) {
          if (isFrozen || serverError.includes('تجميد') || serverError.includes('الفترة التجريبية')) {
            botResponseText = '⚠️ عذراً، تم تجميد حسابك لانتهاء الفترة التجريبية المحددة. يرجى التواصل مع الإدارة أو الاشتراك لتفعيل الحساب ومتابعة الاستخدام.';
          } else if (isPending || serverError.includes('المراجعة')) {
            botResponseText = '⚠️ حسابك ما زال قيد المراجعة الإدارية. يرجى الانتظار لحين اعتماد حسابك من قبل الإدارة.';
          } else {
            botResponseText = serverError || '⚠️ ليس لديك صلاحية استخدام المساعد الذكي حالياً.';
          }
          resSuggestedDetails = undefined;
          botCitations = undefined;
        } else {
          // Fallback: If server returned an error or Vercel function timed out
          console.warn('[Chat] Backend returned status:', res.status, 'Attempting direct client knowledge fallback...');
          try {
            const directLaws = lawsList.length > 0 ? lawsList : await directFetchLawsFromFirestore();
            botResponseText = generateClientKnowledgeFallback(query, directLaws || []);
            if (isQueryLegal && resQueryType === 'legal') {
              botCitations = findCitationsForQuery(query, directLaws || []);
            }
          } catch {
            botResponseText = generateClientKnowledgeFallback(query, []);
          }
        }
      }

      // If legal query and citations not received from backend, extract directly ONLY if truly legal
      if (!botCitations && isQueryLegal && resQueryType === 'legal') {
        try {
          const directLaws = lawsList.length > 0 ? lawsList : await directFetchLawsFromFirestore();
          const found = findCitationsForQuery(query, directLaws || []);
          if (found && found.length > 0) {
            botCitations = found;
          } else {
            const parsed = parseCitationsFromResponseText(botResponseText, directLaws || []);
            if (parsed && parsed.length > 0) botCitations = parsed;
          }
        } catch {}
      }

      const botMessage: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' }),
        isLegal: isQueryLegal,
        queryType: resQueryType,
        suggestedDetails: resSuggestedDetails,
        citations: botCitations,
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
      console.warn('[Chat] Network error, attempting direct client knowledge fallback...', err);
      let fallbackText = '';
      const isQueryLegal = isLegalTaxCustomsQuery(query);
      let errCitations: CitationSource[] | undefined = undefined;

      try {
        const directLaws = lawsList.length > 0 ? lawsList : await directFetchLawsFromFirestore();
        fallbackText = generateClientKnowledgeFallback(query, directLaws || []);
        if (isQueryLegal) {
          errCitations = findCitationsForQuery(query, directLaws || []);
        }
      } catch {
        fallbackText = generateClientKnowledgeFallback(query, []);
      }

      if (!fallbackText) {
        fallbackText = '⚠️ تعذر الاتصال بالخادم حالياً. يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.';
      }

      const errorMessage: ChatMessage = {
        id: 'err-' + Date.now(),
        sender: 'bot',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' }),
        isLegal: isQueryLegal,
        queryType: isQueryLegal ? 'legal' : 'general',
        suggestedDetails: isQueryLegal
          ? [
              'صفة المكلف: فرد طبيعي (موظف/مهني)',
              'صفة المكلف: شركة تجارية/مساهمة',
              'سنة المعاملة: 2024م',
              'شحنة أو طرد بريدي شخصي',
            ]
          : undefined,
        citations: errCitations,
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
        <div className="bg-white border border-zinc-950 rounded-2xl px-2 sm:px-3.5 py-2 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 text-zinc-700 overflow-x-auto scrollbar-none touch-scroll py-0.5">
            {/* Quick Home Return on Mobile */}
            {onBackToHome && (
              <button
                id="mobile-chat-back-home-btn"
                onClick={onBackToHome}
                className="lg:hidden p-1.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 transition-colors flex items-center gap-1 cursor-pointer font-bold text-xs shrink-0 min-h-[36px]"
                title="العودة للصفحة الرئيسية"
              >
                <Home className="w-4 h-4 text-emerald-800" />
                <span className="hidden xs:inline">الرئيسية</span>
              </button>
            )}

            {/* Mobile Open History Sidebar Button (Right) */}
            <button
              id="mobile-toggle-sidebar-btn"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 transition-colors flex items-center gap-1 cursor-pointer font-bold text-xs shrink-0 min-h-[36px]"
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

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
              <span className="font-semibold text-zinc-800 hidden xs:inline">قاعدة المعرفة:</span>
              <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-lg border border-zinc-300 font-medium text-[11px]">
                {lawsCount && lawsCount > 0 ? lawsCount : 149} تشريع وقانون
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-nowrap shrink-0 overflow-x-auto scrollbar-none py-0.5">
            {/* User Daily Upload & Storage Quota Badge */}
            <UserUploadQuotaBadge
              currentUser={currentUser}
              onOpenSubmitLaw={onOpenSubmitLaw}
            />

            {currentUser.isSubscribed ? (
              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <Crown className="w-3 h-3 text-amber-600" />
                مشترك
              </span>
            ) : (
              <span className="bg-zinc-100 text-zinc-700 border border-zinc-300 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
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
        <div
          ref={messagesContainerRef}
          className="flex-1 bg-white rounded-2xl border border-zinc-950 shadow-2xs overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5 touch-scroll"
        >
          {messages.map((msg, messageIndex) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 sm:gap-3 w-full ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Bot Avatar on start edge */}
              {msg.sender === 'bot' && (
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border overflow-hidden bg-[#0f241d] text-[#d4af37] border-[#1d473a]"
                >
                  {renderBotIcon()}
                </div>
              )}

              {/* Bubble Container */}
              <div
                className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-xs relative group ${
                  msg.sender === 'user'
                    ? 'bg-emerald-50/90 text-emerald-950 border border-emerald-100/50 rounded-tr-xs'
                    : 'bg-white text-zinc-800 border border-zinc-200/60 rounded-tl-xs'
                }`}
              >
                {/* Header inside bot message */}
                {msg.sender === 'bot' && (
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 mb-2.5 border-b border-zinc-100 text-[11px] text-emerald-700 font-bold">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {systemName}
                      </span>
                      {/* Classification Badge: Virtual Persona / General Chat vs Legal Citation */}
                      {msg.queryType === 'legal' || msg.isLegal ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          <Scale className="w-3 h-3 text-amber-600" />
                          استشارة قانونية • سند موثق
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-300/80 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          دردشة عامة • شخصية افتراضية
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 font-normal">{msg.timestamp}</span>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="text-zinc-400 hover:text-emerald-700 p-1 rounded transition-colors"
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
                  <div>
                    {msg.attachedDoc && (
                      <div className="mb-2 p-2.5 rounded-xl bg-white/95 border border-emerald-300 text-xs text-emerald-950 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-emerald-100">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {msg.attachedDoc.fileName.toLowerCase().match(/\.(png|jpe?g|webp|bmp)$/i) ? (
                              <ImageIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                            )}
                            <span className="font-bold truncate max-w-[200px] sm:max-w-xs">{msg.attachedDoc.fileName}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-semibold">
                              {msg.attachedDoc.isOcr ? 'Tesseract OCR' : 'مستند'}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                            {msg.attachedDoc.fileSizeFormatted}
                          </span>
                        </div>
                        {msg.attachedDoc.extractedSnippet && (
                          <p className="text-[11px] text-zinc-600 bg-zinc-50/90 p-1.5 rounded-lg border border-zinc-200/60 font-mono line-clamp-2 leading-relaxed text-right">
                            {msg.attachedDoc.extractedSnippet}
                          </p>
                        )}
                        {msg.attachedDoc.fullExtractedText && (
                          <button
                            type="button"
                            onClick={() => setPreviewDocTextModal(msg.attachedDoc || null)}
                            className="mt-1.5 text-[11px] text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>عرض النص المستخرج كاملاً ({msg.attachedDoc.numPages} {msg.attachedDoc.numPages === 1 ? 'صفحة' : 'صفحات'} • {msg.attachedDoc.wordCount} كلمة)</span>
                          </button>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap font-medium text-emerald-950">{msg.text}</p>
                    <div className="text-[10px] text-emerald-700/70 text-left mt-1 font-mono">
                      {msg.timestamp}
                    </div>
                  </div>
                ) : (
                  <div className="markdown-body space-y-2.5 text-zinc-800">
                    <Markdown
                      components={{
                        h1: ({ children }) => (
                          <div className="bg-gradient-to-l from-emerald-950/5 via-amber-500/10 to-transparent border-r-4 border-emerald-700 pr-3 py-1.5 my-2.5 rounded-l-xl">
                            <h3 className="text-sm sm:text-base font-black text-emerald-950 tracking-tight flex items-center gap-1.5">
                              {children}
                            </h3>
                          </div>
                        ),
                        h2: ({ children }) => (
                          <div className="bg-gradient-to-l from-emerald-900/5 to-transparent border-r-3 border-amber-600 pr-2.5 py-1 my-2 rounded-l-lg">
                            <h4 className="text-xs sm:text-sm font-black text-emerald-900">
                              {children}
                            </h4>
                          </div>
                        ),
                        h3: ({ children }) => (
                          <h5 className="text-xs sm:text-sm font-bold text-emerald-900 mt-2 mb-1 flex items-center gap-1 border-b border-emerald-100 pb-0.5">
                            {children}
                          </h5>
                        ),
                        p: ({ children }) => (
                          <p className="my-1.5 leading-relaxed text-[13px] sm:text-sm text-zinc-800 font-normal">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="space-y-1.5 my-2 pr-1.5 text-zinc-800 list-none">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside space-y-1.5 my-2 pr-2 text-zinc-900 font-medium">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="leading-relaxed flex items-start gap-1.5 text-[13px] sm:text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-2 shrink-0"></span>
                            <div className="flex-1">{children}</div>
                          </li>
                        ),
                        strong: ({ children }) => {
                          const textStr = String(children);
                          const isNumericOrBadge = /[\d%]|شيكل|دينار|سنة|سنوات|المادة|قرار|قانون|سجن|حبس|غرامة|معفاة|إعفاء/i.test(textStr);
                          if (isNumericOrBadge) {
                            return (
                              <strong className="font-bold text-amber-950 bg-amber-100/80 border border-amber-300/70 px-1.5 py-0.5 rounded-md mx-0.5 inline-block shadow-2xs">
                                {children}
                              </strong>
                            );
                          }
                          return (
                            <strong className="font-bold text-emerald-950 bg-emerald-100/70 border border-emerald-200/70 px-1 py-0.5 rounded mx-0.5 inline-block">
                              {children}
                            </strong>
                          );
                        },
                        blockquote: ({ children }) => (
                          <blockquote className="border-r-4 border-[#d4af37] pr-3.5 my-2.5 text-zinc-800 bg-gradient-to-l from-amber-500/10 to-transparent py-2 rounded-l-xl shadow-2xs font-medium text-xs sm:text-sm">
                            {children}
                          </blockquote>
                        ),
                        hr: () => <hr className="border-t border-emerald-200/70 my-3" />,
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-3 rounded-xl border border-zinc-200 shadow-2xs">
                            <table className="w-full text-right text-xs border-collapse">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-emerald-900 text-white font-bold">{children}</thead>,
                        th: ({ children }) => <th className="p-2 border-b border-emerald-800">{children}</th>,
                        td: ({ children }) => <td className="p-2 border-b border-zinc-100 bg-white even:bg-zinc-50">{children}</td>,
                      }}
                    >
                      {msg.text}
                    </Markdown>

                    {/* Source Citation Box: رقم المادة والقانون في صندوق صغير بجانب الإجابة يوضح النص الأصلي المقتبس منه لتعزيز الثقة والموثوقية */}
                    {msg.sender === 'bot' && (() => {
                      const effectiveCitations = (msg.citations && msg.citations.length > 0)
                        ? msg.citations
                        : (msg.isLegal || msg.queryType === 'legal')
                          ? (parseCitationsFromResponseText(msg.text, lawsList).length > 0
                              ? parseCitationsFromResponseText(msg.text, lawsList)
                              : findCitationsForQuery(msg.text, lawsList))
                          : undefined;

                      if (effectiveCitations && effectiveCitations.length > 0) {
                        return <SourceCitationBox citations={effectiveCitations} isLegal={msg.isLegal} />;
                      }
                      return null;
                    })()}

                    {/* Interactive Suggested Details Action Chips - only show on the most recent bot message */}
                    {msg.sender === 'bot' && msg.suggestedDetails && msg.suggestedDetails.length > 0 && messageIndex === messages.length - 1 && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 flex flex-col gap-1.5">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                          تحديد التفاصيل بنقرة سريعة للاستشارة:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedDetails.map((detail, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendMessage(detail)}
                              className="text-[11px] bg-amber-50/80 hover:bg-amber-100 text-amber-950 border border-amber-300/80 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                            >
                              <Plus className="w-3 h-3 text-amber-700" />
                              <span>{detail}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {msg.sender === 'user' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border bg-zinc-100 text-zinc-700 border-zinc-200">
                  <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600" />
                </div>
              )}
            </div>
          ))}

          {/* Quick Guided Exploration Cards: General Persona Chat vs Legal Queries */}
          {messages.length <= 1 && (
            <div className="my-2 grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {/* Card 1: General Knowledge & Persona Chat */}
              <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-3 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-emerald-900">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>دردشة عامة ومعرفة (شخصية افتراضية):</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {[
                    'هل أنت إنسان؟',
                    'ماذا تعرف عن محمد صلاح؟',
                    'ما هي أركان الدين الإسلامي؟',
                  ].map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="text-right text-[11px] bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-100 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <span>{q}</span>
                      <Send className="w-2.5 h-2.5 rotate-180 text-emerald-600 group-hover:translate-x-[-2px] transition-transform shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Card 2: Legal & Tax Consultations */}
              <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-amber-950">
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  <span>استشارات قانونية وضريبية (فلسطين):</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {[
                    'ما هي نسبة ضريبة القيمة المضافة؟',
                    'ما هي إعفاءات ضريبة الدخل للموظفين؟',
                    'شروط جمارك الطرود البريدية الشخصية؟',
                  ].map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(q)}
                      className="text-right text-[11px] bg-white hover:bg-amber-50 text-amber-950 border border-amber-200/80 px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <span>{q}</span>
                      <Send className="w-2.5 h-2.5 scale-x-[-1] text-amber-600 group-hover:translate-x-[-2px] transition-transform shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#0f241d] text-[#d4af37] border border-[#1d473a] flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-[#fafcfb] border border-zinc-200/70 rounded-2xl rounded-tl-xs p-3.5 text-xs text-zinc-600 shadow-2xs flex items-center gap-3">
                <span className="w-4 h-4 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin"></span>
                <span className="font-medium text-emerald-950">
                  جاري صياغة الإجابة وتحليل الاستفسار...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Modern Responsive Input Bar */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileSelected(file);
          }}
          className="bg-white border border-slate-300 sm:border-slate-800/80 rounded-2xl sm:rounded-2xl p-2 sm:p-2.5 shadow-md sm:shadow-sm shrink-0 transition-all focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/20 flex flex-col gap-2"
        >
          {/* Active Attachment Extraction / Ready Status Bar */}
          {attachedFile && (
            <div className="animate-fadeIn">
              {attachedFile.status === 'extracting' && (
                <div className="p-2.5 rounded-xl bg-gradient-to-l from-amber-50 to-emerald-50/50 border border-amber-300/80 text-amber-950 text-xs flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
                      <span className="font-bold flex items-center gap-1 shrink-0 text-amber-900">
                        <ScanText className="w-3.5 h-3.5 text-amber-700" />
                        معالج Tesseract OCR:
                      </span>
                      <span className="font-mono text-zinc-800 truncate max-w-[160px] sm:max-w-xs">{attachedFile.fileName}</span>
                    </div>
                    <span className="font-bold font-mono text-amber-800 shrink-0">{attachedFile.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-amber-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 via-emerald-600 to-emerald-700 h-1.5 transition-all duration-300 rounded-full"
                      style={{ width: `${attachedFile.progressPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-amber-900/90 flex items-center justify-between font-medium">
                    <span className="truncate">{attachedFile.progressText}</span>
                    <span className="shrink-0 font-mono text-[10px] text-zinc-500">{attachedFile.fileSizeFormatted}</span>
                  </div>
                </div>
              )}

              {attachedFile.status === 'ready' && (
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                      {attachedFile.file.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold truncate max-w-[180px] sm:max-w-xs">{attachedFile.fileName}</span>
                        <span className="bg-emerald-200/90 text-emerald-950 text-[10px] px-1.5 py-0.2 rounded-md font-bold font-mono">
                          {attachedFile.isOcr ? 'Tesseract OCR' : 'نص رقمي'}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-mono">
                          ({attachedFile.wordCount} كلمة • {attachedFile.numPages} {attachedFile.numPages === 1 ? 'صفحة' : 'صفحات'})
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-800 flex items-center gap-1 font-medium mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>تم استخراج النص بالكامل وهو جاهز للإرسال والتحليل الذكي</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDocTextModal({
                          fileName: attachedFile.fileName,
                          fileSizeFormatted: attachedFile.fileSizeFormatted,
                          numPages: attachedFile.numPages,
                          wordCount: attachedFile.wordCount,
                          isOcr: attachedFile.isOcr,
                          method: attachedFile.method,
                          fullExtractedText: attachedFile.extractedText,
                        })
                      }
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-900 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="معاينة النص المستخرج"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="hidden xs:inline">معاينة النص</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="p-1.5 hover:bg-emerald-200/70 text-emerald-800 rounded-lg transition-colors cursor-pointer"
                      title="إزالة المرفق"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {attachedFile.status === 'error' && (
                <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{attachedFile.errorMessage || 'حدث خطأ أثناء قراءة المستند.'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1 text-red-700 hover:text-red-900 rounded cursor-pointer"
                    title="إغلاق"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-1.5 sm:gap-2"
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,image/*,.docx,.doc,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelected(file);
                }
                e.target.value = '';
              }}
            />

            {/* Paperclip attachment button */}
            <button
              type="button"
              id="chat-attach-file-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || attachedFile?.status === 'extracting'}
              title="إرفاق ملف PDF ممسوح ضوئياً أو صورة مستند (استخراج بنظام Tesseract OCR)"
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-zinc-200 hover:border-emerald-600 hover:bg-emerald-50/70 text-zinc-600 hover:text-emerald-900 transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              ref={inputRef}
              id="chat-query-input"
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={loading || attachedFile?.status === 'extracting'}
              placeholder={
                attachedFile?.status === 'ready'
                  ? `اطرح استفسارك حول ${attachedFile.fileName} أو اضغط إرسال لتحليل شامل...`
                  : 'اكتب استفسارك الجمركي أو الضريبي هنا، أو أرفق مستنداً/صورة...'
              }
              className="flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-900 bg-transparent focus:outline-none placeholder-slate-400 min-h-[44px]"
            />

            <button
              id="chat-send-btn"
              type="submit"
              disabled={
                loading ||
                attachedFile?.status === 'extracting' ||
                (!inputPrompt.trim() && (!attachedFile || attachedFile.status !== 'ready'))
              }
              title="إرسال الاستفسار (Enter)"
              className="h-11 px-4 sm:px-5 bg-gradient-to-r from-emerald-800 to-[#103025] hover:from-emerald-700 hover:to-emerald-900 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:from-slate-400 disabled:to-slate-500 shrink-0 cursor-pointer min-w-[44px]"
            >
              <span>إرسال</span>
              <Send className="w-4 h-4 text-[#e2b952] scale-x-[-1] transition-transform group-hover:translate-x-[-2px]" />
            </button>
          </form>
        </div>
      </div>

      {/* 3. Floating Modern Persistent & Collapsible Sidebar (Left: Sanad Suite Services) */}
      <SanadServicesSidebar
        isOpenMobile={isMobileServicesOpen}
        onCloseMobile={() => setIsMobileServicesOpen(false)}
        isCollapsed={isServicesCollapsed}
        onToggleCollapse={() => setIsServicesCollapsed((prev) => !prev)}
      />

      {/* Full Extracted Text Preview Modal (Tesseract OCR / Document Inspector) */}
      {previewDocTextModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-zinc-300 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-emerald-950 via-[#0f2d24] to-emerald-900 text-white flex items-center justify-between gap-3 border-b border-emerald-800 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-800/80 text-amber-300 border border-emerald-600/50 flex items-center justify-center shrink-0">
                  <ScanText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base truncate">{previewDocTextModal.fileName}</h3>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {previewDocTextModal.isOcr ? 'Tesseract OCR' : 'نص مستخرج'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80">
                    النص الكامل المستخرج بدقة عالية قبل الإرسال للذكاء الاصطناعي
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewDocTextModal(null);
                  setCopiedModalText(false);
                }}
                className="p-1.5 rounded-xl hover:bg-white/10 text-emerald-100 hover:text-white transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Stats Toolbar */}
            <div className="px-4 sm:px-6 py-2 bg-emerald-50/50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950 shrink-0">
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="flex items-center gap-1">
                  <strong className="font-bold text-emerald-900">{previewDocTextModal.numPages}</strong> صفحة
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <strong className="font-bold text-emerald-900">{previewDocTextModal.wordCount}</strong> كلمة
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  {previewDocTextModal.fullExtractedText?.length || 0} حرف
                </span>
                {previewDocTextModal.fileSizeFormatted && (
                  <>
                    <span>•</span>
                    <span className="font-mono">{previewDocTextModal.fileSizeFormatted}</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (previewDocTextModal.fullExtractedText) {
                    navigator.clipboard.writeText(previewDocTextModal.fullExtractedText);
                    setCopiedModalText(true);
                    setTimeout(() => setCopiedModalText(false), 2000);
                  }
                }}
                className="px-3 py-1 bg-white hover:bg-emerald-100/60 border border-emerald-300 rounded-lg text-emerald-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {copiedModalText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم النسخ بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-emerald-700" />
                    <span>نسخ النص الكامل</span>
                  </>
                )}
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-50/50">
              <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-2xs">
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-zinc-900 leading-relaxed text-right select-text font-normal">
                  {previewDocTextModal.fullExtractedText || 'لا يوجد نص مستخرج.'}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 bg-white border-t border-zinc-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-zinc-500">
                يتم إرسال هذا النص الكامل إلى المستشار الذكي لضمان استخلاص أدق التفاصيل القانونية.
              </span>
              <button
                type="button"
                onClick={() => {
                  setPreviewDocTextModal(null);
                  setCopiedModalText(false);
                }}
                className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPortal;
