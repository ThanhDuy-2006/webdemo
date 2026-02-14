import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { entertainmentService } from '../services/entertainmentApi';
import BackButton from "../../../components/common/BackButton";
import { ArrowLeft, ArrowRight, Settings, List, Home, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

export default function ChapterReader() {
    const { slug, chapterNum } = useParams();
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [chapter, setChapter] = useState(null);
    const [allChapters, setAllChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [imgDomain, setImgDomain] = useState('');
    const [isListOpen, setIsListOpen] = useState(false);
    const [showUI, setShowUI] = useState(true);
    const lastScrollY = useRef(0);

    // Toggle UI on double click
    const handleDoubleClick = (e) => {
        if (e.target.closest('button, a')) return;
        setShowUI(!showUI);
    };

    // Auto show/hide UI on scroll
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // Show UI when scrolling up significantly or at top
            if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 100) {
                setShowUI(true);
            } 
            // Hide UI when scrolling down
            else if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 100) {
                setShowUI(false);
            }
            
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const fetchChapter = async () => {
            window.scrollTo(0, 0);
            setLoading(true);
            try {
                // Fetch Comic Detail to get the full list of chapters
                const comicRes = await entertainmentService.getComicDetail(slug);
                if (comicRes.status === 'success') {
                    const serverData = comicRes.data.item.chapters[0]?.server_data || [];
                    setAllChapters(serverData);
                    
                    // Find the current chapter API URL
                    const chapData = serverData.find(c => c.chapter_name === chapterNum);
                    const apiUrl = chapData?.chapter_api_data;

                    if (apiUrl) {
                        const res = await entertainmentService.getChapterDetail(apiUrl);
                        if (res.status === 'success') {
                            setChapter(res.data.item);
                            setImgDomain(res.data.domain_cdn);

                            // Update last chapter in follow list if logged in
                            if (user) {
                                entertainmentService.updateLastChapter(slug, chapterNum).catch(() => {});
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load chapter", error);
            } finally {
                setLoading(false);
            }
        };
        fetchChapter();
    }, [slug, chapterNum, user]);

    const currentIndex = allChapters.findIndex(c => c.chapter_name === chapterNum);
    const isNewestFirst = allChapters.length > 1 && parseFloat(allChapters[0].chapter_name) > parseFloat(allChapters[allChapters.length - 1].chapter_name);
    
    // "Tiếp" (Next) = Newer chapter
    const nextChap = currentIndex !== -1 ? (isNewestFirst 
        ? (currentIndex > 0 ? allChapters[currentIndex - 1] : null)
        : (currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null)) : null;
        
    // "Trước" (Prev) = Older chapter
    const prevChap = currentIndex !== -1 ? (isNewestFirst
        ? (currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null)
        : (currentIndex > 0 ? allChapters[currentIndex - 1] : null)) : null;

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
            <div className="animate-spin text-4xl mb-4">🌀</div>
            <p className="text-slate-500 animate-pulse">Đang tải nội dung chương {chapterNum}...</p>
        </div>
    );

    if (!chapter) return (
        <div className="p-10 text-center bg-black min-h-screen text-white">
            <h2 className="text-2xl mb-4">Lỗi tải dữ liệu chương</h2>
            <Link to={`/entertainment/comics/${slug}`} className="text-primary">Quay lại mục lục</Link>
        </div>
    );

    return (
        <div 
            className="min-h-screen bg-[#050505] animate-fade-in select-none"
            onDoubleClick={handleDoubleClick}
        >
            {/* Control Bar (Top) - Fixed & Toggleable */}
            <div className={`fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between transition-transform duration-300 ${showUI ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="flex items-center gap-4">
                    <BackButton fallbackPath={`/entertainment/comics/${slug}`} label="" className="!p-1" />
                    <div>
                        <h1 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{chapter.comic_name}</h1>
                        <p className="text-[10px] text-slate-500">Chương {chapter.chapter_name}: {chapter.chapter_title || 'Mới'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                   <button className="p-2 text-slate-400 hover:text-white hidden sm:block"><Settings size={18} /></button>
                   <Link to="/entertainment/comics" className="p-2 text-slate-400 hover:text-white"><Home size={18} /></Link>
                   <button 
                        onClick={() => setShowUI(false)}
                        className="p-2 text-slate-500 hover:text-white sm:hidden"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Images Container */}
            <div className={`max-w-3xl mx-auto transition-all duration-300 ${showUI ? 'pt-20 pb-40' : 'py-0'}`}>
                {chapter.chapter_path && chapter.chapter_image?.map((img, index) => (
                    <div key={index} className="relative w-full bg-slate-900 flex items-center justify-center min-h-[300px]">
                        <img 
                            src={`${imgDomain}/${chapter.chapter_path}/${img.image_file}`}
                            alt={`Trang ${index + 1}`}
                            className="w-full h-auto block"
                            loading="lazy"
                            onError={(e) => {
                                e.target.src = "https://via.placeholder.com/800x1200?text=Loi+tai+hinh+anh";
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Navigation (Floating Bottom) - Toggleable */}
            <div className={`fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 p-6 transition-transform duration-500 ${showUI ? 'translate-y-0' : 'translate-y-full'} shadow-2xl shadow-black`}>
                <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/entertainment/comics/${slug}/chapter/${prevChap.chapter_name}`); }}
                        disabled={!prevChap}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-slate-800 rounded-2xl text-white font-bold disabled:opacity-30 hover:bg-slate-700 transition-all border border-white/5 active:scale-95"
                    >
                        <div className="flex items-center gap-2">
                            <ArrowLeft size={16} />
                            <span>Trước</span>
                        </div>
                        {prevChap && <span className="text-[9px] font-normal opacity-50">Chương {prevChap.chapter_name}</span>}
                    </button>

                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsListOpen(true); }}
                        className="px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-90"
                    >
                        <List size={22} />
                    </button>

                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/entertainment/comics/${slug}/chapter/${nextChap.chapter_name}`); }}
                        disabled={!nextChap}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-slate-800 rounded-2xl text-white font-bold disabled:opacity-30 hover:bg-slate-700 transition-all border border-white/5 active:scale-95"
                    >
                        <div className="flex items-center gap-2">
                            <span>Tiếp</span>
                            <ArrowRight size={16} />
                        </div>
                        {nextChap && <span className="text-[9px] font-normal opacity-50">Chương {nextChap.chapter_name}</span>}
                    </button>
                </div>
                
                <p className="text-center text-slate-500 text-[10px] mt-4 uppercase tracking-widest font-bold opacity-50 hidden sm:block">
                    Double click để ẩn/hiện thanh công cụ
                </p>
                
                <p className="text-center text-slate-500 text-[10px] mt-2 opacity-40">
                    Bạn đang đọc tại <strong>HouseMarket Entertainment</strong>
                </p>
            </div>

            {/* Chapter List Modal/Overlay */}
            {isListOpen && (
                <div className="fixed inset-0 z-[100] animate-fade-in">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsListOpen(false)}
                    ></div>
                    
                    {/* Content */}
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col animate-slide-in-right">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
                            <div>
                                <h3 className="text-white font-bold">Danh sách chương</h3>
                                <p className="text-[10px] text-slate-500">{allChapters.length} chương</p>
                            </div>
                            <button 
                                onClick={() => setIsListOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {allChapters.map((chap) => (
                                <button
                                    key={chap.chapter_name}
                                    onClick={() => {
                                        setIsListOpen(false);
                                        navigate(`/entertainment/comics/${slug}/chapter/${chap.chapter_name}`);
                                    }}
                                    className={`w-full p-4 rounded-xl text-left border transition-all ${
                                        chap.chapter_name === chapterNum 
                                        ? 'bg-black border-blue-500/50 text-white font-bold shadow-lg shadow-blue-500/10' 
                                        : 'bg-slate-800/40 border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>Chương {chap.chapter_name}</span>
                                        {chap.chapter_name === chapterNum && (
                                            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-blue-400 border border-blue-500/30 uppercase tracking-tighter font-black">
                                                ĐANG ĐỌC
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] opacity-60 mt-0.5 line-clamp-1">{chap.chapter_title || 'Mới'}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
