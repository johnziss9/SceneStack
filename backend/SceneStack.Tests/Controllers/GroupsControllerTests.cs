using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Controllers;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using SceneStack.API.Models;
using System.Security.Claims;

namespace SceneStack.Tests.Controllers;

public class GroupsControllerTests
{
    private GroupsController CreateController(IGroupService groupService, int userId = 1)
    {
        var feedService = Substitute.For<IGroupFeedService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<GroupsController>>();
        var controller = new GroupsController(groupService, feedService, recommendationsService, logger);

        // Mock HttpContext and User claims for User.GetUserId()
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString())
        }));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        return controller;
    }

    [Fact]
    public async Task GetUserGroups_ReturnsOkWithGroups()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var groups = new List<GroupResponse>
        {
            new GroupResponse
            {
                Id = 1,
                Name = "Movie Fans",
                CreatedById = 1,
                MemberCount = 2
            }
        };

        groupService.GetUserGroupsAsync(1).Returns(groups);

        // Act
        var result = await controller.GetUserGroups();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedGroups = okResult.Value.Should().BeAssignableTo<IEnumerable<GroupResponse>>().Subject;
        returnedGroups.Should().HaveCount(1);
        returnedGroups.First().Name.Should().Be("Movie Fans");
    }

    [Fact]
    public async Task GetGroup_ExistingGroup_ReturnsOkWithGroup()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var group = new Group
        {
            Id = 1,
            Name = "Test Group",
            CreatedById = 1,
            Members = new List<GroupMember>
            {
                new GroupMember
                {
                    GroupId = 1,
                    UserId = 1,
                    Role = GroupRole.Creator,
                    User = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
                }
            },
            CreatedBy = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
        };

        groupService.GetByIdAsync(1, 1).Returns(group);

        // Act
        var result = await controller.GetGroup(1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedGroup = okResult.Value.Should().BeOfType<GroupResponse>().Subject;
        returnedGroup.Name.Should().Be("Test Group");
        returnedGroup.Members.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetGroup_NonExistentGroup_ReturnsNotFound()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        groupService.GetByIdAsync(999, 1).Returns((Group?)null);

        // Act
        var result = await controller.GetGroup(999);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task CreateGroup_ValidRequest_ReturnsCreatedAtAction()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var request = new CreateGroupRequest
        {
            Name = "New Group",
            Description = "A new group"
        };

        var createdGroup = new Group
        {
            Id = 1,
            Name = "New Group",
            Description = "A new group",
            CreatedById = 1,
            Members = new List<GroupMember>
            {
                new GroupMember
                {
                    GroupId = 1,
                    UserId = 1,
                    Role = GroupRole.Creator,
                    User = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
                }
            },
            CreatedBy = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
        };

        groupService.CreateAsync(1, request).Returns(createdGroup);

        // Act
        var result = await controller.CreateGroup(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.ActionName.Should().Be(nameof(GroupsController.GetGroup));
        var returnedGroup = createdResult.Value.Should().BeOfType<GroupResponse>().Subject;
        returnedGroup.Name.Should().Be("New Group");
    }

    [Fact]
    public async Task CreateGroup_ExceedsLimit_ReturnsBadRequest()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var request = new CreateGroupRequest { Name = "Too Many Groups" };

        groupService.CreateAsync(1, request)
            .Returns<Group>(_ => throw new InvalidOperationException("User has reached the maximum number of groups they can create"));

        // Act
        var result = await controller.CreateGroup(request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("User has reached the maximum number of groups they can create");
    }

    [Fact]
    public async Task UpdateGroup_ValidRequest_ReturnsOkWithUpdatedGroup()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var request = new UpdateGroupRequest
        {
            Name = "Updated Group",
            Description = "Updated description"
        };

        var updatedGroup = new Group
        {
            Id = 1,
            Name = "Updated Group",
            Description = "Updated description",
            CreatedById = 1,
            Members = new List<GroupMember>
            {
                new GroupMember
                {
                    GroupId = 1,
                    UserId = 1,
                    Role = GroupRole.Creator,
                    User = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
                }
            },
            CreatedBy = new User { Id = 1, Username = "testuser", Email = "test@test.com" }
        };

        groupService.UpdateAsync(1, 1, request).Returns(updatedGroup);

        // Act
        var result = await controller.UpdateGroup(1, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedGroup = okResult.Value.Should().BeOfType<GroupResponse>().Subject;
        returnedGroup.Name.Should().Be("Updated Group");
    }

    [Fact]
    public async Task UpdateGroup_Unauthorized_ReturnsNotFound()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var request = new UpdateGroupRequest { Name = "Updated" };
        groupService.UpdateAsync(1, 1, request).Returns((Group?)null);

        // Act
        var result = await controller.UpdateGroup(1, request);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task DeleteGroup_ExistingGroup_ReturnsNoContent()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        groupService.DeleteAsync(1, 1).Returns(true);

        // Act
        var result = await controller.DeleteGroup(1);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task DeleteGroup_NonExistentOrUnauthorized_ReturnsNotFound()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        groupService.DeleteAsync(999, 1).Returns(false);

        // Act
        var result = await controller.DeleteGroup(999);

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetGroupMembers_ExistingGroup_ReturnsOkWithMembers()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var members = new List<GroupMemberResponse>
        {
            new GroupMemberResponse
            {
                UserId = 1,
                GroupId = 1,
                Role = (int)GroupRole.Creator,
                RoleName = "Creator",
                User = new UserBasicInfo { Id = 1, Username = "testuser", Email = "test@test.com" }
            }
        };

        groupService.GetGroupMembersAsync(1, 1).Returns(members);

        // Act
        var result = await controller.GetGroupMembers(1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedMembers = okResult.Value.Should().BeAssignableTo<IEnumerable<GroupMemberResponse>>().Subject;
        returnedMembers.Should().HaveCount(1);
        returnedMembers.First().RoleName.Should().Be("Creator");
    }

    [Fact]
    public async Task GetGroupMembers_Unauthorized_ReturnsEmptyList()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        groupService.GetGroupMembersAsync(999, 1).Returns(Enumerable.Empty<GroupMemberResponse>());

        // Act
        var result = await controller.GetGroupMembers(999);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedMembers = okResult.Value.Should().BeAssignableTo<IEnumerable<GroupMemberResponse>>().Subject;
        returnedMembers.Should().BeEmpty();
    }

    [Fact]
    public async Task AddMember_ValidRequest_ReturnsOkWithMember()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var request = new AddMemberRequest { UserId = 2, Role = (int)GroupRole.Member };

        var addedMember = new GroupMember
        {
            GroupId = 1,
            UserId = 2,
            Role = GroupRole.Member
        };

        var memberResponse = new GroupMemberResponse
        {
            UserId = 2,
            GroupId = 1,
            Role = (int)GroupRole.Member,
            RoleName = "Member",
            User = new UserBasicInfo { Id = 2, Username = "member", Email = "member@test.com" }
        };

        groupService.AddMemberAsync(1, 1, request).Returns(addedMember);
        groupService.GetGroupMembersAsync(1, 1).Returns(new[] { memberResponse });

        // Act
        var result = await controller.AddMember(1, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeOfType<GroupMemberResponse>();
    }

    [Fact]
    public async Task AddMember_Unauthorized_ReturnsNotFound()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var request = new AddMemberRequest { UserId = 2 };
        groupService.AddMemberAsync(999, 1, request).Returns((GroupMember?)null);

        // Act
        var result = await controller.AddMember(999, request);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task AddMember_ExceedsLimit_ReturnsBadRequest()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var request = new AddMemberRequest { UserId = 2 };

        groupService.AddMemberAsync(1, 1, request)
            .Returns<GroupMember?>(_ => throw new InvalidOperationException("User has reached the maximum number of groups they can join"));

        // Act
        var result = await controller.AddMember(1, request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("User has reached the maximum number of groups they can join");
    }

    [Fact]
    public async Task RemoveMember_ValidRequest_ReturnsNoContent()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        groupService.RemoveMemberAsync(1, 2, 1).Returns(true);

        // Act
        var result = await controller.RemoveMember(1, 2);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task RemoveMember_CannotRemoveCreator_ReturnsBadRequest()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        groupService.RemoveMemberAsync(1, 1, 1)
            .Returns<bool>(_ => throw new InvalidOperationException("Cannot remove the group creator"));

        // Act
        var result = await controller.RemoveMember(1, 1);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("Cannot remove the group creator");
    }

    [Fact]
    public async Task UpdateMemberRole_ValidRequest_ReturnsOkWithUpdatedMember()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var request = new UpdateMemberRoleRequest { Role = (int)GroupRole.Admin };

        var updatedMember = new GroupMember
        {
            GroupId = 1,
            UserId = 2,
            Role = GroupRole.Admin
        };

        var memberResponse = new GroupMemberResponse
        {
            UserId = 2,
            GroupId = 1,
            Role = (int)GroupRole.Admin,
            RoleName = "Admin",
            User = new UserBasicInfo { Id = 2, Username = "member", Email = "member@test.com" }
        };

        groupService.UpdateMemberRoleAsync(1, 2, 1, request).Returns(updatedMember);
        groupService.GetGroupMembersAsync(1, 1).Returns(new[] { memberResponse });

        // Act
        var result = await controller.UpdateMemberRole(1, 2, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeOfType<GroupMemberResponse>();
    }

    [Fact]
    public async Task UpdateMemberRole_CannotChangeCreatorRole_ReturnsBadRequest()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var request = new UpdateMemberRoleRequest { Role = (int)GroupRole.Member };

        groupService.UpdateMemberRoleAsync(1, 1, 1, request)
            .Returns<GroupMember?>(_ => throw new InvalidOperationException("Cannot change the role of the group creator"));

        // Act
        var result = await controller.UpdateMemberRole(1, 1, request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("Cannot change the role of the group creator");
    }

    [Fact]
    public async Task GetGroupRecommendations_ValidGroup_ReturnsOkWithRecommendations()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<GroupsController>>();
        var feedService = Substitute.For<IGroupFeedService>();
        var controller = new GroupsController(groupService, feedService, recommendationsService, logger);

        // Mock HttpContext and User claims
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1")
        }));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var recommendations = new List<TmdbMovie>
        {
            new TmdbMovie { Id = 551, Title = "The Matrix", ReleaseDate = "1999-03-31" },
            new TmdbMovie { Id = 552, Title = "Inception", ReleaseDate = "2010-07-16" }
        };

        recommendationsService.GetGroupRecommendationsAsync(1, 1, 10).Returns(recommendations);

        // Act
        var result = await controller.GetGroupRecommendations(1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedMovies = okResult.Value.Should().BeAssignableTo<IEnumerable<TmdbMovie>>().Subject;
        returnedMovies.Should().HaveCount(2);
        returnedMovies.First().Title.Should().Be("The Matrix");
    }

    [Fact]
    public async Task GetGroupRecommendations_WithCustomCount_ReturnsSpecifiedNumber()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<GroupsController>>();
        var feedService = Substitute.For<IGroupFeedService>();
        var controller = new GroupsController(groupService, feedService, recommendationsService, logger);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1")
        }));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var recommendations = new List<TmdbMovie>
        {
            new TmdbMovie { Id = 551, Title = "Movie 1" },
            new TmdbMovie { Id = 552, Title = "Movie 2" },
            new TmdbMovie { Id = 553, Title = "Movie 3" }
        };

        recommendationsService.GetGroupRecommendationsAsync(1, 1, 3).Returns(recommendations);

        // Act
        var result = await controller.GetGroupRecommendations(1, count: 3);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedMovies = okResult.Value.Should().BeAssignableTo<IEnumerable<TmdbMovie>>().Subject;
        returnedMovies.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetGroupRecommendations_NoRecommendations_ReturnsEmptyList()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<GroupsController>>();
        var feedService = Substitute.For<IGroupFeedService>();
        var controller = new GroupsController(groupService, feedService, recommendationsService, logger);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1")
        }));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        recommendationsService.GetGroupRecommendationsAsync(1, 1, 10).Returns(new List<TmdbMovie>());

        // Act
        var result = await controller.GetGroupRecommendations(1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedMovies = okResult.Value.Should().BeAssignableTo<IEnumerable<TmdbMovie>>().Subject;
        returnedMovies.Should().BeEmpty();
    }

    [Fact]
    public async Task GetGroupRecommendations_ServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<GroupsController>>();
        var feedService = Substitute.For<IGroupFeedService>();
        var controller = new GroupsController(groupService, feedService, recommendationsService, logger);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1")
        }));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        recommendationsService.GetGroupRecommendationsAsync(1, 1, 10)
            .Returns<List<TmdbMovie>>(_ => throw new Exception("TMDb API error"));

        // Act
        var result = await controller.GetGroupRecommendations(1);

        // Assert
        var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task GetGroupRecommendationStats_ValidGroup_ReturnsOkWithStats()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<GroupsController>>();
        var feedService = Substitute.For<IGroupFeedService>();
        var controller = new GroupsController(groupService, feedService, recommendationsService, logger);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1")
        }));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var stats = new GroupRecommendationStats
        {
            GroupId = 1,
            GroupName = "Movie Fans",
            UniqueMovies = 10,
            AverageGroupRating = 8.5,
            Recommendations = new List<TmdbMovie>
            {
                new TmdbMovie { Id = 551, Title = "The Matrix" }
            }
        };

        recommendationsService.GetGroupRecommendationStatsAsync(1, 1).Returns(stats);

        // Act
        var result = await controller.GetGroupRecommendationStats(1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStats = okResult.Value.Should().BeOfType<GroupRecommendationStats>().Subject;
        returnedStats.GroupName.Should().Be("Movie Fans");
        returnedStats.UniqueMovies.Should().Be(10);
        returnedStats.AverageGroupRating.Should().Be(8.5);
    }

    [Fact]
    public async Task GetGroupRecommendationStats_Unauthorized_ReturnsUnauthorized()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<GroupsController>>();
        var feedService = Substitute.For<IGroupFeedService>();
        var controller = new GroupsController(groupService, feedService, recommendationsService, logger);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1")
        }));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var stats = new GroupRecommendationStats
        {
            GroupId = 1,
            GroupName = "Unauthorized"
        };

        recommendationsService.GetGroupRecommendationStatsAsync(1, 1).Returns(stats);

        // Act
        var result = await controller.GetGroupRecommendationStats(1);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task GetGroupRecommendationStats_GroupNotFound_ReturnsNotFound()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<GroupsController>>();
        var feedService = Substitute.For<IGroupFeedService>();
        var controller = new GroupsController(groupService, feedService, recommendationsService, logger);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1")
        }));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        var stats = new GroupRecommendationStats
        {
            GroupId = 999,
            GroupName = "Not Found"
        };

        recommendationsService.GetGroupRecommendationStatsAsync(999, 1).Returns(stats);

        // Act
        var result = await controller.GetGroupRecommendationStats(999);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetGroupRecommendationStats_ServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var recommendationsService = Substitute.For<IGroupRecommendationsService>();
        var logger = Substitute.For<ILogger<GroupsController>>();
        var feedService = Substitute.For<IGroupFeedService>();
        var controller = new GroupsController(groupService, feedService, recommendationsService, logger);

        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1")
        }));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };

        recommendationsService.GetGroupRecommendationStatsAsync(1, 1)
            .Returns<GroupRecommendationStats>(_ => throw new Exception("Database error"));

        // Act
        var result = await controller.GetGroupRecommendationStats(1);

        // Assert
        var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }

    // ── GetGroupStats ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetGroupStats_MemberOfGroup_ReturnsOkWithStats()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);

        var stats = new GroupStatsResponse
        {
            GroupId = 1,
            GroupName = "Movie Fans",
            TotalWatches = 10,
            UniqueMovies = 8,
            AverageGroupRating = 7.5,
            MostActiveMember = "testuser",
            MemberStats = new List<GroupMemberStats>
            {
                new GroupMemberStats { UserId = 1, Username = "testuser", WatchCount = 10, AverageRating = 7.5 }
            },
            SharedMovies = new List<SharedMovieStats>()
        };

        groupService.GetGroupStatsAsync(1, 1).Returns(stats);

        // Act
        var result = await controller.GetGroupStats(1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedStats = okResult.Value.Should().BeOfType<GroupStatsResponse>().Subject;
        returnedStats.TotalWatches.Should().Be(10);
        returnedStats.MostActiveMember.Should().Be("testuser");
    }

    [Fact]
    public async Task GetGroupStats_NotMember_ReturnsNotFound()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 99);
        groupService.GetGroupStatsAsync(1, 99).Returns((GroupStatsResponse?)null);

        // Act
        var result = await controller.GetGroupStats(1);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetGroupStats_ServiceThrows_Returns500()
    {
        // Arrange
        var groupService = Substitute.For<IGroupService>();
        var controller = CreateController(groupService, userId: 1);
        groupService.GetGroupStatsAsync(Arg.Any<int>(), Arg.Any<int>())
            .Returns<GroupStatsResponse?>(_ => throw new Exception("DB error"));

        // Act
        var result = await controller.GetGroupStats(1);

        // Assert
        var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }
}