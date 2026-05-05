# Subsonic Neon Deck

A browser-based control room for a Subsonic music library.

This project turns a plain `index.html` into a dark, tactile music console: queue on the right, browser on the left, waveform and spectrum in the center, transport controls under your hand, and enough neon edge-lighting to make a private music server feel like a small spaceship.

It is not a streaming service. It is your server, your music, your browser, and a p5.js audio deck sitting between them.

## What It Is

Subsonic Neon Deck is a client-side Subsonic player built with p5.js and p5.sound. It connects directly to a Subsonic-compatible server, stores token authentication in browser storage, browses your library, plays streams, renders album metadata, shows lyrics when available, and gives you live audio controls with waveform and spectrum visualizers.

The app has no build step. The browser loads the source files directly.

## The Player

The interface is arranged like a modular deck:

- `NOW PLAYING` shows the active song, artist, album, and cover art.
- `SOURCE` selects playlists and songs.
- `TRANSPORT` handles play, pause, stop, loop, and filter activation.
- `SPECTRUM` and `WAVEFORM` visualize the current audio signal.
- `POSITION` tracks playback progress.
- `LEVEL` controls volume, balance, and playback rate.
- `FX BUS` exposes bass, mid, treble, reverb, and reverb mix.
- `BROWSER` lets you explore the Subsonic library.
- `QUEUE` lists upcoming tracks. Click any queued item to jump there and continue from that point.
- `USER CONTROL` keeps the deck configurable with `Show Lyrics`, `Lock Layout`, and `Logout`.

Every knob has been replaced by sliders, and sliders accept both dragging and direct track clicks, so the controls behave more like compact audio-console faders than decorative widgets.

Lyrics are hidden on first load so the deck gets the full initial viewport. Turn on `Show Lyrics` when you want the separate lyrics column.

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
- layout preferences
- lyrics visibility

All of that lives under the `localStorage` key:

```text
subsonicPlayerConfig
```

The player verifies the generated token with the server before saving it. If the password is rejected, the deck stays on the setup form and asks you to try again.

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

## Layout Mode

The deck is movable because real screens are not all the same shape.

Turn `Lock Layout` off in `USER CONTROL` to rearrange panels and controls. Drag a panel to move it together with the controls inside it, or drag individual controls when you want finer placement. The spectrum and waveform panels can also be resized from their lower-right corners.

Turn `Lock Layout` back on to save the current arrangement in browser storage. The next reload restores it automatically.

On startup, the deck waits until login validation and player initialization finish before rendering the full control surface. Saved layout items that no longer fit the current canvas are ignored so the default positions can recover the interface.

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
  sketch.js        main p5 lifecycle, UI layout, orchestration
  subsonic.js      Subsonic REST client and response normalization
  player.js        stream loading, playback, queue progression
  playlist.js      queue rendering and click-to-play behavior
  filebrowser.js   library browsing
  playinginfo.js   cover art and metadata panel
  spectrum.js      spectrum visualizer
  waveform.js      waveform visualizer
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

The visual language is dark, precise, and slightly cyberpunk: restrained panels, bright signal colors, scan-friendly labels, and dense controls built for repeated use rather than a landing-page hero.

## Current Caveats

- Lyrics are integrated behind a visibility switch, but the lyrics workflow may need follow-up repair.
- This is a browser client, so CORS and Subsonic server configuration can affect connectivity.
- Browser storage is local to the browser profile. `Logout` removes saved auth fields but keeps layout preferences; clearing storage removes everything.

## Why This Exists

Because a private music library should not feel like a spreadsheet.

It should feel alive: a little electrical, a little handmade, fast enough to use every day, and open enough that the deck can keep evolving with the person who uses it.

And because the old Subsonic interface, as great as it is, needs an upgrade. Even though Subsonic is no longer maintained, and even though there are spawns keeping the vibe alive, it works like a charm and, if you can come up with your own client, why upgrading to a new software?

## License

Not decided yet.
