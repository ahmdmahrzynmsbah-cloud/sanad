import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Clock,
  Crown,
  Snowflake,
  LogOut,
  ChevronRight,
  PanelRightClose,
  PanelRight,
  Sparkles,
  Scale,
  Shield,
  FileText,
  Landmark,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { User, Conversation, SystemBranding } from '../types';

interface ChatSidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  currentUser: User;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onClearAllConversations?: () => void;
  onLogout?: () => void;
  branding?: SystemBranding;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
  currentUser,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onClearAllConversations,
  onLogout,
  branding,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const systemName = branding?.systemName || 'مساعد الجمارك والضرائب';
  const logoType = branding?.logoType || 'preset';
  const logoPreset = branding?.logoPreset || 'scale';
  const logoUrl = branding?.logoUrl;
  const logoAccentColor = branding?.logoAccentColor || '#d4af37';

  const renderIcon = (sizeClass = 'w-4 h-4') => {
    if ((logoType === 'url' || logoType === 'upload') && logoUrl) {
      return <img src={logoUrl} alt={systemName} className="w-full h-full object-contain p-0.5 rounded" />;
    }
    switch (logoPreset) {
      case 'shield':
        return <Shield className={sizeClass} style={{ color: logoAccentColor }} />;
      case 'landmark':
        return <Landmark className={sizeClass} style={{ color: logoAccentColor }} />;
      case 'scroll':
      case 'file':
        return <FileText className={sizeClass} style={{ color: logoAccentColor }} />;
      case 'book':
        return <BookOpen className={sizeClass} style={{ color: logoAccentColor }} />;
      case 'scale':
      default:
        return <Scale className={sizeClass} style={{ color: logoAccentColor }} />;
    }
  };

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.text.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  // Group conversations by relative time
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const yesterday = today - oneDayMs;
    const sevenDaysAgo = today - 7 * oneDayMs;
    const thirtyDaysAgo = today - 30 * oneDayMs;

    const groups: {
      today: Conversation[];
      yesterday: Conversation[];
      last7Days: Conversation[];
      last30Days: Conversation[];
      older: Conversation[];
    } = {
      today: [],
      yesterday: [],
      last7Days: [],
      last30Days: [],
      older: [],
    };

    filteredConversations.forEach((conv) => {
      const convDate = new Date(conv.updatedAt || conv.createdAt).getTime();
      if (convDate >= today) {
        groups.today.push(conv);
      } else if (convDate >= yesterday) {
        groups.yesterday.push(conv);
      } else if (convDate >= sevenDaysAgo) {
        groups.last7Days.push(conv);
      } else if (convDate >= thirtyDaysAgo) {
        groups.last30Days.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [filteredConversations]);

  const handleStartRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDeleteConversation(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => {
        setConfirmDeleteId((prev) => (prev === id ? null : prev));
      }, 4000);
    }
  };

  const timeSections: { key: keyof typeof groupedConversations; label: string }[] = [
    { key: 'today', label: 'اليوم' },
    { key: 'yesterday', label: 'أمس' },
    { key: 'last7Days', label: 'آخر 7 أيام' },
    { key: 'last30Days', label: 'آخر 30 يوماً' },
    { key: 'older', label: 'سابقاً' },
  ];

  const userInitial = (currentUser.fullName || currentUser.username || 'م').slice(0, 1).toUpperCase();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          id="chat-sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden transition-opacity"
        />
      )}

      {/* Floating Modern Responsive Sidebar */}
      <aside
        id="chat-history-sidebar"
        className={`
          fixed lg:relative top-2 lg:top-0 bottom-2 lg:bottom-0 right-2 lg:right-0
          h-[calc(100%-16px)] lg:h-full z-50
          bg-[#0d211a] text-slate-100
          border border-[#17382d]
          rounded-2xl sm:rounded-[22px]
          overflow-hidden
          flex flex-col shadow-xl lg:shadow-xs
          transition-all duration-300 ease-in-out select-none shrink-0
          ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+16px)] lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[68px]' : 'lg:w-[270px] xl:w-[285px] w-[calc(100vw-32px)] max-w-[320px] sm:w-[305px]'}
        `}
      >
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & TOGGLE BUTTON                                            */}
        {/* ========================================================================= */}
        <div className={`p-3 border-b border-[#183a2f] flex items-center justify-between gap-2 ${isCollapsed ? 'lg:justify-center' : ''}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-[#133026] border border-[#20493b] flex items-center justify-center shrink-0 shadow-xs">
                {renderIcon('w-4 h-4')}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">{systemName}</span>
                <span className="text-[10px] text-emerald-400/90 font-medium block">سجل الاستشارات</span>
              </div>
            </div>
          )}

          {/* Collapse/Expand toggle for Desktop + Close for Mobile */}
          <div className="flex items-center gap-1">
            {/* Desktop Collapse Toggle */}
            <button
              id="sidebar-toggle-collapse-btn"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={isCollapsed ? 'توسيع القائمة الجانبية (Sidebar Expand)' : 'طي القائمة الجانبية (Sidebar Collapse)'}
            >
              {isCollapsed ? (
                <PanelRight className="w-4 h-4 text-emerald-400" />
              ) : (
                <PanelRightClose className="w-4 h-4" />
              )}
            </button>

            {/* Mobile Close Button */}
            <button
              id="sidebar-close-mobile-btn"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. NEW CHAT BUTTON                                                       */}
        {/* ========================================================================= */}
        <div className="p-2.5">
          {isCollapsed ? (
            <div className="relative group flex justify-center">
              <button
                id="collapsed-new-chat-btn"
                onClick={() => {
                  onNewChat();
                  if (window.innerWidth < 1024) onCloseMobile();
                }}
                className="w-10 h-10 bg-[#164233] hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center border border-emerald-500/30 shadow-xs transition-all cursor-pointer hover:scale-105"
                title="محادثة جديدة"
              >
                <Plus className="w-4 h-4 text-emerald-300" />
              </button>
              {/* Tooltip on hover */}
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-md shadow-lg border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                محادثة جديدة
              </div>
            </div>
          ) : (
            <button
              id="new-chat-sidebar-btn"
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 1024) onCloseMobile();
              }}
              className="w-full py-2 px-3 bg-[#164233] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-between shadow-xs transition-all group cursor-pointer border border-emerald-500/30 hover:border-emerald-400/50"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-300 transition-transform group-hover:rotate-90" />
                محادثة جديدة
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300/80 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. SEARCH INPUT (Visible only when expanded)                             */}
        {/* ========================================================================= */}
        {!isCollapsed && (
          <div className="px-2.5 pb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="search-conversations-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث في المحادثات..."
                className="w-full bg-[#112a21] border border-[#1d4638] rounded-lg pr-7 pl-6 py-1.5 text-[11px] text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. CONVERSATIONS LIST (Expanded vs Collapsed with Tooltips)               */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3 text-xs no-scrollbar">
          {filteredConversations.length === 0 ? (
            !isCollapsed ? (
              <div className="text-center py-8 px-3 text-slate-400">
                <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-30 text-emerald-300" />
                <p className="text-[11px] font-medium text-slate-300">
                  {searchQuery ? 'لا توجد نتائج' : 'لا توجد محادثات سابقة'}
                </p>
                <p className="text-[9.5px] text-slate-500 mt-0.5">
                  {searchQuery ? 'جرب كلمات أخرى' : 'ابدأ سؤالاً وسيتم حفظه تلقائياً'}
                </p>
              </div>
            ) : null
          ) : isCollapsed ? (
            /* Collapsed view: Icon list with Tooltips */
            <div className="flex flex-col items-center space-y-1.5 py-1">
              {filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div key={conv.id} className="relative group">
                    <button
                      onClick={() => {
                        onSelectConversation(conv.id);
                        if (window.innerWidth < 1024) onCloseMobile();
                      }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    {/* Hover Tooltip */}
                    <div className="absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl border border-slate-700 whitespace-nowrap max-w-[220px] truncate opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {conv.title}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Expanded view: Grouped by Date */
            timeSections.map(({ key, label }) => {
              const list = groupedConversations[key];
              if (!list || list.length === 0) return null;

              return (
                <div key={key} className="space-y-1">
                  {/* Time Section Label */}
                  <div className="px-2 py-0.5 text-[9.5px] font-bold text-slate-400/70 tracking-wider flex items-center justify-between">
                    <span>{label}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{list.length}</span>
                  </div>

                  {/* Conversation items */}
                  {list.map((conv) => {
                    const isActive = conv.id === activeConversationId;
                    const isEditing = editingId === conv.id;
                    const isConfirmingDelete = confirmDeleteId === conv.id;

                    if (isEditing) {
                      return (
                        <form
                          key={conv.id}
                          onSubmit={(e) => handleSaveRename(conv.id, e)}
                          className="flex items-center gap-1 p-1 bg-[#183a2e] rounded-lg border border-emerald-500/50"
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            autoFocus
                            className="flex-1 bg-transparent px-1.5 py-0.5 text-xs text-white focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="p-1 text-emerald-400 hover:text-emerald-200"
                            title="حفظ"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelRename}
                            className="p-1 text-slate-400 hover:text-slate-200"
                            title="إلغاء"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      );
                    }

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          onSelectConversation(conv.id);
                          if (window.innerWidth < 1024) onCloseMobile();
                        }}
                        className={`group relative flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-all border ${
                          isActive
                            ? 'bg-[#183e30] text-white border-emerald-500/50 font-semibold shadow-2xs'
                            : 'bg-transparent text-slate-300 border-transparent hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                          <MessageSquare
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive ? 'text-emerald-300' : 'text-slate-500 group-hover:text-slate-300'
                            }`}
                          />
                          <span className="block truncate text-[11.5px]">{conv.title}</span>
                        </div>

                        {/* Actions on Hover */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={(e) => handleStartRename(conv, e)}
                            className="p-1 text-slate-400 hover:text-amber-300 hover:bg-white/10 rounded"
                            title="تعديل الاسم"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteClick(conv.id, e)}
                            className={`p-1 rounded transition-colors ${
                              isConfirmingDelete
                                ? 'bg-red-600 text-white opacity-100'
                                : 'text-slate-400 hover:text-red-400 hover:bg-white/10'
                            }`}
                            title={isConfirmingDelete ? 'تأكيد الحذف؟' : 'حذف المحادثة'}
                          >
                            {isConfirmingDelete ? (
                              <span className="text-[9px] font-bold px-1 text-white">تأكيد</span>
                            ) : (
                              <Trash2 className="w-2.5 h-2.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* 5. CLEAR ALL (Only when expanded)                                        */}
        {/* ========================================================================= */}
        {!isCollapsed && conversations.length > 0 && onClearAllConversations && (
          <div className="px-3 py-1.5 border-t border-[#183a2f]/70 bg-[#0a1b15]/60 shrink-0">
            <button
              id="clear-all-conversations-btn"
              onClick={() => setShowClearConfirmModal(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-medium text-rose-400/90 hover:text-white hover:bg-rose-600/20 active:bg-rose-600/30 transition-all cursor-pointer border border-rose-500/20 hover:border-rose-500/40"
              title="مسح جميع المحادثات السابقة"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>مسح جميع المحادثات</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. BOTTOM PROFILE / USER CARD                                            */}
        {/* ========================================================================= */}
        <div className={`p-2.5 border-t border-[#183a2f] bg-[#0b1c16] ${isCollapsed ? 'flex justify-center' : ''}`}>
          {isCollapsed ? (
            <div className="relative group flex justify-center">
              <div
                className="w-8 h-8 rounded-full bg-emerald-800 border border-emerald-500/40 flex items-center justify-center font-bold text-white text-xs cursor-pointer shadow-xs"
                title={currentUser.fullName || currentUser.username}
              >
                {userInitial}
              </div>
              {/* Tooltip */}
              <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-md shadow-lg border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                {currentUser.fullName || currentUser.username}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-emerald-800 border border-emerald-500/40 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs">
                  {userInitial}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">
                    {currentUser.fullName || currentUser.username}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {currentUser.isSubscribed ? (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5" />
                        اشتراك دائم
                      </span>
                    ) : (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        تجريبي ({currentUser.remainingTrialDays ?? currentUser.trialDays ?? 7} يوم)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  id="sidebar-user-logout-btn"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* DIALOG: CONFIRM CLEAR ALL CONVERSATIONS                                  */}
      {/* ========================================================================= */}
      {showClearConfirmModal && (
        <div
          id="clear-all-confirm-modal-overlay"
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => {
            if (!isDeletingAll) setShowClearConfirmModal(false);
          }}
        >
          <div
            id="clear-all-confirm-modal-card"
            className="w-full max-w-md bg-[#0f241a] text-slate-100 border border-[#214c3c] rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 text-right"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Icon + Title */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">تأكيد مسح جميع المحادثات</h3>
                <p className="text-xs text-slate-400 mt-0.5">إجراء نهائي لا يمكن الرجوع عنه</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="bg-[#081510] border border-[#1b3a2f] rounded-xl p-3.5 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-rose-300 mb-1">تنبيه هام:</p>
              <p>
                هل أنت متأكد من رغبتك في حذف كافة المحادثات والاستشارات المحفوظة في حسابك (عددها{' '}
                <span className="font-bold text-white">{conversations.length}</span> محادثة)؟
              </p>
              <p className="mt-1 text-slate-400">
                سيتم مسح سجل الرسائل نهائياً من الذاكرة ومن قاعدة البيانات السحابية فوراً.
              </p>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                id="cancel-clear-all-modal-btn"
                type="button"
                disabled={isDeletingAll}
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
              >
                إلغاء الأمر
              </button>
              <button
                id="confirm-clear-all-modal-btn"
                type="button"
                disabled={isDeletingAll}
                onClick={async () => {
                  if (onClearAllConversations) {
                    setIsDeletingAll(true);
                    try {
                      await onClearAllConversations();
                    } finally {
                      setIsDeletingAll(false);
                      setShowClearConfirmModal(false);
                    }
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-md shadow-rose-900/40 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingAll ? 'جارٍ الحذف...' : 'نعم، مسح السجل بالكامل'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
