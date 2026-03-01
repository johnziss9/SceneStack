using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;
using SceneStack.API.Models;
using SceneStack.API.Services;

namespace SceneStack.API.Jobs;

/// <summary>
/// Background job that runs daily to permanently lock accounts that have been
/// deactivated for 30+ days and execute their pending group actions.
/// </summary>
public class AccountCleanupJob
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<AccountCleanupJob> _logger;

    public AccountCleanupJob(
        IServiceScopeFactory serviceScopeFactory,
        ILogger<AccountCleanupJob> logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    public async Task ExecuteAsync()
    {
        _logger.LogInformation("Starting account cleanup job at {Time}", DateTime.UtcNow);

        using var scope = _serviceScopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var userService = scope.ServiceProvider.GetRequiredService<IUserService>();

        try
        {
            // Find accounts scheduled for deletion that have been deactivated for 30+ days
            // IMPORTANT: Only process accounts with PendingGroupActions (deletion requested)
            // Users who just deactivated for a break will NOT have PendingGroupActions
            var cutoffDate = DateTime.UtcNow.AddDays(-30);

            var accountsToLock = await context.Users
                .Where(u => u.IsDeactivated &&
                           u.DeactivatedAt.HasValue &&
                           u.DeactivatedAt.Value <= cutoffDate &&
                           !u.IsDeleted &&
                           !string.IsNullOrEmpty(u.PendingGroupActions)) // Only deletion requests!
                .ToListAsync();

            _logger.LogInformation("Found {Count} accounts scheduled for deletion (30+ days)", accountsToLock.Count);

            foreach (var user in accountsToLock)
            {
                try
                {
                    _logger.LogInformation(
                        "Processing permanent lock for user {UserId} ({Username}), deactivated on {DeactivatedAt}",
                        user.Id,
                        user.Username,
                        user.DeactivatedAt);

                    // Execute pending group actions (transfer/delete groups)
                    if (!string.IsNullOrEmpty(user.PendingGroupActions))
                    {
                        _logger.LogInformation("Executing pending group actions for user {UserId}", user.Id);
                        await userService.ExecutePendingGroupActionsAsync(user.Id);
                    }

                    // Remove user from all groups they're a member of (not creator)
                    var memberships = await context.GroupMembers
                        .Where(gm => gm.UserId == user.Id && gm.Role != GroupRole.Creator)
                        .ToListAsync();

                    if (memberships.Any())
                    {
                        _logger.LogInformation("Removing user {UserId} from {Count} groups", user.Id, memberships.Count);
                        context.GroupMembers.RemoveRange(memberships);
                    }

                    // Permanently lock the account
                    user.IsDeleted = true;
                    user.DeletedAt = DateTime.UtcNow;

                    await context.SaveChangesAsync();

                    _logger.LogInformation(
                        "Successfully locked account for user {UserId} ({Username})",
                        user.Id,
                        user.Username);
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Error processing account lock for user {UserId} ({Username})",
                        user.Id,
                        user.Username);
                    // Continue processing other accounts even if one fails
                }
            }

            _logger.LogInformation("Account cleanup job completed successfully at {Time}", DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in account cleanup job");
            throw;
        }
    }
}
