using Serilog.Context;

namespace SceneStack.API.Middleware;

public class CorrelationIdMiddleware
{
    private const string CorrelationIdHeader = "X-Correlation-ID";
    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Get or generate correlation ID
        var correlationId = context.Request.Headers[CorrelationIdHeader].FirstOrDefault()
            ?? Guid.NewGuid().ToString();

        // Store in HttpContext for access throughout the request
        context.Items["CorrelationId"] = correlationId;

        // Add to response headers
        context.Response.Headers[CorrelationIdHeader] = correlationId;

        // Push correlation ID and user ID to Serilog's LogContext
        using (LogContext.PushProperty("CorrelationId", correlationId))
        using (LogContext.PushProperty("UserId", context.User?.FindFirst("userId")?.Value ?? "anonymous"))
        using (LogContext.PushProperty("IpAddress", context.Connection.RemoteIpAddress?.ToString() ?? "unknown"))
        {
            _logger.LogDebug("Request started with CorrelationId: {CorrelationId}", correlationId);

            await _next(context);

            _logger.LogDebug("Request completed with CorrelationId: {CorrelationId}", correlationId);
        }
    }
}
