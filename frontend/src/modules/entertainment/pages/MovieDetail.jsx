import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ophimService } from '../services/ophimApi';
import BackButton from "../../../components/common/BackButton";
import { Play, Info, Calendar, Globe, Clock, History, AlertCircle, RefreshCw } from 'lucide-react';

import { useToast } from '../../../context/ToastContext';

export default function MovieDetail() {
    const { slug } = useParams();
    const toast = useToast();
    const [movie, setMovie] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeEmbed, setActiveEmbed] = useState('');
    const [activeEpisode, setActiveEpisode] = useState(null);
    const [error, setError] = useState(null);

    const [activeSource, setActiveSource] = useState(ophimService.getActiveSource().name);

    const fetchDetail = async (sourceName) => {
        setLoading(true);
        setError(null);
        if (sourceName) {
            ophimService.setSourceByName(sourceName);
            setActiveSource(sourceName);
        }
        try {
            const res = await ophimService.getMovieDetail(slug);
            if (res.success && res.data) {
                // Data is already normalized by service
                const movieData = res.data;
                const sessions = movieData.episodes || [];
                
                setMovie(movieData);
                setEpisodes(sessions);
                setActiveSource(movieData.raw_source);

                // Auto select best server & first episode
                const bestServer = ophimService.selectBestServer(sessions);
                if (bestServer && bestServer.items?.length > 0) {
                    const firstEp = bestServer.items[0];
                    setActiveEmbed(firstEp.embed);
                    setActiveEpisode(firstEp);
                }
            } else {
                setError(res.error || "Không thể lấy thông tin phim");
            }
        } catch (error) {
            console.error("Failed to load movie detail", error);
            setError("Lỗi kết nối máy chủ dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [slug]);

    const handleFallback = () => {
        if (!activeEpisode) return;
        
        const currentEpName = activeEpisode.name;
        for (const server of episodes) {
            const alternative = server.items.find(ep => ep.name === currentEpName && ep.embed !== activeEmbed);
            if (alternative) {
                console.log(`[Fallback] Switching to server: ${server.server_name}`);
                setActiveEmbed(alternative.embed);
                setActiveEpisode(alternative);
                return;
            }
        }
        toast.error("Không tìm thấy server dự phòng cho tập này.");
    };

    const sourceSwitcher = (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
            <BackButton fallbackPath="/entertainment/movies" label="Quay lại kho phim" />
            
            <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-2 rounded-2xl border border-white/5">
                <div className="px-3 flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest border-r border-white/10 mr-1">
                    <Globe size={12} className="text-blue-500" />
                    <span>Nguồn / Server:</span>
                </div>
                {ophimService.getSources().map((source) => (
                    <button
                        key={source.name}
                        onClick={() => {
                            if (activeSource === source.name) return;
                            fetchDetail(source.name);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeSource === source.name
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {source.name}
                    </button>
                ))}
            </div>
        </div>
    );

    if (loading) return (
        <div className="p-4 sm:p-6 lg:p-10 animate-fade-in pb-20">
            {sourceSwitcher}
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="animate-spin text-blue-500">
                    <RefreshCw size={48} />
                </div>
                <p className="text-slate-500 font-bold animate-pulse text-sm uppercase tracking-widest">Đang tải dữ liệu phim...</p>
            </div>
        </div>
    );

    if (error || !movie) return (
        <div className="p-4 sm:p-6 lg:p-10 animate-fade-in pb-20">
            {sourceSwitcher}
            <div className="p-20 text-center">
                <div className="inline-flex p-6 bg-red-500/10 rounded-full text-red-500 mb-6">
                    <AlertCircle size={48} />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Ối! Có lỗi xảy ra</h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto">{error || "Không tìm thấy thông tin phim này ở nguồn này. Hãy thử chuyển sang nguồn khác ở trên."}</p>
                <button 
                    onClick={fetchDetail}
                    className="px-8 py-3 bg-white text-slate-900 font-black rounded-2xl hover:bg-blue-500 hover:text-white transition-all shadow-lg"
                >
                    Thử lại nguồn hiện tại
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-10 animate-fade-in pb-20">
            {sourceSwitcher}

            {/* Movie Viewer */}
            <div className="relative w-full rounded-3xl overflow-hidden bg-slate-900 border border-white/5 mb-10 shadow-2xl">
                {/* Server Quick Switch (if multiple servers) */}
                {episodes.length > 1 && activeEmbed && (
                    <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 max-w-[80%]">
                        {episodes.map((s, idx) => {
                            const hasThisEp = s.items.find(ep => ep.name === activeEpisode?.name);
                            if (!hasThisEp) return null;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setActiveEmbed(hasThisEp.embed);
                                        setActiveEpisode(hasThisEp);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all glass ${
                                        activeEmbed === hasThisEp.embed 
                                        ? 'bg-blue-600/80 text-white border-blue-400' 
                                        : 'bg-black/40 text-slate-400 hover:text-white border-white/10'
                                    }`}
                                >
                                    {s.server_name}
                                </button>
                            );
                        })}
                    </div>
                )}

                {!activeEmbed ? (
                    <div className="relative aspect-video flex items-center justify-center overflow-hidden">
                        <img 
                            src={movie.thumb_url} 
                            className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm scale-105"
                            alt="Background"
                        />
                        <div className="relative z-10 flex flex-col items-center">
                            <button 
                                onClick={() => {
                                    const best = ophimService.selectBestServer(episodes);
                                    if (best) {
                                        setActiveEmbed(best.items[0].embed);
                                        setActiveEpisode(best.items[0]);
                                    }
                                }}
                                className="w-20 h-20 sm:w-28 sm:h-28 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-blue-500/50 hover:scale-110 active:scale-95 transition-all group"
                            >
                                <Play size={40} className="fill-current ml-2 group-hover:scale-110" />
                            </button>
                            <p className="mt-6 text-white font-bold text-lg uppercase tracking-widest animate-pulse">Bấm để xem ngay</p>
                        </div>
                    </div>
                ) : (
                    <div className="relative aspect-video bg-black">
                        <iframe
                            src={activeEmbed}
                            className="w-full h-full"
                            frameBorder="0"
                            allowFullScreen
                            title={movie.name}
                        ></iframe>
                        
                        <button 
                            onClick={handleFallback}
                            className="absolute bottom-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-xl text-white/70 hover:text-white hover:bg-blue-600 transition-all border border-white/5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-xl"
                        >
                            <RefreshCw size={14} /> <span>Đổi Server dự phòng</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="flex flex-col xl:flex-row gap-12">
                {/* Sidebar */}
                <div className="w-full xl:w-80 shrink-0">
                    <div className="rounded-3xl overflow-hidden border border-white/10 shadow-xl mb-6 hidden xl:block aspect-[2/3] bg-slate-800">
                        <img 
                            src={movie.poster_url || movie.thumb_url} 
                            className="w-full h-full object-cover" 
                            alt={movie.name} 
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 xl:grid-cols-1 gap-3">
                        <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                            <Calendar size={18} className="text-blue-400" />
                            <div>
                                <p className="text-slate-500 uppercase font-black tracking-widest text-[8px]">Năm</p>
                                <p className="text-white font-bold text-sm">{movie.year}</p>
                            </div>
                        </div>
                        <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                            <Clock size={18} className="text-orange-400" />
                            <div>
                                <p className="text-slate-500 uppercase font-black tracking-widest text-[8px]">Thời Lượng</p>
                                <p className="text-white font-bold text-sm">{movie.time || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                            <Globe size={18} className="text-green-400" />
                            <div>
                                <p className="text-slate-500 uppercase font-black tracking-widest text-[8px]">Quốc Gia</p>
                                <p className="text-white font-bold text-sm">{movie.country?.[0]?.name || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                            <History size={18} className="text-purple-400" />
                            <div>
                                <p className="text-slate-500 uppercase font-black tracking-widest text-[8px]">Ngôn Ngữ</p>
                                <p className="text-white font-bold text-sm">{movie.lang || 'N/A'}</p>
                            </div>
                        </div>
                        {movie.director && movie.director.length > 0 && movie.director[0] !== "" && (
                            <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5 col-span-2 xl:col-span-1">
                                <p className="text-slate-500 uppercase font-black tracking-widest text-[8px] mb-1">Đạo Diễn</p>
                                <p className="text-blue-200 font-bold text-sm line-clamp-1">{movie.director.join(', ')}</p>
                            </div>
                        )}
                        {movie.actor && movie.actor.length > 0 && movie.actor[0] !== "" && (
                            <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5 col-span-2 xl:col-span-1">
                                <p className="text-slate-500 uppercase font-black tracking-widest text-[8px] mb-1">Diễn Viên</p>
                                <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">{movie.actor.join(', ')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 leading-none tracking-tighter italic uppercase">{movie.name}</h1>
                    <p className="text-xl text-slate-500 mb-8 font-medium">{movie.origin_name} ({movie.year})</p>
                    
                    <div className="flex flex-wrap gap-2 mb-12">
                        {movie.category?.map((cat, idx) => (
                            <span key={idx} className="px-5 py-2.5 bg-slate-800/50 text-[10px] text-white font-black rounded-xl border border-white/5 uppercase tracking-widest">
                                {cat.name}
                            </span>
                        ))}
                    </div>

                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-blue-600 rounded-full shadow-lg shadow-blue-500/50"></div>
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">Cốt Truyện</h3>
                        </div>
                        <div 
                            className="text-slate-400 leading-relaxed text-lg prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: movie.description }}
                        ></div>
                    </div>

                    {/* EPISODES */}
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-1.5 h-6 bg-blue-600 rounded-full shadow-lg shadow-blue-500/50"></div>
                            <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">Danh Sách Tập</h3>
                        </div>
                        
                        <div className="space-y-8">
                            {episodes && episodes.length > 0 ? episodes.map((serv, sIdx) => (
                                <div key={sIdx} className="bg-slate-900/40 p-8 rounded-[2rem] border border-white/5 shadow-inner">
                                    <div className="flex items-center justify-between mb-6">
                                        <p className="text-[10px] text-blue-400 uppercase font-black tracking-[0.2em]">
                                            Dòng truyền tải: {serv.server_name}
                                        </p>
                                        <div className="px-3 py-1 bg-blue-500/10 rounded-full text-[8px] text-blue-500 font-black uppercase tracking-widest">Ổn định</div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {serv.items?.map((ep, eIdx) => (
                                            <button
                                                key={eIdx}
                                                onClick={() => {
                                                    setActiveEmbed(ep.embed);
                                                    setActiveEpisode(ep);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className={`min-w-[4rem] px-5 py-3 rounded-2xl font-black text-xs transition-all border ${
                                                    activeEmbed === ep.embed 
                                                    ? 'bg-blue-600 text-white border-transparent shadow-2xl shadow-blue-600/50 scale-110 z-10' 
                                                    : 'bg-slate-800 text-slate-500 border-white/5 hover:border-blue-500/30 hover:text-white hover:scale-105'
                                                }`}
                                            >
                                                {ep.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )) : (
                                <div className="p-10 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                                    <p className="text-slate-600 text-sm font-bold uppercase tracking-widest">Đang cập nhật tập mới...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
