/**
 * @fileOverview
 * This file contains the main sketch for a Subsonic music player using p5.js.
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
var fullscreenListenerAttached = false;

// Panel-bound visualizers. Their internal sizing/positioning rules live in
// each module; sketch.js only instantiates, draws, and syncs them with panels.
var spectrum;
var waveform;
var vuMeters;
var keepPlaying=false; //semaphore

var song = null; // p5.SoundFile object for playback
var SongsListObj; //local playlist object


var vol;
var pan;
var rate;

var playPlaylistImg;
var pausePlaylistImg;
var stopPlayListImg;

var playListSelect;
var songSelect;

var progressBar;

var playingInfo;

var bassGain;
var midGain;
var trebleGain;
var reverb;

// Audio graph. Filters/gains are created once and re-routed only when the
// active song or filter switch state changes.
var bassFilter
var midFilter;
var trebleFilter;

var filtersON = true; //if filters are on or off

var filtersOnOffSwitch; //switch for filters on/off
var loopOnOffSwitch; //switch for loop on/off
var movePanelsSwitch; //switch for enabling panel movement/resizing
var moveElementsSwitch; //switch for enabling individual element movement
var lyricsVisibleSwitch; //switch for showing and hiding the lyrics column
var volSlider;
var balanceSlider;
var rateSlider;
var bassSlider;
var midSlider;
var trebleSlider;
var reverbSlider;
var reverbVolSlider;
var routedSong = null;
var routedFiltersState = null;
var lastVolumeValue = null;
var lastPanValue = null;
var lastRateValue = null;
var lastBassValue = null;
var lastMidValue = null;
var lastTrebleValue = null;
var lastReverbValue = null;
var lastReverbVolValue = null;
var lastPlayingInfoSongId = null;

// Base panel layout. Positions can be overwritten by the layout saved in
// localStorage, but this table defines the initial console.
var panelLayoutEditMode = false;
var panelLayout = [
    { key: "nowPlaying", x: 16, y: 26, w: 370, h: 165, label: "NOW PLAYING", accent: "line" },
    { key: "source", x: 19, y: 216, w: 235, h: 125, label: "SOURCE", accent: "pink" },
    { key: "transport", x: 260, y: 217, w: 120, h: 150, label: "TRANSPORT", accent: "amber" },
    { key: "spectrum", x: 406, y: 24, w: 480, h: 215, label: "SPECTRUM", accent: "line" },
    { key: "waveform", x: 400, y: 257, w: 480, h: 215, label: "WAVEFORM", accent: "pink" },
    { key: "position", x: 404, y: 485, w: 480, h: 55, label: "POSITION", accent: "amber" },
    { key: "vuMeters", x: 890, y: 24, w: 130, h: 215, label: "VU METERS", accent: "line" },
    { key: "level", x: 890, y: 250, w: 90, h: 245, label: "LEVEL", accent: "amber" },
    { key: "fxBus", x: 25, y: 511, w: 370, h: 215, label: "FX BUS", accent: "line" },
    { key: "browser", x: 400, y: 520, w: 280, h: 235, label: "BROWSER", accent: "pink" },
    { key: "queue", x: 674, y: 523, w: 280, h: 235, label: "QUEUE", accent: "line" },
    { key: "layoutTools", x: 930, y: 20, w: 104, h: 210, label: "USER CONTROL", accent: "amber" }
];
var layoutDragItem = null;
var layoutDragOffsetX = 0;
var layoutDragOffsetY = 0;
var layoutDragStartX = 0;
var layoutDragStartY = 0;
var layoutDragChildren = [];

// Element -> panel ownership map. This prevents overlapping panels from
// "stealing" controls through geometry alone while being moved.
var layoutItemPanelOwners = {};
var layoutResizePanel = null;
var layoutResizeStartMouseX = 0;
var layoutResizeStartMouseY = 0;
var layoutResizeStartW = 0;
var layoutResizeStartH = 0;

// Positions for DOM controls created with p5. Unlike canvas components, these
// do not have their own module yet.
var playButtonPosition = { x: 278, y: 252, w: 22, h: 22 };
var pauseButtonPosition = { x: 314, y: 252, w: 22, h: 22 };
var stopButtonPosition = { x: 350, y: 252, w: 22, h: 22 };
var themeButtonPosition = { x: 949, y: 134, w: 66, h: 22 };
var fullscreenButtonPosition = { x: 949, y: 164, w: 66, h: 22 };
var logoutButtonPosition = { x: 949, y: 194, w: 66, h: 22 };
var playlistSelectPosition = { x: 39, y: 256, w: 200, h: 25 };
var songSelectPosition = { x: 39, y: 306, w: 200, h: 25 };
var playlistLabelPosition = { x: 39, y: 244, w: 80, h: 12 };
var songLabelPosition = { x: 39, y: 294, w: 80, h: 12 };
var lyricsVisible = false;
var currentCanvasWidth = 1024;
var currentCanvasHeight = 868;

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

function getStoredSubsonicConfig() {
    const config = getStoredAppState();
    if (!config || !config.server || !config.user || !config.token || !config.salt) {
        return null;
    }

    return config;
}

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

function saveSubsonicConfig(config) {
    localStorage.setItem(SUBSONIC_CONFIG_KEY, JSON.stringify({
        ...(getStoredAppState() || {}),
        ...config
    }));
}

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

function clearSubsonicAuth() {
    const config = getStoredAppState() || {};
    delete config.server;
    delete config.user;
    delete config.token;
    delete config.salt;
    localStorage.setItem(SUBSONIC_CONFIG_KEY, JSON.stringify(config));
}

function updateComponentThemeColors() {
    if (playListSelect) styleSelect(playListSelect);
    if (songSelect) styleSelect(songSelect);
    if (playPlaylistImg) styleTransportButton(playPlaylistImg);
    if (pausePlaylistImg) styleTransportButton(pausePlaylistImg);
    if (stopPlayListImg) styleTransportButton(stopPlayListImg);

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

// Validate tokenized credentials with ping before building the deck.
async function isSubsonicConfigAccepted(config) {
    if (!config || !config.server || !config.user || !config.token || !config.salt) {
        return false;
    }

    const client = new SubsonicClient(config.server, config.user, config.token, config.salt);
    const ping = await client.request("ping");
    return !!ping;
}

function getCanvasSize() {
    const pagePadding = 44;
    const layoutGap = lyricsVisible ? 24 : 0;
    const lyricsWidth = lyricsVisible ? 500 : 0;
    const availableWidth = window.innerWidth - pagePadding - layoutGap - lyricsWidth;
    const availableHeight = window.innerHeight - pagePadding;

    return {
        width: Math.max(1024, Math.floor(availableWidth)),
        height: Math.max(868, Math.floor(availableHeight))
    };
}

function resizeCanvasToAvailableSpace() {
    const size = getCanvasSize();
    currentCanvasWidth = size.width;
    currentCanvasHeight = size.height;

    if (typeof resizeCanvas === "function" && typeof width !== "undefined" && typeof height !== "undefined" && width && height) {
        resizeCanvas(currentCanvasWidth, currentCanvasHeight);
    }

    const canvasContainer = document.getElementById("cnv");
    if (canvasContainer) {
        canvasContainer.style.width = currentCanvasWidth + "px";
        canvasContainer.style.minHeight = currentCanvasHeight + "px";
    }

    const lyricsPanel = document.getElementById("otro");
    if (lyricsPanel) {
        lyricsPanel.style.display = lyricsVisible ? "block" : "none";
        lyricsPanel.style.minHeight = currentCanvasHeight + "px";
    }
}

function applyLyricsVisibility() {
    resizeCanvasToAvailableSpace();
    if (lyricsVisibleSwitch) {
        lyricsVisibleSwitch.setState(lyricsVisible);
    }
}

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
        "background: rgba(7,10,18,0.82)",
        "backdrop-filter: blur(4px)"
    ].join(";");

    panel.style.cssText = [
        "font-family: Inter, Arial, Helvetica, sans-serif",
        "max-width: 420px",
        "width: min(420px, calc(100vw - 32px))",
        "margin: 0 auto",
        "padding: 24px",
        "color: #edf7ff",
        "background: linear-gradient(180deg, rgba(13,18,31,0.96), rgba(7,10,18,0.98))",
        "border: 1px solid rgba(0,229,255,0.42)",
        "box-shadow: 0 22px 70px rgba(0,0,0,0.52), 0 0 34px rgba(0,229,255,0.12)"
    ].join(";");

    panel.innerHTML = [
        "<h1 style='font-size: 20px; margin: 0 0 16px; color:#00e5ff;'>Subsonic setup</h1>",
        "<form id='subsonic-config-form'>",
        "<label style='display:block; margin-bottom: 12px;'>Server URL",
        "<input name='server' required placeholder='https://example.com:4040' style='box-sizing:border-box; display:block; width:100%; margin-top:4px; padding:8px; color:#edf7ff; background:#101827; border:1px solid rgba(0,229,255,0.42);'>",
        "</label>",
        "<label style='display:block; margin-bottom: 12px;'>Username",
        "<input name='user' required autocomplete='username' style='box-sizing:border-box; display:block; width:100%; margin-top:4px; padding:8px; color:#edf7ff; background:#101827; border:1px solid rgba(0,229,255,0.42);'>",
        "</label>",
        "<label style='display:block; margin-bottom: 16px;'>Password",
        "<input name='password' type='password' required autocomplete='current-password' style='box-sizing:border-box; display:block; width:100%; margin-top:4px; padding:8px; color:#edf7ff; background:#101827; border:1px solid rgba(0,229,255,0.42);'>",
        "</label>",
        "<button type='submit' style='padding:8px 14px; color:#070a12; background:#00e5ff; border:0; font-weight:700;'>Save and start</button>",
        `<p id='subsonic-config-error' style='color:#ff6b6b; min-height:20px;'>${message}</p>`,
        "</form>"
    ].join("");

    overlay.appendChild(panel);
    host.appendChild(overlay);

    const form = document.getElementById("subsonic-config-form");
    const error = document.getElementById("subsonic-config-error");

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

        error.style.color = "#f6c85f";
        error.textContent = "Checking credentials...";
        if (button) {
            button.disabled = true;
            button.textContent = "Checking...";
        }

        const accepted = await isSubsonicConfigAccepted(candidateConfig);
        if (!accepted) {
            error.style.color = "#ff6b6b";
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

// MD5 is used by the Subsonic token authentication scheme.
function MD5(input) {
    function rotateLeft(value, shift) {
        return (value << shift) | (value >>> (32 - shift));
    }

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

    function f(x, y, z) { return (x & y) | ((~x) & z); }
    function g(x, y, z) { return (x & z) | (y & (~z)); }
    function h(x, y, z) { return x ^ y ^ z; }
    function i(x, y, z) { return y ^ (x | (~z)); }

    function ff(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function gg(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function hh(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function ii(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

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
 * Initializes the main UI and audio controls for the sketch.
 *
 * Sets up the canvas, control buttons (play, pause, stop), sliders for volume, pan, and rate,
 * playlist and song selection dropdowns, and visual components such as spectrum, waveform, and progress bar.
 * Also initializes playlist data, slider controls, and playing info UI elements.
 *
 * This function should be called once at the start of the program.
 *
 * @function
 * @global
 */
function setup()
{
    setTheme((getStoredAppState() || {}).theme || "cyber");
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

// Create every deck object: Subsonic client, canvas, DOM controls, canvas
// components, initial audio graph, and layout restoration.
function initializePlayer(subsonicConfig) {
    attachFullscreenResizeListener();
    setTheme(subsonicConfig.theme || "cyber");
    // TODO: Lyrics are disabled for now because the lyrics workflow is not working reliably.
    // Restore the saved preference when the lyrics system is repaired.
    // lyricsVisible = subsonicConfig.lyricsVisible === true && subsonicConfig.lyricsVisibleTouched === true;
    lyricsVisible = false;
    applyLyricsVisibility();

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
    applyLyricsVisibility();

    SongsListObj = new PlayList(684,548,250,200); //local playlist object
    PlayerObj = new Player(SubsonicObj, SongsListObj);
    song = PlayerObj.getSoundObject(); //get the song object from the player fot init purposes

    background(UI.bg[0], UI.bg[1], UI.bg[2]);

    //LIST buttons
    playPlaylistImg = createImg("assets/play.png", "Play");
    playPlaylistImg.parent("cnv");
    playPlaylistImg.mousePressed(()=>PlayerObj.playSong());

    pausePlaylistImg = createImg("assets/pause.png", "Pause");
    pausePlaylistImg.parent("cnv");
    pausePlaylistImg.mousePressed(()=>PlayerObj.pauseSong());



    stopPlayListImg = createImg("assets/stop.png","Stop");
    stopPlayListImg.parent("cnv");
    stopPlayListImg.mousePressed(()=>PlayerObj.stopSong());
    styleTransportButton(playPlaylistImg);
    styleTransportButton(pausePlaylistImg);
    styleTransportButton(stopPlayListImg);

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
    spectrum = new Spectrum(426,59,1500,600);
    waveform = new WaveForm(420,292,1500,600);
    vuMeters = new VUMeters(910,59,90,165);
    progressBar=new ProgressBarH(424,505,450,20);



    //fill playlist
    getPlaylists();

    //create Playing info
    playingInfo = new PlayingInfo(26,61,SubsonicObj);
    PlayerObj.setOnSongLoaded(handleSongLoaded);


        // Create filters for each band
        bassGain = new p5.Gain();
        midGain = new p5.Gain();
        trebleGain = new p5.Gain();

        bassFilter = new p5.BandPass();
        bassFilter.freq(100);
        bassFilter.res(0.2);

        midFilter = new p5.BandPass();
        midFilter.freq(2000);
        midFilter.res(0.4);

        trebleFilter = new p5.BandPass();
        trebleFilter.freq(12000);
        trebleFilter.res(0.4);

        reverb = new p5.Reverb();

    FileBrowserObj = new FileBrowser(420, 545, 250, 200, SongsListObj, SubsonicObj,PlayerObj); //file browser instance


    filtersOnOffSwitch = new Switch(335, 546, 20, 50, "Filters"); //switch for filters on/off
    loopOnOffSwitch = new Switch(365, 546, 20, 50, "Loop\nPlaylist"); //switch for loop on/off
    movePanelsSwitch = new Switch(946, 50, 20, 50, "Move\nPanels"); //switch for moving/resizing panels
    moveElementsSwitch = new Switch(982, 50, 20, 50, "Move\nElements"); //switch for moving individual controls
    // TODO: Keep this switch instance for future lyrics repair, but do not draw or handle it for now.
    lyricsVisibleSwitch = new Switch(946, 50, 20, 50, "Show\nLyrics"); //switch for showing the lyrics column
    filtersOnOffSwitch.setState(filtersON);
    loopOnOffSwitch.setState(true);
    movePanelsSwitch.setState(false);
    moveElementsSwitch.setState(false);
    lyricsVisibleSwitch.setState(lyricsVisible);


    volSlider = new SliderV(915, 285, 40, 185, "Volume", 0, 1, 0.8,"#132235","#00e5ff",{wheelSteps:100, wheelSensitivity:2}); //vertical slider for volume
    balanceSlider = new SliderH(270, 287, 95, 10, "Balance", -1, 1, 0,"#132235","#ff2bd6",{wheelSteps:100, wheelSensitivity:2}); //horizontal slider for balance
    rateSlider = new SliderH(270, 332, 95, 10, "Speed", 0.01, 2, 1,"#132235","#f6c85f",{wheelSteps:100, wheelSensitivity:2}); //horizontal slider for playback speed
    bassSlider = new SliderV(50, 546, 30, 145, "Bass", 0, 5, 2.5,"#132235","#00e5ff",{wheelSteps:100, wheelSensitivity:2}); //vertical slider for bass gain
    midSlider = new SliderV(105, 546, 30, 145, "Mid", 0, 5, 1.5,"#132235","#ff2bd6",{wheelSteps:100, wheelSensitivity:2}); //vertical slider for mid gain
    trebleSlider = new SliderV(160, 546, 30, 145, "Treble", 0, 5, 1.5,"#132235","#f6c85f",{wheelSteps:100, wheelSensitivity:2}); //vertical slider for treble gain
    reverbSlider = new SliderV(225, 546, 30, 145, "Reverb", 0, 1, 0.01,"#132235","#00e5ff",{wheelSteps:100, wheelSensitivity:2}); //vertical slider for reverb mix
    reverbVolSlider = new SliderV(280, 546, 30, 145, "Rev Vol", 0, 10, 0,"#132235","#ff2bd6",{wheelSteps:100, wheelSensitivity:2}); //vertical slider for reverb volume

    applySavedLayout(subsonicConfig.layout);
    initializeLayoutItemPanelOwners(subsonicConfig.layoutOwners);
    syncPanelBoundComponents();

    configureAudioRouting(true); //setup initial audio route

}

// Styles for DOM controls overlaid on the canvas. Canvas components read
// directly from UI, but HTML elements need manual styles.
function styleSelect(selectElement) {
    selectElement.style("height", "26px");
    selectElement.style("font-size", "12px");
    selectElement.style("font-weight", "600");
    selectElement.style("color", cssHex(UI.text));
    selectElement.style("background", cssHex(UI.field));
    selectElement.style("border", `1px solid ${rgbaString(UI.line, 0.48)}`);
    selectElement.style("box-shadow", `0 0 16px ${rgbaString(UI.line, 0.08)}`);
}

function styleTransportButton(button) {
    const cyberIconFilter = "invert(81%) sepia(91%) saturate(2540%) hue-rotate(135deg) brightness(107%) contrast(105%)";
    button.style("width", "22px");
    button.style("height", "22px");
    button.style("padding", "3px");
    button.style("border", `1px solid ${rgbaString(UI.line, 0.48)}`);
    button.style("border-radius", "4px");
    button.style("background", rgbaString(UI.panel, 0.92));
    button.style("box-shadow", currentThemeName === "cyber"
        ? `0 0 14px ${rgbaString(UI.line, 0.28)}, inset 0 0 10px ${rgbaString(UI.line, 0.12)}`
        : `0 0 14px ${rgbaString(UI.line, 0.16)}`);
    button.style("filter", currentThemeName === "cyber"
        ? `${cyberIconFilter} drop-shadow(0 0 5px ${rgbaString(UI.line, 0.85)})`
        : `drop-shadow(0 0 4px ${rgbaString(UI.line, 0.35)})`);
    button.style("cursor", "pointer");
}

/**
 * Main draw loop for the sketch.
 * This function is called repeatedly to update the canvas and UI elements.
 * It handles screen refresh, drawing the progress bar, spectrum, waveform,
 * playing info, and other UI elements.
 */
function draw(){
    if (!appReady) {
        drawStartupScreen();
        return;
    }

    //screen refresh
    background(UI.bg[0], UI.bg[1], UI.bg[2]);
    drawAppShell();

    // Keep panel-bound visualizers aligned even while their panel is moved
    // or resized.
    syncPanelBoundComponents();
    updateDomPointerMode();

    //Get the song object from the player only if NOT requested yet
    //i.e., avoid reassigning the sound object every frame, assign it only once after loading or playing a new song
    if(!PlayerObj.isRequested){
        const nextSong = PlayerObj.getSoundObject();
        if(nextSong){
            song = nextSong;
            // When a new song loads, connect that new p5.SoundFile to the
            // filter/reverb bus.
            configureAudioRouting(true);
        }
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


    //Draw spectrum, waveform, and level meters
    spectrum.draw();
    waveform.draw();
    vuMeters.draw(song);

    //Info box
    playingInfo.draw();


    //img buttons
    imgButtons();

    setVolume(); //set volume to slider value
    setPan(); //set pan to slider value
    setRate(); //set rate to slider value
    applyFilterValues(); //set effect values only when sliders change

    //Draw file browser
    FileBrowserObj.draw();

    SongsListObj.draw();

    //Draw switch for filters on/off
    filtersOnOffSwitch.draw();

    //Draw switch for loop on/off
    loopOnOffSwitch.draw();

    //Draw switches for layout editing
    movePanelsSwitch.draw();
    moveElementsSwitch.draw();

    // TODO: Lyrics are disabled for now because the lyrics workflow is not working reliably.
    // Re-enable this switch when the lyrics system is repaired.
    // lyricsVisibleSwitch.draw();

    drawUserControlButtons();


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

// Minimal screen during login, validation, and startup errors.
function drawStartupScreen() {
    background(UI.bg[0], UI.bg[1], UI.bg[2]);

    push();
    fill(UI.text[0], UI.text[1], UI.text[2]);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(appStatusMessage || "Loading...", width / 2, height / 2);
    pop();
}

function drawLayoutEditorOverlay() {
    if (!isLayoutEditMode()) {
        return;
    }

    push();
    noFill();
    stroke(246, 200, 95, 120);
    strokeWeight(1);
    if (isMovePanelsEnabled()) {
        for (const panel of panelLayout) {
            rect(panel.x, panel.y, panel.w, panel.h, 3);
        }
    }
    if (isMoveElementsEnabled()) {
        for (const item of getMovableLayoutItems()) {
            rect(item.x, item.y, item.w, item.h, 3);
        }
    }

    if (isMovePanelsEnabled() && isMoveElementsEnabled()) {
        stroke(UI.pink[0], UI.pink[1], UI.pink[2], 120);
    }
    for (const item of getPanelBoundLayoutItems()) {
        rect(item.x, item.y, item.w, item.h, 3);
    }

    noStroke();
    fill(246, 200, 95);
    textSize(11);
    textAlign(RIGHT, TOP);
    text(getLayoutEditorStatusText(), width - 24, 8);
    pop();
}

function updateDomPointerMode() {
    const pointerMode = isMoveElementsEnabled() ? "none" : "auto";
    playPlaylistImg.style("pointer-events", pointerMode);
    pausePlaylistImg.style("pointer-events", pointerMode);
    stopPlayListImg.style("pointer-events", pointerMode);
    playListSelect.style("pointer-events", pointerMode);
    songSelect.style("pointer-events", pointerMode);
}

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

    for (const panel of panelLayout) {
        drawPanel(panel);
    }

    fill(UI.text[0], UI.text[1], UI.text[2]);
    textSize(18);
    textAlign(LEFT, TOP);
    text("SUBSONIC PLAYER", 24, 4);
    fill(UI.muted[0], UI.muted[1], UI.muted[2]);
    textSize(10);
    text(`${currentThemeName.toUpperCase()} AUDIO CONSOLE`, 210, 10);
    pop();
}

function drawPanel(panel){
    const accent = UI[panel.accent] || UI.line;
    push();
    stroke(accent[0], accent[1], accent[2], 110);
    strokeWeight(1);
    fill(UI.panel[0], UI.panel[1], UI.panel[2], 226);
    rect(panel.x, panel.y, panel.w, panel.h, 6);

    noStroke();
    fill(accent[0], accent[1], accent[2], 32);
    rect(panel.x + 1, panel.y + 1, panel.w - 2, 20, 5);

    fill(accent[0], accent[1], accent[2], 230);
    textSize(10);
    textAlign(LEFT, CENTER);
    text(panel.label, panel.x + 10, panel.y + 11);
    if (isMovePanelsEnabled()) {
        fill(UI.muted[0], UI.muted[1], UI.muted[2], 180);
        textAlign(RIGHT, CENTER);
        text(`${Math.round(panel.x)},${Math.round(panel.y)}`, panel.x + panel.w - 8, panel.y + 11);
    }
    if (isMovePanelsEnabled() && isResizablePanel(panel)) {
        stroke(accent[0], accent[1], accent[2], 210);
        strokeWeight(2);
        line(panel.x + panel.w - 16, panel.y + panel.h - 4, panel.x + panel.w - 4, panel.y + panel.h - 16);
        line(panel.x + panel.w - 10, panel.y + panel.h - 4, panel.x + panel.w - 4, panel.y + panel.h - 10);
    }
    pop();
}

function drawUserControlButtons() {
    drawUserControlButton(
        themeButtonPosition,
        currentThemeName.toUpperCase(),
        isPointInBox(mouseX, mouseY, themeButtonPosition.x, themeButtonPosition.y, themeButtonPosition.w, themeButtonPosition.h)
    );
    drawUserControlButton(
        fullscreenButtonPosition,
        isFullscreenActive() ? "WINDOW" : "FULL",
        isPointInBox(mouseX, mouseY, fullscreenButtonPosition.x, fullscreenButtonPosition.y, fullscreenButtonPosition.w, fullscreenButtonPosition.h)
    );
    drawUserControlButton(
        logoutButtonPosition,
        "LOGOUT",
        isPointInBox(mouseX, mouseY, logoutButtonPosition.x, logoutButtonPosition.y, logoutButtonPosition.w, logoutButtonPosition.h)
    );
}

function drawUserControlButton(bounds, label, hover) {
    push();
    stroke(hover ? color(UI.pink[0], UI.pink[1], UI.pink[2]) : color(UI.amber[0], UI.amber[1], UI.amber[2], 170));
    strokeWeight(1);
    fill(hover ? color(UI.pink[0], UI.pink[1], UI.pink[2], 44) : color(UI.panelAlt[0], UI.panelAlt[1], UI.panelAlt[2], 230));
    rect(bounds.x, bounds.y, bounds.w, bounds.h, 4);

    noStroke();
    fill(UI.text[0], UI.text[1], UI.text[2]);
    textSize(10);
    textAlign(CENTER, CENTER);
    text(label, bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
    pop();
}

function handleThemeButton(mx, my) {
    if (!isPointInBox(mx, my, themeButtonPosition.x, themeButtonPosition.y, themeButtonPosition.w, themeButtonPosition.h)) {
        return false;
    }

    toggleTheme();
    return true;
}

function isFullscreenActive() {
    return !!document.fullscreenElement;
}

function attachFullscreenResizeListener() {
    if (fullscreenListenerAttached) {
        return;
    }

    document.addEventListener("fullscreenchange", () => {
        resizeCanvasToAvailableSpace();
    });
    fullscreenListenerAttached = true;
}

function handleFullscreenButton(mx, my) {
    if (!isPointInBox(mx, my, fullscreenButtonPosition.x, fullscreenButtonPosition.y, fullscreenButtonPosition.w, fullscreenButtonPosition.h)) {
        return false;
    }

    toggleFullscreen();
    return true;
}

async function toggleFullscreen() {
    try {
        if (isFullscreenActive()) {
            await document.exitFullscreen();
        } else {
            await document.documentElement.requestFullscreen();
        }
        setTimeout(resizeCanvasToAvailableSpace, 80);
    } catch (error) {
        console.error("Fullscreen toggle failed:", error);
    }
}

function handleLogoutButton(mx, my) {
    if (!isPointInBox(mx, my, logoutButtonPosition.x, logoutButtonPosition.y, logoutButtonPosition.w, logoutButtonPosition.h)) {
        return false;
    }

    clearSubsonicAuth();
    window.location.reload();
    return true;
}

// ---------------------------------------------------------------------------
// Layout Editor
// ---------------------------------------------------------------------------
// The editor separates two intentions:
// - Move Panels: moves/resizes containers and drags their current children.
// - Move Elements: lets loose controls move between containers.
// Panel-bound components are not moved directly; their own modules fit them
// with fitToPanel(panel).

function isResizablePanel(panel) {
    return panel && (panel.key === "spectrum" || panel.key === "waveform" || panel.key === "vuMeters");
}

function isPointInPanelResizeHandle(mx, my, panel) {
    return isResizablePanel(panel) &&
        mx >= panel.x + panel.w - 22 &&
        mx <= panel.x + panel.w &&
        my >= panel.y + panel.h - 22 &&
        my <= panel.y + panel.h;
}

function handlePanelResizeMousePressed(mx, my) {
    if (!isMovePanelsEnabled()) {
        return false;
    }

    for (let i = panelLayout.length - 1; i >= 0; i--) {
        const panel = panelLayout[i];
        if (isPointInPanelResizeHandle(mx, my, panel)) {
            layoutResizePanel = panel;
            layoutResizeStartMouseX = mx;
            layoutResizeStartMouseY = my;
            layoutResizeStartW = panel.w;
            layoutResizeStartH = panel.h;
            return true;
        }
    }

    return false;
}

function handlePanelResizeMouseDragged(mx, my) {
    if (!isMovePanelsEnabled() || !layoutResizePanel) {
        return false;
    }

    const minSize = getResizablePanelMinSize(layoutResizePanel);
    const minW = minSize.w;
    const minH = minSize.h;
    layoutResizePanel.w = Math.round(constrain(layoutResizeStartW + mx - layoutResizeStartMouseX, minW, width - layoutResizePanel.x));
    layoutResizePanel.h = Math.round(constrain(layoutResizeStartH + my - layoutResizeStartMouseY, minH, height - layoutResizePanel.y));
    resizeVisualizerToPanel(layoutResizePanel);
    return true;
}

function getResizablePanelMinSize(panel) {
    const component = getPanelBoundComponent(panel);
    if (component && typeof component.getMinPanelSize === "function") {
        return component.getMinPanelSize();
    }

    return { w: 220, h: 120 };
}

function handlePanelResizeMouseReleased() {
    if (!isMovePanelsEnabled() || !layoutResizePanel) {
        return false;
    }

    console.log("Panel resized:", layoutResizePanel.key, {
        x: layoutResizePanel.x,
        y: layoutResizePanel.y,
        w: layoutResizePanel.w,
        h: layoutResizePanel.h
    });
    logFullLayout();
    layoutResizePanel = null;
    return true;
}

function resizeVisualizerToPanel(panel) {
    syncPanelBoundComponent(panel);
}

function syncPanelBoundComponents() {
    for (const panel of panelLayout) {
        syncPanelBoundComponent(panel);
    }
}

function syncPanelBoundComponent(panel) {
    if (!panel) {
        return;
    }

    const component = getPanelBoundComponent(panel);
    if (component && typeof component.fitToPanel === "function") {
        component.fitToPanel(panel);
    }
}

function getPanelBoundComponent(panel) {
    if (!panel) {
        return null;
    }

    const components = {
        spectrum: spectrum,
        waveform: waveform,
        vuMeters: vuMeters,
        position: progressBar
    };

    return components[panel.key] || null;
}

function getPanelBoundLayoutItems() {
    const items = [];
    const spectrumPanel = panelLayout.find((panel) => panel.key === "spectrum");
    const waveformPanel = panelLayout.find((panel) => panel.key === "waveform");
    const vuMetersPanel = panelLayout.find((panel) => panel.key === "vuMeters");
    const positionPanel = panelLayout.find((panel) => panel.key === "position");

    if (spectrumPanel && spectrum) {
        items.push({ key: "spectrum", x: spectrum.x, y: spectrum.y, w: spectrum.width * spectrum.zoomfactor, h: spectrum.height * spectrum.zoomfactor });
    }
    if (waveformPanel && waveform) {
        items.push({ key: "waveform", x: waveform.x, y: waveform.y, w: waveform.width * waveform.zoomfactor, h: waveform.height * waveform.zoomfactor });
    }
    if (vuMetersPanel && vuMeters) {
        items.push({ key: "vuMeters", x: vuMeters.x, y: vuMeters.y, w: vuMeters.width * vuMeters.zoomfactor, h: vuMeters.height * vuMeters.zoomfactor });
    }
    if (positionPanel && progressBar) {
        items.push({ key: "progressBar", ...progressBar.getLayoutBounds() });
    }

    return items;
}

function getLayoutEditorStatusText() {
    if (isMovePanelsEnabled() && isMoveElementsEnabled()) {
        return "LAYOUT: move panels and elements";
    }
    if (isMovePanelsEnabled()) {
        return "LAYOUT: move panels";
    }
    if (isMoveElementsEnabled()) {
        return "LAYOUT: move elements";
    }
    return "LAYOUT LOCKED";
}

function movePanelTo(panel, x, y) {
    panel.x = x;
    panel.y = y;
    syncPanelBoundComponent(panel);
}

function getPanelLayout() {
    return panelLayout.map((panel) => ({
        key: panel.key,
        x: panel.x,
        y: panel.y,
        w: panel.w,
        h: panel.h
    }));
}

function logPanelLayout() {
    console.log("Panel layout JSON:", JSON.stringify(getPanelLayout(), null, 2));
}

function isLayoutEditMode() {
    return isMovePanelsEnabled() || isMoveElementsEnabled();
}

function isMovePanelsEnabled() {
    return panelLayoutEditMode || (movePanelsSwitch && movePanelsSwitch.getState());
}

function isMoveElementsEnabled() {
    return moveElementsSwitch && moveElementsSwitch.getState();
}

function setPanelLayoutEditMode(enabled) {
    panelLayoutEditMode = !!enabled;
    if (movePanelsSwitch) {
        movePanelsSwitch.setState(panelLayoutEditMode);
    }
    if (!panelLayoutEditMode) {
        saveLayoutState();
    }
    console.log(`Panel move mode ${panelLayoutEditMode ? "enabled" : "disabled"}.`);
}

window.getPanelLayout = getPanelLayout;
window.logPanelLayout = logPanelLayout;
window.setPanelLayoutEditMode = setPanelLayoutEditMode;

function createMovableItem(key, bounds, moveTo, data = null) {
    return {
        key: key,
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h,
        moveTo: moveTo,
        data: data
    };
}

// Generic adapter for components that know their own layout hitbox.
function createMovableComponentItem(key, component) {
    const bounds = component.getLayoutBounds();
    return createMovableItem(key, bounds, (x, y) => component.moveTo(x, y));
}

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

    items.push(createMovableItem("playButton", playButtonPosition, (x, y) => {
        playButtonPosition.x = x;
        playButtonPosition.y = y;
    }));
    items.push(createMovableItem("pauseButton", pauseButtonPosition, (x, y) => {
        pauseButtonPosition.x = x;
        pauseButtonPosition.y = y;
    }));
    items.push(createMovableItem("stopButton", stopButtonPosition, (x, y) => {
        stopButtonPosition.x = x;
        stopButtonPosition.y = y;
    }));
    items.push(createMovableItem("themeButton", themeButtonPosition, (x, y) => {
        themeButtonPosition.x = x;
        themeButtonPosition.y = y;
    }));
    items.push(createMovableItem("fullscreenButton", fullscreenButtonPosition, (x, y) => {
        fullscreenButtonPosition.x = x;
        fullscreenButtonPosition.y = y;
    }));
    items.push(createMovableItem("logoutButton", logoutButtonPosition, (x, y) => {
        logoutButtonPosition.x = x;
        logoutButtonPosition.y = y;
    }));

    return items;
}

function getMovablePanelItems() {
    return panelLayout.map((panel) => createMovableItem(`panel:${panel.key}`, panel, (x, y, item) => {
        movePanelTo(item.data, x, y);
    }, panel));
}

function handleLayoutItemMousePressed(mx, my) {
    if (!isLayoutEditMode()) {
        return false;
    }

    if (isMovePanelsEnabled()) {
        const panelItems = getMovablePanelItems();
        const headerPanelItem = findPanelHeaderLayoutItem(mx, my, panelItems);
        if (headerPanelItem) {
            startLayoutDrag(headerPanelItem, mx, my);
            return true;
        }
    }

    if (!isMoveElementsEnabled()) {
        return false;
    }

    const items = getMovableLayoutItems();
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (mx >= item.x && mx <= item.x + item.w && my >= item.y && my <= item.y + item.h) {
            startLayoutDrag(item, mx, my);
            return true;
        }
    }

    if (isMovePanelsEnabled()) {
        const panelItems = getMovablePanelItems();
        for (let i = panelItems.length - 1; i >= 0; i--) {
            const item = panelItems[i];
            if (mx >= item.x && mx <= item.x + item.w && my >= item.y && my <= item.y + item.h) {
                startLayoutDrag(item, mx, my);
                return true;
            }
        }
    }

    return false;
}

function findPanelHeaderLayoutItem(mx, my, items) {
    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        if (!item.key || item.key.indexOf("panel:") !== 0) {
            continue;
        }

        const inHeader = mx >= item.x && mx <= item.x + item.w && my >= item.y && my <= item.y + 22;
        if (inHeader) {
            return item;
        }
    }

    return null;
}

function startLayoutDrag(item, mx, my) {
    layoutDragItem = item;
    layoutDragOffsetX = mx - item.x;
    layoutDragOffsetY = my - item.y;
    layoutDragStartX = item.x;
    layoutDragStartY = item.y;
    layoutDragChildren = getLayoutDragChildren(item);
}

function getLayoutDragChildren(item) {
    if (!item.key || item.key.indexOf("panel:") !== 0) {
        return [];
    }

    // Children are selected by persisted ownership, not visual overlap.
    // This avoids accidental captures when panels move over other panels.
    const panelKey = item.key.slice("panel:".length);
    return getMovableLayoutItems()
        .filter((candidate) => layoutItemPanelOwners[candidate.key] === panelKey)
        .map((candidate) => ({
            item: candidate,
            startX: candidate.x,
            startY: candidate.y
        }));
}

function initializeLayoutItemPanelOwners(savedOwners = null) {
    layoutItemPanelOwners = {};
    if (savedOwners && typeof savedOwners === "object") {
        layoutItemPanelOwners = { ...savedOwners };
    }

    for (const item of getMovableLayoutItems()) {
        if (!(item.key in layoutItemPanelOwners)) {
            layoutItemPanelOwners[item.key] = getContainingPanelKey(item);
        }
    }
}

function getContainingPanelKey(item) {
    for (let i = panelLayout.length - 1; i >= 0; i--) {
        const panel = panelLayout[i];
        const panelItem = { x: panel.x, y: panel.y, w: panel.w, h: panel.h };
        if (isLayoutItemInsidePanel(item, panelItem)) {
            return panel.key;
        }
    }

    return null;
}

function updateLayoutItemPanelOwner(item) {
    if (!item || !item.key || item.key.indexOf("panel:") === 0) {
        return;
    }

    layoutItemPanelOwners[item.key] = getContainingPanelKey(item);
}

function isLayoutItemInsidePanel(item, panelItem) {
    const centerX = item.x + item.w / 2;
    const centerY = item.y + item.h / 2;
    return centerX >= panelItem.x &&
        centerX <= panelItem.x + panelItem.w &&
        centerY >= panelItem.y &&
        centerY <= panelItem.y + panelItem.h;
}

function handleLayoutItemMouseDragged(mx, my) {
    if (!isLayoutEditMode() || !layoutDragItem) {
        return false;
    }

    const x = Math.round(constrain(mx - layoutDragOffsetX, 0, width - layoutDragItem.w));
    const y = Math.round(constrain(my - layoutDragOffsetY, 0, height - layoutDragItem.h));
    layoutDragItem.moveTo(x, y, layoutDragItem);
    layoutDragItem.x = x;
    layoutDragItem.y = y;

    if (layoutDragChildren.length > 0) {
        const dx = x - layoutDragStartX;
        const dy = y - layoutDragStartY;
        for (const child of layoutDragChildren) {
            const childX = Math.round(constrain(child.startX + dx, 0, width - child.item.w));
            const childY = Math.round(constrain(child.startY + dy, 0, height - child.item.h));
            child.item.moveTo(childX, childY, child.item);
            child.item.x = childX;
            child.item.y = childY;
        }
    }

    return true;
}

function handleLayoutItemMouseReleased() {
    if (!isLayoutEditMode() || !layoutDragItem) {
        return false;
    }

    console.log("Layout item moved:", layoutDragItem.key, {
        x: layoutDragItem.x,
        y: layoutDragItem.y,
        w: layoutDragItem.w,
        h: layoutDragItem.h
    });
    updateLayoutItemPanelOwner(layoutDragItem);
    logFullLayout();
    layoutDragItem = null;
    layoutDragChildren = [];
    return true;
}

function getFullLayout() {
    return getMovablePanelItems().concat(getMovableLayoutItems()).map((item) => ({
        key: item.key,
        x: Math.round(item.x),
        y: Math.round(item.y),
        w: Math.round(item.w),
        h: Math.round(item.h)
    }));
}

function logFullLayout() {
    console.log("Full layout JSON:", JSON.stringify(getFullLayout(), null, 2));
}

function saveLayoutState() {
    updateStoredSubsonicConfig({
        lyricsVisible: lyricsVisible,
        layout: getFullLayout(),
        layoutOwners: layoutItemPanelOwners
    });
}

function applySavedLayout(layout) {
    if (!Array.isArray(layout)) {
        return;
    }

    let hasThemeButton = false;
    let hasFullscreenButton = false;
    let hasLogoutButton = false;
    let hasMovePanelsSwitch = false;
    let hasMoveElementsSwitch = false;
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
}

function positionLayoutEditSwitchesInPanel(options = { panels: true, elements: true }) {
    const panel = panelLayout.find((candidate) => candidate.key === "layoutTools");
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

function applyLayoutItem(item) {
    const key = item.key;

    if (key && key.indexOf("panel:") === 0) {
        const panelKey = key.slice("panel:".length);
        const panel = panelLayout.find((candidate) => candidate.key === panelKey);
        if (panel) {
            panel.x = item.x;
            panel.y = item.y;
            if (typeof item.w === "number") panel.w = item.w;
            if (typeof item.h === "number") panel.h = item.h;
            if (panel.key === "layoutTools") {
                panel.w = Math.max(panel.w, 104);
                panel.h = Math.max(panel.h, 210);
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
        progressBar: () => { progressBar.moveTo(item.x, item.y); },
        fileBrowser: () => { FileBrowserObj.moveTo(item.x, item.y); },
        queue: () => { SongsListObj.moveTo(item.x, item.y); },
        filtersSwitch: () => { filtersOnOffSwitch.moveTo(item.x, item.y); },
        loopSwitch: () => { loopOnOffSwitch.moveTo(item.x, item.y); },
        lyricsSwitch: () => { lyricsVisibleSwitch.moveTo(item.x, item.y); },
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
        playButton: () => { playButtonPosition.x = item.x; playButtonPosition.y = item.y; },
        pauseButton: () => { pauseButtonPosition.x = item.x; pauseButtonPosition.y = item.y; },
        stopButton: () => { stopButtonPosition.x = item.x; stopButtonPosition.y = item.y; },
        themeButton: () => { themeButtonPosition.x = item.x; themeButtonPosition.y = item.y; },
        fullscreenButton: () => { fullscreenButtonPosition.x = item.x; fullscreenButtonPosition.y = item.y; },
        logoutButton: () => { logoutButtonPosition.x = item.x; logoutButtonPosition.y = item.y; }
    };

    if (itemHandlers[key]) {
        itemHandlers[key]();
    }
}

function positionUserControlButtonsInPanel(options = { theme: true, fullscreen: true, logout: true }) {
    const panel = panelLayout.find((candidate) => candidate.key === "layoutTools");
    if (!panel) {
        return;
    }

    const buttonX = panel.x + Math.max(10, Math.round((panel.w - logoutButtonPosition.w) / 2));
    if (options.theme) {
        themeButtonPosition.x = buttonX;
        themeButtonPosition.y = panel.y + panel.h - 96;
    }
    if (options.fullscreen) {
        fullscreenButtonPosition.x = buttonX;
        fullscreenButtonPosition.y = panel.y + panel.h - 66;
    }
    if (options.logout) {
        logoutButtonPosition.x = buttonX;
        logoutButtonPosition.y = panel.y + panel.h - 36;
    }
}

window.getFullLayout = getFullLayout;
window.logFullLayout = logFullLayout;

// ---------------------------------------------------------------------------
// Hit-Testing Utilities And p5 Events
// ---------------------------------------------------------------------------

function isPointInBox(mx, my, x, y, w, h) {
    return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

function isPointInSwitch(mx, my, switchObj) {
    return isPointInBox(mx, my, switchObj.x, switchObj.y, switchObj.w, switchObj.h);
}

//Add img buttons PLAY PAUSE STOP (to be refreshed in draw())
function imgButtons(){

    //Playlist buttons
    playPlaylistImg.position(playButtonPosition.x,playButtonPosition.y);
    pausePlaylistImg.position(pauseButtonPosition.x,pauseButtonPosition.y);
    stopPlayListImg.position(stopButtonPosition.x,stopButtonPosition.y);

}


//Handles mouse click events
function mousePressed(){
    // Editing switches are always handled first, even when the rest of the UI
    // is in layout mode.
    if (isPointInSwitch(mouseX, mouseY, movePanelsSwitch)) {
        movePanelsSwitch.handleMouse(mouseX, mouseY);
        panelLayoutEditMode = false;
        console.log(`Panel movement ${movePanelsSwitch.getState() ? "enabled" : "disabled"}.`);
        if (!isLayoutEditMode()) saveLayoutState();
        return;
    }

    if (isPointInSwitch(mouseX, mouseY, moveElementsSwitch)) {
        moveElementsSwitch.handleMouse(mouseX, mouseY);
        console.log(`Element movement ${moveElementsSwitch.getState() ? "enabled" : "disabled"}.`);
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

    if (!isLayoutEditMode() && handleThemeButton(mouseX, mouseY)) {
        return;
    }

    if (!isLayoutEditMode() && handleFullscreenButton(mouseX, mouseY)) {
        return;
    }

    if (!isLayoutEditMode() && handleLogoutButton(mouseX, mouseY)) {
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

    progressBar.handleMouse(mouseX, mouseY);//Check if the progress bar was clicked

    FileBrowserObj.handleMouse(mouseX, mouseY); //handle mouse click on file browser

    const queuedSongIndex = SongsListObj.getItemIndexAt(mouseX, mouseY);
    if (queuedSongIndex !== -1) {
        PlayerObj.playSongByPlaylistId(queuedSongIndex);
        return;
    }

    SongsListObj.handleMouse(mouseX, mouseY); //handle mouse click on playlist

    filtersOnOffSwitch.handleMouse(mouseX, mouseY); //handle mouse click on switch

    loopOnOffSwitch.handleMouse(mouseX, mouseY); //handle mouse click on switch

    volSlider.handleMouse(mouseX, mouseY); //handle mouse click on volume slider

    balanceSlider.handleMouse(mouseX, mouseY); //handle mouse click on balance slider
    rateSlider.handleMouse(mouseX, mouseY); //handle mouse click on rate slider
    bassSlider.handleMouse(mouseX, mouseY); //handle mouse click on bass slider
    midSlider.handleMouse(mouseX, mouseY); //handle mouse click on mid slider
    trebleSlider.handleMouse(mouseX, mouseY); //handle mouse click on treble slider
    reverbSlider.handleMouse(mouseX, mouseY); //handle mouse click on reverb slider
    reverbVolSlider.handleMouse(mouseX, mouseY); //handle mouse click on reverb volume slider
}


function mouseDragged(){
    if (handlePanelResizeMouseDragged(mouseX, mouseY)) {
        return;
    }

    if (handleLayoutItemMouseDragged(mouseX, mouseY)) {
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
        progressBar.resetChanged(); //reset the changed flag
    }

    FileBrowserObj.handleMouseReleased(); //handle mouse release on file browser
    SongsListObj.handleMouseReleased(); //handle mouse release on playlist

    //Set loop state in player
    PlayerObj.setLoop(loopOnOffSwitch.getState()); //set loop state in player

    volSlider.mouseReleased(); //handle mouse release on volume slider

    balanceSlider.mouseReleased(); //handle mouse release on balance slider
    rateSlider.mouseReleased(); //handle mouse release on rate slider
    bassSlider.mouseReleased(); //handle mouse release on bass slider
    midSlider.mouseReleased(); //handle mouse release on mid slider
    trebleSlider.mouseReleased(); //handle mouse release on treble slider
    reverbSlider.mouseReleased(); //handle mouse release on reverb slider
    reverbVolSlider.mouseReleased(); //handle mouse release on reverb volume slider
}

function mouseWheel(event) {
    if (isLayoutEditMode()) {
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

function windowResized() {
    resizeCanvasToAvailableSpace();
}


function touchStarted(){
    mousePressed();
}

function touchEnded(){
    mouseReleased();
}

// ---------------------------------------------------------------------------
// Audio Routing And Control Application
// ---------------------------------------------------------------------------

function disconnectAudioNode(node){
    try{
        if(node){
            node.disconnect();
        }
    }catch(error){
        // Some p5/WebAudio nodes throw when already disconnected.
    }
}

function configureAudioRouting(force=false){
    if(!song || !bassFilter || !midFilter || !trebleFilter || !bassGain || !midGain || !trebleGain){
        return;
    }

    const filtersState = filtersOnOffSwitch ? filtersOnOffSwitch.getState() : filtersON;
    if(!force && routedSong === song && routedFiltersState === filtersState){
        return;
    }

    setupFilters(filtersState);
    routedSong = song;
    routedFiltersState = filtersState;
    resetAppliedSliderValues();
}

function resetAppliedSliderValues(){
    lastVolumeValue = null;
    lastPanValue = null;
    lastRateValue = null;
    lastBassValue = null;
    lastMidValue = null;
    lastTrebleValue = null;
    lastReverbValue = null;
    lastReverbVolValue = null;
}

function valueChanged(current, previous){
    return previous === null || Math.abs(current - previous) > 0.0001;
}

/**
 * Sets up the audio filters and connects them to the song.
 * This should run only when the current song or the filter on/off state changes.
 *
 * @function
 * @global
 */
function setupFilters(filtersON=true){

    disconnectAudioNode(song);
    disconnectAudioNode(bassFilter);
    disconnectAudioNode(midFilter);
    disconnectAudioNode(trebleFilter);
    disconnectAudioNode(bassGain);
    disconnectAudioNode(midGain);
    disconnectAudioNode(trebleGain);
    disconnectAudioNode(reverb);

    // Recreate p5.Reverb when rebuilding the graph, so process() cannot stack
    // hidden wet paths on the same source after repeated effect toggles.
    reverb = new p5.Reverb();

    if(filtersON){
        // The stream is split into three parallel bands that return to master.
        // Reverb is applied as an additional send on the current song.
        //Connect song to filters
        song.connect(bassFilter); //connect song to bass filter
        bassFilter.connect(bassGain); //connect bass filter to bass gain
        bassGain.connect(); //connect bass gain to master output

        song.connect(midFilter); //connect song to mid filter
        midFilter.connect(midGain); //connect mid filter to mid gain
        midGain.connect(); //connect mid gain to master output

        song.connect(trebleFilter); //connect song to treble filter
        trebleFilter.connect(trebleGain); //connect treble filter to treble gain
        trebleGain.connect(); //connect treble gain to master output

        reverb.process(song, 3, 2); //apply reverb to song
        reverb.drywet(reverbSlider ? reverbSlider.getValue() : 0);
        reverb.amp(reverbVolSlider ? reverbVolSlider.getValue() : 0);
    }else{
        //Connect song to master output
        song.connect(); //connect song to master output
        reverb.drywet(0);
        reverb.amp(0);
    }
}


//Prints text labels
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
// Metadata, Lyrics, And Playback Controls
// ---------------------------------------------------------------------------

//Loads lyrics from server and displays them in the dedicated divs below the player
//pretty prone to get wrong lyrics, though. This is a server fault, not this script
function loadLyrics(artist, title){
    var lyrics = SubsonicObj.getLyrics(artist, title);

    lyrics.then((res) => {

                //console.log(res, artist,title);
                select('#lyrics').html("<pre>"+(res || "")+"</pre>");
                select('#title').html(title || "");

        });

}

function applyPlayingInfo(songData) {
    if (!songData || !playingInfo) {
        return;
    }

    playingInfo.setSong(songData);

    if (songData.artist && songData.title) {
        loadLyrics(songData.artist, songData.title);
    }
}

function handleSongLoaded(id, playlistSong) {
    lastPlayingInfoSongId = id;

    applyPlayingInfo(playlistSong);

    if (!SubsonicObj || !id) {
        return;
    }

    SubsonicObj.getSongInfo(id).then((songInfo) => {
        if (id !== lastPlayingInfoSongId) {
            return;
        }

        applyPlayingInfo(songInfo || playlistSong);
    });
}





// Audio setters apply changes only when the slider actually changed. This
// reduces per-frame work and avoids clicks from reprogramming parameters.
// Set volume using slider
function setVolume(){
    var volval = volSlider.getValue();
    if(!song || !valueChanged(volval, lastVolumeValue)){
        return;
    }

    var volume = -Math.log10(1-volval*(0.9)); //convert to logarithmic scale
    song.setVolume(volume, 0.03);
    lastVolumeValue = volval;
}


//Set Pan
function setPan(){
    const panVal = balanceSlider.getValue();
    if(!song || !valueChanged(panVal, lastPanValue)){
        return;
    }

    song.pan(panVal);
    lastPanValue = panVal;
}

//Set Rate
function setRate(){
    const rateVal = rateSlider.getValue();
    if(!song || !valueChanged(rateVal, lastRateValue)){
        return;
    }

    song.rate(rateVal);
    lastRateValue = rateVal;
}

function applyFilterValues(){
    const bassVal = bassSlider.getValue();
    const midVal = midSlider.getValue();
    const trebleVal = trebleSlider.getValue();
    const reverbVal = reverbSlider.getValue();
    const reverbVolVal = reverbVolSlider.getValue();

    if(valueChanged(bassVal, lastBassValue)){
        bassGain.amp(bassVal, 0.03);
        lastBassValue = bassVal;
    }

    if(valueChanged(midVal, lastMidValue)){
        midGain.amp(midVal, 0.03);
        lastMidValue = midVal;
    }

    if(valueChanged(trebleVal, lastTrebleValue)){
        trebleGain.amp(trebleVal, 0.03);
        lastTrebleValue = trebleVal;
    }

    if(valueChanged(reverbVal, lastReverbValue)){
        reverb.drywet(reverbVal);
        lastReverbValue = reverbVal;
    }

    if(valueChanged(reverbVolVal, lastReverbVolValue)){
        reverb.amp(reverbVolVal, 0.03);
        lastReverbVolValue = reverbVolVal;
    }
}


//Toggle loop mode for the song
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
 * Will read playlists from the subsonicOb object
 * and add them to the dropdown
 * @function
 * @global
 * @returns {void}
 */
function getPlaylists(){
    var list =  SubsonicObj.getPlaylists();

    list.then((ret)=>{
        if(!Array.isArray(ret)){
            console.log("No playlists available");
            return;
        }

        //add items to dropdown
        for(let item of ret){
            if(item && item.name && item.id){
                playListSelect.option(item.name, item.id);
            }
            //console.log("Added playlist: "+item['name']);
        }
    });

}
// Load a remote playlist into the local queue and repopulate the song selector.
 /**
 * Handles the event when a playlist is selected from the dropdown.
 * using the SubsonicObj object to get the playlist data
 * fills sons selector with the songs in the playlist
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
