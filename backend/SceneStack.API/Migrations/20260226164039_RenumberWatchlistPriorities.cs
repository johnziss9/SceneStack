using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SceneStack.API.Migrations
{
    /// <inheritdoc />
    public partial class RenumberWatchlistPriorities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Renumber existing watchlist items from 0/1 (enum) to 1, 2, 3... (position)
            // For each user, assign sequential priorities based on when they added items
            migrationBuilder.Sql(@"
                WITH ranked AS (
                    SELECT
                        ""Id"",
                        ROW_NUMBER() OVER (PARTITION BY ""UserId"" ORDER BY ""AddedAt"" ASC) as new_priority
                    FROM ""WatchlistItems""
                    WHERE ""IsDeleted"" = false
                )
                UPDATE ""WatchlistItems"" w
                SET ""Priority"" = r.new_priority
                FROM ranked r
                WHERE w.""Id"" = r.""Id"";
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Roll back to binary priority system (set all to Normal = 0)
            migrationBuilder.Sql(@"
                UPDATE ""WatchlistItems""
                SET ""Priority"" = 0
                WHERE ""IsDeleted"" = false;
            ");
        }
    }
}
