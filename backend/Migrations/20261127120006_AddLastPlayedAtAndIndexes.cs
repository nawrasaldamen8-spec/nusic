using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nusic.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddLastPlayedAtAndIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastPlayedAt",
                table: "playlists",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_tracks_PlaylistId_Position_CreatedAt",
                table: "tracks",
                columns: new[] { "PlaylistId", "Position", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_playlists_UserId_LastPlayedAt_CreatedAt",
                table: "playlists",
                columns: new[] { "UserId", "LastPlayedAt", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tracks_PlaylistId_Position_CreatedAt",
                table: "tracks");

            migrationBuilder.DropIndex(
                name: "IX_playlists_UserId_LastPlayedAt_CreatedAt",
                table: "playlists");

            migrationBuilder.DropColumn(
                name: "LastPlayedAt",
                table: "playlists");
        }
    }
}
