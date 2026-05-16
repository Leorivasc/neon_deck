/**
 * Central event buffer for the deck. Producers emit source/message pairs; the
 * DATA FEED panel decides how to present the resulting entries.
 */
class TelemetryLog {
    /**
     * Creates a bounded in-memory event log.
     * @param {number} maxEntries - Maximum entries retained for rendering.
     */
    constructor(maxEntries = 160) {
        this.maxEntries = maxEntries;
        this.entries = [];
        // Memory optimization: entries are already bounded, but throttle/dedupe
        // keys also need a cap because track-specific keys change over time.
        this.maxTrackedKeys = Math.max(64, maxEntries * 2);
        // Tracks last accepted event per key so noisy metrics can be throttled
        // or deduplicated without making producers manage that state.
        this.lastByKey = new Map();
    }

    /**
     * Adds a telemetry event if it passes throttle and dedupe rules.
     * @param {string} source - Short source label, for example SYSTEM or AUDIO.
     * @param {string} message - Message body without timestamp or source label.
     * @param {Object} options - Optional key, throttleMs, dedupe, level, fullTimestamp.
     * @returns {boolean} True when the entry was accepted into the buffer.
     */
    emit(source, message, options = {}) {
        const now = Date.now();
        const normalizedSource = String(source || "SYSTEM").toUpperCase();
        const normalizedMessage = String(message || "");
        const key = options.key || `${normalizedSource}:${normalizedMessage}`;
        const previous = this.lastByKey.get(key);

        // Throttle by logical key, not by exact message, so changing metric
        // values still cannot flood the DATA FEED every animation frame.
        if (previous && options.throttleMs && now - previous.time < options.throttleMs) {
            return false;
        }

        // Dedupe suppresses repeated state messages such as unchanged FX values.
        if (previous && options.dedupe && previous.message === normalizedMessage) {
            return false;
        }

        const entry = {
            timestamp: new Date(now),
            source: normalizedSource,
            message: normalizedMessage,
            level: options.level || "info",
            // SYSTEM entries anchor the session timeline with full date/time.
            // Other sources stay compact and show only time in TelemetryPanel.
            fullTimestamp: options.fullTimestamp === true || normalizedSource === "SYSTEM"
        };

        this.entries.push(entry);
        // Trim from the front so the newest entries are always retained.
        if (this.entries.length > this.maxEntries) {
            this.entries.shift();
        }

        // Refresh insertion order for accepted keys, then trim key memory so
        // track-specific telemetry cannot grow forever during long sessions.
        if (this.lastByKey.has(key)) {
            this.lastByKey.delete(key);
        }
        this.lastByKey.set(key, {
            time: now,
            message: normalizedMessage
        });
        this.trimTrackedKeys();

        return true;
    }

    /**
     * Keeps throttle/dedupe metadata bounded independently from visible log
     * entries. Map preserves insertion order, so the oldest keys are removed.
     * This prevents long sessions with track-specific keys from growing the
     * telemetry metadata map forever.
     */
    trimTrackedKeys() {
        // Memory optimization: discard oldest logical keys while keeping recent
        // throttling useful for noisy telemetry sources.
        while (this.lastByKey.size > this.maxTrackedKeys) {
            const oldestKey = this.lastByKey.keys().next().value;
            this.lastByKey.delete(oldestKey);
        }
    }

    /**
     * Returns a shallow copy so renderers cannot mutate the log buffer.
     */
    getEntries() {
        return this.entries.slice();
    }

    /**
     * Clears the event buffer and throttle/dedupe memory.
     */
    clear() {
        this.entries = [];
        this.lastByKey.clear();
    }
}
