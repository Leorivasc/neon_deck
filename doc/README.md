# Subsonic Player Documentation

This directory documents the browser player architecture, runtime flow, and the main moving parts in the codebase.

## Contents

- [Architecture](architecture.md): component responsibilities, data flow, and inner workings.
- [Diagrams](diagrams.md): Mermaid diagrams for startup, API calls, playback, browsing, and audio routing.

## Project Summary

This app is a client-side Subsonic music player built with p5.js and p5.sound. It runs from `index.html`, loads local JavaScript modules from `lib/`, asks for Subsonic connection details on first run, stores token authentication data in `localStorage`, then uses the Subsonic REST API to browse music, play streams, show cover art, display lyrics, and visualize audio.

The app has no build step. The source files are loaded directly by the browser.

## Entry Points

- `index.html`: loads p5, p5.sound, and all app modules.
- `lib/sketch.js`: p5 lifecycle, first-run setup, UI creation, playback orchestration, and audio controls.
- `lib/subsonic.js`: Subsonic REST client and response normalization.
- `lib/filebrowser.js`: music-library navigation.
- `lib/playlist.js`: local playback queue and playlist rendering.

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

The first-run form asks for a password, but only the generated token and salt are stored.

