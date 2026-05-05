# Architecture

## High-Level Shape

The application is a single-page browser app. It uses p5.js for canvas/UI lifecycle and p5.sound for audio loading, playback, effects, and FFT visualizations.

There is no module loader or bundler. `index.html` loads scripts in order, so each file contributes globals that later files can use.

## Source Map

| File | Responsibility |
| --- | --- |
| `index.html` | HTML shell, script loading, canvas mount, lyrics column. |
| `lib/sketch.js` | Main p5 sketch, setup flow, player controls, audio graph, playback, playlists, lyrics. |
| `lib/subsonic.js` | Subsonic REST client, token auth query generation, response normalization. |
| `lib/filebrowser.js` | Browses Subsonic indexes and music directories. Adds selected songs to the local playlist. |
| `lib/player.js` | Loads streams, owns the active `p5.SoundFile`, and advances playback. |
| `lib/playlist.js` | Local in-browser playlist queue, pointer navigation, list drawing, scrollbar handling. |
| `lib/playinginfo.js` | Current song metadata and cover art display. |
| `lib/progressbar.js` | Song-position progress bar and seek interaction. |
| `lib/spectrum.js` | FFT spectrum visualization. |
| `lib/waveform.js` | FFT waveform visualization. |
| `lib/slider_v.js` | Vertical slider control used by volume, EQ, and reverb. |
| `lib/slider_h.js` | Horizontal slider control used by balance and playback speed. |

## Startup Flow

1. Browser opens `index.html`.
2. Scripts load in the order declared in the HTML.
3. p5 calls `preload()`, which loads `assets/dot.mp3` as a placeholder sound.
4. p5 calls `setup()`.
5. `setup()` checks `localStorage` for `subsonicPlayerConfig`.
6. If config is missing, the app stops the p5 loop and shows a setup form.
7. On form submit, the app creates a salt, hashes `password + salt` with MD5, stores `server`, `user`, `token`, and `salt`, then reloads.
8. With config present, `setup()` creates `SubsonicClient`, the canvas, controls, visualizers, playlist, file browser, and starts loading playlists/indexes.

## Authentication Model

Subsonic token authentication uses:

```text
token = md5(password + salt)
```

Requests send:

```text
u=<user>&t=<token>&s=<salt>&v=<api-version>&c=<client>&f=json
```

The password is used only at setup time and is not stored by the app.

## API Boundary

`SubsonicClient.request()` is the central API boundary. It:

- Builds `/rest/<endpoint>` URLs.
- Adds authentication and JSON response parameters.
- Checks HTTP status.
- Checks for a `subsonic-response` object.
- Returns the Subsonic response for successful calls.
- Logs failures and returns `null`.

Higher-level methods convert nullable or singleton response fields into predictable shapes. For example:

- `getIndexes()` returns `{ index: [], child: [] }`.
- `getPlaylist()` returns an object with `entry: []`.
- List endpoints return arrays.

This keeps UI code from crashing when the server is unavailable, credentials fail, or the API returns a singleton where an array is expected.

## Playback Model

The app keeps one global `song` reference for the currently loaded `p5.SoundFile`.

Playback is centered on `Player` in `lib/player.js`:

- `playSongById(id)`: validates the song against the local playlist, builds the stream URL, loads it with `loadSound()`, and starts playback.
- `playSong()`: plays the currently loaded `p5.SoundFile`.
- `pauseSong()` and `stopSong()`: control current playback.
- `playNext()`: advances the local `PlayList` pointer when continuous playback is enabled.
- `getSoundObject()`: exposes a newly loaded sound once so `lib/sketch.js` can route it through the audio graph.

The local playlist is separate from the server playlist. `PlayList` stores the current queue in the browser and tracks a pointer to the current song.

## Audio Graph

When filters are enabled, the loaded song is disconnected from the master output and connected into three band-pass paths:

- Bass band-pass -> bass gain -> master
- Mid band-pass -> mid gain -> master
- Treble band-pass -> treble gain -> master
- Reverb processes the current song with its own wet/dry and gain controls.

`configureAudioRouting()` rebuilds this graph only when the active song changes or the filter on/off switch changes. This avoids repeatedly stacking `p5.Reverb.process()` paths while a user moves sliders.

Sliders update volume, balance, rate, bass, mid, treble, reverb mix, and reverb gain. Values are applied only when they change, and gain changes use a short ramp to reduce clicks.

## Slider Interaction

`SliderH` and `SliderV` support three interaction styles:

- Drag the handle.
- Click anywhere on the slider track to jump to that value.
- Use the mouse wheel while hovering over the slider.

## UI Model

Most UI is drawn on the p5 canvas. Some p5-created HTML elements are positioned over the page:

- Playback image buttons.
- Playlist selector.
- Song selector.

Lyrics are displayed in regular DOM nodes outside the canvas:

- `#title`
- `#lyrics`

## Error Handling Philosophy

The current implementation favors local resilience:

- Log API failures to the console.
- Return empty arrays or empty objects from data wrappers.
- Avoid playing songs with missing IDs.
- Avoid rendering crashes by falling back to `Untitled` or blank strings.
- Use a generated fallback cover when cover art is missing or fails to load.

This keeps the player usable enough to recover from bad data without forcing a full app restart.
