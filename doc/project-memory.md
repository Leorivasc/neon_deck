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
- `LayoutManager.getDefaultPanels()` is the single source for default panel geometry. Add new default panels there.
- `lib/playercontrol.js` owns the transport panel controls: PREV, PLAY, PAUSE, STOP, NEXT.
- `lib/userappcontrol.js` owns USER CONTROL actions: theme, Move Panels, Move Elements, fullscreen, and logout.
- `lib/audioeffects.js` owns p5.sound routing and audio effects: volume, balance, rate, EQ, reverb, and output analysis routing.
- `lib/subsonic.js` owns Subsonic REST calls and authenticated URL generation.
- Visual modules own their own rendering logic, sizing rules, and minimum dimensions:
  - `lib/spectrum.js`
  - `lib/waveform.js`
  - `lib/vumeters.js`
  - `lib/progressbar.js`

## Layout Behavior

- `Move Panels` lets panels move or resize.
- When a panel moves, elements owned by that panel move with it.
- `Move Elements` lets individual controls move between panels.
- If `Move Elements` is off, overlapping panels must not steal controls from each other.
- Turning both layout switches off locks normal use and saves the layout and ownership into `localStorage`.
- Spectrum, waveform, VU meters, and progress bar are panel-bound and should fit their panel after resizing.

## Playback And Audio

- Transport buttons should prevent repeated PLAY from stacking multiple playback instances. PLAY should act only from stopped or paused state.
- VU meters should analyze the final output signal, after EQ, reverb, volume, and balance.
- Spectrum bars should fill the available panel width rather than staying narrow with large gaps.
- Cyber transport icon filter currently uses a bright saturated look:

```css
invert(0%) sepia(91%) saturate(4000%) hue-rotate(135deg) brightness(300%) contrast(105%)
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
