namespace Nusic.Api.Models;

public sealed record LoginRequest(string Identifier, string Password);

public sealed record LoginResponse(string Token, string Username, DateTimeOffset ExpiresAt);

public sealed record CreatePlaylistRequest(string Name);

public sealed record RenamePlaylistRequest(string Name);

public sealed record PlaylistResponse(
    Guid Id,
    string Name,
    DateTimeOffset CreatedAt,
    int TrackCount,
    string? CoverUrl,
    DateTimeOffset? LastPlayedAt);

public sealed record AddTrackRequest(string Url);

public sealed record UpdateTrackMatchRequest(string YouTubeUrlOrId);

public sealed record TrackResponse(
    Guid Id,
    Guid PlaylistId,
    int Position,
    string SourceType,
    string OriginalUrl,
    string YouTubeVideoId,
    string Title,
    string? Artist,
    int? DurationSeconds,
    string? ThumbnailUrl,
    DateTimeOffset CreatedAt);

public sealed record PlayUrlResponse(string Url, DateTimeOffset ExpiresAt);

public sealed record TrackPreviewResponse(
    string SourceType,
    string Title,
    string? Artist,
    string? ThumbnailUrl);

public sealed record ResolvedTrackMetadata(
    string SourceType,
    string OriginalUrl,
    string YouTubeVideoId,
    string Title,
    string? Artist,
    int? DurationSeconds,
    string? ThumbnailUrl);
