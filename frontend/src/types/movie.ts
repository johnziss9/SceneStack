// Matches MovieBasicInfo from backend
export interface Movie {
    id: number;
    tmdbId: number;
    title: string;
    year?: number;
    posterPath?: string | null;
    synopsis?: string | null;
    aiSynopsis?: string | null;
    isPrivate?: boolean;
    groupIds?: number[];
}

// Enriched movie detail — matches MovieDetailResponse from backend
export interface CastMember {
    name: string;
    character: string;
    profilePath?: string | null;
}

export interface DirectorMember {
    name: string;
    profilePath?: string | null;
}

export interface WriterMember {
    name: string;
    job: string;
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
    directorProfilePath?: string | null;
    directors: DirectorMember[];
    writerName?: string | null;
    writerProfilePath?: string | null;
    writers: WriterMember[];
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

// Person search types
export interface TmdbPerson {
    id: number;
    name: string;
    known_for_department?: string;
    profile_path?: string | null;
    popularity: number;
    known_for: TmdbKnownForMovie[];
}

export interface TmdbKnownForMovie {
    id: number;
    title?: string;
    media_type: string;
}

export interface TmdbPersonSearchResponse {
    page: number;
    results: TmdbPerson[];
    total_pages: number;
    total_results: number;
}

export interface TmdbPersonCastCredit {
    id: number;
    title: string;
    character?: string;
    release_date?: string;
    poster_path?: string | null;
    vote_average: number;
    vote_count: number;
    popularity: number;
}

export interface TmdbPersonCrewCredit {
    id: number;
    title: string;
    job: string;
    department: string;
    release_date?: string;
    poster_path?: string | null;
    vote_average: number;
    vote_count: number;
    popularity: number;
}

export interface TmdbPersonMovieCredits {
    cast: TmdbPersonCastCredit[];
    crew: TmdbPersonCrewCredit[];
}