# nusic — Style Reference (Dark Liquid Glass Edition)
> Frosted obsidian cinema at midnight — translucent glass panels float over drifting ambient light so album art and motion bring the interface to life.

**Theme:** dark (Liquid Glass)

nusic operates as a dark-first, translucent music sanctuary. Rather than relying on flat opaque surfaces, the interface pairs a pure `#000000` void canvas with drifting blurred ambient orbs (`#0ea5e9` cobalt-blue + `#00db4d` electric emerald) that refract softly behind frosted glass panels (`backdrop-filter: blur(18px) saturate(170%)`). Specular top-edge highlights (`inset 0 1px 0 rgba(255, 255, 255, 0.14)`), hairline glass borders, and fluid hover/equalizer motion give nusic a distinct, tactile identity while keeping album artwork and artist photography front and center.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Void Black | `#000000` | `--color-void-black` | Primary canvas, deepest backdrop behind ambient orbs |
| Obsidian Glass Base | `#050505` | `--color-obsidian` | Base tint for translucent glass panels (`rgba(5, 5, 5, 0.40)`) |
| Deep Graphite | `#141418` | `--color-graphite` | Fallback opaque surface for reduced-transparency environments |
| Ash Gray | `#333333` | `--color-ash-gray` | Subtle dividers and inactive control outlines |
| Steel Mist | `#767676` | `--color-steel-mist` | Muted text, secondary nav, disabled labels |
| Cloud Gray | `#b3b3b3` | `--color-cloud-gray` | Secondary body text, metadata, timestamps |
| Pure White | `#ffffff` | `--color-pure-white` | Primary text, headings, light icon fills, secondary pill CTAs |
| nusic Accent | `#00db4d` | `--color-nusic-accent` | Primary CTA fills, active play buttons, equalizer bars, brand wordmark |
| Ambient Orb Blue | `#0ea5e9` | `--color-ambient-orb` | Drifting background glow orbs refracting behind glass surfaces |
| Banner Gradient Start | `#000000` | `--color-premium-start` | Leading anchor for bottom preview/promotional glass strip |
| Banner Gradient End | `#007027` | `--color-premium-end` | Terminus for bottom preview/promotional glass strip |

## Tokens — Liquid Glass & Motion

| Name | Value | Token | Role |
|------|-------|-------|------|
| Glass Surface | `rgba(5, 5, 5, 0.40)` | `--glass-surface` | Sidebar, top bar, and main content frosted container fill |
| Glass Elevated | `rgba(255, 255, 255, 0.06)` | `--glass-elevated` | Album cards, search pill, prompt cards, icon circles |
| Glass Elevated Hover | `rgba(255, 255, 255, 0.11)` | `--glass-elevated-hover` | Interactive hover state on glass cards and controls |
| Glass Blur | `blur(18px) saturate(170%)` | `--glass-blur` | Backdrop refraction filter applied to major glass panels |
| Glass Border | `1px solid rgba(255, 255, 255, 0.10)` | `--glass-border` | Crisp translucent edge defining glass layers |
| Glass Highlight | `inset 0 1px 0 rgba(255, 255, 255, 0.14)` | `--glass-highlight` | Specular top-edge rim catching ambient light |
| Ambient Orb Blur | `50px` | `--orb-blur` | Gaussian diffusion on background light orbs |
| Ambient Orb Opacity | `0.55` | `--orb-opacity` | Balanced glow intensity so text contrast stays high |

## Tokens — Typography

### nusic UI (`Inter`) — Primary UI typeface (`--font-nusic-ui`)
- **Font:** Inter (alternates: IBM Plex Sans, DM Sans)
- **Weights:** 400, 600, 700
- **Sizes:** 11px, 12px, 13px, 14px, 16px
- **Line height:** 1.20, 1.33, 1.50
- **Role:** Body copy, navigation, buttons, metadata, and compact card titles.

### nusic Title (`Inter`) — Rail and section headings (`--font-nusic-title`)
- **Font:** Inter
- **Weights:** 700
- **Sizes:** 24px
- **Line height:** 1.20
- **Role:** Section headings ('Trending songs', 'Popular artists').

### Type Scale

| Role | Family | Weight | Size | Line Height | Token |
|------|--------|--------|------|-------------|-------|
| caption | Inter | 400 | 11px | 1.33 | `--text-caption` |
| body | Inter | 400 | 14px | 1.5 | `--text-body` |
| heading | Inter | 700 | 24px | 1.2 | `--text-heading` |

## Tokens — Spacing & Shapes

**Base unit:** 4px · **Density:** compact

### Border Radius

| Element | Value |
|---------|-------|
| tags & pills | `9999px` |
| glass panels | `14px` |
| album & prompt cards | `12px` |
| album artwork inner | `8px` |
| search & buttons | `9999px` |
| artist portraits | `9999px` |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| lg | `0px 8px 24px 0px rgba(0, 0, 0, 0.5)` | `--shadow-lg` |
| glass | `inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 8px 24px rgba(0, 0, 0, 0.4)` | `--shadow-glass` |

## Components

### Ambient Orbs Layer
**Role:** Animated background light source

Fixed background layer (`z-index: 0`, `pointer-events: none`) containing 3 blurred circular orbs (`50px` blur, `0.55` opacity) in `#0ea5e9` and `#00db4d`. Orbs drift slowly via `orbDrift1` (11s), `orbDrift2` (14s), and `orbDrift3` (9s) `ease-in-out infinite alternate`. Always honor `@media (prefers-reduced-motion: reduce)` by pausing orb and equalizer animations.

### Pill Button — Accent Primary
**Role:** High-emphasis action button

Filled pill with `#00db4d` background, `#000000` text, weight 700 at 14px, `9999px` radius, subtle top specular inset (`rgba(255, 255, 255, 0.38)`), and `translateY(-1px) scale(1.03)` hover lift.

### Pill Button — Glass Ghost
**Role:** Low-emphasis action

Translucent fill (`rgba(255, 255, 255, 0.07)`) with `1px solid rgba(255, 255, 255, 0.22)` border, `#ffffff` text, `9999px` radius. Used for secondary CTAs like 'Create playlist'.

### Glass Album Card
**Role:** Content tile for albums, singles, playlists

`12px` radius card using `--glass-elevated`, `--glass-border`, and `--glass-highlight`. Square 1:1 artwork (`8px` inner radius) with a floating `#00db4d` play FAB. On hover, lifts smoothly (`translateY(-4px) scale(1.02)`) with brightened glass border (`rgba(255, 255, 255, 0.24)`). Active playing cards display a `#00db4d` border.

### Artist Card
**Role:** Circular artist portrait in glass tile

`12px` subtle glass tile (`rgba(255, 255, 255, 0.04)`) housing a 1:1 circular (`9999px`) portrait with drop shadow (`0 8px 20px rgba(0,0,0,0.4)`), artist name in `#ffffff`, and 'Artist' subtitle in `#b3b3b3`.

### Now Playing Equalizer Widget
**Role:** Live playback indicator in sidebar

Compact glass card at the bottom of the sidebar showing the active track/artist alongside 3 vertical `#00db4d` equalizer bars animated with staggered `eqPulse` keyframes (`0.7s`–`1.05s`).

### Top Navigation Bar & Search Field
**Role:** Global frosted header

Full-width `--glass-surface` bar with `backdrop-filter: var(--glass-blur)` and `1px solid rgba(255, 255, 255, 0.08)` bottom border. Houses the `#00db4d` `nusic` wordmark, glass home icon circle, pill search bar (`9999px` radius, `--glass-elevated`), and primary 'Log in' pill.

### Bottom Preview Banner
**Role:** Frosted gradient strip

Sticky bottom strip using `linear-gradient(90deg, #000000, #007027)` with `backdrop-filter: var(--glass-blur)` and top hairline border, paired with a crisp white pill CTA (`rgba(255, 255, 255, 0.92)`).

## Do's and Don'ts

### Do
- Keep `--glass-surface` translucent (`~0.40` alpha) over the `#000000` canvas so the drifting `#0ea5e9` and `#00db4d` orbs remain subtly visible behind panels.
- Pair every glass container with both `--glass-border` and the top specular `--glass-highlight` inset so cards feel like cut glass rather than muddy gray boxes.
- Use smooth cubic-bezier transitions (`cubic-bezier(0.22, 1, 0.36, 1)`) for card hover lifts and pill interactions.
- Respect `prefers-reduced-motion: reduce` by disabling orb drift and equalizer loops.

### Don't
- Do not use opaque `#121212` or `#1f1f1f` fills on main panels—opacity kills the Liquid Glass depth.
- Do not stack heavy multi-color neon glows around text; keep chromatic light behind the glass layer (`z-index: 0`) and text clean white (`#ffffff`) or muted gray (`#b3b3b3`).
- Do not use sharp corners (`< 6px`) on cards or panels; glass surfaces require soft `12px–14px` radii and `9999px` pills.

## Quick Start

### CSS Custom Properties & Tailwind v4

```css
@theme {
  --color-void-black: #000000;
  --color-obsidian: #050505;
  --color-graphite: #141418;
  --color-nusic-accent: #00db4d;
  --color-ambient-orb: #0ea5e9;
  --color-premium-start: #000000;
  --color-premium-end: #007027;

  --radius-md: 6px;
  --radius-lg: 12px;
  --radius-xl: 14px;
  --radius-full: 9999px;
}

:root {
  --color-void-black: #000000;
  --color-obsidian: #050505;
  --color-nusic-accent: #00db4d;
  --color-ambient-orb: #0ea5e9;
  --glass-surface: rgba(5, 5, 5, 0.40);
  --glass-elevated: rgba(255, 255, 255, 0.06);
  --glass-blur: blur(18px) saturate(170%);
  --glass-border: 1px solid rgba(255, 255, 255, 0.10);
  --glass-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.14);
  --color-premium-start: #000000;
  --color-premium-end: #007027;
}
```
