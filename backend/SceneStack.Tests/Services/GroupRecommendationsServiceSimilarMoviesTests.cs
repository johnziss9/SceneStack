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

public class GroupRecommendationsServiceSimilarMoviesTests
{
    private readonly IMemoryCache _cache;

    public GroupRecommendationsServiceSimilarMoviesTests()
    {
        _cache = new MemoryCache(new MemoryCacheOptions());
    }

    [Fact]
    public async Task GetMovieSimilarRecommendationsAsync_ValidMovie_ReturnsRecommendations()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Mock source movie from TMDb
        var sourceMovie = new TmdbMovie
        {
            Id = 550,
            Title = "Fight Club",
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 18, Name = "Drama" },
                new TmdbGenre { Id = 53, Name = "Thriller" }
            },
            ReleaseDate = "1999-10-15"
        };

        var sourceCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "David Fincher", Job = "Director" },
                new TmdbCrewMember { Name = "Chuck Palahniuk", Job = "Novel" }
            },
            Cast = new List<TmdbCastMember>
            {
                new TmdbCastMember { Name = "Brad Pitt", Order = 0 },
                new TmdbCastMember { Name = "Edward Norton", Order = 1 },
                new TmdbCastMember { Name = "Helena Bonham Carter", Order = 2 }
            }
        };

        tmdbService.GetMovieDetailsAsync(550).Returns(sourceMovie);
        tmdbService.GetMovieCreditsAsync(550).Returns(sourceCredits);

        // Mock similar movies from TMDb Discover
        var similarMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 680,
                    Title = "Pulp Fiction",
                    ReleaseDate = "1994-10-14",
                    VoteAverage = 8.5,
                    VoteCount = 25000,
                    Overview = "A burger-loving hit man...",
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
                    ReleaseDate = "1994-07-06",
                    VoteAverage = 8.7,
                    VoteCount = 24000,
                    Overview = "A simple man...",
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 18, Name = "Drama" }
                    }
                },
                new TmdbMovie
                {
                    Id = 278,
                    Title = "The Shawshank Redemption",
                    ReleaseDate = "1994-09-23",
                    VoteAverage = 8.9,
                    VoteCount = 23000,
                    Overview = "Two imprisoned men...",
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 18, Name = "Drama" },
                        new TmdbGenre { Id = 80, Name = "Crime" }
                    }
                }
            }
        };

        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>?>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(similarMovies);

        // Mock credits for candidate movies
        var pulpFictionCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Quentin Tarantino", Job = "Director" }
            },
            Cast = new List<TmdbCastMember>
            {
                new TmdbCastMember { Name = "John Travolta", Order = 0 }
            }
        };

        tmdbService.GetMovieCreditsAsync(680).Returns(pulpFictionCredits);
        tmdbService.GetMovieCreditsAsync(13).Returns(pulpFictionCredits);
        tmdbService.GetMovieCreditsAsync(278).Returns(pulpFictionCredits);

        // Act
        var result = await service.GetMovieSimilarRecommendationsAsync(550, user.Id, 12);

        // Assert
        result.Should().NotBeEmpty();
        result.Count.Should().BeLessThanOrEqualTo(12);
        result.Should().OnlyContain(r => r.Movie.Id != 550); // Should not include source movie
        result.First().Reason.Should().NotBeNullOrEmpty();
        result.First().MatchedGenres.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetMovieSimilarRecommendationsAsync_FiltersOutWatchedMovies()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Create a watched movie
        var watchedMovie = new Movie
        {
            TmdbId = 680,
            Title = "Pulp Fiction",
            Year = 1994
        };
        context.Movies.Add(watchedMovie);
        await context.SaveChangesAsync();

        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = watchedMovie.Id,
            WatchedDate = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Mock source movie
        var sourceMovie = new TmdbMovie
        {
            Id = 550,
            Title = "Fight Club",
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 18, Name = "Drama" }
            },
            ReleaseDate = "1999-10-15"
        };

        var sourceCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "David Fincher", Job = "Director" }
            },
            Cast = new List<TmdbCastMember>
            {
                new TmdbCastMember { Name = "Brad Pitt", Order = 0 }
            }
        };

        tmdbService.GetMovieDetailsAsync(550).Returns(sourceMovie);
        tmdbService.GetMovieCreditsAsync(550).Returns(sourceCredits);

        // Mock similar movies - includes the watched movie
        var similarMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 680,
                    Title = "Pulp Fiction",
                    VoteAverage = 8.5,
                    VoteCount = 25000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }, // Watched
                new TmdbMovie
                {
                    Id = 13,
                    Title = "Forrest Gump",
                    VoteAverage = 8.7,
                    VoteCount = 24000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                },
                new TmdbMovie
                {
                    Id = 278,
                    Title = "The Shawshank Redemption",
                    VoteAverage = 8.9,
                    VoteCount = 23000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }
            }
        };

        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>?>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(similarMovies);

        var credits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>()
        };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(credits);

        // Act
        var result = await service.GetMovieSimilarRecommendationsAsync(550, user.Id, 12);

        // Assert
        result.Should().NotContain(r => r.Movie.Id == 680); // Should not include watched movie
        result.Should().Contain(r => r.Movie.Id == 13);
        result.Should().Contain(r => r.Movie.Id == 278);
    }

    [Fact]
    public async Task GetMovieSimilarRecommendationsAsync_DirectorMatch_BoostsScore()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Mock source movie with specific director
        var sourceMovie = new TmdbMovie
        {
            Id = 550,
            Title = "Fight Club",
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 18, Name = "Drama" }
            },
            ReleaseDate = "1999-10-15"
        };

        var sourceCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "David Fincher", Job = "Director" }
            },
            Cast = new List<TmdbCastMember>()
        };

        tmdbService.GetMovieDetailsAsync(550).Returns(sourceMovie);
        tmdbService.GetMovieCreditsAsync(550).Returns(sourceCredits);

        // Mock similar movies
        var similarMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 13,
                    Title = "The Social Network",
                    VoteAverage = 7.7,
                    VoteCount = 10000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }, // Same director
                new TmdbMovie
                {
                    Id = 14,
                    Title = "Other Movie",
                    VoteAverage = 8.0,
                    VoteCount = 15000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                } // Different director
            }
        };

        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>?>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(similarMovies);

        // Mock credits - first movie has same director
        var socialNetworkCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "David Fincher", Job = "Director" }
            },
            Cast = new List<TmdbCastMember>()
        };

        var otherCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Other Director", Job = "Director" }
            },
            Cast = new List<TmdbCastMember>()
        };

        tmdbService.GetMovieCreditsAsync(13).Returns(socialNetworkCredits);
        tmdbService.GetMovieCreditsAsync(14).Returns(otherCredits);

        // Act
        var result = await service.GetMovieSimilarRecommendationsAsync(550, user.Id, 12);

        // Assert
        result.Should().NotBeEmpty();
        var socialNetwork = result.FirstOrDefault(r => r.Movie.Id == 13);
        socialNetwork.Should().NotBeNull();
        socialNetwork!.MatchedDirector.Should().Be("David Fincher");
        socialNetwork.Reason.Should().Contain("directed");
    }

    [Fact]
    public async Task GetMovieSimilarRecommendationsAsync_WriterMatch_BoostsScore()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Mock source movie with specific writer
        var sourceMovie = new TmdbMovie
        {
            Id = 550,
            Title = "Fight Club",
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 18, Name = "Drama" }
            },
            ReleaseDate = "1999-10-15"
        };

        var sourceCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Chuck Palahniuk", Job = "Writer" },
                new TmdbCrewMember { Name = "Jim Uhls", Job = "Screenplay" }
            },
            Cast = new List<TmdbCastMember>()
        };

        tmdbService.GetMovieDetailsAsync(550).Returns(sourceMovie);
        tmdbService.GetMovieCreditsAsync(550).Returns(sourceCredits);

        // Mock similar movies
        var similarMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 15,
                    Title = "Choke",
                    VoteAverage = 6.5,
                    VoteCount = 5000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }, // Same writer
                new TmdbMovie
                {
                    Id = 16,
                    Title = "Other Movie",
                    VoteAverage = 7.0,
                    VoteCount = 6000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }
            }
        };

        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>?>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(similarMovies);

        // Mock credits - first movie has same writer
        var chokeCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>
            {
                new TmdbCrewMember { Name = "Chuck Palahniuk", Job = "Writer" }
            },
            Cast = new List<TmdbCastMember>()
        };

        var otherCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>()
        };

        tmdbService.GetMovieCreditsAsync(15).Returns(chokeCredits);
        tmdbService.GetMovieCreditsAsync(16).Returns(otherCredits);

        // Act
        var result = await service.GetMovieSimilarRecommendationsAsync(550, user.Id, 12);

        // Assert
        result.Should().NotBeEmpty();
        var choke = result.FirstOrDefault(r => r.Movie.Id == 15);
        choke.Should().NotBeNull();
        choke!.MatchedWriter.Should().Be("Chuck Palahniuk");
        choke.Reason.Should().Contain("written");
    }

    [Fact]
    public async Task GetMovieSimilarRecommendationsAsync_CastMatch_BoostsScore()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Mock source movie with specific cast
        var sourceMovie = new TmdbMovie
        {
            Id = 550,
            Title = "Fight Club",
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 18, Name = "Drama" }
            },
            ReleaseDate = "1999-10-15"
        };

        var sourceCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>
            {
                new TmdbCastMember { Name = "Brad Pitt", Order = 0 },
                new TmdbCastMember { Name = "Edward Norton", Order = 1 }
            }
        };

        tmdbService.GetMovieDetailsAsync(550).Returns(sourceMovie);
        tmdbService.GetMovieCreditsAsync(550).Returns(sourceCredits);

        // Mock similar movies
        var similarMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 17,
                    Title = "Ocean's Eleven",
                    VoteAverage = 7.7,
                    VoteCount = 10000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }, // Has Brad Pitt
                new TmdbMovie
                {
                    Id = 18,
                    Title = "Other Movie",
                    VoteAverage = 7.5,
                    VoteCount = 8000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }
            }
        };

        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>?>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(similarMovies);

        // Mock credits - first movie has same cast member
        var oceansCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>
            {
                new TmdbCastMember { Name = "Brad Pitt", Order = 0 },
                new TmdbCastMember { Name = "George Clooney", Order = 1 }
            }
        };

        var otherCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>()
        };

        tmdbService.GetMovieCreditsAsync(17).Returns(oceansCredits);
        tmdbService.GetMovieCreditsAsync(18).Returns(otherCredits);

        // Act
        var result = await service.GetMovieSimilarRecommendationsAsync(550, user.Id, 12);

        // Assert
        result.Should().NotBeEmpty();
        var oceans = result.FirstOrDefault(r => r.Movie.Id == 17);
        oceans.Should().NotBeNull();
        oceans!.MatchedCast.Should().Contain("Brad Pitt");
        oceans.Reason.Should().Contain("starring");
    }

    [Fact]
    public async Task GetMovieSimilarRecommendationsAsync_GenreMatch_IncludedInMatchedGenres()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Mock source movie with specific genres
        var sourceMovie = new TmdbMovie
        {
            Id = 550,
            Title = "Fight Club",
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 18, Name = "Drama" },
                new TmdbGenre { Id = 53, Name = "Thriller" }
            },
            ReleaseDate = "1999-10-15"
        };

        var sourceCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>()
        };

        tmdbService.GetMovieDetailsAsync(550).Returns(sourceMovie);
        tmdbService.GetMovieCreditsAsync(550).Returns(sourceCredits);

        // Mock similar movies - TMDb Discover filters by genre, so results will match
        var similarMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 19,
                    Title = "Se7en",
                    VoteAverage = 8.3,
                    VoteCount = 12000,
                    Genres = new List<TmdbGenre>
                    {
                        new TmdbGenre { Id = 18, Name = "Drama" },
                        new TmdbGenre { Id = 53, Name = "Thriller" }
                    }
                }
            }
        };

        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>?>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(similarMovies);

        var credits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>()
        };
        tmdbService.GetMovieCreditsAsync(19).Returns(credits);

        // Act
        var result = await service.GetMovieSimilarRecommendationsAsync(550, user.Id, 12);

        // Assert
        result.Should().NotBeEmpty();
        var se7en = result.First();
        se7en.MatchedGenres.Should().NotBeEmpty();
        se7en.Reason.Should().Contain("Matches");
    }

    [Fact]
    public async Task GetMovieSimilarRecommendationsAsync_RespectsCountParameter()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Mock source movie
        var sourceMovie = new TmdbMovie
        {
            Id = 550,
            Title = "Fight Club",
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 18, Name = "Drama" }
            },
            ReleaseDate = "1999-10-15"
        };

        var sourceCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>()
        };

        tmdbService.GetMovieDetailsAsync(550).Returns(sourceMovie);
        tmdbService.GetMovieCreditsAsync(550).Returns(sourceCredits);

        // Mock many similar movies
        var similarMovies = new TmdbMovieSearchResult
        {
            Results = Enumerable.Range(1, 50).Select(i => new TmdbMovie
            {
                Id = i,
                Title = $"Movie {i}",
                VoteAverage = 7.0,
                VoteCount = 5000,
                Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
            }).ToList()
        };

        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>?>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(similarMovies);

        var credits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>()
        };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(credits);

        // Act
        var result = await service.GetMovieSimilarRecommendationsAsync(550, user.Id, 5);

        // Assert
        result.Should().HaveCount(5);
    }

    [Fact]
    public async Task GetMovieSimilarRecommendationsAsync_ExcludesSourceMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Mock source movie
        var sourceMovie = new TmdbMovie
        {
            Id = 550,
            Title = "Fight Club",
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 18, Name = "Drama" }
            },
            ReleaseDate = "1999-10-15"
        };

        var sourceCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>()
        };

        tmdbService.GetMovieDetailsAsync(550).Returns(sourceMovie);
        tmdbService.GetMovieCreditsAsync(550).Returns(sourceCredits);

        // Mock similar movies - includes the source movie itself
        var similarMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 550,
                    Title = "Fight Club",
                    VoteAverage = 8.4,
                    VoteCount = 20000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }, // Source movie
                new TmdbMovie
                {
                    Id = 13,
                    Title = "Forrest Gump",
                    VoteAverage = 8.7,
                    VoteCount = 24000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                },
                new TmdbMovie
                {
                    Id = 278,
                    Title = "The Shawshank Redemption",
                    VoteAverage = 8.9,
                    VoteCount = 23000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }
            }
        };

        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>?>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(similarMovies);

        var credits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>()
        };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(credits);

        // Act
        var result = await service.GetMovieSimilarRecommendationsAsync(550, user.Id, 12);

        // Assert
        result.Should().NotContain(r => r.Movie.Id == 550); // Should exclude source movie
        result.Should().Contain(r => r.Movie.Id == 13);
        result.Should().Contain(r => r.Movie.Id == 278);
    }

    [Fact]
    public async Task GetMovieSimilarRecommendationsAsync_AppliesQualityThresholds()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var tmdbService = Substitute.For<ITmdbService>();
        var logger = Substitute.For<ILogger<GroupRecommendationsService>>();
        var service = new GroupRecommendationsService(context, tmdbService, logger, _cache);

        var user = context.Users.First();

        // Mock source movie
        var sourceMovie = new TmdbMovie
        {
            Id = 550,
            Title = "Fight Club",
            Genres = new List<TmdbGenre>
            {
                new TmdbGenre { Id = 18, Name = "Drama" }
            },
            ReleaseDate = "1999-10-15"
        };

        var sourceCredits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>()
        };

        tmdbService.GetMovieDetailsAsync(550).Returns(sourceMovie);
        tmdbService.GetMovieCreditsAsync(550).Returns(sourceCredits);

        // Mock similar movies with varying quality
        var similarMovies = new TmdbMovieSearchResult
        {
            Results = new List<TmdbMovie>
            {
                new TmdbMovie
                {
                    Id = 1,
                    Title = "High Quality",
                    VoteAverage = 8.0,
                    VoteCount = 10000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                }, // Should be included
                new TmdbMovie
                {
                    Id = 4,
                    Title = "Good Movie",
                    VoteAverage = 7.5,
                    VoteCount = 5000,
                    Genres = new List<TmdbGenre> { new TmdbGenre { Id = 18, Name = "Drama" } }
                } // Should be included
            }
        };

        tmdbService.DiscoverMoviesAsync(Arg.Any<List<int>?>(), Arg.Any<double?>(), Arg.Any<int?>(), Arg.Any<string>(), Arg.Any<int>()).Returns(similarMovies);

        var credits = new TmdbCreditsResult
        {
            Crew = new List<TmdbCrewMember>(),
            Cast = new List<TmdbCastMember>()
        };
        tmdbService.GetMovieCreditsAsync(Arg.Any<int>()).Returns(credits);

        // Act
        var result = await service.GetMovieSimilarRecommendationsAsync(550, user.Id, 12);

        // Assert
        // TMDb Discover API already filters by quality thresholds (min rating 6.0, min votes 200)
        // So we verify the correct parameters are passed to DiscoverMoviesAsync
        await tmdbService.Received().DiscoverMoviesAsync(
            Arg.Any<List<int>?>(),
            Arg.Is<double?>(x => x == 6.0),  // voteAverageMin
            Arg.Is<int?>(x => x == 200),      // voteCountMin
            Arg.Any<string>(),
            Arg.Any<int>());

        result.Should().Contain(r => r.Movie.Id == 1);
        result.Should().Contain(r => r.Movie.Id == 4);
    }
}
