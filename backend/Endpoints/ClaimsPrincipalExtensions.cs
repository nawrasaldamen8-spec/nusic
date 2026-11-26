using System.Security.Claims;

namespace Nusic.Api.Endpoints;

internal static class ClaimsPrincipalExtensions
{
    internal static bool TryGetUserId(this ClaimsPrincipal principal, out Guid userId)
    {
        var sub = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");
        return Guid.TryParse(sub, out userId);
    }
}
