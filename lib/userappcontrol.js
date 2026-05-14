/**
 * Application-level controls for the USER CONTROL panel.
 *
 * UserAppControl owns the theme, fullscreen, and logout buttons. The sketch
 * passes in callbacks for app-specific actions so this module can manage
 * drawing, hit-testing, layout metadata, and fullscreen listener state without
 * knowing how configuration storage or canvas resizing are implemented.
 */
class UserAppControl {
    constructor(callbacks = {}, positions = {}) {
        this.callbacks = callbacks;
        this.fullscreenListenerAttached = false;

        // Button keys are persisted in saved layouts. Keep these stable.
        this.buttons = [
            this.createButtonConfig("themeButton", "CYBER", positions.themeButton || { x: 34, y: 141, w: 66, h: 22 }),
            this.createButtonConfig("fullscreenButton", "FULL", positions.fullscreenButton || { x: 34, y: 167, w: 66, h: 22 }),
            this.createButtonConfig("logoutButton", "LOGOUT", positions.logoutButton || { x: 33, y: 208, w: 66, h: 22 })
        ];
    }

    createButtonConfig(key, label, bounds) {
        return {
            key,
            label,
            x: bounds.x,
            y: bounds.y,
            w: bounds.w,
            h: bounds.h
        };
    }

    attachFullscreenResizeListener() {
        if (this.fullscreenListenerAttached) {
            return;
        }

        document.addEventListener("fullscreenchange", () => {
            if (this.callbacks.onFullscreenChanged) {
                this.callbacks.onFullscreenChanged();
            }
        });
        this.fullscreenListenerAttached = true;
    }

    draw() {
        this.setButtonLabel("themeButton", currentThemeName.toUpperCase());
        this.setButtonLabel("fullscreenButton", this.isFullscreenActive() ? "WINDOW" : "FULL");

        for (const button of this.buttons) {
            this.drawButton(button, this.contains(button, mouseX, mouseY));
        }
    }

    drawButton(button, hover) {
        push();
        stroke(hover ? color(UI.pink[0], UI.pink[1], UI.pink[2]) : color(UI.amber[0], UI.amber[1], UI.amber[2], 170));
        strokeWeight(1);
        fill(hover ? color(UI.pink[0], UI.pink[1], UI.pink[2], 44) : color(UI.panelAlt[0], UI.panelAlt[1], UI.panelAlt[2], 230));
        rect(button.x, button.y, button.w, button.h, 4);

        noStroke();
        fill(UI.text[0], UI.text[1], UI.text[2]);
        textSize(10);
        textAlign(CENTER, CENTER);
        text(button.label, button.x + button.w / 2, button.y + button.h / 2);
        pop();
    }

    handleMouse(mx, my) {
        if (this.handleButton(mx, my, "themeButton", () => this.callbacks.onTheme && this.callbacks.onTheme())) {
            return true;
        }
        if (this.handleButton(mx, my, "fullscreenButton", () => this.toggleFullscreen())) {
            return true;
        }
        if (this.handleButton(mx, my, "logoutButton", () => this.callbacks.onLogout && this.callbacks.onLogout())) {
            return true;
        }

        return false;
    }

    handleButton(mx, my, key, action) {
        const button = this.getButton(key);
        if (!button || !this.contains(button, mx, my)) {
            return false;
        }

        action();
        return true;
    }

    async toggleFullscreen() {
        try {
            if (this.isFullscreenActive()) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
            if (this.callbacks.onFullscreenChanged) {
                setTimeout(this.callbacks.onFullscreenChanged, 80);
            }
        } catch (error) {
            console.error("Fullscreen toggle failed:", error);
        }
    }

    isFullscreenActive() {
        return !!document.fullscreenElement;
    }

    getLayoutItems() {
        // Return plain snapshots so the layout manager cannot mutate internal
        // button objects directly. Movement goes through moveButtonTo().
        return this.buttons.map((button) => ({
            key: button.key,
            x: button.x,
            y: button.y,
            w: button.w,
            h: button.h
        }));
    }

    moveButtonTo(key, x, y) {
        const button = this.getButton(key);
        if (!button) {
            return;
        }

        button.x = x;
        button.y = y;
    }

    fitToPanel(panel, options = { theme: true, fullscreen: true, logout: true }) {
        const logoutButton = this.getButton("logoutButton");
        if (!panel || !logoutButton) {
            return;
        }

        // Stack app buttons near the bottom of USER CONTROL, centered in the
        // panel. Existing saved layouts can opt out per button.
        const buttonX = panel.x + Math.max(10, Math.round((panel.w - logoutButton.w) / 2));
        if (options.theme) {
            this.moveButtonTo("themeButton", buttonX, panel.y + panel.h - 96);
        }
        if (options.fullscreen) {
            this.moveButtonTo("fullscreenButton", buttonX, panel.y + panel.h - 66);
        }
        if (options.logout) {
            this.moveButtonTo("logoutButton", buttonX, panel.y + panel.h - 36);
        }
    }

    setButtonLabel(key, label) {
        const button = this.getButton(key);
        if (button) {
            button.label = label;
        }
    }

    getButton(key) {
        return this.buttons.find((button) => button.key === key);
    }

    contains(button, mx, my) {
        return mx >= button.x && mx <= button.x + button.w && my >= button.y && my <= button.y + button.h;
    }
}
