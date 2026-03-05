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
    public new DbSet<User> Users { get; set; }
    public DbSet<Movie> Movies { get; set; }
    public DbSet<Watch> Watches { get; set; }
    public DbSet<AiInsight> AiInsights { get; set; }
    public DbSet<AiUsage> AiUsages { get; set; }
    public DbSet<Group> Groups { get; set; }
    public DbSet<GroupMember> GroupMembers { get; set; }
    public DbSet<GroupMemberHistory> GroupMemberHistories { get; set; }
    public DbSet<MovieGroup> MovieGroups { get; set; }
    public DbSet<WatchlistItem> WatchlistItems { get; set; }
    public DbSet<GroupInvitation> GroupInvitations { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure ApplicationUser -> User relationship
        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.HasOne(au => au.DomainUser)
                .WithMany()
                .HasForeignKey(au => au.DomainUserId)
                .OnDelete(DeleteBehavior.Restrict)
                .IsRequired(false);  // Make optional to work with query filters
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

            // JSON columns for enriched metadata (stored once at creation time)
            entity.Property(e => e.Genres).HasColumnType("jsonb");
            entity.Property(e => e.Cast).HasColumnType("jsonb");
            entity.Property(e => e.Directors).HasColumnType("jsonb");
            entity.Property(e => e.Writers).HasColumnType("jsonb");

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
            // Composite indexes for stats and grouped-watches queries
            entity.HasIndex(e => new { e.UserId, e.WatchedDate });
            entity.HasIndex(e => new { e.UserId, e.Rating });

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

        // Configure AiInsight
        modelBuilder.Entity<AiInsight>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.MovieId, e.UserId });
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.Cost).HasPrecision(10, 4);

            // Global query filter to exclude soft-deleted insights
            entity.HasQueryFilter(ai => !ai.IsDeleted);

            // Define relationships
            entity.HasOne(ai => ai.User)
                .WithMany(u => u.AiInsights)
                .HasForeignKey(ai => ai.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ai => ai.Movie)
                .WithMany(m => m.AiInsights)
                .HasForeignKey(ai => ai.MovieId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure AiUsage
        modelBuilder.Entity<AiUsage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Timestamp);
            entity.Property(e => e.Feature).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Cost).HasPrecision(10, 4);

            // Define relationship
            entity.HasOne(au => au.User)
                .WithMany()
                .HasForeignKey(au => au.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .IsRequired(false);  // Make optional to work with query filters
        });

        // Configure Group
        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CreatedById);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);

            // Global query filter to exclude soft-deleted groups
            entity.HasQueryFilter(g => !g.IsDeleted);

            // Define relationship - Group created by User
            entity.HasOne(g => g.CreatedBy)
                .WithMany(u => u.CreatedGroups)
                .HasForeignKey(g => g.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);  // Don't delete group if user is deleted
        });

        // Configure GroupMember (many-to-many join table)
        modelBuilder.Entity<GroupMember>(entity =>
        {
            // Composite primary key
            entity.HasKey(gm => new { gm.GroupId, gm.UserId });

            entity.HasIndex(e => e.GroupId);
            entity.HasIndex(e => e.UserId);

            // Define relationships
            entity.HasOne(gm => gm.Group)
                .WithMany(g => g.Members)
                .HasForeignKey(gm => gm.GroupId)
                .OnDelete(DeleteBehavior.Cascade)  // Delete membership if group is deleted
                .IsRequired(false);  // Make optional to work with query filters

            entity.HasOne(gm => gm.User)
                .WithMany(u => u.GroupMemberships)
                .HasForeignKey(gm => gm.UserId)
                .OnDelete(DeleteBehavior.Cascade)  // Delete membership if user is deleted
                .IsRequired(false);  // Make optional to work with query filters
        });

        // Configure GroupMemberHistory
        modelBuilder.Entity<GroupMemberHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.GroupId, e.UserId, e.Timestamp });
            entity.HasIndex(e => e.GroupId);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ActorId);

            // Define relationships
            entity.HasOne(gmh => gmh.Group)
                .WithMany()
                .HasForeignKey(gmh => gmh.GroupId)
                .OnDelete(DeleteBehavior.Cascade)  // Delete history if group is deleted
                .IsRequired(false);  // Make optional to work with query filters

            entity.HasOne(gmh => gmh.User)
                .WithMany()
                .HasForeignKey(gmh => gmh.UserId)
                .OnDelete(DeleteBehavior.Restrict)  // Keep history even if user is deleted
                .IsRequired(false);  // Make optional to work with query filters

            entity.HasOne(gmh => gmh.Actor)
                .WithMany()
                .HasForeignKey(gmh => gmh.ActorId)
                .OnDelete(DeleteBehavior.SetNull)  // Set to null if actor is deleted
                .IsRequired(false);  // Actor is already nullable
        });

        // Configure MovieGroup (many-to-many join table for Movie <-> Group)
        modelBuilder.Entity<MovieGroup>(entity =>
        {
            // Composite primary key
            entity.HasKey(mg => new { mg.MovieId, mg.GroupId });

            entity.HasIndex(e => e.MovieId);
            entity.HasIndex(e => e.GroupId);

            // Define relationships
            entity.HasOne(mg => mg.Movie)
                .WithMany(m => m.MovieGroups)
                .HasForeignKey(mg => mg.MovieId)
                .OnDelete(DeleteBehavior.Cascade)  // Delete link if movie is deleted
                .IsRequired(false);  // Make optional to work with query filters

            entity.HasOne(mg => mg.Group)
                .WithMany(g => g.MovieGroups)
                .HasForeignKey(mg => mg.GroupId)
                .OnDelete(DeleteBehavior.Cascade)  // Delete link if group is deleted
                .IsRequired(false);  // Make optional to work with query filters
        });

        // Configure WatchlistItem
        modelBuilder.Entity<WatchlistItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            // Unique index: one entry per movie per user
            entity.HasIndex(e => new { e.UserId, e.MovieId }).IsUnique();

            // Global query filter to exclude soft-deleted watchlist items
            entity.HasQueryFilter(wi => !wi.IsDeleted);

            // Define relationships
            entity.HasOne(wi => wi.User)
                .WithMany()
                .HasForeignKey(wi => wi.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(wi => wi.Movie)
                .WithMany()
                .HasForeignKey(wi => wi.MovieId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure GroupInvitation
        modelBuilder.Entity<GroupInvitation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.GroupId);
            entity.HasIndex(e => e.InvitedUserId);
            entity.HasIndex(e => e.InvitedByUserId);
            entity.HasIndex(e => e.Status);
            // Composite index for duplicate prevention
            entity.HasIndex(e => new { e.GroupId, e.InvitedUserId, e.Status });
            // Composite index for user's pending invitations query
            entity.HasIndex(e => new { e.InvitedUserId, e.Status });

            // Define relationships
            entity.HasOne(gi => gi.Group)
                .WithMany()
                .HasForeignKey(gi => gi.GroupId)
                .OnDelete(DeleteBehavior.Cascade)  // Delete invitations if group is deleted
                .IsRequired(false);

            entity.HasOne(gi => gi.InvitedUser)
                .WithMany()
                .HasForeignKey(gi => gi.InvitedUserId)
                .OnDelete(DeleteBehavior.Restrict)  // Prevent user deletion with pending invitations
                .IsRequired(false);

            entity.HasOne(gi => gi.InvitedByUser)
                .WithMany()
                .HasForeignKey(gi => gi.InvitedByUserId)
                .OnDelete(DeleteBehavior.SetNull)  // Set to null if inviter is deleted
                .IsRequired(false);
        });
    }
}