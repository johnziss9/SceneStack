using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;

namespace SceneStack.API.Services;

public class StatsService : IStatsService
{
    private readonly ApplicationDbContext _context;

    private static readonly string[] MonthNames =
    [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    public StatsService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserStatsResponse> GetUserStatsAsync(int userId)
    {
        var hasAny = await _context.Watches.AnyAsync(w => w.UserId == userId);
        if (!hasAny)
            return EmptyStats();

        // --- Totals (SQL COUNT / COUNT DISTINCT) ---
        var totalWatches = await _context.Watches
            .CountAsync(w => w.UserId == userId);

        var totalMovies = await _context.Watches
            .Where(w => w.UserId == userId)
            .Select(w => w.MovieId)
            .Distinct()
            .CountAsync();

        var totalRewatches = await _context.Watches
            .CountAsync(w => w.UserId == userId && w.IsRewatch);

        // --- Average rating (SQL AVG) ---
        var averageRatingRaw = await _context.Watches
            .Where(w => w.UserId == userId && w.Rating.HasValue)
            .AverageAsync(w => (double?)w.Rating!.Value);
        double? averageRating = averageRatingRaw.HasValue
            ? Math.Round(averageRatingRaw.Value, 1)
            : null;

        // --- Ratings distribution (SQL GROUP BY) ---
        var ratingCounts = await _context.Watches
            .Where(w => w.UserId == userId && w.Rating.HasValue)
            .GroupBy(w => w.Rating!.Value)
            .Select(g => new { Rating = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Rating, x => x.Count);

        var ratingsDistribution = Enumerable.Range(1, 10)
            .Select(r => new RatingDistributionItem
            {
                Rating = r,
                Count = ratingCounts.GetValueOrDefault(r, 0)
            })
            .ToList();

        // --- Watches by year (SQL GROUP BY year) ---
        var byYearRaw = await _context.Watches
            .Where(w => w.UserId == userId)
            .GroupBy(w => w.WatchedDate.Year)
            .Select(g => new { Year = g.Key, Count = g.Count() })
            .OrderBy(x => x.Year)
            .ToListAsync();

        var watchesByYear = byYearRaw
            .Select(x => new WatchesByYearItem { Year = x.Year, Count = x.Count })
            .ToList();

        // --- Watches by month (SQL GROUP BY month, current year) ---
        var currentYear = DateTime.UtcNow.Year;
        var byMonthRaw = await _context.Watches
            .Where(w => w.UserId == userId && w.WatchedDate.Year == currentYear)
            .GroupBy(w => w.WatchedDate.Month)
            .Select(g => new { Month = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Month, x => x.Count);

        var watchesByMonth = Enumerable.Range(1, 12)
            .Select(m => new WatchesByMonthItem
            {
                Month = m,
                MonthName = MonthNames[m - 1],
                Count = byMonthRaw.GetValueOrDefault(m, 0)
            })
            .ToList();

        // --- Watches by decade (SQL JOIN + GROUP BY, requires Movie.Year) ---
        var byDecadeRaw = await _context.Watches
            .Where(w => w.UserId == userId)
            .Join(_context.Movies, w => w.MovieId, m => m.Id, (w, m) => m.Year)
            .Where(year => year.HasValue)
            .GroupBy(year => (year!.Value / 10) * 10)
            .Select(g => new { Decade = g.Key, Count = g.Count() })
            .OrderBy(x => x.Decade)
            .ToListAsync();

        var watchesByDecade = byDecadeRaw
            .Select(x => new WatchesByDecadeItem { Decade = $"{x.Decade}s", Count = x.Count })
            .ToList();

        // --- Watches by location (SQL GROUP BY) ---
        var byLocationRaw = await _context.Watches
            .Where(w => w.UserId == userId)
            .GroupBy(w => w.WatchLocation == null || w.WatchLocation == "" ? "Unknown" : w.WatchLocation)
            .Select(g => new { Location = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        var watchesByLocation = byLocationRaw
            .Select(x => new WatchLocationItem { Location = x.Location, Count = x.Count })
            .ToList();

        // --- Top 5 most rewatched: get IDs + counts from SQL, then load movie info ---
        var topRewatchedRaw = await _context.Watches
            .Where(w => w.UserId == userId)
            .GroupBy(w => w.MovieId)
            .Where(g => g.Count() > 1)
            .OrderByDescending(g => g.Count())
            .Take(5)
            .Select(g => new { MovieId = g.Key, WatchCount = g.Count() })
            .ToListAsync();

        var topMovieIds = topRewatchedRaw.Select(x => x.MovieId).ToList();
        var topMovies = await _context.Movies
            .Where(m => topMovieIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);

        var topRewatched = topRewatchedRaw
            .Where(x => topMovies.ContainsKey(x.MovieId))
            .Select(x => new TopRewatchedMovie
            {
                WatchCount = x.WatchCount,
                Movie = new MovieBasicInfo
                {
                    Id = topMovies[x.MovieId].Id,
                    TmdbId = topMovies[x.MovieId].TmdbId,
                    Title = topMovies[x.MovieId].Title,
                    Year = topMovies[x.MovieId].Year,
                    PosterPath = topMovies[x.MovieId].PosterPath,
                    Synopsis = topMovies[x.MovieId].Synopsis,
                    AiSynopsis = topMovies[x.MovieId].AiSynopsis
                }
            })
            .ToList();

        return new UserStatsResponse
        {
            TotalMovies = totalMovies,
            TotalWatches = totalWatches,
            AverageRating = averageRating,
            TotalRewatches = totalRewatches,
            RatingsDistribution = ratingsDistribution,
            WatchesByYear = watchesByYear,
            WatchesByMonth = watchesByMonth,
            WatchesByDecade = watchesByDecade,
            WatchesByLocation = watchesByLocation,
            TopRewatched = topRewatched
        };
    }

    private static UserStatsResponse EmptyStats() => new()
    {
        TotalMovies = 0,
        TotalWatches = 0,
        AverageRating = null,
        TotalRewatches = 0,
        RatingsDistribution = Enumerable.Range(1, 10)
            .Select(r => new RatingDistributionItem { Rating = r, Count = 0 })
            .ToList(),
        WatchesByYear = new List<WatchesByYearItem>(),
        WatchesByMonth = Enumerable.Range(1, 12)
            .Select(m => new WatchesByMonthItem
            {
                Month = m,
                MonthName = MonthNames[m - 1],
                Count = 0
            })
            .ToList(),
        WatchesByDecade = new List<WatchesByDecadeItem>(),
        WatchesByLocation = new List<WatchLocationItem>(),
        TopRewatched = new List<TopRewatchedMovie>()
    };
}
