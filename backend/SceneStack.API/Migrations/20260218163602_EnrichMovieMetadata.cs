using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using SceneStack.API.Models;

#nullable disable

namespace SceneStack.API.Migrations
{
    /// <inheritdoc />
    public partial class EnrichMovieMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BackdropPath",
                table: "Movies",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<List<CastMember>>(
                name: "Cast",
                table: "Movies",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "DirectorName",
                table: "Movies",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Genres",
                table: "Movies",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<int>(
                name: "Runtime",
                table: "Movies",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tagline",
                table: "Movies",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "TmdbRating",
                table: "Movies",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TmdbVoteCount",
                table: "Movies",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BackdropPath",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "Cast",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "DirectorName",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "Genres",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "Runtime",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "Tagline",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "TmdbRating",
                table: "Movies");

            migrationBuilder.DropColumn(
                name: "TmdbVoteCount",
                table: "Movies");
        }
    }
}
