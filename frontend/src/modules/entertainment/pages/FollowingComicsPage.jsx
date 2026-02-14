import React, { useState, useEffect, useCallback } from 'react';
import { entertainmentService, COMIC_IMG_CDN } from '../services/entertainmentApi';
import { Link } from 'react-router-dom';
import { Trash2, Bell, BellOff, RefreshCw, BookOpen, Clock, Search } from 'lucide-react';
import BackButton from "../../../components/common/BackButton";

import { useToast } from '../../../context/ToastContext';

export default function FollowingComicsPage() {
    const toast = useToast();
    const [following, setFollowing] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const loadFollowing = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const data = await entertainmentService.getFollowingList();
            setFollowing(data);
            
            // Auto check for updates
            checkUpdates(data);
        } catch (error) {
            console.error("Failed to load following list", error);
            toast.error("Không thể tải danh sách theo dõi");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        loadFollowing();
    }, [loadFollowing]);

    const checkUpdates = async (list) => {
        // Parallel check for updates but limited to not spam
        const checkList = list.slice(0, 10); // Only check first 10 for performance if many
        
        const updates = await Promise.all(checkList.map(async (item) => {
            try {
                const detail = await entertainmentService.getComicDetail(item.comic_slug);
                if (detail.status === 'success') {
                    const latestChapter = detail.data.item.chapters?.[0]?.server_data?.[0]?.chapter_name;
                    if (latestChapter && latestChapter !== item.last_chapter) {
                        return { 
                            ...item, 
                            hasNew: true, 
                            newChapter: latestChapter,
                            updatedThumb: detail.data.item.thumb_url 
                        };
                    }
                }
            } catch (err) {
                console.error(`Update check failed for ${item.comic_slug}`, err);
            }
            return item;
        }));

        setFollowing(prev => {
            const newMap = new Map(updates.map(u => [u.comic_slug, u]));
            return prev.map(p => newMap.get(p.comic_slug) || p);
        });
    };

    const handleUnfollow = async (slug) => {
        const ok = await toast.confirm("Bạn có chắc muốn bỏ theo dõi truyện này?");
        if (!ok) return;
        try {
            await entertainmentService.unfollowComic(slug);
            setFollowing(prev => prev.filter(p => p.comic_slug !== slug));
            toast.success("Đã bỏ theo dõi thành công");
        } catch (error) {
            toast.error("Thao tác thất bại");
        }
    };

    const toggleNotify = async (item) => {
        try {
            const newState = !item.notify_enabled;
            await entertainmentService.toggleFollowNotify(item.comic_slug, newState);
            setFollowing(prev => prev.map(p => 
                p.comic_slug === item.comic_slug ? { ...p, notify_enabled: newState } : p
            ));
            toast.success(newState ? "Đã bật thông báo" : "Đã tắt thông báo");
        } catch (error) {
            toast.error("Thao tác thất bại");
        }
    };

    const filtered = following.filter(p => 
        p.comic_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <BackButton fallbackPath="/entertainment/comics" label="Quay lại danh sách" className="mb-2" />
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        📚 Truyện đang theo dõi
                        <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">{following.length}</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Tìm trong danh sách..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-primary/50"
                        />
                    </div>
                    <button 
                        onClick={() => loadFollowing(true)}
                        disabled={refreshing}
                        className="p-2 bg-slate-800/50 border border-white/10 rounded-xl hover:bg-slate-700/50 transition-colors"
                        title="Làm mới"
                    >
                        <RefreshCw size={20} className={`text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-white/5">
                    <div className="text-6xl mb-4">📭</div>
                    <h2 className="text-xl font-bold text-white mb-2">Chưa có truyện nào</h2>
                    <p className="text-slate-400 mb-6">Hãy theo dõi các truyện bạn yêu thích để nhận thông báo mới nhất!</p>
                    <Link to="/entertainment/comics" className="btn btn-primary rounded-full px-8">Khám phá ngay</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map(item => (
                        <div key={item.id} className="group relative bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden hover:border-primary/30 transition-all duration-300 flex flex-col">
                            {/* New Badge */}
                            {item.hasNew && (
                                <div className="absolute top-3 right-3 z-10 bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-bounce shadow-lg shadow-rose-500/40">
                                    NEW CHAPTER
                                </div>
                            )}

                            {/* Thumbnail */}
                            <Link to={`/entertainment/comics/${item.comic_slug}`} className="relative aspect-[3/4] overflow-hidden">
                                <img 
                                    src={`${COMIC_IMG_CDN}/${item.comic_thumb}`} 
                                    alt={item.comic_name} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>
                                
                                <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[11px] text-white/80 font-bold bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                    <Clock size={12} />
                                    {new Date(item.created_at).toLocaleDateString()}
                                </div>
                            </Link>

                            {/* Info */}
                            <div className="p-4 flex-1 flex flex-col">
                                <Link to={`/entertainment/comics/${item.comic_slug}`} className="text-lg font-bold text-white mb-2 line-clamp-2 hover:text-primary transition-colors">
                                    {item.comic_name}
                                </Link>
                                
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                                        <BookOpen size={14} className="text-blue-400" />
                                        <span>Chap: <b className="text-white">{item.last_chapter || '?'}</b></span>
                                        {item.hasNew && (
                                            <span className="text-rose-400 font-bold">→ {item.newChapter}</span>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => toggleNotify(item)}
                                        className={`p-1.5 rounded-lg transition-colors ${item.notify_enabled ? 'text-green-400 hover:bg-green-400/10' : 'text-slate-500 hover:bg-slate-500/10'}`}
                                        title={item.notify_enabled ? "Tắt thông báo" : "Bật thông báo"}
                                    >
                                        {item.notify_enabled ? <Bell size={16} /> : <BellOff size={16} />}
                                    </button>
                                </div>

                                <div className="mt-auto flex gap-2">
                                    <Link 
                                        to={`/entertainment/comics/${item.comic_slug}`} 
                                        className="flex-1 py-2 bg-primary/10 text-primary hover:bg-primary text-xs font-bold rounded-xl transition-all hover:text-white text-center"
                                    >
                                        Đọc tiếp
                                    </Link>
                                    <button 
                                        onClick={() => handleUnfollow(item.comic_slug)}
                                        className="p-2 border border-white/5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                        title="Bỏ theo dõi"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
