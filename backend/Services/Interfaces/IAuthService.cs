using Nusic.Api.Models;

namespace Nusic.Api.Services.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(string identifier, string password, CancellationToken ct);
}
