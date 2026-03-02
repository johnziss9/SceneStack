using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SceneStack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCrewProfilePaths : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DirectorProfilePath",
                table: "Movies",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WriterProfilePath",
                table: "Movies",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DirectorProfilePath",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "WriterProfilePath",
                table: "Movies");
        }
    }
}
