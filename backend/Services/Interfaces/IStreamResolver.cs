using Nusic.Api.Models;

namespace Nusic.Api.Services.Interfaces;

public interface IStreamResolver
{
    Task<ResolvedAudioStream?> ResolveAudioStreamAsync(string youtubeVideoId, CancellationToken ct);
    void InvalidateCache(string youtubeVideoId);
}
