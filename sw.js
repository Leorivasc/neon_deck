const CACHE_NAME = "subsonic-neon-deck-v3";

// PWA app shell only. Subsonic streams and authenticated REST responses are
// intentionally excluded so credentials, audio, and library data stay network
// controlled by the normal player flow.
const APP_SHELL_URLS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./assets/dot.mp3",
    "./assets/back.png",
    "./assets/eject.png",
    "./assets/fastforward.png",
    "./assets/forward.png",
    "./assets/next.png",
    "./assets/pause.png",
    "./assets/play.png",
    "./assets/prev.png",
    "./assets/rewind.png",
    "./assets/stop.png",
    "./assets/icons/neon-deck.svg",
    "./lib/p5.js",
    "./lib/p5.sound.js",
    "./lib/theme.js",
    "./lib/subsonic.js",
    "./lib/textlistbox.js",
    "./lib/telemetrylog.js",
    "./lib/telemetrypanel.js",
    "./lib/filebrowser.js",
    "./lib/audioeffects.js",
    "./lib/layoutmanager.js",
    "./lib/playercontrol.js",
    "./lib/userappcontrol.js",
    "./lib/sketch.js",
    "./lib/playlist.js",
    "./lib/progressbar.js",
    "./lib/waveform.js",
    "./lib/spectrum.js",
    "./lib/vumeters.js",
    "./lib/vectorscope.js",
    "./lib/playinginfo.js",
    "./lib/player.js",
    "./lib/switch.js",
    "./lib/slider_v.js",
    "./lib/slider_h.js"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);
    if (url.origin !== self.location.origin || isSubsonicOrAudioRequest(request, url)) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(networkFirst(request, "./index.html"));
        return;
    }

    event.respondWith(cacheFirst(request));
});

function isSubsonicOrAudioRequest(request, url) {
    return request.destination === "audio" ||
        url.pathname.includes("/rest/") ||
        url.pathname.includes("/stream") ||
        url.pathname.includes("/download") ||
        url.pathname.includes("/getCoverArt");
}

function cacheFirst(request) {
    return caches.match(request)
        .then((cached) => cached || fetch(request));
}

function networkFirst(request, fallbackUrl) {
    return fetch(request)
        .catch(() => caches.match(fallbackUrl));
}
