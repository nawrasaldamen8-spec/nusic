# nusic (Personal Audio Player)

* **Author:** Nawras
* **Date:** 2026-11-25

## Overview

A personal web-based music player deployed across **Vercel** (`React + TypeScript`), **Render** (`.NET` Web API), and **Neon DB** (`PostgreSQL`). The user logs in with a single-user account (`username`, `email`, `password_hash`) and manages multiple playlists where tracks are added one-by-one via individual **YouTube** or **Spotify** song URLs (with automatic title/metadata extraction). No audio files or blobs are stored on the server, cloud storage, or database; only links and metadata live in Neon DB, while audio is streamed via HTTP `Range` requests (`206 Partial Content`) through the `.NET` backend.

## Analysis

### 1. Critical Technical Risks & Contradictions

* **Arbitrary 512KB Chunks Break MSE Seeking `[verified from docs]`:**
  Browser `MediaSource` / `SourceBuffer.appendBuffer()` cannot decode arbitrary byte offsets of an MP4/M4A or WebM stream without first receiving the **Initialization Segment** (`ftyp` + `moov` for fMP4, or EBML header + `Tracks` for WebM). Random-offset seeking fails unless byte ranges align with segment/keyframe boundaries indexed by `sidx` (fMP4) or `Cues` (WebM). Blind 512KB chunking forces sequential-only playback from byte `0` or throws `DecodeError` on seek.
* **iOS Safari MSE & Codec Trap `[verified from docs]`:**
  Traditional `MediaSource` is unavailable on iOS Safari. iOS 17.1+ provides `ManagedMediaSource` (requiring `disableRemotePlayback = true` before `sourceopen`), and reliably supports **MP4/AAC (`audio/mp4; codecs="mp4a.40.2"`)**, whereas **WebM/Opus** frequently triggers `NotSupportedError`. Extracting YouTube `M4A/AAC` (`itag 140`) instead of `WebM/Opus` (`itag 251`) avoids iOS playback failure.
* **YouTube Datacenter IP Blocks & `nsig` Throttling on Render `[verified from docs]`:**
  YouTube flags cloud/datacenter IP ranges (including Render), returning `403 Forbidden`, bot-verification prompts, or `nsig` bandwidth throttling. Stream URLs on `googlevideo.com` are also IP-bound to the extractor IP. While proxying through Render keeps extraction IP == streaming IP, Render's own IP can still be blocked or throttled, and extraction libraries (`YoutubeExplode`, `yt-dlp`) require periodic updates when YouTube rotates player ciphers.
* **Render Free Tier Limits `[verified from docs]`:**
  Render's Free tier provides **5 GB/month outbound bandwidth**, **512 MB RAM**, **0.1 CPU**, and **750 instance hours/month**. At ~128 kbps (~1 MB/min, ~3.5 MB/song), 5 GB allows roughly **~1,400 plays/month** (~45 songs/day) `[my inference]`. Deleting client-side cache on every track switch/replay increases repeated bandwidth usage, and keeping Render awake 24/7 via an uptime monitor consumes ~720–744 of the 750 monthly free hours `[my inference]`.
* **`<audio>` Tag Auth vs. Cross-Origin Cookies `[my inference]`:**
  Standard `<audio src="...">` elements cannot send `Authorization: Bearer` headers, and Safari ITP blocks cross-origin (`vercel.app` -> `onrender.com`) third-party cookies. Leaving `/api/stream/{id}` unauthenticated exposes the 5 GB proxy quota. **Inventive resolution:** have the authenticated API return a short-lived **HMAC-SHA256 signed stream URL** (`/api/stream/{id}?exp=...&sig=...`).

### 2. Ideal Final Result & Inventive Resolutions

* **Progressive Enhancement (`<audio>` + `audio.buffered` first, MSE/Cache second):**
  Using native `<audio>` pointing to a `.NET` `206 Partial Content` Range proxy natively triggers browser `Range` requests, exposes `audio.buffered` (`TimeRanges`) to draw the exact YouTube-style buffered progress bar in React, and integrates with mobile lock-screen controls (`navigator.mediaSession`) without MSE container parsing bugs. Custom chunking/caching can be layered later if needed for learning or replay savings.
* **Swappable `IStreamResolver`:**
  Abstracting stream resolution behind `IStreamResolver` in `.NET` with `IMemoryCache` (caching resolved URLs for ~30–60 minutes) minimizes YouTube hits and allows swapping extractors (e.g., `YoutubeExplode` vs. a self-hosted tunnel) if Render's IP is blocked.

## Goals vs. Non-Goals

* **In-Scope Goals:**
  * Personal multi-playlist manager for individual YouTube and Spotify song URLs.
  * Simple single-user login (`username`, `email`, `password_hash` in Neon DB; no public registration).
  * Automatic metadata extraction (title, artist, duration) on link add.
  * Spotify metadata -> YouTube search matching, persisting matched `youtube_video_id` in Neon DB with manual UI edit override.
  * Stateless `.NET` `206 Partial Content` streaming proxy (zero server disk/cloud audio storage) with short-lived HMAC-signed stream URLs.
  * YouTube-style buffered progress bar on both mobile and desktop browsers.
* **Out-of-Scope Non-Goals:**
  * Storing audio files or blobs on Render, Vercel, Neon DB, or external cloud storage.
  * Importing full YouTube or Spotify playlist URLs in one click.
  * Full multi-user registration, OAuth, or password-reset flows.
  * Permanent offline music downloading.

## Alternatives Weighed

* **Custom 512KB `IndexedDB` + `MSE` Chunk Manager from Day 1:**
  * *Why questioned by reviewers:* Blind 512KB byte slices break `MSE` initialization segments and seeking; iOS Safari lacks standard `MediaSource` and rejects `WebM/Opus`; increases mobile background-playback fragility and consumes Render bandwidth on every replay if deleted immediately.
  * *Alternative proposed:* Native `<audio>` + `.NET` `206 Partial Content` Range proxy + `audio.buffered` UI bar for MVP (Phase 1), with optional `IndexedDB` / `MSE` as a Phase 2 learning experiment.
* **Cross-Origin Cookies for `<audio>` Stream Auth:**
  * *Rejected:* Unreliable across `vercel.app` -> `onrender.com` due to Safari ITP third-party cookie blocking; replaced with short-lived HMAC-signed URLs.
* **Scraping Spotify HTML for Track Metadata:**
  * *Risky:* Fragile against HTML/bot-protection changes compared to Spotify Client Credentials API or `oEmbed` + `"Artist - Title Topic"` YouTube search.

## Key Decisions & Staging for Next Steps

1. **MVP Playback Architecture (Locked):** Phase 1 uses native `<audio>` + `.NET` `206 Partial Content` Range proxy + `audio.buffered` UI bar + short-lived HMAC-signed stream URLs, prioritizing YouTube `M4A/AAC` (`itag 140`) for universal iOS and desktop compatibility.
2. **Deferred Learning Experiment (Phase 2):** Custom `IndexedDB` + `MSE` chunk management is deferred to Phase 2 so it does not block mobile reliability in Phase 1.
3. **Single-User Scope:** Designed for 1 user (~45 plays/day fits within Render Free Tier's 5 GB/month outbound cap), with a seeded single-user account (`username`, `email`, `password_hash`) in Neon DB.
4. **Spike First:** Before building the full UI, deploy a minimal `.NET` endpoint on Render to verify whether Render's IP can resolve and stream YouTube `itag 140` (`M4A/AAC`) without immediate `403` / bot-check blocks.
5. **Minimal Neon DB Schema:** `users`, `playlists`, and `tracks` (`source_type`, `original_url`, `youtube_video_id`, `title`, `artist`, `duration_seconds`, `position`).
