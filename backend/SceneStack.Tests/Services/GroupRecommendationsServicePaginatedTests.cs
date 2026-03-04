using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.DTOs;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;

namespace SceneStack.Tests.Services;

public class GroupRecommendationsServicePaginatedTests
{
    private readonly IMemoryCache _cache;

    public GroupRecommendationsServicePaginatedTests()
    {
        _cache = new MemoryCache(new MemoryCacheOptions());
    }

    [Fact]
    public async Task GetPaginatedRecommendationsAsync_UserNotMember_ReturnsEmpty()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act - user2 tries to get recommendations (not a member)
        var result = await service.GetPaginatedRecommendationsAsync(group.Id, user2.Id, page: 1, pageSize: 20);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().BeEmpty();
        result.HasMore.Should().BeFalse();
    }

    [Fact]
    public async Task GetPaginatedRecommendationsAsync_WithHighRatedMovies_ReturnsPersonalizedRecommendations()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Create group
        var group = new Group
        {
            Name = "Movie Lovers",
            CreatedById = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Add high-rated movies with genres (use unique TmdbId to avoid conflict with seeded data)
        var movie1 = new Movie
        {
            TmdbId = 603,  // Use a different ID to avoid any conflicts
            Title = "The Matrix",
            Year = 1999,
            Genres = new List<string> { "Drama", "Thriller" },
            DirectorName = "Wachowski Brothers",
            Cast = new List<CastMember>
            {
                new CastMember { Name = "Keanu Reeves", Character = "Neo", ProfilePath = null }
            },
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie1);
        await context.SaveChangesAsync();

        // User rated it highly
        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = movie1.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9.0,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Link watch to group
        context.MovieGroups.Add(new MovieGroup { MovieId = watch.MovieId, GroupId = group.Id, SharedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Mock TMDb Discover API to return similar movies
        var discoverResult = new TmdbMovieSearchResult
        {
            Page = 1,
            TotalPages = 1,
            TotalResults = 2,
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 680,
                    Title = "Pulp Fiction",
                    ReleaseDate = "1994-09-10",
                    VoteAverage = 8.5,
                    VoteCount = 500,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 18, Name = "Drama" },
                        new TmdbGenre { Id = 80, Name = "Crime" }
                    }
                },
                new TmdbMovie
                {
                    Id = 13,
                    Title = "Forrest Gump",
                    ReleaseDate = "1994-06-23",
                    VoteAverage = 8.4,
                    VoteCount = 600,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 18, Name = "Drama" },
                        new TmdbGenre { Id = 10749, Name = "Romance" }
                    }
                }
            }
        };

        tmdbService.DiscoverMoviesAsync(
            Arg.Any<List<int>>(),
            Arg.Any<double?>(),
            Arg.Any<int?>(),
            Arg.Any<string>(),
            Arg.Any<int>()
        ).Returns(discoverResult);

        // Mock credits (empty for simplicity)
        var emptyCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>()
        };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(emptyCredits);

        // Act
        var result = await service.GetPaginatedRecommendationsAsync(group.Id, user.Id, page: 1, pageSize: 20);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().NotBeEmpty();
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(20);
        result.CurrentTier.Should().Be("Elite");

        // Should contain recommendations
        result.Items.Should().Contain(r => r.Movie.Title == "Pulp Fiction");
        result.Items.Should().Contain(r => r.Movie.Title == "Forrest Gump");

        // Should contain both recommendations
        var pulpFiction = result.Items.FirstOrDefault(r => r.Movie.Title == "Pulp Fiction");
        var forrestGump = result.Items.FirstOrDefault(r => r.Movie.Title == "Forrest Gump");

        pulpFiction.Should().NotBeNull();
        forrestGump.Should().NotBeNull();

        // Both movies should have reasons and scores based on TMDb ratings
        pulpFiction!.Reason.Should().NotBeNullOrEmpty();
        forrestGump!.Reason.Should().NotBeNullOrEmpty();
        pulpFiction.Score.Should().BeGreaterThan(0);
        forrestGump.Score.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetPaginatedRecommendationsAsync_FiltersOutWatchedMovies()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Add a watched movie
        var watchedMovie = new Movie
        {
            TmdbId = 680,
            Title = "Pulp Fiction",
            Year = 1994,
            Genres = new List<string> { "Drama", "Crime" },
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(watchedMovie);
        await context.SaveChangesAsync();

        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = watchedMovie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9.0,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Link watch to group
        context.MovieGroups.Add(new MovieGroup { MovieId = watch.MovieId, GroupId = group.Id, SharedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Mock TMDb Discover to return Pulp Fiction (which should be filtered) and another movie
        var discoverResult = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 680, // Already watched - should be filtered
                    Title = "Pulp Fiction",
                    VoteAverage = 8.5,
                    VoteCount = 500,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                },
                new TmdbMovie
                {
                    Id = 13, // Not watched - should be included
                    Title = "Forrest Gump",
                    VoteAverage = 8.4,
                    VoteCount = 600,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }
            }
        };

        tmdbService.DiscoverMoviesAsync(
            Arg.Any<List<int>>(),
            Arg.Any<double?>(),
            Arg.Any<int?>(),
            Arg.Any<string>(),
            Arg.Any<int>()
        ).Returns(discoverResult);

        var emptyCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>()
        };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(emptyCredits);

        // Act
        var result = await service.GetPaginatedRecommendationsAsync(group.Id, user.Id, page: 1, pageSize: 20);

        // Assert
        result.Items.Should().NotContain(r => r.Movie.Id == 680, "Pulp Fiction should be filtered out as already watched");
        result.Items.Should().Contain(r => r.Movie.Id == 13, "Forrest Gump should be included");
    }

    [Fact]
    public async Task GetPaginatedRecommendationsAsync_PageProgression_ChangesTiers()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Add some watched movies with ratings
        var movie = new Movie
        {
            TmdbId = 550,
            Title = "Fight Club",
            Year = 1999,
            Genres = new List<string> { "Drama" },
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9.0,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Link watch to group
        context.MovieGroups.Add(new MovieGroup { MovieId = watch.MovieId, GroupId = group.Id, SharedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Mock Discover API
        var mockResult = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 999,
                    Title = "Test Movie",
                    VoteAverage = 7.0,
                    VoteCount = 300,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }
            }
        };
        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(mockResult);

        var emptyCredits = new TmdbCreditsResult { Cast = new List<TmdbCastMember>(), Crew = new List<TmdbCrewMember>() };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(emptyCredits);

        // Act - Test tier progression
        var page1Result = await service.GetPaginatedRecommendationsAsync(group.Id, user.Id, page: 1, pageSize: 20);
        var page3Result = await service.GetPaginatedRecommendationsAsync(group.Id, user.Id, page: 3, pageSize: 20);
        var page5Result = await service.GetPaginatedRecommendationsAsync(group.Id, user.Id, page: 5, pageSize: 20);
        var page7Result = await service.GetPaginatedRecommendationsAsync(group.Id, user.Id, page: 7, pageSize: 20);

        // Assert - Tiers should progress
        page1Result.CurrentTier.Should().Be("Elite");   // Pages 1-2
        page3Result.CurrentTier.Should().Be("Strong");  // Pages 3-4
        page5Result.CurrentTier.Should().Be("Broad");   // Pages 5-6
        page7Result.CurrentTier.Should().Be("Popular"); // Pages 7+
    }

    [Fact]
    public async Task GetPaginatedRecommendationsAsync_DirectorMatch_BoostsScore()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        var group = new Group
        {
            Name = "Scorsese Fans",
            CreatedById = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Add a highly-rated Scorsese movie
        var movie = new Movie
        {
            TmdbId = 771,
            Title = "GoodFellas",
            Year = 1990,
            Genres = new List<string> { "Drama", "Crime" },
            DirectorName = "Martin Scorsese",
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 10.0,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Link watch to group
        context.MovieGroups.Add(new MovieGroup { MovieId = watch.MovieId, GroupId = group.Id, SharedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Mock Discover with two similar movies - one by Scorsese, one not
        var discoverResult = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 273,
                    Title = "The Departed",
                    VoteAverage = 8.1,
                    VoteCount = 500,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 18, Name = "Drama" },
                        new TmdbGenre { Id = 80, Name = "Crime" }
                    }
                },
                new TmdbMovie
                {
                    Id = 769,
                    Title = "The Godfather",
                    VoteAverage = 8.7,
                    VoteCount = 1000,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 18, Name = "Drama" },
                        new TmdbGenre { Id = 80, Name = "Crime" }
                    }
                }
            }
        };
        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(discoverResult);

        // Mock credits - The Departed is by Scorsese
        tmdbService.GetMovieCreditsAsync(273).Returns(new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Martin Scorsese", Job = "Director" }
            }
        });

        // The Godfather is by Coppola
        tmdbService.GetMovieCreditsAsync(769).Returns(new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Francis Ford Coppola", Job = "Director" }
            }
        });

        // Act
        var result = await service.GetPaginatedRecommendationsAsync(group.Id, user.Id, page: 1, pageSize: 20);

        // Assert
        var departed = result.Items.FirstOrDefault(r => r.Movie.Id == 273);
        var godfather = result.Items.FirstOrDefault(r => r.Movie.Id == 769);

        departed.Should().NotBeNull();
        godfather.Should().NotBeNull();

        // The Departed should score higher due to director match (even though Godfather has higher TMDb rating)
        departed!.Score.Should().BeGreaterThan(godfather!.Score);

        // The Departed should mention director in reason
        departed.Reason.Should().Contain("Martin Scorsese");
        departed.MatchedDirector.Should().Be("Martin Scorsese");
    }

    [Fact]
    public async Task GetPaginatedRecommendationsAsync_WriterMatch_BoostsScore()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        var group = new Group
        {
            Name = "Tarantino Fans",
            CreatedById = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Add a highly-rated Tarantino movie
        var movie = new Movie
        {
            TmdbId = 680,
            Title = "Pulp Fiction",
            Year = 1994,
            Genres = new List<string> { "Crime", "Drama" },
            DirectorName = "Quentin Tarantino",
            WriterName = "Quentin Tarantino",
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 10.0,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Link watch to group
        context.MovieGroups.Add(new MovieGroup { MovieId = watch.MovieId, GroupId = group.Id, SharedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Mock Discover with two similar crime/drama movies - one by Tarantino, one not
        var discoverResult = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 24,
                    Title = "Kill Bill: Vol. 1",
                    VoteAverage = 8.0,
                    VoteCount = 500,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 80, Name = "Crime" },
                        new TmdbGenre { Id = 28, Name = "Action" }
                    }
                },
                new TmdbMovie
                {
                    Id = 155,
                    Title = "The Dark Knight",
                    VoteAverage = 9.0,  // Higher TMDb rating
                    VoteCount = 1000,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 80, Name = "Crime" },
                        new TmdbGenre { Id = 28, Name = "Action" }
                    }
                }
            }
        };
        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(discoverResult);

        // Mock credits - Kill Bill is written by Tarantino
        tmdbService.GetMovieCreditsAsync(24).Returns(new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Quentin Tarantino", Job = "Director" },
                new TmdbCrewMember { Name = "Quentin Tarantino", Job = "Screenplay" }
            }
        });

        // The Dark Knight is written by the Nolan brothers
        tmdbService.GetMovieCreditsAsync(155).Returns(new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Christopher Nolan", Job = "Director" },
                new TmdbCrewMember { Name = "Jonathan Nolan", Job = "Screenplay" }
            }
        });

        // Act
        var result = await service.GetPaginatedRecommendationsAsync(group.Id, user.Id, page: 1, pageSize: 20);

        // Assert
        result.Items.Should().NotBeEmpty();

        var killBill = result.Items.FirstOrDefault(r => r.Movie.Id == 24);
        killBill.Should().NotBeNull("Kill Bill should be recommended due to writer+director match");

        // Kill Bill should have high score due to writer AND director match
        killBill!.Score.Should().BeGreaterThan(0.5, "Writer match (20%) + Director match (30%) + Genre/Rating should give high score");

        // Kill Bill should mention writer in reason
        killBill.Reason.Should().Contain("Quentin Tarantino");
        killBill.Reason.Should().Contain("written by", "Writer should be mentioned in recommendation reason");
        killBill.MatchedWriter.Should().Be("Quentin Tarantino", "Writer should be matched from preferences");
        killBill.MatchedDirector.Should().Be("Quentin Tarantino", "Director should also be matched");

        // The Dark Knight may or may not appear depending on its score
        // (it doesn't match writer/director so it needs strong genre+TMDb score to pass threshold)
        var darkKnight = result.Items.FirstOrDefault(r => r.Movie.Id == 155);
        if (darkKnight != null)
        {
            // If Dark Knight is included, Kill Bill should still score higher
            killBill.Score.Should().BeGreaterThan(darkKnight.Score,
                "Kill Bill with writer+director match should score higher than Dark Knight with neither");
            darkKnight.MatchedWriter.Should().BeNullOrEmpty("Dark Knight writer should not match");
        }
    }

    [Fact]
    public async Task GetPaginatedRecommendationsAsync_WriterOnlyMatch_BoostsScore()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        var group = new Group
        {
            Name = "Kaufman Fans",
            CreatedById = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Add a highly-rated movie written by Charlie Kaufman
        var movie = new Movie
        {
            TmdbId = 38,
            Title = "Eternal Sunshine of the Spotless Mind",
            Year = 2004,
            Genres = new List<string> { "Drama", "Romance" },
            DirectorName = "Michel Gondry",
            WriterName = "Charlie Kaufman",
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 10.0,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Link watch to group
        context.MovieGroups.Add(new MovieGroup { MovieId = watch.MovieId, GroupId = group.Id, SharedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Mock Discover with two movies - one also written by Kaufman, one not
        var discoverResult = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 77,
                    Title = "Being John Malkovich",
                    VoteAverage = 7.8,
                    VoteCount = 500,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 18, Name = "Drama" },
                        new TmdbGenre { Id = 35, Name = "Comedy" }
                    }
                },
                new TmdbMovie
                {
                    Id = 78,
                    Title = "Lost in Translation",
                    VoteAverage = 7.7,
                    VoteCount = 550,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 18, Name = "Drama" },
                        new TmdbGenre { Id = 10749, Name = "Romance" }
                    }
                }
            }
        };
        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(discoverResult);

        // Being John Malkovich is written by Kaufman
        tmdbService.GetMovieCreditsAsync(77).Returns(new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Spike Jonze", Job = "Director" },
                new TmdbCrewMember { Name = "Charlie Kaufman", Job = "Screenplay" }
            }
        });

        // Lost in Translation is written by Sofia Coppola
        tmdbService.GetMovieCreditsAsync(78).Returns(new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Sofia Coppola", Job = "Director" },
                new TmdbCrewMember { Name = "Sofia Coppola", Job = "Screenplay" }
            }
        });

        // Act
        var result = await service.GetPaginatedRecommendationsAsync(group.Id, user.Id, page: 1, pageSize: 20);

        // Assert
        result.Items.Should().NotBeEmpty();

        var malkovich = result.Items.FirstOrDefault(r => r.Movie.Id == 77);
        malkovich.Should().NotBeNull("Being John Malkovich should be recommended due to writer match");

        // Should have writer match
        malkovich!.MatchedWriter.Should().Be("Charlie Kaufman", "Writer should be matched from preferences");
        malkovich.Reason.Should().Contain("written by", "Writer should be mentioned in recommendation reason");
        malkovich.Reason.Should().Contain("Charlie Kaufman");

        // Director should NOT match (different directors)
        malkovich.MatchedDirector.Should().BeNullOrEmpty("Director should not match");

        // Lost in Translation may or may not appear
        var lostInTranslation = result.Items.FirstOrDefault(r => r.Movie.Id == 78);
        if (lostInTranslation != null)
        {
            // If both are included, Malkovich should score higher due to writer match
            malkovich.Score.Should().BeGreaterThan(lostInTranslation.Score,
                "Being John Malkovich with writer match should score higher than Lost in Translation without");
            lostInTranslation.MatchedWriter.Should().BeNullOrEmpty("Lost in Translation writer should not match");
        }
    }

    [Fact]
    public async Task GetPaginatedRecommendationsAsync_NoRatedMovies_ReturnsFallbackRecommendations()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        var group = new Group
        {
            Name = "New Group",
            CreatedById = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(
            new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // No watches - group has no preferences

        // Mock Discover to return popular movies (use unique ID to avoid conflict with seeded data)
        var discoverResult = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 605,
                    Title = "The Avengers",
                    VoteAverage = 8.0,
                    VoteCount = 500,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 12, Name = "Action" } }
                }
            }
        };
        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>?>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(discoverResult);

        var emptyCredits = new TmdbCreditsResult { Cast = new List<TmdbCastMember>(), Crew = new List<TmdbCrewMember>() };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(emptyCredits);

        // Act
        var result = await service.GetPaginatedRecommendationsAsync(group.Id, user.Id, page: 1, pageSize: 20);

        // Assert
        result.Items.Should().NotBeEmpty("Should return fallback recommendations for groups with no preferences");
        result.Items.First().Movie.Title.Should().Be("The Avengers");
    }

    // User Recommendations Tests

    [Fact]
    public async Task GetUserRecommendationsAsync_WithHighRatedMovies_ReturnsPersonalizedRecommendations()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Add high-rated movies
        var movie1 = new Movie
        {
            TmdbId = 701,
            Title = "The Shawshank Redemption",
            Year = 1994,
            Genres = new List<string> { "Drama" },
            DirectorName = "Frank Darabont",
            Cast = new List<CastMember>
            {
                new CastMember { Name = "Tim Robbins", Character = "Andy", ProfilePath = null }
            },
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie1);
        await context.SaveChangesAsync();

        // User rated it highly
        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = movie1.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9.5,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Mock TMDb Discover API
        var discoverResult = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 702,
                    Title = "The Green Mile",
                    ReleaseDate = "1999-12-10",
                    VoteAverage = 8.6,
                    VoteCount = 500,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 18, Name = "Drama" }
                    }
                }
            }
        };

        tmdbService.DiscoverMoviesAsync(
            Arg.Any<List<int>>(),
            Arg.Any<double?>(),
            Arg.Any<int?>(),
            Arg.Any<string>(),
            Arg.Any<int>()
        ).Returns(discoverResult);

        var emptyCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>()
        };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(emptyCredits);

        // Act
        var result = await service.GetUserRecommendationsAsync(user.Id, page: 1, pageSize: 20);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().NotBeEmpty();
        result.Page.Should().Be(1);
        result.PageSize.Should().Be(20);
        result.CurrentTier.Should().Be("Elite");

        // Should contain recommendations
        result.Items.Should().Contain(r => r.Movie.Title == "The Green Mile");

        var greenMile = result.Items.FirstOrDefault(r => r.Movie.Title == "The Green Mile");
        greenMile.Should().NotBeNull();
        greenMile!.Reason.Should().NotBeNullOrEmpty();
        greenMile.Score.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetUserRecommendationsAsync_FiltersOutWatchedMovies()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Add a watched movie
        var watchedMovie = new Movie
        {
            TmdbId = 702,
            Title = "The Green Mile",
            Year = 1999,
            Genres = new List<string> { "Drama" },
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(watchedMovie);
        await context.SaveChangesAsync();

        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = watchedMovie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9.0,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Mock TMDb Discover to return both watched and unwatched movies
        var discoverResult = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 702, // Already watched - should be filtered
                    Title = "The Green Mile",
                    VoteAverage = 8.6,
                    VoteCount = 500,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                },
                new TmdbMovie
                {
                    Id = 703, // Not watched - should be included
                    Title = "The Godfather",
                    VoteAverage = 9.2,
                    VoteCount = 1000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }
            }
        };

        tmdbService.DiscoverMoviesAsync(
            Arg.Any<List<int>>(),
            Arg.Any<double?>(),
            Arg.Any<int?>(),
            Arg.Any<string>(),
            Arg.Any<int>()
        ).Returns(discoverResult);

        var emptyCredits = new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>()
        };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(emptyCredits);

        // Act
        var result = await service.GetUserRecommendationsAsync(user.Id, page: 1, pageSize: 20);

        // Assert
        result.Items.Should().NotContain(r => r.Movie.Id == 702, "The Green Mile should be filtered out as already watched");
        result.Items.Should().Contain(r => r.Movie.Id == 703, "The Godfather should be included");
    }

    [Fact]
    public async Task GetUserRecommendationsAsync_PageProgression_ChangesTiers()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Add some watched movies with ratings
        var movie = new Movie
        {
            TmdbId = 704,
            Title = "Goodfellas",
            Year = 1990,
            Genres = new List<string> { "Crime", "Drama" },
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9.5,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Mock Discover API
        var mockResult = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 999,
                    Title = "Test Movie",
                    VoteAverage = 7.0,
                    VoteCount = 300,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }
            }
        };
        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(mockResult);

        var emptyCredits = new TmdbCreditsResult { Cast = new List<TmdbCastMember>(), Crew = new List<TmdbCrewMember>() };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(emptyCredits);

        // Act - Test tier progression
        var page1Result = await service.GetUserRecommendationsAsync(user.Id, page: 1, pageSize: 20);
        var page3Result = await service.GetUserRecommendationsAsync(user.Id, page: 3, pageSize: 20);
        var page5Result = await service.GetUserRecommendationsAsync(user.Id, page: 5, pageSize: 20);
        var page7Result = await service.GetUserRecommendationsAsync(user.Id, page: 7, pageSize: 20);

        // Assert - Tiers should progress
        page1Result.CurrentTier.Should().Be("Elite");   // Pages 1-2
        page3Result.CurrentTier.Should().Be("Strong");  // Pages 3-4
        page5Result.CurrentTier.Should().Be("Broad");   // Pages 5-6
        page7Result.CurrentTier.Should().Be("Popular"); // Pages 7+
    }

    [Fact]
    public async Task GetUserRecommendationsAsync_DirectorMatch_BoostsScore()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Add a highly-rated Nolan movie
        var movie = new Movie
        {
            TmdbId = 705,
            Title = "The Dark Knight",
            Year = 2008,
            Genres = new List<string> { "Action", "Crime" },
            DirectorName = "Christopher Nolan",
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 10.0,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Mock Discover with two movies - one by Nolan, one not
        var discoverResult = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 706,
                    Title = "Inception",
                    VoteAverage = 8.8,
                    VoteCount = 500,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 28, Name = "Action" },
                        new TmdbGenre { Id = 878, Name = "Science Fiction" }
                    }
                },
                new TmdbMovie
                {
                    Id = 707,
                    Title = "Heat",
                    VoteAverage = 8.5,  // Increased to ensure it passes threshold
                    VoteCount = 1000,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 28, Name = "Action" },
                        new TmdbGenre { Id = 80, Name = "Crime" }
                    }
                }
            }
        };
        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(discoverResult);

        // Mock credits - Inception is by Nolan
        tmdbService.GetMovieCreditsAsync(706).Returns(new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Christopher Nolan", Job = "Director" }
            }
        });

        // Heat is by Michael Mann
        tmdbService.GetMovieCreditsAsync(707).Returns(new TmdbCreditsResult
        {
            Cast = new List<TmdbCastMember>(),
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Michael Mann", Job = "Director" }
            }
        });

        // Act
        var result = await service.GetUserRecommendationsAsync(user.Id, page: 1, pageSize: 20);

        // Assert
        var inception = result.Items.FirstOrDefault(r => r.Movie.Id == 706);

        // Inception should be recommended due to director match
        inception.Should().NotBeNull("Inception should be recommended due to Christopher Nolan match");
        inception!.MatchedDirector.Should().Be("Christopher Nolan");
        inception.Reason.Should().Contain("Christopher Nolan");
        inception.Score.Should().BeGreaterThan(0, "Movie should have a positive score");

        // Heat may or may not appear depending on scoring threshold
        // If it does appear, Inception should score higher
        var heat = result.Items.FirstOrDefault(r => r.Movie.Id == 707);
        if (heat != null)
        {
            inception.Score.Should().BeGreaterThan(heat.Score,
                "Inception with director match should score higher than Heat without");
            heat.MatchedDirector.Should().BeNullOrEmpty("Heat director should not match");
        }
    }

    [Fact]
    public async Task GetUserRecommendationsAsync_NoRatedMovies_ReturnsFallbackRecommendations()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        // Use a new user with no watches
        var newUser = new User
        {
            Username = "newuser",
            Email = "newuser@example.com",
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(newUser);
        await context.SaveChangesAsync();

        // Mock Discover to return popular movies
        var discoverResult = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 708,
                    Title = "Popular Movie",
                    VoteAverage = 8.0,
                    VoteCount = 1000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 12, Name = "Action" } }
                }
            }
        };
        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>?>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(discoverResult);

        var emptyCredits = new TmdbCreditsResult { Cast = new List<TmdbCastMember>(), Crew = new List<TmdbCrewMember>() };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(emptyCredits);

        // Act
        var result = await service.GetUserRecommendationsAsync(newUser.Id, page: 1, pageSize: 20);

        // Assert
        result.Items.Should().NotBeEmpty("Should return fallback recommendations for users with no preferences");
        result.Items.First().Movie.Title.Should().Be("Popular Movie");
    }
}
