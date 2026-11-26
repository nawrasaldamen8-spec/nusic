# nusic (Personal Audio Player)

*   **Author:** Nawras
*   **Status:** Proposed
*   **Date:** 2026-11-26

--------------------------------------------------------------------------------

## Overview

`nusic` is a personal, single-user web audio player deployed across **Vercel** (`React + TypeScript`), **Render** (`.NET` Web API), and **Neon DB** (`PostgreSQL`). The user logs into a single-user account and organizes playlists of individual **YouTube** and **Spotify** song links. No audio files or binary blobs are stored on the server, database, or cloud object storage; only links and track metadata are persisted, while audio bytes are streamed on demand via HTTP `Range` requests (`206 Partial Content`) through the `.NET` backend.

## The Problem

Keeping a personal collection of songs scattered across YouTube and Spotify links without storing audio files on hosting or cloud storage requires a unified playlist interface that works on both laptop and mobile browsers. Existing third-party downloaders store and convert full audio files on servers, while client-side `<audio>` playback directly against YouTube or Spotify URLs fails due to CORS restrictions, expiring stream URLs, and Spotify DRM.

The proposed solution stores only song URLs and metadata in `Neon DB`, resolves direct audio streams on the `.NET` backend (translating Spotify track links to YouTube matches), and proxies byte ranges in memory (`206 Partial Content`) to a native `<audio>` player in `React` that renders a YouTube-style buffered progress bar via `audio.buffered`.

## Goals

*   Provide a single-user login (`username`, `email`, `password_hash`) protecting playlists and stream access.
*   Support creating, renaming, and deleting multiple playlists, and adding individual YouTube or Spotify song URLs with automatic metadata extraction (title, artist, duration).
*   Resolve Spotify track URLs to matched YouTube audio streams, store the matched `youtube_video_id` in `Neon DB`, and allow manual override in the UI if a match is incorrect.
*   Stream audio via stateless HTTP `Range` proxying (`206 Partial Content`) in `.NET` with zero disk or cloud audio storage, protected by short-lived HMAC-signed stream URLs.
*   Play audio on both desktop and mobile browsers (including iOS Safari) using `<audio>` + `audio.buffered` to display played and buffered progress, with Next, Previous, Seek, and auto-advance controls.

## Non-Goals

*   Storing audio files, converted MP3s, or binary audio blobs on Render, Vercel, Neon DB, or external cloud storage.
*   Importing full YouTube or Spotify playlist URLs in bulk (Phase 1 handles single song URLs only).
*   Multi-user registration, OAuth, social sharing, or password-reset flows.
*   Custom `IndexedDB` + `MediaSource` (MSE) 512KB chunk management in Phase 1 (deferred to Phase 2).
*   Permanent offline downloading.

## Open Questions

*   **Render IP Viability (Spike):** Does Render's Free Tier outbound IP consistently resolve and stream YouTube `itag 140` (`M4A/AAC`) without `403 Forbidden` or bot-check blocks?
*   **Spotify Metadata Extraction Method:** Should Phase 1 extract Spotify track title/artist via Spotify's `oEmbed` endpoint (zero API keys) or Spotify's Client Credentials Web API (more structured artist/title fields, requires client ID/secret)?

## Critical User Journeys (CUJs)

### CUJ 1: Add a Song Link (YouTube or Spotify) to a Playlist

*   **Given**: The user is logged in and viewing a playlist in the `React` app.
*   **When**: The user pastes a single YouTube or Spotify track URL and submits.
*   **Then**: The `.NET` backend extracts the track title/artist/duration (and resolves a matched `youtube_video_id` if the URL is from Spotify), saves the record in `Neon DB`, and the track appears in the playlist immediately.

### CUJ 2: Stream a Song with Buffered Progress Bar on Mobile & Desktop

*   **Given**: The user selects a track in a playlist on a laptop or mobile browser.
*   **When**: The user presses Play (or seeks forward/backward on the progress bar).
*   **Then**: `React` requests a short-lived HMAC-signed stream URL from `.NET`, assigns it to `<audio>`, and the browser fetches byte ranges (`206 Partial Content`) while `audio.buffered` updates the buffered progress bar without storing any audio file on the server.

### CUJ 3: Fix an Incorrect Spotify-to-YouTube Match

*   **Given**: A Spotify track was matched to an incorrect YouTube video (such as a remix or live version).
*   **When**: The user opens the track edit action and pastes a replacement `YouTube` URL or Video ID.
*   **Then**: The `.NET` backend updates `youtube_video_id` in `Neon DB`, invalidates the in-memory stream cache for that track, and subsequent playback streams the corrected YouTube audio.

## Technical Plan (Architecture)

### 1. System Architecture & Data Flow

```text
React TS SPA (Vercel)
  ├─ Authenticated JSON API (Authorization: Bearer JWT) ──▶ .NET Web API (Render, 512MB RAM)
  │     ├─ AuthController ──────▶ Verify password_hash ──▶ Neon DB (users)
  │     ├─ PlaylistsController ─▶ CRUD playlists/tracks ─▶ Neon DB (playlists, tracks)
  │     │                         └─ On Add URL: extract metadata (+ YouTube match if Spotify)
  │     └─ TracksController ────▶ Resolve & cache stream URL (IMemoryCache, M4A/AAC)
  │                               └─ Return short-lived HMAC-signed proxy URL
  │
  └─ <audio src="https://api.render.../api/stream/{trackId}?exp=...&sig=...">
        └─ Native Browser Range Requests (206 Partial Content)
              └─ StreamController verifies HMAC ──▶ Pipes byte range in memory from YouTube
```

### 2. Database Schema (`Neon DB` - PostgreSQL)

No binary audio data is stored in PostgreSQL. Only three tables are required:

*   **`users`**:
    *   `id` (UUID, PK)
    *   `username` (VARCHAR, unique, not null)
    *   `email` (VARCHAR, unique, not null)
    *   `password_hash` (TEXT, not null)
    *   `created_at` (TIMESTAMPTZ)
*   **`playlists`**:
    *   `id` (UUID, PK)
    *   `user_id` (UUID, FK -> `users.id`, indexed)
    *   `name` (VARCHAR, not null)
    *   `created_at` (TIMESTAMPTZ)
*   **`tracks`**:
    *   `id` (UUID, PK)
    *   `playlist_id` (UUID, FK -> `playlists.id`, cascade delete, indexed)
    *   `position` (INT, not null — ordering within playlist)
    *   `source_type` (VARCHAR — `'youtube'` | `'spotify'`)
    *   `original_url` (TEXT, not null)
    *   `youtube_video_id` (VARCHAR(20), not null — extracted directly or matched from Spotify)
    *   `title` (VARCHAR, not null)
    *   `artist` (VARCHAR, nullable)
    *   `duration_seconds` (INT, nullable)
    *   `thumbnail_url` (TEXT, nullable)
    *   `created_at` (TIMESTAMPTZ)

### 3. Backend Components & API Contract (`.NET` on `Render`)

*   **`AuthController` (`/api/auth/login`)**:
    *   Verifies `username`/`email` + password against `users.password_hash` and issues a short-lived JWT Bearer token. No public `/register` endpoint; the single user is seeded via environment variables/migration.
*   **`PlaylistsController` (`/api/playlists`)**:
    *   `GET /api/playlists`: List playlists for the authenticated user.
    *   `POST /api/playlists`, `PATCH /api/playlists/{id}`, `DELETE /api/playlists/{id}`: Manage playlists.
    *   `GET /api/playlists/{id}/tracks`: List ordered tracks.
    *   `POST /api/playlists/{id}/tracks`: Accepts `{ url }`. Detects YouTube vs. Spotify URL.
        *   If YouTube: extracts `youtube_video_id`, `title`, `artist`/`channel`, `duration_seconds`, and `thumbnail_url`.
        *   If Spotify: extracts track `title` and `artist`, searches YouTube (`"{artist} - {title} Topic"` / `"Official Audio"`), and stores the top matched `youtube_video_id`.
    *   `PATCH /api/tracks/{id}/match`: Accepts `{ youtubeUrlOrId }` to manually override `youtube_video_id` and invalidates the track's `IMemoryCache` stream entry.
    *   `DELETE /api/tracks/{id}`: Removes track from playlist.
*   **`IStreamResolver` & `IMemoryCache`**:
    *   Resolves `youtube_video_id` to a direct audio stream URL, prioritizing `M4A/AAC` (`itag 140`) for universal iOS Safari + desktop support.
    *   Caches `(streamUrl, contentLength, contentType)` in `IMemoryCache` per `youtube_video_id` for ~30–60 minutes (respecting the stream's `expire` timestamp) so repeated `Range` requests do not re-run YouTube extraction.
*   **`HmacUrlSigner` & `StreamController` (`GET /api/tracks/{id}/play-url`, `GET /api/stream/{id}`)**:
    *   `GET /api/tracks/{id}/play-url` (JWT-authenticated): Generates a short-lived HMAC-SHA256 signed URL (`/api/stream/{id}?exp={unix}&sig={hmac}`, valid ~2 hours) so `<audio src="...">` works cross-origin without third-party cookies.
    *   `GET /api/stream/{id}` (HMAC-validated): Reads the incoming `Range` header, issues a matching `Range` HTTP request to the cached YouTube stream URL using `HttpCompletionOption.ResponseHeadersRead`, and copies bytes directly to the response stream (`206 Partial Content` with `Accept-Ranges: bytes`, `Content-Range`, `Content-Length`, and `Content-Type`) without buffering the full file in RAM or writing to disk.
    *   **CORS Policy**: Explicitly allows the `Vercel` origin and exposes `Accept-Ranges`, `Content-Range`, `Content-Length`, and `Content-Type`.

### 4. Frontend Components (`React + TypeScript` on `Vercel`)

*   **`AuthGate` & `ApiClient`**: Stores JWT in memory/session storage and attaches `Authorization: Bearer` to all API calls except `<audio src>`.
*   **`PlaylistSidebar` & `TrackList`**: Displays playlists, track list, add-by-URL input (with loading state during metadata/YouTube resolution), and an "Edit Match" modal for Spotify tracks.
*   **`AudioPlayer`**:
    *   Renders a hidden `<audio>` element bound to the HMAC-signed `/api/stream/{id}` URL.
    *   Listens to `timeupdate`, `progress`, and `ended` events.
    *   Reads `audio.buffered` (`TimeRanges`) to render the YouTube-style progress bar (played segment + buffered-ahead segment) and supports click/drag seeking.
    *   Integrates with `navigator.mediaSession` for mobile lock-screen Play/Pause/Next/Previous controls and auto-advances on `ended`.
    *   If a signed URL expires mid-pause (`error` event), automatically requests a fresh `/play-url` and resumes at the saved timestamp.

## Alternatives Considered

### Alternative A: Custom 512KB `IndexedDB` + `MediaSource` (MSE) Chunk Manager in Phase 1

*   **Pros**: Full manual control over client-side chunk fetching, caching in `IndexedDB`, and explicit chunk deletion on track switch.
*   **Cons**: Arbitrary 512KB byte ranges break `MSE` decoding and seeking unless parsed around container initialization segments (`ftyp` + `moov` or EBML) and keyframe indexes (`sidx` / `Cues`); iOS Safari lacks standard `MediaSource` and rejects `WebM/Opus`; increases mobile background-playback fragility.
*   **Reason for Rejection**: Rejected by author: native `<audio>` + `.NET` `206 Partial Content` Range proxy + `audio.buffered` provides the buffered progress bar reliably on both mobile (including iOS Safari) and desktop; custom `IndexedDB` + `MSE` is deferred to Phase 2.

### Alternative B: Cross-Origin Cookies for `<audio>` Stream Authentication

*   **Pros**: No query-string signature generation needed on play requests.
*   **Cons**: `<audio src="...">` cannot attach `Authorization: Bearer` headers, and Safari ITP blocks cross-origin third-party cookies between `vercel.app` and `onrender.com`.
*   **Reason for Rejection**: Rejected by author: replaced with short-lived HMAC-SHA256 signed stream URLs (`/api/stream/{id}?exp=...&sig=...`), which work across all browsers without third-party cookies.

### Alternative C: Direct Client-Side Fetching from YouTube / External Sources

*   **Pros**: Zero outbound proxy bandwidth on Render.
*   **Cons**: Blocked by browser CORS policies, and YouTube `.googlevideo.com` stream URLs are IP-bound to the IP that extracted them.
*   **Reason for Rejection**: Rejected by author: requires a stateless `.NET` Range Proxy on Render so extraction IP matches streaming IP and CORS headers are controlled.

### Alternative D: Server-Side Full Download & `FFmpeg` MP3 Conversion

*   **Pros**: Uniform MP3 format across all clients.
*   **Cons**: Violates the zero-storage requirement and risks OOM/CPU stalls under Render Free Tier's 512 MB RAM and 0.1 CPU limits.
*   **Reason for Rejection**: Rejected by author: prioritizing YouTube `M4A/AAC` (`itag 140`) streams directly in memory avoids transcoding and disk storage.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Security & Privacy**: Passwords stored as salted hashes (`BCrypt`/`Argon2id` or `ASP.NET Core Identity PasswordHasher`); JWT Bearer tokens for API calls; short-lived HMAC-SHA256 signed URLs for `/api/stream/{id}` to prevent unauthorized consumption of Render's 5 GB/month bandwidth quota.
*   **Performance & Resource Limits**: Render Free Tier constrains the backend to 512 MB RAM, 0.1 CPU, and 5 GB/month outbound bandwidth. `StreamController` must pipe streams using `HttpCompletionOption.ResponseHeadersRead` without buffering full audio files in memory, and `IStreamResolver` must cache resolved URLs in `IMemoryCache` for ~30–60 minutes to minimize YouTube extraction overhead.
*   **Mobile Compatibility**: Prioritize `M4A/AAC` (`itag 140`) over `WebM/Opus` so `<audio>` playback works reliably on iOS Safari as well as Android and desktop browsers.

## Detailed Implementation Plan

All work targets a greenfield repository split into `backend/` (`.NET` Web API deployed to Render) and `frontend/` (`React + TypeScript` Vite SPA deployed to Vercel).

### Target Files to Create

#### Phase 0: Render IP Spike (Pre-UI Validation)

1. **`backend/src/Nusic.Api/Services/IStreamResolver.cs`** (Create)
   * **Type / Scope**: C# Interface
   * **Proposed Changes**: Defines `ResolveAudioStreamAsync(string youtubeVideoId, CancellationToken ct)` returning `(string StreamUrl, long ContentLength, string ContentType, DateTimeOffset ExpiresAt)`. Allows swapping YouTube extraction implementations if Render's IP is blocked.
2. **`backend/src/Nusic.Api/Services/YouTubeStreamResolver.cs`** (Create)
   * **Type / Scope**: C# Service
   * **Proposed Changes**: Uses `YoutubeExplode` to resolve `itag 140` (`M4A/AAC`) audio-only stream metadata and caches results in `IMemoryCache` for 30–60 minutes (bounded by the stream's `expire` parameter) to avoid re-extraction on every `Range` request.
3. **`backend/src/Nusic.Api/Controllers/StreamController.cs`** (Create)
   * **Type / Scope**: ASP.NET Core Controller
   * **Proposed Changes**: Implements `GET /api/stream/{trackId}` (and temporary spike route `/api/spike/stream/{videoId}`), validates HMAC signature + expiration, forwards incoming `Range` headers to YouTube via `HttpClient` with `HttpCompletionOption.ResponseHeadersRead`, and pipes `206 Partial Content` bytes directly to the response body with `Accept-Ranges`, `Content-Range`, `Content-Length`, and `Content-Type`.

#### Phase 1A: Backend API, Auth & Neon DB (`backend/`)

4. **`backend/Nusic.sln`** & **`backend/src/Nusic.Api/Nusic.Api.csproj`** (Create)
   * **Type / Scope**: .NET Solution & Project Configuration
   * **Proposed Changes**: Configures ASP.NET Core Web API dependencies (`Npgsql.EntityFrameworkCore.PostgreSQL`, `YoutubeExplode`, `Microsoft.AspNetCore.Authentication.JwtBearer`, `BCrypt.Net-Next`).
5. **`backend/Dockerfile`** (Create)
   * **Type / Scope**: Container Build Configuration (Render)
   * **Proposed Changes**: Multi-stage .NET build and runtime image for Render Web Service deployment.
6. **`backend/src/Nusic.Api/Program.cs`** (Create)
   * **Type / Scope**: Application Bootstrap & Middleware
   * **Proposed Changes**: Registers `DbContext` (Neon PostgreSQL connection string from env), `IMemoryCache`, `HttpClient`, JWT authentication, CORS policy allowing the Vercel origin and exposing `Accept-Ranges`, `Content-Range`, `Content-Length`, `Content-Type`, and runs single-user seed on startup if no user exists.
7. **`backend/src/Nusic.Api/Data/NusicDbContext.cs`** & **`backend/src/Nusic.Api/Data/Entities.cs`** (Create)
   * **Type / Scope**: EF Core DbContext & Entities (`User`, `Playlist`, `Track`)
   * **Proposed Changes**: Maps `users`, `playlists`, and `tracks` tables to PostgreSQL schema with cascade delete on `playlist_id` and unique constraints on `users.username` and `users.email`.
8. **`backend/src/Nusic.Api/Migrations/`** (Create)
   * **Type / Scope**: EF Core Migrations
   * **Proposed Changes**: Initial PostgreSQL migration creating `users`, `playlists`, and `tracks` in Neon DB.
9. **`backend/src/Nusic.Api/Services/HmacUrlSigner.cs`** (Create)
   * **Type / Scope**: Security Helper
   * **Proposed Changes**: Signs and verifies `{trackId}:{exp}` using HMAC-SHA256 with a server-side secret from environment variables, enabling `<audio src="...">` cross-origin playback without third-party cookies.
10. **`backend/src/Nusic.Api/Services/IMetadataResolver.cs`**, **`YouTubeMetadataResolver.cs`**, & **`SpotifyMetadataResolver.cs`** (Create)
    * **Type / Scope**: Metadata & Matching Services
    * **Proposed Changes**: Extracts title/artist/duration for YouTube URLs directly; for Spotify URLs, fetches track title/artist via Spotify `oEmbed` (with optional Client Credentials fallback) and searches YouTube (`"{artist} - {title} Topic"`) to resolve the initial `youtube_video_id`.
11. **`backend/src/Nusic.Api/Controllers/AuthController.cs`**, **`PlaylistsController.cs`**, & **`TracksController.cs`** (Create)
    * **Type / Scope**: REST API Controllers
    * **Proposed Changes**: Implements `POST /api/auth/login`, playlist CRUD (`GET/POST/PATCH/DELETE /api/playlists`), track management (`GET/POST /api/playlists/{id}/tracks`, `PATCH /api/tracks/{id}/match`, `DELETE /api/tracks/{id}`), and `GET /api/tracks/{id}/play-url` (returns HMAC-signed stream URL).
12. **`backend/tests/Nusic.Api.Tests/HmacUrlSignerTests.cs`** & **`RangeHeaderTests.cs`** (Create)
    * **Type / Scope**: xUnit Unit Tests
    * **Proposed Changes**: Verifies HMAC signature generation, expiration rejection, tampering rejection, and `Range` header parsing/validation.

#### Phase 1B: Frontend SPA (`frontend/`)

13. **`frontend/package.json`**, **`frontend/tsconfig.json`**, **`frontend/vite.config.ts`**, & **`frontend/vercel.json`** (Create)
    * **Type / Scope**: Vite + React + TypeScript & Vercel SPA Routing Config
    * **Proposed Changes**: Configures TypeScript, React, API base URL env (`VITE_API_BASE_URL`), and Vercel SPA rewrite rules.
14. **`frontend/src/api/client.ts`** & **`frontend/src/types/models.ts`** (Create)
    * **Type / Scope**: Typed API Client & Domain Models
    * **Proposed Changes**: Defines `Playlist`, `Track`, `AuthResponse`, and `PlayUrlResponse` types; attaches JWT Bearer token to JSON API requests and handles `401` redirects.
15. **`frontend/src/context/AuthContext.tsx`** (Create)
    * **Type / Scope**: React Auth Context
    * **Proposed Changes**: Stores JWT session state and exposes `login` / `logout` helpers.
16. **`frontend/src/components/LoginForm.tsx`** (Create)
    * **Type / Scope**: React Component
    * **Proposed Changes**: Single-user login form (`username` or `email` + `password`).
17. **`frontend/src/components/PlaylistSidebar.tsx`**, **`TrackList.tsx`**, **`AddTrackForm.tsx`**, & **`EditMatchModal.tsx`** (Create)
    * **Type / Scope**: React Playlist & Track UI Components
    * **Proposed Changes**: Playlist creation/deletion/selection, single-song URL input with loading indicator while resolving metadata, track rows, and modal to override `youtube_video_id` for mismatched Spotify tracks.
18. **`frontend/src/components/AudioPlayer.tsx`** & **`frontend/src/hooks/useAudioPlayer.ts`** (Create)
    * **Type / Scope**: Custom Player Engine & UI
    * **Proposed Changes**: Manages `<audio>` element lifecycle, fetches fresh HMAC-signed `/play-url` on track start or URL expiry, reads `audio.buffered` (`TimeRanges`) to render played + buffered-ahead bars, handles seek/Next/Previous/auto-advance, and registers `navigator.mediaSession` handlers for mobile lock-screen controls.
19. **`frontend/src/App.tsx`** & **`frontend/src/main.tsx`** (Create)
    * **Type / Scope**: Application Entry & Layout
    * **Proposed Changes**: Connects `AuthContext`, responsive mobile/desktop layout, playlist state, and persistent bottom `AudioPlayer`.
20. **`frontend/src/hooks/useAudioPlayer.test.ts`** (Create)
    * **Type / Scope**: Vitest Unit Tests
    * **Proposed Changes**: Verifies `audio.buffered` range calculation, Next/Previous queue boundaries, and automatic refresh when a signed stream URL expires.

### Verification Plan

*   **Spike Verification (Manual on Render)**: Deploy `StreamController` + `YouTubeStreamResolver` to Render Free Tier and test `curl -I -H "Range: bytes=0-1023"` against a real YouTube `itag 140` video ID to confirm `206 Partial Content` without `403` blocks.
*   **Backend Build & Tests**: `dotnet build backend/Nusic.sln` and `dotnet test backend/Nusic.sln` (all xUnit tests pass).
*   **Frontend Build, Lint & Tests**: `npm run build`, `npm run lint`, and `npm test` inside `frontend/`.
*   **End-to-End Manual Check (Desktop + Mobile)**: Log in, create a playlist, add 1 YouTube URL + 1 Spotify URL, verify metadata auto-populates, verify buffered progress bar updates on seek, verify Spotify `Edit Match` updates playback, and verify iOS/Android lock-screen controls work.

--------------------------------------------------------------------------------

*Drafted with EGM*
