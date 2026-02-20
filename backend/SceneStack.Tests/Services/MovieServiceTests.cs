using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;

namespace SceneStack.Tests.Services;

public class MovieServiceTests
{
    [Fact]
    public async Task GetByIdAsync_ExistingMovie_ReturnsMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Act
        var result = await service.GetByIdAsync(1);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Fight Club");
        result.TmdbId.Should().Be(550);
    }

    [Fact]
    public async Task GetByIdAsync_NonExistentMovie_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Act
        var result = await service.GetByIdAsync(999);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_SoftDeletedMovie_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Soft delete the test movie
        var movie = await context.Movies.FindAsync(1);
        movie!.IsDeleted = true;
        movie.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetByIdAsync(1);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllAsync_ReturnsOnlyNonDeletedMovies()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Add another movie and soft delete it
        var deletedMovie = new Movie
        {
            Id = 2,
            TmdbId = 551,
            Title = "Deleted Movie",
            Year = 2000,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = true,
            DeletedAt = DateTime.UtcNow
        };
        context.Movies.Add(deletedMovie);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetAllAsync();

        // Assert
        result.Should().HaveCount(1);
        result.First().Title.Should().Be("Fight Club");
    }

    [Fact]
    public async Task CreateAsync_ValidMovie_CreatesMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        var newMovie = new Movie
        {
            TmdbId = 552,
            Title = "New Movie",
            Year = 2024,
            Synopsis = "Test synopsis",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await service.CreateAsync(newMovie);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().BeGreaterThan(0);
        result.Title.Should().Be("New Movie");

        // Verify it's in the database
        var movieInDb = await context.Movies.FindAsync(result.Id);
        movieInDb.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateAsync_ExistingMovie_UpdatesMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);
        
        var updatedMovie = new Movie
        {
            Title = "Fight Club - Updated",
            Year = 1999,
            Synopsis = "Updated synopsis",
            PosterPath = "/poster.jpg"
        };
        
        // Act
        var result = await service.UpdateAsync(1, updatedMovie);

        // Assert
        result.Should().NotBeNull();
        result!.Synopsis.Should().Be("Updated synopsis");

        // Verify in database
        var movieInDb = await context.Movies.FindAsync(1);
        movieInDb!.Synopsis.Should().Be("Updated synopsis");
    }

    [Fact]
    public async Task DeleteAsync_ExistingMovie_SoftDeletesMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Act
        var result = await service.DeleteAsync(1);

        // Assert
        result.Should().BeTrue();

        // Verify soft delete
        var movie = await context.Movies.IgnoreQueryFilters().FirstOrDefaultAsync(m => m.Id == 1);
        movie.Should().NotBeNull();
        movie!.IsDeleted.Should().BeTrue();
        movie.DeletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task GetByTmdbIdAsync_ExistingMovie_ReturnsMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Act
        var result = await service.GetByTmdbIdAsync(550);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Fight Club");
    }

    [Fact]
    public async Task GetByTmdbIdAsync_NonExistentTmdbId_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Act
        var result = await service.GetByTmdbIdAsync(999);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_ExistingMovie_ReturnsExistingMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);
        
        // Act
        var result = await service.GetOrCreateFromTmdbAsync(550);
        
        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(1);
        result.Title.Should().Be("Fight Club");
        
        // Verify TMDb API was NOT called (movie already exists)
        await tmdbService.DidNotReceive().GetMovieDetailsAsync(Arg.Any<int>());
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_SoftDeletedMovie_RestoresMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);
        
        // Soft delete the test movie
        var movie = await context.Movies.IgnoreQueryFilters().FirstAsync(m => m.Id == 1);
        movie.IsDeleted = true;
        movie.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        
        // Act
        var result = await service.GetOrCreateFromTmdbAsync(550);
        
        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(1);
        result.IsDeleted.Should().BeFalse();
        result.DeletedAt.Should().BeNull();
        
        // Verify TMDb API was NOT called (movie was restored)
        await tmdbService.DidNotReceive().GetMovieDetailsAsync(Arg.Any<int>());
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_NewMovie_FetchesFromTmdbAndCreates()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);
        
        // Mock TMDb API response
        var tmdbMovie = new TmdbMovie
        {
            Id = 551,
            Title = "The Matrix",
            ReleaseDate = "1999-03-31",
            PosterPath = "/matrix.jpg",
            Overview = "A computer hacker learns about the true nature of reality."
        };
        tmdbService.GetMovieDetailsAsync(551).Returns(tmdbMovie);
        
        // Act
        var result = await service.GetOrCreateFromTmdbAsync(551);
        
        // Assert
        result.Should().NotBeNull();
        result.TmdbId.Should().Be(551);
        result.Title.Should().Be("The Matrix");
        result.Year.Should().Be(1999);
        result.PosterPath.Should().Be("/matrix.jpg");
        result.Synopsis.Should().Be("A computer hacker learns about the true nature of reality.");
        
        // Verify TMDb API WAS called
        await tmdbService.Received(1).GetMovieDetailsAsync(551);
        
        // Verify it's in the database
        var movieInDb = await context.Movies.FirstOrDefaultAsync(m => m.TmdbId == 551);
        movieInDb.Should().NotBeNull();
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_TmdbApiFails_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Mock TMDb API to return null (movie not found or API error)
        tmdbService.GetMovieDetailsAsync(999).Returns((TmdbMovie?)null);

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(999);

        // Assert
        result.Should().BeNull();

        // Verify TMDb API WAS called
        await tmdbService.Received(1).GetMovieDetailsAsync(999);
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_NewMovie_CreatesEnrichedMovieWithAllMetadata()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        var tmdbMovie = new TmdbMovie
        {
            Id = 551,
            Title = "The Matrix",
            ReleaseDate = "1999-03-31",
            PosterPath = "/matrix.jpg",
            BackdropPath = "/matrix_backdrop.jpg",
            Overview = "A computer hacker learns about the true nature of reality.",
            Tagline = "The future is now",
            Runtime = 136,
            VoteAverage = 8.7,
            VoteCount = 15000,
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 28, Name = "Action" },
                new TmdbGenre { Id = 878, Name = "Science Fiction" }
            }
        };

        var tmdbCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>
            {
                new TmdbCastMember { Name = "Keanu Reeves", Character = "Neo", ProfilePath = "/keanu.jpg", Order = 0 },
                new TmdbCastMember { Name = "Laurence Fishburne", Character = "Morpheus", ProfilePath = "/fishburne.jpg", Order = 1 },
                new TmdbCastMember { Name = "Carrie-Anne Moss", Character = "Trinity", Order = 2 }
            },
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Lana Wachowski", Job = "Director" },
                new TmdbCrewMember { Name = "John Smith", Job = "Producer" }
            }
        };

        tmdbService.GetMovieDetailsAsync(551).Returns(tmdbMovie);
        tmdbService.GetMovieCreditsAsync(551).Returns(tmdbCredits);

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(551);

        // Assert
        result.Should().NotBeNull();
        result!.TmdbId.Should().Be(551);
        result.Title.Should().Be("The Matrix");
        result.Year.Should().Be(1999);
        result.PosterPath.Should().Be("/matrix.jpg");
        result.BackdropPath.Should().Be("/matrix_backdrop.jpg");
        result.Synopsis.Should().Be("A computer hacker learns about the true nature of reality.");
        result.Tagline.Should().Be("The future is now");
        result.Runtime.Should().Be(136);
        result.TmdbRating.Should().Be(8.7);
        result.TmdbVoteCount.Should().Be(15000);
        result.Genres.Should().HaveCount(2);
        result.Genres.Should().Contain("Action");
        result.Genres.Should().Contain("Science Fiction");
        result.DirectorName.Should().Be("Lana Wachowski");
        result.Cast.Should().HaveCount(3);
        result.Cast[0].Name.Should().Be("Keanu Reeves");
        result.Cast[0].Character.Should().Be("Neo");
        result.Cast[0].ProfilePath.Should().Be("/keanu.jpg");

        await tmdbService.Received(1).GetMovieDetailsAsync(551);
        await tmdbService.Received(1).GetMovieCreditsAsync(551);
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_NewMovie_HandlesEmptyGenresAndCast()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        var tmdbMovie = new TmdbMovie
        {
            Id = 552,
            Title = "Indie Film",
            ReleaseDate = "2020-01-01",
            PosterPath = "/indie.jpg",
            Overview = "A small indie film",
            Genres = new List<TmdbGenre>()
        };

        var tmdbCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>()
        };

        tmdbService.GetMovieDetailsAsync(552).Returns(tmdbMovie);
        tmdbService.GetMovieCreditsAsync(552).Returns(tmdbCredits);

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(552);

        // Assert
        result.Should().NotBeNull();
        result!.Genres.Should().BeEmpty();
        result.Cast.Should().BeEmpty();
        result.DirectorName.Should().BeNull();
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_NewMovie_TakesOnlyTop10Cast()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        var tmdbMovie = new TmdbMovie
        {
            Id = 553,
            Title = "Ensemble Film",
            ReleaseDate = "2020-01-01",
            Overview = "A film with many actors"
        };

        var tmdbCredits = new TmdbCreditsResult
        {
            Cast = Enumerable.Range(0, 20)
                .Select(i => new TmdbCastMember
                {
                    Name = $"Actor {i}",
                    Character = $"Character {i}",
                    Order = i
                })
                .ToList(),
            Crew = new List<TmdbCrewMember>()
        };

        tmdbService.GetMovieDetailsAsync(553).Returns(tmdbMovie);
        tmdbService.GetMovieCreditsAsync(553).Returns(tmdbCredits);

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(553);

        // Assert
        result.Should().NotBeNull();
        result!.Cast.Should().HaveCount(10);
        result.Cast.First().Name.Should().Be("Actor 0");
        result.Cast.Last().Name.Should().Be("Actor 9");
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_LegacyMovie_BackfillsEnrichment()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Create a legacy movie without enrichment
        var legacyMovie = new Movie
        {
            TmdbId = 554,
            Title = "Legacy Movie",
            Year = 2000,
            PosterPath = "/legacy.jpg",
            Synopsis = "Old movie without enrichment",
            Genres = new List<string>(), // Empty genres
            Cast = new List<CastMember>(), // Empty cast
            Runtime = null, // No runtime
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(legacyMovie);
        await context.SaveChangesAsync();

        var tmdbMovieEnriched = new TmdbMovie
        {
            Id = 554,
            Title = "Legacy Movie",
            ReleaseDate = "2000-01-01",
            BackdropPath = "/legacy_backdrop.jpg",
            Tagline = "From the archives",
            Runtime = 120,
            VoteAverage = 7.5,
            VoteCount = 5000,
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 18, Name = "Drama" }
            }
        };

        var tmdbCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>
            {
                new TmdbCastMember { Name = "Classic Actor", Character = "Lead", Order = 0 }
            },
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Legendary Director", Job = "Director" }
            }
        };

        tmdbService.GetMovieDetailsAsync(554).Returns(tmdbMovieEnriched);
        tmdbService.GetMovieCreditsAsync(554).Returns(tmdbCredits);

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(554);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(legacyMovie.Id); // Same movie, not a new one
        result.BackdropPath.Should().Be("/legacy_backdrop.jpg");
        result.Tagline.Should().Be("From the archives");
        result.Runtime.Should().Be(120);
        result.TmdbRating.Should().Be(7.5);
        result.TmdbVoteCount.Should().Be(5000);
        result.Genres.Should().HaveCount(1);
        result.Genres.Should().Contain("Drama");
        result.DirectorName.Should().Be("Legendary Director");
        result.Cast.Should().HaveCount(1);
        result.Cast[0].Name.Should().Be("Classic Actor");

        await tmdbService.Received(1).GetMovieDetailsAsync(554);
        await tmdbService.Received(1).GetMovieCreditsAsync(554);
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_EnrichedMovie_SkipsBackfill()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Create an already enriched movie
        var enrichedMovie = new Movie
        {
            TmdbId = 555,
            Title = "Enriched Movie",
            Year = 2021,
            PosterPath = "/enriched.jpg",
            Synopsis = "Already enriched",
            Genres = new List<string> { "Action" }, // Has genres
            Cast = new List<CastMember>
            {
                new CastMember { Name = "Actor", Character = "Role" }
            }, // Has cast
            Runtime = 100, // Has runtime
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(enrichedMovie);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(555);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(enrichedMovie.Id);
        result.Title.Should().Be("Enriched Movie");

        // Verify TMDb API was NOT called (no back-fill needed)
        await tmdbService.DidNotReceive().GetMovieDetailsAsync(Arg.Any<int>());
        await tmdbService.DidNotReceive().GetMovieCreditsAsync(Arg.Any<int>());
    }

    [Fact]
    public async Task GetMyStatusAsync_UserHasWatchedMovie_ReturnsStatusWithWatchInfo()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        var user = context.Users.First();

        // Create a new movie for this test to avoid conflicts with seeded data
        var movie = new Movie
        {
            TmdbId = 999,
            Title = "Test Movie",
            Year = 2020,
            Genres = new List<string> { "Drama" },
            Cast = new List<CastMember>(),
            Runtime = 120,
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        // Add watches
        var watch1 = new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-10),
            Rating = 8,
            CreatedAt = DateTime.UtcNow
        };
        var watch2 = new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.AddRange(watch1, watch2);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetMyStatusAsync(user.Id, movie.TmdbId);

        // Assert
        result.Should().NotBeNull();
        result.LocalMovieId.Should().Be(movie.Id);
        result.WatchCount.Should().Be(2);
        result.LatestRating.Should().Be(9); // Most recent watch
        result.OnWatchlist.Should().BeFalse();
        result.WatchlistItemId.Should().BeNull();
    }

    [Fact]
    public async Task GetMyStatusAsync_UserHasMovieOnWatchlist_ReturnsStatusWithWatchlistInfo()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        var user = context.Users.First();

        // Create a new movie for this test to avoid conflicts with seeded data
        var movie = new Movie
        {
            TmdbId = 998,
            Title = "Watchlist Test Movie",
            Year = 2021,
            Genres = new List<string> { "Action" },
            Cast = new List<CastMember>(),
            Runtime = 100,
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        var watchlistItem = new WatchlistItem
        {
            UserId = user.Id,
            MovieId = movie.Id,
            AddedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        context.WatchlistItems.Add(watchlistItem);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetMyStatusAsync(user.Id, movie.TmdbId);

        // Assert
        result.Should().NotBeNull();
        result.LocalMovieId.Should().Be(movie.Id);
        result.WatchCount.Should().Be(0);
        result.LatestRating.Should().BeNull();
        result.OnWatchlist.Should().BeTrue();
        result.WatchlistItemId.Should().Be(watchlistItem.Id);
    }

    [Fact]
    public async Task GetMyStatusAsync_MovieNotInDatabase_ReturnsEmptyStatus()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        var user = context.Users.First();

        // Act
        var result = await service.GetMyStatusAsync(user.Id, 999);

        // Assert
        result.Should().NotBeNull();
        result.LocalMovieId.Should().BeNull();
        result.WatchCount.Should().Be(0);
        result.LatestRating.Should().BeNull();
        result.OnWatchlist.Should().BeFalse();
        result.WatchlistItemId.Should().BeNull();
    }
}