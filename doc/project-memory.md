# Project Memory

This file captures the working memory for future sessions. Keep it short, factual, and updated when the project direction changes.

## Identity

- App name: **Subsonic Neon Deck**.
- Type: browser-only Subsonic-compatible music player.
- Runtime: static `index.html` app with local scripts from `lib/`; no build step.
- Main libraries: p5.js and p5.sound.
- Documentation language: English.
- Code comments: English.

## Current Architecture

- `lib/sketch.js` should stay as the p5 lifecycle, orchestration, and main loop layer.
- `lib/layoutmanager.js` owns panel defaults, panel drag/resize, layout ownership, layout hit testing, and layout persistence helpers.
- `LayoutManager` filters drawable/interactive panels by asking the panel-bound component whether it is inactive.
- `LayoutManager.getDefaultPanels()` is the single source for default panel geometry. Add new default panels there.
- `lib/playercontrol.js` owns the transport panel controls: PREV, PLAY, PAUSE, STOP, NEXT.
- `lib/userappcontrol.js` owns USER CONTROL actions: theme cycling, Move Panels, Move Elements, fullscreen, and logout.
- `lib/audioeffects.js` owns p5.sound routing and audio effects: volume, balance, rate, EQ, reverb, and output analysis routing.
- `lib/subsonic.js` owns Subsonic REST calls and authenticated URL generation.
- `lib/theme.js` owns all theme-specific values, including colors, optional `panelFrame`, CSS shell shadow, and transport PNG filters.
- Visual modules own their own rendering logic, sizing rules, and minimum dimensions:
  - `lib/spectrum.js`
  - `lib/waveform.js`
  - `lib/vumeters.js`
  - `lib/vectorscope.js`
  - `lib/progressbar.js`

## Layout Behavior

- `Move Panels` lets panels move or resize.
- When a panel moves, elements owned by that panel move with it.
- `Move Elements` lets individual controls move between panels.
- If `Move Elements` is off, overlapping panels must not steal controls from each other.
- Turning both layout switches off locks normal use and saves the layout and ownership into `localStorage`.
- Default panel coordinates currently require a minimum canvas of `1224 x 1024`.
- Default control coordinates were last synchronized from `getFullLayout()`, not just `getPanelLayout()`.
- Spectrum, waveform, VU meters, and progress bar are panel-bound and should fit their panel after resizing.
- PHASE is panel-bound and resizable; keep its default position away from the bottom edge so it has room to grow.
- The canvas shell border needs 2px of reserved size in `resizeCanvasToAvailableSpace()` so the right border remains visible.

## Playback And Audio

- Transport buttons should prevent repeated PLAY from stacking multiple playback instances. PLAY should act only from stopped or paused state.
- Random play belongs to `PlayList`: it changes next/previous pointer selection without reordering the visible queue. The switch lives in TRANSPORT.
- Visualizers expose `setInactive()` / `isInactive()`. When inactive, their `draw()` returns immediately; `VectorScope` also disconnects its analyser nodes.
- The `Skinny` switch lives in TRANSPORT. ON stores `skinnyMode: true`, hides/inactivates SPECTRUM, WAVEFORM, VU METERS, and PHASE, and skips their draw calls for low-power devices.
- `##SKINNY MODE` comments mark the code paths that own low-power behavior: switch state, draw skipping, module-level inactive handling, analyzer disconnection, and LayoutManager panel filtering.
- VU meters should analyze the final output signal, after EQ, reverb, volume, and balance.
- Vector scope should tap `p5.soundOut.input` so the PHASE panel reflects the final stereo output bus without rerouting audio.
- Spectrum bars should fill the available panel width rather than staying narrow with large gaps.
- Long-running playback should dispose replaced `p5.SoundFile` objects and recreated `p5.Reverb` instances; stopping/disconnecting alone can leave p5.sound objects and Web Audio buffers around after several tracks.
- Themes currently available: `CYBER`, `STELLAR`, `FALLOUT`, and `SUBMARINE`.
- `SUBMARINE` is the default theme through `DEFAULT_THEME_NAME` in `lib/theme.js`; saved user themes still override it.
- `SUBMARINE` uses `panelFrame` for yellow panel frames while keeping panel contents blue and component/signal colors green.
- Transport icon filters belong to each theme in `lib/theme.js` as `transportIconFilter`; `PlayerControl` only consumes `UI.transportIconFilter`.
- Cyber transport icon filter currently uses a bright saturated look:

```css
invert(0%) sepia(91%) saturate(4000%) hue-rotate(135deg) brightness(300%) contrast(105%)
```

- Fallout transport icon filter currently uses:

```css
sepia(0%) saturate(1400%) hue-rotate(408deg) brightness(500%) contrast(106%)
```

- Submarine transport icon filter currently uses:

```css
sepia(0%) saturate(1800%) hue-rotate(250deg) brightness(230%) contrast(108%)
```

## Parked Features

- Lyrics are intentionally disabled and commented out.
- Do not delete lyrics code yet.
- The old external lyrics API path is not available, so no active runtime path should call `getLyrics()` or reserve UI space for lyrics.
- If lyrics are restored later, render external text safely with `textContent` or equivalent escaping, not raw `.html()`.

## Security Notes

- Passwords are only used to generate the Subsonic token and salt.
- Stored auth fields are `server`, `user`, `token`, and `salt` under `localStorage` key `subsonicPlayerConfig`.
- Stored token credentials are readable by anyone with the same browser profile, so this app should be used from a trusted local copy and preferably with HTTPS for remote servers.
- `SubsonicClient` should build authenticated URLs through `buildAuthenticatedUrl()` so query values are encoded with `URLSearchParams`.
- Avoid inserting variable text through `innerHTML`; prefer `textContent` or DOM node creation.

## Known Follow-Ups

- Panel abstraction can wait until panels become more dynamic. For now, `LayoutManager` plus module-owned layout metadata is enough.
- `FileBrowser` still mixes browsing, playlist mutation, and playback orchestration. It may be worth extracting later, but it is not urgent.
- Review old or legacy helper functions periodically and remove only when usage is clearly absent.
