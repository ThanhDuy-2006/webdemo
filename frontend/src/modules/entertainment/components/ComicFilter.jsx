import React, { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, ChevronUp, Check, RefreshCw } from 'lucide-react';

export const ComicFilter = ({ 
    categories = [], 
    filters = {}, 
    onChange, 
    onReset,
    onApply,
    isOpen,
    onClose
}) => {
    const STATUS_OPTIONS = [
        { id: 'ongoing', name: 'Đang tiến hành' },
        { id: 'completed', name: 'Hoàn thành' },
        { id: 'upcoming', name: 'Sắp ra mắt' }
    ];

    const SORT_OPTIONS = [
        { id: 'updated', name: 'Mới cập nhật' },
        { id: 'newest', name: 'Truyện mới' },
        { id: 'views', name: 'Lượt xem' },
        { id: 'follows', name: 'Theo dõi' },
        { id: 'rating', name: 'Đánh giá' },
        { id: 'az', name: 'A-Z' },
        { id: 'za', name: 'Z-A' }
    ];

    const TYPE_OPTIONS = [
        { id: 'manga', name: 'Manga' },
        { id: 'manhwa', name: 'Manhwa' },
        { id: 'manhua', name: 'Manhua' },
        { id: 'comic-viet', name: 'Truyện Việt' }
    ];

    const [catSearch, setCatSearch] = useState("");
    const [expandedSections, setExpandedSections] = useState({
        categories: true,
        status: true,
        sort: true,
        advanced: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleCategoryToggle = (slug) => {
        const currentCats = filters.category ? filters.category.split(',') : [];
        let newCats;
        if (currentCats.includes(slug)) {
            newCats = currentCats.filter(c => c !== slug);
        } else {
            newCats = [...currentCats, slug];
        }
        onChange('category', newCats.join(','));
    };

    const isAllSelected = categories.length > 0 && (filters.category?.split(',').length === categories.length);

    const toggleAllCategories = () => {
        if (isAllSelected) {
            onChange('category', '');
        } else {
            onChange('category', categories.map(c => c.slug).join(','));
        }
    };

    const FilterContent = () => (
        <div className="space-y-6 pb-20 lg:pb-0">
            {/* Categories Section */}
            <div className="border-b border-white/5 pb-4">
                <button 
                    onClick={() => toggleSection('categories')}
                    className="flex items-center justify-between w-full mb-3 text-white font-bold text-sm uppercase tracking-wider"
                >
                    <span>Thể loại</span>
                    {expandedSections.categories ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                
                {expandedSections.categories && (
                    <div className="space-y-4">
                        <div className="relative group">
                            <input 
                                type="text" 
                                placeholder="Tìm thể loại..."
                                value={catSearch}
                                onChange={(e) => setCatSearch(e.target.value)}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <button 
                                onClick={toggleAllCategories}
                                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase transition-colors"
                            >
                                {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).map(cat => {
                                const isChecked = filters.category?.split(',').includes(cat.slug);
                                return (
                                    <label key={cat._id} className="flex items-center gap-2 cursor-pointer group">
                                        <div 
                                            onClick={() => handleCategoryToggle(cat.slug)}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                                isChecked ? 'bg-blue-600 border-blue-600' : 'border-white/20 bg-white/5 group-hover:border-white/40'
                                            }`}
                                        >
                                            {isChecked && <Check size={12} className="text-white" />}
                                        </div>
                                        <span 
                                            onClick={() => handleCategoryToggle(cat.slug)}
                                            className={`text-xs transition-colors ${isChecked ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'}`}
                                        >
                                            {cat.name}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Status Section */}
            <div className="border-b border-white/5 pb-4">
                <button 
                    onClick={() => toggleSection('status')}
                    className="flex items-center justify-between w-full mb-3 text-white font-bold text-sm uppercase tracking-wider"
                >
                    <span>Tình trạng</span>
                    {expandedSections.status ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {expandedSections.status && (
                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => onChange('status', filters.status === opt.id ? '' : opt.id)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                                    filters.status === opt.id 
                                    ? 'bg-blue-600 border-blue-500 text-white' 
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'
                                }`}
                            >
                                {opt.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Sort Section */}
            <div className="border-b border-white/5 pb-4">
                <button 
                    onClick={() => toggleSection('sort')}
                    className="flex items-center justify-between w-full mb-3 text-white font-bold text-sm uppercase tracking-wider"
                >
                    <span>Sắp xếp</span>
                    {expandedSections.sort ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                {expandedSections.sort && (
                    <div className="grid grid-cols-1 gap-2">
                        {SORT_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => onChange('sort', opt.id)}
                                className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${
                                    filters.sort === opt.id 
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold' 
                                    : 'text-slate-400 hover:bg-white/5'
                                }`}
                            >
                                {opt.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Advanced Section */}
            <div>
                <button 
                    onClick={() => toggleSection('advanced')}
                    className="flex items-center justify-between w-full mb-4 group"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-white font-black text-sm uppercase tracking-[0.2em] group-hover:text-amber-400 transition-colors">Nâng cao</span>
                        {!expandedSections.advanced && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>}
                    </div>
                    {expandedSections.advanced ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                </button>
                
                {expandedSections.advanced && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Year Range */}
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest">Năm phát hành</p>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    placeholder="Từ" 
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500" 
                                    value={filters.yearFrom || ''}
                                    onChange={(e) => onChange('yearFrom', e.target.value)}
                                />
                                <span className="text-slate-600">-</span>
                                <input 
                                    type="number" 
                                    placeholder="Đến" 
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                                    value={filters.yearTo || ''}
                                    onChange={(e) => onChange('yearTo', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Minimum Rating */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Đánh giá tối thiểu</p>
                                <span className="text-amber-400 font-bold text-xs">{filters.ratingMin || 0}★</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" max="10" step="0.5"
                                value={filters.ratingMin || 0}
                                onChange={(e) => onChange('ratingMin', e.target.value)}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>

                        {/* Type Selection */}
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest">Kiểu truyện</p>
                            <div className="grid grid-cols-2 gap-2">
                                {TYPE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => onChange('type', filters.type === opt.id ? '' : opt.id)}
                                        className={`px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                                            filters.type === opt.id 
                                            ? 'bg-purple-600 border-purple-500 text-white' 
                                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/30'
                                        }`}
                                    >
                                        {opt.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Minimum Chapters */}
                        <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2 tracking-widest">Số chương tối thiểu</p>
                            <input 
                                type="number" 
                                placeholder="E.g. 50" 
                                className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                                value={filters.minChapters || ''}
                                onChange={(e) => onChange('minChapters', e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-col gap-2">
                <button 
                    onClick={onApply}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                    Áp dụng bộ lọc
                </button>
                <button 
                    onClick={onReset}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl font-bold text-xs uppercase tracking-widest border border-white/5 transition-all flex items-center justify-center gap-2"
                >
                    <RefreshCw size={14} /> Làm mới
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar (Left) */}
            <aside className="hidden lg:block w-72 shrink-0 h-fit sticky top-24 bg-slate-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm self-start">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-500">
                        <Filter size={18} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Bộ lọc truyện</h2>
                </div>
                <FilterContent />
            </aside>

            {/* Mobile Slide Panel */}
            <div className={`fixed inset-0 z-[100] lg:hidden transition-all duration-500 ${isOpen ? 'visible' : 'invisible'}`}>
                {/* Backdrop */}
                <div 
                    className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={onClose}
                />
                
                {/* Panel */}
                <div className={`absolute top-0 left-0 w-[85%] max-w-sm h-full bg-[#0b0b0f] shadow-2xl transition-transform duration-500 ease-out p-6 overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Filter size={20} className="text-blue-500" />
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Bộ lọc</h2>
                        </div>
                        <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    <FilterContent />
                </div>
            </div>
        </>
    );
};
