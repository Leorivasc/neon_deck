# Subsonic Neon Deck Documentation

This directory documents the browser player architecture, runtime flow, and the main moving parts in the codebase.

## Contents

- [Architecture](architecture.md): component responsibilities, data flow, layout tools, and inner workings.
- [Project Memory](project-memory.md): current decisions, parked features, security notes, and follow-up context for future sessions.

## Project Summary

Subsonic Neon Deck is a client-side Subsonic music player built with p5.js and p5.sound. It runs from `index.html`, loads local JavaScript modules from `lib/`, asks for Subsonic connection details on first run, stores token authentication data in `localStorage`, then uses the Subsonic REST API to browse music, play streams, show cover art, apply effects, and visualize audio.

The app has no build step. The source files are loaded directly by the browser. It also includes a progressive web app layer for optional installation; the service worker caches only local app-shell files and leaves Subsonic streams, REST responses, cover art, credentials, and authenticated server data network-only. The current presentation uses a themeable canvas deck with `CYBER`, `STELLAR`, `FALLOUT`, `SUBMARINE`, `MATRIX`, and `VOLCANO` themes. The deck also includes a `DATA FEED` telemetry log fed by system events, transport actions, stream metadata, FX/EQ state, and analyzer summaries. The former lyrics column is parked in comments until the external lyrics workflow is available again.

## Entry Points

- `index.html`: loads p5, p5.sound, and all app modules.
- `manifest.webmanifest`: install metadata for browsers that support PWA installation.
- `sw.js`: app-shell service worker; does not cache Subsonic media or API data.
- `lib/theme.js`: central theme registry, active `UI` palette, and CSS variable application.
- `lib/sketch.js`: p5 lifecycle, first-run setup, UI creation, playback orchestration, and audio controls.
- `lib/subsonic.js`: Subsonic REST client and response normalization.
- `lib/filebrowser.js`: music-library navigation.
- `lib/player.js`: stream loading and playback state.
- `lib/playlist.js`: local playback queue and playlist rendering.
- `lib/textlistbox.js`: reusable p5 text/list box for logs and future command-style tools.
- `lib/telemetrylog.js`: shared DATA FEED event buffer with timestamps, throttle, and dedupe.
- `lib/telemetrypanel.js`: panel-bound DATA FEED renderer.

## Runtime Layout

The canvas uses the visible viewport space and avoids page scroll. This keeps touch dragging on tablets focused on the deck instead of letting the browser page move underneath the controls. Most controls are drawn by p5 on the canvas, while playback buttons and song/playlist selectors are p5-created DOM elements anchored to the canvas container.

The current responsive target is desktop and tablet-sized screens. A 10-inch tablet is expected to use the same deck concept, especially with `Skinny` enabled and filters disabled when performance matters. Smartphone support is intentionally deferred because it likely needs a separate view-based interface rather than a compressed version of the full deck.

Layout editing is split into two switches. `Move Panels` lets panels move or resize; when a panel moves, the elements owned by that panel move with it. `Move Elements` lets individual controls move between panels. Turning both switches off returns the deck to normal locked use and saves the layout into the same browser storage object as the Subsonic connection config.

The `USER CONTROL` panel contains the theme toggle, `Move Panels`, `Move Elements`, `Full`, and `Logout`. The theme toggle cycles through `CYBER`, `STELLAR`, `FALLOUT`, `SUBMARINE`, `MATRIX`, and `VOLCANO`, then persists the selection in browser storage. `Full` toggles browser fullscreen mode and the canvas resizes on fullscreen changes. The `SPECTRUM`, `WAVEFORM`, `VU METERS`, `PHASE`, `POSITION`, and `DATA FEED` panels can be resized from their lower-right corner while panel movement is enabled.

Scrollable canvas text/list surfaces use native deck gestures: `BROWSER`, `QUEUE`, and `DATA FEED` respond to mouse wheel input while hovered, and their scrollbars remain draggable for precise review.

The deck draw loop is guarded by an `appReady` state. During async login validation or player initialization, the canvas shows a startup status instead of drawing incomplete panels. Saved layout coordinates are restored as-is, even if a fullscreen layout is partly outside the visible area after returning to windowed mode.

## Local State

The app stores connection data under this browser key:

```text
subsonicPlayerConfig
```

Stored fields:

- `server`
- `user`
- `token`
- `salt`
- `theme`
- `randomPlay`
- `skinnyMode`
- `layout`
- `layoutOwners`
- `queueState`

Older browser storage may still contain `visualizersEnabled`; the app treats `visualizersEnabled: false` as `skinnyMode: true` for compatibility.

`queueState` stores compact queue metadata for the current server and user so reloads can restore the local `QUEUE` without autoplay. It excludes audio buffers, stream URLs, cover image pixels, and DATA FEED history.

## Skinny Mode

`Skinny` is a low-power playback mode for tablets and slower devices. It keeps playback and controls available, but disables the analyzer-heavy visual panels.

When enabled, Skinny hides and inactivates:

- `SPECTRUM`
- `WAVEFORM`
- `VU METERS`
- `PHASE`

Those panels are not drawn, are not editable while hidden, and their audio analyzer taps are disconnected where possible. Audio filters are separate; use the `Filters` switch to disable EQ/reverb processing.

The first-run form asks for a password, but only the generated token and salt are stored.
The generated token is checked with a Subsonic `ping` before it is saved, so rejected passwords keep the user on the setup form.
Because this is a client-side app, those stored token credentials are still accessible to anyone with the same browser profile. Prefer HTTPS for remote Subsonic servers and use a trusted local copy of the deck.
