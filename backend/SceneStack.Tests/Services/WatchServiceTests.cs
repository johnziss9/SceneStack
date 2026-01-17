using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;

namespace SceneStack.Tests.Services;

public class WatchServiceTests
{
    [Fact]
    public async Task GetByIdAsync_ExistingWatch_ReturnsWatch()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Create a test user first
        var user = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Add a test watch
        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            Notes = "Great movie",
            IsRewatch = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetByIdAsync(watch.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Rating.Should().Be(9);
        result.Notes.Should().Be("Great movie");
        result.Movie.Should().NotBeNull();
        result.User.Should().NotBeNull();
    }

    [Fact]
    public async Task GetByIdAsync_NonExistentWatch_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Act
        var result = await service.GetByIdAsync(999);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetByIdAsync_SoftDeletedWatch_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Create a test user first
        var user = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Add and soft delete a watch
        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 8,
            IsRewatch = false,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = true,
            DeletedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetByIdAsync(watch.Id);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllAsync_NoFilter_ReturnsAllWatches()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Create a test user first
        var user = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Add multiple watches
        var watches = new[]
        {
            new Watch { UserId = user.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, IsRewatch = false, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = user.Id, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-1), IsRewatch = true, CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetAllAsync();

        // Assert
        result.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetAllAsync_WithUserIdFilter_ReturnsOnlyUserWatches()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Create two users
        var user1 = new User
        {
            Username = "user1",
            Email = "user1@test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        var user2 = new User
        {
            Username = "user2",
            Email = "user2@test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Users.AddRange(user1, user2);
        await context.SaveChangesAsync();

        // Add watches for different users
        var watches = new[]
        {
            new Watch { UserId = user1.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, IsRewatch = false, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = user2.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, IsRewatch = false, CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetAllAsync(userId: user1.Id);

        // Assert
        result.Should().HaveCount(1);
        result.First().UserId.Should().Be(user1.Id);
    }

    [Fact]
    public async Task CreateAsync_ValidWatch_CreatesWatch()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Create a test user first
        var user = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var newWatch = new Watch
        {
            UserId = user.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 10,
            Notes = "Amazing!",
            WatchLocation = "Cinema",
            WatchedWith = "Friends",
            IsRewatch = false,
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await service.CreateAsync(newWatch, new List<int>());

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().BeGreaterThan(0);
        result.Rating.Should().Be(10);
        result.Notes.Should().Be("Amazing!");
        result.WatchLocation.Should().Be("Cinema");
        result.WatchedWith.Should().Be("Friends");

        // Verify in database
        var watchInDb = await context.Watches.FindAsync(result.Id);
        watchInDb.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateAsync_ExistingWatch_UpdatesWatch()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Create a test user first
        var user = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Create a watch
        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 7,
            Notes = "Good",
            IsRewatch = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Prepare update
        var updatedWatch = new Watch
        {
            WatchedDate = DateTime.UtcNow.AddDays(-5),
            Rating = 9,
            Notes = "Actually amazing on rewatch!",
            WatchLocation = "Home",
            IsRewatch = true
        };

        // Act
        var result = await service.UpdateAsync(watch.Id, updatedWatch);

        // Assert
        result.Should().NotBeNull();
        result!.Rating.Should().Be(9);
        result.Notes.Should().Be("Actually amazing on rewatch!");
        result.WatchLocation.Should().Be("Home");
        result.IsRewatch.Should().BeTrue();

        // Verify in database
        var watchInDb = await context.Watches.FindAsync(watch.Id);
        watchInDb!.Rating.Should().Be(9);
    }

    [Fact]
    public async Task UpdateAsync_NonExistentWatch_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        var updatedWatch = new Watch
        {
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            IsRewatch = false
        };

        // Act
        var result = await service.UpdateAsync(999, updatedWatch);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_ExistingWatch_SoftDeletesWatch()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Create a test user first
        var user = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Create a watch
        var watch = new Watch
        {
            UserId = user.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            IsRewatch = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.DeleteAsync(watch.Id);

        // Assert
        result.Should().BeTrue();

        // Verify soft delete
        var deletedWatch = await context.Watches
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(w => w.Id == watch.Id);
        deletedWatch.Should().NotBeNull();
        deletedWatch!.IsDeleted.Should().BeTrue();
        deletedWatch.DeletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task DeleteAsync_NonExistentWatch_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Act
        var result = await service.DeleteAsync(999);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GetByMovieIdAsync_ReturnsWatchesForMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Create a test user first
        var user = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Add multiple watches for same movie
        var watches = new[]
        {
            new Watch { UserId = user.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, Rating = 8, IsRewatch = false, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = user.Id, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-10), Rating = 9, IsRewatch = true, CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetByMovieIdAsync(movieId: 1, userId: user.Id);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(w => w.MovieId.Should().Be(1));
        result.Should().AllSatisfy(w => w.UserId.Should().Be(user.Id));
        // Should be ordered by most recent first
        result.First().Rating.Should().Be(8);
        result.Last().Rating.Should().Be(9);
    }

    [Fact]
    public async Task GetGroupedWatchesAsync_ReturnsGroupedWatchesByMovie()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        // Create a test user first
        var user = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Add another movie
        var movie2 = new Movie
        {
            Id = 2,
            TmdbId = 551,
            Title = "The Matrix",
            Year = 1999,
            CreatedAt = DateTime.UtcNow
        };
        context.Movies.Add(movie2);

        // Add multiple watches for different movies
        var watches = new[]
        {
            // Fight Club - watched twice
            new Watch { UserId = user.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, Rating = 9, IsRewatch = false, CreatedAt = DateTime.UtcNow },
            new Watch { UserId = user.Id, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-10), Rating = 10, IsRewatch = true, CreatedAt = DateTime.UtcNow },
            // The Matrix - watched once
            new Watch { UserId = user.Id, MovieId = 2, WatchedDate = DateTime.UtcNow.AddDays(-5), Rating = 8, IsRewatch = false, CreatedAt = DateTime.UtcNow }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetGroupedWatchesAsync(userId: user.Id);

        // Assert
        result.Should().HaveCount(2); // Two unique movies

        // Check Fight Club group
        var fightClubGroup = result.First(g => g.MovieId == 1);
        fightClubGroup.WatchCount.Should().Be(2);
        fightClubGroup.AverageRating.Should().Be(9.5); // (9 + 10) / 2
        fightClubGroup.LatestRating.Should().Be(9); // Most recent watch
        fightClubGroup.Watches.Should().HaveCount(2);
        fightClubGroup.Movie.Title.Should().Be("Fight Club");

        // Check The Matrix group
        var matrixGroup = result.First(g => g.MovieId == 2);
        matrixGroup.WatchCount.Should().Be(1);
        matrixGroup.AverageRating.Should().Be(8);
        matrixGroup.LatestRating.Should().Be(8);
        matrixGroup.Watches.Should().HaveCount(1);
        matrixGroup.Movie.Title.Should().Be("The Matrix");
    }

    [Fact]
    public async Task GetAllAsync_WithGroupIdFilter_ReturnsOnlyGroupWatches()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        var user = context.Users.First();

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

        // Create watches
        var watch1 = new Watch { UserId = user.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, CreatedAt = DateTime.UtcNow };
        var watch2 = new Watch { UserId = user.Id, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-1), CreatedAt = DateTime.UtcNow };
        context.Watches.AddRange(watch1, watch2);
        await context.SaveChangesAsync();

        // Share only watch1 with group
        context.WatchGroups.Add(new WatchGroup { WatchId = watch1.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetAllAsync(userId: null, groupId: group.Id);

        // Assert
        result.Should().HaveCount(1);
        result.First().Id.Should().Be(watch1.Id);
    }

    [Fact]
    public async Task CreateAsync_WithGroupIds_AssociatesWatchWithGroups()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        var user = context.Users.First();

        // Create groups
        var group1 = new Group { Name = "Group 1", CreatedById = user.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var group2 = new Group { Name = "Group 2", CreatedById = user.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        context.Groups.AddRange(group1, group2);
        await context.SaveChangesAsync();

        // Add user as member of both groups
        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group1.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group2.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        var newWatch = new Watch
        {
            UserId = user.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            CreatedAt = DateTime.UtcNow
        };

        var groupIds = new List<int> { group1.Id, group2.Id };

        // Act
        var result = await service.CreateAsync(newWatch, groupIds);

        // Assert
        result.Should().NotBeNull();

        // Verify watch is associated with both groups
        var watchGroups = await context.WatchGroups
            .Where(wg => wg.WatchId == result.Id)
            .ToListAsync();
        watchGroups.Should().HaveCount(2);
        watchGroups.Should().Contain(wg => wg.GroupId == group1.Id);
        watchGroups.Should().Contain(wg => wg.GroupId == group2.Id);
    }

    [Fact]
    public async Task CreateAsync_WithGroupIds_OnlyAssociatesIfUserIsMember()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        var user = context.Users.First();
        var otherUser = context.Users.Skip(1).First();

        // Create groups
        var userGroup = new Group { Name = "User Group", CreatedById = user.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var otherGroup = new Group { Name = "Other Group", CreatedById = otherUser.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        context.Groups.AddRange(userGroup, otherGroup);
        await context.SaveChangesAsync();

        // User is only member of userGroup
        context.GroupMembers.AddRange(
            new GroupMember { GroupId = userGroup.Id, UserId = user.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = otherGroup.Id, UserId = otherUser.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        var newWatch = new Watch
        {
            UserId = user.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };

        // Try to share with both groups (user not member of otherGroup)
        var groupIds = new List<int> { userGroup.Id, otherGroup.Id };

        // Act
        var result = await service.CreateAsync(newWatch, groupIds);

        // Assert
        var watchGroups = await context.WatchGroups
            .Where(wg => wg.WatchId == result.Id)
            .ToListAsync();

        // Should only be associated with userGroup
        watchGroups.Should().HaveCount(1);
        watchGroups.First().GroupId.Should().Be(userGroup.Id);
    }

    [Fact]
    public async Task GetGroupFeedAsync_UserIsMember_ReturnsWatches()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Update privacy settings
        user1.ShareWatches = true;
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

        // Create watches and share with group
        var watch1 = new Watch { UserId = user1.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, IsPrivate = false, CreatedAt = DateTime.UtcNow };
        var watch2 = new Watch { UserId = user2.Id, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-1), IsPrivate = false, CreatedAt = DateTime.UtcNow };
        context.Watches.AddRange(watch1, watch2);
        await context.SaveChangesAsync();

        context.WatchGroups.AddRange(
            new WatchGroup { WatchId = watch1.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow },
            new WatchGroup { WatchId = watch2.Id, GroupId = group.Id, SharedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetGroupFeedAsync(group.Id, user1.Id);

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetGroupFeedAsync_UserNotMember_ReturnsEmpty()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

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
        var logger = Substitute.For<ILogger<WatchService>>();
        var service = new WatchService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

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
        var publicWatch = new Watch { UserId = user1.Id, MovieId = 1, WatchedDate = DateTime.UtcNow, IsPrivate = false, CreatedAt = DateTime.UtcNow };
        var privateWatch = new Watch { UserId = user1.Id, MovieId = 1, WatchedDate = DateTime.UtcNow.AddDays(-1), IsPrivate = true, CreatedAt = DateTime.UtcNow };
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
        result.Should().HaveCount(1); // Only public watch
        result.First().IsPrivate.Should().BeFalse();
    }
}