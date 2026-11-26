using System.Net;

namespace Nusic.Api.Services;

public static class YouTubeCookieParser
{
    public static IReadOnlyList<Cookie> Parse(string? rawCookies)
    {
        if (string.IsNullOrWhiteSpace(rawCookies))
            return [];

        var trimmed = rawCookies.Trim();
        return trimmed.Contains('\t')
            ? ParseNetscapeFormat(trimmed)
            : ParseHeaderFormat(trimmed);
    }

    private static IReadOnlyList<Cookie> ParseHeaderFormat(string header)
    {
        var cookies = new List<Cookie>();
        var pairs = header.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var pair in pairs)
        {
            var separatorIndex = pair.IndexOf('=');
            if (separatorIndex <= 0)
                continue;

            var name = pair[..separatorIndex].Trim();
            var value = pair[(separatorIndex + 1)..].Trim();
            if (string.IsNullOrEmpty(name))
                continue;

            cookies.Add(new Cookie(name, value, "/", ".youtube.com"));
        }

        return cookies;
    }

    private static IReadOnlyList<Cookie> ParseNetscapeFormat(string content)
    {
        var cookies = new List<Cookie>();
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var line in lines)
        {
            if (line.StartsWith('#'))
                continue;

            var parts = line.Split('\t');
            if (parts.Length < 7)
                continue;

            var domain = string.IsNullOrWhiteSpace(parts[0]) ? ".youtube.com" : parts[0].Trim();
            var path = string.IsNullOrWhiteSpace(parts[2]) ? "/" : parts[2].Trim();
            var name = parts[5].Trim();
            var value = parts[6].Trim();

            if (string.IsNullOrEmpty(name))
                continue;

            cookies.Add(new Cookie(name, value, path, domain));
        }

        return cookies;
    }
}
