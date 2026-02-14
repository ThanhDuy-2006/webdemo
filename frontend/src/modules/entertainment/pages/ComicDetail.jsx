import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { entertainmentService, COMIC_IMG_CDN } from '../services/entertainmentApi';
import BackButton from "../../../components/common/BackButton";
import { ChapterList } from '../components/ChapterList';
import { Calendar, User, Info, Tag, Heart } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../context/ToastContext';

export default function ComicDetail() {
    const { slug } = useParams();
    const { user } = useAuth();
    const toast = useToast();
    const [comic, setComic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const res = await entertainmentService.getComicDetail(slug);
                if (res.status === 'success') {
                    setComic(res.data.item);
                    
                    // Check if following
                    if (user) {
                        const followRes = await entertainmentService.checkFollowing(slug);
                        setIsFollowing(followRes.isFollowing);
                    }
                }
            } catch (error) {
                console.error("Failed to load comic detail", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [slug, user]);

    const handleToggleFollow = async () => {
        if (!user) {
            toast.warn("Vui lòng đăng nhập để theo dõi truyện!");
            return;
        }

        setFollowLoading(true);
        try {
            if (isFollowing) {
                await entertainmentService.unfollowComic(slug);
                setIsFollowing(false);
                toast.success("Đã bỏ theo dõi truyện");
            } else {
                await entertainmentService.followComic({
                    slug: comic.slug,
                    name: comic.name,
                    thumb: comic.thumb_url,
                    lastChapter: comic.chapters?.[0]?.server_data?.[0]?.chapter_name || "1"
                });
                setIsFollowing(true);
                toast.success("Thêm vào danh sách theo dõi thành công!");
            }
        } catch (error) {
            console.error("Follow toggle failed", error);
            toast.error("Thao tác thất bại, vui lòng thử lại sau.");
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin text-primary text-4xl">🌀</div>
        </div>
    );

    if (!comic) return (
        <div className="p-10 text-center">
            <h2 className="text-2xl text-white">Không tìm thấy nội dung</h2>
            <Link to="/entertainment/comics" className="text-primary mt-4 inline-block">Quay lại danh sách</Link>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
            <BackButton fallbackPath="/entertainment/comics" label="Quay lại danh sách" className="mb-6" />

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                {/* Side: Thumbnail */}
                <div className="w-full lg:w-72 shrink-0">
                    <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-[3/4]">
                        <img 
                            src={`${COMIC_IMG_CDN}/${comic.thumb_url}`} 
                            alt={comic.name} 
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Main Info */}
                <div className="flex-1">
                    <div className="mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <h1 className="text-3xl sm:text-4xl font-black text-white text-glow">{comic.name}</h1>
                            <button 
                                onClick={handleToggleFollow}
                                disabled={followLoading}
                                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all duration-300 transform active:scale-95 ${
                                    isFollowing 
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30' 
                                    : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                                }`}
                            >
                                <Heart size={20} className={isFollowing ? 'fill-rose-400' : ''} />
                                <span>{isFollowing ? 'Đang theo dõi' : 'Theo dõi truyện'}</span>
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {comic.category?.map(cat => (
                                <span key={cat.id} className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {cat.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        <div className="flex items-center gap-3 text-slate-400 text-sm bg-slate-800/40 p-3 rounded-2xl border border-white/5">
                            <Info size={18} className="text-blue-400" />
                            <span>Trạng thái: <strong className="text-white uppercase">{comic.status || 'Đang cập nhật'}</strong></span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400 text-sm bg-slate-800/40 p-3 rounded-2xl border border-white/5">
                            <User size={18} className="text-purple-400" />
                            <span>Tác giả: <strong className="text-white">{comic.author?.join(', ') || 'Đang cập nhật'}</strong></span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400 text-sm bg-slate-800/40 p-3 rounded-2xl border border-white/5">
                            <Calendar size={18} className="text-green-400" />
                            <span>Cập nhật: <strong className="text-white">{new Date(comic.updatedAt).toLocaleDateString()}</strong></span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400 text-sm bg-slate-800/40 p-3 rounded-2xl border border-white/5">
                            <Tag size={18} className="text-orange-400" />
                            <span>Tổng chương: <strong className="text-white">{comic.chapters?.[0]?.server_data?.length || 0}</strong></span>
                        </div>
                    </div>

                    <div className="mb-10">
                        <h3 className="text-xl font-bold text-white mb-4 border-l-4 border-primary pl-4">Giới thiệu</h3>
                        <div 
                            className="text-slate-400 leading-relaxed comic-content prose prose-invert"
                            dangerouslySetInnerHTML={{ __html: comic.content }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Chapters Section */}
            <div className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-8 border-l-4 border-primary pl-4">Danh sách chương</h2>
                <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl">
                    <ChapterList 
                        chapters={comic.chapters?.[0]?.server_data} 
                        comicSlug={comic.slug}
                    />
                </div>
            </div>
        </div>
    );
}
