using System.Text;
using System.Threading.RateLimiting;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using SceneStack.API.Configuration;
using SceneStack.API.Data;
using SceneStack.API.Extensions;
using SceneStack.API.Interfaces;
using SceneStack.API.Jobs;
using SceneStack.API.Models;
using SceneStack.API.Services;
using Serilog;
using SceneStack.API.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog early in the pipeline
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .CreateLogger();

builder.Host.UseSerilog();

// Configure Sentry
builder.WebHost.UseSentry(options =>
{
    options.Dsn = builder.Configuration["Sentry:Dsn"];
    options.Environment = builder.Environment.EnvironmentName;
    options.TracesSampleRate = builder.Environment.IsProduction() ? 0.1 : 1.0;
    options.AttachStacktrace = true;
    options.SendDefaultPii = false; // Don't send personally identifiable information
    options.MaxBreadcrumbs = 50;
    options.Debug = builder.Environment.IsDevelopment();

    // Filter sensitive data before sending to Sentry
    options.SetBeforeSend((sentryEvent, hint) =>
    {
        // Remove sensitive headers
        if (sentryEvent.Request?.Headers != null)
        {
            sentryEvent.Request.Headers.Remove("Authorization");
            sentryEvent.Request.Headers.Remove("Cookie");
        }

        return sentryEvent;
    });
});

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Add DbContext with Npgsql dynamic JSON support (required for List<T> jsonb columns)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.EnableDynamicJson();
var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(dataSource));

// Add Hangfire
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options =>
        options.UseNpgsqlConnection(connectionString)));

builder.Services.AddHangfireServer();

// Add Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    // Password settings
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;

    // User settings
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Add JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

// Configure TmdbSettings from appsettings
builder.Services.Configure<TmdbSettings>(
    builder.Configuration.GetSection("TmdbApi"));

// Configure ClaudeApiSettings from appsettings
builder.Services.Configure<ClaudeApiSettings>(
    builder.Configuration.GetSection("ClaudeApi"));

// Add Memory Cache for group recommendations
builder.Services.AddMemoryCache();

builder.Services.AddScoped<IMovieService, MovieService>();
builder.Services.AddScoped<IWatchService, WatchService>();
builder.Services.AddHttpClient<ITmdbService, TmdbService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAiInsightService, AiInsightService>();
builder.Services.AddScoped<IAiSearchService, AiSearchService>();
builder.Services.AddScoped<IGroupService, GroupService>();
builder.Services.AddScoped<IPrivacyService, PrivacyService>();
builder.Services.AddScoped<IGroupFeedService, GroupFeedService>();
builder.Services.AddScoped<IGroupRecommendationsService, GroupRecommendationsService>();
builder.Services.AddScoped<IStatsService, StatsService>();
builder.Services.AddScoped<IWatchlistService, WatchlistService>();
builder.Services.AddScoped<IInvitationService, InvitationService>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<AuditCleanupService>();

// Add IHttpContextAccessor for audit logging (captures IP and User-Agent)
builder.Services.AddHttpContextAccessor();

// Add Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    // Rate limit for AI insights: 10 per hour per user
    options.AddPolicy("insights", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.GetUserId().ToString(),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromHours(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
    
    // Rate limit for AI search: 20 per hour per user
    options.AddPolicy("search", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.User.GetUserId().ToString(),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromHours(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Add Serilog request logging
app.UseSerilogRequestLogging();

app.UseCors("AllowFrontend");

// Add correlation ID middleware for request tracking
app.UseMiddleware<CorrelationIdMiddleware>();

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// Configure Hangfire Dashboard (requires authentication)
app.MapHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireDashboardAuthorizationFilter() }
});

app.MapControllers();

// Schedule recurring jobs
RecurringJob.AddOrUpdate<AccountCleanupJob>(
    "account-cleanup",
    job => job.ExecuteAsync(),
    Cron.Daily(2)); // Runs daily at 2:00 AM

RecurringJob.AddOrUpdate<AuditCleanupJob>(
    "audit-cleanup",
    job => job.ExecuteAsync(),
    Cron.Daily(3)); // Runs daily at 3:00 AM

app.Run();

// Track application start time for system health monitoring
public partial class Program
{
    public static DateTime ApplicationStartTime { get; } = DateTime.UtcNow;
}