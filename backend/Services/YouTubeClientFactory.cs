using YoutubeExplode;

namespace Nusic.Api.Services;

public static class YouTubeClientFactory
{
    public static YoutubeClient Create(IConfiguration configuration, ILogger logger)
    {
        var rawCookies = configuration["YouTube:Cookies"];
        var cookies = YouTubeCookieParser.Parse(rawCookies);

        if (cookies.Count > 0)
        {
            logger.LogInformation("Initialized YoutubeClient with {Count} cookies.", cookies.Count);
            return new YoutubeClient(cookies);
        }

        logger.LogInformation("Initialized YoutubeClient without cookies.");
        return new YoutubeClient();
    }
}
