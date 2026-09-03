import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User as UserIcon,
  Sparkles,
  Scale,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Info,
  ExternalLink,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import Markdown from 'react-markdown';
import { User, ChatMessage, Law } from '../types';

interface ChatPortalProps {
  currentUser: User;
  lawsCount: number;
}

const SAMPLE_QUESTIONS = [
  'كيف تُحسب ضريبة الدخل السنوية لموظف دخله 90,000 شيكل سنوياً؟',
  'ما هي النسبة العامة لضريبة القيمة المضافة وما السلع المعفاة منها؟',
  'ما هي شروط الإعفاء الجمركي للطرود البريدية ومشتريات التجارة الإلكترونية؟',
  'ما هي الرسوم والجمارك المفروضة على استيراد سيارة ركوب أو سيارة كهربائية؟',
];

export const ChatPortal: React.FC<ChatPortalProps> = ({ currentUser, lawsCount }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `مرحباً بك أخي الكريم **${currentUser.username}** في **مساعد الجمارك والضرائب الفلسطيني**.

أنا مساعدك الافتراضي المتخصص في القوانين والأنظمة المالية الفلسطينية الصادرة عن وزارة المالية والإدارة العامة للجمارك والمكوس وضريبة الدخل.

أجيبك حصرياً بالاستناد إلى **نصوص القوانين والتشريعات المعتمدة في قاعدة المعرفة**. يمكنك طرح أي سؤال حول:
- **ضريبة الدخل**: الإعفاءات السنوية، والشرائح والنسب وحساب الاستحقاق.
- **ضريبة القيمة المضافة**: النسبة العامة (16%)، والسلع والخدمات المعفاة.
- **الجمارك والمكوس**: إعفاءات الطرود البريدية، ورسوم استيراد المركبات والبضائع.

تفضل بكتابة استفسارك أو اختر من الأسئلة الاسترشادية أدناه.`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          username: currentUser.username,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'حدث خطأ أثناء معالجة الرد');
      }

      const botMessage: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: 'err-' + Date.now(),
        sender: 'bot',
        text: `عذراً، حدث خطأ أثناء الاتصال: ${err.message || 'يرجى التحقق من اتصال الإنترنت ومفتاح Gemini والمحاولة ثانية'}.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset-' + Date.now(),
        sender: 'bot',
        text: `تم بدء جلسة استعلام قانونية جديدة. تفضل بطرح استفسارك حول القوانين والأنظمة الضريبية والجمركية الفلسطينية.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col h-[calc(100vh-100px)] min-h-[550px]">
      {/* Top Knowledge Base Status Bar */}
      <div className="bg-white border border-[#d6e0db] rounded-xl px-4 py-2.5 mb-3 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-[#133824]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold">قاعدة المعرفة النشطة:</span>
          <span className="bg-[#edf6f0] text-[#123e25] px-2 py-0.5 rounded border border-[#b8dfc9] font-semibold">
            {lawsCount} تشريعات وقوانين مفعلة
          </span>
          <span className="text-gray-400 hidden sm:inline">|</span>
          <span className="text-gray-500 hidden sm:inline">
            يتم حقن نصوص المواد تلقائياً مع كل استعلام
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="chat-clear-btn"
            onClick={handleClearChat}
            className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            title="بدء جلسة جديدة"
          >
            <RotateCcw className="w-3 h-3" />
            جلسة جديدة
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-white rounded-xl border border-[#d6e0db] shadow-xs overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-xs border ${
                msg.sender === 'bot'
                  ? 'bg-[#12281e] text-[#d4af37] border-[#29563f]'
                  : 'bg-[#f1f5f9] text-[#1e293b] border-gray-300'
              }`}
            >
              {msg.sender === 'bot' ? <Scale className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
            </div>

            {/* Bubble Container */}
            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs relative group ${
                msg.sender === 'user'
                  ? 'bg-[#1b3d2d] text-white rounded-tr-xs'
                  : 'bg-[#fcfdfd] text-gray-900 border border-[#dbe6df] rounded-tl-xs'
              }`}
            >
              {/* Header inside bot message */}
              {msg.sender === 'bot' && (
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#e2ece5] text-[11px] text-[#2c533e] font-bold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1b5e3a]" />
                    مساعد الجمارك والضرائب • إفادة نظامية
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-normal">{msg.timestamp}</span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="text-gray-400 hover:text-[#12281e] p-1 rounded transition-colors"
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
                <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
              ) : (
                <div className="markdown-body space-y-2 text-gray-800">
                  <Markdown
                    components={{
                      h1: ({ children }) => (
                        <h3 className="text-sm sm:text-base font-bold text-[#12281e] mt-2 mb-1 border-b border-gray-100 pb-1">
                          {children}
                        </h3>
                      ),
                      h2: ({ children }) => (
                        <h4 className="text-xs sm:text-sm font-bold text-[#193a2a] mt-2 mb-1">
                          {children}
                        </h4>
                      ),
                      h3: ({ children }) => (
                        <h5 className="text-xs font-bold text-[#234b37] mt-1.5 mb-1">
                          {children}
                        </h5>
                      ),
                      p: ({ children }) => (
                        <p className="my-1.5 leading-relaxed text-[13px] sm:text-sm">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 my-2 pr-1 text-gray-700">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1.5 my-2 pr-1 text-gray-800 font-medium">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => (
                        <strong className="font-extrabold text-[#0d2218] bg-amber-50/60 px-1 rounded">
                          {children}
                        </strong>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-r-4 border-[#1b3d2d] pr-3 my-2 text-gray-600 italic bg-gray-50 py-1 rounded-l">
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
                <div className="text-[10px] text-white/60 text-left mt-1 font-mono">
                  {msg.timestamp}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#12281e] text-[#d4af37] border border-[#29563f] flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5 animate-pulse" />
            </div>
            <div className="bg-[#fcfdfd] border border-[#dbe6df] rounded-xl rounded-tl-xs p-4 text-xs text-gray-600 shadow-xs flex items-center gap-3">
              <span className="w-4 h-4 border-2 border-[#12281e] border-t-transparent rounded-full animate-spin"></span>
              <span className="font-medium text-[#133824]">
                جاري مطابقة الاستفسار مع نصوص القوانين والأنظمة الفلسطينية المعتمدة...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      <div className="py-2.5 overflow-x-auto">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-[#d4af37]" />
            أسئلة شائعة:
          </span>
          {SAMPLE_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading}
              onClick={() => handleSendMessage(q)}
              className="px-2.5 py-1 bg-white border border-[#d1ded6] rounded-full text-[11px] text-[#133824] hover:bg-[#eef6f1] hover:border-[#9dc6ad] transition-colors shadow-2xs truncate max-w-[280px] disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div className="bg-white border border-[#d6e0db] rounded-xl p-2 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            id="chat-query-input"
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={loading}
            placeholder="اكتب استفسارك الضريبي أو الجمركي هنا (مثال: ما هي شروط إعفاء الطرد البريدي؟)..."
            className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 bg-transparent focus:outline-none placeholder-gray-400"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="px-4 py-2.5 bg-[#12281e] hover:bg-[#1a3d2e] text-white text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <span>إرسال</span>
            <Send className="w-3.5 h-3.5 rotate-180" />
          </button>
        </form>
      </div>

      {/* Legal Disclaimer Sub-footer */}
      <div className="text-center mt-2 text-[10px] text-gray-500">
        هذا المساعد الذكي يستند حصرياً إلى نصوص القوانين المعتمدة في قاعدة البيانات. إجاباته استرشادية ولا تُغني عن مراجعة الدائرة المختصة.
      </div>
    </div>
  );
};
