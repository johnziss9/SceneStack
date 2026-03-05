using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;

namespace SceneStack.Tests.Services;

public class GroupFeedServiceTests
{
    [Fact]
    public async Task GetGroupFeedAsync_UserIsMember_ReturnsWatches()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        // Use second user to avoid conflict with seeded watch (user1 + movie1)
        var user1 = context.Users.Skip(1).First();

        // Create a third user
        var user2 = new User
        {
            Username = "user3",
            Email = "user3@example.com",
            IsPremium = false,
            ShareWatches = true,
            ShareRatings = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(user2);
        await context.SaveChangesAsync();

        // Update privacy settings
        user1.ShareWatches = true;
        user1.ShareRatings = true;
        await context.SaveChangesAsync();

        // Create a group
        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = user2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Create a new movie to avoid conflict with seeded movie
        var movie = new Movie
        {
            TmdbId = 999,
            Title = "Test Movie",
            Year = 2024,
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        // Create watches and share with group
        var watch1 = new Watch
        {
            UserId = user1.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            CreatedAt = DateTime.UtcNow
        };
        var watch2 = new Watch
        {
            UserId = user2.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-1),
            Rating = 8,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.AddRange(watch1, watch2);
        await context.SaveChangesAsync();

        // Share movie with group (both watches are for the same movie)
        context.MovieGroups.Add(
            new MovieGroup { MovieId = movie.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetGroupFeedAsync(group.Id, user1.Id);

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(w => w.UserId == user1.Id);
        result.Should().Contain(w => w.UserId == user2.Id);
    }

    [Fact]
    public async Task GetGroupFeedAsync_UserNotMember_ThrowsUnauthorized()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Create a group with only user1
        var group = new Group
        {
            Name = "Private Group",
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

        // Act & Assert - user2 tries to access (not a member), service throws
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => service.GetGroupFeedAsync(group.Id, user2.Id));
    }

    [Fact]
    public async Task GetGroupFeedAsync_PrivateWatchesExcluded()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        // Use second user to avoid conflict with seeded watch
        var user1 = context.Users.Skip(1).First();

        // Create a third user
        var user2 = new User
        {
            Username = "user3",
            Email = "user3@example.com",
            IsPremium = false,
            ShareWatches = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(user2);
        await context.SaveChangesAsync();

        // Update privacy settings
        user1.ShareWatches = true;
        await context.SaveChangesAsync();

        // Create a group
        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = user2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Create two movies - one public (shared with group), one private
        var publicMovie = new Movie { TmdbId = 100, Title = "Public Movie", Year = 2020, CreatedAt = DateTime.UtcNow };
        var privateMovie = new Movie { TmdbId = 101, Title = "Private Movie", Year = 2021, CreatedAt = DateTime.UtcNow, IsPrivate = true };
        context.Movies.AddRange(publicMovie, privateMovie);
        await context.SaveChangesAsync();

        // Create watches for both movies
        var publicWatch = new Watch
        {
            UserId = user1.Id,
            MovieId = publicMovie.Id,
            WatchedDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        var privateWatch = new Watch
        {
            UserId = user1.Id,
            MovieId = privateMovie.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.AddRange(publicWatch, privateWatch);
        await context.SaveChangesAsync();

        // Share only the public movie with group
        context.MovieGroups.Add(
            new MovieGroup { MovieId = publicMovie.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetGroupFeedAsync(group.Id, user2.Id);

        // Assert - only public movie should appear
        result.Should().HaveCount(1);
        result.First().MovieId.Should().Be(publicMovie.Id);
    }

    [Fact]
    public async Task GetGroupFeedAsync_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        // Use second user to avoid conflict with seeded data
        var user = context.Users.Skip(1).First();
        user.ShareWatches = true;
        await context.SaveChangesAsync();

        // Create a group
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

        // Create 5 different movies and watches for pagination test
        for (int i = 0; i < 5; i++)
        {
            var movie = new Movie
            {
                TmdbId = 1000 + i,
                Title = $"Movie {i}",
                Year = 2020 + i,
                CreatedAt = DateTime.UtcNow
            };
            context.Movies.Add(movie);
            await context.SaveChangesAsync();

            var watch = new Watch
            {
                UserId = user.Id,
                MovieId = movie.Id,
                WatchedDate = DateTime.UtcNow.AddDays(-i),
                CreatedAt = DateTime.UtcNow
            };
            context.Watches.Add(watch);
            await context.SaveChangesAsync();

            context.MovieGroups.Add(
                new MovieGroup { MovieId = movie.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
            );
        }
        await context.SaveChangesAsync();

        // Act - Get first 2
        var page1 = await service.GetGroupFeedAsync(group.Id, user.Id, skip: 0, take: 2);
        var page2 = await service.GetGroupFeedAsync(group.Id, user.Id, skip: 2, take: 2);

        // Assert
        page1.Should().HaveCount(2);
        page2.Should().HaveCount(2);
        page1.First().Id.Should().NotBe(page2.First().Id);
    }

    [Fact]
    public async Task GetGroupFeedAsync_AppliesPrivacyFilters()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var viewer = context.Users.First();
        var owner = context.Users.Skip(1).First();

        // Owner shares watches but not ratings or notes
        owner.ShareWatches = true;
        owner.ShareRatings = false;
        owner.ShareNotes = false;
        await context.SaveChangesAsync();

        // Create a group
        var group = new Group
        {
            Name = "Test Group",
            CreatedById = viewer.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group.Id, UserId = viewer.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = owner.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Create a new movie to avoid conflict with seeded movie
        var movie = new Movie
        {
            TmdbId = 999,
            Title = "Privacy Test Movie",
            Year = 2024,
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        // Create watch with rating and notes
        var watch = new Watch
        {
            UserId = owner.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            Notes = "Private thoughts",
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        context.MovieGroups.Add(
            new MovieGroup { MovieId = movie.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetGroupFeedAsync(group.Id, viewer.Id);

        // Assert
        result.Should().HaveCount(1);
        result.First().Rating.Should().BeNull(); // Rating filtered
        result.First().Notes.Should().BeNull();  // Notes filtered
    }

    [Fact]
    public async Task GetCombinedFeedAsync_UserInMultipleGroups_ReturnsCombinedFeed()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user = context.Users.First();
        var otherUser1 = context.Users.Skip(1).First();

        // Create second user
        var otherUser2 = new User
        {
            Username = "user3",
            Email = "user3@test.com",
            IsPremium = false,
            ShareWatches = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(otherUser2);
        await context.SaveChangesAsync();

        otherUser1.ShareWatches = true;
        await context.SaveChangesAsync();

        // Create two groups
        var group1 = new Group { Name = "Group 1", CreatedById = user.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var group2 = new Group { Name = "Group 2", CreatedById = user.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        context.Groups.AddRange(group1, group2);
        await context.SaveChangesAsync();

        // Add user to both groups
        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group1.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group1.Id, UserId = otherUser1.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group2.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group2.Id, UserId = otherUser2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Create different movies to avoid conflicts with seeded data
        var movie1 = new Movie { TmdbId = 1001, Title = "Movie 1", Year = 2024, CreatedAt = DateTime.UtcNow };
        var movie2 = new Movie { TmdbId = 1002, Title = "Movie 2", Year = 2024, CreatedAt = DateTime.UtcNow };
        context.Movies.AddRange(movie1, movie2);
        await context.SaveChangesAsync();

        // Create watches in each group
        var watch1 = new Watch { UserId = otherUser1.Id, MovieId = movie1.Id, WatchedDate = DateTime.UtcNow, CreatedAt = DateTime.UtcNow };
        var watch2 = new Watch { UserId = otherUser2.Id, MovieId = movie2.Id, WatchedDate = DateTime.UtcNow.AddDays(-1), CreatedAt = DateTime.UtcNow };
        context.Watches.AddRange(watch1, watch2);
        await context.SaveChangesAsync();

        context.MovieGroups.AddRange(
            new MovieGroup { MovieId = movie1.Id, GroupId = group1.Id, SharedAt = DateTime.UtcNow },
            new MovieGroup { MovieId = movie2.Id, GroupId = group2.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetCombinedFeedAsync(user.Id);

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(w => w.UserId == otherUser1.Id);
        result.Should().Contain(w => w.UserId == otherUser2.Id);
    }

    [Fact]
    public async Task GetCombinedFeedAsync_UserNotInAnyGroups_ReturnsEmpty()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        // Create a new user not in any groups
        var loneUser = new User
        {
            Username = "loneuser",
            Email = "lone@test.com",
            IsPremium = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(loneUser);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetCombinedFeedAsync(loneUser.Id);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetCombinedFeedAsync_DuplicateWatchInMultipleGroups_ReturnsOnce()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user = context.Users.First();
        var otherUser = context.Users.Skip(1).First();

        otherUser.ShareWatches = true;
        await context.SaveChangesAsync();

        // Create two groups
        var group1 = new Group { Name = "Group 1", CreatedById = user.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var group2 = new Group { Name = "Group 2", CreatedById = user.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        context.Groups.AddRange(group1, group2);
        await context.SaveChangesAsync();

        // Add user to both groups
        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group1.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group1.Id, UserId = otherUser.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group2.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group2.Id, UserId = otherUser.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Create a new movie to avoid conflict with seeded movie
        var movie = new Movie { TmdbId = 1003, Title = "Duplicate Test Movie", Year = 2024, CreatedAt = DateTime.UtcNow };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        // Create one watch shared with both groups
        var watch = new Watch { UserId = otherUser.Id, MovieId = movie.Id, WatchedDate = DateTime.UtcNow, CreatedAt = DateTime.UtcNow };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Share same movie with both groups
        context.MovieGroups.AddRange(
            new MovieGroup { MovieId = movie.Id, GroupId = group1.Id, SharedAt = DateTime.UtcNow },
            new MovieGroup { MovieId = movie.Id, GroupId = group2.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetCombinedFeedAsync(user.Id);

        // Assert
        result.Should().HaveCount(1); // Should only appear once despite being in 2 groups
    }

    [Fact]
    public async Task GetFeedWithStatsAsync_ReturnsStatsAndFeed()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        // Use second user to avoid conflict with seeded data
        var user1 = context.Users.Skip(1).First();

        // Create a third user
        var user2 = new User
        {
            Username = "user3",
            Email = "user3@example.com",
            IsPremium = false,
            ShareWatches = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(user2);
        await context.SaveChangesAsync();

        user1.ShareWatches = true;
        await context.SaveChangesAsync();

        // Create a group
        var group = new Group
        {
            Name = "Movie Club",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = user2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Create new movies to avoid conflicts
        var movie1 = new Movie { TmdbId = 1001, Title = "Movie 1", Year = 2024, CreatedAt = DateTime.UtcNow };
        var movie2 = new Movie { TmdbId = 1002, Title = "Movie 2", Year = 2024, CreatedAt = DateTime.UtcNow };
        context.Movies.AddRange(movie1, movie2);
        await context.SaveChangesAsync();

        // Create watches for both movies
        var watches = new[]
        {
            new Watch { UserId = user1.Id, MovieId = movie1.Id, WatchedDate = DateTime.UtcNow, Rating = 9, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = user2.Id, MovieId = movie1.Id, WatchedDate = DateTime.UtcNow.AddDays(-1), Rating = 10, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = user1.Id, MovieId = movie2.Id, WatchedDate = DateTime.UtcNow.AddDays(-2), Rating = 8, CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Share both movies with group (not each watch individually)
        context.MovieGroups.AddRange(
            new MovieGroup { MovieId = movie1.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow },
            new MovieGroup { MovieId = movie2.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetFeedWithStatsAsync(group.Id, user1.Id);

        // Assert
        result.Should().NotBeNull();
        result.GroupId.Should().Be(group.Id);
        result.GroupName.Should().Be("Movie Club");
        result.TotalWatches.Should().Be(3);
        result.UniqueMovies.Should().Be(2);
        result.ActiveMembers.Should().Be(2); // Both users have watched movies
        result.AverageGroupRating.Should().Be(9.0); // (9+10+8)/3
        result.Watches.Should().HaveCount(3);
        result.TopMovies.Should().HaveCount(2);
        result.TopMovies.First().WatchCount.Should().Be(2); // Fight Club watched twice
    }

    [Fact]
    public async Task GetFeedWithStatsAsync_UserNotMember_ReturnsUnauthorized()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Create a group with only user1
        var group = new Group
        {
            Name = "Private Group",
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

        // Act - user2 tries to access
        var result = await service.GetFeedWithStatsAsync(group.Id, user2.Id);

        // Assert
        result.Should().NotBeNull();
        result.GroupName.Should().Be("Unauthorized");
        result.Watches.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMemberWatchesInGroupAsync_ValidRequest_ReturnsMemberWatches()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Update privacy settings
        user2.ShareWatches = true;
        user2.ShareRatings = true;
        user2.ShareNotes = true;
        await context.SaveChangesAsync();

        // Create a group
        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = user2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow.AddDays(-5) }
        );
        await context.SaveChangesAsync();

        // Create movies
        var movie1 = new Movie { TmdbId = 1001, Title = "Movie 1", Year = 2024, CreatedAt = DateTime.UtcNow };
        var movie2 = new Movie { TmdbId = 1002, Title = "Movie 2", Year = 2024, CreatedAt = DateTime.UtcNow };
        context.Movies.AddRange(movie1, movie2);
        await context.SaveChangesAsync();

        // Create watches for user2
        var watch1 = new Watch
        {
            UserId = user2.Id,
            MovieId = movie1.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            Notes = "Great movie!",
            CreatedAt = DateTime.UtcNow
        };
        var watch2 = new Watch
        {
            UserId = user2.Id,
            MovieId = movie2.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-1),
            Rating = 8,
            Notes = "Good watch",
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.AddRange(watch1, watch2);
        await context.SaveChangesAsync();

        // Share movies with group
        context.MovieGroups.AddRange(
            new MovieGroup { MovieId = movie1.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow },
            new MovieGroup { MovieId = movie2.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetMemberWatchesInGroupAsync(group.Id, user2.Id, user1.Id);

        // Assert
        result.Should().NotBeNull();
        result.GroupId.Should().Be(group.Id);
        result.GroupName.Should().Be("Test Group");
        result.TargetUserId.Should().Be(user2.Id);
        result.TargetUsername.Should().Be(user2.Username);
        result.TargetRole.Should().Be("Member");
        result.Items.Should().HaveCount(2);
        result.Items.First().MovieTitle.Should().Be("Movie 1"); // Most recent first
        result.Items.First().Rating.Should().Be(9);
        result.Items.First().Notes.Should().Be("Great movie!");
    }

    [Fact]
    public async Task GetMemberWatchesInGroupAsync_RequestingUserNotMember_ThrowsUnauthorized()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Create a group with only user1
        var group = new Group
        {
            Name = "Private Group",
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

        // Act & Assert - user2 tries to access
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            async () => await service.GetMemberWatchesInGroupAsync(group.Id, user1.Id, user2.Id)
        );
    }

    [Fact]
    public async Task GetMemberWatchesInGroupAsync_TargetUserNotMember_ThrowsKeyNotFound()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Create a group with only user1
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

        // Act & Assert - user1 tries to view user2 who is not in the group
        await Assert.ThrowsAsync<KeyNotFoundException>(
            async () => await service.GetMemberWatchesInGroupAsync(group.Id, user2.Id, user1.Id)
        );
    }

    [Fact]
    public async Task GetMemberWatchesInGroupAsync_PrivacyFiltersApplied_HidesRatingsAndNotes()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // User2 shares watches but NOT ratings and notes
        user2.ShareWatches = true;
        user2.ShareRatings = false;
        user2.ShareNotes = false;
        await context.SaveChangesAsync();

        // Create a group
        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = user2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Create movie
        var movie = new Movie { TmdbId = 1001, Title = "Movie 1", Year = 2024, CreatedAt = DateTime.UtcNow };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        // Create watch for user2
        var watch = new Watch
        {
            UserId = user2.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            Notes = "Secret notes",
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Share movie with group
        context.MovieGroups.Add(
            new MovieGroup { MovieId = movie.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetMemberWatchesInGroupAsync(group.Id, user2.Id, user1.Id);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(1);
        result.Items.First().Rating.Should().BeNull(); // Rating hidden
        result.Items.First().Notes.Should().BeNull(); // Notes hidden
    }

    [Fact]
    public async Task GetMemberWatchesInGroupAsync_ViewingOwnProfile_ShowsAllContent()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user1 = context.Users.First();

        // User1 has privacy disabled
        user1.ShareWatches = false;
        user1.ShareRatings = false;
        user1.ShareNotes = false;
        await context.SaveChangesAsync();

        // Create a group
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

        // Create movie
        var movie = new Movie { TmdbId = 1001, Title = "Movie 1", Year = 2024, CreatedAt = DateTime.UtcNow };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        // Create watch for user1
        var watch = new Watch
        {
            UserId = user1.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            Notes = "My notes",
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Share movie with group
        context.MovieGroups.Add(
            new MovieGroup { MovieId = movie.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act - user1 views their own profile
        var result = await service.GetMemberWatchesInGroupAsync(group.Id, user1.Id, user1.Id);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(1);
        result.Items.First().Rating.Should().Be(9); // Rating visible
        result.Items.First().Notes.Should().Be("My notes"); // Notes visible
    }

    [Fact]
    public async Task GetMemberWatchesInGroupAsync_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        user2.ShareWatches = true;
        await context.SaveChangesAsync();

        // Create a group
        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = user2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Create 25 movies and watches
        var movies = Enumerable.Range(1, 25).Select(i => new Movie
        {
            TmdbId = 2000 + i,
            Title = $"Movie {i}",
            Year = 2024,
            CreatedAt = DateTime.UtcNow
        }).ToList();
        context.Movies.AddRange(movies);
        await context.SaveChangesAsync();

        var watches = movies.Select((m, i) => new Watch
        {
            UserId = user2.Id,
            MovieId = m.Id,
            WatchedDate = DateTime.UtcNow.AddDays(-i), // Most recent first
            Rating = 8,
            CreatedAt = DateTime.UtcNow
        }).ToList();
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Share all movies with group
        var movieGroups = movies.Select(m => new MovieGroup
        {
            MovieId = m.Id,
            GroupId = group.Id,
            SharedAt = DateTime.UtcNow
        }).ToList();
        context.MovieGroups.AddRange(movieGroups);
        await context.SaveChangesAsync();

        // Act - Get first page
        var result = await service.GetMemberWatchesInGroupAsync(group.Id, user2.Id, user1.Id, skip: 0, take: 10);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().HaveCount(10);
        result.HasMore.Should().BeTrue();
        result.TotalCount.Should().Be(25);
        result.Items.First().MovieTitle.Should().Be("Movie 1"); // Most recent

        // Act - Get second page
        var result2 = await service.GetMemberWatchesInGroupAsync(group.Id, user2.Id, user1.Id, skip: result.NextSkip, take: 10);

        // Assert
        result2.Items.Should().HaveCount(10);
        result2.HasMore.Should().BeTrue();
        result2.Items.First().MovieTitle.Should().Be("Movie 11");
    }

    [Fact]
    public async Task GetMemberWatchesInGroupAsync_DeactivatedUser_ReturnsWithFlag()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Deactivate user2
        user2.IsDeactivated = true;
        user2.ShareWatches = true;
        await context.SaveChangesAsync();

        // Create a group
        var group = new Group
        {
            Name = "Test Group",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = user2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Create movie
        var movie = new Movie { TmdbId = 1001, Title = "Movie 1", Year = 2024, CreatedAt = DateTime.UtcNow };
        context.Movies.Add(movie);
        await context.SaveChangesAsync();

        // Create watch
        var watch = new Watch
        {
            UserId = user2.Id,
            MovieId = movie.Id,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Share movie with group
        context.MovieGroups.Add(
            new MovieGroup { MovieId = movie.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetMemberWatchesInGroupAsync(group.Id, user2.Id, user1.Id);

        // Assert
        result.Should().NotBeNull();
        result.IsTargetDeactivated.Should().BeTrue();
        result.Items.Should().HaveCount(1); // Still shows watches
    }
}