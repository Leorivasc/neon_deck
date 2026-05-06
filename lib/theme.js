var THEMES = {
    cyber: {
        name: "cyber",
        bg: [7, 10, 18],
        panel: [13, 18, 31],
        panelAlt: [18, 26, 43],
        field: [16, 24, 39],
        surface: [3, 7, 14],
        line: [0, 229, 255],
        pink: [255, 43, 214],
        waveformTrace: [255, 91, 226],
        amber: [246, 200, 95],
        text: [237, 247, 255],
        muted: [143, 167, 184],
        gridAlpha: 6,
        shadow: "0 22px 70px rgba(0,0,0,0.52), 0 0 34px rgba(0,229,255,0.12)"
    },
    stellar: {
        name: "stellar",
        bg: [236, 241, 248],
        panel: [248, 250, 255],
        panelAlt: [226, 235, 246],
        field: [224, 234, 246],
        surface: [218, 229, 242],
        line: [91, 169, 205],
        pink: [207, 140, 196],
        waveformTrace: [151, 48, 136],
        amber: [219, 176, 107],
        text: [35, 47, 66],
        muted: [103, 121, 144],
        gridAlpha: 24,
        shadow: "0 20px 60px rgba(65,86,112,0.20), 0 0 28px rgba(91,169,205,0.15)"
    }
};

var UI = { ...THEMES.cyber };
var currentThemeName = "cyber";

var Theme = {
    listeners: [],

    getTheme(name) {
        return THEMES[name] || THEMES.cyber;
    },

    set(name, persist = false) {
        currentThemeName = THEMES[name] ? name : "cyber";
        UI = { ...this.getTheme(currentThemeName) };
        this.applyToPage();
        this.notify();

        if (persist && typeof updateStoredSubsonicConfig === "function") {
            updateStoredSubsonicConfig({ theme: currentThemeName });
        }
    },

    toggle() {
        this.set(currentThemeName === "cyber" ? "stellar" : "cyber", true);
    },

    onChange(callback) {
        if (typeof callback === "function") {
            this.listeners.push(callback);
        }
    },

    notify() {
        for (const listener of this.listeners) {
            listener(UI, currentThemeName);
        }
    },

    applyToPage() {
        const root = document.documentElement;
        root.style.setProperty("--bg", rgbString(UI.bg));
        root.style.setProperty("--panel", rgbaString(UI.panel, 0.92));
        root.style.setProperty("--panel-soft", rgbaString(UI.panelAlt, 0.88));
        root.style.setProperty("--line", rgbaString(UI.line, 0.36));
        root.style.setProperty("--cyan", cssHex(UI.line));
        root.style.setProperty("--pink", cssHex(UI.pink));
        root.style.setProperty("--amber", cssHex(UI.amber));
        root.style.setProperty("--text", cssHex(UI.text));
        root.style.setProperty("--muted", cssHex(UI.muted));
        root.style.setProperty("--field", cssHex(UI.field));
        root.style.setProperty("--line-soft", rgbaString(UI.line, currentThemeName === "cyber" ? 0.16 : 0.24));
        root.style.setProperty("--pink-soft", rgbaString(UI.pink, currentThemeName === "cyber" ? 0.11 : 0.18));
        root.style.setProperty("--shell-shadow", UI.shadow);
        document.body.dataset.theme = currentThemeName;
    }
};

function setTheme(name, persist = false) {
    Theme.set(name, persist);
}

function toggleTheme() {
    Theme.toggle();
}

function rgbString(value) {
    return `rgb(${value[0]}, ${value[1]}, ${value[2]})`;
}

function rgbaString(value, alpha) {
    return `rgba(${value[0]}, ${value[1]}, ${value[2]}, ${alpha})`;
}

function cssHex(value) {
    return "#" + value.map((part) => Math.max(0, Math.min(255, part)).toString(16).padStart(2, "0")).join("");
}
