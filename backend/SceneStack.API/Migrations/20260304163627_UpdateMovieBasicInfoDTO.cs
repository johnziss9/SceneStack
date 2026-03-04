using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SceneStack.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateMovieBasicInfoDTO : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WatchGroups");

            migrationBuilder.DropColumn(
                name: "IsPrivate",
                table: "Watches");

            migrationBuilder.AddColumn<bool>(
                name: "IsPrivate",
                table: "Movies",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "MovieGroups",
                columns: table => new
                {
                    MovieId = table.Column<int>(type: "integer", nullable: false),
                    GroupId = table.Column<int>(type: "integer", nullable: false),
                    SharedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MovieGroups", x => new { x.MovieId, x.GroupId });
                    table.ForeignKey(
                        name: "FK_MovieGroups_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MovieGroups_Movies_MovieId",
                        column: x => x.MovieId,
                        principalTable: "Movies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MovieGroups_GroupId",
                table: "MovieGroups",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_MovieGroups_MovieId",
                table: "MovieGroups",
                column: "MovieId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MovieGroups");

            migrationBuilder.DropColumn(
                name: "IsPrivate",
                table: "Movies");

            migrationBuilder.AddColumn<bool>(
                name: "IsPrivate",
                table: "Watches",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "WatchGroups",
                columns: table => new
                {
                    WatchId = table.Column<int>(type: "integer", nullable: false),
                    GroupId = table.Column<int>(type: "integer", nullable: false),
                    SharedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WatchGroups", x => new { x.WatchId, x.GroupId });
                    table.ForeignKey(
                        name: "FK_WatchGroups_Groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "Groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WatchGroups_Watches_WatchId",
                        column: x => x.WatchId,
                        principalTable: "Watches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WatchGroups_GroupId",
                table: "WatchGroups",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_WatchGroups_WatchId",
                table: "WatchGroups",
                column: "WatchId");
        }
    }
}
