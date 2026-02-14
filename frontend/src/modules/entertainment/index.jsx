import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
);

// Pages
const EntertainmentHome = lazy(() => import('./pages/EntertainmentHome'));
const ComicsPage = lazy(() => import('./pages/ComicsPage'));
const ComicDetail = lazy(() => import('./pages/ComicDetail'));
const ChapterReader = lazy(() => import('./pages/ChapterReader'));
const FollowingComicsPage = lazy(() => import('./pages/FollowingComicsPage'));
const MoviesPage = lazy(() => import('./pages/MoviesPage'));
const MovieDetail = lazy(() => import('./pages/MovieDetail'));

export default function EntertainmentRoutes() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <Routes>
                <Route index element={<EntertainmentHome />} />
                <Route path="comics" element={<ComicsPage />} />
                <Route path="following" element={<FollowingComicsPage />} />
                <Route path="comics/:slug" element={<ComicDetail />} />
                <Route path="comics/:slug/chapter/:chapterNum" element={<ChapterReader />} />
                <Route path="movies" element={<MoviesPage />} />
                <Route path="movies/:slug" element={<MovieDetail />} />
            </Routes>
        </Suspense>
    );
}
