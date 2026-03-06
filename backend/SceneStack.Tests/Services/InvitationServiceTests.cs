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

public class InvitationServiceTests
{
    #region CreateInvitationAsync Tests

    [Fact]
    public async Task CreateInvitationAsync_ValidRequest_CreatesInvitation()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var creator = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        // Create a group with creator as admin
        var group = new Group
        {
            Name = "Movie Buffs",
            Description = "Test group",
            CreatedById = creator.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        var member = new GroupMember
        {
            GroupId = group.Id,
            UserId = creator.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(member);
        await context.SaveChangesAsync();

        groupService.CanUserJoinGroupAsync(invitedUser.Id).Returns(true);

        var request = new CreateInvitationRequest
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id
        };

        // Act
        var result = await service.CreateInvitationAsync(creator.Id, request);

        // Assert
        result.Should().NotBeNull();
        result.GroupId.Should().Be(group.Id);
        result.InvitedUserId.Should().Be(invitedUser.Id);
        result.InvitedByUserId.Should().Be(creator.Id);
        result.Status.Should().Be(0); // Pending
        result.ExpiresAt.Should().NotBeNull();
        result.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddDays(30), TimeSpan.FromMinutes(1));

        // Verify database
        var invitation = await context.GroupInvitations.FirstOrDefaultAsync(i => i.Id == result.Id);
        invitation.Should().NotBeNull();
        invitation!.Status.Should().Be(InvitationStatus.Pending);
    }

    [Fact]
    public async Task CreateInvitationAsync_GroupNotFound_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var user = context.Users.First();
        var request = new CreateInvitationRequest
        {
            GroupId = 9999,
            InvitedUserId = user.Id
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.CreateInvitationAsync(user.Id, request)
        );
    }

    [Fact]
    public async Task CreateInvitationAsync_RequesterNotAdmin_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var creator = context.Users.First(u => u.IsPremium);
        var regularMember = context.Users.Skip(1).First();
        var invitedUser = context.Users.Skip(2).First();

        // Create group with creator
        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = creator.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        // Add creator as Creator role
        var creatorMember = new GroupMember
        {
            GroupId = group.Id,
            UserId = creator.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(creatorMember);

        // Add regular member (not admin)
        var member = new GroupMember
        {
            GroupId = group.Id,
            UserId = regularMember.Id,
            Role = GroupRole.Member,
            JoinedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(member);
        await context.SaveChangesAsync();

        var request = new CreateInvitationRequest
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id
        };

        // Act & Assert - Regular member tries to invite
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            async () => await service.CreateInvitationAsync(regularMember.Id, request)
        );
    }

    [Fact]
    public async Task CreateInvitationAsync_InvitedUserNotFound_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var creator = context.Users.First(u => u.IsPremium);

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = creator.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        var member = new GroupMember
        {
            GroupId = group.Id,
            UserId = creator.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(member);
        await context.SaveChangesAsync();

        var request = new CreateInvitationRequest
        {
            GroupId = group.Id,
            InvitedUserId = 9999
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.CreateInvitationAsync(creator.Id, request)
        );
    }

    [Fact]
    public async Task CreateInvitationAsync_UserDeactivated_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var creator = context.Users.First(u => u.IsPremium);
        var deactivatedUser = new User
        {
            Username = "deactivated",
            Email = "deactivated@example.com",
            IsPremium = false,
            IsDeactivated = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Users.Add(deactivatedUser);

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = creator.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        var member = new GroupMember
        {
            GroupId = group.Id,
            UserId = creator.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(member);
        await context.SaveChangesAsync();

        var request = new CreateInvitationRequest
        {
            GroupId = group.Id,
            InvitedUserId = deactivatedUser.Id
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.CreateInvitationAsync(creator.Id, request)
        );
    }

    [Fact]
    public async Task CreateInvitationAsync_UserAlreadyMember_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var creator = context.Users.First(u => u.IsPremium);
        var existingMember = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = creator.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        // Add both as members
        context.GroupMembers.AddRange(
            new GroupMember
            {
                GroupId = group.Id,
                UserId = creator.Id,
                Role = GroupRole.Creator,
                JoinedAt = DateTime.UtcNow
            },
            new GroupMember
            {
                GroupId = group.Id,
                UserId = existingMember.Id,
                Role = GroupRole.Member,
                JoinedAt = DateTime.UtcNow
            }
        );
        await context.SaveChangesAsync();

        var request = new CreateInvitationRequest
        {
            GroupId = group.Id,
            InvitedUserId = existingMember.Id
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.CreateInvitationAsync(creator.Id, request)
        );
    }

    [Fact]
    public async Task CreateInvitationAsync_DuplicatePendingInvitation_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var creator = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = creator.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        var member = new GroupMember
        {
            GroupId = group.Id,
            UserId = creator.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(member);

        // Add existing pending invitation
        var existingInvitation = new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = creator.Id,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        context.GroupInvitations.Add(existingInvitation);
        await context.SaveChangesAsync();

        groupService.CanUserJoinGroupAsync(invitedUser.Id).Returns(true);

        var request = new CreateInvitationRequest
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.CreateInvitationAsync(creator.Id, request)
        );
    }

    [Fact]
    public async Task CreateInvitationAsync_UserReachedGroupLimit_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var creator = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = creator.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        var member = new GroupMember
        {
            GroupId = group.Id,
            UserId = creator.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(member);
        await context.SaveChangesAsync();

        groupService.CanUserJoinGroupAsync(invitedUser.Id).Returns(false);

        var request = new CreateInvitationRequest
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.CreateInvitationAsync(creator.Id, request)
        );
    }

    [Fact]
    public async Task CreateInvitationAsync_MaxPendingInvitationsReached_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var creator = context.Users.First(u => u.IsPremium);
        var users = context.Users.Skip(1).Take(6).ToList();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = creator.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        var member = new GroupMember
        {
            GroupId = group.Id,
            UserId = creator.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        };
        context.GroupMembers.Add(member);

        // Add 5 pending invitations (the limit)
        for (int i = 0; i < 5; i++)
        {
            context.GroupInvitations.Add(new GroupInvitation
            {
                GroupId = group.Id,
                InvitedUserId = users[i].Id,
                InvitedByUserId = creator.Id,
                Status = InvitationStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(30)
            });
        }
        await context.SaveChangesAsync();

        groupService.CanUserJoinGroupAsync(users[5].Id).Returns(true);

        var request = new CreateInvitationRequest
        {
            GroupId = group.Id,
            InvitedUserId = users[5].Id
        };

        // Act & Assert - 6th invitation should fail
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.CreateInvitationAsync(creator.Id, request)
        );
    }

    #endregion

    #region GetUserPendingInvitationsAsync Tests

    [Fact]
    public async Task GetUserPendingInvitationsAsync_ReturnsOnlyPendingInvitations()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group1 = new Group
        {
            Name = "Group 1",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var group2 = new Group
        {
            Name = "Group 2",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.AddRange(group1, group2);
        await context.SaveChangesAsync();

        // Add member records
        context.GroupMembers.AddRange(
            new GroupMember { GroupId = group1.Id, UserId = inviter.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group2.Id, UserId = inviter.Id, Role = GroupRole.Creator, JoinedAt = DateTime.UtcNow }
        );
        await context.SaveChangesAsync();

        // Add invitations with different statuses
        context.GroupInvitations.AddRange(
            new GroupInvitation
            {
                GroupId = group1.Id,
                InvitedUserId = invitedUser.Id,
                InvitedByUserId = inviter.Id,
                Status = InvitationStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(30)
            },
            new GroupInvitation
            {
                GroupId = group2.Id,
                InvitedUserId = invitedUser.Id,
                InvitedByUserId = inviter.Id,
                Status = InvitationStatus.Accepted,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                RespondedAt = DateTime.UtcNow
            }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetUserPendingInvitationsAsync(invitedUser.Id);

        // Assert
        result.Should().HaveCount(1);
        result.First().GroupId.Should().Be(group1.Id);
        result.First().Status.Should().Be(0); // Pending
    }

    [Fact]
    public async Task GetUserPendingInvitationsAsync_NoInvitations_ReturnsEmpty()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var user = context.Users.First();

        // Act
        var result = await service.GetUserPendingInvitationsAsync(user.Id);

        // Assert
        result.Should().BeEmpty();
    }

    #endregion

    #region GetPendingInvitationsCountAsync Tests

    [Fact]
    public async Task GetPendingInvitationsCountAsync_ReturnsCorrectCount()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Group",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = inviter.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        });

        // Add 3 pending invitations
        for (int i = 0; i < 3; i++)
        {
            context.GroupInvitations.Add(new GroupInvitation
            {
                GroupId = group.Id,
                InvitedUserId = invitedUser.Id,
                InvitedByUserId = inviter.Id,
                Status = InvitationStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(30)
            });
        }

        // Add 1 accepted invitation
        context.GroupInvitations.Add(new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = inviter.Id,
            Status = InvitationStatus.Accepted,
            CreatedAt = DateTime.UtcNow,
            RespondedAt = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        // Act
        var count = await service.GetPendingInvitationsCountAsync(invitedUser.Id);

        // Assert
        count.Should().Be(3);
    }

    #endregion

    #region RespondToInvitationAsync Tests

    [Fact]
    public async Task RespondToInvitationAsync_Accept_CreatesGroupMembership()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = inviter.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        });

        var invitation = new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = inviter.Id,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        context.GroupInvitations.Add(invitation);
        await context.SaveChangesAsync();

        groupService.CanUserJoinGroupAsync(invitedUser.Id).Returns(true);

        var request = new RespondToInvitationRequest { Accept = true };

        // Act
        var result = await service.RespondToInvitationAsync(invitation.Id, invitedUser.Id, request);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(1); // Accepted
        result.RespondedAt.Should().NotBeNull();

        // Verify membership was created
        var membership = await context.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == group.Id && gm.UserId == invitedUser.Id);
        membership.Should().NotBeNull();
        membership!.Role.Should().Be(GroupRole.Member);

        // Verify history was logged
        var history = await context.GroupMemberHistories
            .FirstOrDefaultAsync(h => h.GroupId == group.Id && h.UserId == invitedUser.Id);
        history.Should().NotBeNull();
        history!.Action.Should().Be(GroupMemberAction.Added);
        history.NewRole.Should().Be(GroupRole.Member);
    }

    [Fact]
    public async Task RespondToInvitationAsync_Decline_UpdatesStatusOnly()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = inviter.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        });

        var invitation = new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = inviter.Id,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        context.GroupInvitations.Add(invitation);
        await context.SaveChangesAsync();

        var request = new RespondToInvitationRequest { Accept = false };

        // Act
        var result = await service.RespondToInvitationAsync(invitation.Id, invitedUser.Id, request);

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be(2); // Declined
        result.RespondedAt.Should().NotBeNull();

        // Verify membership was NOT created
        var membership = await context.GroupMembers
            .FirstOrDefaultAsync(gm => gm.GroupId == group.Id && gm.UserId == invitedUser.Id);
        membership.Should().BeNull();

        // Verify history was NOT logged
        var history = await context.GroupMemberHistories
            .FirstOrDefaultAsync(h => h.GroupId == group.Id && h.UserId == invitedUser.Id);
        history.Should().BeNull();
    }

    [Fact]
    public async Task RespondToInvitationAsync_NotFound_ReturnsNull()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var user = context.Users.First();
        var request = new RespondToInvitationRequest { Accept = true };

        // Act
        var result = await service.RespondToInvitationAsync(9999, user.Id, request);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task RespondToInvitationAsync_WrongUser_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();
        var wrongUser = context.Users.Skip(2).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = inviter.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        });

        var invitation = new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = inviter.Id,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        context.GroupInvitations.Add(invitation);
        await context.SaveChangesAsync();

        var request = new RespondToInvitationRequest { Accept = true };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            async () => await service.RespondToInvitationAsync(invitation.Id, wrongUser.Id, request)
        );
    }

    [Fact]
    public async Task RespondToInvitationAsync_AlreadyResponded_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = inviter.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        });

        var invitation = new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = inviter.Id,
            Status = InvitationStatus.Accepted, // Already responded
            CreatedAt = DateTime.UtcNow,
            RespondedAt = DateTime.UtcNow
        };
        context.GroupInvitations.Add(invitation);
        await context.SaveChangesAsync();

        var request = new RespondToInvitationRequest { Accept = true };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.RespondToInvitationAsync(invitation.Id, invitedUser.Id, request)
        );
    }

    [Fact]
    public async Task RespondToInvitationAsync_ExpiredInvitation_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = inviter.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        });

        var invitation = new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = inviter.Id,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow.AddDays(-31),
            ExpiresAt = DateTime.UtcNow.AddDays(-1) // Expired
        };
        context.GroupInvitations.Add(invitation);
        await context.SaveChangesAsync();

        var request = new RespondToInvitationRequest { Accept = true };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.RespondToInvitationAsync(invitation.Id, invitedUser.Id, request)
        );
    }

    [Fact]
    public async Task RespondToInvitationAsync_DeletedGroup_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            IsDeleted = true,
            DeletedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        var invitation = new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = inviter.Id,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        context.GroupInvitations.Add(invitation);
        await context.SaveChangesAsync();

        var request = new RespondToInvitationRequest { Accept = true };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.RespondToInvitationAsync(invitation.Id, invitedUser.Id, request)
        );

        // Verify invitation was cancelled
        var updatedInvitation = await context.GroupInvitations.FindAsync(invitation.Id);
        updatedInvitation!.Status.Should().Be(InvitationStatus.Cancelled);
    }

    [Fact]
    public async Task RespondToInvitationAsync_AcceptWhenAtGroupLimit_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = inviter.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        });

        var invitation = new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = inviter.Id,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        context.GroupInvitations.Add(invitation);
        await context.SaveChangesAsync();

        groupService.CanUserJoinGroupAsync(invitedUser.Id).Returns(false);

        var request = new RespondToInvitationRequest { Accept = true };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await service.RespondToInvitationAsync(invitation.Id, invitedUser.Id, request)
        );
    }

    #endregion

    #region CancelInvitationAsync Tests

    [Fact]
    public async Task CancelInvitationAsync_ValidRequest_CancelsInvitation()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        var invitation = new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = inviter.Id,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        context.GroupInvitations.Add(invitation);
        await context.SaveChangesAsync();

        // Act
        var result = await service.CancelInvitationAsync(invitation.Id, inviter.Id);

        // Assert
        result.Should().BeTrue();

        var updatedInvitation = await context.GroupInvitations.FindAsync(invitation.Id);
        updatedInvitation!.Status.Should().Be(InvitationStatus.Cancelled);
        updatedInvitation.RespondedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task CancelInvitationAsync_NotFound_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var user = context.Users.First();

        // Act
        var result = await service.CancelInvitationAsync(9999, user.Id);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CancelInvitationAsync_WrongUser_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();
        var wrongUser = context.Users.Skip(2).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        var invitation = new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = inviter.Id,
            Status = InvitationStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        context.GroupInvitations.Add(invitation);
        await context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            async () => await service.CancelInvitationAsync(invitation.Id, wrongUser.Id)
        );
    }

    [Fact]
    public async Task CancelInvitationAsync_AlreadyResponded_ReturnsFalse()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var inviter = context.Users.First(u => u.IsPremium);
        var invitedUser = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = inviter.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        var invitation = new GroupInvitation
        {
            GroupId = group.Id,
            InvitedUserId = invitedUser.Id,
            InvitedByUserId = inviter.Id,
            Status = InvitationStatus.Accepted,
            CreatedAt = DateTime.UtcNow,
            RespondedAt = DateTime.UtcNow
        };
        context.GroupInvitations.Add(invitation);
        await context.SaveChangesAsync();

        // Act
        var result = await service.CancelInvitationAsync(invitation.Id, inviter.Id);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region GetSentInvitationsAsync Tests

    [Fact]
    public async Task GetSentInvitationsAsync_ValidRequest_ReturnsInvitations()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var creator = context.Users.First(u => u.IsPremium);
        var invitedUser1 = context.Users.Skip(1).First();
        var invitedUser2 = context.Users.Skip(2).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = creator.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = creator.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        });

        // Add invitations
        context.GroupInvitations.AddRange(
            new GroupInvitation
            {
                GroupId = group.Id,
                InvitedUserId = invitedUser1.Id,
                InvitedByUserId = creator.Id,
                Status = InvitationStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(30)
            },
            new GroupInvitation
            {
                GroupId = group.Id,
                InvitedUserId = invitedUser2.Id,
                InvitedByUserId = creator.Id,
                Status = InvitationStatus.Pending,
                CreatedAt = DateTime.UtcNow.AddMinutes(-5),
                ExpiresAt = DateTime.UtcNow.AddDays(30)
            }
        );
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetSentInvitationsAsync(group.Id, creator.Id);

        // Assert
        result.Should().HaveCount(2);
        result.First().GroupId.Should().Be(group.Id);
    }

    [Fact]
    public async Task GetSentInvitationsAsync_NotMember_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var creator = context.Users.First(u => u.IsPremium);
        var nonMember = context.Users.Skip(1).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = creator.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.Add(new GroupMember
        {
            GroupId = group.Id,
            UserId = creator.Id,
            Role = GroupRole.Creator,
            JoinedAt = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            async () => await service.GetSentInvitationsAsync(group.Id, nonMember.Id)
        );
    }

    #endregion

    #region SearchUsersAsync Tests

    [Fact]
    public async Task SearchUsersAsync_ByUsername_ReturnsMatchingUsers()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var requester = context.Users.First(u => u.Username == "testuser");
        groupService.CanUserJoinGroupAsync(Arg.Any<int>()).Returns(true);

        var request = new UserSearchRequest
        {
            Query = "user"
        };

        // Act
        var result = await service.SearchUsersAsync(request, requester.Id);

        // Assert
        result.Should().NotBeEmpty();
        result.Should().OnlyContain(u => u.Username.ToLower().Contains("user") || u.Email.ToLower().Contains("user"));
        result.Should().NotContain(u => u.Id == requester.Id); // Requester excluded
    }

    [Fact]
    public async Task SearchUsersAsync_ExcludeGroupMembers_FiltersCorrectly()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var creator = context.Users.First(u => u.IsPremium);
        var member = context.Users.Skip(1).First();
        var nonMember = context.Users.Skip(2).First();

        var group = new Group
        {
            Name = "Movie Buffs",
            CreatedById = creator.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Groups.Add(group);
        await context.SaveChangesAsync();

        context.GroupMembers.AddRange(
            new GroupMember
            {
                GroupId = group.Id,
                UserId = creator.Id,
                Role = GroupRole.Creator,
                JoinedAt = DateTime.UtcNow
            },
            new GroupMember
            {
                GroupId = group.Id,
                UserId = member.Id,
                Role = GroupRole.Member,
                JoinedAt = DateTime.UtcNow
            }
        );
        await context.SaveChangesAsync();

        groupService.CanUserJoinGroupAsync(Arg.Any<int>()).Returns(true);

        var request = new UserSearchRequest
        {
            Query = "user",
            ExcludeGroupId = group.Id
        };

        // Act
        var result = await service.SearchUsersAsync(request, creator.Id);

        // Assert
        result.Should().NotContain(u => u.Id == creator.Id);
        result.Should().NotContain(u => u.Id == member.Id);
    }

    [Fact]
    public async Task SearchUsersAsync_EmptyQuery_ReturnsEmpty()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var requester = context.Users.First();

        var request = new UserSearchRequest { Query = "" };

        // Act
        var result = await service.SearchUsersAsync(request, requester.Id);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchUsersAsync_ExcludesRequester_ReturnsWithoutRequester()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var requester = context.Users.First();
        groupService.CanUserJoinGroupAsync(Arg.Any<int>()).Returns(true);

        var request = new UserSearchRequest { Query = "user" };

        // Act
        var result = await service.SearchUsersAsync(request, requester.Id);

        // Assert
        result.Should().NotContain(u => u.Id == requester.Id);
    }

    [Fact]
    public async Task SearchUsersAsync_IncludesCanJoinMoreGroupsFlag()
    {
        // Arrange
        using var context = TestDbContextFactory.CreateInMemoryDbContext();
        var groupService = Substitute.For<IGroupService>();
        var logger = Substitute.For<ILogger<InvitationService>>();
        var auditService = Substitute.For<IAuditService>();
        var service = new InvitationService(context, groupService, logger, auditService);

        var requester = context.Users.First();
        var searchUser = context.Users.Skip(1).First();

        groupService.CanUserJoinGroupAsync(searchUser.Id).Returns(true);

        var request = new UserSearchRequest
        {
            Query = searchUser.Username
        };

        // Act
        var result = await service.SearchUsersAsync(request, requester.Id);

        // Assert
        result.Should().Contain(u => u.Id == searchUser.Id && u.CanJoinMoreGroups);
    }

    #endregion
}
