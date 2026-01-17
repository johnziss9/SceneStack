using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;

namespace SceneStack.Tests.Services;

public class PrivacyServiceTests
{
    [Fact]
    public async Task CanViewWatchAsync_Owner_ReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user = context.Users.First();
        var watch = context.Watches.First(w => w.UserId == user.Id);

        // Act
        var result = await service.CanViewWatchAsync(watch.Id, user.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanViewWatchAsync_PrivateWatch_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var owner = context.Users.First();
        var otherUser = context.Users.Skip(1).First();

        // Create a private watch
        var privateWatch = new Watch
        {
            UserId = owner.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            IsPrivate = true,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(privateWatch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.CanViewWatchAsync(privateWatch.Id, otherUser.Id);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanViewWatchAsync_UsersInSameGroup_ShareWatchesTrue_ReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Update user1 privacy settings
        user1.ShareWatches = true;
        await context.SaveChangesAsync();

        // Create a group with both users
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

        // Create a watch for user1
        var watch = new Watch
        {
            UserId = user1.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            IsPrivate = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.CanViewWatchAsync(watch.Id, user2.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanViewWatchAsync_UsersInSameGroup_ShareWatchesFalse_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Update user1 privacy settings
        user1.ShareWatches = false;
        await context.SaveChangesAsync();

        // Create a group with both users
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

        // Create a watch for user1
        var watch = new Watch
        {
            UserId = user1.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            IsPrivate = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.CanViewWatchAsync(watch.Id, user2.Id);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanViewWatchAsync_UsersNotInSameGroup_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Update user1 privacy settings (even with sharing enabled)
        user1.ShareWatches = true;
        await context.SaveChangesAsync();

        // Create a watch for user1 (but users are NOT in the same group)
        var watch = new Watch
        {
            UserId = user1.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            IsPrivate = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.CanViewWatchAsync(watch.Id, user2.Id);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanViewRatingAsync_Owner_ReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user = context.Users.First();
        var watch = context.Watches.First(w => w.UserId == user.Id);

        // Act
        var result = await service.CanViewRatingAsync(watch.Id, user.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanViewRatingAsync_ShareRatingsFalse_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Update user1 privacy settings
        user1.ShareWatches = true;
        user1.ShareRatings = false; // Don't share ratings
        await context.SaveChangesAsync();

        // Create a group with both users
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

        // Create a watch with rating
        var watch = new Watch
        {
            UserId = user1.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            IsPrivate = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.CanViewRatingAsync(watch.Id, user2.Id);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanViewRatingAsync_ShareWatchesAndRatingsTrue_ReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Update user1 privacy settings
        user1.ShareWatches = true;
        user1.ShareRatings = true;
        await context.SaveChangesAsync();

        // Create a group with both users
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

        // Create a watch with rating
        var watch = new Watch
        {
            UserId = user1.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Rating = 9,
            IsPrivate = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.CanViewRatingAsync(watch.Id, user2.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanViewNotesAsync_Owner_ReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user = context.Users.First();
        var watch = context.Watches.First(w => w.UserId == user.Id);

        // Act
        var result = await service.CanViewNotesAsync(watch.Id, user.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanViewNotesAsync_ShareNotesFalse_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Update user1 privacy settings
        user1.ShareWatches = true;
        user1.ShareNotes = false; // Don't share notes
        await context.SaveChangesAsync();

        // Create a group with both users
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

        // Create a watch with notes
        var watch = new Watch
        {
            UserId = user1.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Notes = "Personal thoughts",
            IsPrivate = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.CanViewNotesAsync(watch.Id, user2.Id);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanViewNotesAsync_ShareWatchesAndNotesTrue_ReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Update user1 privacy settings
        user1.ShareWatches = true;
        user1.ShareNotes = true;
        await context.SaveChangesAsync();

        // Create a group with both users
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

        // Create a watch with notes
        var watch = new Watch
        {
            UserId = user1.Id,
            MovieId = 1,
            WatchedDate = DateTime.UtcNow,
            Notes = "Great movie!",
            IsPrivate = false,
            CreatedAt = DateTime.UtcNow
        };
        context.Watches.Add(watch);
        await context.SaveChangesAsync();

        // Act
        var result = await service.CanViewNotesAsync(watch.Id, user2.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task FilterWatchesByPrivacyAsync_MixedPrivacySettings_FiltersCorrectly()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var viewer = context.Users.First();
        var owner1 = context.Users.Skip(1).First();

        // Create a third user
        var owner2 = new User
        {
            Username = "owner2",
            Email = "owner2@test.com",
            IsPremium = false,
            ShareWatches = true,
            ShareRatings = false, // Don't share ratings
            ShareNotes = false,   // Don't share notes
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(owner2);
        await context.SaveChangesAsync();

        // Update owner1 privacy settings
        owner1.ShareWatches = true;
        owner1.ShareRatings = true;
        owner1.ShareNotes = true;
        await context.SaveChangesAsync();

        // Create a group with all users
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
            new GroupMember { GroupId = group.Id, UserId = owner1.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = owner2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Create watches
        var watches = new List<Watch>
        {
            // Viewer's own watch - should be included with all data
            new Watch
            {
                UserId = viewer.Id,
                MovieId = 1,
                WatchedDate = DateTime.UtcNow,
                Rating = 10,
                Notes = "My watch",
                IsPrivate = false,
                CreatedAt = DateTime.UtcNow
            },
            // Owner1's watch - shares everything
            new Watch
            {
                UserId = owner1.Id,
                MovieId = 1,
                WatchedDate = DateTime.UtcNow.AddDays(-1),
                Rating = 9,
                Notes = "Owner1 notes",
                IsPrivate = false,
                CreatedAt = DateTime.UtcNow
            },
            // Owner2's watch - shares watch but not rating/notes
            new Watch
            {
                UserId = owner2.Id,
                MovieId = 1,
                WatchedDate = DateTime.UtcNow.AddDays(-2),
                Rating = 8,
                Notes = "Owner2 notes",
                IsPrivate = false,
                CreatedAt = DateTime.UtcNow
            },
            // Private watch - should be excluded
            new Watch
            {
                UserId = owner1.Id,
                MovieId = 1,
                WatchedDate = DateTime.UtcNow.AddDays(-3),
                Rating = 7,
                IsPrivate = true,
                CreatedAt = DateTime.UtcNow
            }
        };
        context.Watches.AddRange(watches);
        await context.SaveChangesAsync();

        // Reload watches with User navigation property
        var watchesWithUser = await context.Watches
            .Include(w => w.User)
            .Where(w => watches.Select(ww => ww.Id).Contains(w.Id))
            .ToListAsync();

        // Act
        var result = await service.FilterWatchesByPrivacyAsync(watchesWithUser, viewer.Id);

        // Assert
        result.Should().HaveCount(3); // Excludes private watch

        // Check viewer's own watch
        var viewerWatch = result.First(w => w.UserId == viewer.Id);
        viewerWatch.Rating.Should().Be(10);
        viewerWatch.Notes.Should().Be("My watch");

        // Check owner1's watch (full sharing)
        var owner1Watch = result.First(w => w.UserId == owner1.Id);
        owner1Watch.Rating.Should().Be(9);
        owner1Watch.Notes.Should().Be("Owner1 notes");

        // Check owner2's watch (filtered rating and notes)
        var owner2Watch = result.First(w => w.UserId == owner2.Id);
        owner2Watch.Rating.Should().BeNull(); // Filtered out
        owner2Watch.Notes.Should().BeNull();  // Filtered out
    }

    [Fact]
    public async Task AreUsersInSameGroupAsync_UsersShareGroup_ReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Create a group with both users
        var group = new Group
        {
            Name = "Shared Group",
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

        // Act
        var result = await service.AreUsersInSameGroupAsync(user1.Id, user2.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AreUsersInSameGroupAsync_UsersNotInSameGroup_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Create separate groups for each user
        var group1 = new Group
        {
            Name = "User1 Group",
            CreatedById = user1.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var group2 = new Group
        {
            Name = "User2 Group",
            CreatedById = user2.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.AddRange(group1, group2);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group1.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group2.Id, UserId = user2.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.AreUsersInSameGroupAsync(user1.Id, user2.Id);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task AreUsersInSameGroupAsync_UsersShareMultipleGroups_ReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<PrivacyService>>();
        var service = new PrivacyService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        // Create multiple groups with both users
        var group1 = new Group { Name = "Group 1", CreatedById = user1.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var group2 = new Group { Name = "Group 2", CreatedById = user1.Id, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        context.Groups.AddRange(group1, group2);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group1.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group1.Id, UserId = user2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group2.Id, UserId = user1.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group2.Id, UserId = user2.Id, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.AreUsersInSameGroupAsync(user1.Id, user2.Id);

        // Assert
        result.Should().BeTrue();
    }
}