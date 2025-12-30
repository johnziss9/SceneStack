using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class WatchService : IWatchService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<WatchService> _logger;

    public WatchService(ApplicationDbContext context, ILogger<WatchService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Watch?> GetByIdAsync(int id)
    {
        return await _context.Watches
            .Include(w => w.Movie)
            .Include(w => w.User)
            .FirstOrDefaultAsync(w => w.Id == id);
    }

    public async Task<IEnumerable<Watch>> GetAllAsync(int? userId = null)
    {
        var query = _context.Watches
            .Include(w => w.Movie)
            .Include(w => w.User)
            .AsQueryable();

        if (userId.HasValue)
        {
            query = query.Where(w => w.UserId == userId.Value);
        }

        return await query
            .OrderByDescending(w => w.WatchedDate)
            .ToListAsync();
    }

    public async Task<List<GroupedWatchesResponse>> GetGroupedWatchesAsync(int userId)
    {
        var watches = await _context.Watches
            .Include(w => w.Movie)
            .Include(w => w.User)
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.WatchedDate)
            .ToListAsync();

        var grouped = watches
            .GroupBy(w => w.MovieId)
            .Select(g => new GroupedWatchesResponse
            {
                MovieId = g.Key,
                Movie = new MovieBasicInfo
                {
                    Id = g.First().Movie.Id,
                    TmdbId = g.First().Movie.TmdbId,
                    Title = g.First().Movie.Title,
                    Year = g.First().Movie.Year,
                    PosterPath = g.First().Movie.PosterPath,
                    Synopsis = g.First().Movie.Synopsis,
                    AiSynopsis = g.First().Movie.AiSynopsis
                },
                WatchCount = g.Count(),
                AverageRating = g.Any(w => w.Rating.HasValue)
                    ? Math.Round(g.Where(w => w.Rating.HasValue).Average(w => w.Rating!.Value), 1)
                    : null,
                LatestRating = g.OrderByDescending(w => w.WatchedDate).FirstOrDefault()?.Rating,
                Watches = g.Select(w => new WatchEntryResponse
                {
                    Id = w.Id,
                    WatchedDate = w.WatchedDate,
                    Rating = w.Rating,
                    Notes = w.Notes,
                    WatchLocation = w.WatchLocation,
                    WatchedWith = w.WatchedWith,
                    IsRewatch = w.IsRewatch
                }).OrderByDescending(w => w.WatchedDate).ToList()
            })
            .OrderByDescending(g => g.Watches.Max(w => w.WatchedDate))
            .ToList();

        return grouped;
    }

    public async Task<List<Watch>> GetByMovieIdAsync(int movieId, int userId)
    {
        return await _context.Watches
            .Include(w => w.Movie)
            .Include(w => w.User)
            .Where(w => w.MovieId == movieId && w.UserId == userId)
            .OrderByDescending(w => w.WatchedDate)
            .ToListAsync();
    }

    public async Task<Watch> CreateAsync(Watch watch)
    {
        watch.CreatedAt = DateTime.UtcNow;
        _context.Watches.Add(watch);
        await _context.SaveChangesAsync();

        // Reload with navigation properties
        return (await GetByIdAsync(watch.Id))!;
    }

    public async Task<Watch?> UpdateAsync(int id, Watch watch)
    {
        var existingWatch = await _context.Watches.FindAsync(id);
        if (existingWatch == null)
            return null;

        existingWatch.WatchedDate = watch.WatchedDate;
        existingWatch.Rating = watch.Rating;
        existingWatch.Notes = watch.Notes;
        existingWatch.WatchLocation = watch.WatchLocation;
        existingWatch.WatchedWith = watch.WatchedWith;
        existingWatch.IsRewatch = watch.IsRewatch;

        await _context.SaveChangesAsync();

        // Reload with navigation properties
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var watch = await _context.Watches
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(w => w.Id == id && !w.IsDeleted);

        if (watch == null)
            return false;

        watch.IsDeleted = true;
        watch.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }
}