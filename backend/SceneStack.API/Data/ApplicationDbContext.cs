using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SceneStack.API.Models;

namespace SceneStack.API.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
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

        // Configure ApplicationUser -> User relationship
        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.HasOne(au => au.DomainUser)
                .WithMany()
                .HasForeignKey(au => au.DomainUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Configure User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            
            // Global query filter to exclude soft-deleted users
            entity.HasQueryFilter(u => !u.IsDeleted);
        });

        // Configure Movie
        modelBuilder.Entity<Movie>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TmdbId).IsUnique();
            entity.Property(e => e.Title).IsRequired().HasMaxLength(255);
            
            // Global query filter to exclude soft-deleted movies
            entity.HasQueryFilter(m => !m.IsDeleted);
        });

        // Configure Watch
        modelBuilder.Entity<Watch>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.MovieId);
            entity.HasIndex(e => e.WatchedDate);

            // Global query filter to exclude soft-deleted watches
            entity.HasQueryFilter(w => !w.IsDeleted);

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