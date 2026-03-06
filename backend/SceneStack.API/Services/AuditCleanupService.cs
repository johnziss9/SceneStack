using Microsoft.EntityFrameworkCore;
using SceneStack.API.Data;

namespace SceneStack.API.Services;

/// <summary>
/// Service for cleaning up old audit logs based on retention policy
/// </summary>
public class AuditCleanupService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AuditCleanupService> _logger;
    private readonly IConfiguration _configuration;

    public AuditCleanupService(
        ApplicationDbContext context,
        ILogger<AuditCleanupService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Deletes audit logs older than the configured retention period
    /// </summary>
    /// <returns>Number of logs deleted</returns>
    public async Task<int> CleanupOldAuditLogsAsync()
    {
        try
        {
            // Check if cleanup is enabled
            var cleanupEnabled = _configuration.GetValue<bool>("AuditSettings:CleanupEnabled", true);
            if (!cleanupEnabled)
            {
                _logger.LogInformation("Audit log cleanup is disabled in configuration");
                return 0;
            }

            // Get retention period from config (default 365 days = 1 year)
            var retentionDays = _configuration.GetValue<int>("AuditSettings:RetentionDays", 365);
            var cutoffDate = DateTime.UtcNow.AddDays(-retentionDays);

            _logger.LogInformation(
                "Starting audit log cleanup. Deleting logs older than {CutoffDate} (retention: {RetentionDays} days)",
                cutoffDate, retentionDays);

            // Count logs before deletion for logging
            var totalLogsBefore = await _context.AuditLogs.CountAsync();

            // Fetch old logs and delete them
            // Note: Using ToListAsync + RemoveRange instead of ExecuteDeleteAsync for compatibility
            // with both in-memory (tests) and real databases
            var oldLogs = await _context.AuditLogs
                .Where(a => a.Timestamp < cutoffDate)
                .ToListAsync();

            var deletedCount = oldLogs.Count;

            if (deletedCount > 0)
            {
                _context.AuditLogs.RemoveRange(oldLogs);
                await _context.SaveChangesAsync();
            }

            var totalLogsAfter = await _context.AuditLogs.CountAsync();

            _logger.LogInformation(
                "Audit log cleanup completed. Deleted {DeletedCount} logs older than {CutoffDate}. " +
                "Total logs: {Before} → {After}",
                deletedCount, cutoffDate, totalLogsBefore, totalLogsAfter);

            return deletedCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup old audit logs");
            throw;
        }
    }

    /// <summary>
    /// Deletes old audit logs in batches to avoid overwhelming the database
    /// Use this for very large audit log tables (millions of rows)
    /// </summary>
    /// <returns>Number of logs deleted</returns>
    public async Task<int> CleanupOldAuditLogsInBatchesAsync()
    {
        try
        {
            // Check if cleanup is enabled
            var cleanupEnabled = _configuration.GetValue<bool>("AuditSettings:CleanupEnabled", true);
            if (!cleanupEnabled)
            {
                _logger.LogInformation("Audit log cleanup is disabled in configuration");
                return 0;
            }

            var retentionDays = _configuration.GetValue<int>("AuditSettings:RetentionDays", 365);
            var cutoffDate = DateTime.UtcNow.AddDays(-retentionDays);
            var totalDeleted = 0;
            var batchSize = 10000; // Delete 10k rows at a time

            _logger.LogInformation(
                "Starting batched audit log cleanup. Deleting logs older than {CutoffDate} in batches of {BatchSize}",
                cutoffDate, batchSize);

            while (true)
            {
                // Delete a batch of old logs
                var deletedCount = await _context.Database.ExecuteSqlRawAsync(
                    @"DELETE FROM ""AuditLogs""
                      WHERE ""Id"" IN (
                          SELECT ""Id"" FROM ""AuditLogs""
                          WHERE ""Timestamp"" < {0}
                          LIMIT {1}
                      )",
                    cutoffDate, batchSize);

                totalDeleted += deletedCount;

                _logger.LogInformation("Deleted batch of {Count} logs. Total deleted: {Total}",
                    deletedCount, totalDeleted);

                // If we deleted fewer than batchSize, we're done
                if (deletedCount < batchSize)
                    break;

                // Small delay to avoid overwhelming the database
                await Task.Delay(100);
            }

            _logger.LogInformation(
                "Batched audit log cleanup completed. Total deleted: {TotalDeleted} logs",
                totalDeleted);

            return totalDeleted;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup old audit logs in batches");
            throw;
        }
    }
}
