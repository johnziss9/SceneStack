using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Data;
using SceneStack.API.DTOs;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;
using Xunit;

namespace SceneStack.Tests.Services;

public class UserServiceAccountTests
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<UserService> _logger;
    private readonly UserService _userService;

    public UserServiceAccountTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new TestApplicationDbContext(options);

        // Setup UserManager mock
        var userStore = Substitute.For<IUserStore<ApplicationUser>>();
        _userManager = Substitute.For<UserManager<ApplicationUser>>(
            userStore, null, null, null, null, null, null, null, null);

        // Setup Logger mock
        _logger = Substitute.For<ILogger<UserService>>();

        _userService = new UserService(_context, _userManager, _logger);
    }

    [Fact]
    public async Task DeactivateAccountAsync_WithValidUser_ShouldDeactivateAccount()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com",
            IsDeactivated = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _userService.DeactivateAccountAsync(1);

        // Assert
        result.Should().BeTrue();
        var updatedUser = await _context.Users.FindAsync(1);
        updatedUser!.IsDeactivated.Should().BeTrue();
        updatedUser.DeactivatedAt.Should().NotBeNull();
        updatedUser.DeactivatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task DeactivateAccountAsync_WithNonExistentUser_ShouldReturnFalse()
    {
        // Act
        var result = await _userService.DeactivateAccountAsync(999);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task ReactivateAccountAsync_WithDeactivatedUser_ShouldReactivateAccount()
    {
        // Arrange
        var user = new User
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com",
            IsDeactivated = true,
            DeactivatedAt = DateTime.UtcNow.AddDays(-5),
            PendingGroupActions = "[{\"groupId\":1,\"action\":\"delete\"}]",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _userService.ReactivateAccountAsync(1);

        // Assert
        result.Should().BeTrue();
        var updatedUser = await _context.Users.FindAsync(1);
        updatedUser!.IsDeactivated.Should().BeFalse();
        updatedUser.DeactivatedAt.Should().BeNull();
        updatedUser.PendingGroupActions.Should().BeNull();
    }

    [Fact]
    public async Task GetCreatedGroupsWithTransferEligibilityAsync_ShouldExcludeDeactivatedMembers()
    {
        // Arrange
        var creator = new User
        {
            Id = 1,
            Username = "creator",
            Email = "creator@test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var activeMember = new User
        {
            Id = 2,
            Username = "active",
            Email = "active@test.com",
            IsPremium = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var deactivatedMember = new User
        {
            Id = 3,
            Username = "deactivated",
            Email = "deactivated@test.com",
            IsDeactivated = true,
            DeactivatedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var deletedMember = new User
        {
            Id = 4,
            Username = "deleted",
            Email = "deleted@test.com",
            IsDeleted = true,
            DeletedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.AddRange(creator, activeMember, deactivatedMember, deletedMember);

        var group = new Group
        {
            Id = 1,
            Name = "Test Group",
            CreatedById = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Groups.Add(group);

        var members = new List<GroupMember>
        {
            new GroupMember { GroupId = 1, UserId = 1, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = 1, UserId = 2, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = 1, UserId = 3, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = 1, UserId = 4, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        };
        _context.GroupMembers.AddRange(members);
        await _context.SaveChangesAsync();

        // Act
        var result = await _userService.GetCreatedGroupsWithTransferEligibilityAsync(1);

        // Assert
        result.Should().HaveCount(1);
        var groupResult = result.First();
        groupResult.EligibleMembers.Should().HaveCount(1); // Only active member
        groupResult.EligibleMembers.First().Username.Should().Be("active");
        groupResult.CanTransfer.Should().BeTrue();
    }

    [Fact]
    public async Task ManageGroupsBeforeDeletionAsync_ShouldRejectTransferToDeactivatedUser()
    {
        // Arrange
        var creator = new User
        {
            Id = 1,
            Username = "creator",
            Email = "creator@test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var deactivatedMember = new User
        {
            Id = 2,
            Username = "deactivated",
            Email = "deactivated@test.com",
            IsDeactivated = true,
            DeactivatedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.AddRange(creator, deactivatedMember);

        var group = new Group
        {
            Id = 1,
            Name = "Test Group",
            CreatedById = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Groups.Add(group);

        var members = new List<GroupMember>
        {
            new GroupMember { GroupId = 1, UserId = 1, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = 1, UserId = 2, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow }
        };
        _context.GroupMembers.AddRange(members);
        await _context.SaveChangesAsync();

        var groupActions = new List<GroupActionRequest>
        {
            new GroupActionRequest(GroupId: 1, Action: "transfer", TransferToUserId: 2)
        };

        // Act & Assert
        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _userService.ManageGroupsBeforeDeletionAsync(1, groupActions));

        exception.Message.Should().Contain("not eligible to receive group ownership");
    }

    // Note: ExecutePendingGroupActionsAsync tests require complex in-memory database setup with navigation properties
    // This method is tested at the integration level with a real database

    [Fact]
    public async Task ManageGroupsBeforeDeletionAsync_ShouldStoreGroupActions()
    {
        // Arrange
        var creator = new User
        {
            Id = 1,
            Username = "creator",
            Email = "creator@test.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var member = new User
        {
            Id = 2,
            Username = "member",
            Email = "member@test.com",
            IsPremium = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.AddRange(creator, member);

        var group1 = new Group
        {
            Id = 1,
            Name = "Group 1",
            CreatedById = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var group2 = new Group
        {
            Id = 2,
            Name = "Group 2",
            CreatedById = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Groups.AddRange(group1, group2);

        var members = new List<GroupMember>
        {
            new GroupMember { GroupId = 1, UserId = 1, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = 1, UserId = 2, Role = GroupRole.Member, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = 2, UserId = 1, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        };
        _context.GroupMembers.AddRange(members);
        await _context.SaveChangesAsync();

        var groupActions = new List<GroupActionRequest>
        {
            new GroupActionRequest(GroupId: 1, Action: "transfer", TransferToUserId: 2),
            new GroupActionRequest(GroupId: 2, Action: "delete", TransferToUserId: null)
        };

        // Act
        await _userService.ManageGroupsBeforeDeletionAsync(1, groupActions);

        // Assert
        var updatedUser = await _context.Users.FindAsync(1);
        updatedUser!.PendingGroupActions.Should().NotBeNull();
        // JSON uses PascalCase by default in .NET
        updatedUser.PendingGroupActions.Should().Contain("\"GroupId\":1");
        updatedUser.PendingGroupActions.Should().Contain("\"Action\":\"transfer\"");
        updatedUser.PendingGroupActions.Should().Contain("\"GroupId\":2");
        updatedUser.PendingGroupActions.Should().Contain("\"Action\":\"delete\"");
    }

    // Note: DeleteAccountAsync tests with password validation are tested at the controller/integration level
    // Unit testing UserManager password checks with in-memory database is complex and not recommended
}
