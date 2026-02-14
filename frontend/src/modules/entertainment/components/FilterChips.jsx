import React from 'react';
import { X } from 'lucide-react';

export const FilterChips = ({ filters = {}, onRemove }) => {
    if (!filters) return null;

    const items = [];
    if (filters.category) items.push({ key: 'category', label: `Thể loại: ${filters.category}` });
    if (filters.country) items.push({ key: 'country', label: `Quốc gia: ${filters.country}` });
    if (filters.year) items.push({ key: 'year', label: `Năm: ${filters.year}` });
    if (filters.yearFrom) items.push({ key: 'yearFrom', label: `Từ năm: ${filters.yearFrom}` });
    if (filters.yearTo) items.push({ key: 'yearTo', label: `Đến năm: ${filters.yearTo}` });
    if (filters.type) items.push({ key: 'type', label: `Kiểu: ${filters.type}` });
    if (filters.status) {
        const statusMap = { 'ongoing': 'Đang tiến hành', 'completed': 'Hoàn thành', 'upcoming': 'Sắp ra mắt' };
        items.push({ key: 'status', label: `Trạng thái: ${statusMap[filters.status] || filters.status}` });
    }
    if (filters.ratingMin) items.push({ key: 'ratingMin', label: `Đánh giá > ${filters.ratingMin}` });
    if (filters.minChapters) items.push({ key: 'minChapters', label: `Chương > ${filters.minChapters}` });
    if (filters.sort && filters.sort !== 'updated') items.push({ key: 'sort', label: `Sắp xếp: ${filters.sort}` });
    
    return (
        <div className="flex flex-wrap gap-2 mt-4">
            {items.map(item => (
                <div key={item.key} className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold animate-fade-in">
                    <span>{item.label}</span>
                    <button onClick={() => onRemove(item.key)} className="hover:text-white transition-colors">
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
};
