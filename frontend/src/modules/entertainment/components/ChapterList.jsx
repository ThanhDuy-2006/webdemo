import React from 'react';
import { Link } from 'react-router-dom';

export const ChapterList = ({ chapters, comicSlug }) => {
    if (!chapters || chapters.length === 0) return <div className="text-slate-500 italic p-10 text-center">Không có chương nào.</div>;

    // The API structure for chapters is usually data.item.chapters[0].server_data
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {chapters.map((chap) => (
                <Link
                    key={chap.chapter_name}
                    to={`/entertainment/comics/${comicSlug}/chapter/${chap.chapter_name}`}
                    state={{ chapterApi: chap.chapter_api_data }}
                    className="p-3 bg-slate-800/50 border border-white/5 rounded-xl text-center text-sm text-slate-300 hover:bg-primary/20 hover:border-primary/50 hover:text-white transition-all group"
                >
                    Chương {chap.chapter_name}
                    <div className="text-[10px] text-slate-500 group-hover:text-primary transition-colors mt-1">
                        {chap.chapter_title || 'Mới'}
                    </div>
                </Link>
            ))}
        </div>
    );
};
