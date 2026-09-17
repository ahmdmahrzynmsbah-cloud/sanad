import React, { useState, useEffect, useCallback } from 'react';
import { Youtube, PlayCircle } from 'lucide-react';
import { Video } from '../types';
import { safeFetchJson } from '../utils/safeApi';
import { useSync } from '../utils/sync';

export const VideosSection: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await safeFetchJson(res);
        if (data.ok && data.data?.videos) {
          setVideos(data.data.videos.filter((v: Video) => v.isActive !== false));
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch videos from API, trying direct Firestore:', err);
    }
    
    try {
      const { directFetchVideosFromFirestore } = await import('../services/clientFirestore');
      const fsVideos = await directFetchVideosFromFirestore();
      if (fsVideos) {
        setVideos(fsVideos.filter(v => v.isActive !== false));
      }
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useSync(['videos', 'all'], () => {
    fetchVideos();
  });

  if (loading) return null;
  if (videos.length === 0) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-sm font-bold mb-4">
          <Youtube className="w-4 h-4" />
          شروحات مرئية
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
          المكتبة المرئية
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto text-lg">
          مجموعة من الفيديوهات والشروحات المبسطة للمواد والقوانين المتعلقة بالجمارك وضريبة الدخل.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {videos.map((video, index) => (
          <div 
            key={video.id} 
            className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="relative aspect-video bg-slate-100 overflow-hidden">
              {video.thumbnailUrl ? (
                <img 
                  src={video.thumbnailUrl} 
                  alt={video.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 transition-colors duration-500 group-hover:bg-slate-900">
                  <Youtube className="w-16 h-16 text-slate-600" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                <a 
                  href={video.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform scale-90 opacity-90 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300"
                >
                  <PlayCircle className="w-8 h-8 text-red-600 ml-1" />
                </a>
              </div>
            </div>
            
            <div className="p-6 flex flex-col flex-1">
              <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2 leading-snug">
                {video.title}
              </h3>
              {video.description && (
                <p className="text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed flex-1">
                  {video.description}
                </p>
              )}
              <div className="mt-auto pt-4 border-t border-slate-50">
                <a 
                  href={video.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                  مشاهدة على يوتيوب
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
