import React from 'react';
import { Link } from 'react-router-dom';
import { COMIC_IMG_CDN } from '../services/entertainmentApi';
import { ophimService } from '../services/ophimApi';

export const ComicCard = ({ comic }) => {
    return (
        <Link 
            to={`/entertainment/comics/${comic.slug}`}
            className="group flex flex-col bg-slate-800/50 rounded-2xl overflow-hidden border border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20"
        >
            <div className="relative aspect-[3/4] overflow-hidden">
                <img 
                    src={`${COMIC_IMG_CDN}/${comic.thumb_url}`} 
                    alt={comic.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                
                <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-primary/80 backdrop-blur-md text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">
                        {comic.status === 'ongoing' ? 'Đang ra' : 'Hoàn thành'}
                    </span>
                </div>
            </div>
            
            <div className="p-4 flex flex-col flex-1">
                <h3 className="text-white font-bold group-hover:text-primary transition-colors line-clamp-2 min-h-[3rem]">
                    {comic.name}
                </h3>
                
                <div className="mt-auto pt-3 flex flex-wrap gap-1">
                    {comic.category?.slice(0, 2).map(cat => (
                        <span key={cat.id} className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
                            {cat.name}
                        </span>
                    ))}
                </div>
            </div>
        </Link>
    );
};

export const MovieCard = ({ movie }) => {
    // Generate optimized image URL
    const getOptimizedImg = (url) => {
        return ophimService.getMovieImageUrl(url);
    };

    return (
        <Link 
            to={`/entertainment/movies/${movie.slug}`}
            className="group flex flex-col bg-slate-800/50 rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20"
        >
            <div className="relative aspect-[2/3] overflow-hidden">
                <img 
                    src={getOptimizedImg(movie.poster_url || movie.thumb_url)} 
                    alt={movie.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                
                <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-blue-600/80 backdrop-blur-md text-white text-[10px] font-bold rounded-lg uppercase tracking-wider">
                        {movie.year || movie.lang || 'HD'}
                    </span>
                </div>
            </div>
            
            <div className="p-4 flex flex-col flex-1">
                <h3 className="text-white font-bold group-hover:text-blue-400 transition-colors line-clamp-2 min-h-[3rem]">
                    {movie.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">{movie.origin_name}</p>
            </div>
        </Link>
    );
};
