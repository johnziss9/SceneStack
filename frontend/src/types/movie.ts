// Matches MovieBasicInfo from backend
export interface Movie {
    id: number;
    tmdbId: number;
    title: string;
    year?: number;
    posterPath?: string;
    synopsis?: string;
    aiSynopsis?: string;
}

// TMDb search response types
export interface TmdbMovie {
    id: number;
    title: string;
    release_date?: string;
    poster_path?: string;
    overview?: string;
    vote_average: number;
    vote_count: number;
}

export interface TmdbSearchResponse {
    page: number;
    results: TmdbMovie[];
    total_pages: number;
    total_results: number;
}