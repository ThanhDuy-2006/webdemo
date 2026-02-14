import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders } from 'lucide-react';

export const AdvancedFilter = ({ filters = {}, onChange, onApply, onReset }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="w-full bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden mt-4">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Sliders size={16} />
                    <span>Bộ lọc nâng cao {Object.keys(filters).length > 0 ? `(${Object.keys(filters).length})` : ''}</span>
                </div>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isOpen && (
                <div className="p-4 border-t border-white/5 space-y-6 animate-fade-in">
                    
                    {/* Status & Quality */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={filters.status === 'completed'}
                                onChange={(e) => onChange('status', e.target.checked ? 'completed' : '')}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-offset-0 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">Đã hoàn thành</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={filters.isHD}
                                onChange={(e) => onChange('isHD', e.target.checked)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-offset-0 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">Chất lượng HD</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={filters.subType === 'thuyetminh'}
                                onChange={(e) => onChange('subType', e.target.checked ? 'thuyetminh' : '')}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-offset-0 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-300">Thuyết minh</span>
                        </label>
                    </div>

                    {/* Rating Range */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs uppercase text-slate-500 font-bold">Rating tối thiểu</label>
                            <span className="text-sm font-bold text-yellow-400">{filters.minRating || 0} ★</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="10" 
                            step="0.5"
                            value={filters.minRating || 0}
                            onChange={(e) => onChange('minRating', Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                            <span>0</span>
                            <span>5</span>
                            <span>10</span>
                        </div>
                    </div>

                    {/* Year Range */}
                    <div>
                         <label className="text-xs uppercase text-slate-500 font-bold mb-2 block">Khoảng năm phát hành</label>
                         <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                placeholder="Từ năm" 
                                min="1900" 
                                max="2099"
                                value={filters.yearFrom || ''}
                                onChange={(e) => onChange('yearFrom', e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white text-sm rounded px-3 py-2 w-full outline-none focus:border-blue-500/50"
                            />
                            <span className="text-slate-500">-</span>
                            <input 
                                type="number" 
                                placeholder="Đến năm" 
                                min="1900" 
                                max="2099"
                                value={filters.yearTo || ''}
                                onChange={(e) => onChange('yearTo', e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-white text-sm rounded px-3 py-2 w-full outline-none focus:border-blue-500/50"
                            />
                         </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button 
                            onClick={onReset}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Đặt lại
                        </button>
                        <button 
                            onClick={onApply}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                        >
                            Áp dụng bộ lọc
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
