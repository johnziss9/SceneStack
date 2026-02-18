export interface RatingDistributionItem {
    rating: number;
    count: number;
}

export interface WatchesByYearItem {
    year: number;
    count: number;
}

export interface WatchesByMonthItem {
    month: number;
    monthName: string;
    count: number;
}

export interface WatchesByDecadeItem {
    decade: string;
    count: number;
}

export interface WatchLocationItem {
    location: string;
    count: number;
}

export interface TopRewatchedMovie {
    movie: {
        id: number;
        tmdbId: number;
        title: string;
        year: number | null;
        posterPath: string | null;
    };
    watchCount: number;
}

export interface UserStats {
    totalMovies: number;
    totalWatches: number;
    averageRating: number | null;
    totalRewatches: number;
    ratingsDistribution: RatingDistributionItem[];
    watchesByYear: WatchesByYearItem[];
    watchesByMonth: WatchesByMonthItem[];
    watchesByDecade: WatchesByDecadeItem[];
    watchesByLocation: WatchLocationItem[];
    topRewatched: TopRewatchedMovie[];
}
