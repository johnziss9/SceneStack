using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using SceneStack.API.Models;

#nullable disable

namespace SceneStack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDirectorsList : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<DirectorMember>>(
                name: "Directors",
                table: "Movies",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Directors",
                table: "Movies");
        }
    }
}
