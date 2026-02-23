using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.DTOs;
using SceneStack.API.Models;
using SceneStack.API.Services;
using SceneStack.Tests.Helpers;

namespace SceneStack.Tests.Services;

public class GroupServiceTests
{
    [Fact]
    public async Task CreateAsync_ValidGroup_CreatesGroupWithCreatorMember()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var user = context.Users.First();
        var request = new CreateGroupRequest
        {
            Name = "Movie Buffs",
            Description = "Group for movie enthusiasts"
        };

        // Act
        var result = await service.CreateAsync(user.Id, request);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Movie Buffs");
        result.Description.Should().Be("Group for movie enthusiasts");
        result.CreatedById.Should().Be(user.Id);
        result.Members.Should().HaveCount(1);
        result.Members.First().UserId.Should().Be(user.Id);
        result.Members.First().Role.Should().Be(GroupRole.Creator);

        // Verify history was logged
        var history = await context.GroupMemberHistories
            .FirstOrDefaultAsync(h => h.GroupId == result.Id && h.UserId == user.Id);
        history.Should().NotBeNull();
        history!.Action.Should().Be(GroupMemberAction.Added);
        history.NewRole.Should().Be(GroupRole.Creator);
    }

    [Fact]
    public async Task CreateAsync_FreeUserExceedsLimit_ThrowsException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var freeUser = context.Users.First(u => !u.IsPremium);

        // Create first group (should succeed)
        var request1 = new CreateGroupRequest { Name = "Group 1" };
        await service.CreateAsync(freeUser.Id, request1);

        // Try to create second group (should fail)
        var request2 = new CreateGroupRequest { Name = "Group 2" };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.CreateAsync(freeUser.Id, request2)
        );
    }

    [Fact]
    public async Task CreateAsync_PremiumUser_CanCreateMultipleGroups()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var premiumUser = context.Users.First(u => u.IsPremium);

        // Act - Create multiple groups
        var group1 = await service.CreateAsync(premiumUser.Id, new CreateGroupRequest { Name = "Group 1" });
        var group2 = await service.CreateAsync(premiumUser.Id, new CreateGroupRequest { Name = "Group 2" });
        var group3 = await service.CreateAsync(premiumUser.Id, new CreateGroupRequest { Name = "Group 3" });

        // Assert
        group1.Should().NotBeNull();
        group2.Should().NotBeNull();
        group3.Should().NotBeNull();

        var userGroups = await service.GetUserGroupsAsync(premiumUser.Id);
        userGroups.Should().HaveCountGreaterThanOrEqualTo(3);
    }

    [Fact]
    public async Task GetByIdAsync_UserIsMember_ReturnsGroup()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var user = context.Users.First();
        var group = await service.CreateAsync(user.Id, new CreateGroupRequest { Name = "Test Group" });

        // Act
        var result = await service.GetByIdAsync(group.Id, user.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(group.Id);
        result.Name.Should().Be("Test Group");
    }

    [Fact]
    public async Task GetByIdAsync_UserNotMember_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var user1 = context.Users.First();
        var user2 = context.Users.Skip(1).First();

        var group = await service.CreateAsync(user1.Id, new CreateGroupRequest { Name = "Private Group" });

        // Act
        var result = await service.GetByIdAsync(group.Id, user2.Id);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateAsync_Creator_CanUpdateGroup()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var user = context.Users.First();
        var group = await service.CreateAsync(user.Id, new CreateGroupRequest { Name = "Original Name" });

        var updateRequest = new UpdateGroupRequest
        {
            Name = "Updated Name",
            Description = "New description"
        };

        // Act
        var result = await service.UpdateAsync(group.Id, user.Id, updateRequest);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Updated Name");
        result.Description.Should().Be("New description");
    }

    [Fact]
    public async Task UpdateAsync_Admin_CanUpdateGroup()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var admin = context.Users.Skip(1).First();

        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });

        // Add admin
        await service.AddMemberAsync(group.Id, creator.Id, new AddMemberRequest
        {
            UserId = admin.Id,
            Role = (int)GroupRole.Admin
        });

        var updateRequest = new UpdateGroupRequest { Name = "Updated by Admin" };

        // Act
        var result = await service.UpdateAsync(group.Id, admin.Id, updateRequest);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Updated by Admin");
    }

    [Fact]
    public async Task UpdateAsync_RegularMember_CannotUpdateGroup()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var member = context.Users.Skip(1).First();

        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });

        // Add regular member
        await service.AddMemberAsync(group.Id, creator.Id, new AddMemberRequest
        {
            UserId = member.Id,
            Role = (int)GroupRole.Member
        });

        var updateRequest = new UpdateGroupRequest { Name = "Attempted Update" };

        // Act
        var result = await service.UpdateAsync(group.Id, member.Id, updateRequest);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_Creator_CanDeleteGroup()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var user = context.Users.First();
        var group = await service.CreateAsync(user.Id, new CreateGroupRequest { Name = "To Delete" });

        // Act
        var result = await service.DeleteAsync(group.Id, user.Id);

        // Assert
        result.Should().BeTrue();

        // Verify soft delete
        var deletedGroup = await context.Groups
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(g => g.Id == group.Id);
        deletedGroup.Should().NotBeNull();
        deletedGroup!.IsDeleted.Should().BeTrue();
        deletedGroup.DeletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task DeleteAsync_NonCreator_CannotDeleteGroup()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var admin = context.Users.Skip(1).First();

        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });

        // Add admin
        await service.AddMemberAsync(group.Id, creator.Id, new AddMemberRequest
        {
            UserId = admin.Id,
            Role = (int)GroupRole.Admin
        });

        // Act
        var result = await service.DeleteAsync(group.Id, admin.Id);

        // Assert
        result.Should().BeFalse();

        // Verify group still exists
        var groupCheck = await context.Groups.FindAsync(group.Id);
        groupCheck.Should().NotBeNull();
        groupCheck!.IsDeleted.Should().BeFalse();
    }

    [Fact]
    public async Task AddMemberAsync_ValidRequest_AddsMember()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var newMember = context.Users.Skip(1).First();

        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });

        var addRequest = new AddMemberRequest
        {
            UserId = newMember.Id,
            Role = (int)GroupRole.Member
        };

        // Act
        var result = await service.AddMemberAsync(group.Id, creator.Id, addRequest);

        // Assert
        result.Should().NotBeNull();
        result!.UserId.Should().Be(newMember.Id);
        result.GroupId.Should().Be(group.Id);
        result.Role.Should().Be(GroupRole.Member);

        // Verify history was logged
        var history = await context.GroupMemberHistories
            .FirstOrDefaultAsync(h => h.GroupId == group.Id && h.UserId == newMember.Id);
        history.Should().NotBeNull();
        history!.Action.Should().Be(GroupMemberAction.Added);
        history.ActorId.Should().Be(creator.Id);
    }

    [Fact]
    public async Task AddMemberAsync_DuplicateMember_ThrowsException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var member = context.Users.Skip(1).First();

        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });

        // Add member first time
        await service.AddMemberAsync(group.Id, creator.Id, new AddMemberRequest { UserId = member.Id });

        // Try to add same member again
        var addRequest = new AddMemberRequest { UserId = member.Id };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.AddMemberAsync(group.Id, creator.Id, addRequest)
        );
    }

    [Fact]
    public async Task AddMemberAsync_FreeUserExceedsJoinLimit_ThrowsException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First(u => u.IsPremium);
        var freeUser = context.Users.First(u => !u.IsPremium);

        // Free user creates their 1 allowed group
        await service.CreateAsync(freeUser.Id, new CreateGroupRequest { Name = "My Group" });

        // Create 1 more group and add free user to it (reaches join limit of 1)
        var group1 = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Group 1" });
        await service.AddMemberAsync(group1.Id, creator.Id, new AddMemberRequest { UserId = freeUser.Id });

        // Try to add to 2nd group (should fail - total would be 2 groups, join limit exceeded)
        var group2 = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Group 2" });

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.AddMemberAsync(group2.Id, creator.Id, new AddMemberRequest { UserId = freeUser.Id })
        );
    }

    [Fact]
    public async Task AddMemberAsync_NonAdminOrCreator_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var member = context.Users.Skip(1).First();
        var thirdUser = context.Users.Skip(2).FirstOrDefault();

        if (thirdUser == null)
        {
            thirdUser = new User
            {
                Username = "thirduser",
                Email = "third@example.com",
                IsPremium = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            context.Users.Add(thirdUser);
            await context.SaveChangesAsync();
        }

        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });

        // Add member (not admin)
        await service.AddMemberAsync(group.Id, creator.Id, new AddMemberRequest { UserId = member.Id });

        // Member tries to add another user
        var addRequest = new AddMemberRequest { UserId = thirdUser.Id };

        // Act
        var result = await service.AddMemberAsync(group.Id, member.Id, addRequest);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task RemoveMemberAsync_CreatorRemovesMember_Success()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var member = context.Users.Skip(1).First();

        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });
        await service.AddMemberAsync(group.Id, creator.Id, new AddMemberRequest { UserId = member.Id });

        // Act
        var result = await service.RemoveMemberAsync(group.Id, member.Id, creator.Id);

        // Assert
        result.Should().BeTrue();

        // Verify member was removed
        var groupMembers = await context.GroupMembers
            .Where(gm => gm.GroupId == group.Id)
            .ToListAsync();
        groupMembers.Should().NotContain(gm => gm.UserId == member.Id);

        // Verify history was logged
        var history = await context.GroupMemberHistories
            .FirstOrDefaultAsync(h => h.GroupId == group.Id && h.UserId == member.Id && h.Action == GroupMemberAction.Removed);
        history.Should().NotBeNull();
        history!.ActorId.Should().Be(creator.Id);
    }

    [Fact]
    public async Task RemoveMemberAsync_MemberRemovesSelf_Success()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var member = context.Users.Skip(1).First();

        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });
        await service.AddMemberAsync(group.Id, creator.Id, new AddMemberRequest { UserId = member.Id });

        // Act - Member removes themselves
        var result = await service.RemoveMemberAsync(group.Id, member.Id, member.Id);

        // Assert
        result.Should().BeTrue();

        // Verify history action is "Left" not "Removed"
        var history = await context.GroupMemberHistories
            .FirstOrDefaultAsync(h => h.GroupId == group.Id && h.UserId == member.Id && h.Action == GroupMemberAction.Left);
        history.Should().NotBeNull();
        history!.ActorId.Should().Be(member.Id);
    }

    [Fact]
    public async Task RemoveMemberAsync_CannotRemoveCreator_ThrowsException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var admin = context.Users.Skip(1).First();

        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });
        await service.AddMemberAsync(group.Id, creator.Id, new AddMemberRequest { UserId = admin.Id, Role = (int)GroupRole.Admin });

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.RemoveMemberAsync(group.Id, creator.Id, admin.Id)
        );
    }

    [Fact]
    public async Task UpdateMemberRoleAsync_CreatorPromotesToAdmin_Success()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var member = context.Users.Skip(1).First();

        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });
        await service.AddMemberAsync(group.Id, creator.Id, new AddMemberRequest { UserId = member.Id });

        var updateRequest = new UpdateMemberRoleRequest { Role = (int)GroupRole.Admin };

        // Act
        var result = await service.UpdateMemberRoleAsync(group.Id, member.Id, creator.Id, updateRequest);

        // Assert
        result.Should().NotBeNull();
        result!.Role.Should().Be(GroupRole.Admin);

        // Verify history was logged
        var history = await context.GroupMemberHistories
            .FirstOrDefaultAsync(h => h.GroupId == group.Id && h.UserId == member.Id && h.Action == GroupMemberAction.RoleChanged);
        history.Should().NotBeNull();
        history!.PreviousRole.Should().Be(GroupRole.Member);
        history.NewRole.Should().Be(GroupRole.Admin);
    }

    [Fact]
    public async Task UpdateMemberRoleAsync_CannotChangeCreatorRole_ThrowsException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var updateRequest = new UpdateMemberRoleRequest { Role = (int)GroupRole.Member };

        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.UpdateMemberRoleAsync(group.Id, creator.Id, creator.Id, updateRequest)
        );
    }

    [Fact]
    public async Task GetUserGroupsAsync_ReturnsAllUserGroups()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First();
        var member = context.Users.Skip(1).First();

        // Create groups and add member to some
        var group1 = await service.CreateAsync(member.Id, new CreateGroupRequest { Name = "My Group" });
        var group2 = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Group 2" });
        await service.AddMemberAsync(group2.Id, creator.Id, new AddMemberRequest { UserId = member.Id });
        var group3 = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Group 3" });
        await service.AddMemberAsync(group3.Id, creator.Id, new AddMemberRequest { UserId = member.Id });

        // Act
        var result = await service.GetUserGroupsAsync(member.Id);

        // Assert
        result.Should().HaveCount(3);
        result.Should().Contain(g => g.Name == "My Group");
        result.Should().Contain(g => g.Name == "Group 2");
        result.Should().Contain(g => g.Name == "Group 3");
    }

    [Fact]
    public async Task CanUserCreateGroupAsync_FreeUserNoGroups_ReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var freeUser = context.Users.First(u => !u.IsPremium);

        // Act
        var result = await service.CanUserCreateGroupAsync(freeUser.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanUserCreateGroupAsync_FreeUserHasOneGroup_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var freeUser = context.Users.First(u => !u.IsPremium);
        await service.CreateAsync(freeUser.Id, new CreateGroupRequest { Name = "My Group" });

        // Act
        var result = await service.CanUserCreateGroupAsync(freeUser.Id);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanUserCreateGroupAsync_PremiumUser_AlwaysReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var premiumUser = context.Users.First(u => u.IsPremium);

        // Create multiple groups
        await service.CreateAsync(premiumUser.Id, new CreateGroupRequest { Name = "Group 1" });
        await service.CreateAsync(premiumUser.Id, new CreateGroupRequest { Name = "Group 2" });
        await service.CreateAsync(premiumUser.Id, new CreateGroupRequest { Name = "Group 3" });

        // Act
        var result = await service.CanUserCreateGroupAsync(premiumUser.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanUserJoinGroupAsync_FreeUserNoAdditionalGroups_ReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var freeUser = context.Users.First(u => !u.IsPremium);

        // Create their own group (doesn't count toward join limit)
        await service.CreateAsync(freeUser.Id, new CreateGroupRequest { Name = "My Group" });

        // Act
        var result = await service.CanUserJoinGroupAsync(freeUser.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanUserJoinGroupAsync_FreeUserHasOneJoinedGroup_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First(u => u.IsPremium);
        var freeUser = context.Users.First(u => !u.IsPremium);

        // Free user creates their own group
        await service.CreateAsync(freeUser.Id, new CreateGroupRequest { Name = "My Group" });

        // Add free user to 1 other group (reaches limit of 1 joined)
        var group1 = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Group 1" });
        await service.AddMemberAsync(group1.Id, creator.Id, new AddMemberRequest { UserId = freeUser.Id });

        // Act
        var result = await service.CanUserJoinGroupAsync(freeUser.Id);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanUserJoinGroupAsync_PremiumUser_AlwaysReturnsTrue()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        // Use the seeded premium user for joining
        var premiumUser = context.Users.First(u => u.IsPremium);

        // Use the seeded free user, but make them premium for creating groups
        var groupCreator = context.Users.First(u => !u.IsPremium);
        groupCreator.IsPremium = true; // Upgrade to premium so they can create multiple groups
        await context.SaveChangesAsync();

        // Add premium user to multiple groups
        for (int i = 0; i < 5; i++)
        {
            var group = await service.CreateAsync(groupCreator.Id, new CreateGroupRequest { Name = $"Group {i}" });
            await service.AddMemberAsync(group.Id, groupCreator.Id, new AddMemberRequest { UserId = premiumUser.Id });
        }

        // Act
        var result = await service.CanUserJoinGroupAsync(premiumUser.Id);

        // Assert
        result.Should().BeTrue();
    }

    // ── GetGroupStatsAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetGroupStatsAsync_NonMember_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);

        var creator = context.Users.First(u => u.Username == "testuser");
        var nonMember = context.Users.First(u => u.Username == "freeuser");
        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Test Group" });

        // Act
        var result = await service.GetGroupStatsAsync(group.Id, nonMember.Id);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetGroupStatsAsync_GroupDoesNotExist_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);
        var user = context.Users.First();

        // Act
        var result = await service.GetGroupStatsAsync(99999, user.Id);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetGroupStatsAsync_MemberWithNoSharedWatches_ReturnsZeroTotals()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);
        var creator = context.Users.First(u => u.Username == "testuser");
        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Empty Group" });

        // Act
        var result = await service.GetGroupStatsAsync(group.Id, creator.Id);

        // Assert
        result.Should().NotBeNull();
        result!.TotalWatches.Should().Be(0);
        result.UniqueMovies.Should().Be(0);
        result.AverageGroupRating.Should().BeNull();
        result.MostActiveMember.Should().BeNull();
        result.SharedMovies.Should().BeEmpty();
    }

    [Fact]
    public async Task GetGroupStatsAsync_ValidRequest_ReturnsGroupNameAndId()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);
        var creator = context.Users.First(u => u.Username == "testuser");
        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Cinema Club" });

        // Act
        var result = await service.GetGroupStatsAsync(group.Id, creator.Id);

        // Assert
        result.Should().NotBeNull();
        result!.GroupId.Should().Be(group.Id);
        result.GroupName.Should().Be("Cinema Club");
    }

    [Fact]
    public async Task GetGroupStatsAsync_MemberStats_IncludesAllGroupMembers()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var logger = Substitute.For<ILogger<GroupService>>();
        var service = new GroupService(context, logger);
        var creator = context.Users.First(u => u.Username == "testuser");
        var secondUser = context.Users.First(u => u.Username == "freeuser");
        var group = await service.CreateAsync(creator.Id, new CreateGroupRequest { Name = "Two Member Group" });
        await service.AddMemberAsync(group.Id, creator.Id, new AddMemberRequest { UserId = secondUser.Id });

        // Act
        var result = await service.GetGroupStatsAsync(group.Id, creator.Id);

        // Assert
        result.Should().NotBeNull();
        result!.MemberStats.Should().HaveCount(2);
        result.MemberStats.Should().Contain(ms => ms.Username == "testuser");
        result.MemberStats.Should().Contain(ms => ms.Username == "freeuser");
    }
}