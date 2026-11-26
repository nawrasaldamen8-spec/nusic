using Nusic.Api.Models;

namespace Nusic.Api.Services.Interfaces;

public enum AddTrackStatus
{
    Success,
    PlaylistNotFound,
    MetadataResolutionFailed
}

public sealed record AddTrackResult(AddTrackStatus Status, TrackResponse? Track = null);

public interface IPlaylistService
{
    Task<IReadOnlyList<PlaylistResponse>> GetPlaylistsAsync(Guid userId, CancellationToken ct);
    Task<PlaylistResponse> CreatePlaylistAsync(Guid userId, string name, CancellationToken ct);
    Task<PlaylistResponse?> RenamePlaylistAsync(Guid userId, Guid playlistId, string name, CancellationToken ct);
    Task<bool> DeletePlaylistAsync(Guid userId, Guid playlistId, CancellationToken ct);
    Task<IReadOnlyList<TrackResponse>?> GetTracksAsync(Guid userId, Guid playlistId, CancellationToken ct);
    Task<AddTrackResult> AddTrackAsync(Guid userId, Guid playlistId, string url, CancellationToken ct);
}
