using SceneStack.API.Services;

namespace SceneStack.API.Jobs;

/// <summary>
/// Background job that runs daily to delete old audit logs based on retention policy.
/// By default, keeps logs for 1 year (365 days) and deletes older logs.
/// </summary>
public class AuditCleanupJob
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<AuditCleanupJob> _logger;

    public AuditCleanupJob(
        IServiceScopeFactory serviceScopeFactory,
        ILogger<AuditCleanupJob> logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    public async Task ExecuteAsync()
    {
        _logger.LogInformation("Starting audit log cleanup job at {Time}", DateTime.UtcNow);

        using var scope = _serviceScopeFactory.CreateScope();
        var cleanupService = scope.ServiceProvider.GetRequiredService<AuditCleanupService>();

        try
        {
            // Run the cleanup
            var deletedCount = await cleanupService.CleanupOldAuditLogsAsync();

            if (deletedCount > 0)
            {
                _logger.LogInformation(
                    "Audit log cleanup job completed successfully at {Time}. Deleted {Count} old logs",
                    DateTime.UtcNow, deletedCount);
            }
            else
            {
                _logger.LogInformation(
                    "Audit log cleanup job completed at {Time}. No old logs to delete",
                    DateTime.UtcNow);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in audit log cleanup job");
            throw;
        }
    }
}
