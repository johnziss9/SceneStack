using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SceneStack.API.Controllers;
using SceneStack.API.DTOs;
using SceneStack.API.Interfaces;
using System.Security.Claims;

namespace SceneStack.Tests.Controllers;

public class InvitationsControllerTests
{
    private InvitationsController CreateControllerWithAuthenticatedUser(
        IInvitationService invitationService,
        int userId = 1)
    {
        var logger = Substitute.For<ILogger<InvitationsController>>();
        var controller = new InvitationsController(invitationService, logger);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, "testuser"),
            new Claim(ClaimTypes.Email, "test@example.com")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };

        return controller;
    }

    #region CreateInvitation Tests

    [Fact]
    public async Task CreateInvitation_ValidRequest_ReturnsOkWithInvitation()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        var request = new CreateInvitationRequest
        {
            GroupId = 1,
            InvitedUserId = 2
        };

        var expectedResponse = new InvitationResponse
        {
            Id = 1,
            GroupId = 1,
            GroupName = "Movie Buffs",
            GroupMemberCount = 2,
            InvitedUserId = 2,
            InvitedUsername = "invited",
            InvitedUserEmail = "invited@example.com",
            InvitedByUserId = 1,
            InvitedByUsername = "testuser",
            Status = 0, // Pending
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };

        invitationService.CreateInvitationAsync(1, request).Returns(expectedResponse);

        // Act
        var result = await controller.CreateInvitation(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedInvitation = okResult.Value.Should().BeOfType<InvitationResponse>().Subject;
        returnedInvitation.Id.Should().Be(1);
        returnedInvitation.GroupId.Should().Be(1);
        returnedInvitation.InvitedUserId.Should().Be(2);
        returnedInvitation.Status.Should().Be(0);

        await invitationService.Received(1).CreateInvitationAsync(1, request);
    }

    [Fact]
    public async Task CreateInvitation_UnauthorizedUser_ReturnsUnauthorized()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        var request = new CreateInvitationRequest
        {
            GroupId = 1,
            InvitedUserId = 2
        };

        invitationService.CreateInvitationAsync(1, request)
            .Returns<InvitationResponse>(x => throw new UnauthorizedAccessException("Only admins and creators can send invitations"));

        // Act
        var result = await controller.CreateInvitation(request);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().Be("Only admins and creators can send invitations");
    }

    [Fact]
    public async Task CreateInvitation_InvalidRequest_ReturnsBadRequest()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        var request = new CreateInvitationRequest
        {
            GroupId = 1,
            InvitedUserId = 2
        };

        invitationService.CreateInvitationAsync(1, request)
            .Returns<InvitationResponse>(x => throw new InvalidOperationException("User already has a pending invitation to this group"));

        // Act
        var result = await controller.CreateInvitation(request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("User already has a pending invitation to this group");
    }

    [Fact]
    public async Task CreateInvitation_ServiceError_ReturnsInternalServerError()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        var request = new CreateInvitationRequest
        {
            GroupId = 1,
            InvitedUserId = 2
        };

        invitationService.CreateInvitationAsync(1, request)
            .Returns<InvitationResponse>(x => throw new Exception("Database error"));

        // Act
        var result = await controller.CreateInvitation(request);

        // Assert
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
        statusCodeResult.Value.Should().Be("An error occurred while creating the invitation");
    }

    #endregion

    #region GetPendingInvitations Tests

    [Fact]
    public async Task GetPendingInvitations_ValidRequest_ReturnsOkWithInvitations()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        var expectedInvitations = new List<InvitationResponse>
        {
            new InvitationResponse
            {
                Id = 1,
                GroupId = 1,
                GroupName = "Movie Buffs",
                InvitedUserId = 2,
                InvitedByUserId = 1,
                Status = 0
            },
            new InvitationResponse
            {
                Id = 2,
                GroupId = 2,
                GroupName = "Cinema Club",
                InvitedUserId = 2,
                InvitedByUserId = 3,
                Status = 0
            }
        };

        invitationService.GetUserPendingInvitationsAsync(2).Returns(expectedInvitations);

        // Act
        var result = await controller.GetPendingInvitations();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedInvitations = okResult.Value.Should().BeAssignableTo<IEnumerable<InvitationResponse>>().Subject;
        returnedInvitations.Should().HaveCount(2);

        await invitationService.Received(1).GetUserPendingInvitationsAsync(2);
    }

    [Fact]
    public async Task GetPendingInvitations_NoInvitations_ReturnsEmptyList()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        invitationService.GetUserPendingInvitationsAsync(2).Returns(new List<InvitationResponse>());

        // Act
        var result = await controller.GetPendingInvitations();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedInvitations = okResult.Value.Should().BeAssignableTo<IEnumerable<InvitationResponse>>().Subject;
        returnedInvitations.Should().BeEmpty();
    }

    [Fact]
    public async Task GetPendingInvitations_ServiceError_ReturnsInternalServerError()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        invitationService.GetUserPendingInvitationsAsync(2)
            .Returns<IEnumerable<InvitationResponse>>(x => throw new Exception("Database error"));

        // Act
        var result = await controller.GetPendingInvitations();

        // Assert
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region GetPendingCount Tests

    [Fact]
    public async Task GetPendingCount_ValidRequest_ReturnsOkWithCount()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        invitationService.GetPendingInvitationsCountAsync(2).Returns(3);

        // Act
        var result = await controller.GetPendingCount();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var countResponse = okResult.Value.Should().BeOfType<PendingInvitationsCountResponse>().Subject;
        countResponse.Count.Should().Be(3);

        await invitationService.Received(1).GetPendingInvitationsCountAsync(2);
    }

    [Fact]
    public async Task GetPendingCount_NoInvitations_ReturnsZero()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        invitationService.GetPendingInvitationsCountAsync(2).Returns(0);

        // Act
        var result = await controller.GetPendingCount();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var countResponse = okResult.Value.Should().BeOfType<PendingInvitationsCountResponse>().Subject;
        countResponse.Count.Should().Be(0);
    }

    [Fact]
    public async Task GetPendingCount_ServiceError_ReturnsInternalServerError()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        invitationService.GetPendingInvitationsCountAsync(2)
            .Returns<int>(x => throw new Exception("Database error"));

        // Act
        var result = await controller.GetPendingCount();

        // Assert
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region RespondToInvitation Tests

    [Fact]
    public async Task RespondToInvitation_Accept_ReturnsOkWithUpdatedInvitation()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        var request = new RespondToInvitationRequest { Accept = true };
        var expectedResponse = new InvitationResponse
        {
            Id = 1,
            GroupId = 1,
            InvitedUserId = 2,
            Status = 1, // Accepted
            RespondedAt = DateTime.UtcNow
        };

        invitationService.RespondToInvitationAsync(1, 2, request).Returns(expectedResponse);

        // Act
        var result = await controller.RespondToInvitation(1, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedInvitation = okResult.Value.Should().BeOfType<InvitationResponse>().Subject;
        returnedInvitation.Status.Should().Be(1);
        returnedInvitation.RespondedAt.Should().NotBeNull();

        await invitationService.Received(1).RespondToInvitationAsync(1, 2, request);
    }

    [Fact]
    public async Task RespondToInvitation_Decline_ReturnsOkWithUpdatedInvitation()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        var request = new RespondToInvitationRequest { Accept = false };
        var expectedResponse = new InvitationResponse
        {
            Id = 1,
            GroupId = 1,
            InvitedUserId = 2,
            Status = 2, // Declined
            RespondedAt = DateTime.UtcNow
        };

        invitationService.RespondToInvitationAsync(1, 2, request).Returns(expectedResponse);

        // Act
        var result = await controller.RespondToInvitation(1, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedInvitation = okResult.Value.Should().BeOfType<InvitationResponse>().Subject;
        returnedInvitation.Status.Should().Be(2);
    }

    [Fact]
    public async Task RespondToInvitation_NotFound_ReturnsNotFound()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        var request = new RespondToInvitationRequest { Accept = true };

        invitationService.RespondToInvitationAsync(999, 2, request).Returns((InvitationResponse?)null);

        // Act
        var result = await controller.RespondToInvitation(999, request);

        // Assert
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().Be("Invitation not found");
    }

    [Fact]
    public async Task RespondToInvitation_WrongUser_ReturnsUnauthorized()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 3);

        var request = new RespondToInvitationRequest { Accept = true };

        invitationService.RespondToInvitationAsync(1, 3, request)
            .Returns<InvitationResponse?>(x => throw new UnauthorizedAccessException("You can only respond to your own invitations"));

        // Act
        var result = await controller.RespondToInvitation(1, request);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().Be("You can only respond to your own invitations");
    }

    [Fact]
    public async Task RespondToInvitation_AlreadyResponded_ReturnsBadRequest()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        var request = new RespondToInvitationRequest { Accept = true };

        invitationService.RespondToInvitationAsync(1, 2, request)
            .Returns<InvitationResponse?>(x => throw new InvalidOperationException("This invitation has already been responded to"));

        // Act
        var result = await controller.RespondToInvitation(1, request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("This invitation has already been responded to");
    }

    [Fact]
    public async Task RespondToInvitation_ExpiredInvitation_ReturnsBadRequest()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        var request = new RespondToInvitationRequest { Accept = true };

        invitationService.RespondToInvitationAsync(1, 2, request)
            .Returns<InvitationResponse?>(x => throw new InvalidOperationException("This invitation has expired"));

        // Act
        var result = await controller.RespondToInvitation(1, request);

        // Assert
        var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("This invitation has expired");
    }

    #endregion

    #region CancelInvitation Tests

    [Fact]
    public async Task CancelInvitation_ValidRequest_ReturnsNoContent()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        invitationService.CancelInvitationAsync(1, 1).Returns(true);

        // Act
        var result = await controller.CancelInvitation(1);

        // Assert
        result.Should().BeOfType<NoContentResult>();

        await invitationService.Received(1).CancelInvitationAsync(1, 1);
    }

    [Fact]
    public async Task CancelInvitation_NotFound_ReturnsNotFound()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        invitationService.CancelInvitationAsync(999, 1).Returns(false);

        // Act
        var result = await controller.CancelInvitation(999);

        // Assert
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().Be("Invitation not found or already processed");
    }

    [Fact]
    public async Task CancelInvitation_WrongUser_ReturnsUnauthorized()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        invitationService.CancelInvitationAsync(1, 2)
            .Returns<bool>(x => throw new UnauthorizedAccessException("You can only cancel invitations you created"));

        // Act
        var result = await controller.CancelInvitation(1);

        // Assert
        var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().Be("You can only cancel invitations you created");
    }

    [Fact]
    public async Task CancelInvitation_ServiceError_ReturnsInternalServerError()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        invitationService.CancelInvitationAsync(1, 1)
            .Returns<bool>(x => throw new Exception("Database error"));

        // Act
        var result = await controller.CancelInvitation(1);

        // Assert
        var statusCodeResult = result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region GetSentInvitations Tests

    [Fact]
    public async Task GetSentInvitations_ValidRequest_ReturnsOkWithInvitations()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        var expectedInvitations = new List<InvitationResponse>
        {
            new InvitationResponse
            {
                Id = 1,
                GroupId = 1,
                InvitedUserId = 2,
                InvitedByUserId = 1,
                Status = 0
            },
            new InvitationResponse
            {
                Id = 2,
                GroupId = 1,
                InvitedUserId = 3,
                InvitedByUserId = 1,
                Status = 0
            }
        };

        invitationService.GetSentInvitationsAsync(1, 1).Returns(expectedInvitations);

        // Act
        var result = await controller.GetSentInvitations(1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedInvitations = okResult.Value.Should().BeAssignableTo<IEnumerable<InvitationResponse>>().Subject;
        returnedInvitations.Should().HaveCount(2);

        await invitationService.Received(1).GetSentInvitationsAsync(1, 1);
    }

    [Fact]
    public async Task GetSentInvitations_NotMember_ReturnsUnauthorized()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 2);

        invitationService.GetSentInvitationsAsync(1, 2)
            .Returns<IEnumerable<InvitationResponse>>(x => throw new UnauthorizedAccessException("You must be a member of this group to view invitations"));

        // Act
        var result = await controller.GetSentInvitations(1);

        // Assert
        var unauthorizedResult = result.Result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().Be("You must be a member of this group to view invitations");
    }

    [Fact]
    public async Task GetSentInvitations_ServiceError_ReturnsInternalServerError()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        invitationService.GetSentInvitationsAsync(1, 1)
            .Returns<IEnumerable<InvitationResponse>>(x => throw new Exception("Database error"));

        // Act
        var result = await controller.GetSentInvitations(1);

        // Assert
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region SearchUsers Tests

    [Fact]
    public async Task SearchUsers_ValidQuery_ReturnsOkWithResults()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        var expectedResults = new List<UserSearchResult>
        {
            new UserSearchResult
            {
                Id = 2,
                Username = "john",
                Email = "john@example.com",
                IsPremium = true,
                CanJoinMoreGroups = true
            },
            new UserSearchResult
            {
                Id = 3,
                Username = "johnny",
                Email = "johnny@example.com",
                IsPremium = false,
                CanJoinMoreGroups = true
            }
        };

        invitationService.SearchUsersAsync(
            Arg.Is<UserSearchRequest>(r => r.Query == "john" && r.ExcludeGroupId == null),
            1
        ).Returns(expectedResults);

        // Act
        var result = await controller.SearchUsers("john", null);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedResults = okResult.Value.Should().BeAssignableTo<IEnumerable<UserSearchResult>>().Subject;
        returnedResults.Should().HaveCount(2);
    }

    [Fact]
    public async Task SearchUsers_WithExcludeGroup_ReturnsFilteredResults()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        var expectedResults = new List<UserSearchResult>
        {
            new UserSearchResult
            {
                Id = 3,
                Username = "johnny",
                Email = "johnny@example.com",
                IsPremium = false,
                CanJoinMoreGroups = true
            }
        };

        invitationService.SearchUsersAsync(
            Arg.Is<UserSearchRequest>(r => r.Query == "john" && r.ExcludeGroupId == 1),
            1
        ).Returns(expectedResults);

        // Act
        var result = await controller.SearchUsers("john", 1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedResults = okResult.Value.Should().BeAssignableTo<IEnumerable<UserSearchResult>>().Subject;
        returnedResults.Should().HaveCount(1);
    }

    [Fact]
    public async Task SearchUsers_NoMatches_ReturnsEmptyList()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        invitationService.SearchUsersAsync(
            Arg.Any<UserSearchRequest>(),
            1
        ).Returns(new List<UserSearchResult>());

        // Act
        var result = await controller.SearchUsers("nonexistent", null);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedResults = okResult.Value.Should().BeAssignableTo<IEnumerable<UserSearchResult>>().Subject;
        returnedResults.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchUsers_ServiceError_ReturnsInternalServerError()
    {
        // Arrange
        var invitationService = Substitute.For<IInvitationService>();
        var controller = CreateControllerWithAuthenticatedUser(invitationService, userId: 1);

        invitationService.SearchUsersAsync(Arg.Any<UserSearchRequest>(), 1)
            .Returns<IEnumerable<UserSearchResult>>(x => throw new Exception("Database error"));

        // Act
        var result = await controller.SearchUsers("john", null);

        // Assert
        var statusCodeResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
        statusCodeResult.StatusCode.Should().Be(500);
    }

    #endregion
}
