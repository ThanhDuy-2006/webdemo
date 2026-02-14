import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { entertainmentService } from '../services/entertainmentApi';
import { ComicCard } from '../components/Cards';
import { ComicFilter } from '../components/ComicFilter';
import { FilterChips } from '../components/FilterChips';
import { Search, ListFilter, LayoutGrid, SlidersHorizontal, Loader2, ArrowUp, Library } from 'lucide-react';
import BackButton from "../../../components/common/BackButton";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const comicCache = new Map();

const SkeletonCard = () => (
    <div className="flex flex-col gap-3">
        <div className="aspect-[3/4] bg-slate-800/40 rounded-2xl animate-pulse border border-white/5"></div>
        <div className="h-4 bg-slate-800/40 rounded animate-pulse w-3/4"></div>
        <div className="h-3 bg-slate-800/40 rounded animate-pulse w-1/2"></div>
    </div>
);

export default function ComicsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Core data state
    const [comics, setComics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
    const [error, setError] = useState(null);
    const [categories, setCategories] = useState([]);
    
    // UI state
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    
    // Pagination & Guard state
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);

    // Filter state
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [filters, setFilters] = useState({
        category: searchParams.get('category') || '',
        status: searchParams.get('status') || '',
        sort: searchParams.get('sort') || 'updated',
        yearFrom: searchParams.get('yearFrom') || '',
        yearTo: searchParams.get('yearTo') || '',
        ratingMin: searchParams.get('ratingMin') || '',
        type: searchParams.get('type') || '',
        minChapters: searchParams.get('minChapters') || ''
    });

    // Load initial metadata
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const res = await entertainmentService.getComicCategories();
                if (res.status === 'success') {
                    setCategories(res.data.items || []);
                }
            } catch (err) {
                console.error("Failed to load comic categories", err);
            }
        };
        loadMetadata();
        
        const handleScroll = () => setShowScrollTop(window.scrollY > 500);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const filterObject = useMemo(() => ({
        ...filters,
        q: searchTerm,
        page
    }), [filters, searchTerm, page]);

    const fetchComics = useCallback(async () => {
        // Build Cache Key
        const cacheKey = JSON.stringify({ ...filters, q: searchTerm, page });
        if (comicCache.has(cacheKey)) {
            const cached = comicCache.get(cacheKey);
            if (Date.now() < cached.expiry) {
                setComics(cached.data);
                setPagination(cached.pagination);
                setLoading(false);
                return;
            }
            comicCache.delete(cacheKey);
        }

        // Guard against multiple concurrent requests
        if (isFetching.current) return;
        isFetching.current = true;
        
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
            const res = await entertainmentService.filterComics({ ...filters, q: searchTerm, page });
            if (res.success) {
                const items = res.data || [];
                setComics(items);
                if (res.pagination) {
                    setPagination(res.pagination);
                }
                
                // Save to Cache
                comicCache.set(cacheKey, {
                    data: items,
                    pagination: res.pagination || { page, totalPages: 1 },
                    expiry: Date.now() + CACHE_TTL
                });
            } else {
                setError(res.error || "Không có kết quả");
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            setError("Không thể tải danh sách truyện. Vui lòng thử lại.");
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [filters, searchTerm, page]);



    // Sync state with URL params
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params = {};
            if (searchTerm) params.q = searchTerm;
            if (filters.category) params.category = filters.category;
            if (filters.status) params.status = filters.status;
            if (filters.sort !== 'updated') params.sort = filters.sort;
            if (filters.yearFrom) params.yearFrom = filters.yearFrom;
            if (filters.yearTo) params.yearTo = filters.yearTo;
            if (filters.ratingMin) params.ratingMin = filters.ratingMin;
            if (filters.type) params.type = filters.type;
            if (filters.minChapters) params.minChapters = filters.minChapters;
            if (page > 1) params.page = page;

            setSearchParams(params, { replace: true });
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, filters, page, setSearchParams]);

    // Trigger fetch when parameters change
    useEffect(() => {
        fetchComics();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [filters, searchTerm, page, fetchComics]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset to first page
        setComics([]); // Clear current list to show skeleton
    };

    const handleReset = () => {
        setFilters({
            category: '',
            status: '',
            sort: 'updated',
            yearFrom: '',
            yearTo: '',
            ratingMin: '',
            type: '',
            minChapters: ''
        });
        setSearchTerm('');
        setPage(1);
        setComics([]);
    };

    const activeFilterCount = Object.values(filters).filter(v => v !== '' && v !== 'updated').length;

    return (
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-10 animate-fade-in pb-20">
            <BackButton fallbackPath="/entertainment" label="Quay lại giải trí" className="mb-8" />
            
            <header className="mb-12">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-blue-600 rounded-full shadow-lg shadow-blue-500/50"></div>
                        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tighter italic">Kho Truyện Tranh</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Khám phá hàng ngàn bộ truyện từ khắp nơi trên thế giới</p>
                </div>

                <div className="flex items-center gap-3">
                    <Link 
                        to="/entertainment/following"
                        className="flex items-center gap-2 px-5 py-3.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl font-bold hover:bg-rose-500 hover:text-white transition-all duration-300 group shadow-lg shadow-rose-500/5"
                    >
                        <Library size={18} className="group-hover:animate-bounce" />
                        <span className="hidden sm:inline">Truyện theo dõi</span>
                    </Link>

                    <div className="relative flex-1 sm:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm truyện..." 
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="w-full bg-slate-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                        />
                    </div>
                    
                    <button 
                        onClick={() => setIsFilterOpen(true)}
                        className="lg:hidden p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 active:scale-95 transition-all relative"
                    >
                        <SlidersHorizontal size={20} />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-900 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0b0b0f]">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>

            <div className="flex flex-col lg:flex-row gap-10">
                {/* Left Sidebar Filter */}
                <ComicFilter 
                    categories={categories}
                    filters={filters}
                    onChange={handleFilterChange}
                    onReset={handleReset}
                    onApply={() => setIsFilterOpen(false)}
                    isOpen={isFilterOpen}
                    onClose={() => setIsFilterOpen(false)}
                />

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    {/* Active Filters Display */}
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest mr-2">
                            <LayoutGrid size={14} />
                            <span>Hiển thị</span>
                        </div>
                        <FilterChips 
                            filters={filters} 
                            onRemove={(key) => handleFilterChange(key, '')} 
                        />
                        {activeFilterCount > 0 && (
                            <button onClick={handleReset} className="text-[10px] text-red-400 font-black uppercase tracking-widest hover:underline px-2">Xóa hết</button>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center mb-10 animate-in fade-in zoom-in duration-300">
                           <p className="text-red-400 font-bold mb-4">{error}</p>
                           <button onClick={() => fetchComics()} className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20">Thử lại</button>
                        </div>
                    )}

                    {loading && comics.length === 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6">
                            {[...Array(15)].map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : (
                        <>
                            {comics.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6">
                                    {comics.map((comic) => (
                                        <ComicCard key={comic._id} comic={comic} />
                                    ))}
                                </div>
                            ) : !loading && (
                                <div className="py-20 flex flex-col items-center justify-center text-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-white/5">
                                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-slate-600 mb-6">
                                        <ListFilter size={40} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Không tìm thấy truyện nào</h3>
                                    <p className="text-slate-500 max-w-xs">Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
                                    <button onClick={handleReset} className="mt-8 px-8 py-3 bg-white text-slate-900 font-black rounded-2xl hover:bg-blue-600 hover:text-white transition-all">Làm mới bộ lọc</button>
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {pagination.totalPages > 1 && (
                                <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
                                    <button 
                                        onClick={() => setPage(1)}
                                        disabled={page === 1}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-white/5 disabled:opacity-30 transition-all hover:bg-blue-600 hover:text-white"
                                    >«</button>
                                    <button 
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-white/5 disabled:opacity-30 transition-all hover:bg-blue-600 hover:text-white font-bold"
                                    >Trước</button>

                                    <div className="flex items-center gap-2 px-4 h-10 bg-slate-900/50 border border-white/10 rounded-xl">
                                        <span className="text-blue-500 font-black">Trang {page}</span>
                                        <span className="text-slate-600">/</span>
                                        <span className="text-slate-400">{pagination.totalPages}</span>
                                    </div>

                                    <button 
                                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                        disabled={page === pagination.totalPages}
                                        className="px-4 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-white/5 disabled:opacity-30 transition-all hover:bg-blue-600 hover:text-white font-bold"
                                    >Tiếp</button>
                                    <button 
                                        onClick={() => setPage(pagination.totalPages)}
                                        disabled={page === pagination.totalPages}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-white/5 disabled:opacity-30 transition-all hover:bg-blue-600 hover:text-white"
                                    >»</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Scroll to Top */}
            <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`fixed bottom-8 right-8 p-4 bg-white text-slate-900 rounded-full shadow-2xl z-50 transition-all duration-300 transform ${showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
            >
                <ArrowUp size={24} />
            </button>
        </div>
    );
}
