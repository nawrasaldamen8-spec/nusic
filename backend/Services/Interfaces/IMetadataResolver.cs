using Nusic.Api.Models;

namespace Nusic.Api.Services.Interfaces;

public interface IMetadataResolver
{
    Task<ResolvedTrackMetadata?> ResolveAsync(string url, CancellationToken ct);
    Task<string?> ResolveSpotifyArtistAsync(string url, CancellationToken ct);
    Task<IReadOnlyList<TrackSearchResultResponse>> SearchAsync(string query, int limit, CancellationToken ct);
}
