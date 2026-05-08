/**
 * Transport controls for the player.
 *
 * This class owns the p5-created DOM image buttons used by the TRANSPORT
 * panel, including their positions, theme styling, pointer mode, and layout
 * metadata. The main sketch wires the callbacks and treats this as one module.
 */
class PlayerControl {
    constructor(playerObj, parentId, positions = {}) {
        this.playerObj = playerObj;
        this.parentId = parentId;
        this.buttonSize = 22;

        this.buttons = [
            this.createButtonConfig("prevButton", "assets/prev.png", "Previous", () => this.playerObj.playPrevious(), positions.prevButton || { x: 272, y: 252 }),
            this.createButtonConfig("playButton", "assets/play.png", "Play", () => this.playerObj.playSong(), positions.playButton || { x: 298, y: 252 }),
            this.createButtonConfig("pauseButton", "assets/pause.png", "Pause", () => this.playerObj.pauseSong(), positions.pauseButton || { x: 324, y: 252 }),
            this.createButtonConfig("stopButton", "assets/stop.png", "Stop", () => this.playerObj.stopSong(), positions.stopButton || { x: 350, y: 252 }),
            this.createButtonConfig("nextButton", "assets/next.png", "Next", () => this.playerObj.playNext(), positions.nextButton || { x: 376, y: 252 })
        ];

        this.createDomButtons();
    }

    createButtonConfig(key, asset, label, onPress, position) {
        return {
            key,
            asset,
            label,
            onPress,
            x: position.x,
            y: position.y,
            w: this.buttonSize,
            h: this.buttonSize,
            element: null
        };
    }

    createDomButtons() {
        for (const button of this.buttons) {
            button.element = createImg(button.asset, button.label);
            button.element.parent(this.parentId);
            button.element.mousePressed(button.onPress);
            this.styleButton(button.element);
        }
    }

    applyTheme() {
        for (const button of this.buttons) {
            if (button.element) {
                this.styleButton(button.element);
            }
        }
    }

    styleButton(element) {
        const cyberIconFilter = "invert(0%) sepia(91%) saturate(4000%) hue-rotate(135deg) brightness(300%) contrast(105%)";
        element.style("width", `${this.buttonSize}px`);
        element.style("height", `${this.buttonSize}px`);
        element.style("padding", "3px");
        element.style("border", `1px solid ${rgbaString(UI.line, 0.48)}`);
        element.style("border-radius", "4px");
        element.style("background", rgbaString(UI.panel, 0.92));
        element.style("box-shadow", currentThemeName === "cyber"
            ? `0 0 14px ${rgbaString(UI.line, 0.28)}, inset 0 0 10px ${rgbaString(UI.line, 0.12)}`
            : `0 0 14px ${rgbaString(UI.line, 0.16)}`);
        element.style("filter", currentThemeName === "cyber"
            ? `${cyberIconFilter} drop-shadow(0 0 5px ${rgbaString(UI.line, 0.85)})`
            : `drop-shadow(0 0 4px ${rgbaString(UI.line, 0.35)})`);
        element.style("cursor", "pointer");
    }

    draw() {
        for (const button of this.buttons) {
            if (button.element) {
                button.element.position(button.x, button.y);
            }
        }
    }

    setPointerMode(pointerMode) {
        for (const button of this.buttons) {
            if (button.element) {
                button.element.style("pointer-events", pointerMode);
            }
        }
    }

    getLayoutItems() {
        return this.buttons.map((button) => ({
            key: button.key,
            x: button.x,
            y: button.y,
            w: button.w,
            h: button.h
        }));
    }

    moveButtonTo(key, x, y) {
        const button = this.buttons.find((candidate) => candidate.key === key);
        if (!button) {
            return;
        }

        button.x = x;
        button.y = y;
    }

    fitToPanel(panel) {
        const gap = 4;
        const totalWidth = this.buttons.reduce((sum, button) => sum + button.w, 0) + gap * (this.buttons.length - 1);
        let x = Math.round(panel.x + (panel.w - totalWidth) / 2);
        const y = panel.y + 35;

        for (const button of this.buttons) {
            button.x = x;
            button.y = y;
            x += button.w + gap;
        }
    }
}
