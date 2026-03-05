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
                new TmdbCastMember { Id = 6384, Name = "Keanu Reeves", Character = "Neo", ProfilePath = "/keanu.jpg", Order = 0 },
                new TmdbCastMember { Id = 2975, Name = "Laurence Fishburne", Character = "Morpheus", ProfilePath = "/fishburne.jpg", Order = 1 },
                new TmdbCastMember { Id = 530, Name = "Carrie-Anne Moss", Character = "Trinity", Order = 2 }
            },
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Id = 1269, Name = "Lana Wachowski", Job = "Director" },
                new TmdbCrewMember { Id = 9999, Name = "John Smith", Job = "Producer" }
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
        result.Cast[0].PersonId.Should().Be(6384);
        result.Cast[0].Name.Should().Be("Keanu Reeves");
        result.Cast[0].Character.Should().Be("Neo");
        result.Cast[0].ProfilePath.Should().Be("/keanu.jpg");
        result.Directors.Should().HaveCount(1);
        result.Directors[0].PersonId.Should().Be(1269);
        result.Directors[0].Name.Should().Be("Lana Wachowski");

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
                    Id = 1000 + i,
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
        result.Cast.First().PersonId.Should().Be(1000);
        result.Cast.First().Name.Should().Be("Actor 0");
        result.Cast.Last().PersonId.Should().Be(1009);
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
                new TmdbCastMember { Id = 5000, Name = "Classic Actor", Character = "Lead", Order = 0 }
            },
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Id = 5001, Name = "Legendary Director", Job = "Director" }
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
        result.Cast[0].PersonId.Should().Be(5000);
        result.Cast[0].Name.Should().Be("Classic Actor");
        result.Directors.Should().HaveCount(1);
        result.Directors[0].PersonId.Should().Be(5001);

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
                new CastMember { PersonId = 1000, Name = "Actor", Character = "Role", ProfilePath = "/actor.jpg" }
            }, // Has cast
            Runtime = 100, // Has runtime
            DirectorName = "Director Name", // Has director
            DirectorProfilePath = "/director.jpg", // Has director profile
            Directors = new List<DirectorMember>
            {
                new DirectorMember { PersonId = 1001, Name = "Director Name", ProfilePath = "/director.jpg" }
            }, // Has directors array
            WriterName = "Writer Name", // Has writer
            WriterProfilePath = "/writer.jpg", // Has writer profile
            Writers = new List<WriterMember>
            {
                new WriterMember { PersonId = 1002, Name = "Writer Name", Job = "Screenplay", ProfilePath = "/writer.jpg" }
            }, // Has writers array
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

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_MovieWithMissingPersonIds_TriggersReEnrichment()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Create a movie with cast/crew but missing PersonIds (legacy data)
        var legacyMovie = new Movie
        {
            TmdbId = 556,
            Title = "Legacy Movie Without PersonIds",
            Year = 2020,
            PosterPath = "/legacy.jpg",
            Synopsis = "Has cast/crew but no PersonIds",
            Genres = new List<string> { "Action" },
            Cast = new List<CastMember>
            {
                new CastMember { PersonId = 0, Name = "Actor Without Id", Character = "Hero", ProfilePath = "/actor.jpg" }
            },
            Directors = new List<DirectorMember>
            {
                new DirectorMember { PersonId = 0, Name = "Director Without Id", ProfilePath = "/director.jpg" }
            },
            Writers = new List<WriterMember>
            {
                new WriterMember { PersonId = 0, Name = "Writer Without Id", Job = "Screenplay", ProfilePath = "/writer.jpg" }
            },
            Runtime = 120,
            DirectorName = "Director Without Id",
            DirectorProfilePath = "/director.jpg",
            WriterName = "Writer Without Id",
            WriterProfilePath = "/writer.jpg",
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(legacyMovie);
        await context.SaveChangesAsync();

        var tmdbMovieEnriched = new TmdbMovie
        {
            Id = 556,
            Title = "Legacy Movie Without PersonIds",
            ReleaseDate = "2020-01-01",
            PosterPath = "/legacy.jpg",
            BackdropPath = "/legacy_backdrop.jpg",
            Overview = "Has cast/crew but no PersonIds",
            Tagline = "Now with PersonIds",
            Runtime = 120,
            VoteAverage = 7.0,
            VoteCount = 3000,
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 28, Name = "Action" }
            }
        };

        var tmdbCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>
            {
                new TmdbCastMember { Id = 6000, Name = "Actor Without Id", Character = "Hero", Order = 0, ProfilePath = "/actor.jpg" }
            },
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Id = 6001, Name = "Director Without Id", Job = "Director", ProfilePath = "/director.jpg" },
                new TmdbCrewMember { Id = 6002, Name = "Writer Without Id", Job = "Screenplay", ProfilePath = "/writer.jpg" }
            }
        };

        tmdbService.GetMovieDetailsAsync(556).Returns(tmdbMovieEnriched);
        tmdbService.GetMovieCreditsAsync(556).Returns(tmdbCredits);

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(556);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(legacyMovie.Id); // Same movie, not a new one

        // Verify PersonIds were backfilled
        result.Cast.Should().HaveCount(1);
        result.Cast[0].PersonId.Should().Be(6000);
        result.Cast[0].Name.Should().Be("Actor Without Id");

        result.Directors.Should().HaveCount(1);
        result.Directors[0].PersonId.Should().Be(6001);
        result.Directors[0].Name.Should().Be("Director Without Id");

        result.Writers.Should().HaveCount(1);
        result.Writers[0].PersonId.Should().Be(6002);
        result.Writers[0].Name.Should().Be("Writer Without Id");

        // Verify TMDb API WAS called to backfill PersonIds
        await tmdbService.Received(1).GetMovieDetailsAsync(556);
        await tmdbService.Received(1).GetMovieCreditsAsync(556);
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_MovieWithOnlyCastMissingPersonIds_TriggersReEnrichment()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Create a movie with only cast missing PersonIds
        var partialLegacyMovie = new Movie
        {
            TmdbId = 557,
            Title = "Movie With Missing Cast PersonIds Only",
            Year = 2021,
            PosterPath = "/partial.jpg",
            Synopsis = "Only cast missing PersonIds",
            Genres = new List<string> { "Drama" },
            Cast = new List<CastMember>
            {
                new CastMember { PersonId = 0, Name = "Actor A", Character = "Lead", ProfilePath = "/a.jpg" }
            },
            Directors = new List<DirectorMember>
            {
                new DirectorMember { PersonId = 5000, Name = "Director A", ProfilePath = "/dir.jpg" } // Has PersonId
            },
            Writers = new List<WriterMember>
            {
                new WriterMember { PersonId = 5001, Name = "Writer A", Job = "Screenplay", ProfilePath = "/writer.jpg" } // Has PersonId
            },
            Runtime = 100,
            DirectorName = "Director A",
            DirectorProfilePath = "/dir.jpg",
            WriterName = "Writer A",
            WriterProfilePath = "/writer.jpg",
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(partialLegacyMovie);
        await context.SaveChangesAsync();

        var tmdbMovieEnriched = new TmdbMovie
        {
            Id = 557,
            Title = "Movie With Missing Cast PersonIds Only",
            ReleaseDate = "2021-01-01",
            PosterPath = "/partial.jpg",
            Overview = "Only cast missing PersonIds",
            Runtime = 100,
            Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
        };

        var tmdbCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>
            {
                new TmdbCastMember { Id = 7000, Name = "Actor A", Character = "Lead", Order = 0, ProfilePath = "/a.jpg" }
            },
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Id = 5000, Name = "Director A", Job = "Director", ProfilePath = "/dir.jpg" },
                new TmdbCrewMember { Id = 5001, Name = "Writer A", Job = "Screenplay", ProfilePath = "/writer.jpg" }
            }
        };

        tmdbService.GetMovieDetailsAsync(557).Returns(tmdbMovieEnriched);
        tmdbService.GetMovieCreditsAsync(557).Returns(tmdbCredits);

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(557);

        // Assert
        result.Should().NotBeNull();
        result!.Cast[0].PersonId.Should().Be(7000); // Backfilled
        result.Directors[0].PersonId.Should().Be(5000); // Unchanged
        result.Writers[0].PersonId.Should().Be(5001); // Unchanged

        await tmdbService.Received(1).GetMovieDetailsAsync(557);
        await tmdbService.Received(1).GetMovieCreditsAsync(557);
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_NewMovie_IncludesMultipleDirectorsWithPersonIds()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        var tmdbMovie = new TmdbMovie
        {
            Id = 558,
            Title = "Multi-Director Film",
            ReleaseDate = "2022-01-01",
            PosterPath = "/multi.jpg",
            Overview = "Film with multiple directors",
            Runtime = 150
        };

        var tmdbCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Id = 8001, Name = "Director One", Job = "Director", ProfilePath = "/d1.jpg" },
                new TmdbCrewMember { Id = 8002, Name = "Director Two", Job = "Director", ProfilePath = "/d2.jpg" },
                new TmdbCrewMember { Id = 8003, Name = "Producer", Job = "Producer", ProfilePath = "/prod.jpg" }
            }
        };

        tmdbService.GetMovieDetailsAsync(558).Returns(tmdbMovie);
        tmdbService.GetMovieCreditsAsync(558).Returns(tmdbCredits);

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(558);

        // Assert
        result.Should().NotBeNull();
        result!.Directors.Should().HaveCount(2); // Only directors, not producers
        result.Directors[0].PersonId.Should().Be(8001);
        result.Directors[0].Name.Should().Be("Director One");
        result.Directors[1].PersonId.Should().Be(8002);
        result.Directors[1].Name.Should().Be("Director Two");
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_NewMovie_IncludesMultipleWritersWithPersonIds()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        var tmdbMovie = new TmdbMovie
        {
            Id = 559,
            Title = "Multi-Writer Film",
            ReleaseDate = "2022-06-01",
            PosterPath = "/writers.jpg",
            Overview = "Film with screenplay and story writers",
            Runtime = 120
        };

        var tmdbCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Id = 9001, Name = "Writer Alpha", Job = "Screenplay", ProfilePath = "/wa.jpg" },
                new TmdbCrewMember { Id = 9002, Name = "Writer Beta", Job = "Writer", ProfilePath = "/wb.jpg" },
                new TmdbCrewMember { Id = 9003, Name = "Writer Gamma", Job = "Story", ProfilePath = "/wg.jpg" },
                new TmdbCrewMember { Id = 9004, Name = "Novel Author", Job = "Novel", ProfilePath = "/novel.jpg" }, // Novel is not included by MovieService
                new TmdbCrewMember { Id = 9005, Name = "Editor", Job = "Editor", ProfilePath = "/editor.jpg" }
            }
        };

        tmdbService.GetMovieDetailsAsync(559).Returns(tmdbMovie);
        tmdbService.GetMovieCreditsAsync(559).Returns(tmdbCredits);

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(559);

        // Assert
        result.Should().NotBeNull();
        result!.Writers.Should().HaveCount(3); // Only Screenplay, Writer, Story (MovieService filters these 3 jobs only)
        result.Writers.Should().Contain(w => w.PersonId == 9001 && w.Job == "Screenplay");
        result.Writers.Should().Contain(w => w.PersonId == 9002 && w.Job == "Writer");
        result.Writers.Should().Contain(w => w.PersonId == 9003 && w.Job == "Story");
        result.Writers.Should().NotContain(w => w.Job == "Novel"); // Novel is not included
        result.Writers.Should().NotContain(w => w.Job == "Editor"); // Editor is not included
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_NewMovie_HandlesNullProfilePathWithPersonId()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        var tmdbMovie = new TmdbMovie
        {
            Id = 560,
            Title = "Film With Unknown Faces",
            ReleaseDate = "2023-01-01",
            PosterPath = "/unknown.jpg",
            Overview = "Cast without profile photos",
            Runtime = 90
        };

        var tmdbCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>
            {
                new TmdbCastMember { Id = 10001, Name = "Unknown Actor", Character = "Mystery Person", Order = 0, ProfilePath = null }
            },
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Id = 10002, Name = "Unknown Director", Job = "Director", ProfilePath = null }
            }
        };

        tmdbService.GetMovieDetailsAsync(560).Returns(tmdbMovie);
        tmdbService.GetMovieCreditsAsync(560).Returns(tmdbCredits);

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(560);

        // Assert
        result.Should().NotBeNull();
        result!.Cast.Should().HaveCount(1);
        result.Cast[0].PersonId.Should().Be(10001);
        result.Cast[0].Name.Should().Be("Unknown Actor");
        result.Cast[0].ProfilePath.Should().BeNull();

        result.Directors.Should().HaveCount(1);
        result.Directors[0].PersonId.Should().Be(10002);
        result.Directors[0].Name.Should().Be("Unknown Director");
        result.Directors[0].ProfilePath.Should().BeNull();
    }

    [Fact]
    public async Task GetOrCreateFromTmdbAsync_MovieWithAllPersonIdsPresent_SkipsEnrichment()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<MovieService>>();
        var service = new MovieService(context, tmdbService, logger);

        // Create a fully enriched movie with all PersonIds
        var fullyEnrichedMovie = new Movie
        {
            TmdbId = 561,
            Title = "Fully Enriched Movie",
            Year = 2023,
            PosterPath = "/full.jpg",
            Synopsis = "Complete with all PersonIds",
            Genres = new List<string> { "Action" },
            Cast = new List<CastMember>
            {
                new CastMember { PersonId = 11000, Name = "Actor X", Character = "Hero", ProfilePath = "/x.jpg" }
            },
            Directors = new List<DirectorMember>
            {
                new DirectorMember { PersonId = 11001, Name = "Director X", ProfilePath = "/dx.jpg" }
            },
            Writers = new List<WriterMember>
            {
                new WriterMember { PersonId = 11002, Name = "Writer X", Job = "Screenplay", ProfilePath = "/wx.jpg" }
            },
            Runtime = 130,
            DirectorName = "Director X",
            DirectorProfilePath = "/dx.jpg",
            WriterName = "Writer X",
            WriterProfilePath = "/wx.jpg",
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(fullyEnrichedMovie);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetOrCreateFromTmdbAsync(561);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(fullyEnrichedMovie.Id);
        result.Cast[0].PersonId.Should().Be(11000);
        result.Directors[0].PersonId.Should().Be(11001);
        result.Writers[0].PersonId.Should().Be(11002);

        // Verify TMDb API was NOT called (movie is fully enriched)
        await tmdbService.DidNotReceive().GetMovieDetailsAsync(Arg.Any<int>());
        await tmdbService.DidNotReceive().GetMovieCreditsAsync(Arg.Any<int>());
    }
}