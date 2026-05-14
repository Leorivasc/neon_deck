/**
 * Panel-bound renderer for the DATA FEED. It uses TextListBox so this log can
 * become the first reusable text-interface surface in the deck.
 */
class TelemetryPanel {
    /**
     * Creates the panel-bound DATA FEED renderer.
     * @param {TelemetryLog} telemetryLog - Shared app telemetry buffer.
     */
    constructor(telemetryLog) {
        this.telemetryLog = telemetryLog;
        this.x = 0;
        this.y = 0;
        this.w = 260;
        this.h = 120;
        this.inactive = false;
        this.textBox = new TextListBox(0, 0, 260, 120, {
            itemHeight: 18,
            fontSize: 11,
            autoStickToBottom: true
        });
    }

    /**
     * Renders current telemetry entries into the internal TextListBox.
     */
    draw() {
        if (this.inactive || !this.telemetryLog) {
            return;
        }

        // Convert entries to draw-ready rows here so TextListBox stays generic.
        const items = this.telemetryLog.getEntries().map((entry) => ({
            text: this.formatEntry(entry),
            color: this.getEntryColor(entry)
        }));
        this.textBox.setItems(items);
        this.textBox.draw();
    }

    /**
     * Formats one telemetry entry as the visible log line.
     */
    formatEntry(entry) {
        const stamp = entry.fullTimestamp
            ? this.formatDateTime(entry.timestamp)
            : this.formatTime(entry.timestamp);
        return `[${stamp}] [${entry.source}] ${entry.message}`;
    }

    /**
     * Formats a timestamp with date and time for SYSTEM-level events.
     */
    formatDateTime(date) {
        return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())} ${this.formatTime(date)}`;
    }

    /**
     * Formats a compact time-only timestamp for high-frequency module events.
     */
    formatTime(date) {
        return `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}:${this.pad(date.getSeconds())}`;
    }

    /**
     * Pads date/time numbers to two digits.
     */
    pad(value) {
        return String(value).padStart(2, "0");
    }

    /**
     * Maps event level/source into the current theme palette.
     */
    getEntryColor(entry) {
        if (entry.level === "error") {
            return UI.pink;
        }
        if (entry.level === "warn") {
            return UI.amber;
        }
        if (entry.source === "SYSTEM") {
            return UI.line;
        }
        return UI.text;
    }

    /**
     * Fits the text viewport inside the owning panel body.
     */
    fitToPanel(panel) {
        this.x = panel.x + 12;
        this.y = panel.y + 30;
        this.w = Math.max(120, panel.w - 24);
        this.h = Math.max(60, panel.h - 42);
        this.textBox.setBounds(this.x, this.y, this.w, this.h);
    }

    /**
     * Allows LayoutManager/Skinny-style filtering to hide this panel if needed.
     */
    setInactive(value) {
        this.inactive = !!value;
    }

    /**
     * Reports whether the panel is currently hidden/inactive.
     */
    isInactive() {
        return this.inactive;
    }

    /**
     * Minimum panel size used by LayoutManager resize handles.
     */
    getMinPanelSize() {
        return { w: 260, h: 110 };
    }

    /**
     * Delegates scrollbar press handling to the reusable text box.
     */
    handleMousePressed(mx, my) {
        return this.textBox.handleMousePressed(mx, my);
    }

    /**
     * Delegates scrollbar drag handling to the reusable text box.
     */
    handleMouseDrag(mx, my) {
        return this.textBox.handleMouseDrag(mx, my);
    }

    /**
     * Ends any active internal scrollbar drag.
     */
    handleMouseRelease() {
        this.textBox.handleMouseRelease();
    }

    /**
     * Scrolls DATA FEED history without allowing browser page scroll.
     */
    handleWheel(delta) {
        this.textBox.handleWheel(delta);
    }

    /**
     * Tests whether a pointer event belongs to the text viewport.
     */
    contains(mx, my) {
        return this.textBox.contains(mx, my);
    }
}
