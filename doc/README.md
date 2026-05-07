# Subsonic Player Documentation

This directory documents the browser player architecture, runtime flow, and the main moving parts in the codebase.

## Contents

- [Architecture](architecture.md): component responsibilities, data flow, layout tools, and inner workings.
- [Diagrams](diagrams.md): Mermaid diagrams for startup, API calls, playback, browsing, audio routing, and layout editing.

## Project Summary

This app is a client-side Subsonic music player built with p5.js and p5.sound. It runs from `index.html`, loads local JavaScript modules from `lib/`, asks for Subsonic connection details on first run, stores token authentication data in `localStorage`, then uses the Subsonic REST API to browse music, play streams, show cover art, apply effects, and visualize audio.

The app has no build step. The source files are loaded directly by the browser. The current presentation uses a themeable canvas deck with `CYBER` and `STELLAR` themes. The former lyrics column is parked in comments until the external lyrics workflow is available again.

## Entry Points

- `index.html`: loads p5, p5.sound, and all app modules.
- `lib/theme.js`: central theme registry, active `UI` palette, and CSS variable application.
- `lib/sketch.js`: p5 lifecycle, first-run setup, UI creation, playback orchestration, and audio controls.
- `lib/subsonic.js`: Subsonic REST client and response normalization.
- `lib/filebrowser.js`: music-library navigation.
- `lib/player.js`: stream loading and playback state.
- `lib/playlist.js`: local playback queue and playlist rendering.

## Runtime Layout

The canvas uses the maximum available viewport space, with a minimum working size of `1024 x 868`. Most controls are drawn by p5 on the canvas, while playback buttons and song/playlist selectors are p5-created DOM elements anchored to the canvas container.

Layout editing is split into two switches. `Move Panels` lets panels move or resize; when a panel moves, the elements owned by that panel move with it. `Move Elements` lets individual controls move between panels. Turning both switches off returns the deck to normal locked use and saves the layout into the same browser storage object as the Subsonic connection config.

The `USER CONTROL` panel contains the theme toggle, `Move Panels`, `Move Elements`, `Full`, and `Logout`. The theme toggle switches between `CYBER` and `STELLAR` and persists the selection in browser storage. `Full` toggles browser fullscreen mode and the canvas resizes on fullscreen changes. The `SPECTRUM`, `WAVEFORM`, `VU METERS`, and `POSITION` panels can be resized from their lower-right corner while panel movement is enabled.

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
- `layout`
- `layoutOwners`

The first-run form asks for a password, but only the generated token and salt are stored.
The generated token is checked with a Subsonic `ping` before it is saved, so rejected passwords keep the user on the setup form.
