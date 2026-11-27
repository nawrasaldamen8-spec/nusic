namespace Nusic.Api.Models;

public sealed class User
{
    public Guid Id { get; set; }
    public required string Username { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public List<Playlist> Playlists { get; set; } = [];
}

public sealed class Playlist
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public required string Name { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastPlayedAt { get; set; }

    public User User { get; set; } = null!;
    public List<Track> Tracks { get; set; } = [];
}

public sealed class Track
{
    public Guid Id { get; set; }
    public Guid PlaylistId { get; set; }
    public int Position { get; set; }
    public required string SourceType { get; set; }
    public required string OriginalUrl { get; set; }
    public required string YouTubeVideoId { get; set; }
    public required string Title { get; set; }
    public string? Artist { get; set; }
    public int? DurationSeconds { get; set; }
    public string? ThumbnailUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Playlist Playlist { get; set; } = null!;
}
