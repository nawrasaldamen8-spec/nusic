using System.Web;
using Microsoft.Extensions.Caching.Memory;
using Nusic.Api.Models;
using Nusic.Api.Services.Interfaces;
using YoutubeExplode;
using YoutubeExplode.Exceptions;
using YoutubeExplode.Videos;
using YoutubeExplode.Videos.Streams;

namespace Nusic.Api.Services;

public sealed class YouTubeStreamResolver(
    YoutubeClient youtube,
    IMemoryCache cache,
    ILogger<YouTubeStreamResolver> logger) : IStreamResolver
{
    private static readonly TimeSpan MaxCacheDuration = TimeSpan.FromMinutes(45);
    private static readonly TimeSpan ExpirySafetyBuffer = TimeSpan.FromMinutes(2);

    public async Task<ResolvedAudioStream?> ResolveAudioStreamAsync(
        string youtubeVideoId,
        CancellationToken ct)
    {
        var parsedId = VideoId.TryParse(youtubeVideoId);
        if (parsedId is null)
            return null;

        var cacheKey = $"yt_stream:{parsedId.Value}";
        if (cache.TryGetValue(cacheKey, out ResolvedAudioStream? cached) && cached is not null)
        {
            if (cached.ExpiresAt > DateTimeOffset.UtcNow.Add(ExpirySafetyBuffer))
                return cached;
        }

        StreamManifest manifest;
        try
        {
            manifest = await youtube.Videos.Streams.GetManifestAsync(parsedId.Value, ct);
        }
        catch (YoutubeExplodeException ex)
        {
            logger.LogWarning(ex, "YouTube stream manifest extraction failed for {VideoId}", parsedId.Value);
            return null;
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "HTTP error while extracting YouTube stream for {VideoId}", parsedId.Value);
            return null;
        }
        var audioStream = SelectPreferredAudioStream(manifest);
        if (audioStream is null)
            return null;

        var expiresAt = ParseExpirationFromUrl(audioStream.Url);
        var contentType = MapContentType(audioStream.Container);
        var resolved = new ResolvedAudioStream(
            audioStream.Url,
            audioStream.Size.Bytes,
            contentType,
            expiresAt);

        var ttl = expiresAt - DateTimeOffset.UtcNow - ExpirySafetyBuffer;
        if (ttl > TimeSpan.Zero)
        {
            cache.Set(cacheKey, resolved, ttl < MaxCacheDuration ? ttl : MaxCacheDuration);
        }

        logger.LogInformation(
            "Resolved YouTube stream for {VideoId} ({Container}, {Size} bytes)",
            parsedId.Value,
            audioStream.Container.Name,
            audioStream.Size.Bytes);

        return resolved;
    }

    public void InvalidateCache(string youtubeVideoId)
    {
        var parsedId = VideoId.TryParse(youtubeVideoId);
        if (parsedId is not null)
            cache.Remove($"yt_stream:{parsedId.Value}");
    }

    private static AudioOnlyStreamInfo? SelectPreferredAudioStream(StreamManifest manifest)
    {
        var audioStreams = manifest.GetAudioOnlyStreams().ToList();
        if (audioStreams.Count == 0)
            return null;

        // Prioritize MP4/M4A (AAC) for universal iOS Safari + desktop <audio> compatibility.
        var mp4Stream = audioStreams
            .Where(s => s.Container == Container.Mp4)
            .OrderByDescending(s => s.Bitrate)
            .FirstOrDefault();

        return mp4Stream ?? audioStreams.OrderByDescending(s => s.Bitrate).First();
    }

    private static DateTimeOffset ParseExpirationFromUrl(string url)
    {
        if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            var query = HttpUtility.ParseQueryString(uri.Query);
            if (long.TryParse(query["expire"], out var unixSeconds))
                return DateTimeOffset.FromUnixTimeSeconds(unixSeconds);
        }

        return DateTimeOffset.UtcNow.Add(MaxCacheDuration);
    }

    private static string MapContentType(Container container)
    {
        if (container == Container.Mp4) return "audio/mp4";
        if (container == Container.WebM) return "audio/webm";
        return "application/octet-stream";
    }
}
