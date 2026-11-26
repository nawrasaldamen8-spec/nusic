using Nusic.Api.Endpoints.Filters;
using Nusic.Api.Models;
using Nusic.Api.Services.Interfaces;

namespace Nusic.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/login", HandleLoginAsync)
           .WithValidation<LoginRequest>()
           .WithName("Login");

        return app;
    }

    private static async Task<IResult> HandleLoginAsync(
        LoginRequest request,
        IAuthService authService,
        CancellationToken ct)
    {
        var response = await authService.LoginAsync(request.Identifier, request.Password, ct);
        return response is null ? Results.Unauthorized() : Results.Ok(response);
    }
}
