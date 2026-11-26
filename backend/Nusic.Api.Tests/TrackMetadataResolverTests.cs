using Nusic.Api.Services;

namespace Nusic.Api.Tests;

public sealed class TrackMetadataResolverTests
{
    [Fact]
    public void ParseSpotifyArtistFromHtml_ExtractsMusicianDescriptionMeta()
    {
        const string html = """
            <html><head>
            <meta name="music:musician_description" content="Rick Astley"/>
            <meta property="og:description" content="Other · Song · 1987"/>
            </head></html>
            """;

        var artist = TrackMetadataResolver.ParseSpotifyArtistFromHtml(html);

        Assert.Equal("Rick Astley", artist);
    }

    [Fact]
    public void ParseSpotifyArtistFromHtml_FallsBackToOgDescriptionAndDecodesEntities()
    {
        const string html = """
            <html><head>
            <meta property="og:description" content="Simon &amp; Garfunkel · Bridge Over Troubled Water · Song · 1970"/>
            </head></html>
            """;

        var artist = TrackMetadataResolver.ParseSpotifyArtistFromHtml(html);

        Assert.Equal("Simon & Garfunkel", artist);
    }

    [Fact]
    public void ParseSpotifyArtistFromHtml_ReturnsNull_WhenNoArtistMetaPresent()
    {
        const string html = "<html><head><title>Spotify</title></head></html>";

        var artist = TrackMetadataResolver.ParseSpotifyArtistFromHtml(html);

        Assert.Null(artist);
    }
}
