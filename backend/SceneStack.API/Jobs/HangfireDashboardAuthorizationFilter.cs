using Hangfire.Dashboard;

namespace SceneStack.API.Jobs;

/// <summary>
/// Authorization filter for Hangfire dashboard.
/// In production, this should check if the user is an admin.
/// For development, allows access only in development environment.
/// </summary>
public class HangfireDashboardAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // In development, allow access
        // TODO: In production, check if user is authenticated and has admin role
        var isDevelopment = httpContext.RequestServices
            .GetRequiredService<IWebHostEnvironment>()
            .IsDevelopment();

        if (isDevelopment)
        {
            return true;
        }

        // In production, require authentication
        // You can add role checks here: httpContext.User.IsInRole("Admin")
        return httpContext.User.Identity?.IsAuthenticated ?? false;
    }
}
