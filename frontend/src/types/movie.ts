// Matches MovieBasicInfo from backend
export interface Movie {
    id: number;
    tmdbId: number;
    title: string;
    year?: number;
    posterPath?: string | null;
    synopsis?: string | null;
    aiSynopsis?: string | null;
}

// Enriched movie detail — matches MovieDetailResponse from backend
export interface CastMember {
    name: string;
    character: string;
    profilePath?: string | null;
}

export interface MovieDetail {
    id: number;
    tmdbId: number;
    title: string;
    year?: number | null;
    posterPath?: string | null;
    backdropPath?: string | null;
    synopsis?: string | null;
    aiSynopsis?: string | null;
    tagline?: string | null;
    runtime?: number | null;
    genres: string[];
    tmdbRating?: number | null;
    tmdbVoteCount?: number | null;
    directorName?: string | null;
    cast: CastMember[];
}

// User's watch + watchlist context for a movie — matches MovieUserStatus from backend
export interface MovieUserStatus {
    localMovieId?: number | null;
    watchCount: number;
    latestRating?: number | null;
    onWatchlist: boolean;
    watchlistItemId?: number | null;
}

// TMDb search response types
export interface TmdbMovie {
    id: number;
    title: string;
    release_date?: string;
    poster_path?: string | null;
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