using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SceneStack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddWriterNameToMovie : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WriterName",
                table: "Movies",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WriterName",
                table: "Movies");
        }
    }
}
