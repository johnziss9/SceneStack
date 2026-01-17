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

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Update privacy settings
        user1.ShareWatches = true;
        user1.ShareRatings = true;
        user2.ShareWatches = true;
        user2.ShareRatings = true;
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

        // Create watches and share with group
        var watch1 = new Watch
        {
            UserId = user1.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            IsPrivate = false,
            CreatedAt = DateTime.UtcNow
        };
        var watch2 = new Watch
        {
            UserId = user2.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow.AddDays(-1),
            Rating = 8,
            IsPrivate = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.AddRange(watch1, watch2);
        await context.SaveChangesAsync();

        // Share watches with group
        context.WatchGroups.AddRange(
            new WatchGroup { WatchId = watch1.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow },
            new WatchGroup { WatchId = watch2.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
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
    public async Task GetGroupFeedAsync_UserNotMember_ReturnsEmpty()
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

        // Act - user2 tries to access (not a member)
        var result = await service.GetGroupFeedAsync(group.Id, user2.Id);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetGroupFeedAsync_PrivateWatchesExcluded()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

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

        // Create watches - one private, one public
        var publicWatch = new Watch
        {
            UserId = user1.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            IsPrivate = false,
            CreatedAt = DateTime.UtcNow
        };
        var privateWatch = new Watch
        {
            UserId = user1.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow.AddDays(-1),
            IsPrivate = true,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.AddRange(publicWatch, privateWatch);
        await context.SaveChangesAsync();

        // Share both with group
        context.WatchGroups.AddRange(
            new WatchGroup { WatchId = publicWatch.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow },
            new WatchGroup { WatchId = privateWatch.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetGroupFeedAsync(group.Id, user2.Id);

        // Assert
        result.Should().HaveCount(1);
        result.First().IsPrivate.Should().BeFalse();
    }

    [Fact]
    public async Task GetGroupFeedAsync_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupFeedService>>();
        var service = new GroupFeedService(context, logger);

        var user = context.Users.First();
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

        // Create 5 watches
        for (int i = 0; i < 5; i++)
        {
            var watch = new Watch
            {
                UserId = user.Id,
                MovieId = 1,
                WatchedDate = DateTime.UtcNow.AddDays(-i),
                IsPrivate = false,
                CreatedAt = DateTime.UtcNow
            };
            context.Watches.Add(watch);
            await context.SaveChangesAsync();

            context.WatchGroups.Add(
                new WatchGroup { WatchId = watch.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
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

        // Create watch with rating and notes
        var watch = new Watch
        {
            UserId = owner.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            Notes = "Private thoughts",
            IsPrivate = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        context.WatchGroups.Add(
            new WatchGroup { WatchId = watch.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
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

        // Create watches in each group
        var watch1 = new Watch { UserId = otherUser1.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, IsPrivate = false, CreatedAt = DateTime.UtcNow };
        var watch2 = new Watch { UserId = otherUser2.Id, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-1), IsPrivate = false, CreatedAt = DateTime.UtcNow };
        context.Watches.AddRange(watch1, watch2);
        await context.SaveChangesAsync();

        context.WatchGroups.AddRange(
            new WatchGroup { WatchId = watch1.Id, GroupId = group1.Id, SharedAt = DateTime.UtcNow },
            new WatchGroup { WatchId = watch2.Id, GroupId = group2.Id, SharedAt = DateTime.UtcNow }
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

        // Create one watch shared with both groups
        var watch = new Watch { UserId = otherUser.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, IsPrivate = false, CreatedAt = DateTime.UtcNow };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Share same watch with both groups
        context.WatchGroups.AddRange(
            new WatchGroup { WatchId = watch.Id, GroupId = group1.Id, SharedAt = DateTime.UtcNow },
            new WatchGroup { WatchId = watch.Id, GroupId = group2.Id, SharedAt = DateTime.UtcNow }
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

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        user1.ShareWatches = true;
        user2.ShareWatches = true;
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

        // Add a second movie
        var movie2 = new Movie
        {
            TmdbId = 551,
            Title = "The Matrix",
            Year = 1999,
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie2);
        await context.SaveChangesAsync();

        // Create watches for both movies
        var watches = new[]
        {
            new Watch { UserId = user1.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, Rating = 9, IsPrivate = false, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = user2.Id, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-1), Rating = 10, IsPrivate = false, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = user1.Id, MovieId = movie2.Id, WatchedDate = DateTime.UtcNow.AddDays(-2), Rating = 8, IsPrivate = false, CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Share all watches with group
        foreach (var watch in watches)
        {
            context.WatchGroups.Add(
                new WatchGroup { WatchId = watch.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
            );
        }
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
}