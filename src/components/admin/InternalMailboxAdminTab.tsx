import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Inbox,
  Send,
  Star,
  Plus,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Reply,
  Clock,
  User,
  Shield,
  Tag,
  ArrowRight,
  Check,
  Sparkles,
  RefreshCw,
  MailCheck,
  CornerUpLeft,
  KeyRound,
  Copy,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { InternalMail, Supervisor } from '../../types';
import { useSync, notifySync } from '../../utils/sync';

interface InternalMailboxAdminTabProps {
  currentSupervisor?: Supervisor | null;
  isAdmin?: boolean;
}

export const InternalMailboxAdminTab: React.FC<InternalMailboxAdminTabProps> = ({
  currentSupervisor,
  isAdmin = true,
}) => {
  const [mail, setMail] = useState<InternalMail[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveTab] = useState<'inbox' | 'sent' | 'starred'>('inbox');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMail, setSelectedMail] = useState<InternalMail | null>(null);

  // Compose Modal State
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeToEmail, setComposeToEmail] = useState<string>('supervisors@sanadtax.ps');
  const [composeToName, setComposeToName] = useState<string>('جميع المشرفين والخبراء');
  const [composeSubject, setComposeToSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [composePriority, setComposePriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [composeCategory, setComposeCategory] = useState<string>('إداري');
  const [isSending, setIsSending] = useState(false);

  // Toast feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Admin General Manager Official Email State
  const [adminCustomEmail, setAdminCustomEmail] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sanad_admin_official_email');
        if (saved) return saved;
      } catch {}
    }
    return 'admin@sanadtax.ps';
  });

  const [adminCustomName, setAdminCustomName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sanad_admin_official_name');
        if (saved) return saved;
      } catch {}
    }
    return 'المدير العام • لوحة التحكم';
  });

  // Modal: Edit Admin Email
  const [showEditAdminEmailModal, setShowEditAdminEmailModal] = useState(false);
  const [editAdminEmailInput, setEditAdminEmailInput] = useState(adminCustomEmail);
  const [editAdminNameInput, setEditAdminNameInput] = useState(adminCustomName);
  const [isSavingAdminEmail, setIsSavingAdminEmail] = useState(false);

  // Identify current user mailbox info
  const myEmail = currentSupervisor?.email || currentSupervisor?.officialEmail || (isAdmin ? adminCustomEmail : 'admin@sanadtax.ps');
  const myName = currentSupervisor?.name || (isAdmin ? adminCustomName : 'المدير العام • لوحة التحكم');
  const myRole = currentSupervisor ? 'supervisor' : 'admin';

  const loadAdminEmailSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/admin-email');
      if (res.ok) {
        const data = await res.json();
        if (data.email) {
          setAdminCustomEmail(data.email);
          setEditAdminEmailInput(data.email);
        }
        if (data.name) {
          setAdminCustomName(data.name);
          setEditAdminNameInput(data.name);
        }
      }
    } catch {}
  };

  const handleSaveAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    let emailToSave = editAdminEmailInput.trim().toLowerCase();
    const nameToSave = editAdminNameInput.trim() || 'المدير العام • لوحة التحكم';

    if (emailToSave) {
      if (!emailToSave.includes('@')) {
        emailToSave = `${emailToSave}@sanadtax.ps`;
      }
    } else {
      emailToSave = 'admin@sanadtax.ps';
    }

    setIsSavingAdminEmail(true);
    setAdminCustomEmail(emailToSave);
    setAdminCustomName(nameToSave);

    try {
      localStorage.setItem('sanad_admin_official_email', emailToSave);
      localStorage.setItem('sanad_admin_official_name', nameToSave);
    } catch {}

    try {
      await fetch('/api/admin/settings/admin-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToSave, name: nameToSave }),
      });
      setFeedback({ type: 'success', message: 'تم تحديث واعتماد بريدك الإلكتروني كمدير عام بنجاح ✉️' });
    } catch {
      setFeedback({ type: 'success', message: 'تم حفظ البريد الإلكتروني محلياً بنجاح ✉️' });
    } finally {
      setIsSavingAdminEmail(false);
      setShowEditAdminEmailModal(false);
      notifySync('admin_email');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  // Fetch supervisors list for recipient select
  const fetchSupervisorsList = async () => {
    try {
      const res = await fetch('/api/supervisors');
      if (res.ok) {
        const data = await res.json();
        if (data.supervisors) setSupervisors(data.supervisors);
      }
    } catch {}
  };

  // Fetch mail list
  const fetchMail = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/mail');
      if (res.ok) {
        const data = await res.json();
        if (data.mail) setMail(data.mail);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  // Mail Header customizable text state (نظام تعديل عنوان ووصف البريد بالقلم)
  const DEFAULT_MAIL_TITLE = 'بريد التواصل المباشر بين المشرفين والإدارة';
  const DEFAULT_MAIL_SUBTITLE = 'إرسال واستقبال التوجيهات الإدارية، اعتماد الملاحظات الفقهية والقانونية، والتدقيق التشاركي بخصوص التشريعات.';

  const [headerTitle, setHeaderTitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sanad_mail_header_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.title) return parsed.title;
        }
      } catch {}
    }
    return DEFAULT_MAIL_TITLE;
  });

  const [headerSubtitle, setHeaderSubtitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sanad_mail_header_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.subtitle) return parsed.subtitle;
        }
      } catch {}
    }
    return DEFAULT_MAIL_SUBTITLE;
  });

  const [editingHeaderTarget, setEditingHeaderTarget] = useState<'none' | 'title' | 'subtitle' | 'all'>('none');
  const [editTitleDraft, setEditTitleDraft] = useState(headerTitle);
  const [editSubtitleDraft, setEditSubtitleDraft] = useState(headerSubtitle);
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [showEditHeaderModal, setShowEditHeaderModal] = useState(false);

  const loadMailHeaderSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/mail-header');
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          setHeaderTitle(data.title);
          setEditTitleDraft(data.title);
        }
        if (data.subtitle) {
          setHeaderSubtitle(data.subtitle);
          setEditSubtitleDraft(data.subtitle);
        }
      }
    } catch {}
  };

  const handleSaveHeader = async (newTitle?: string, newSubtitle?: string) => {
    const titleToSave = (newTitle !== undefined ? newTitle : editTitleDraft).trim() || DEFAULT_MAIL_TITLE;
    const subtitleToSave = (newSubtitle !== undefined ? newSubtitle : editSubtitleDraft).trim() || DEFAULT_MAIL_SUBTITLE;

    setIsSavingHeader(true);
    setHeaderTitle(titleToSave);
    setHeaderSubtitle(subtitleToSave);

    try {
      localStorage.setItem('sanad_mail_header_settings', JSON.stringify({
        title: titleToSave,
        subtitle: subtitleToSave,
        updatedAt: new Date().toISOString()
      }));
    } catch {}

    try {
      await fetch('/api/admin/settings/mail-header', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleToSave, subtitle: subtitleToSave }),
      });
      setFeedback({ type: 'success', message: 'تم حفظ وتحديث عنوان ووصف البريد بنجاح ✍️' });
    } catch {
      setFeedback({ type: 'success', message: 'تم حفظ التعديلات محلياً بنجاح ✍️' });
    } finally {
      setIsSavingHeader(false);
      setEditingHeaderTarget('none');
      setShowEditHeaderModal(false);
      notifySync('mail_header');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleResetHeader = () => {
    setEditTitleDraft(DEFAULT_MAIL_TITLE);
    setEditSubtitleDraft(DEFAULT_MAIL_SUBTITLE);
    handleSaveHeader(DEFAULT_MAIL_TITLE, DEFAULT_MAIL_SUBTITLE);
  };

  useEffect(() => {
    fetchMail();
    fetchSupervisorsList();
    loadAdminEmailSettings();
    loadMailHeaderSettings();
  }, []);

  useSync(['internal_mail', 'supervisors', 'admin_email', 'mail_header', 'all'], () => {
    fetchMail();
    fetchSupervisorsList();
    loadAdminEmailSettings();
    loadMailHeaderSettings();
  });

  // Handle Mark Read
  const handleMarkRead = async (mailId: string, isReadState: boolean) => {
    setMail((prev) =>
      prev.map((m) => (m.id === mailId ? { ...m, isRead: isReadState } : m))
    );
    try {
      await fetch(`/api/admin/mail/${mailId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: isReadState }),
      });
      notifySync('internal_mail');
    } catch {}
  };

  // Handle Toggle Star
  const handleToggleStar = async (e: React.MouseEvent, mailId: string) => {
    e.stopPropagation();
    setMail((prev) =>
      prev.map((m) => (m.id === mailId ? { ...m, isStarred: !m.isStarred } : m))
    );
    try {
      await fetch(`/api/admin/mail/${mailId}/star`, {
        method: 'PUT',
      });
      notifySync('internal_mail');
    } catch {}
  };

  // Handle Delete Mail
  const handleDeleteMail = async (mailId: string) => {
    setMail((prev) => prev.filter((m) => m.id !== mailId));
    if (selectedMail?.id === mailId) {
      setSelectedMail(null);
    }
    setFeedback({ type: 'success', message: 'تم حذف الرسالة بنجاح 🗑️' });
    setTimeout(() => setFeedback(null), 3000);
    try {
      await fetch(`/api/admin/mail/${mailId}`, {
        method: 'DELETE',
      });
      notifySync('internal_mail');
    } catch {}
  };

  // Select mail item handler
  const handleSelectMail = (item: InternalMail) => {
    setSelectedMail(item);
    if (!item.isRead) {
      handleMarkRead(item.id, true);
    }
  };

  // Handle Send Compose Mail
  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeSubject.trim() || !composeBody.trim()) {
      setFeedback({ type: 'error', message: 'يرجى كتابة موضوع الرسالة ومحتواها أولاً.' });
      return;
    }

    setIsSending(true);

    const payload = {
      senderId: currentSupervisor?.id || 'admin',
      senderName: myName,
      senderEmail: myEmail,
      senderRole: myRole,
      recipientId: composeToEmail === 'supervisors@sanadtax.ps' ? 'all' : composeToEmail,
      recipientName: composeToName,
      recipientEmail: composeToEmail,
      subject: composeSubject.trim(),
      body: composeBody.trim(),
      priority: composePriority,
      category: composeCategory,
    };

    try {
      const res = await fetch('/api/admin/mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setFeedback({ type: 'success', message: 'تم إرسال البريد الإلكتروني بنجاح ✉️' });
        if (data.mail) setMail(data.mail);
        setShowComposeModal(false);
        setComposeToSubject('');
        setComposeBody('');
        notifySync('internal_mail');
      } else {
        setFeedback({ type: 'error', message: data.error || 'تعذر إرسال البريد' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'تعذر الاتصال بالخادم لإرسال البريد' });
    } finally {
      setIsSending(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  // Handle Quick Reply
  const handleOpenReply = (item: InternalMail) => {
    setComposeToEmail(item.senderEmail);
    setComposeToName(item.senderName);
    setComposeToSubject(`رد: ${item.subject.replace(/^رد:\s*/, '')}`);
    setComposeBody(`\n\n------------------------\nبتاريخ ${new Date(item.createdAt).toLocaleString('ar-EG-u-nu-latn')} كتب ${item.senderName}:\n> ${item.body.split('\n').join('\n> ')}`);
    setShowComposeModal(true);
  };

  // Filter mail list
  const filteredMail = useMemo(() => {
    return mail.filter((m) => {
      // Folder filter
      if (activeFolder === 'inbox') {
        // Inbox: recipient matches myEmail or recipient is 'all' or (if admin and received)
        if (m.senderEmail === myEmail && m.recipientEmail !== myEmail) return false;
      } else if (activeFolder === 'sent') {
        // Sent: sender matches myEmail or (if admin and role is admin)
        if (m.senderEmail !== myEmail) return false;
      } else if (activeFolder === 'starred') {
        if (!m.isStarred) return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'all' && m.category !== selectedCategoryFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          m.senderName.toLowerCase().includes(q) ||
          m.senderEmail.toLowerCase().includes(q) ||
          m.recipientName.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [mail, activeFolder, selectedCategoryFilter, searchQuery, myEmail]);

  // Unread inbox count
  const unreadInboxCount = useMemo(() => {
    return mail.filter((m) => (m.recipientEmail === myEmail || m.recipientId === 'all') && !m.isRead).length;
  }, [mail, myEmail]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in duration-200 shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Account Status */}
      <div className="bg-gradient-to-br from-[#0d2116] via-[#143224] to-[#0a1c11] text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-emerald-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1 flex-1">
          {/* Top Pen Edit Badge for Header */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditTitleDraft(headerTitle);
                setEditSubtitleDraft(headerSubtitle);
                setEditingHeaderTarget(editingHeaderTarget === 'all' ? 'none' : 'all');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-[11px] font-black shadow-xs border border-emerald-300 transition-all cursor-pointer hover:scale-105 active:scale-95 group/pen"
              title="نظام القلم: انقر لتعديل هذا العنوان والوصف بحرية ✍️"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-950 group-hover/pen:rotate-12 transition-transform" />
              <span>تعديل هذا الكلام ✍️</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditTitleDraft(headerTitle);
                setEditSubtitleDraft(headerSubtitle);
                setShowEditHeaderModal(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 text-[11px] font-semibold border border-white/20 transition-colors cursor-pointer"
              title="فتح نافذة التعديل المتقدمة"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>تعديل متقدم</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>نظام البريد والتراسل الداخلي الرسمية • منظومة «سَنَد»</span>
          </div>

          {editingHeaderTarget === 'all' ? (
            /* Inline Direct Edit Box */
            <div className="bg-emerald-950/90 border-2 border-emerald-400 rounded-2xl p-4 space-y-3 shadow-lg my-2">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-800/80 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200">
                  <Edit3 className="w-4 h-4 text-amber-300" />
                  <span>تعديل عنوان ووصف البريد الداخلي بحرية بالقلم:</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetHeader}
                  className="text-[11px] text-emerald-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  title="استعادة النص الافتراضي"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>استعادة الافتراضي</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-300 mb-1">العنوان الرئيسي:</label>
                <input
                  type="text"
                  value={editTitleDraft}
                  onChange={(e) => setEditTitleDraft(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-emerald-400/80 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-300 mb-1">الوصف التوضيحي:</label>
                <textarea
                  rows={2}
                  value={editSubtitleDraft}
                  onChange={(e) => setEditSubtitleDraft(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-emerald-400/80 rounded-xl text-xs text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none font-sans"
                />
              </div>

              <div className="flex items-center gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveHeader(editTitleDraft, editSubtitleDraft)}
                  disabled={isSavingHeader}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-emerald-950" />
                  <span>{isSavingHeader ? 'جاري الحفظ...' : 'حفظ التعديلات ✍️'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingHeaderTarget('none')}
                  className="px-3.5 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>إلغاء</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2
                onClick={() => {
                  setEditTitleDraft(headerTitle);
                  setEditSubtitleDraft(headerSubtitle);
                  setEditingHeaderTarget('all');
                }}
                className="text-xl sm:text-2xl font-black text-white tracking-tight cursor-pointer hover:text-emerald-300 transition-colors border-b-2 border-dashed border-emerald-500/50 hover:border-emerald-300 pb-0.5 inline-flex items-center gap-2 flex-wrap group/h2"
                title="انقر لتعديل هذا العنوان بالقلم بحرية ✍️"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-amber-300 border border-emerald-400/40 shadow-2xs group-hover/h2:scale-110 shrink-0">
                  <Edit3 className="w-3.5 h-3.5" />
                </span>
                <span>{headerTitle}</span>
              </h2>

              <p
                onClick={() => {
                  setEditTitleDraft(headerTitle);
                  setEditSubtitleDraft(headerSubtitle);
                  setEditingHeaderTarget('all');
                }}
                className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 cursor-pointer hover:text-white transition-colors"
                title="انقر لتعديل هذا الوصف بالقلم ✍️"
              >
                {headerSubtitle}
              </p>
            </>
          )}
        </div>

        {/* Account Box & Quick Info */}
        <div className="relative z-10 bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl p-3.5 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-amber-300 flex items-center justify-center font-bold shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-0.5 min-w-0">
              <span className="block font-bold text-white text-xs truncate">{myName}</span>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-300 truncate">
                <span>{myEmail}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(myEmail, 'myEmail')}
                  className="p-1 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="نسخ عنوان البريد"
                >
                  {copiedKey === 'myEmail' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditAdminEmailInput(adminCustomEmail);
                setEditAdminNameInput(adminCustomName);
                setShowEditAdminEmailModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-white border border-amber-400/40 text-xs font-bold transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95 shrink-0"
              title="تخصيص وتغيير عنوان بريدك الإلكتروني كمدير عام"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-300" />
              <span>تغيير بريدي الإلكتروني ✍️</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Mailbox Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Sidebar Folders */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-4">
          <button
            type="button"
            onClick={() => {
              setComposeToEmail('supervisors@sanadtax.ps');
              setComposeToName('جميع المشرفين والخبراء');
              setComposeToSubject('');
              setComposeBody('');
              setShowComposeModal(true);
            }}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-emerald-200" />
            <span>إنشاء بريد جديد ✍️</span>
          </button>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('inbox');
                setSelectedMail(null);
              }}
              className={`w-full p-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeFolder === 'inbox'
                  ? 'bg-emerald-50 text-emerald-950 border border-emerald-200/80 shadow-2xs font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className={`w-4 h-4 ${activeFolder === 'inbox' ? 'text-emerald-700' : 'text-slate-500'}`} />
                <span>البريد الوارد (Inbox)</span>
              </div>
              {unreadInboxCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-700 text-white shadow-xs">
                  {unreadInboxCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('sent');
                setSelectedMail(null);
              }}
              className={`w-full p-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeFolder === 'sent'
                  ? 'bg-emerald-50 text-emerald-950 border border-emerald-200/80 shadow-2xs font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Send className={`w-4 h-4 ${activeFolder === 'sent' ? 'text-emerald-700' : 'text-slate-500'}`} />
                <span>البريد الصادر (Sent)</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('starred');
                setSelectedMail(null);
              }}
              className={`w-full p-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                activeFolder === 'starred'
                  ? 'bg-emerald-50 text-emerald-950 border border-emerald-200/80 shadow-2xs font-black'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className={`w-4 h-4 ${activeFolder === 'starred' ? 'text-amber-500 fill-amber-400' : 'text-slate-500'}`} />
                <span>الرسائل المميزة بنجمة</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Mail Content Area */}
        <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden min-h-[550px] flex flex-col">
          {/* Top Search & Actions Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الرسائل، العناوين، أو المرسل..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={fetchMail}
                className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                title="تحديث قائمة البريد"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Mail Layout Split View or Selected Mail */}
          {selectedMail ? (
            /* Mail Detail View */
            <div className="p-5 sm:p-6 space-y-6 flex-1 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <button
                  type="button"
                  onClick={() => setSelectedMail(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>العودة للقائمة</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleToggleStar(e, selectedMail.id)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-500 transition-colors cursor-pointer"
                    title="تمييز بنجمة"
                  >
                    <Star className={`w-4 h-4 ${selectedMail.isStarred ? 'text-amber-500 fill-amber-400' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkRead(selectedMail.id, !selectedMail.isRead)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title={selectedMail.isRead ? 'تعليم كغير مقروء' : 'تعليم كمقروء'}
                  >
                    <MailCheck className="w-4 h-4 text-emerald-700" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMail(selectedMail.id)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                    title="حذف الرسالة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subject & Priority */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-xl font-black text-slate-900">
                    {selectedMail.subject}
                  </h3>
                  {selectedMail.priority === 'urgent' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200">
                      عاجل جداً
                    </span>
                  )}
                  {selectedMail.priority === 'important' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                      هام
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                    {selectedMail.category || 'عام'}
                  </span>
                </div>

                {/* Sender/Recipient Info Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white font-black text-sm flex items-center justify-center shrink-0">
                      {selectedMail.senderName.slice(0, 2)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">{selectedMail.senderName}</span>
                      <span className="font-mono text-slate-500 text-[11px] block">&lt;{selectedMail.senderEmail}&gt;</span>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        إلى: {selectedMail.recipientName} ({selectedMail.recipientEmail})
                      </span>
                    </div>
                  </div>

                  <div className="text-slate-400 text-[11px] font-mono flex sm:flex-col items-center sm:items-end justify-between">
                    <span>{new Date(selectedMail.createdAt).toLocaleString('ar-EG-u-nu-latn')}</span>
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[200px] shadow-2xs font-sans">
                {selectedMail.body}
              </div>

              {/* Bottom Quick Reply Bar */}
              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenReply(selectedMail)}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:scale-105"
                >
                  <Reply className="w-4 h-4 text-emerald-200" />
                  <span>الرد على هذه الرسالة ✍️</span>
                </button>
              </div>
            </div>
          ) : (
            /* Mail List View */
            <div className="divide-y divide-slate-100 flex-1">
              {filteredMail.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-3">
                  <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold">لا توجد رسائل بريد في هذا المجلد حالياً.</p>
                  <p className="text-xs text-slate-400">يمكنك استخدام زر "إنشاء بريد جديد" للتواصل مع المشرفين والإدارة.</p>
                </div>
              ) : (
                filteredMail.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectMail(item)}
                    className={`p-4 hover:bg-emerald-50/40 transition-colors cursor-pointer flex items-start sm:items-center justify-between gap-3 ${
                      !item.isRead ? 'bg-emerald-50/30 font-bold' : ''
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      {/* Unread Status Dot */}
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-2 sm:mt-0 ${!item.isRead ? 'bg-emerald-600' : 'bg-transparent'}`} />

                      {/* Star Button */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleStar(e, item.id)}
                        className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer shrink-0"
                      >
                        <Star className={`w-4 h-4 ${item.isStarred ? 'text-amber-500 fill-amber-400' : ''}`} />
                      </button>

                      {/* User Avatar */}
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center shrink-0">
                        {item.senderName.slice(0, 2)}
                      </div>

                      {/* Content Info */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 truncate max-w-[180px]">
                            {activeFolder === 'sent' ? `إلى: ${item.recipientName}` : item.senderName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 truncate hidden sm:inline">
                            &lt;{activeFolder === 'sent' ? item.recipientEmail : item.senderEmail}&gt;
                          </span>
                          {item.priority === 'urgent' && (
                            <span className="px-2 py-0.2 rounded-md bg-rose-100 text-rose-800 text-[9px] font-black">
                              عاجل
                            </span>
                          )}
                          {item.priority === 'important' && (
                            <span className="px-2 py-0.2 rounded-md bg-amber-100 text-amber-800 text-[9px] font-black">
                              هام
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 truncate">
                          {item.subject}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate font-normal">
                          {item.body}
                        </p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-[10px] text-slate-400 font-mono shrink-0 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('ar-EG-u-nu-latn')}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose Email Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">إنشاء ورسالة بريد إلكتروني جديد</h3>
                  <p className="text-xs text-slate-500">التراسل الداخلي بين الإدارة وهيئة المشرفين</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMail} className="space-y-4 text-xs">
              {/* Recipient selection */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">إلى (المرسل إليه):</label>
                <select
                  value={composeToEmail}
                  onChange={(e) => {
                    const val = e.target.value;
                    setComposeToEmail(val);
                    if (val === 'supervisors@sanadtax.ps') {
                      setComposeToName('جميع المشرفين والخبراء');
                    } else if (val === 'admin@sanadtax.ps') {
                      setComposeToName('المدير العام • لوحة التحكم');
                    } else {
                      const matched = supervisors.find((s) => s.officialEmail === val || s.email === val);
                      if (matched) setComposeToName(matched.name);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="supervisors@sanadtax.ps">📢 جميع المشرفين والخبراء (supervisors@sanadtax.ps)</option>
                  <option value="admin@sanadtax.ps">👑 المدير العام • لوحة التحكم (admin@sanadtax.ps)</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.officialEmail || s.email}>
                      👤 {s.name} ({s.officialEmail || s.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">موضوع الرسالة:</label>
                <input
                  type="text"
                  required
                  value={composeSubject}
                  onChange={(e) => setComposeToSubject(e.target.value)}
                  placeholder="مثال: توجيهات بخصوص اعتماد اللائحة الجمركية الجديدة"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">مستوى الأهمية:</label>
                <select
                  value={composePriority}
                  onChange={(e) => setComposePriority(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="normal">عادي (Normal)</option>
                  <option value="important">هام (Important)</option>
                  <option value="urgent">عاجل جداً (Urgent)</option>
                </select>
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">نص وتفاصيل البريد:</label>
                <textarea
                  required
                  rows={5}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="اكتب تفاصيل المراسلة والبريد هنا..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-emerald-200" />
                      <span>إرسال البريد الآن ✉️</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Admin General Manager Official Email */}
      {showEditAdminEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 bg-gradient-to-l from-emerald-950 via-[#12281e] to-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">إنشاء وتخصيص بريد المدير العام</h3>
                  <p className="text-[11px] text-emerald-200">يمكنك كتابة وتعديل بريدك الإلكتروني الرسمي في أي وقت</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditAdminEmailModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminEmail} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  اسم صفة المدير العام في المراسلات:
                </label>
                <input
                  type="text"
                  value={editAdminNameInput}
                  onChange={(e) => setEditAdminNameInput(e.target.value)}
                  placeholder="مثال: المدير العام • لوحة التحكم"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    عنوان البريد الإلكتروني الرسمي للمدير العام:
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditAdminEmailInput(`manager.${Math.random().toString(36).substring(2, 6)}@sanadtax.ps`)}
                    className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>توليد عنوان جديد</span>
                  </button>
                </div>

                <div className="relative flex items-center" dir="ltr">
                  <input
                    type="text"
                    value={editAdminEmailInput}
                    onChange={(e) => setEditAdminEmailInput(e.target.value.trim().toLowerCase())}
                    placeholder="مثال: admin@sanadtax.ps أو general.manager@sanadtax.ps"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-sans">
                  سيتم اعتماد هذا العنوان فورياً لكل الرسائل الصادرة والواردة الخاصة بك كمدير عام.
                </p>
              </div>

              {/* Preview Box */}
              <div className="bg-emerald-50/80 rounded-2xl p-3 border border-emerald-200/90 text-xs">
                <span className="text-[10px] font-bold text-emerald-800 block mb-1">المعاينة المباشرة لبطاقة بريدك:</span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="block text-emerald-950 font-bold">{editAdminNameInput || 'المدير العام'}</strong>
                    <span className="font-mono text-[11px] text-emerald-700">{editAdminEmailInput || 'admin@sanadtax.ps'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditAdminEmailModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdminEmail}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-800/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingAdminEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>حفظ واعتماد البريد الرسمي ✍️</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Mail Header Customization */}
      {showEditHeaderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 bg-gradient-to-l from-emerald-950 via-[#12281e] to-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">تعديل عنوان ووصف البريد الداخلي</h3>
                  <p className="text-[11px] text-emerald-200">يمكنك تعديل النصوص بحرية لتظهر للجميع</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditHeaderModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  العنوان الرئيسي للبريد:
                </label>
                <input
                  type="text"
                  value={editTitleDraft}
                  onChange={(e) => setEditTitleDraft(e.target.value)}
                  placeholder="مثال: بريد التواصل المباشر بين المشرفين والإدارة"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الوصف التوضيحي للبريد:
                </label>
                <textarea
                  rows={3}
                  value={editSubtitleDraft}
                  onChange={(e) => setEditSubtitleDraft(e.target.value)}
                  placeholder="اكتب نبذة أو وصفاً توضيحياً..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none font-sans"
                />
              </div>

              {/* Preview Box */}
              <div className="bg-emerald-950 text-white rounded-2xl p-3.5 border border-emerald-800 space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 block mb-1">معاينة مباشرة للشكل النهائي:</span>
                <h4 className="font-black text-sm text-amber-300 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{editTitleDraft || DEFAULT_MAIL_TITLE}</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                  {editSubtitleDraft || DEFAULT_MAIL_SUBTITLE}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetHeader}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>استعادة النص الأصلي</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditHeaderModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveHeader(editTitleDraft, editSubtitleDraft)}
                    disabled={isSavingHeader}
                    className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSavingHeader ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-200" />
                    )}
                    <span>حفظ التعديلات ✍️</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
