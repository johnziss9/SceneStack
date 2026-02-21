import { Metadata } from 'next';
import { MovieDetailClient } from './MovieDetailClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

interface PageProps {
    params: Promise<{ tmdbId: string }>;
}

async function getMovieForMetadata(tmdbId: number) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/movies/tmdb/${tmdbId}`, {
            cache: 'no-store',
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { tmdbId: raw } = await params;
    const tmdbId = parseInt(raw, 10);

    if (isNaN(tmdbId)) {
        return {
            title: 'Movie Not Found | SceneStack',
        };
    }

    const movie = await getMovieForMetadata(tmdbId);

    if (!movie) {
        return {
            title: 'Movie Not Found | SceneStack',
        };
    }

    const title = `${movie.title}${movie.year ? ` (${movie.year})` : ''} | SceneStack`;
    const description =
        movie.synopsis ||
        movie.tagline ||
        `View details and watch history for ${movie.title} on SceneStack.`;

    const posterUrl = movie.posterPath
        ? `https://image.tmdb.org/t/p/w500${movie.posterPath}`
        : null;

    const backdropUrl = movie.backdropPath
        ? `https://image.tmdb.org/t/p/w1280${movie.backdropPath}`
        : null;

    const imageUrl = backdropUrl || posterUrl;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            ...(imageUrl && {
                images: [
                    {
                        url: imageUrl,
                        width: backdropUrl ? 1280 : 500,
                        height: backdropUrl ? 720 : 750,
                        alt: movie.title,
                    },
                ],
            }),
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            ...(imageUrl && { images: [imageUrl] }),
        },
    };
}

export default function MovieDetailPage({ params }: PageProps) {
    return <MovieDetailClient params={params} />;
}
