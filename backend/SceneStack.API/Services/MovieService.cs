using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;

namespace SceneStack.API.Services;

public class MovieService : IMovieService
{
    private readonly ApplicationDbContext _context;
    private readonly ITmdbService _tmdbService;
    private readonly ILogger<MovieService> _logger;

    public MovieService(ApplicationDbContext context, ITmdbService tmdbService, ILogger<MovieService> logger)
    {
        _context = context;
        _tmdbService = tmdbService;
        _logger = logger;
    }

    public async Task<Movie?> GetByIdAsync(int id)
    {
        return await _context.Movies.FirstOrDefaultAsync(m => m.Id == id);
    }

    public async Task<IEnumerable<Movie>> GetAllAsync()
    {
        return await _context.Movies.ToListAsync();
    }

    public async Task<Movie> CreateAsync(Movie movie)
    {
        movie.CreatedAt = DateTime.UtcNow;
        _context.Movies.Add(movie);
        await _context.SaveChangesAsync();
        return movie;
    }

    public async Task<Movie?> UpdateAsync(int id, Movie movie)
    {
        var existingMovie = await _context.Movies.FindAsync(id);
        if (existingMovie == null)
            return null;

        existingMovie.Title = movie.Title;
        existingMovie.Year = movie.Year;
        existingMovie.PosterPath = movie.PosterPath;
        existingMovie.Synopsis = movie.Synopsis;
        existingMovie.AiSynopsis = movie.AiSynopsis;

        await _context.SaveChangesAsync();
        return existingMovie;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var movie = await _context.Movies
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);

        if (movie == null)
            return false;

        movie.IsDeleted = true;
        movie.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<Movie?> GetByTmdbIdAsync(int tmdbId)
    {
        return await _context.Movies
            .FirstOrDefaultAsync(m => m.TmdbId == tmdbId);
    }

    public async Task<Movie?> GetOrCreateFromTmdbAsync(int tmdbId)
    {
        _logger.LogInformation("Getting or creating movie from TMDb with ID: {TmdbId}", tmdbId);

        // Check if movie exists (including soft-deleted ones)
        var existingMovie = await _context.Movies
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(m => m.TmdbId == tmdbId);

        if (existingMovie != null)
        {
            if (existingMovie.IsDeleted)
            {
                _logger.LogInformation("Restoring soft-deleted movie with ID: {MovieId}", existingMovie.Id);
                existingMovie.IsDeleted = false;
                existingMovie.DeletedAt = null;
                await _context.SaveChangesAsync();
            }

            // If the movie is missing enriched metadata (created before Phase 6), re-fetch from TMDb
            bool needsEnrichment = existingMovie.Genres.Count == 0
                && existingMovie.Cast.Count == 0
                && existingMovie.Runtime == null
                || existingMovie.WriterName == null
                || existingMovie.DirectorProfilePath == null;

            if (!needsEnrichment)
            {
                _logger.LogInformation("Movie already exists in database with ID: {MovieId}", existingMovie.Id);
                return existingMovie;
            }

            _logger.LogInformation("Re-enriching movie {MovieId} from TMDb (missing metadata)", existingMovie.Id);

            var enrichDetailTask = _tmdbService.GetMovieDetailsAsync(tmdbId);
            var enrichCreditsTask = _tmdbService.GetMovieCreditsAsync(tmdbId);
            await Task.WhenAll(enrichDetailTask, enrichCreditsTask);

            var enrichedDetail = await enrichDetailTask;
            var enrichedCredits = await enrichCreditsTask;

            if (enrichedDetail != null)
            {
                existingMovie.BackdropPath = enrichedDetail.BackdropPath;
                existingMovie.Tagline = enrichedDetail.Tagline;
                existingMovie.Runtime = enrichedDetail.Runtime;
                existingMovie.Genres = enrichedDetail.Genres.Select(g => g.Name).ToList();
                existingMovie.TmdbRating = enrichedDetail.VoteAverage > 0 ? enrichedDetail.VoteAverage : null;
                existingMovie.TmdbVoteCount = enrichedDetail.VoteCount > 0 ? enrichedDetail.VoteCount : null;

                // Extract director name and profile path
                var enrichDirectorCrew = enrichedCredits?.Crew.FirstOrDefault(c => c.Job == "Director");
                existingMovie.DirectorName = enrichDirectorCrew?.Name;
                existingMovie.DirectorProfilePath = enrichDirectorCrew?.ProfilePath;

                // Extract all writers (Screenplay, Writer, Story)
                var enrichWriterCrew = enrichedCredits?.Crew
                    .Where(c => c.Job == "Screenplay" || c.Job == "Writer" || c.Job == "Story")
                    .ToList();
                var enrichWriters = enrichWriterCrew?.Select(c => c.Name).Distinct().ToList();
                existingMovie.WriterName = enrichWriters != null && enrichWriters.Any() ? string.Join(", ", enrichWriters) : null;
                existingMovie.WriterProfilePath = enrichWriterCrew?.FirstOrDefault()?.ProfilePath;
                existingMovie.Cast = enrichedCredits?.Cast
                    .OrderBy(c => c.Order)
                    .Take(10)
                    .Select(c => new CastMember { Name = c.Name, Character = c.Character, ProfilePath = c.ProfilePath })
                    .ToList() ?? new List<CastMember>();

                await _context.SaveChangesAsync();
            }

            return existingMovie;
        }

        // Fetch detail + credits in parallel
        var detailTask = _tmdbService.GetMovieDetailsAsync(tmdbId);
        var creditsTask = _tmdbService.GetMovieCreditsAsync(tmdbId);
        await Task.WhenAll(detailTask, creditsTask);

        var tmdbMovie = await detailTask;
        if (tmdbMovie == null)
        {
            _logger.LogError("Movie with TMDb ID {TmdbId} not found in TMDb", tmdbId);
            return null;
        }

        var credits = await creditsTask;

        // Extract director name and profile path
        var directorCrew = credits?.Crew.FirstOrDefault(c => c.Job == "Director");
        var director = directorCrew?.Name;
        var directorProfilePath = directorCrew?.ProfilePath;

        // Extract all writers (Screenplay, Writer, Story) and combine them
        var writerCrewList = credits?.Crew
            .Where(c => c.Job == "Screenplay" || c.Job == "Writer" || c.Job == "Story")
            .ToList();
        var writers = writerCrewList?.Select(c => c.Name).Distinct().ToList();
        var writer = writers != null && writers.Any() ? string.Join(", ", writers) : null;
        var writerProfilePath = writerCrewList?.FirstOrDefault()?.ProfilePath;

        // Extract top 10 billed cast
        var cast = credits?.Cast
            .OrderBy(c => c.Order)
            .Take(10)
            .Select(c => new CastMember
            {
                Name = c.Name,
                Character = c.Character,
                ProfilePath = c.ProfilePath
            })
            .ToList() ?? new List<CastMember>();

        var movie = new Movie
        {
            TmdbId = tmdbMovie.Id,
            Title = tmdbMovie.Title,
            Year = !string.IsNullOrEmpty(tmdbMovie.ReleaseDate) && DateTime.TryParse(tmdbMovie.ReleaseDate, out var releaseDate)
                ? releaseDate.Year
                : null,
            PosterPath = tmdbMovie.PosterPath,
            BackdropPath = tmdbMovie.BackdropPath,
            Synopsis = tmdbMovie.Overview,
            Tagline = tmdbMovie.Tagline,
            Runtime = tmdbMovie.Runtime,
            Genres = tmdbMovie.Genres.Select(g => g.Name).ToList(),
            TmdbRating = tmdbMovie.VoteAverage > 0 ? tmdbMovie.VoteAverage : null,
            TmdbVoteCount = tmdbMovie.VoteCount > 0 ? tmdbMovie.VoteCount : null,
            DirectorName = director,
            DirectorProfilePath = directorProfilePath,
            WriterName = writer,
            WriterProfilePath = writerProfilePath,
            Cast = cast,
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            var createdMovie = await CreateAsync(movie);
            _logger.LogInformation("Successfully created enriched movie in database with ID: {MovieId}", createdMovie.Id);
            return createdMovie;
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("unique", StringComparison.OrdinalIgnoreCase) == true ||
                                            ex.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true)
        {
            // Race condition: another request created this movie concurrently
            _logger.LogWarning("Race condition detected for TMDb ID {TmdbId}, fetching existing movie", tmdbId);

            // Fetch the movie that was created by the other request
            var concurrentlyCreatedMovie = await _context.Movies
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(m => m.TmdbId == tmdbId);

            if (concurrentlyCreatedMovie != null && concurrentlyCreatedMovie.IsDeleted)
            {
                concurrentlyCreatedMovie.IsDeleted = false;
                concurrentlyCreatedMovie.DeletedAt = null;
                await _context.SaveChangesAsync();
            }

            return concurrentlyCreatedMovie;
        }
    }

    public async Task<MovieUserStatus> GetMyStatusAsync(int userId, int tmdbId)
    {
        var movie = await _context.Movies
            .FirstOrDefaultAsync(m => m.TmdbId == tmdbId);

        if (movie == null)
            return new MovieUserStatus();

        var watches = await _context.Watches
            .Where(w => w.UserId == userId && w.MovieId == movie.Id)
            .OrderByDescending(w => w.WatchedDate)
            .ToListAsync();

        var watchlistItem = await _context.WatchlistItems
            .FirstOrDefaultAsync(wi => wi.UserId == userId && wi.MovieId == movie.Id);

        return new MovieUserStatus
        {
            LocalMovieId = movie.Id,
            WatchCount = watches.Count,
            LatestRating = watches.FirstOrDefault()?.Rating,
            OnWatchlist = watchlistItem != null,
            WatchlistItemId = watchlistItem?.Id
        };
    }
}
