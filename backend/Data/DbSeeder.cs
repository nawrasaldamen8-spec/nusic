using Microsoft.EntityFrameworkCore;
using Nusic.Api.Models;

namespace Nusic.Api.Data;

public static class DbSeeder
{
    public static async Task SeedSingleUserAsync(
        IServiceProvider services,
        IConfiguration configuration,
        ILogger logger)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<NusicDbContext>();

        if (await db.Users.AnyAsync())
            return;

        var username = configuration["SeedUser:Username"];
        var email = configuration["SeedUser:Email"];
        var password = configuration["SeedUser:Password"];

        if (string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("SeedUser configuration missing; skipping initial user creation.");
            return;
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username.Trim(),
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        logger.LogInformation("Seeded initial user {Username}.", user.Username);
    }
}
