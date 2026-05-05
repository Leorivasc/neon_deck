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
| `lib/switch.js` | Toggle controls for filters, playlist looping, and layout locking. |

## Startup Flow

1. Browser opens `index.html`.
2. Scripts load in the order declared in the HTML.
3. p5 calls `preload()`, which loads `assets/dot.mp3` as a placeholder sound.
4. p5 calls `setup()`.
5. `setup()` checks `localStorage` for `subsonicPlayerConfig`.
6. If config is missing, the app stops the p5 loop and shows a setup form.
7. On form submit, the app creates a salt, hashes `password + salt` with MD5, and checks the candidate credentials with a Subsonic `ping`.
8. Only accepted credentials are stored as `server`, `user`, `token`, and `salt`; rejected credentials keep the setup form visible.
9. With accepted config present, `setup()` waits for the async credential check before creating the player UI.
10. `initializePlayer()` creates `SubsonicClient`, sizes the canvas to the available viewport, creates controls, visualizers, playlist, file browser, applies saved layout data, and starts loading playlists/indexes.
11. The draw loop renders the full deck only after `appReady` is true. Before that it shows a startup/status screen, which avoids half-rendered empty panels during async startup.

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

`Logout` removes the stored auth fields and reloads the page. Layout and lyrics visibility remain in browser storage so the same deck arrangement can be reused after signing in again.

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

Clicking a visible row in the queue resolves the row with `PlayList.getItemIndexAt(mx, my)` and calls `Player.playSongByPlaylistId(index)`. That updates the queue pointer, starts the selected song, and leaves normal `playNext()` behavior intact so playback continues through the rest of the queue.

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

The visual presentation is a dark, cyberpunk-inspired control surface. `index.html` provides the page shell, page background, canvas container, and lyrics column styles. `lib/sketch.js` draws the canvas shell, panels, labels, controls, and layout-edit overlay.

The canvas uses the available viewport with a minimum working size of `1024 x 868`. It resizes on `windowResized()` so large screens can expose more canvas area.

The lyrics column is hidden by default in both CSS and runtime state. `Show Lyrics` is opt-in, which prevents the empty lyrics panel from consuming horizontal space or pushing the deck down during the first post-login render. The app only restores saved lyrics visibility after the user has explicitly touched the switch, so older configs with an accidental `lyricsVisible: true` value do not reopen the panel.

## Layout Model

The canvas layout is split between panels and movable elements:

- `panelLayout`: developer-facing array of panel rectangles with `key`, `x`, `y`, `w`, `h`, `label`, and accent color.
- p5-drawn controls: sliders, switches, visualizers, file browser, queue, progress bar, and `PlayingInfo`.
- p5-created DOM controls: play/pause/stop buttons, playlist select, and song select.

The DOM controls are parented to `#cnv`, whose CSS uses `position: relative`. This makes their p5 `position(x, y)` coordinates align with canvas coordinates instead of page-level coordinates.

### Lock Layout Switch

`Lock Layout` is a runtime developer tool:

- On by default: the app behaves normally.
- Off: the layout editor is active, and highlighted elements can be dragged.

The `USER CONTROL` panel contains the `Show Lyrics` and `Lock Layout` switches plus a `Logout` button. It participates in the same movable panel model as the other panels, so moving the panel also moves those controls when their centers are inside it.

While unlocked, the app disables pointer events on the DOM controls so the canvas receives drag events. This means buttons and selects are movable rather than usable during layout editing.

Dragging a panel moves the panel and any movable element whose center is inside that panel. Individual controls can still be dragged independently when the pointer starts on that control.

The `SPECTRUM` and `WAVEFORM` panels also expose a resize grip in their bottom-right corner while layout editing is active. Dragging that corner resizes the panel and updates the matching visualizer dimensions so the extra canvas space can be used.

When an element is released, `lib/sketch.js` logs its new position and the full layout JSON to the browser console. Re-enabling `Lock Layout` persists the layout into `subsonicPlayerConfig.layout` alongside the Subsonic connection fields. The lyrics visibility switch is stored as `subsonicPlayerConfig.lyricsVisible`.

Saved layout entries are validated against the current canvas before being applied. Items whose saved bounds are outside the available canvas are skipped, allowing old or broken layouts to fall back to their default positions instead of leaving empty panels behind.

Developers can also call:

```js
logFullLayout()
getFullLayout()
logPanelLayout()
getPanelLayout()
setPanelLayoutEditMode(true)
setPanelLayoutEditMode(false)
```

`getFullLayout()` reports both panels and movable controls. `getPanelLayout()` reports only the panel rectangles. A normal user does not need these APIs; they exist to tune the UI and either persist the result in browser storage or hard-code preferred coordinates back into `setup()` and `panelLayout`.

## Error Handling Philosophy

The current implementation favors local resilience:

- Log API failures to the console.
- Return empty arrays or empty objects from data wrappers.
- Avoid playing songs with missing IDs.
- Avoid rendering crashes by falling back to `Untitled` or blank strings.
- Use a generated fallback cover when cover art is missing or fails to load.

This keeps the player usable enough to recover from bad data without forcing a full app restart.
