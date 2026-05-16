/**
 * @fileOverview
 * This file contains the main sketch for Subsonic Neon Deck using p5.js.
 * It includes the setup, preload, and draw functions,
 * as well as various helper functions for audio playback, UI elements, and API interactions.
 * @Leo
 */

var SUBSONIC_CONFIG_KEY = 'subsonicPlayerConfig';

// Global startup state. The app does not draw the full deck until credentials
// are validated and all server-dependent components are created.
var SubsonicObj;
var appReady = false;
var appStatusMessage = "Starting...";

// Panel-bound visualizers. Their internal sizing/positioning rules live in
// each module; sketch.js only instantiates, draws, and syncs them with panels.
var spectrum;
var waveform;
var vuMeters;
var vectorScope;
var keepPlaying=false; //semaphore

var song = null; // p5.SoundFile object for playback
var SongsListObj; //local playlist object


var vol;
var pan;
var rate;

var playerControl;
var userAppControl;

var playListSelect;
var songSelect;

var progressBar;
var telemetryLog;
var telemetryPanel;
var lastTelemetrySampleAt = 0;
var lastAudioTelemetrySnapshot = null;

var playingInfo;

var audioEffects;

var filtersON = false; //filters start off for lower default CPU/audio load

var filtersOnOffSwitch; //switch for filters on/off
var loopOnOffSwitch; //switch for loop on/off
var randomPlaySwitch; //switch for random play mode
var skinnyModeSwitch; // ##SKINNY MODE: switch for low-power skinny mode
var movePanelsSwitch; //switch for enabling panel movement/resizing
var moveElementsSwitch; //switch for enabling individual element movement
// TODO: Lyrics feature is parked until the external lyrics API is available again.
// var lyricsVisibleSwitch; //switch for showing and hiding the lyrics column
var volSlider;
var balanceSlider;
var rateSlider;
var bassSlider;
var midSlider;
var trebleSlider;
var reverbSlider;
var reverbVolSlider;
var lastPlayingInfoSongId = null;

var panelLayoutEditMode = false;
var layoutManager;
var lastDomPointerMode = null;

// Remaining DOM controls created with p5. Transport and user app controls live
// in their own modules; these select positions are still coordinated here.
var playlistSelectPosition = { x: 33, y: 325, w: 200, h: 25 };
var songSelectPosition = { x: 34, y: 370, w: 200, h: 25 };
var playlistLabelPosition = { x: 30, y: 308, w: 80, h: 12 };
var songLabelPosition = { x: 32, y: 357, w: 80, h: 12 };
// TODO: Lyrics feature is parked until the external lyrics API is available again.
// var lyricsVisible = false;
var currentCanvasWidth = 1;
var currentCanvasHeight = 1;

/**
 * File browser instance
 * @type {FileBrowser}
 * @param {number} x - The x position of the file browser.
 * @param {number} y - The y position of the file browser.
 * @param {number} w - The width of the file browser.
 * @param {number} h - The height of the file browser.
 * @returns {void}
 * @description
 * Class that creates a file browser using the Subsonic API getIndexes() and getMusicDirectory()
 * and displays it in a scrollable list.
 *
 */
var FileBrowserObj;



/**
 * Player instance
 * @type {Player}
*/
var PlayerObj;



/**
 * Preloads assets before the sketch starts.
 * Loads a dummy audio file to enable isPaused() or isPlaying() functionality.
 *
 * @function
 * @global
 */
function preload()
{
//dummy audio so that isPaused() or isPlaying() are enabled
song = loadSound('assets/dot.mp3');
song.setVolume(0.5); //set default volume

}

// ---------------------------------------------------------------------------
// Subsonic Persistence And Authentication
// ---------------------------------------------------------------------------

/**
 * Returns the saved Subsonic credentials if the required auth fields exist.
 * This is stricter than getStoredAppState() because startup should only reuse
 * a config that can actually authenticate against the server.
 */
function getStoredSubsonicConfig() {
    const config = getStoredAppState();
    if (!config || !config.server || !config.user || !config.token || !config.salt) {
        return null;
    }

    return config;
}

/**
 * Reads the full application state object from localStorage.
 * Non-auth preferences such as theme, layout, and skinny mode live here too.
 */
function getStoredAppState() {
    try {
        const rawConfig = localStorage.getItem(SUBSONIC_CONFIG_KEY);
        if (!rawConfig) {
            return null;
        }

        return JSON.parse(rawConfig);
    } catch (error) {
        console.error("Unable to load saved Subsonic configuration:", error);
        return null;
    }
}

/**
 * Merges partial state into localStorage without dropping unrelated settings.
 * Use this for durable app preferences, not for transient runtime flags.
 */
function saveSubsonicConfig(config) {
    localStorage.setItem(SUBSONIC_CONFIG_KEY, JSON.stringify({
        ...(getStoredAppState() || {}),
        ...config
    }));
}

/**
 * Updates stored state only when a valid authenticated config already exists.
 * This prevents UI preferences from creating a partial login record.
 */
function updateStoredSubsonicConfig(updates) {
    const config = getStoredSubsonicConfig();
    if (!config) {
        return;
    }

    saveSubsonicConfig({
        ...config,
        ...updates
    });
}

/**
 * Clears login credentials and saved panel layout, then leaves visual
 * preferences such as theme intact for the next sign-in.
 */
function clearSubsonicAuth() {
    const config = getStoredAppState() || {};
    delete config.server;
    delete config.user;
    delete config.token;
    delete config.salt;
    // Logout should also reset the editable deck arrangement. Theme and other
    // non-layout preferences are kept so the app still feels familiar after
    // logging back in.
    delete config.layout;
    delete config.layoutOwners;
    localStorage.setItem(SUBSONIC_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Re-applies the active theme to DOM-based controls and slider accents.
 * Canvas components read UI directly while drawing, but DOM controls need
 * explicit style updates when the theme changes.
 */
function updateComponentThemeColors() {
    if (playListSelect) styleSelect(playListSelect);
    if (songSelect) styleSelect(songSelect);
    if (playerControl) playerControl.applyTheme();

    const sliderPairs = [
        [volSlider, "line"],
        [balanceSlider, "pink"],
        [rateSlider, "amber"],
        [bassSlider, "line"],
        [midSlider, "pink"],
        [trebleSlider, "amber"],
        [reverbSlider, "line"],
        [reverbVolSlider, "pink"]
    ];
    for (const [slider, accent] of sliderPairs) {
        if (slider) {
            slider.color1 = cssHex(UI.field);
            slider.color2 = cssHex(UI[accent]);
        }
    }
}

Theme.onChange(updateComponentThemeColors);

/**
 * Validates tokenized credentials with a Subsonic ping before building the
 * deck. Rejected credentials keep the user on the setup form.
 */
async function isSubsonicConfigAccepted(config) {
    if (!config || !config.server || !config.user || !config.token || !config.salt) {
        return false;
    }

    const client = new SubsonicClient(config.server, config.user, config.token, config.salt);
    const ping = await client.request("ping");
    return !!ping;
}

/**
 * Calculates the canvas size from the visible viewport.
 * The deck intentionally avoids page scroll so touch drags move deck elements
 * rather than the browser page.
 */
function getCanvasSize() {
    const pagePadding = 44;
    const shellBorder = 2;
    // TODO: Lyrics feature is parked until the external lyrics API is available again.
    // const layoutGap = lyricsVisible ? 24 : 0;
    // const lyricsWidth = lyricsVisible ? 500 : 0;
    const availableWidth = window.innerWidth - pagePadding - shellBorder;
    const availableHeight = window.innerHeight - pagePadding - shellBorder;

    return {
        width: Math.max(1, Math.floor(availableWidth)),
        height: Math.max(1, Math.floor(availableHeight))
    };
}

/**
 * Resizes the p5 canvas and its shell element to the current viewport.
 * The shell reserves space for its border and clips overflow on small screens.
 */
function resizeCanvasToAvailableSpace() {
    const size = getCanvasSize();
    currentCanvasWidth = size.width;
    currentCanvasHeight = size.height;

    if (typeof resizeCanvas === "function" && typeof width !== "undefined" && typeof height !== "undefined" && width && height) {
        resizeCanvas(currentCanvasWidth, currentCanvasHeight);
    }

    const canvasContainer = document.getElementById("cnv");
    if (canvasContainer) {
        // The shell has a 1px border on each side and uses border-box sizing.
        // Keep the canvas as the content size, then add border space to the shell.
        canvasContainer.style.width = (currentCanvasWidth + 2) + "px";
        canvasContainer.style.height = (currentCanvasHeight + 2) + "px";
        canvasContainer.style.overflow = "hidden";
    }

    // TODO: Lyrics feature is parked until the external lyrics API is available again.
    // const lyricsPanel = document.getElementById("otro");
    // if (lyricsPanel) {
    //     lyricsPanel.style.display = lyricsVisible ? "block" : "none";
    //     lyricsPanel.style.minHeight = currentCanvasHeight + "px";
    // }
}

// TODO: Lyrics feature is parked until the external lyrics API is available again.
// function applyLyricsVisibility() {
//     resizeCanvasToAvailableSpace();
//     if (lyricsVisibleSwitch) {
//         lyricsVisibleSwitch.setState(lyricsVisible);
//     }
// }

/**
 * Normalizes user-entered server addresses into a URL-like base string.
 * Missing protocols default to HTTPS so remote servers are not accidentally
 * contacted over plaintext.
 */
function normalizeSubsonicServer(server) {
    const trimmed = server.trim().replace(/\/+$/, '');
    if (!trimmed) {
        return "";
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return "https://" + trimmed;
}

/**
 * Creates a random salt string used by Subsonic token authentication.
 * The salt is stored with the derived token, not with the plaintext password.
 */
function createSalt(length) {
    const chars = "0123456789abcdef";
    const values = new Uint8Array(length);

    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(values);
    } else {
        for (let i = 0; i < values.length; i++) {
            values[i] = Math.floor(Math.random() * 256);
        }
    }

    let salt = "";
    for (let i = 0; i < values.length; i++) {
        salt += chars[values[i] % chars.length];
    }

    return salt;
}

/**
 * Renders the first-run/login form into the canvas container and handles
 * credential validation before initializing the full player.
 */
function showSubsonicConfigForm(message = "") {
    const host = document.getElementById("cnv") || document.body;
    const panel = document.createElement("div");
    const overlay = document.createElement("div");

    overlay.style.cssText = [
        "position: fixed",
        "inset: 0",
        "z-index: 1000",
        "display: flex",
        "align-items: flex-start",
        "justify-content: center",
        "padding-top: 48px",
        `background: ${rgbaString(UI.bg, 0.82)}`,
        "backdrop-filter: blur(4px)"
    ].join(";");

    panel.style.cssText = [
        "font-family: Inter, Arial, Helvetica, sans-serif",
        "max-width: 420px",
        "width: min(420px, calc(100vw - 32px))",
        "margin: 0 auto",
        "padding: 24px",
        "color: var(--text)",
        "background: linear-gradient(180deg, var(--panel), var(--bg))",
        "border: 1px solid var(--line)",
        "box-shadow: var(--shell-shadow)"
    ].join(";");

    panel.innerHTML = [
        "<h1 style='font-size: 20px; margin: 0 0 16px; color:var(--cyan);'>Subsonic setup</h1>",
        "<form id='subsonic-config-form'>",
        "<label style='display:block; margin-bottom: 12px;'>Server URL",
        "<input name='server' required placeholder='https://example.com:4040' style='box-sizing:border-box; display:block; width:100%; margin-top:4px; padding:8px; color:var(--text); background:var(--field); border:1px solid var(--line);'>",
        "</label>",
        "<label style='display:block; margin-bottom: 12px;'>Username",
        "<input name='user' required autocomplete='username' style='box-sizing:border-box; display:block; width:100%; margin-top:4px; padding:8px; color:var(--text); background:var(--field); border:1px solid var(--line);'>",
        "</label>",
        "<label style='display:block; margin-bottom: 16px;'>Password",
        "<input name='password' type='password' required autocomplete='current-password' style='box-sizing:border-box; display:block; width:100%; margin-top:4px; padding:8px; color:var(--text); background:var(--field); border:1px solid var(--line);'>",
        "</label>",
        "<button type='submit' style='padding:8px 14px; color:var(--bg); background:var(--cyan); border:0; font-weight:700;'>Save and start</button>",
        "<p id='subsonic-config-error' style='color:var(--pink); min-height:20px;'></p>",
        "</form>"
    ].join("");

    overlay.appendChild(panel);
    host.appendChild(overlay);

    const form = document.getElementById("subsonic-config-form");
    const error = document.getElementById("subsonic-config-error");
    error.textContent = message;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        const server = normalizeSubsonicServer(String(data.get("server") || ""));
        const user = String(data.get("user") || "").trim();
        const password = String(data.get("password") || "");
        const button = form.querySelector("button[type='submit']");

        if (!server || !user || !password) {
            error.textContent = "Server, username, and password are required.";
            return;
        }

        const salt = createSalt(8);
        const token = MD5(password + salt);
        const candidateConfig = {
            server: server,
            user: user,
            token: token,
            salt: salt
        };

        error.style.color = "var(--amber)";
        error.textContent = "Checking credentials...";
        if (button) {
            button.disabled = true;
            button.textContent = "Checking...";
        }

        const accepted = await isSubsonicConfigAccepted(candidateConfig);
        if (!accepted) {
            error.style.color = "var(--pink)";
            error.textContent = "Login rejected. Check the server, username, and password.";
            if (button) {
                button.disabled = false;
                button.textContent = "Save and start";
            }
            return;
        }

        saveSubsonicConfig(candidateConfig);

        window.location.reload();
    });
}

/**
 * Computes an MD5 digest for the Subsonic token authentication scheme.
 * Kept local because this app is a static browser-only bundle without a build
 * step or dependency loader.
 */
function MD5(input) {
    // Performs a circular left shift on a 32-bit word.
    function rotateLeft(value, shift) {
        return (value << shift) | (value >>> (32 - shift));
    }

    // Adds two 32-bit words using unsigned overflow semantics.
    function addUnsigned(left, right) {
        const left4 = left & 0x40000000;
        const right4 = right & 0x40000000;
        const left8 = left & 0x80000000;
        const right8 = right & 0x80000000;
        const result = (left & 0x3fffffff) + (right & 0x3fffffff);

        if (left4 & right4) {
            return result ^ 0x80000000 ^ left8 ^ right8;
        }

        if (left4 | right4) {
            if (result & 0x40000000) {
                return result ^ 0xc0000000 ^ left8 ^ right8;
            }
            return result ^ 0x40000000 ^ left8 ^ right8;
        }

        return result ^ left8 ^ right8;
    }

    // Boolean function for MD5 round 1.
    function f(x, y, z) { return (x & y) | ((~x) & z); }
    // Boolean function for MD5 round 2.
    function g(x, y, z) { return (x & z) | (y & (~z)); }
    // Boolean function for MD5 round 3.
    function h(x, y, z) { return x ^ y ^ z; }
    // Boolean function for MD5 round 4.
    function i(x, y, z) { return y ^ (x | (~z)); }

    // Transformation for MD5 round 1.
    function ff(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    // Transformation for MD5 round 2.
    function gg(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    // Transformation for MD5 round 3.
    function hh(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    // Transformation for MD5 round 4.
    function ii(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    // Converts the UTF-8 input string into MD5's padded 32-bit word array.
    function convertToWordArray(value) {
        const messageLength = value.length;
        const numberOfWordsTemp1 = messageLength + 8;
        const numberOfWordsTemp2 = (numberOfWordsTemp1 - (numberOfWordsTemp1 % 64)) / 64;
        const numberOfWords = (numberOfWordsTemp2 + 1) * 16;
        const wordArray = new Array(numberOfWords - 1);
        let bytePosition = 0;
        let byteCount = 0;

        while (byteCount < messageLength) {
            const wordCount = (byteCount - (byteCount % 4)) / 4;
            bytePosition = (byteCount % 4) * 8;
            wordArray[wordCount] = wordArray[wordCount] | (value.charCodeAt(byteCount) << bytePosition);
            byteCount++;
        }

        const wordCount = (byteCount - (byteCount % 4)) / 4;
        bytePosition = (byteCount % 4) * 8;
        wordArray[wordCount] = wordArray[wordCount] | (0x80 << bytePosition);
        wordArray[numberOfWords - 2] = messageLength << 3;
        wordArray[numberOfWords - 1] = messageLength >>> 29;

        return wordArray;
    }

    // Formats one 32-bit word as eight lowercase hexadecimal characters.
    function wordToHex(value) {
        let output = "";
        for (let count = 0; count <= 3; count++) {
            const byte = (value >>> (count * 8)) & 255;
            output += ("0" + byte.toString(16)).slice(-2);
        }
        return output;
    }

    const x = convertToWordArray(unescape(encodeURIComponent(input)));
    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    for (let k = 0; k < x.length; k += 16) {
        const aa = a;
        const bb = b;
        const cc = c;
        const dd = d;

        a = ff(a, b, c, d, x[k + 0], 7, 0xd76aa478);
        d = ff(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
        c = ff(c, d, a, b, x[k + 2], 17, 0x242070db);
        b = ff(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
        a = ff(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
        d = ff(d, a, b, c, x[k + 5], 12, 0x4787c62a);
        c = ff(c, d, a, b, x[k + 6], 17, 0xa8304613);
        b = ff(b, c, d, a, x[k + 7], 22, 0xfd469501);
        a = ff(a, b, c, d, x[k + 8], 7, 0x698098d8);
        d = ff(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
        c = ff(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
        b = ff(b, c, d, a, x[k + 11], 22, 0x895cd7be);
        a = ff(a, b, c, d, x[k + 12], 7, 0x6b901122);
        d = ff(d, a, b, c, x[k + 13], 12, 0xfd987193);
        c = ff(c, d, a, b, x[k + 14], 17, 0xa679438e);
        b = ff(b, c, d, a, x[k + 15], 22, 0x49b40821);

        a = gg(a, b, c, d, x[k + 1], 5, 0xf61e2562);
        d = gg(d, a, b, c, x[k + 6], 9, 0xc040b340);
        c = gg(c, d, a, b, x[k + 11], 14, 0x265e5a51);
        b = gg(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
        a = gg(a, b, c, d, x[k + 5], 5, 0xd62f105d);
        d = gg(d, a, b, c, x[k + 10], 9, 0x2441453);
        c = gg(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
        b = gg(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
        a = gg(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
        d = gg(d, a, b, c, x[k + 14], 9, 0xc33707d6);
        c = gg(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
        b = gg(b, c, d, a, x[k + 8], 20, 0x455a14ed);
        a = gg(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
        d = gg(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
        c = gg(c, d, a, b, x[k + 7], 14, 0x676f02d9);
        b = gg(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

        a = hh(a, b, c, d, x[k + 5], 4, 0xfffa3942);
        d = hh(d, a, b, c, x[k + 8], 11, 0x8771f681);
        c = hh(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
        b = hh(b, c, d, a, x[k + 14], 23, 0xfde5380c);
        a = hh(a, b, c, d, x[k + 1], 4, 0xa4beea44);
        d = hh(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
        c = hh(c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
        b = hh(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
        a = hh(a, b, c, d, x[k + 13], 4, 0x289b7ec6);
        d = hh(d, a, b, c, x[k + 0], 11, 0xeaa127fa);
        c = hh(c, d, a, b, x[k + 3], 16, 0xd4ef3085);
        b = hh(b, c, d, a, x[k + 6], 23, 0x4881d05);
        a = hh(a, b, c, d, x[k + 9], 4, 0xd9d4d039);
        d = hh(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
        c = hh(c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
        b = hh(b, c, d, a, x[k + 2], 23, 0xc4ac5665);

        a = ii(a, b, c, d, x[k + 0], 6, 0xf4292244);
        d = ii(d, a, b, c, x[k + 7], 10, 0x432aff97);
        c = ii(c, d, a, b, x[k + 14], 15, 0xab9423a7);
        b = ii(b, c, d, a, x[k + 5], 21, 0xfc93a039);
        a = ii(a, b, c, d, x[k + 12], 6, 0x655b59c3);
        d = ii(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
        c = ii(c, d, a, b, x[k + 10], 15, 0xffeff47d);
        b = ii(b, c, d, a, x[k + 1], 21, 0x85845dd1);
        a = ii(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
        d = ii(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
        c = ii(c, d, a, b, x[k + 6], 15, 0xa3014314);
        b = ii(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
        a = ii(a, b, c, d, x[k + 4], 6, 0xf7537e82);
        d = ii(d, a, b, c, x[k + 11], 10, 0xbd3af235);
        c = ii(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
        b = ii(b, c, d, a, x[k + 9], 21, 0xeb86d391);

        a = addUnsigned(a, aa);
        b = addUnsigned(b, bb);
        c = addUnsigned(c, cc);
        d = addUnsigned(d, dd);
    }

    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}



/**
 * p5 setup entry point. Applies the saved/default theme, validates stored
 * credentials, and either shows the login form or starts the player.
 */
function setup()
{
    setTheme((getStoredAppState() || {}).theme || DEFAULT_THEME_NAME);
    appReady = false;
    appStatusMessage = "Checking login...";
    noLoop();
    const subsonicConfig = getStoredSubsonicConfig();
    if (!subsonicConfig) {
        appStatusMessage = "Waiting for login...";
        showSubsonicConfigForm();
        return;
    }

    isSubsonicConfigAccepted(subsonicConfig).then((accepted) => {
        if (!accepted) {
            appStatusMessage = "Login required.";
            clearSubsonicAuth();
            showSubsonicConfigForm("Saved login was rejected. Please sign in again.");
            return;
        }

        // Initialization depends on async auth, so it runs outside p5's
        // synchronous setup and then re-enables the draw loop.
        try {
            initializePlayer(subsonicConfig);
            appReady = true;
            appStatusMessage = "";
            loop();
        } catch (error) {
            console.error("Player initialization failed:", error);
            appReady = false;
            appStatusMessage = "Player initialization failed. Check the browser console.";
            loop();
        }
    });
}

/**
 * Creates every deck object after credentials are accepted: Subsonic client,
 * canvas, DOM controls, canvas components, audio graph, and layout restoration.
 */
function initializePlayer(subsonicConfig) {
    setTheme(subsonicConfig.theme || DEFAULT_THEME_NAME);
    // TODO: Lyrics are disabled for now because the lyrics workflow is not working reliably.
    // Restore the saved preference when the lyrics system is repaired.
    // lyricsVisible = subsonicConfig.lyricsVisible === true && subsonicConfig.lyricsVisibleTouched === true;
    // lyricsVisible = false;
    resizeCanvasToAvailableSpace();

    SubsonicObj = new SubsonicClient(
        subsonicConfig.server,
        subsonicConfig.user,
        subsonicConfig.token,
        subsonicConfig.salt
    );

    frameRate(60);

    //Divs
    const canvasSize = getCanvasSize();
    currentCanvasWidth = canvasSize.width;
    currentCanvasHeight = canvasSize.height;
    cnv=createCanvas(currentCanvasWidth, currentCanvasHeight);
    //thediv = createDiv();
    cnv.parent("cnv");
    resizeCanvasToAvailableSpace();

    SongsListObj = new PlayList(553,308,250,200); //local playlist object
    PlayerObj = new Player(SubsonicObj, SongsListObj);
    song = PlayerObj.getSoundObject(); //get the song object from the player fot init purposes

    background(UI.bg[0], UI.bg[1], UI.bg[2]);

    telemetryLog = new TelemetryLog();
    telemetryPanel = new TelemetryPanel(telemetryLog);
    telemetryLog.emit("SYSTEM", "Session initialized");
    telemetryLog.emit("SYSTEM", `Theme profile :: ${currentThemeName.toUpperCase()}`);

    playerControl = new PlayerControl(PlayerObj, "cnv", {}, telemetryLog);
    userAppControl = new UserAppControl({
        onTheme: () => {
            toggleTheme();
            telemetryLog.emit("SYSTEM", `Theme profile :: ${currentThemeName.toUpperCase()}`);
        },
        onFullscreenChanged: () => {
            resizeCanvasToAvailableSpace();
            telemetryLog.emit("SYSTEM", "Viewport resized");
        },
        onLogout: () => {
            telemetryLog.emit("SYSTEM", "Logout requested");
            clearSubsonicAuth();
            window.location.reload();
        }
    });
    userAppControl.attachFullscreenResizeListener();

    //Playlist select
    playListSelect = createSelect();
    playListSelect.parent("cnv");
    playListSelect.size(playlistSelectPosition.w,playlistSelectPosition.h)
    playListSelect.position(playlistSelectPosition.x,playlistSelectPosition.y);
    playListSelect.option("Select",0);
    playListSelect.id('playListSelect');
    playListSelect.changed(playListElementSelected);
    styleSelect(playListSelect);



    //Song select
    songSelect = createSelect();
    songSelect.parent("cnv");
    songSelect.position(songSelectPosition.x,songSelectPosition.y);
    songSelect.size(songSelectPosition.w,songSelectPosition.h);
    songSelect.id('playListSongSelect');
    songSelect.option("Select",0);
    styleSelect(songSelect);
    //Will select a song from SubsonicObj
    songSelect.changed(()=>{
                                    var id = songSelect.value();
                                    if(id == -1 || id == 0){
                                        return;
                                    }
                                    PlayerObj.playSongById(id); //Load and play song, and make sure to play next song on end

                            });





    //Visualization components
    spectrum = new Spectrum(32,554,600,313);
    waveform = new WaveForm(258,554,600,313);
    vuMeters = new VUMeters(643,554,92,101);
    vectorScope = new VectorScope(481,554,124,97);
    progressBar=new ProgressBarH(145,225,476,38);



    //fill playlist
    getPlaylists();

    //create Playing info
    playingInfo = new PlayingInfo(280,61,SubsonicObj);
    PlayerObj.setOnSongLoaded(handleSongLoaded);


        // Create filters for each band
    audioEffects = new AudioEffects();

    FileBrowserObj = new FileBrowser(267, 304, 250, 200, SongsListObj, SubsonicObj,PlayerObj); //file browser instance


    filtersOnOffSwitch = new Switch(1129, 313, 20, 50, "Filters"); //switch for filters on/off
    loopOnOffSwitch = new Switch(231, 94, 20, 50, "Loop\nPlaylist"); //switch for loop on/off
    randomPlaySwitch = new Switch(187, 94, 20, 50, "Random\nPlay"); //switch for random play mode
    // ##SKINNY MODE
    // Low-power path for constrained devices. ON hides and disconnects
    // analyser-backed panels; OFF restores the full deck.
    skinnyModeSwitch = new Switch(141, 92, 20, 50, "Skinny"); //switch for low-power mode
    movePanelsSwitch = new Switch(32, 57, 20, 50, "Move\nPanels"); //switch for moving/resizing panels
    moveElementsSwitch = new Switch(81, 57, 20, 50, "Move\nElements"); //switch for moving individual controls
    // TODO: Keep this switch instance for future lyrics repair, but do not draw or handle it for now.
    // lyricsVisibleSwitch = new Switch(946, 50, 20, 50, "Show\nLyrics"); //switch for showing the lyrics column
    filtersOnOffSwitch.setState(filtersON);
    loopOnOffSwitch.setState(true);
    randomPlaySwitch.setState(!!subsonicConfig.randomPlay);
    SongsListObj.setRandomPlay(randomPlaySwitch.getState());
    // ##SKINNY MODE
    // Prefer the new skinnyMode flag. Fall back to the old visualizersEnabled
    // flag so existing browser storage maps Visuals OFF to Skinny ON.
    skinnyModeSwitch.setState(getInitialSkinnyMode(subsonicConfig));
    applySkinnyMode(skinnyModeSwitch.getState());
    movePanelsSwitch.setState(false);
    moveElementsSwitch.setState(false);
    // lyricsVisibleSwitch.setState(lyricsVisible);


    volSlider = new SliderV(672, 55, 40, 185, "Volume", 0, 1, 0.8, cssHex(UI.field), cssHex(UI.line), { wheelSteps: 100, wheelSensitivity: 2 }); //vertical slider for volume
    balanceSlider = new SliderH(1126, 393, 95, 10, "Balance", -1, 1, 0, cssHex(UI.field), cssHex(UI.pink), { wheelSteps: 100, wheelSensitivity: 2 }); //horizontal slider for balance
    rateSlider = new SliderH(1126, 440, 95, 10, "Speed", 0.01, 2, 1, cssHex(UI.field), cssHex(UI.amber), { wheelSteps: 100, wheelSensitivity: 2 }); //horizontal slider for playback speed
    bassSlider = new SliderV(842, 310, 30, 145, "Bass", 0, 5, 2.5, cssHex(UI.field), cssHex(UI.line), { wheelSteps: 100, wheelSensitivity: 2 }); //vertical slider for bass gain
    midSlider = new SliderV(894, 310, 30, 145, "Mid", 0, 5, 1.5, cssHex(UI.field), cssHex(UI.pink), { wheelSteps: 100, wheelSensitivity: 2 }); //vertical slider for mid gain
    trebleSlider = new SliderV(951, 310, 30, 145, "Treble", 0, 5, 1.5, cssHex(UI.field), cssHex(UI.amber), { wheelSteps: 100, wheelSensitivity: 2 }); //vertical slider for treble gain
    reverbSlider = new SliderV(1016, 310, 30, 145, "Reverb", 0, 1, 0.01, cssHex(UI.field), cssHex(UI.line), { wheelSteps: 100, wheelSensitivity: 2 }); //vertical slider for reverb mix
    reverbVolSlider = new SliderV(1068, 310, 30, 145, "Rev Vol", 0, 10, 0, cssHex(UI.field), cssHex(UI.pink), { wheelSteps: 100, wheelSensitivity: 2 }); //vertical slider for reverb volume
    updateComponentThemeColors();

    layoutManager = new LayoutManager(LayoutManager.getDefaultPanels(), {
        getMovableLayoutItems: getMovableLayoutItems,
        getPanelBoundLayoutItems: getPanelBoundLayoutItems,
        getPanelBoundComponent: getPanelBoundComponent,
        isMovePanelsEnabled: isMovePanelsEnabled,
        isMoveElementsEnabled: isMoveElementsEnabled,
        onPanelChanged: syncPanelBoundComponent
    });
    applySavedLayout(subsonicConfig.layout);
    layoutManager.initializeOwners(subsonicConfig.layoutOwners);
    syncPanelBoundComponents();
    updateDomPointerMode();

    configureAudioRouting(true); //setup initial audio route
    telemetryLog.emit("SYSTEM", "Subsonic node online");

}

/**
 * Applies the active theme to a p5-created select element.
 * DOM controls do not redraw from UI automatically, so they need explicit CSS.
 */
function styleSelect(selectElement) {
    selectElement.style("height", "26px");
    selectElement.style("font-size", "12px");
    selectElement.style("font-weight", "600");
    selectElement.style("color", cssHex(UI.text));
    selectElement.style("background", cssHex(UI.field));
    selectElement.style("border", `1px solid ${rgbaString(UI.line, 0.48)}`);
    selectElement.style("box-shadow", `0 0 16px ${rgbaString(UI.line, 0.08)}`);
}

/**
 * Main p5 draw loop. It refreshes the canvas, polls the player for a newly
 * loaded sound object, applies current audio controls, draws the deck, and lets
 * Player advance to the next track when needed.
 */
function draw(){
    if (!appReady) {
        drawStartupScreen();
        return;
    }

    //screen refresh
    background(UI.bg[0], UI.bg[1], UI.bg[2]);
    drawAppShell();

    //Get the song object from the player only if NOT requested yet
    //i.e., avoid reassigning the sound object every frame, assign it only once after loading or playing a new song
    if(!PlayerObj.isRequested){
        const nextSong = PlayerObj.getSoundObject();
        song = nextSong;
        // When a new song loads, connect that new p5.SoundFile to the
        // filter/reverb bus. A null value means the previous song was detached
        // and routing should release old Web Audio references while loading.
        // Memory optimization: this avoids retaining the old decoded buffer
        // while the next network stream is still being fetched/decoded.
        configureAudioRouting(true);
    }
    configureAudioRouting();
    printLabels();

    //Updates the progress bar slider for duration
    var progress;
    try{

        progress = PlayerObj.getProgress();
    }catch{
        progress=0;
    }

    //Update progressbar only if not manually changed (interference with mouse click and drag)
    if(!progressBar.isChanged()){
        progressBar.setValue(progress);
    }


    progressBar.draw();


    // ##SKINNY MODE
    // Skip visualizer draw calls entirely. Each visualizer still has its own
    // inactive guard, but this branch makes the low-power policy visible in the
    // main loop and avoids function calls before any analyzer reads happen.
    if (!isSkinnyModeEnabled()) {
        spectrum.draw();
        waveform.draw();
        vuMeters.draw(song);
        vectorScope.draw();
    }
    sampleTelemetry();

    //Info box
    if (PlayerObj && PlayerObj.isLoading) {
    playingInfo.drawBusy();
    }   
    playingInfo.draw();


    //img buttons
    imgButtons();

    audioEffects.applyControls(getAudioControlValues());

    //Draw file browser
    FileBrowserObj.draw();

    SongsListObj.draw();

    telemetryPanel.draw();

    //Draw switch for filters on/off
    filtersOnOffSwitch.draw();

    //Draw switch for loop on/off
    loopOnOffSwitch.draw();

    //Draw switch for random play mode
    randomPlaySwitch.draw();

    //Draw switch for low-power skinny mode
    skinnyModeSwitch.draw();

    //Draw switches for layout editing
    movePanelsSwitch.draw();
    moveElementsSwitch.draw();

    // TODO: Lyrics are disabled for now because the lyrics workflow is not working reliably.
    // Re-enable this switch when the lyrics system is repaired.
    // lyricsVisibleSwitch.draw();

    userAppControl.draw();


    PlayerObj.draw(); //controls the playNext() if keepPlaying is true


    //Draw volume slider
    volSlider.draw();

    //draw balance slider
    balanceSlider.draw();

    //draw speed and effects sliders
    rateSlider.draw();
    bassSlider.draw();
    midSlider.draw();
    trebleSlider.draw();
    reverbSlider.draw();
    reverbVolSlider.draw();

    drawLayoutEditorOverlay();

}

/**
 * Draws the minimal status screen used during login, validation, and startup
 * errors before the full deck is available.
 */
function drawStartupScreen() {
    background(UI.bg[0], UI.bg[1], UI.bg[2]);

    push();
    fill(UI.text[0], UI.text[1], UI.text[2]);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(appStatusMessage || "Loading...", width / 2, height / 2);
    pop();
}

/**
 * Draws layout editing overlays such as panel outlines and item handles.
 */
function drawLayoutEditorOverlay() {
    layoutManager.drawOverlay();
}

/**
 * Enables or disables pointer events for DOM controls while moving elements.
 * This lets the canvas receive drag gestures instead of native control events.
 */
function updateDomPointerMode() {
    const pointerMode = isMoveElementsEnabled() ? "none" : "auto";
    if (pointerMode === lastDomPointerMode) {
        return;
    }

    lastDomPointerMode = pointerMode;
    playerControl.setPointerMode(pointerMode);
    playListSelect.style("pointer-events", pointerMode);
    songSelect.style("pointer-events", pointerMode);
}

/**
 * Draws the deck shell: grid background, visible panels, title, and theme label.
 */
function drawAppShell(){
    push();
    noStroke();

    for (let y = 0; y < height; y += 32) {
        fill(UI.text[0], UI.text[1], UI.text[2], UI.gridAlpha);
        rect(0, y, width, 1);
    }
    for (let x = 0; x < width; x += 32) {
        fill(UI.text[0], UI.text[1], UI.text[2], Math.max(3, UI.gridAlpha - 4));
        rect(x, 0, 1, height);
    }

    for (const panel of layoutManager.getDrawablePanels()) {
        drawPanel(panel);
    }

    fill(UI.text[0], UI.text[1], UI.text[2]);
    textSize(18);
    textAlign(LEFT, TOP);
    text("SUBSONIC NEON DECK", 24, 4);
    fill(UI.muted[0], UI.muted[1], UI.muted[2]);
    textSize(10);
    text(`${currentThemeName.toUpperCase()} AUDIO CONSOLE`, 240, 10);
    pop();
}

/**
 * Draws one panel rectangle, its header, and its resize affordance when active.
 */
function drawPanel(panel){
    const accent = UI[panel.accent] || UI.line;
    const panelFrame = UI.panelFrame || accent;
    push();
    stroke(panelFrame[0], panelFrame[1], panelFrame[2], 110);
    strokeWeight(1);
    fill(UI.panel[0], UI.panel[1], UI.panel[2], 226);
    rect(panel.x, panel.y, panel.w, panel.h, 6);

    noStroke();
    fill(panelFrame[0], panelFrame[1], panelFrame[2], 32);
    rect(panel.x + 1, panel.y + 1, panel.w - 2, 20, 5);

    fill(panelFrame[0], panelFrame[1], panelFrame[2], 230);
    textSize(10);
    textAlign(LEFT, CENTER);
    text(panel.label, panel.x + 10, panel.y + 11);
    if (isMovePanelsEnabled()) {
        fill(UI.muted[0], UI.muted[1], UI.muted[2], 180);
        textAlign(RIGHT, CENTER);
        text(`${Math.round(panel.x)},${Math.round(panel.y)}`, panel.x + panel.w - 8, panel.y + 11);
    }
    if (isMovePanelsEnabled() && isResizablePanel(panel)) {
        stroke(panelFrame[0], panelFrame[1], panelFrame[2], 210);
        strokeWeight(2);
        line(panel.x + panel.w - 16, panel.y + panel.h - 4, panel.x + panel.w - 4, panel.y + panel.h - 16);
        line(panel.x + panel.w - 10, panel.y + panel.h - 4, panel.x + panel.w - 4, panel.y + panel.h - 10);
    }
    pop();
}

// ---------------------------------------------------------------------------
// Layout Editor
// ---------------------------------------------------------------------------
// The editor separates two intentions:
// - Move Panels: moves/resizes containers and drags their current children.
// - Move Elements: lets loose controls move between containers.
// Panel-bound components are not moved directly; their own modules fit them
// with fitToPanel(panel).

/**
 * Reports whether a panel currently exposes a resize handle.
 */
function isResizablePanel(panel) {
    return layoutManager && layoutManager.isResizablePanel(panel);
}

/**
 * Tests whether a point is inside a panel resize handle.
 */
function isPointInPanelResizeHandle(mx, my, panel) {
    return layoutManager && layoutManager.isPointInResizeHandle(mx, my, panel);
}

/**
 * Starts panel resize handling when the pointer is on a resize handle.
 */
function handlePanelResizeMousePressed(mx, my) {
    return layoutManager && layoutManager.handleResizeMousePressed(mx, my);
}

/**
 * Applies an active panel resize drag and refits the panel-bound component.
 */
function handlePanelResizeMouseDragged(mx, my) {
    return layoutManager && layoutManager.handleResizeMouseDragged(mx, my);
}

/**
 * Returns the minimum resize size for a panel, delegated to its component.
 */
function getResizablePanelMinSize(panel) {
    return layoutManager ? layoutManager.getResizablePanelMinSize(panel) : { w: 220, h: 120 };
}

/**
 * Finishes an active panel resize operation and logs the resulting layout.
 */
function handlePanelResizeMouseReleased() {
    return layoutManager && layoutManager.handleResizeMouseReleased();
}

/**
 * Refits a panel-bound visual component after its panel changes.
 */
function resizeVisualizerToPanel(panel) {
    syncPanelBoundComponent(panel);
}

/**
 * Refits every panel-bound component to its current panel rectangle.
 */
function syncPanelBoundComponents() {
    for (const panel of layoutManager.getPanels()) {
        syncPanelBoundComponent(panel);
    }
}

/**
 * Refits the component bound to one panel, if that component supports fitting.
 */
function syncPanelBoundComponent(panel) {
    if (!panel) {
        return;
    }

    const component = getPanelBoundComponent(panel);
    if (component && typeof component.fitToPanel === "function") {
        component.fitToPanel(panel);
    }
}

/**
 * Resolves the initial Skinny mode state from current and legacy config keys.
 */
function getInitialSkinnyMode(config = {}) {
    // ##SKINNY MODE
    // Centralizes startup compatibility so the rest of the app only thinks in
    // terms of skinnyMode: true means low-power visualizers are inactive.
    if (typeof config.skinnyMode === "boolean") {
        return config.skinnyMode;
    }

    // Legacy compatibility: the old Visuals switch stored false when plots were
    // hidden. That is equivalent to Skinny ON in the new wording.
    if (typeof config.visualizersEnabled === "boolean") {
        return !config.visualizersEnabled;
    }

    return false;
}

/**
 * Returns whether low-power Skinny mode is currently active.
 */
function isSkinnyModeEnabled() {
    // ##SKINNY MODE
    // Keep read access behind a helper so future low-power checks do not need
    // to know which UI control stores the mode.
    return !!(skinnyModeSwitch && skinnyModeSwitch.getState());
}

/**
 * Broadcasts Skinny mode state to visualizers that own analyzer resources.
 */
function applySkinnyMode(enabled) {
    // ##SKINNY MODE
    // Sketch only broadcasts the low-power mode. Each visualizer decides how to
    // become inactive: FFT plots disconnect their analyzers, VU meters remove
    // their worklet input, and VectorScope disconnects its analyser nodes.
    const visualizers = [spectrum, waveform, vuMeters, vectorScope];
    for (const visualizer of visualizers) {
        if (visualizer && typeof visualizer.setInactive === "function") {
            visualizer.setInactive(enabled);
        }
    }
}

/**
 * Returns the component whose geometry is controlled by a given panel.
 */
function getPanelBoundComponent(panel) {
    if (!panel) {
        return null;
    }

    const components = {
        spectrum: spectrum,
        waveform: waveform,
        vuMeters: vuMeters,
        phase: vectorScope,
        position: progressBar,
        dataFeed: telemetryPanel
    };

    return components[panel.key] || null;
}

/**
 * Builds layout hitboxes for panel-bound components such as visualizers and
 * the progress bar.
 */
function getPanelBoundLayoutItems() {
    const items = [];
    const panels = layoutManager.getPanels();
    const spectrumPanel = panels.find((panel) => panel.key === "spectrum");
    const waveformPanel = panels.find((panel) => panel.key === "waveform");
    const vuMetersPanel = panels.find((panel) => panel.key === "vuMeters");
    const phasePanel = panels.find((panel) => panel.key === "phase");
    const positionPanel = panels.find((panel) => panel.key === "position");
    const dataFeedPanel = panels.find((panel) => panel.key === "dataFeed");

    if (spectrumPanel && spectrum) {
        items.push({ key: "spectrum", x: spectrum.x, y: spectrum.y, w: spectrum.width * spectrum.zoomfactor, h: spectrum.height * spectrum.zoomfactor });
    }
    if (waveformPanel && waveform) {
        items.push({ key: "waveform", x: waveform.x, y: waveform.y, w: waveform.width * waveform.zoomfactor, h: waveform.height * waveform.zoomfactor });
    }
    if (vuMetersPanel && vuMeters) {
        items.push({ key: "vuMeters", x: vuMeters.x, y: vuMeters.y, w: vuMeters.width * vuMeters.zoomfactor, h: vuMeters.height * vuMeters.zoomfactor });
    }
    if (phasePanel && vectorScope) {
        items.push({ key: "phase", x: vectorScope.x, y: vectorScope.y, w: vectorScope.width * vectorScope.zoomfactor, h: vectorScope.height * vectorScope.zoomfactor });
    }
    if (positionPanel && progressBar) {
        items.push({ key: "progressBar", ...progressBar.getLayoutBounds() });
    }
    if (dataFeedPanel && telemetryPanel) {
        items.push({ key: "dataFeed", x: telemetryPanel.x, y: telemetryPanel.y, w: telemetryPanel.w, h: telemetryPanel.h });
    }

    return items;
}

/**
 * Returns a human-readable layout editor status string.
 */
function getLayoutEditorStatusText() {
    return layoutManager.getStatusText();
}

/**
 * Moves a panel through LayoutManager so panel-bound components are notified.
 */
function movePanelTo(panel, x, y) {
    layoutManager.movePanelTo(panel, x, y);
}

/**
 * Returns only panel rectangles for console inspection or debugging.
 */
function getPanelLayout() {
    return layoutManager.getPanelLayout();
}

/**
 * Logs panel rectangles as JSON for copying into default layout data.
 */
function logPanelLayout() {
    layoutManager.logPanelLayout();
}

/**
 * Reports whether any layout editing mode is currently active.
 */
function isLayoutEditMode() {
    return layoutManager && layoutManager.isLayoutEditMode();
}

/**
 * Reports whether panel movement/resizing is enabled.
 */
function isMovePanelsEnabled() {
    return panelLayoutEditMode || (movePanelsSwitch && movePanelsSwitch.getState());
}

/**
 * Reports whether individual element movement is enabled.
 */
function isMoveElementsEnabled() {
    return moveElementsSwitch && moveElementsSwitch.getState();
}

/**
 * Programmatically toggles panel movement mode and persists layout on lock.
 */
function setPanelLayoutEditMode(enabled) {
    panelLayoutEditMode = !!enabled;
    if (movePanelsSwitch) {
        movePanelsSwitch.setState(panelLayoutEditMode);
    }
    updateDomPointerMode();
    if (!panelLayoutEditMode) {
        saveLayoutState();
    }
    console.log(`Panel move mode ${panelLayoutEditMode ? "enabled" : "disabled"}.`);
    if (telemetryLog) {
        telemetryLog.emit("SYSTEM", `Move panels :: ${panelLayoutEditMode ? "enabled" : "disabled"}`);
    }
}

window.getPanelLayout = getPanelLayout;
window.logPanelLayout = logPanelLayout;
window.setPanelLayoutEditMode = setPanelLayoutEditMode;

/**
 * Creates a generic movable layout item adapter through LayoutManager.
 */
function createMovableItem(key, bounds, moveTo, data = null) {
    return layoutManager.createMovableItem(key, bounds, moveTo, data);
}

/**
 * Creates a movable adapter for components that provide layout bounds.
 */
function createMovableComponentItem(key, component) {
    const bounds = component.getLayoutBounds();
    return createMovableItem(key, bounds, (x, y) => component.moveTo(x, y));
}

/**
 * Builds the full list of movable non-panel controls for layout editing.
 */
function getMovableLayoutItems() {
    const items = [];

    items.push(createMovableComponentItem("playingInfo", playingInfo));
    items.push(createMovableItem("playlistSelect", playlistSelectPosition, (x, y) => {
        playlistSelectPosition.x = x;
        playlistSelectPosition.y = y;
        playListSelect.position(x, y);
    }));
    items.push(createMovableItem("playlistLabel", playlistLabelPosition, (x, y) => {
        playlistLabelPosition.x = x;
        playlistLabelPosition.y = y;
    }));
    items.push(createMovableItem("songSelect", songSelectPosition, (x, y) => {
        songSelectPosition.x = x;
        songSelectPosition.y = y;
        songSelect.position(x, y);
    }));
    items.push(createMovableItem("songLabel", songLabelPosition, (x, y) => {
        songLabelPosition.x = x;
        songLabelPosition.y = y;
    }));
    items.push(createMovableComponentItem("fileBrowser", FileBrowserObj));
    items.push(createMovableComponentItem("queue", SongsListObj));
    items.push(createMovableComponentItem("filtersSwitch", filtersOnOffSwitch));
    items.push(createMovableComponentItem("loopSwitch", loopOnOffSwitch));
    items.push(createMovableComponentItem("randomPlaySwitch", randomPlaySwitch));
    items.push(createMovableComponentItem("skinnyModeSwitch", skinnyModeSwitch)); // ##SKINNY MODE
    // TODO: Lyrics are disabled for now because the lyrics workflow is not working reliably.
    // Re-enable this movable item when the lyrics switch is drawn again.
    // items.push(createMovableComponentItem("lyricsSwitch", lyricsVisibleSwitch));
    items.push(createMovableComponentItem("movePanelsSwitch", movePanelsSwitch));
    items.push(createMovableComponentItem("moveElementsSwitch", moveElementsSwitch));
    items.push(createMovableComponentItem("volumeSlider", volSlider));

    const sliderItems = [
        ["balanceSlider", balanceSlider],
        ["rateSlider", rateSlider],
        ["bassSlider", bassSlider],
        ["midSlider", midSlider],
        ["trebleSlider", trebleSlider],
        ["reverbSlider", reverbSlider],
        ["reverbVolSlider", reverbVolSlider]
    ];

    for (const [key, slider] of sliderItems) {
        items.push(createMovableComponentItem(key, slider));
    }

    for (const button of playerControl.getLayoutItems()) {
        items.push(createMovableItem(button.key, button, (x, y, item) => {
            playerControl.moveButtonTo(item.key, x, y);
        }));
    }
    for (const button of userAppControl.getLayoutItems()) {
        items.push(createMovableItem(button.key, button, (x, y, item) => {
            userAppControl.moveButtonTo(item.key, x, y);
        }));
    }

    return items;
}

/**
 * Returns movable panel adapters for layout editing.
 */
function getMovablePanelItems() {
    return layoutManager.getMovablePanelItems();
}

/**
 * Delegates layout item mouse press handling to LayoutManager.
 */
function handleLayoutItemMousePressed(mx, my) {
    return layoutManager.handleItemMousePressed(mx, my);
}

/**
 * Finds the panel header under a point, if one should take drag priority.
 */
function findPanelHeaderLayoutItem(mx, my, items) {
    return layoutManager.findPanelHeaderLayoutItem(mx, my, items);
}

/**
 * Starts a layout drag operation for a selected movable item.
 */
function startLayoutDrag(item, mx, my) {
    layoutManager.startDrag(item, mx, my);
}

/**
 * Returns child items that should move along with a dragged panel.
 */
function getLayoutDragChildren(item) {
    return layoutManager.getDragChildren(item);
}

/**
 * Restores or initializes explicit element-to-panel ownership.
 */
function initializeLayoutItemPanelOwners(savedOwners = null) {
    layoutManager.initializeOwners(savedOwners);
}

/**
 * Returns the panel key containing a layout item center point.
 */
function getContainingPanelKey(item) {
    return layoutManager.getContainingPanelKey(item);
}

/**
 * Updates the owner panel for one movable layout item.
 */
function updateLayoutItemPanelOwner(item) {
    layoutManager.updateItemPanelOwner(item);
}

/**
 * Tests whether a layout item belongs inside a panel rectangle.
 */
function isLayoutItemInsidePanel(item, panelItem) {
    return layoutManager.isLayoutItemInsidePanel(item, panelItem);
}

/**
 * Delegates active layout drag motion to LayoutManager.
 */
function handleLayoutItemMouseDragged(mx, my) {
    return layoutManager.handleItemMouseDragged(mx, my);
}

/**
 * Completes active layout dragging and persists ownership side effects.
 */
function handleLayoutItemMouseReleased() {
    return layoutManager.handleItemMouseReleased();
}

/**
 * Returns the complete serializable layout: panels plus movable controls.
 */
function getFullLayout() {
    return layoutManager.getFullLayout();
}

/**
 * Logs the full layout JSON for copying into defaults or debugging.
 */
function logFullLayout() {
    layoutManager.logFullLayout();
}

/**
 * Persists the current layout and element ownership into browser storage.
 */
function saveLayoutState() {
    updateStoredSubsonicConfig({
        // TODO: Lyrics feature is parked until the external lyrics API is available again.
        // lyricsVisible: lyricsVisible,
        layout: getFullLayout(),
        layoutOwners: layoutManager.itemPanelOwners
    });
}

/**
 * Applies saved panel and control coordinates from browser storage.
 * Missing legacy/new controls are repositioned into their owning panels.
 */
function applySavedLayout(layout) {
    if (!Array.isArray(layout)) {
        return;
    }

    let hasThemeButton = false;
    let hasFullscreenButton = false;
    let hasLogoutButton = false;
    let hasMovePanelsSwitch = false;
    let hasMoveElementsSwitch = false;
    let hasPrevButton = false;
    let hasNextButton = false;
    for (const item of layout) {
        if (!item || typeof item.x !== "number" || typeof item.y !== "number") {
            continue;
        }

        if (item.key === "themeButton") {
            hasThemeButton = true;
        }
        if (item.key === "fullscreenButton") {
            hasFullscreenButton = true;
        }
        if (item.key === "logoutButton") {
            hasLogoutButton = true;
        }
        if (item.key === "movePanelsSwitch") {
            hasMovePanelsSwitch = true;
        }
        if (item.key === "moveElementsSwitch" || item.key === "layoutLockSwitch") {
            hasMoveElementsSwitch = true;
        }
        if (item.key === "prevButton") {
            hasPrevButton = true;
        }
        if (item.key === "nextButton") {
            hasNextButton = true;
        }
        applyLayoutItem(item);
    }

    positionLayoutEditSwitchesInPanel({
        panels: !hasMovePanelsSwitch,
        elements: !hasMoveElementsSwitch
    });

    if (!hasThemeButton || !hasFullscreenButton || !hasLogoutButton) {
        positionUserControlButtonsInPanel({
            theme: !hasThemeButton,
            fullscreen: !hasFullscreenButton,
            logout: !hasLogoutButton || !hasFullscreenButton || !hasThemeButton
        });
    }
    if (!hasPrevButton || !hasNextButton) {
        positionTransportButtonsInPanel();
    }
}

/**
 * Positions layout editing switches inside USER CONTROL when no saved position
 * exists for them.
 */
function positionLayoutEditSwitchesInPanel(options = { panels: true, elements: true }) {
    const panel = layoutManager.getPanels().find((candidate) => candidate.key === "layoutTools");
    if (!panel) {
        return;
    }

    if (options.panels) {
        movePanelsSwitch.x = panel.x + 16;
        movePanelsSwitch.y = panel.y + 30;
    }
    if (options.elements) {
        moveElementsSwitch.x = panel.x + 52;
        moveElementsSwitch.y = panel.y + 30;
    }
}

/**
 * Positions transport image buttons inside TRANSPORT when saved positions are
 * absent or predate the expanded transport button set.
 */
function positionTransportButtonsInPanel() {
    const panel = layoutManager.getPanels().find((candidate) => candidate.key === "transport");
    if (!panel || !playerControl) {
        return;
    }

    playerControl.fitToPanel(panel);
}

/**
 * Applies one saved layout item to the matching live panel or component.
 */
function applyLayoutItem(item) {
    const key = item.key;

    if (key && key.indexOf("panel:") === 0) {
        const panelKey = key.slice("panel:".length);
        const panel = layoutManager.getPanels().find((candidate) => candidate.key === panelKey);
        if (panel) {
            panel.x = item.x;
            panel.y = item.y;
            if (typeof item.w === "number") panel.w = item.w;
            if (typeof item.h === "number") panel.h = item.h;
            if (panel.key === "layoutTools") {
                panel.w = Math.max(panel.w, 104);
                panel.h = Math.max(panel.h, 210);
            }
            if (panel.key === "transport") {
                panel.w = Math.max(panel.w, 145);
            }
            if (panel.key === "dataFeed") {
                panel.w = Math.max(panel.w, 260);
                panel.h = Math.max(panel.h, 110);
            }
            resizeVisualizerToPanel(panel);
        }
        return;
    }

    const itemHandlers = {
        playingInfo: () => { playingInfo.moveTo(item.x, item.y); },
        playlistSelect: () => {
            playlistSelectPosition.x = item.x;
            playlistSelectPosition.y = item.y;
            playListSelect.position(item.x, item.y);
        },
        playlistLabel: () => {
            playlistLabelPosition.x = item.x;
            playlistLabelPosition.y = item.y;
        },
        songSelect: () => {
            songSelectPosition.x = item.x;
            songSelectPosition.y = item.y;
            songSelect.position(item.x, item.y);
        },
        songLabel: () => {
            songLabelPosition.x = item.x;
            songLabelPosition.y = item.y;
        },
        spectrum: () => {},
        waveform: () => {},
        vuMeters: () => {},
        phase: () => {},
        dataFeed: () => {},
        progressBar: () => { progressBar.moveTo(item.x, item.y); },
        fileBrowser: () => { FileBrowserObj.moveTo(item.x, item.y); },
        queue: () => { SongsListObj.moveTo(item.x, item.y); },
        filtersSwitch: () => { filtersOnOffSwitch.moveTo(item.x, item.y); },
        loopSwitch: () => { loopOnOffSwitch.moveTo(item.x, item.y); },
        randomPlaySwitch: () => { randomPlaySwitch.moveTo(item.x, item.y); },
        skinnyModeSwitch: () => { skinnyModeSwitch.moveTo(item.x, item.y); },
        // ##SKINNY MODE
        // Legacy layouts may still contain the old Visuals switch key. Route it
        // to the new Skinny switch so saved browser layouts keep working.
        visualizersSwitch: () => { skinnyModeSwitch.moveTo(item.x, item.y); },
        // TODO: Lyrics feature is parked until the external lyrics API is available again.
        // lyricsSwitch: () => { lyricsVisibleSwitch.moveTo(item.x, item.y); },
        layoutLockSwitch: () => { moveElementsSwitch.moveTo(item.x, item.y); },
        movePanelsSwitch: () => { movePanelsSwitch.moveTo(item.x, item.y); },
        moveElementsSwitch: () => { moveElementsSwitch.moveTo(item.x, item.y); },
        volumeSlider: () => { volSlider.moveTo(item.x, item.y); },
        balanceSlider: () => { balanceSlider.moveTo(item.x, item.y); },
        rateSlider: () => { rateSlider.moveTo(item.x, item.y); },
        bassSlider: () => { bassSlider.moveTo(item.x, item.y); },
        midSlider: () => { midSlider.moveTo(item.x, item.y); },
        trebleSlider: () => { trebleSlider.moveTo(item.x, item.y); },
        reverbSlider: () => { reverbSlider.moveTo(item.x, item.y); },
        reverbVolSlider: () => { reverbVolSlider.moveTo(item.x, item.y); },
        prevButton: () => { playerControl.moveButtonTo(key, item.x, item.y); },
        playButton: () => { playerControl.moveButtonTo(key, item.x, item.y); },
        pauseButton: () => { playerControl.moveButtonTo(key, item.x, item.y); },
        stopButton: () => { playerControl.moveButtonTo(key, item.x, item.y); },
        nextButton: () => { playerControl.moveButtonTo(key, item.x, item.y); },
        themeButton: () => { userAppControl.moveButtonTo(key, item.x, item.y); },
        fullscreenButton: () => { userAppControl.moveButtonTo(key, item.x, item.y); },
        logoutButton: () => { userAppControl.moveButtonTo(key, item.x, item.y); }
    };

    if (itemHandlers[key]) {
        itemHandlers[key]();
    }
}

/**
 * Positions USER CONTROL buttons inside their panel when saved positions are
 * missing or legacy layout data is incomplete.
 */
function positionUserControlButtonsInPanel(options = { theme: true, fullscreen: true, logout: true }) {
    const panel = layoutManager.getPanels().find((candidate) => candidate.key === "layoutTools");
    if (!panel || !userAppControl) {
        return;
    }

    userAppControl.fitToPanel(panel, options);
}

window.getFullLayout = getFullLayout;
window.logFullLayout = logFullLayout;

// ---------------------------------------------------------------------------
// Hit-Testing Utilities And p5 Events
// ---------------------------------------------------------------------------

/**
 * Generic rectangular hit test used by switches and layout controls.
 */
function isPointInBox(mx, my, x, y, w, h) {
    return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

/**
 * Tests whether a point is inside a switch's current layout box.
 */
function isPointInSwitch(mx, my, switchObj) {
    return isPointInBox(mx, my, switchObj.x, switchObj.y, switchObj.w, switchObj.h);
}

/**
 * Draws the DOM-backed transport image buttons in their current positions.
 */
function imgButtons(){
    playerControl.draw();
}


/**
 * Handles mouse/touch press events for layout editing, controls, lists, and
 * playback selection. Layout editing gets first priority so drag gestures do
 * not accidentally activate controls.
 */
function mousePressed(){
    // Editing switches are always handled first, even when the rest of the UI
    // is in layout mode.
    if (isPointInSwitch(mouseX, mouseY, movePanelsSwitch)) {
        movePanelsSwitch.handleMouse(mouseX, mouseY);
        panelLayoutEditMode = false;
        updateDomPointerMode();
        console.log(`Panel movement ${movePanelsSwitch.getState() ? "enabled" : "disabled"}.`);
        if (telemetryLog) {
            telemetryLog.emit("SYSTEM", `Move panels :: ${movePanelsSwitch.getState() ? "enabled" : "disabled"}`);
        }
        if (!isLayoutEditMode()) saveLayoutState();
        return;
    }

    if (isPointInSwitch(mouseX, mouseY, moveElementsSwitch)) {
        moveElementsSwitch.handleMouse(mouseX, mouseY);
        updateDomPointerMode();
        console.log(`Element movement ${moveElementsSwitch.getState() ? "enabled" : "disabled"}.`);
        if (telemetryLog) {
            telemetryLog.emit("SYSTEM", `Move elements :: ${moveElementsSwitch.getState() ? "enabled" : "disabled"}`);
        }
        if (!isLayoutEditMode()) saveLayoutState();
        return;
    }

    // TODO: Lyrics are disabled for now because the lyrics workflow is not working reliably.
    // Re-enable this handler when the lyrics system is repaired.
    // if (!isLayoutEditMode() && isPointInSwitch(mouseX, mouseY, lyricsVisibleSwitch)) {
    //     lyricsVisibleSwitch.handleMouse(mouseX, mouseY);
    //     lyricsVisible = lyricsVisibleSwitch.getState();
    //     applyLyricsVisibility();
    //     updateStoredSubsonicConfig({
    //         lyricsVisible: lyricsVisible,
    //         lyricsVisibleTouched: true
    //     });
    //     console.log(`Lyrics ${lyricsVisible ? "shown" : "hidden"}.`);
    //     return;
    // }

    if (!isLayoutEditMode() && userAppControl.handleMouse(mouseX, mouseY)) {
        return;
    }

    if (handlePanelResizeMousePressed(mouseX, mouseY)) {
        return;
    }

    // In layout mode, this block intercepts panel/element drags before normal
    // controls react to the click.
    if (handleLayoutItemMousePressed(mouseX, mouseY)) {
        return;
    }

    if (!isLayoutEditMode() && telemetryPanel && telemetryPanel.handleMousePressed(mouseX, mouseY)) {
        return;
    }

    progressBar.handleMouse(mouseX, mouseY);//Check if the progress bar was clicked

    FileBrowserObj.handleMouse(mouseX, mouseY); //handle mouse click on file browser

    const queuedSongIndex = SongsListObj.getItemIndexAt(mouseX, mouseY);
    if (queuedSongIndex !== -1) {
        if (telemetryLog) {
            telemetryLog.emit("QUEUE", `Selected index :: ${queuedSongIndex}`);
        }
        PlayerObj.playSongByPlaylistId(queuedSongIndex);
        return;
    }

    SongsListObj.handleMouse(mouseX, mouseY); //handle mouse click on playlist

    const wasFiltersOn = filtersOnOffSwitch.getState();
    filtersOnOffSwitch.handleMouse(mouseX, mouseY); //handle mouse click on switch
    if (filtersOnOffSwitch.getState() !== wasFiltersOn && telemetryLog) {
        telemetryLog.emit("FX", `Filters :: ${filtersOnOffSwitch.getState() ? "enabled" : "disabled"}`, {
            key: "filters-state",
            dedupe: true
        });
    }

    const wasLoopOn = loopOnOffSwitch.getState();
    loopOnOffSwitch.handleMouse(mouseX, mouseY); //handle mouse click on switch
    if (loopOnOffSwitch.getState() !== wasLoopOn && telemetryLog) {
        telemetryLog.emit("TRANSPORT", `Loop playlist :: ${loopOnOffSwitch.getState() ? "enabled" : "disabled"}`);
    }
    const wasRandomPlayOn = randomPlaySwitch.getState();
    randomPlaySwitch.handleMouse(mouseX, mouseY); //handle mouse click on random play switch
    if (randomPlaySwitch.getState() !== wasRandomPlayOn) {
        SongsListObj.setRandomPlay(randomPlaySwitch.getState());
        updateStoredSubsonicConfig({ randomPlay: randomPlaySwitch.getState() });
        if (telemetryLog) {
            telemetryLog.emit("TRANSPORT", `Random play :: ${randomPlaySwitch.getState() ? "enabled" : "disabled"}`);
        }
    }

    const wasSkinnyModeOn = skinnyModeSwitch.getState();
    skinnyModeSwitch.handleMouse(mouseX, mouseY); //handle mouse click on skinny mode switch
    if (skinnyModeSwitch.getState() !== wasSkinnyModeOn) {
        // ##SKINNY MODE
        // ON means inactive/hidden analyzer panels; OFF restores normal draw.
        applySkinnyMode(skinnyModeSwitch.getState());
        updateStoredSubsonicConfig({ skinnyMode: skinnyModeSwitch.getState() });
        if (telemetryLog) {
            telemetryLog.emit("SYSTEM", `Skinny mode :: ${skinnyModeSwitch.getState() ? "enabled" : "disabled"}`);
        }
    }

    volSlider.handleMouse(mouseX, mouseY); //handle mouse click on volume slider

    balanceSlider.handleMouse(mouseX, mouseY); //handle mouse click on balance slider
    rateSlider.handleMouse(mouseX, mouseY); //handle mouse click on rate slider
    bassSlider.handleMouse(mouseX, mouseY); //handle mouse click on bass slider
    midSlider.handleMouse(mouseX, mouseY); //handle mouse click on mid slider
    trebleSlider.handleMouse(mouseX, mouseY); //handle mouse click on treble slider
    reverbSlider.handleMouse(mouseX, mouseY); //handle mouse click on reverb slider
    reverbVolSlider.handleMouse(mouseX, mouseY); //handle mouse click on reverb volume slider
}


/**
 * Handles drag gestures for panel resizing, layout movement, scrollable lists,
 * progress seeking, and sliders.
 */
function mouseDragged(){
    if (handlePanelResizeMouseDragged(mouseX, mouseY)) {
        return;
    }

    if (handleLayoutItemMouseDragged(mouseX, mouseY)) {
        return;
    }

    if (telemetryPanel && telemetryPanel.handleMouseDrag(mouseX, mouseY)) {
        return;
    }

    progressBar.handleMouse(mouseX, mouseY); //handle mouse drag on progress bar
    //FileBrowserObj.handleMouse(mouseX, mouseY); //handle mouse drag on file browser
    FileBrowserObj.handleMouseDrag(mouseX, mouseY); //handle mouse drag on file browser scrollbar

    SongsListObj.handleMouseDrag(mouseX, mouseY); //handle mouse drag on playlist scrollbar

    volSlider.mouseDragged(mouseX, mouseY); //handle mouse drag on volume slider

    balanceSlider.mouseDragged(mouseX, mouseY); //handle mouse drag on balance slider
    rateSlider.mouseDragged(mouseX, mouseY); //handle mouse drag on rate slider
    bassSlider.mouseDragged(mouseX, mouseY); //handle mouse drag on bass slider
    midSlider.mouseDragged(mouseX, mouseY); //handle mouse drag on mid slider
    trebleSlider.mouseDragged(mouseX, mouseY); //handle mouse drag on treble slider
    reverbSlider.mouseDragged(mouseX, mouseY); //handle mouse drag on reverb slider
    reverbVolSlider.mouseDragged(mouseX, mouseY); //handle mouse drag on reverb volume slider
}


/**
 * Finalizes mouse/touch interactions, including layout release, progress seek,
 * list scrollbar release, player loop/random state, and slider release.
 */
function mouseReleased(){
    if (handlePanelResizeMouseReleased()) {
        return;
    }

    if (handleLayoutItemMouseReleased()) {
        return;
    }

    //Jump to the new position in the song if the progress bar was changed
    if (song && song.isLoaded() && progressBar.isChanged()) {
        song.jump(progressBar.getValue() * song.duration());//Notice that this will trigger the onended() event
        if (telemetryLog) {
            telemetryLog.emit("TRACK", `Seek :: ${Math.round(progressBar.getValue() * 100)}%`);
        }
        progressBar.resetChanged(); //reset the changed flag
    }

    FileBrowserObj.handleMouseReleased(); //handle mouse release on file browser
    SongsListObj.handleMouseReleased(); //handle mouse release on playlist
    if (telemetryPanel) {
        telemetryPanel.handleMouseRelease();
    }

    //Set loop state in player
    PlayerObj.setLoop(loopOnOffSwitch.getState()); //set loop state in player
    SongsListObj.setRandomPlay(randomPlaySwitch.getState()); //set random play state in playlist
    applySkinnyMode(skinnyModeSwitch.getState()); // ##SKINNY MODE: refresh panel state after interaction

    volSlider.mouseReleased(); //handle mouse release on volume slider

    balanceSlider.mouseReleased(); //handle mouse release on balance slider
    rateSlider.mouseReleased(); //handle mouse release on rate slider
    bassSlider.mouseReleased(); //handle mouse release on bass slider
    midSlider.mouseReleased(); //handle mouse release on mid slider
    trebleSlider.mouseReleased(); //handle mouse release on treble slider
    reverbSlider.mouseReleased(); //handle mouse release on reverb slider
    reverbVolSlider.mouseReleased(); //handle mouse release on reverb volume slider
}

/**
 * Routes mouse wheel input to sliders and prevents browser scroll when a slider
 * consumes the wheel event.
 */
function mouseWheel(event) {
    if (isLayoutEditMode()) {
        return false;
    }

    if (telemetryPanel && telemetryPanel.contains(mouseX, mouseY)) {
        telemetryPanel.handleWheel(event.delta);
        return false;
    }

    if (FileBrowserObj && FileBrowserObj.containsScrollableArea(mouseX, mouseY)) {
        FileBrowserObj.handleMouseWheel(event.delta);
        return false;
    }

    if (SongsListObj && SongsListObj.contains(mouseX, mouseY)) {
        SongsListObj.handleMouseWheel(event.delta);
        return false;
    }

    // forward wheel events to slider(s)
    volSlider.handleWheel(event);
    if (volSlider.isMouseOver()) return false; //prevent page scroll if over slider

    balanceSlider.handleWheel(event);
    if (balanceSlider.isMouseOver()) return false; //prevent page scroll if over slider

    rateSlider.handleWheel(event);
    if (rateSlider.isMouseOver()) return false; //prevent page scroll if over slider

    bassSlider.handleWheel(event);
    if (bassSlider.isMouseOver()) return false; //prevent page scroll if over slider

    midSlider.handleWheel(event);
    if (midSlider.isMouseOver()) return false; //prevent page scroll if over slider

    trebleSlider.handleWheel(event);
    if (trebleSlider.isMouseOver()) return false; //prevent page scroll if over slider

    reverbSlider.handleWheel(event);
    if (reverbSlider.isMouseOver()) return false; //prevent page scroll if over slider

    reverbVolSlider.handleWheel(event);
    if (reverbVolSlider.isMouseOver()) return false; //prevent page scroll if over slider
}

/**
 * Reads all audio-related UI controls into a plain object for AudioEffects.
 */
function getAudioControlValues() {
    return {
        volume: volSlider.getValue(),
        pan: balanceSlider.getValue(),
        rate: rateSlider.getValue(),
        bass: bassSlider.getValue(),
        mid: midSlider.getValue(),
        treble: trebleSlider.getValue(),
        reverbMix: reverbSlider.getValue(),
        reverbVolume: reverbVolSlider.getValue()
    };
}

/**
 * Converts continuous module telemetry into readable DATA FEED entries.
 * Throttling lives here so visualizers only expose data and do not format logs.
 */
function sampleTelemetry() {
    if (!telemetryLog || typeof millis !== "function") {
        return;
    }

    // Sample on a slow cadence so analyzer logs feel alive without becoming
    // unreadable or competing with the draw loop.
    const now = millis();
    if (now - lastTelemetrySampleAt < 3000) {
        return;
    }
    lastTelemetrySampleAt = now;

    emitAudioControlTelemetry();

    // Skinny mode disconnects analyzer-heavy panels, so the sampler publishes
    // one occasional system note instead of asking inactive modules for data.
    if (isSkinnyModeEnabled()) {
        telemetryLog.emit("SYSTEM", "Analyzer telemetry suspended :: Skinny mode", {
            key: "skinny-telemetry-suspended",
            throttleMs: 15000,
            dedupe: true
        });
        return;
    }

    if (vuMeters && typeof vuMeters.getTelemetry === "function") {
        const vu = vuMeters.getTelemetry();
        // VU values are already smoothed by the meter module and normalized.
        telemetryLog.emit("AUDIO", `Output RMS L/R :: ${vu.left.toFixed(2)} / ${vu.right.toFixed(2)}`, {
            key: "audio-rms",
            throttleMs: 3000,
            dedupe: true
        });
    }

    if (spectrum && typeof spectrum.getTelemetry === "function") {
        const spec = spectrum.getTelemetry();
        if (spec) {
            // Spectrum exposes numeric measurements; wording belongs here so
            // future panels can consume the same structured values differently.
            telemetryLog.emit("SPECTRUM", `Dominant band :: ${formatFrequency(spec.dominantHz)} peak ${spec.peak}`, {
                key: "spectrum-dominant",
                throttleMs: 3000,
                dedupe: true
            });
        }
    }

    if (vectorScope && typeof vectorScope.getTelemetry === "function") {
        const phase = vectorScope.getTelemetry();
        // Negative phase correlation is highlighted as a warning color.
        telemetryLog.emit("PHASE", `Stereo field :: ${phase.field} corr ${phase.correlation.toFixed(2)}`, {
            key: "phase-field",
            throttleMs: 3000,
            dedupe: true,
            level: phase.correlation < -0.2 ? "warn" : "info"
        });
    }
}

/**
 * Emits FX/EQ snapshots when slider-derived audio controls change.
 */
function emitAudioControlTelemetry() {
    const controls = getAudioControlValues();
    // Normalize values before comparing so tiny slider float differences do not
    // generate visually identical log entries.
    const snapshot = {
        volume: Math.round(controls.volume * 100),
        pan: controls.pan.toFixed(2),
        rate: controls.rate.toFixed(2),
        bass: controls.bass.toFixed(1),
        mid: controls.mid.toFixed(1),
        treble: controls.treble.toFixed(1),
        reverbMix: Math.round(controls.reverbMix * 100),
        reverbVolume: controls.reverbVolume.toFixed(1)
    };

    const encoded = JSON.stringify(snapshot);
    if (encoded === lastAudioTelemetrySnapshot) {
        return;
    }

    lastAudioTelemetrySnapshot = encoded;
    // Split the snapshot into readable lines because a single full control row
    // gets too wide for the DATA FEED panel.
    telemetryLog.emit("FX", `Vol ${snapshot.volume}% pan ${snapshot.pan} rate ${snapshot.rate}`, {
        key: "fx-main-controls",
        throttleMs: 3000,
        dedupe: true
    });
    telemetryLog.emit("EQ", `Curve :: low ${snapshot.bass} mid ${snapshot.mid} high ${snapshot.treble}`, {
        key: "eq-curve",
        throttleMs: 3000,
        dedupe: true
    });
    telemetryLog.emit("FX", `Reverb :: mix ${snapshot.reverbMix}% return ${snapshot.reverbVolume}`, {
        key: "reverb-state",
        throttleMs: 3000,
        dedupe: true
    });
}

/**
 * Formats frequency values for compact telemetry lines.
 */
function formatFrequency(hz) {
    if (!Number.isFinite(hz)) {
        return "0 Hz";
    }
    if (hz >= 1000) {
        return `${(hz / 1000).toFixed(1)} kHz`;
    }
    return `${Math.round(hz)} Hz`;
}

/**
 * p5 resize event. Keeps the canvas matched to the visible viewport.
 */
function windowResized() {
    resizeCanvasToAvailableSpace();
}


/**
 * Maps touch start to the existing mouse press handler for p5 touch devices.
 */
function touchStarted(){
    mousePressed();
}

/**
 * Maps touch end to the existing mouse release handler for p5 touch devices.
 */
function touchEnded(){
    mouseReleased();
}

// ---------------------------------------------------------------------------
// Audio Routing And Control Application
// ---------------------------------------------------------------------------

/**
 * Applies or rebuilds audio routing for the current song and filter state.
 */
function configureAudioRouting(force=false){
    const filtersState = filtersOnOffSwitch ? filtersOnOffSwitch.getState() : filtersON;
    audioEffects.configure(song, filtersState, force, getAudioControlValues());
}


/**
 * Draws static text labels for DOM select controls that sit on the canvas.
 */
function printLabels(){

    push();
    fill(UI.muted[0], UI.muted[1], UI.muted[2]);
    noStroke();
    textSize(10);
    textAlign(LEFT, TOP);
    text('Playlist', playlistLabelPosition.x, playlistLabelPosition.y);
    text('Songs', songLabelPosition.x, songLabelPosition.y);
    pop();
}


// ---------------------------------------------------------------------------
// Metadata And Playback Controls
// ---------------------------------------------------------------------------

// TODO: Lyrics feature is parked until the external lyrics API is available again.
// Loads lyrics from server and displays them in the dedicated divs below the player.
// Pretty prone to get wrong lyrics, though. This is a server/API issue, not this script.
// function loadLyrics(artist, title){
//     var lyrics = SubsonicObj.getLyrics(artist, title);
//
//     lyrics.then((res) => {
//
//                 //console.log(res, artist,title);
//                 select('#lyrics').html("<pre>"+(res || "")+"</pre>");
//                 select('#title').html(title || "");
//
//         });
//
// }

/**
 * Updates the Now Playing panel from playlist or songInfo metadata.
 */
function applyPlayingInfo(songData) {
    if (!songData || !playingInfo) {
        return;
    }

    playingInfo.setSong(songData);

    // TODO: Lyrics feature is parked until the external lyrics API is available again.
    // if (songData.artist && songData.title) {
    //     loadLyrics(songData.artist, songData.title);
    // }
}

/**
 * Handles a newly loaded song by updating metadata immediately, then fetching
 * richer Subsonic songInfo details when available.
 */
function handleSongLoaded(id, playlistSong) {
    lastPlayingInfoSongId = id;

    applyPlayingInfo(playlistSong);
    if (telemetryLog && playlistSong) {
        const artist = playlistSong.artist || "Unknown artist";
        const title = playlistSong.title || "Untitled";
        telemetryLog.emit("STREAM", `Track loaded :: ${artist} - ${title}`);
    }

    if (!SubsonicObj || !id) {
        return;
    }

    SubsonicObj.getSongInfo(id).then((songInfo) => {
        if (id !== lastPlayingInfoSongId) {
            return;
        }

        applyPlayingInfo(songInfo || playlistSong);
        if (telemetryLog && songInfo) {
            const duration = songInfo.duration ? `${Math.round(songInfo.duration)}s` : "unknown duration";
            telemetryLog.emit("STREAM", `Metadata resolved :: ${duration}`, {
                key: `song-info-${id}`,
                dedupe: true
            });
        }
    });
}

/**
 * Legacy helper for toggling a single song loop state.
 * The current transport flow uses playlist loop controls instead.
 */
function toggleLoop(){
    if (song.isLooping()){
        song.setLoop(false);
        loopButton.html('Loop OFF');
    }else{
        song.setLoop(true);
        loopButton.html('Loop ON');
    }
}
// ---------------------------------------------------------------------------
// Remote Playlists And Local Queue
// ---------------------------------------------------------------------------

/**
 * Loads remote Subsonic playlists and populates the playlist dropdown.
 */
function getPlaylists(){
    var list =  SubsonicObj.getPlaylists();

    list.then((ret)=>{
        if(!Array.isArray(ret)){
            console.log("No playlists available");
            if (telemetryLog) {
                telemetryLog.emit("SUBSONIC", "Playlists unavailable", { level: "warn" });
            }
            return;
        }

        //add items to dropdown
        for(let item of ret){
            if(item && item.name && item.id){
                playListSelect.option(item.name, item.id);
            }
            //console.log("Added playlist: "+item['name']);
        }
        if (telemetryLog) {
            telemetryLog.emit("SUBSONIC", `Playlists indexed :: ${ret.length}`);
        }
    });

}

/**
 * Loads the selected remote playlist into the local queue and repopulates the
 * song selector with playable entries.
 */
function playListElementSelected(){
    var sel = playListSelect.value();
    if(sel == -1 || sel == 0){
        return;
    }

    var list = SubsonicObj.getPlaylist(sel);
    list.then((ret)=>{
        //console.log(ret);
        let songs = Array.isArray(ret?.entry) ? ret.entry : [];
        SongsListObj.clear(); //clear local playlist
        SongsListObj.addSongsList(songs);//add all to local playlist
        if (telemetryLog) {
            telemetryLog.emit("QUEUE", `Remote playlist loaded :: ${songs.length} tracks`);
        }
        //clear song selector
        let dropdown=document.getElementById('playListSongSelect');//grab the select element
        if(dropdown){
            dropdown.innerText = null;//clear song selector
        }
        //repopulate song selector
        songSelect.option('Select',-1);
        for(var i=0;i<SongsListObj.getLength();i++){
            const playlistSong = SongsListObj.songslist[i];
            if(playlistSong && playlistSong.id){
                songSelect.option(playlistSong.title || "Untitled", playlistSong.id);
            }
        }
    });
}
////////////////////TEST AREA///////////////////////


////////////////////TEST AREA END///////////////////////
