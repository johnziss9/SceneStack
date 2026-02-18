using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SceneStack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddWatchCompositeIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Watches_UserId_Rating",
                table: "Watches",
                columns: new[] { "UserId", "Rating" });

            migrationBuilder.CreateIndex(
                name: "IX_Watches_UserId_WatchedDate",
                table: "Watches",
                columns: new[] { "UserId", "WatchedDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Watches_UserId_Rating",
                table: "Watches");

            migrationBuilder.DropIndex(
                name: "IX_Watches_UserId_WatchedDate",
                table: "Watches");
        }
    }
}
