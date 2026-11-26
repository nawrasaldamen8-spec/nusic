using Microsoft.EntityFrameworkCore;
using Nusic.Api.Models;

namespace Nusic.Api.Data;

public sealed class NusicDbContext(DbContextOptions<NusicDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Playlist> Playlists => Set<Playlist>();
    public DbSet<Track> Tracks => Set<Track>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Username).HasMaxLength(64).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(255).IsRequired();
            entity.HasIndex(u => u.Username).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Playlist>(entity =>
        {
            entity.ToTable("playlists");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).HasMaxLength(120).IsRequired();
            entity.HasIndex(p => p.UserId);
            entity.HasOne(p => p.User)
                  .WithMany(u => u.Playlists)
                  .HasForeignKey(p => p.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Track>(entity =>
        {
            entity.ToTable("tracks");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.SourceType).HasMaxLength(16).IsRequired();
            entity.Property(t => t.YouTubeVideoId).HasMaxLength(20).IsRequired();
            entity.Property(t => t.Title).HasMaxLength(255).IsRequired();
            entity.Property(t => t.Artist).HasMaxLength(255);
            entity.HasIndex(t => t.PlaylistId);
            entity.HasOne(t => t.Playlist)
                  .WithMany(p => p.Tracks)
                  .HasForeignKey(t => t.PlaylistId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
