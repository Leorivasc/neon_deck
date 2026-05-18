# Subsonic Neon Deck

A browser-based control room for a Subsonic music library.

This project turns a plain `index.html` into a dark, tactile music console: queue on the right, browser on the left, waveform and spectrum in the center, transport controls under your hand, and enough neon edge-lighting to make a private music server feel like a small spaceship.

It is not a streaming service. It is your server, your music, your browser, and a p5.js audio deck sitting between them.

## What It Is

Subsonic Neon Deck is a client-side Subsonic player built with p5.js and p5.sound. It connects directly to a Subsonic-compatible server, stores token authentication in browser storage, browses your library, plays streams, renders album metadata, applies effects, and gives you live audio controls with waveform, spectrum, VU meter, and vectorscope visualizers.

The app has no build step. The browser loads the source files directly.

## The Player

The interface is arranged like a modular deck:

- `NOW PLAYING` shows the active song, artist, album, and cover art.
- `SOURCE` selects playlists and songs.
- `TRANSPORT` handles previous, play, pause, stop, next, loop, random play, visualizer visibility, and filter activation.
- `SPECTRUM` and `WAVEFORM` visualize the current audio signal.
- `VU METERS` shows the stereo output level after volume, balance, EQ, and reverb changes.
- `PHASE` shows stereo width and correlation through a vectorscope connected to the output bus.
- `DATA FEED` shows a live telemetry log with system, transport, stream, FX, EQ, spectrum, VU, and phase entries.
- `POSITION` tracks playback progress.
- `LEVEL` controls volume, balance, and playback rate.
- `FX BUS` exposes bass, mid, treble, reverb, and reverb mix.
- `BROWSER` lets you explore the Subsonic library. Folder rows use `🗀`, song rows use `♪`, and Shift+Click or the `+` toolbar mode appends songs or complete folders to `QUEUE` without interrupting playback.
- `QUEUE` lists upcoming tracks. Click any queued item to jump there, use `X` to clear the queue, Shift+Click to remove one item, or use the `-` toolbar mode to remove clicked queued items.
- `USER CONTROL` keeps the deck configurable with theme selection, `Move Panels`, `Move Elements`, `Full`, and `Logout`.

Every knob has been replaced by sliders, and sliders accept both dragging and direct track clicks, so the controls behave more like compact audio-console faders than decorative widgets.

Lyrics are currently parked in comments because the external lyrics workflow is unavailable. The old UI and API path are preserved as TODO code for later repair, but they are not active in the deck.

Use `Full` in `USER CONTROL` to toggle browser fullscreen mode; the canvas resizes after the browser enters or exits fullscreen.

The player ships with six persisted themes: `CYBER`, the dark neon console; `STELLAR`, a light pastel variant with the same signal-language; `FALLOUT`, a warm terminal-style deck with orange signal glow and green accents; `SUBMARINE`, a deep blue deck with yellow and green signal accents; `MATRIX`, a black-and-green terminal deck built around DATA FEED energy; and `VOLCANO`, a lava-red console with orange signal heat.

## First Run

Open the player and enter:

- Subsonic server URL
- username
- password

The password is used only to generate the Subsonic token and salt. The browser stores:

- `server`
- `user`
- `token`
- `salt`
- selected theme
- random play state
- visualizer visibility
- layout preferences
- layout ownership

All of that lives under the `localStorage` key:

```text
subsonicPlayerConfig
```

The player verifies the generated token with the server before saving it. If the password is rejected, the deck stays on the setup form and asks you to try again.

Because this is a client-side app, those stored token credentials are readable by anyone with access to the same browser profile. Use HTTPS for remote Subsonic servers and run the deck from a trusted local copy.

## Quick Start

Serve the project directory with any static web server:

```bash
python3 -m http.server 8001
```

Then open:

```text
http://localhost:8001/
```

You can also use another static server. The important part is that `index.html`, `lib/`, and `assets/` are served from the same project root.

## Installable PWA

Subsonic Neon Deck includes a progressive web app layer. It can still be used as a normal website, but compatible browsers can install it as a standalone app window.

The PWA service worker caches only the local app shell: `index.html`, `manifest.webmanifest`, scripts in `lib/`, local control images, and the app icon. Subsonic streams, REST responses, cover art, credentials, and other authenticated server data stay network-only.

Service workers require HTTPS or localhost. During local development, serving from `http://localhost:8001/` is enough for registration.

## Layout Mode

The deck is movable because real screens are not all the same shape.

Turn `Move Panels` on in `USER CONTROL` to move or resize panels. Dragging a panel carries its owned controls with it, so panels behave like real containers.

Turn `Move Elements` on when you want to move individual controls between panels. Turning both switches off saves the current arrangement and ownership data in browser storage. The next reload restores it automatically.

Panel-bound modules such as `SPECTRUM`, `WAVEFORM`, `VU METERS`, `PHASE`, `POSITION`, `BROWSER`, `QUEUE`, and `DATA FEED` refit their contents after resize. `BROWSER`, `QUEUE`, and `DATA FEED` also consume mouse wheel scrolling while the pointer is over them.

On startup, the deck waits until login validation and player initialization finish before rendering the full control surface. Saved layout coordinates are restored as-is, even when they fall outside the currently visible canvas after switching between fullscreen and windowed mode.

## Audio Path

The player keeps a stable p5.sound routing chain:

```text
Subsonic stream
  -> Player
  -> bass / mid / treble filters
  -> reverb send
  -> analyzer
  -> browser audio output
```

Filter and reverb settings are updated only when their sliders change. That keeps the graph from being rebuilt continuously during playback, which avoids the stutter that can happen when audio nodes are stacked or reprocessed every frame.

## Project Map

```text
index.html
lib/
  theme.js         central theme registry and active UI palette
  sketch.js        main p5 lifecycle, UI layout, orchestration
  layoutmanager.js panel layout, drag/resize, ownership, persistence model
  audioeffects.js  audio routing, EQ, reverb, output control application
  subsonic.js      Subsonic REST client and response normalization
  player.js        stream loading, playback, queue progression
  playercontrol.js transport button DOM controls
  userappcontrol.js theme, fullscreen, and logout controls
  telemetrylog.js  shared DATA FEED event buffer, timestamps, throttle, dedupe
  telemetrypanel.js DATA FEED p5 renderer
  textlistbox.js   reusable p5 fixed-row text/list box
  playlist.js      queue rendering and click-to-play behavior
  filebrowser.js   library browsing
  playinginfo.js   cover art and metadata panel
  spectrum.js      spectrum visualizer
  waveform.js      waveform visualizer
  vumeters.js      stereo output VU meters
  vectorscope.js   stereo phase vectorscope
  slider_h.js      horizontal sliders
  slider_v.js      vertical sliders
  switch.js        toggle switches
doc/
  README.md        documentation index
  architecture.md  system architecture and inner workings
  diagrams.md      Mermaid diagrams
```

## Documentation

Developer documentation lives in [doc/README.md](doc/README.md).

Start there for architecture notes, runtime flow, API behavior, audio routing, layout persistence, and diagrams.

## Design Notes

The player is intentionally canvas-first. Most of the deck is drawn with p5 so panels, sliders, visualizers, and layout tools can behave as one instrument. A few native DOM controls remain where they are more practical, such as select inputs and transport buttons, but they are anchored to the canvas container and participate in layout editing.

The visual language is precise and signal-driven: restrained panels, scan-friendly labels, dense controls built for repeated use, and theme palettes that can move between dark cyberpunk and light stellar modes without changing the deck's structure.

## Current Caveats

- Lyrics are parked in comments until the external lyrics workflow is available again.
- This is a browser client, so CORS and Subsonic server configuration can affect connectivity.
- Browser storage is local to the browser profile. `Logout` removes saved auth fields and panel layout preferences; clearing storage removes everything.

## Why This Exists

Because a private music library should not feel like a spreadsheet.

It should feel alive: a little electrical, a little handmade, fast enough to use every day, and open enough that the deck can keep evolving with the person who uses it.

And because the old Subsonic interface, as great as it is, needs an upgrade. Even though Subsonic is no longer maintained, and even though there are spawns keeping the vibe alive, it works like a charm and, if you can come up with your own client, why upgrading to a new software?

## License

Not decided yet.
