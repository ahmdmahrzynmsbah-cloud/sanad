import React, { useEffect, useState } from 'react';
import {
  PhoneCall,
  Mail,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ContactInfo, ContactWhatsappItem } from '../types';

interface ContactUsViewProps {
  onBackToHome?: () => void;
  contactData?: ContactInfo | null;
}

const DEFAULT_CONTACT_DATA: ContactInfo = {
  whatsappNumbers: [
    {
      id: 'wa-1',
      name: 'الدعم الفني والاستفسارات العامة',
      number: '0599123456',
      description: 'متاح للرد على المشاكل التقنية واستفسارات المنظومة وحسابات المستخدمين',
    },
    {
      id: 'wa-2',
      name: 'خدمة المشتركين والمراجعات الجمركية',
      number: '0568987654',
      description: 'لتفعيل وتجديد الاشتراكات الدائمة والمتابعات التشريعية والضريبية',
    },
  ],
  email: 'support@pal-customs.ps',
  secondaryEmail: 'info@customs.pmof.ps',
  phoneNumbers: [
    {
      id: 'ph-1',
      name: 'هاتف الإدارة العامة (رام الله)',
      number: '+970 2 297 8888',
    },
  ],
  workHours: 'الأحد - الخميس: 8:00 صباحاً - 3:30 مساءً (الاستجابة عبر الواتساب على مدار الساعة)',
  address: 'دولة فلسطين • رام الله والبيرة • مجمع الوزارات • وزارة المالية - الإدارة العامة للجمارك وضريبة القيمة المضافة',
  notes: 'فريق العمل والمستشارون متاحون للتواصل الفوري عبر قنوات الواتساب المباشرة أو البريد الإلكتروني الرسمي.',
  updatedAt: new Date().toISOString(),
};

export const ContactUsView: React.FC<ContactUsViewProps> = ({ onBackToHome, contactData: propData }) => {
  const [contact, setContact] = useState<ContactInfo>(propData || DEFAULT_CONTACT_DATA);
  const [loading, setLoading] = useState(!propData);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (propData) {
      setContact(propData);
      setLoading(false);
      return;
    }

    const fetchContact = async () => {
      try {
        const res = await fetch('/api/system/contact');
        if (res.ok) {
          const data = await res.json();
          if (data && data.contactInfo) {
            setContact(data.contactInfo);
          }
        }
      } catch (err) {
        console.warn('Failed to load contact info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [propData]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  // Format phone number for international WhatsApp link
  const formatWhatsAppUrl = (rawNumber: string, customText?: string) => {
    let clean = rawNumber.replace(/[^0-9]/g, '');
    if (clean.startsWith('05')) {
      clean = '970' + clean.substring(1);
    } else if (clean.startsWith('00')) {
      clean = clean.substring(2);
    }
    const defaultText = customText || 'السلام عليكم، أود الاستفسار بخصوص منظومة الضرائب والجمارك الفلسطينية.';
    return `https://wa.me/${clean}?text=${encodeURIComponent(defaultText)}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-10 text-slate-800 space-y-5 sm:space-y-8" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-[#12281e] via-[#1b3d2f] to-[#0c1c15] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-xl border border-emerald-500/20 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 left-0 -translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 translate-x-12 translate-y-12 w-72 h-72 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] sm:text-xs font-bold shadow-xs">
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>قنوات التواصل المباشر والمساعدة الفورية</span>
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              اتصل بنا وخدمة المكلفين والمشتركين
            </h1>

            <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
              يسعدنا تواصلكم المباشر مع إدارة المنظومة وفريق الدعم الفني والاستشارات الجمركية والضريبية. نحن هنا لتقديم المساعدة الفورية، تفعيل الاشتراكات، والإجابة على استفساراتكم.
            </p>
          </div>

          {onBackToHome && (
            <button
              id="contact-back-to-home-btn"
              onClick={onBackToHome}
              className="self-start md:self-center px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all border border-white/15 hover:border-emerald-400/40 cursor-pointer shadow-xs shrink-0"
            >
              <ArrowRight className="w-4 h-4 text-emerald-400" />
              <span>العودة للرئيسية</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: WhatsApp Numbers + Email */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column (7 cols): WhatsApp Numbers */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6">
          {/* WhatsApp Direct Cards Section */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm border border-slate-200 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60 shadow-xs">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    أرقام التواصل عبر واتساب (WhatsApp)
                  </h2>
                  <p className="text-xs text-slate-500">
                    تواصل فوري ومباشر مع الدعم الفني والمشرفين بنقرة واحدة
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Sparkles className="w-3 h-3" />
                استجابة سريعة
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                جاري تحميل أرقام التواصل...
              </div>
            ) : contact.whatsappNumbers && contact.whatsappNumbers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {contact.whatsappNumbers.map((waItem: ContactWhatsappItem, idx: number) => {
                  const isCopied = copiedId === waItem.id;
                  const waUrl = formatWhatsAppUrl(waItem.number);

                  return (
                    <div
                      key={waItem.id || idx}
                      className="bg-gradient-to-b from-emerald-50/50 to-white rounded-2xl p-5 border border-emerald-100/90 hover:border-emerald-300 transition-all hover:shadow-md flex flex-col justify-between group space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            {waItem.name || 'رقم تواصل واتساب'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            قناة رقم {idx + 1}
                          </span>
                        </div>

                        <div className="font-mono text-lg font-bold text-slate-900 tracking-wider flex items-center gap-2 pt-1" dir="ltr">
                          {waItem.number}
                        </div>

                        {waItem.description && (
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {waItem.description}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        <a
                          id={`contact-wa-btn-${idx}`}
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-100" />
                          <span>محادثة واتساب</span>
                          <ExternalLink className="w-3 h-3 text-emerald-200" />
                        </a>

                        <button
                          id={`contact-copy-wa-btn-${idx}`}
                          onClick={() => copyToClipboard(waItem.number, waItem.id)}
                          className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                            isCopied
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                          title="نسخ رقم الواتساب"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                لم يتم إدخال أرقام واتساب حالياً. يمكنك التواصل عبر البريد الإلكتروني أدناه.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Email Info Card */}
        <div className="lg:col-span-5 space-y-6">
          {/* Email Info Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/60 shadow-xs">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  البريد الإلكتروني الرسمي
                </h3>
                <p className="text-[11px] text-slate-500">للمراسلات الرسمية والدعم</p>
              </div>
            </div>

            {/* Primary Email */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
              <div className="text-[11px] font-bold text-blue-900">
                البريد الإلكتروني الأساسي
              </div>
              <div className="font-mono text-sm font-bold text-slate-800 break-all" dir="ltr">
                {contact.email || 'support@pal-customs.ps'}
              </div>
              <div className="flex gap-2 pt-1">
                <a
                  id="contact-primary-email-btn"
                  href={`mailto:${contact.email || 'support@pal-customs.ps'}`}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>مراسلة الآن</span>
                </a>
                <button
                  id="contact-copy-email-btn"
                  onClick={() => copyToClipboard(contact.email || 'support@pal-customs.ps', 'primary-email')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all border ${
                    copiedId === 'primary-email'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                  title="نسخ البريد"
                >
                  {copiedId === 'primary-email' ? (
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Secondary Email if present */}
            {contact.secondaryEmail && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700">
                  البريد البديل / الشكاوى والمقترحات
                </div>
                <div className="font-mono text-xs font-semibold text-slate-700 break-all" dir="ltr">
                  {contact.secondaryEmail}
                </div>
                <div className="pt-1">
                  <a
                    href={`mailto:${contact.secondaryEmail}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    <span>إرسال بريد بديل</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
