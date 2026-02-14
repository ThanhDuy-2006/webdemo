import React from 'react';

export function Skeleton({ className, count = 1 }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div 
                    key={i} 
                    className={`bg-slate-800 animate-pulse rounded ${className}`}
                />
            ))}
        </>
    );
}

export function HouseSkeleton() {
    return (
        <div className="container mx-auto p-4 space-y-6">
            <Skeleton className="h-[250px] w-full rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <Skeleton className="h-10 w-2/3" />
                    <Skeleton className="h-4 w-full" count={3} />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-40 w-full rounded-xl" />
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <Skeleton className="aspect-[3/4] rounded-xl" count={10} />
            </div>
        </div>
    );
}
