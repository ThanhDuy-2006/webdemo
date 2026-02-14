import React from 'react';
import { Link } from 'react-router-dom';
import BackButton from "../../../components/common/BackButton";

export default function EntertainmentHome() {
    const categories = [
        {
            title: "Truyện Tranh",
            description: "Hàng ngàn bộ truyện tranh hot nhất từ Action, Romance đến Kinh dị.",
            icon: "📚",
            path: "/entertainment/comics",
            color: "from-orange-500 to-red-600",
            count: "10,000+"
        },
        {
            title: "Xem Phim",
            description: "Phim bom tấn, phim bộ, phim lẻ được cập nhật mỗi ngày với chất lượng HD.",
            icon: "🎬",
            path: "/entertainment/movies",
            color: "from-blue-500 to-indigo-600",
            count: "5,000+"
        }
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-10 animate-fade-in pb-20">
            <BackButton fallbackPath="/" label="Quay lại cửa hàng" className="mb-8" />
            
            <header className="mb-10">
                <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Trung Tâm Giải Trí</h1>
                <p className="text-slate-400 max-w-2xl leading-relaxed">
                    Khám phá thế giới nội dung vô tận. Từ những bộ truyện tranh cuốn hút đến những thước phim điện ảnh đỉnh cao, tất cả đều có tại đây.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
                {categories.map((cat) => (
                    <Link 
                        key={cat.title}
                        to={cat.path}
                        className="group relative block p-8 rounded-3xl bg-slate-800/40 border border-white/5 overflow-hidden transition-all duration-500 hover:border-white/10 hover:-translate-y-2 hover:shadow-2xl"
                    >
                        {/* Background Gradient Detail */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${cat.color} opacity-20 blur-3xl group-hover:opacity-40 transition-opacity`}></div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="text-5xl">{cat.icon}</div>
                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${cat.color} shadow-lg`}>
                                    {cat.count}
                                </span>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400 transition-all">
                                {cat.title}
                            </h2>
                            <p className="text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed mb-6 italic">
                                "{cat.description}"
                            </p>
                            
                            <div className="flex items-center gap-2 text-white font-bold group-hover:gap-4 transition-all">
                                <span>Khám phá ngay</span>
                                <span className="text-xl">➜</span>
                            </div>
                        </div>
                        
                        <div className="absolute bottom-4 right-4 opacity-5 text-8xl transition-transform group-hover:scale-110">
                            {cat.icon}
                        </div>
                    </Link>
                ))}
            </div>

            {/* Feature Banner Section */}
            <div className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-white/5 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2 underline decoration-purple-500 decoration-4 underline-offset-4">Trải nghiệm không gián đoạn</h3>
                        <p className="text-slate-400 max-w-md">Toàn bộ nội dung được tích hợp từ các nguồn API uy tín nhất, đảm bảo tốc độ và sự ổn định cao nhất cho trải nghiệm của bạn.</p>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            </div>
        </div>
    );
}
