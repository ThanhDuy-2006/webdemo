import React from 'react';
import { Filter, X } from 'lucide-react';

export const MovieFilter = ({ 
    categories = [], 
    countries = [], 
    years = [],
    filters = {}, 
    onChange, 
    onClear,
    className = ""
}) => {
    const TYPES = [
        { id: 'phim-le', name: 'Phim Lẻ' },
        { id: 'phim-bo', name: 'Phim Bộ' },
        { id: 'hoat-hinh', name: 'Hoạt Hình' },
        { id: 'tv-shows', name: 'TV Shows' },
        { id: 'chieu-rap', name: 'Chiếu Rạp' }
    ];

    return (
        <div className={`flex flex-wrap items-center gap-3 ${className}`}>
            <div className="flex items-center gap-2 text-slate-400 mr-2">
                <Filter size={18} />
                <span className="text-sm font-semibold uppercase tracking-wider hidden sm:inline">Bộ lọc</span>
            </div>

            {/* Type Filter */}
            <select 
                value={filters.type || ''}
                onChange={(e) => onChange('type', e.target.value)}
                className="bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500/50 transition-all"
            >
                <option value="">-- Loại Phim --</option>
                {TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>

            {/* Genre Filter */}
            <select 
                value={filters.category || ''}
                onChange={(e) => onChange('category', e.target.value)}
                className="bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500/50 transition-all max-w-[150px]"
            >
                <option value="">-- Thể Loại --</option>
                {categories.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
            </select>

            {/* Country Filter */}
            <select 
                value={filters.country || ''}
                onChange={(e) => onChange('country', e.target.value)}
                className="bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500/50 transition-all max-w-[150px]"
            >
                <option value="">-- Quốc Gia --</option>
                {countries.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
            </select>

            {/* Year Filter */}
            <select 
                value={filters.year || ''}
                onChange={(e) => onChange('year', e.target.value)}
                className="bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500/50 transition-all"
            >
                <option value="">-- Năm --</option>
                {years.map(y => (
                   <option key={y} value={y}>{y}</option> 
                ))}
            </select>

            {/* Clear Button */}
            {(filters.type || filters.category || filters.country || filters.year) && (
                <button 
                    onClick={onClear}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors ml-auto sm:ml-0"
                >
                    <X size={14} /> Xóa lọc
                </button>
            )}
        </div>
    );
};
