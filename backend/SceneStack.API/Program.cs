using Microsoft.EntityFrameworkCore;
using SceneStack.API.Configuration;
using SceneStack.API.Data;
using SceneStack.API.Interfaces;
using SceneStack.API.Services;

var builder = WebApplication.CreateBuilder(args);

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

// Add DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure TmdbSettings from appsettings
builder.Services.Configure<TmdbSettings>(
    builder.Configuration.GetSection("TmdbApi"));

builder.Services.AddScoped<IMovieService, MovieService>();
builder.Services.AddScoped<IWatchService, WatchService>();
builder.Services.AddHttpClient<ITmdbService, TmdbService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

app.Run();