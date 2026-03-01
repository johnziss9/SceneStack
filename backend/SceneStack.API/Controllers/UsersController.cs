using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SceneStack.API.DTOs;
using SceneStack.API.Extensions;
using SceneStack.API.Services;

namespace SceneStack.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    // GET: api/users/profile
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.GetUserId();
        var user = await _userService.GetProfileAsync(userId);

        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        return Ok(new
        {
            userId = user.Id,
            username = user.Username,
            email = user.Email,
            bio = user.Bio,
            isPremium = user.IsPremium,
            createdAt = user.CreatedAt
        });
    }

    // PUT: api/users/profile
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.GetUserId();

        try
        {
            var updatedUser = await _userService.UpdateProfileAsync(userId, request);

            if (updatedUser == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(new
            {
                userId = updatedUser.Id,
                username = updatedUser.Username,
                email = updatedUser.Email,
                bio = updatedUser.Bio,
                isPremium = updatedUser.IsPremium,
                createdAt = updatedUser.CreatedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    // PUT: api/users/password
    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.GetUserId();

        var success = await _userService.ChangePasswordAsync(userId, request);

        if (!success)
        {
            return BadRequest(new { message = "Failed to change password. Please check your current password and try again." });
        }

        return Ok(new { message = "Password changed successfully" });
    }

    // DELETE: api/users/account
    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
    {
        var userId = User.GetUserId();

        var success = await _userService.DeleteAccountAsync(userId, request.Password);

        if (!success)
        {
            return BadRequest(new { message = "Failed to delete account. Please check your password and try again." });
        }

        return Ok(new { message = "Account deleted successfully" });
    }

    // GET: api/users/export-data?format=csv|json
    [HttpGet("export-data")]
    public async Task<IActionResult> ExportData([FromQuery] string format = "csv")
    {
        var userId = User.GetUserId();

        // Validate format parameter
        if (format != "csv" && format != "json")
        {
            return BadRequest(new { message = "Invalid format. Must be 'csv' or 'json'" });
        }

        try
        {
            var (content, contentType, fileName) = await _userService.ExportUserDataAsync(userId, format);

            return File(
                content,
                contentType,
                fileName
            );
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to export data: {ex.Message}" });
        }
    }

    // GET: api/users/groups/created
    [HttpGet("groups/created")]
    public async Task<IActionResult> GetCreatedGroupsWithEligibility()
    {
        var userId = User.GetUserId();
        var groups = await _userService.GetCreatedGroupsWithTransferEligibilityAsync(userId);
        return Ok(groups);
    }

    // POST: api/users/groups/manage
    [HttpPost("groups/manage")]
    public async Task<IActionResult> ManageGroupsBeforeDeletion([FromBody] ManageGroupsBeforeDeletionRequest request)
    {
        var userId = User.GetUserId();

        try
        {
            await _userService.ManageGroupsBeforeDeletionAsync(userId, request.GroupActions);
            return Ok(new { message = "Groups managed successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST: api/users/deactivate
    [HttpPost("deactivate")]
    public async Task<IActionResult> DeactivateAccount()
    {
        var userId = User.GetUserId();

        var success = await _userService.DeactivateAccountAsync(userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to deactivate account" });
        }

        return Ok(new { message = "Account deactivated successfully. You can reactivate anytime by logging in." });
    }

    // POST: api/users/reactivate
    [HttpPost("reactivate")]
    public async Task<IActionResult> ReactivateAccount()
    {
        var userId = User.GetUserId();

        var success = await _userService.ReactivateAccountAsync(userId);

        if (!success)
        {
            return BadRequest(new { message = "Failed to reactivate account" });
        }

        return Ok(new { message = "Account reactivated successfully" });
    }
}
