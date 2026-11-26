using System.Net;
using YoutubeExplode;

namespace Nusic.Api.Services;

public static class YouTubeClientFactory
{
    public static IWebProxy? ParseProxy(string? proxyUrl)
    {
        if (string.IsNullOrWhiteSpace(proxyUrl))
            return null;

        if (!Uri.TryCreate(proxyUrl.Trim(), UriKind.Absolute, out var uri))
            return null;

        var proxy = new WebProxy(new Uri($"{uri.Scheme}://{uri.Host}:{uri.Port}"));
        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            var parts = uri.UserInfo.Split(':', 2);
            var user = Uri.UnescapeDataString(parts[0]);
            var pass = parts.Length > 1 ? Uri.UnescapeDataString(parts[1]) : string.Empty;
            proxy.Credentials = new NetworkCredential(user, pass);
        }

        return proxy;
    }

    public static YoutubeClient Create(IConfiguration configuration, ILogger logger)
    {
        var proxy = ParseProxy(configuration["YouTube:ProxyUrl"]);

        if (proxy is not null)
        {
            logger.LogInformation("Initialized YoutubeClient with proxy.");
            var handler = new HttpClientHandler
            {
                Proxy = proxy,
                UseProxy = true
            };
            return new YoutubeClient(new HttpClient(handler));
        }

        logger.LogInformation("Initialized YoutubeClient without proxy.");
        return new YoutubeClient();
    }
}
