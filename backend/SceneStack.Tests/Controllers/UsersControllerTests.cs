using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using SceneStack.API.Controllers;
using SceneStack.API.DTOs;
using SceneStack.API.Models;
using SceneStack.API.Services;

namespace SceneStack.Tests.Controllers;

public class UsersControllerTests
{
    private UsersController CreateControllerWithAuthenticatedUser(
        IUserService userService,
        int userId = 1)
    {
        var controller = new UsersController(userService);

        // Mock the authenticated user
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

    [Fact]
    public async Task GetProfile_ExistingUser_ReturnsOkWithProfile()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var user = new User
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com",
            Bio = "Test bio",
            IsPremium = false,
            CreatedAt = DateTime.UtcNow
        };

        userService.GetProfileAsync(1).Returns(user);

        // Act
        var result = await controller.GetProfile();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var profile = okResult.Value;
        profile.Should().NotBeNull();
    }

    [Fact]
    public async Task GetProfile_NonExistentUser_ReturnsNotFound()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 999);

        userService.GetProfileAsync(999).Returns((User?)null);

        // Act
        var result = await controller.GetProfile();

        // Assert
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { message = "User not found" });
    }

    [Fact]
    public async Task UpdateProfile_ValidRequest_ReturnsOkWithUpdatedProfile()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var request = new UpdateProfileRequest(
            Username: "newusername",
            Email: "newemail@example.com",
            Bio: "Updated bio"
        );

        var updatedUser = new User
        {
            Id = 1,
            Username = "newusername",
            Email = "newemail@example.com",
            Bio = "Updated bio",
            IsPremium = false,
            CreatedAt = DateTime.UtcNow
        };

        userService.UpdateProfileAsync(1, request).Returns(updatedUser);

        // Act
        var result = await controller.UpdateProfile(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var profile = okResult.Value;
        profile.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateProfile_DuplicateUsername_ReturnsConflict()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var request = new UpdateProfileRequest(
            Username: "existinguser",
            Email: null,
            Bio: null
        );

        userService.UpdateProfileAsync(1, request)
            .Returns(Task.FromException<User?>(new InvalidOperationException("Username is already taken")));

        // Act
        var result = await controller.UpdateProfile(request);

        // Assert
        var conflictResult = result.Should().BeOfType<ConflictObjectResult>().Subject;
        conflictResult.Value.Should().BeEquivalentTo(new { message = "Username is already taken" });
    }

    [Fact]
    public async Task UpdateProfile_NonExistentUser_ReturnsNotFound()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 999);

        var request = new UpdateProfileRequest(
            Username: "newusername",
            Email: null,
            Bio: null
        );

        userService.UpdateProfileAsync(999, request).Returns((User?)null);

        // Act
        var result = await controller.UpdateProfile(request);

        // Assert
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { message = "User not found" });
    }

    [Fact]
    public async Task UpdateProfile_OnlyBio_UpdatesBioOnly()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var request = new UpdateProfileRequest(
            Username: null,
            Email: null,
            Bio: "New bio only"
        );

        var updatedUser = new User
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com",
            Bio = "New bio only",
            IsPremium = false,
            CreatedAt = DateTime.UtcNow
        };

        userService.UpdateProfileAsync(1, request).Returns(updatedUser);

        // Act
        var result = await controller.UpdateProfile(request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        await userService.Received(1).UpdateProfileAsync(1, request);
    }

    [Fact]
    public async Task ChangePassword_ValidRequest_ReturnsOkWithSuccessMessage()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var request = new ChangePasswordRequest(
            CurrentPassword: "oldpassword123",
            NewPassword: "newpassword123",
            ConfirmPassword: "newpassword123"
        );

        userService.ChangePasswordAsync(1, request).Returns(true);

        // Act
        var result = await controller.ChangePassword(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { message = "Password changed successfully" });
    }

    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_ReturnsBadRequest()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var request = new ChangePasswordRequest(
            CurrentPassword: "wrongpassword",
            NewPassword: "newpassword123",
            ConfirmPassword: "newpassword123"
        );

        userService.ChangePasswordAsync(1, request).Returns(false);

        // Act
        var result = await controller.ChangePassword(request);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Failed to change password. Please check your current password and try again." });
    }

    [Fact]
    public async Task DeleteAccount_ValidPassword_ReturnsOkWithSuccessMessage()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var request = new DeleteAccountRequest(Password: "correctpassword");

        userService.DeleteAccountAsync(1, "correctpassword").Returns(true);

        // Act
        var result = await controller.DeleteAccount(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { message = "Account deleted successfully" });
    }

    [Fact]
    public async Task DeleteAccount_WrongPassword_ReturnsBadRequest()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var request = new DeleteAccountRequest(Password: "wrongpassword");

        userService.DeleteAccountAsync(1, "wrongpassword").Returns(false);

        // Act
        var result = await controller.DeleteAccount(request);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Failed to delete account. Please check your password and try again." });
    }

    [Fact]
    public async Task DeactivateAccount_ValidUser_ReturnsOk()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        userService.DeactivateAccountAsync(1).Returns(true);

        // Act
        var result = await controller.DeactivateAccount();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { message = "Account deactivated successfully. You can reactivate anytime by logging in." });
    }

    [Fact]
    public async Task DeactivateAccount_ServiceFails_ReturnsBadRequest()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        userService.DeactivateAccountAsync(1).Returns(false);

        // Act
        var result = await controller.DeactivateAccount();

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Failed to deactivate account" });
    }

    [Fact]
    public async Task ReactivateAccount_ValidUser_ReturnsOk()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        userService.ReactivateAccountAsync(1).Returns(true);

        // Act
        var result = await controller.ReactivateAccount();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { message = "Account reactivated successfully" });
    }

    [Fact]
    public async Task ReactivateAccount_ServiceFails_ReturnsBadRequest()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        userService.ReactivateAccountAsync(1).Returns(false);

        // Act
        var result = await controller.ReactivateAccount();

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Failed to reactivate account" });
    }

    [Fact]
    public async Task GetCreatedGroupsWithEligibility_ReturnsGroupsWithTransferInfo()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var groups = new List<GroupWithTransferEligibilityResponse>
        {
            new GroupWithTransferEligibilityResponse(
                GroupId: 1,
                GroupName: "Test Group",
                MemberCount: 3,
                EligibleMembers: new List<EligibleTransferMember>
                {
                    new EligibleTransferMember(
                        UserId: 2,
                        Username: "premiumuser",
                        IsPremium: true,
                        IsAdmin: true,
                        IsEligible: true
                    )
                },
                CanTransfer: true
            )
        };

        userService.GetCreatedGroupsWithTransferEligibilityAsync(1).Returns(groups);

        // Act
        var result = await controller.GetCreatedGroupsWithEligibility();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedGroups = okResult.Value.Should().BeAssignableTo<IEnumerable<GroupWithTransferEligibilityResponse>>().Subject;
        returnedGroups.Should().HaveCount(1);
        returnedGroups.First().CanTransfer.Should().BeTrue();
    }

    [Fact]
    public async Task ManageGroupsBeforeDeletion_ValidActions_ReturnsOk()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var groupActions = new List<GroupActionRequest>
        {
            new GroupActionRequest(GroupId: 1, Action: "transfer", TransferToUserId: 2),
            new GroupActionRequest(GroupId: 2, Action: "delete", TransferToUserId: null)
        };

        var request = new ManageGroupsBeforeDeletionRequest(groupActions);

        // Act
        var result = await controller.ManageGroupsBeforeDeletion(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { message = "Groups managed successfully" });
        await userService.Received(1).ManageGroupsBeforeDeletionAsync(1, groupActions);
    }

    [Fact]
    public async Task ManageGroupsBeforeDeletion_InvalidAction_ReturnsBadRequest()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var groupActions = new List<GroupActionRequest>
        {
            new GroupActionRequest(GroupId: 1, Action: "transfer", TransferToUserId: null) // Missing TransferToUserId
        };

        var request = new ManageGroupsBeforeDeletionRequest(groupActions);

        userService.ManageGroupsBeforeDeletionAsync(1, groupActions)
            .Returns(Task.FromException(new InvalidOperationException("Transfer requires a target user ID")));

        // Act
        var result = await controller.ManageGroupsBeforeDeletion(request);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().NotBeNull();
    }

    [Fact]
    public async Task ManageGroupsBeforeDeletion_TransferToDeactivatedUser_ReturnsBadRequest()
    {
        // Arrange
        var userService = Substitute.For<IUserService>();
        var controller = CreateControllerWithAuthenticatedUser(userService, userId: 1);

        var groupActions = new List<GroupActionRequest>
        {
            new GroupActionRequest(GroupId: 1, Action: "transfer", TransferToUserId: 2)
        };

        var request = new ManageGroupsBeforeDeletionRequest(groupActions);

        userService.ManageGroupsBeforeDeletionAsync(1, groupActions)
            .Returns(Task.FromException(new InvalidOperationException("User 2 is not eligible to receive group ownership (deleted or deactivated)")));

        // Act
        var result = await controller.ManageGroupsBeforeDeletion(request);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().NotBeNull();
    }
}
