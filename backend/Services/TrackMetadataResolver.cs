using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Nusic.Api.Models;
using Nusic.Api.Services.Interfaces;
using YoutubeExplode;
using YoutubeExplode.Exceptions;
using YoutubeExplode.Videos;

namespace Nusic.Api.Services;

public sealed partial class TrackMetadataResolver(
    YoutubeClient youtube,
    IHttpClientFactory httpClientFactory,
    ILogger<TrackMetadataResolver> logger) : IMetadataResolver
{

    public async Task<ResolvedTrackMetadata?> ResolveAsync(string url, CancellationToken ct)
    {
        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri))
            return null;

        if (IsSpotifyTrackUrl(uri))
            return await ResolveSpotifyAsync(uri.ToString(), ct);

        var videoId = VideoId.TryParse(uri.ToString());
        if (videoId is null)
            return null;

        return await ResolveYouTubeAsync(videoId.Value, uri.ToString(), ct);
    }

    private async Task<ResolvedTrackMetadata?> ResolveYouTubeAsync(
        VideoId videoId,
        string originalUrl,
        CancellationToken ct)
    {
        try
        {
            var video = await youtube.Videos.GetAsync(videoId, ct);
            var thumbnail = video.Thumbnails
                .OrderByDescending(t => t.Resolution.Area)
                .FirstOrDefault()?.Url;

            return new ResolvedTrackMetadata(
                SourceType: "youtube",
                OriginalUrl: originalUrl,
                YouTubeVideoId: video.Id.Value,
                Title: video.Title,
                Artist: video.Author.ChannelTitle,
                DurationSeconds: video.Duration.HasValue ? (int)video.Duration.Value.TotalSeconds : null,
                ThumbnailUrl: thumbnail);
        }
        catch (YoutubeExplodeException ex)
        {
            logger.LogWarning(ex, "YouTube metadata extraction failed for {VideoId}", videoId.Value);
            return null;
        }
    }

    private async Task<ResolvedTrackMetadata?> ResolveSpotifyAsync(string spotifyUrl, CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient("MetadataClient");
        var oEmbedUrl = $"https://open.spotify.com/oembed?url={Uri.EscapeDataString(spotifyUrl)}";

        var oEmbed = await client.GetFromJsonAsync<SpotifyOEmbedResponse>(oEmbedUrl, ct);
        if (oEmbed is null || string.IsNullOrWhiteSpace(oEmbed.Title))
        {
            logger.LogWarning("Spotify oEmbed returned empty metadata for {Url}", spotifyUrl);
            return null;
        }

        var artist = await ExtractSpotifyArtistAsync(client, spotifyUrl, ct);
        var searchQuery = string.IsNullOrWhiteSpace(artist)
            ? $"{oEmbed.Title} audio"
            : $"{artist} {oEmbed.Title} audio";

        try
        {
            await foreach (var candidate in youtube.Search.GetVideosAsync(searchQuery, ct))
            {
                return new ResolvedTrackMetadata(
                    SourceType: "spotify",
                    OriginalUrl: spotifyUrl,
                    YouTubeVideoId: candidate.Id.Value,
                    Title: oEmbed.Title,
                    Artist: artist,
                    DurationSeconds: candidate.Duration.HasValue ? (int)candidate.Duration.Value.TotalSeconds : null,
                    ThumbnailUrl: oEmbed.ThumbnailUrl);
            }
        }
        catch (YoutubeExplodeException ex)
        {
            logger.LogWarning(ex, "YouTube search failed for Spotify track {Title}", oEmbed.Title);
            return null;
        }

        logger.LogWarning("No YouTube match found for Spotify track {Title}", oEmbed.Title);
        return null;
    }

    public Task<string?> ResolveSpotifyArtistAsync(string url, CancellationToken ct)
    {
        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri) || !IsSpotifyTrackUrl(uri))
            return Task.FromResult<string?>(null);

        var client = httpClientFactory.CreateClient("MetadataClient");
        return ExtractSpotifyArtistAsync(client, uri.ToString(), ct);
    }

    private async Task<string?> ExtractSpotifyArtistAsync(
        HttpClient client,
        string spotifyUrl,
        CancellationToken ct)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, spotifyUrl);
            request.Headers.UserAgent.ParseAdd("Mozilla/5.0");
            using var response = await client.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
                return null;

            var html = await response.Content.ReadAsStringAsync(ct);
            return ParseSpotifyArtistFromHtml(html);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogDebug(ex, "Could not fetch Spotify page HTML for artist extraction: {Url}", spotifyUrl);
            return null;
        }
    }

    public static string? ParseSpotifyArtistFromHtml(string html)
    {
        var musicianContent = ExtractMetaContent(html, "name", "music:musician_description");
        if (!string.IsNullOrWhiteSpace(musicianContent))
            return musicianContent;

        var ogDescription = ExtractMetaContent(html, "property", "og:description");
        if (!string.IsNullOrWhiteSpace(ogDescription))
        {
            var separatorIndex = ogDescription.IndexOf('·');
            if (separatorIndex > 0)
            {
                var artist = ogDescription[..separatorIndex].Trim();
                if (!string.IsNullOrWhiteSpace(artist))
                    return artist;
            }
        }

        var titleMatch = TitleArtistRegex().Match(html);
        if (titleMatch.Success)
        {
            var artist = WebUtility.HtmlDecode(titleMatch.Groups["artist"].Value).Trim();
            if (!string.IsNullOrWhiteSpace(artist))
                return artist;
        }

        return null;
    }

    private static string? ExtractMetaContent(string html, string attrName, string attrValue)
    {
        foreach (Match match in MetaTagRegex().Matches(html))
        {
            var tag = match.Value;
            var hasTargetAttr = Regex.IsMatch(
                tag,
                $@"\b{Regex.Escape(attrName)}\s*=\s*[""']{Regex.Escape(attrValue)}[""']",
                RegexOptions.IgnoreCase);
            if (!hasTargetAttr)
                continue;

            var contentMatch = MetaContentAttrRegex().Match(tag);
            if (contentMatch.Success)
            {
                var decoded = WebUtility.HtmlDecode(contentMatch.Groups["content"].Value).Trim();
                if (!string.IsNullOrWhiteSpace(decoded))
                    return decoded;
            }
        }

        return null;
    }

    [GeneratedRegex("<meta\\b[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex MetaTagRegex();

    [GeneratedRegex("\\bcontent\\s*=\\s*[\"'](?<content>[^\"']+)[\"']", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex MetaContentAttrRegex();

    [GeneratedRegex("<title>[^<]*?\\s+by\\s+(?<artist>[^|<]+?)\\s*\\|\\s*Spotify</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex TitleArtistRegex();

    private static bool IsSpotifyTrackUrl(Uri uri) =>
        uri.Host.Contains("spotify.com", StringComparison.OrdinalIgnoreCase) &&
        uri.AbsolutePath.Contains("/track/", StringComparison.OrdinalIgnoreCase);

    private sealed record SpotifyOEmbedResponse(
        [property: JsonPropertyName("title")] string? Title,
        [property: JsonPropertyName("thumbnail_url")] string? ThumbnailUrl);
}
