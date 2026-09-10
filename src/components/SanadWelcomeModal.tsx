import React, { useState } from 'react';
import {
  Sparkles,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  X,
  Scale,
  ShieldCheck,
  Zap,
  BookOpen,
  Send,
  HelpCircle,
  CheckCircle2,
  Cpu,
  User as UserIcon
} from 'lucide-react';

interface SanadWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionAsked?: (question: string) => void;
}

// Large, highly detailed vector SVG mascot for Sanad (المستشار الذكي سَنَد)
const SanadMascotEnlarged: React.FC<{ className?: string }> = ({ className = 'w-48 h-56' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Outer ambient glow circles */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/25 via-[#d4af37]/20 to-teal-400/20 rounded-full blur-2xl animate-pulse pointer-events-none"></div>
      <div className="absolute -bottom-2 w-32 h-6 bg-black/40 rounded-full blur-md"></div>

      <svg
        viewBox="0 0 240 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] relative z-10 transition-transform duration-500 hover:scale-105"
      >
        <defs>
          {/* Head & Body Gradients */}
          <linearGradient id="sanadHeadGrad" x1="40" y1="30" x2="200" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e5c4d" />
            <stop offset="50%" stopColor="#10362c" />
            <stop offset="100%" stopColor="#081e18" />
          </linearGradient>

          <linearGradient id="sanadVisorGrad" x1="50" y1="70" x2="190" y2="135" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#051410" />
            <stop offset="50%" stopColor="#0a261f" />
            <stop offset="100%" stopColor="#020a08" />
          </linearGradient>

          <linearGradient id="sanadGoldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fae084" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#997b1a" />
          </linearGradient>

          <linearGradient id="sanadEyeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          <linearGradient id="sanadChestGrad" x1="60" y1="180" x2="180" y2="270" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#194f41" />
            <stop offset="70%" stopColor="#0b241d" />
            <stop offset="100%" stopColor="#061612" />
          </linearGradient>

          <filter id="sanadGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Antenna */}
        <line x1="120" y1="18" x2="120" y2="46" stroke="url(#sanadGoldGrad)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="120" cy="14" r="8" fill="url(#sanadGoldGrad)" filter="url(#sanadGlow)" />
        <circle cx="120" cy="14" r="3" fill="#ffffff" />
        {/* Antenna radio rings */}
        <path d="M104 10 C112 4, 128 4, 136 10" stroke="#fae084" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <path d="M96 6 C110 -2, 130 -2, 144 6" stroke="#fae084" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />

        {/* Ears / Headphone Modules */}
        {/* Left Ear */}
        <rect x="26" y="78" width="16" height="42" rx="8" fill="url(#sanadGoldGrad)" stroke="#10362c" strokeWidth="2" />
        <circle cx="34" cy="99" r="4" fill="#0b241d" />
        {/* Right Ear */}
        <rect x="198" y="78" width="16" height="42" rx="8" fill="url(#sanadGoldGrad)" stroke="#10362c" strokeWidth="2" />
        <circle cx="206" cy="99" r="4" fill="#0b241d" />

        {/* Head Base Outer Shadow & Rim */}
        <rect x="36" y="38" width="168" height="124" rx="36" fill="#0a261f" />
        <rect x="38" y="40" width="164" height="120" rx="34" fill="url(#sanadHeadGrad)" stroke="url(#sanadGoldGrad)" strokeWidth="2.5" />

        {/* Glossy Curved Visor */}
        <rect x="52" y="58" width="136" height="74" rx="20" fill="url(#sanadVisorGrad)" stroke="#1e5c4d" strokeWidth="2" />

        {/* Specular Visor Highlight (glass reflection) */}
        <path d="M60 66 Q120 54 180 66 Q120 74 60 66 Z" fill="#ffffff" opacity="0.12" />

        {/* Expressive Glowing Eyes */}
        {/* Left Eye */}
        <g filter="url(#sanadGlow)">
          <rect x="74" y="78" width="28" height="28" rx="8" fill="url(#sanadEyeGrad)" />
          <rect x="78" y="82" width="8" height="8" rx="2" fill="#ffffff" />
          <path d="M74 74 Q88 70 102 74" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Right Eye */}
        <g filter="url(#sanadGlow)">
          <rect x="138" y="78" width="28" height="28" rx="8" fill="url(#sanadEyeGrad)" />
          <rect x="142" y="82" width="8" height="8" rx="2" fill="#ffffff" />
          <path d="M138 74 Q152 70 166 74" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Digital Mouth / Audio Visualizer Wave */}
        <path d="M102 118 Q120 126 138 118" stroke="#34d399" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />
        <circle cx="94" cy="116" r="2" fill="#6ee7b7" opacity="0.6" />
        <circle cx="146" cy="116" r="2" fill="#6ee7b7" opacity="0.6" />

        {/* Headset Boom Microphone */}
        <path d="M36 104 C36 136 60 144 86 142" stroke="url(#sanadGoldGrad)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="88" cy="142" rx="6" ry="4" fill="#fae084" />
        <circle cx="88" cy="142" r="2" fill="#10362c" />

        {/* Neck connector */}
        <rect x="100" y="156" width="40" height="14" rx="4" fill="#0a261f" stroke="#d4af37" strokeWidth="1.5" />
        <line x1="108" y1="163" x2="132" y2="163" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />

        {/* Torso / Body Armor */}
        <path
          d="M58 170 Q120 162 182 170 L202 245 Q120 265 38 245 Z"
          fill="url(#sanadChestGrad)"
          stroke="url(#sanadGoldGrad)"
          strokeWidth="2.5"
        />

        {/* Golden Chest Shield Badge (The Scales of Justice / Palestine Emblem) */}
        <g transform="translate(120, 206)">
          {/* Shield background */}
          <path
            d="M0 -22 L18 -10 L18 10 Q0 24 -18 10 L-18 -10 Z"
            fill="#061a14"
            stroke="url(#sanadGoldGrad)"
            strokeWidth="1.8"
          />
          {/* Scales of Justice mini icon inside badge */}
          <line x1="0" y1="-14" x2="0" y2="14" stroke="#fae084" strokeWidth="1.8" />
          <line x1="-12" y1="-8" x2="12" y2="-8" stroke="#fae084" strokeWidth="1.8" strokeLinecap="round" />
          {/* Left Pan */}
          <path d="M-12 -6 L-16 2 L-8 2 Z" fill="#fae084" />
          {/* Right Pan */}
          <path d="M12 -6 L8 2 L16 2 Z" fill="#fae084" />
          <circle cx="0" cy="-14" r="2" fill="#ffffff" />
        </g>

        {/* Shoulder Armor Plates */}
        <path d="M44 180 Q24 200 36 230" stroke="#d4af37" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M196 180 Q216 200 204 230" stroke="#d4af37" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
      </svg>
    </div>
  );
};

export const SanadWelcomeModal: React.FC<SanadWelcomeModalProps> = ({
  isOpen,
  onClose,
  onQuestionAsked,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [question, setQuestion] = useState<string>('');

  if (!isOpen) return null;

  const quickQuestions = [
    'كم نسبة ضريبة القيمة المضافة في فلسطين؟',
    'ما هي شروط وإجراءات الإعفاء الجمركي للبضائع والطرود؟',
    'كيف يتم احتساب شرائح ضريبة الدخل السنوية للأفراد والشركات؟',
    'ما هي رسوم وضرائب استيراد المركبات في فلسطين؟',
  ];

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    } else {
      // Step 2 finished: close modal and reveal the site normally
      if (question.trim() && onQuestionAsked) {
        onQuestionAsked(question.trim());
      }
      onClose();
    }
  };

  const handleSkipOrClose = () => {
    if (question.trim() && onQuestionAsked) {
      onQuestionAsked(question.trim());
    }
    onClose();
  };

  return (
    <div
      id="sanad-welcome-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300"
      dir="rtl"
    >
      <div
        id="sanad-welcome-modal-card"
        className="relative w-full max-w-4xl bg-gradient-to-br from-[#0a231c] via-[#071914] to-[#040f0c] border-2 border-emerald-500/35 rounded-[28px] sm:rounded-[36px] shadow-2xl shadow-emerald-950/90 text-white overflow-hidden my-auto p-5 sm:p-8 lg:p-10"
      >
        {/* Luxury Background Glows & Ambient Highlights */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#d4af37]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header Bar with Close / Skip Button */}
        <div className="relative z-10 flex items-center justify-between gap-4 border-b border-emerald-500/20 pb-4 mb-6">
          {/* Logo & National Flag Mark */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-[#d4af37]/20 border border-emerald-500/40 flex items-center justify-center text-[#d4af37] shadow-inner shadow-emerald-500/20">
              <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] sm:text-xs font-bold text-emerald-400">
                  دولة فلسطين • المنظومة الذكية للجمارك والضرائب
                </span>
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                {step === 1 ? 'اسأل سَنَد • المساعد الرقمي' : 'من هو سَنَد؟ • الهوية والمهمة'}
              </h1>
            </div>
          </div>

          {/* Step Pill Controls & Close Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 bg-black/40 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-semibold">
              <span
                className={`px-2.5 py-0.5 rounded-full transition-all ${
                  step === 1 ? 'bg-emerald-500 text-white shadow' : 'text-slate-400'
                }`}
              >
                ١. اسأل سَنَد
              </span>
              <span className="text-slate-500">←</span>
              <span
                className={`px-2.5 py-0.5 rounded-full transition-all ${
                  step === 2 ? 'bg-emerald-500 text-white shadow' : 'text-slate-400'
                }`}
              >
                ٢. من هو سَنَد؟
              </span>
            </div>

            <button
              onClick={handleSkipOrClose}
              id="sanad-welcome-modal-close-btn"
              title="إغلاق ودخول الموقع مباشرة"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: اسأل سَنَد (صورة الشات بوت مكبرة مع حقل اكتب استفسارك) */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="relative z-10 space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Main Interactive Grid: Large Chatbot Mascot + Expansive Input Console */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* RIGHT COLUMN: The Prominent, Enlarged Chatbot Mascot Character (صورة الشات بوت مكبرة) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 sm:p-6 rounded-3xl bg-gradient-to-b from-[#0e3328]/70 via-[#0a261e]/80 to-[#061813]/90 border border-emerald-500/30 shadow-xl relative overflow-hidden text-center">
                {/* Background light glow */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none"></div>

                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold mb-3 shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-300"></span>
                  <span>سَنَد متصل وجاهز للرد فوراً</span>
                </div>

                {/* THE ENLARGED CHATBOT FIGURE (صورة الشات بوت مكبرة) */}
                <div className="w-48 h-56 sm:w-56 sm:h-64 my-1">
                  <SanadMascotEnlarged className="w-full h-full" />
                </div>

                {/* Bot Label and Badge */}
                <div className="mt-2 space-y-1">
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center justify-center gap-1.5">
                    <span>المستشار الذكي «سَنَد»</span>
                    <Sparkles className="w-4 h-4 text-[#d4af37]" />
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
                    مساعدك الذكي الموثوق للإجابة المباشرة بالاستناد إلى نصوص التشريعات الفلسطينية الرسمية.
                  </p>
                </div>
              </div>

              {/* LEFT COLUMN: Expansive Inquiries & Prompt Area (اكتب استفسارك هنا) */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                {/* Friendly Greeting Speech Bubble */}
                <div className="relative bg-emerald-950/70 border border-emerald-500/30 rounded-2xl p-4 shadow-sm text-right">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#d4af37]/20 border border-[#d4af37]/40 flex items-center justify-center text-[#fae084] flex-shrink-0 mt-0.5">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                        أهلاً بك! تفضل بطرح سؤالك وسأجيبك عنه في ثوانٍ:
                      </h4>
                      <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
                        اكتب أي استفسار قانوني، جمركي، أو ضريبي يشغل بالك. يمكنك بعد كتابة سؤالك الضغط على <strong className="text-[#d4af37]">«التالي»</strong> للتعرف على سَنَد واستعراض المنظومة كاملة.
                      </p>
                    </div>
                  </div>
                </div>

                {/* واجهة الشات بوت من الداخل (مكان الأسئلة والمحادثة الحقيقية) */}
                <div
                  id="sanad-inner-chat-mockup-card"
                  className="rounded-2xl border-2 border-emerald-500/40 bg-[#071914] shadow-2xl overflow-hidden flex flex-col transition-all text-right"
                >
                  {/* شريط رأس الشات بوت من الداخل */}
                  <div className="bg-gradient-to-r from-[#0d2a21] via-[#09221a] to-[#0d2a21] border-b border-emerald-500/30 px-3.5 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-lg bg-[#04120e] border border-emerald-400/50 flex items-center justify-center text-[#d4af37] shadow-inner">
                          <Scale className="w-4 h-4" />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#071914] animate-pulse"></span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">المستشار سَنَد</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-1.5 py-0.5 rounded">
                            المنظومة الرسمية
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          متصل الآن • جاهز للرد الفوري
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>موثق تشريعياً</span>
                    </div>
                  </div>

                  {/* مساحة المحادثة والرسائل من الداخل */}
                  <div className="p-3.5 space-y-3 bg-gradient-to-b from-[#061611]/90 via-[#040f0c]/95 to-[#071914]/90 max-h-[220px] overflow-y-auto">
                    {/* فقاعة رسالة البوت من جوه */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#0d2a21] border border-emerald-500/40 flex items-center justify-center text-[#fae084] shrink-0 mt-0.5">
                        <Scale className="w-3.5 h-3.5" />
                      </div>
                      <div className="bg-[#0b241c] border border-emerald-500/25 rounded-2xl rounded-tr-xs p-3 text-xs leading-relaxed text-slate-200 shadow-sm max-w-[92%]">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-emerald-500/20 text-[10px] font-bold text-[#fae084]">
                          <span>سَنَد • إفادة نظامية</span>
                          <span className="text-slate-400 font-normal">الآن</span>
                        </div>
                        <p className="text-slate-100">
                          أهلاً بك! أنا مستشارك سَنَد. تفضل بكتابة استفسارك في الأسفل وسأقوم بتحليله والرد عليك فوراً استناداً لأحدث القوانين الفلسطينية.
                        </p>
                      </div>
                    </div>

                    {/* إذا قام المستخدم بكتابة سؤال، تظهر فورا كفقاعة محادثة من المستخدم داخل الشات */}
                    {question.trim() && (
                      <div className="flex items-start justify-end gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
                        <div className="bg-gradient-to-r from-emerald-600 to-[#124e3c] border border-emerald-400/40 rounded-2xl rounded-tl-xs p-3 text-xs text-white shadow-md max-w-[85%]">
                          <div className="text-[10px] text-emerald-200/80 mb-1 flex items-center gap-1 font-semibold">
                            <span>سؤالك:</span>
                          </div>
                          <p className="font-medium whitespace-pre-wrap">{question}</p>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-white shrink-0 mt-0.5">
                          <UserIcon className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}

                    {/* اقتراحات سريعة داخل الشات */}
                    {!question.trim() && (
                      <div className="pt-1 pr-9 space-y-1.5">
                        <div className="text-[10px] text-emerald-300/80 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#fae084]" />
                          <span>مقترحات سريعة بنقرة واحدة:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {quickQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setQuestion(q)}
                              className="text-[11px] px-2.5 py-1 bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-white border border-white/10 hover:border-emerald-400/50 rounded-full transition-all text-right cursor-pointer"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* مكان الأسئلة الحقيقي (شريط الإدخال داخل الشات بوت) */}
                  <div className="p-2.5 bg-[#051410] border-t border-emerald-500/30">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (question.trim()) {
                          handleNextStep();
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <div className="relative flex-1">
                        <input
                          id="sanad-welcome-question-input"
                          type="text"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          placeholder="اكتب استفسارك هنا (مثال: كم نسبة ضريبة القيمة المضافة؟)..."
                          className="w-full bg-[#0a241b] border-2 border-emerald-500/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 text-white placeholder-slate-400 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 pl-9 outline-none transition-all shadow-inner"
                        />
                        {question.trim() && (
                          <button
                            type="button"
                            onClick={() => setQuestion('')}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                            title="مسح"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={!question.trim()}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-[#d4af37] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                        title="إرسال السؤال ومتابعة الخطوة التالية"
                      >
                        <span>إرسال</span>
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-emerald-500/20 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleSkipOrClose}
                className="w-full sm:w-auto text-xs sm:text-sm text-slate-400 hover:text-white py-2 px-3 transition-colors text-center"
              >
                تخطي ودخول الموقع مباشرة
              </button>

              <button
                type="button"
                id="sanad-welcome-step1-next-btn"
                onClick={handleNextStep}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-[#d4af37] hover:brightness-110 text-slate-950 text-base font-black shadow-xl shadow-emerald-950/80 transition-all transform hover:-translate-x-1 active:translate-x-0 cursor-pointer"
              >
                <span>التالي (التعرف على سَنَد)</span>
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: من هو سَنَد؟ (التعريف الكامل والتفصيلي بمنظومة سَنَد الذكية) */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="relative z-10 space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Overview Hero Header */}
            <div className="text-center space-y-2 bg-gradient-to-b from-emerald-950/40 to-transparent p-4 sm:p-6 rounded-3xl border border-emerald-500/25">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-[#d4af37]/25 border-2 border-emerald-400/40 text-[#fae084] shadow-lg shadow-emerald-500/20 mx-auto mb-1">
                <Scale className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                من هو «سَنَد»؟
              </h2>
              <p className="text-emerald-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                «سَنَد» هو أول مستشار رقمي ذكي تفاعلي متكامل، تم بناؤه وتطويره بالكامل لخدمة الاستفسارات والمعاملات الجمركية والضريبية في دولة فلسطين استناداً إلى أحدث التشريعات الرسمية.
              </p>
            </div>

            {/* 4 Rich Pillars / Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-right">
              {/* Pillar 1 */}
              <div className="bg-white/5 hover:bg-white/10 border border-emerald-500/25 rounded-2xl p-4 sm:p-5 transition-all space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2.5 text-[#fae084] font-bold text-sm sm:text-base">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-[#fae084]" />
                  </div>
                  <span>مرجعية تشريعية فلسطينية معتمدة</span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pr-10">
                  مغذي بقاعدة بيانات تشريعية شاملة تضم قانون الجمارك والمكوس، قانون ضريبة الدخل، قانون ضريبة القيمة المضافة، تشجيع الاستثمار، واللوائح التنفيذية النافذة.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="bg-white/5 hover:bg-white/10 border border-emerald-500/25 rounded-2xl p-4 sm:p-5 transition-all space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2.5 text-[#fae084] font-bold text-sm sm:text-base">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[#fae084]" />
                  </div>
                  <span>حسابات ضريبية وجمركية فورية</span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pr-10">
                  يقوم بحساب نسب الضرائب، شرائح الدخل، رسوم استيراد المركبات والسلع، ويعرض النتائج بالأرقام الدقيقة وبالشيكل ₪ في أجزاء من الثانية.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="bg-white/5 hover:bg-white/10 border border-emerald-500/25 rounded-2xl p-4 sm:p-5 transition-all space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2.5 text-[#fae084] font-bold text-sm sm:text-base">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-[#fae084]" />
                  </div>
                  <span>توثيق رسمي بأرقام المواد</span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pr-10">
                  لا يقدم تخمينات؛ بل يستشهد صراحة باسم القانون والقرار بقانون ورقم المادة المحددة لتكون مرجعك القانوني الموثوق أمام الدوائر الرسمية.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="bg-white/5 hover:bg-white/10 border border-emerald-500/25 rounded-2xl p-4 sm:p-5 transition-all space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2.5 text-[#fae084] font-bold text-sm sm:text-base">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-[#fae084]" />
                  </div>
                  <span>جاهزية 24/7 ودعم جميع الفئات</span>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed pr-10">
                  صُمم لدعم التجار، المستوردين، المحاسبين القانونيين، المحامين، وأصحاب الأعمال والمواطنين في أي وقت ومن أي جهاز.
                </p>
              </div>
            </div>

            {/* User Question Status Banner if they entered one in step 1 */}
            {question.trim() && (
              <div className="bg-gradient-to-r from-emerald-950/80 via-[#0e3b2e]/60 to-emerald-950/80 border border-emerald-400/40 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-md">
                <div className="flex items-center gap-2 overflow-hidden">
                  <CheckCircle2 className="w-5 h-5 text-[#fae084] flex-shrink-0" />
                  <div className="truncate">
                    <span className="text-[#fae084] font-bold">سؤالك تم حفظه وجاهز: </span>
                    <span className="text-slate-100 font-medium">«{question}»</span>
                  </div>
                </div>
                <span className="text-[11px] bg-emerald-500 text-slate-950 font-black px-3 py-1 rounded-full flex-shrink-0">
                  سيكون بانتظارك في الشات
                </span>
              </div>
            )}

            {/* Footer Buttons for Step 2 */}
            <div className="pt-4 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-white px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الرجوع إلى نافذة (اسأل سَنَد)</span>
              </button>

              <button
                type="button"
                id="sanad-welcome-step2-finish-btn"
                onClick={handleNextStep}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-[#d4af37] hover:brightness-110 text-slate-950 text-base font-black shadow-xl shadow-emerald-950/80 transition-all transform hover:-translate-x-1 active:translate-x-0 cursor-pointer"
              >
                <span>التالي • دخول الموقع واستعراض المنظومة</span>
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
