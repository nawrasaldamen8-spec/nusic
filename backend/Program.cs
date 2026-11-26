using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Nusic.Api.Data;
using Nusic.Api.Endpoints;
using Nusic.Api.Services;
using Nusic.Api.Services.Interfaces;
using Nusic.Api.Validators;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrWhiteSpace(connectionString))
{
    builder.Services.AddDbContext<NusicDbContext>(options => options.UseNpgsql(connectionString));
}

var jwtKey = builder.Configuration["Jwt:Key"];
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = !string.IsNullOrWhiteSpace(jwtKey),
            IssuerSigningKey = string.IsNullOrWhiteSpace(jwtKey)
                ? null
                : new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("StreamProxy");
builder.Services.AddHttpClient("MetadataClient");
builder.Services.AddSingleton<IStreamResolver, YouTubeStreamResolver>();
builder.Services.AddSingleton<IMetadataResolver, TrackMetadataResolver>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPlaylistService, PlaylistService>();
builder.Services.AddScoped<ITrackService, TrackService>();
builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();

var streamSecret = builder.Configuration["StreamSigning:Secret"]
    ?? "dev-only-stream-signing-secret-change-in-user-secrets";
builder.Services.AddSingleton(new HmacUrlSigner(streamSecret));

var allowedOrigin = builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders("Accept-Ranges", "Content-Range", "Content-Length", "Content-Type");
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

if (!string.IsNullOrWhiteSpace(connectionString))
{
    await DbSeeder.SeedSingleUserAsync(app.Services, app.Configuration, app.Logger);
}

app.UseForwardedHeaders();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapAuthEndpoints();
app.MapPlaylistEndpoints();
app.MapTrackEndpoints();
app.MapStreamEndpoints(includeSpikeRoute: app.Environment.IsDevelopment());

app.Run();
