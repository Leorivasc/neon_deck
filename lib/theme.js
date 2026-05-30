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
        transportIconFilter: "invert(0%) sepia(91%) saturate(4000%) hue-rotate(135deg) brightness(300%) contrast(105%)",
        shadow: "0 22px 70px rgba(0,0,0,0.52), 0 0 34px rgba(0,229,255,0.12)"
    },
    icecream: {
        name: "icecream",
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
        transportIconFilter: "",
        shadow: "0 20px 60px rgba(65,86,112,0.20), 0 0 28px rgba(91,169,205,0.15)"
    },
    fallout: {
        name: "fallout",
        bg: [11, 9, 6],
        panel: [21, 16, 10],
        panelAlt: [33, 23, 12],
        field: [28, 20, 12],
        surface: [8, 7, 5],
        line: [255, 176, 0],
        pink: [68, 255, 153],
        waveformTrace: [255, 106, 0],
        amber: [255, 176, 0],
        text: [255, 241, 214],
        muted: [191, 174, 145],
        gridAlpha: 10,
        transportIconFilter: "sepia(0%) saturate(1400%) hue-rotate(408deg) brightness(500%) contrast(106%)",
        shadow: "0 22px 70px rgba(0,0,0,0.58), 0 0 34px rgba(255,176,0,0.13)"
    },
    submarine: {
        name: "submarine",
        bg: [0, 10, 32],
        panel: [4, 28, 58],
        panelAlt: [7, 43, 78],
        field: [3, 24, 50],
        surface: [0, 8, 24],
        panelFrame: [255, 255, 0],
        line: [255,255,0],
        pink: [87, 255, 0],
        waveformTrace: [0, 255, 0],
        amber: [0, 224, 96],
        text: [226, 246, 239],
        muted: [116, 186, 164],
        gridAlpha: 12,
        transportIconFilter: "sepia(0%) saturate(1800%) hue-rotate(250deg) brightness(230%) contrast(108%)",
        shadow: "0 22px 70px rgba(0,0,0,0.62), 0 0 34px rgba(0,255,72,0.16)"
    },
    matrix: {
        name: "matrix",
        bg: [1, 8, 4],
        panel: [3, 18, 9],
        panelAlt: [6, 31, 14],
        field: [2, 24, 10],
        surface: [0, 5, 2],
        panelFrame: [0, 255, 88],
        line: [0, 255, 88],
        pink: [184, 255, 138],
        waveformTrace: [0, 255, 88],
        amber: [210, 255, 107],
        text: [220, 255, 216],
        muted: [96, 178, 111],
        gridAlpha: 14,
        transportIconFilter: "sepia(100%) saturate(1800%) hue-rotate(62deg) brightness(190%) contrast(112%)",
        shadow: "0 22px 70px rgba(0,0,0,0.68), 0 0 38px rgba(0,255,88,0.18)"
    },
    volcano: {
        name: "volcano",
        bg: [20, 3, 0],
        panel: [54, 12, 0],
        panelAlt: [102, 32, 0],
        field: [74, 20, 0],
        surface: [14, 2, 0],
        panelFrame: [255, 190, 0],
        line: [255, 132, 0],
        pink: [255, 48, 0],
        waveformTrace: [255, 214, 0],
        amber: [255, 255, 0],
        text: [255, 246, 204],
        muted: [238, 164, 58],
        gridAlpha: 18,
        transportIconFilter: "sepia(100%) saturate(2800%) hue-rotate(2deg) brightness(220%) contrast(110%)",
        shadow: "0 22px 70px rgba(0,0,0,0.70), 0 0 48px rgba(255,190,0,0.26)"
    }
};

var THEME_ALIASES = {
    amber: "fallout"
};
var THEME_ORDER = ["cyber", "icecream", "fallout", "submarine", "matrix", "volcano"];
var DEFAULT_THEME_NAME = "submarine";
var UI = { ...THEMES[DEFAULT_THEME_NAME] };
var currentThemeName = DEFAULT_THEME_NAME;

var Theme = {
    listeners: [],

    getTheme(name) {
        const normalizedName = THEME_ALIASES[name] || name;
        return THEMES[normalizedName] || THEMES[DEFAULT_THEME_NAME];
    },

    set(name, persist = false) {
        const normalizedName = THEME_ALIASES[name] || name;
        currentThemeName = THEMES[normalizedName] ? normalizedName : DEFAULT_THEME_NAME;
        UI = { ...this.getTheme(currentThemeName) };
        this.applyToPage();
        this.notify();

        if (persist && typeof updateStoredSubsonicConfig === "function") {
            updateStoredSubsonicConfig({ theme: currentThemeName });
        }
    },

    toggle() {
        const currentIndex = THEME_ORDER.indexOf(currentThemeName);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % THEME_ORDER.length : 0;
        this.set(THEME_ORDER[nextIndex], true);
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
        if (!root) {
            return;
        }

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
        const darkTheme = currentThemeName === "cyber" || currentThemeName === "fallout" || currentThemeName === "submarine" || currentThemeName === "matrix" || currentThemeName === "volcano";
        root.style.setProperty("--line-soft", rgbaString(UI.line, darkTheme ? 0.16 : 0.24));
        root.style.setProperty("--pink-soft", rgbaString(UI.pink, darkTheme ? 0.11 : 0.18));
        root.style.setProperty("--shell-shadow", UI.shadow);
        if (document.body) {
            document.body.dataset.theme = currentThemeName;
        }
    }
};

Theme.applyToPage();

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
