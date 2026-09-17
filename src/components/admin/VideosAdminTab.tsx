import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check, Search, Youtube, Link as LinkIcon, Video as VideoIcon } from 'lucide-react';
import { Video } from '../../types';
import { directSaveVideoToFirestore, directDeleteVideoFromFirestore } from '../../services/clientFirestore';
import { notifySync } from '../../utils/sync';

interface VideosAdminTabProps {
  videos: Video[];
  setVideos: React.Dispatch<React.SetStateAction<Video[]>>;
  fetchVideos: () => void;
}

export const VideosAdminTab: React.FC<VideosAdminTabProps> = ({ videos, setVideos, fetchVideos }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [order, setOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setUrl('');
    setThumbnailUrl('');
    setOrder(0);
    setIsActive(true);
    setShowAddForm(false);
    setEditingVideo(null);
    setFormError(null);
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setTitle(video.title);
    setDescription(video.description || '');
    setUrl(video.url);
    setThumbnailUrl(video.thumbnailUrl || '');
    setOrder(video.order || 0);
    setIsActive(video.isActive !== false);
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      setFormError('يرجى إدخال عنوان ورابط الفيديو.');
      return;
    }
    
    setSaving(true);
    setFormError(null);
    let saved = false;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      url: url.trim(),
      thumbnailUrl: thumbnailUrl.trim(),
      order,
      isActive
    };

    try {
      const endpoint = editingVideo ? `/api/admin/videos/${editingVideo.id}` : '/api/admin/videos';
      const method = editingVideo ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        saved = true;
      }
    } catch (err) {
      console.warn('API error, falling back to direct Firestore:', err);
    }

    if (!saved) {
      const vid = editingVideo ? { ...editingVideo, ...payload } : { ...payload, id: 'vid-' + Date.now(), createdAt: new Date().toISOString() };
      const directOk = await directSaveVideoToFirestore(vid);
      if (directOk) saved = true;
    }

    if (saved) {
      fetchVideos();
      notifySync('videos');
      resetForm();
    } else {
      setFormError('حدث خطأ أثناء حفظ الفيديو.');
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!videoToDelete) return;
    setDeletingId(videoToDelete.id);
    let deleted = false;
    try {
      const res = await fetch(`/api/admin/videos/${videoToDelete.id}`, { method: 'DELETE' });
      if (res.ok) deleted = true;
    } catch (err) {
      console.warn('API error, falling back to direct Firestore:', err);
    }
    
    if (!deleted) {
      const directOk = await directDeleteVideoFromFirestore(videoToDelete.id);
      if (directOk) deleted = true;
    }

    if (deleted) {
      fetchVideos();
      notifySync('videos');
      setVideoToDelete(null);
    }
    setDeletingId(null);
  };

  const filteredVideos = videos.filter(v => v.title.includes(searchQuery) || v.description?.includes(searchQuery));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Youtube className="w-6 h-6 text-red-500" />
            الشروحات المرئية (الفيديوهات)
          </h2>
          <p className="text-sm text-slate-500 mt-1">إدارة شروحات وفيديوهات المنصة التي تعرض للمستخدمين.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddForm(true); }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          إضافة فيديو جديد
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <VideoIcon className="w-5 h-5 text-emerald-600" />
              {editingVideo ? 'تعديل الفيديو' : 'إضافة فيديو جديد'}
            </h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">عنوان الفيديو *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="مثال: شرح طريقة حساب ضريبة الدخل"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">رابط الفيديو (YouTube) *</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">وصف قصير (اختياري)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="شرح تفصيلي للمادة..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">رابط الصورة المصغرة (اختياري)</label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">الترتيب</label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  min="0"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="mr-3 text-sm font-medium text-gray-700">تفعيل ظهور الفيديو</span>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    حفظ الفيديو
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Videos List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="بحث في الفيديوهات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          <span className="text-sm text-slate-500 font-medium px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
            العدد الإجمالي: {videos.length}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredVideos.length > 0 ? (
            filteredVideos.map((video) => (
              <div key={video.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors group">
                <div className="flex flex-col sm:flex-row gap-4 flex-1 items-start sm:items-center">
                  <div className="w-16 h-12 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden shrink-0">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <Youtube className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{video.title}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${video.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {video.isActive !== false ? 'نشط' : 'غير نشط'}
                      </span>
                      {video.description && (
                        <span className="text-xs text-slate-500 truncate max-w-[200px]">{video.description}</span>
                      )}
                      <a href={video.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1" dir="ltr">
                        <LinkIcon className="w-3 h-3" /> Link
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-row sm:flex-col items-center justify-end sm:justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => handleEdit(video)}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="تعديل"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setVideoToDelete(video)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Youtube className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-slate-500 font-medium mb-1">لا يوجد فيديوهات</h3>
              <p className="text-sm text-slate-400">لم تقم بإضافة أي فيديوهات حتى الآن، أو لا توجد نتائج مطابقة للبحث.</p>
            </div>
          )}
        </div>
      </div>

      {videoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-900 mb-2">حذف الفيديو</h3>
              <p className="text-slate-500 text-sm text-center mb-6">
                هل أنت متأكد من رغبتك في حذف الفيديو "{videoToDelete.title}"؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setVideoToDelete(null)}
                  className="flex-1 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deletingId === videoToDelete.id}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {deletingId === videoToDelete.id ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'تأكيد الحذف'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
