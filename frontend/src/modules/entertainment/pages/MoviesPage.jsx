import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MovieCard } from '../components/Cards';
import { MovieFilter } from '../components/MovieFilter';
import { AdvancedFilter } from '../components/AdvancedFilter';
import { FilterChips } from '../components/FilterChips';
import { ChevronLeft, ChevronRight, Search, Clapperboard, Filter, Globe } from 'lucide-react';
import { ophimService } from '../services/ophimApi';
import BackButton from "../../../components/common/BackButton";

export default function MoviesPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Core data state
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Metadata state
    const [metadata, setMetadata] = useState({
        categories: [],
        countries: [],
        years: Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i)
    });

    // Pagination state
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [totalPages, setTotalPages] = useState(1);
    
    // Filter state
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [filters, setFilters] = useState({
        type: searchParams.get('type') || '',
        category: searchParams.get('category') || '',
        country: searchParams.get('country') || '',
        year: searchParams.get('year') || '',
        status: searchParams.get('status') || '',
        minRating: Number(searchParams.get('minRating')) || 0,
        yearFrom: searchParams.get('yearFrom') || '',
        yearTo: searchParams.get('yearTo') || ''
    });

    const [activeSource, setActiveSource] = useState(ophimService.getActiveSource().name);
    
    // Load metadata once
    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const [cats, countries] = await Promise.all([
                    ophimService.getCategories(),
                    ophimService.getCountries()
                ]);
                
                setMetadata(prev => ({
                    ...prev,
                    categories: cats.success && cats.data?.items ? cats.data.items : [],
                    countries: countries.success && countries.data?.items ? countries.data.items : []
                }));
            } catch (err) {
                console.error("Failed to load metadata", err);
            }
        };
        loadMetadata();
    }, []);

    const isFetching = useRef(false);
    const abortControllerRef = useRef(null);

    const fetchMoviesData = useCallback(async () => {
        if (isFetching.current) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        }
        
        isFetching.current = true;
        abortControllerRef.current = new AbortController();
        
        setLoading(true);
        setError(null);
        try {
            let res;
            
            // Priority 1: Search
            if (searchTerm.trim()) {
                res = await ophimService.search(searchTerm, page);
            } 
            // Priority 2: Filter
            else if (Object.values(filters).some(v => v !== '' && v !== 0)) {
                res = await ophimService.filter({ ...filters, page });
            }
            // Default: New movies
            else {
                res = await ophimService.getListBySlug('phim-moi-cap-nhat', page);
            }

            if (res && res.success && res.data) {
                // MovieService.data is already normalized: { items: [], pagination: {} }
                const { items, pagination } = res.data;
                
                setMovies(items || []);
                
                if (pagination) {
                    setTotalPages(pagination.totalPages || 1);
                }
                setLoading(false);
            } else {
                setMovies([]);
                setError(res?.error || "Không tìm thấy phim phù hợp");
                setLoading(false);
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error("Fetch movies error:", err);
            setError("Lỗi kết nối máy chủ phim");
            setLoading(false);
        } finally {
            isFetching.current = false;
        }
    }, [searchTerm, filters, page]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchMoviesData();
            
            // Update URL params
            const newParams = {};
            if (searchTerm) newParams.q = searchTerm;
            if (filters.type) newParams.type = filters.type;
            if (filters.category) newParams.category = filters.category;
            if (filters.country) newParams.country = filters.country;
            if (filters.year) newParams.year = filters.year;
            if (filters.status) newParams.status = filters.status;
            if (filters.minRating) newParams.minRating = filters.minRating;
            if (page > 1) newParams.page = page;
            
            setSearchParams(newParams, { replace: true });
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, filters, page, fetchMoviesData, setSearchParams]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset to first page on filter change
    };

    const clearFilters = () => {
        setFilters({
            type: '',
            category: '',
            country: '',
            year: '',
            status: '',
            minRating: 0,
            yearFrom: '',
            yearTo: ''
        });
        setSearchTerm('');
        setPage(1);
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 animate-fade-in pb-20">
            <BackButton fallbackPath="/entertainment" label="Quay lại giải trí" className="mb-6" />
            
            <div className="flex flex-col gap-8 mb-10">
                {/* Global Source Switcher */}
                <div className="flex items-center gap-2 bg-slate-900/40 p-2 rounded-2xl border border-white/5 self-start">
                    <div className="px-3 flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest border-r border-white/10 mr-1">
                        <Globe size={12} className="text-blue-500" />
                        <span>Nguồn / Server:</span>
                    </div>
                    {ophimService.getSources().map((source) => (
                        <button
                            key={source.name}
                            onClick={() => {
                                if (activeSource === source.name) return;
                                ophimService.setSourceByName(source.name);
                                setActiveSource(source.name);
                                setPage(1);
                                fetchMoviesData();
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

                {/* Logo & Headline */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-500">
                            <Clapperboard size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Thế Giới Điện Ảnh</h1>
                            <p className="text-slate-500 text-sm">Hàng ngàn bộ phim bom tấn cập nhật mỗi ngày</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-500" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Tìm tên phim, diễn viên..." 
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="block w-full bg-slate-800/60 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-4 sm:p-6">
                    <MovieFilter 
                        categories={metadata.categories}
                        countries={metadata.countries}
                        years={metadata.years}
                        filters={filters}
                        onChange={handleFilterChange}
                        onClear={clearFilters}
                    />
                    
                    <AdvancedFilter 
                        filters={filters}
                        onChange={handleFilterChange}
                        onApply={fetchMoviesData}
                        onReset={clearFilters}
                    />

                    <FilterChips 
                        filters={filters}
                        onRemove={(key) => handleFilterChange(key, '')}
                    />
                </div>
            </div>

            {error && !loading && (
                <div className="bg-red-500/10 border border-red-500/20 p-12 rounded-[2rem] text-center mb-10 animate-fade-in">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="text-red-500" />
                    </div>
                    <p className="text-red-400 font-bold text-lg mb-2">{error}</p>
                    <p className="text-red-400/60 text-sm mb-6 max-w-md mx-auto">Chúng tôi không tìm thấy kết quả phù hợp với các bộ lọc hiện tại. Hãy thử thay đổi tiêu chí lựa chọn của bạn.</p>
                    <button 
                        onClick={clearFilters}
                        className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all active:scale-95"
                    >
                        Xóa tất cả bộ lọc
                    </button>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="flex flex-col gap-3">
                            <div className="aspect-[2/3] bg-slate-800/50 rounded-2xl animate-pulse"></div>
                            <div className="h-4 bg-slate-800/50 rounded animate-pulse w-3/4"></div>
                            <div className="h-4 bg-slate-800/50 rounded animate-pulse w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-fade-in">
                        {movies.map((movie) => (
                            <MovieCard key={movie.id} movie={movie} />
                        ))}
                    </div>

                    {/* Empty State */}
                    {!loading && movies.length === 0 && !error && (
                         <div className="py-20 text-center">
                            <p className="text-slate-500">Không có dữ liệu phim cho lựa chọn này.</p>
                         </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-16 flex justify-center items-center gap-4">
                            <button 
                                onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={page === 1}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800 border border-white/5 text-slate-400 disabled:opacity-20 hover:bg-blue-600 hover:text-white transition-all group shadow-lg"
                                aria-label="Trang trước"
                            >
                                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            </button>
                            
                            <div className="bg-slate-800/80 border border-white/5 px-6 py-2 rounded-2xl flex flex-col items-center">
                                <span className="text-white font-black text-base">{page}</span>
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Trang / {totalPages}</span>
                            </div>

                            <button 
                                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                disabled={page === totalPages}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800 border border-white/5 text-slate-400 disabled:opacity-20 hover:bg-blue-600 hover:text-white transition-all group shadow-lg"
                                aria-label="Trang sau"
                            >
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
