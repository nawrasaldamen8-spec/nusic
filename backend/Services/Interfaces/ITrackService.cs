using Nusic.Api.Models;

namespace Nusic.Api.Services.Interfaces;

public enum UpdateTrackMatchStatus
{
    Success,
    InvalidVideoId,
    NotFound
}

public sealed record UpdateTrackMatchResult(UpdateTrackMatchStatus Status, TrackResponse? Track = null);

public interface ITrackService
{
    Task<UpdateTrackMatchResult> UpdateTrackMatchAsync(
        Guid userId,
        Guid trackId,
        string youtubeUrlOrId,
        CancellationToken ct);

    Task<bool> DeleteTrackAsync(Guid userId, Guid trackId, CancellationToken ct);
    Task<bool> UserOwnsTrackAsync(Guid userId, Guid trackId, CancellationToken ct);
    Task<string?> GetYouTubeVideoIdAsync(Guid trackId, CancellationToken ct);
}
