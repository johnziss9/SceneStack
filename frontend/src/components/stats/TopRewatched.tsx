'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import type { TopRewatchedMovie } from '@/types/stats';

interface TopRewatchedProps {
    data: TopRewatchedMovie[];
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';

export function TopRewatched({ data }: TopRewatchedProps) {
    if (!data.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Most Rewatched</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No rewatched films yet
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Most Rewatched</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {data.map((item, index) => (
                        <li key={item.movie.id}>
                            <Link
                                href={`/watched/${item.movie.id}`}
                                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            >
                                {/* Rank */}
                                <span className="text-sm font-bold text-muted-foreground w-5 shrink-0 text-right">
                                    {index + 1}
                                </span>

                                {/* Poster */}
                                <div className="w-9 h-14 rounded overflow-hidden bg-muted shrink-0">
                                    {item.movie.posterPath ? (
                                        <Image
                                            src={`${TMDB_IMAGE_BASE}${item.movie.posterPath}`}
                                            alt={item.movie.title}
                                            width={36}
                                            height={54}
                                            className="object-cover w-full h-full"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                            ?
                                        </div>
                                    )}
                                </div>

                                {/* Title + year */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm leading-tight truncate">
                                        {item.movie.title}
                                    </p>
                                    {item.movie.year && (
                                        <p className="text-xs text-muted-foreground">{item.movie.year}</p>
                                    )}
                                </div>

                                {/* Watch count */}
                                <span className="shrink-0 text-sm font-semibold text-primary bg-secondary px-2 py-0.5 rounded">
                                    ×{item.watchCount}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
