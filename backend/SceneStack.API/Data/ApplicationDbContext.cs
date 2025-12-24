using Microsoft.EntityFrameworkCore;
using SceneStack.API.Models;

namespace SceneStack.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // DbSets - these become tables in your database
    public DbSet<User> Users { get; set; }
    public DbSet<Movie> Movies { get; set; }
    public DbSet<Watch> Watches { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
        });

        // Configure Movie
        modelBuilder.Entity<Movie>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TmdbId).IsUnique();
            entity.Property(e => e.Title).IsRequired().HasMaxLength(255);
        });

        // Configure Watch
        modelBuilder.Entity<Watch>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.MovieId);
            entity.HasIndex(e => e.WatchedDate);

            // Define relationships
            entity.HasOne(w => w.User)
                .WithMany(u => u.Watches)
                .HasForeignKey(w => w.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(w => w.Movie)
                .WithMany(m => m.Watches)
                .HasForeignKey(w => w.MovieId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}