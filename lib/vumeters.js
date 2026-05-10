/**
 * Class representing stereo-style VU meters using p5.js and p5.sound data.
 * By default it reads p5.sound's main output, so EQ/reverb/output gain changes
 * are reflected in the meters. Set inputMode: "source" to inspect the raw
 * p5.SoundFile buffer instead.
 */
class VUMeters {

    constructor(x, y, width, height, options = {}) {
        this.name = "vumeters";

        // Canvas-space bounds. The sketch can keep these tied to a panel,
        // the same way Spectrum and WaveForm are panel-bound.
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.zoomfactor = options.zoomfactor || 1;
        this.round = 5 / this.zoomfactor;

        // Output mode measures the final p5.sound mix. Source mode measures
        // the raw p5.SoundFile buffer before this app's EQ/reverb routing.
        this.inputMode = options.inputMode || "output";
        this.source = null;
        this.amplitude = new p5.Amplitude();

        // VU meters are usually read in dB. These values map the measured
        // signal into a normalized 0..1 fill amount for drawing.
        this.minDb = options.minDb || -54;
        this.maxDb = options.maxDb || 0;

        // Attack rises quickly, release falls slower. This avoids twitchy
        // meters while still making hits feel immediate.
        this.attack = options.attack || 0.38;
        this.release = options.release || 0.08;
        this.peakDecay = options.peakDecay || 0.012;

        // Number of recent audio samples used to calculate RMS level.
        this.sampleWindow = options.sampleWindow || 1024;

        this.leftLevel = 0;
        this.rightLevel = 0;
        this.leftPeak = 0;
        this.rightPeak = 0;
        // ##SKINNY MODE
        // Inactive VU meters skip amplitude reads and are hidden by the panel
        // manager. The p5.Amplitude object is kept for fast reactivation.
        this.inactive = false;
        // p5.Amplitude connects an AudioWorklet to p5.soundOut.meter in its
        // constructor. Track that edge so Skinny mode can remove the worklet
        // from the live audio graph instead of only skipping getLevel().
        this.meterConnected = true;
    }

    setInactive(value) {
        // ##SKINNY MODE
        // This is the module-level low-power entry point called by sketch.js.
        this.inactive = !!value;
        if (this.inactive) {
            // Disconnecting the meter input is the expensive-work cutoff. The
            // worklet object stays allocated, but it no longer receives frames.
            this.disconnectMeter();
        } else {
            // Reconnect to the main output meter when the panel becomes visible.
            this.connectMeter();
        }
    }

    isInactive() {
        return this.inactive;
    }

    setSource(source) {
        // Avoid touching analyzer inputs while the panel is hidden.
        if (this.inactive) {
            return;
        }

        this.source = source || null;
        if (this.inputMode === "source" && this.source && this.amplitude && typeof this.amplitude.setInput === "function") {
            try {
                // Source mode fallback follows the same sound object.
                this.amplitude.setInput(this.source);
            } catch (error) {
                // Some p5.sound nodes cannot be used as direct amplitude inputs.
            }
        }
    }

    draw(source = null) {
        // Return before updateLevels(), which is where p5.Amplitude.getLevel()
        // would read from the output bus.
        if (this.inactive) {
            return;
        }
        this.connectMeter();

        if (source && source !== this.source) {
            this.setSource(source);
        }

        this.updateLevels();

        push();
        translate(this.x, this.y);
        scale(this.zoomfactor);

        fill(UI.surface[0], UI.surface[1], UI.surface[2]);
        stroke(UI.line[0], UI.line[1], UI.line[2], 120);
        strokeWeight(1 / this.zoomfactor);
        rect(0, 0, this.width, this.height, this.round);

        this.drawMeter("L", this.leftLevel, this.leftPeak, 18);
        this.drawMeter("R", this.rightLevel, this.rightPeak, this.width / 2 + 8);

        noFill();
        stroke(UI.line[0], UI.line[1], UI.line[2], 120);
        rect(0, 0, this.width, this.height, this.round);

        pop();
    }

    connectMeter() {
        if (this.meterConnected || !this.amplitude || !this.amplitude._workletNode) {
            return;
        }

        try {
            if (window.p5 && p5.soundOut && p5.soundOut.meter) {
                p5.soundOut.meter.connect(this.amplitude._workletNode);
                this.meterConnected = true;
            }
        } catch (error) {
            // Leave the meter disconnected if the browser refuses reconnecting;
            // playback should never depend on the visualizer graph.
            this.meterConnected = false;
        }
    }

    disconnectMeter() {
        if (!this.meterConnected || !this.amplitude || !this.amplitude._workletNode) {
            return;
        }

        try {
            if (window.p5 && p5.soundOut && p5.soundOut.meter) {
                // Target only this VU worklet. A broad disconnect would disable
                // any other p5.Amplitude listeners in the app.
                p5.soundOut.meter.disconnect(this.amplitude._workletNode);
            }
        } catch (error) {
            // Targeted disconnect can throw on older Web Audio builds. The draw
            // guard still keeps getLevel() and RMS smoothing out of the loop.
        }
        this.meterConnected = false;
    }

    updateLevels() {
        const levels = this.readStereoLevels();

        // Smooth the raw measurement before drawing, then maintain a separate
        // peak marker that decays slowly from recent maxima.
        this.leftLevel = this.smoothLevel(this.leftLevel, levels.left);
        this.rightLevel = this.smoothLevel(this.rightLevel, levels.right);
        this.leftPeak = Math.max(this.leftPeak - this.peakDecay, this.leftLevel);
        this.rightPeak = Math.max(this.rightPeak - this.peakDecay, this.rightLevel);
    }

    readStereoLevels() {
        if (this.inputMode === "source") {
            // Source mode tries the actual decoded L/R samples first.
            const sampled = this.readSoundFileLevels();
            if (sampled) {
                return sampled;
            }
        }

        // Output mode: p5.Amplitude listens to the main output by default.
        // getLevel(0/1) gives the post-FX left/right meter values.
        let left = 0;
        let right = 0;
        try {
            left = this.amplitude ? this.amplitude.getLevel(0) : 0;
            right = this.amplitude ? this.amplitude.getLevel(1) : left;
        } catch (error) {
            left = 0;
            right = 0;
        }
        left = Number.isFinite(left) ? left : 0;
        right = Number.isFinite(right) ? right : left;

        return {
            left: this.levelToNormalized(left),
            right: this.levelToNormalized(right)
        };
    }

    readSoundFileLevels() {
        if (!this.source || !this.source.buffer || typeof this.source.currentTime !== "function") {
            return null;
        }

        // p5.SoundFile stores its decoded AudioBuffer at source.buffer.
        // Reading a short window before currentTime gives a live-ish RMS level.
        const buffer = this.source.buffer;
        if (!buffer || !buffer.numberOfChannels || !buffer.sampleRate || typeof buffer.getChannelData !== "function") {
            return null;
        }

        const currentSample = Math.floor(this.source.currentTime() * buffer.sampleRate);
        const start = Math.max(0, currentSample - this.sampleWindow);
        const end = Math.min(buffer.length || 0, currentSample);
        if (end <= start) {
            return null;
        }

        const left = this.rmsFromChannel(buffer.getChannelData(0), start, end);
        const right = buffer.numberOfChannels > 1
            ? this.rmsFromChannel(buffer.getChannelData(1), start, end)
            : left;

        return {
            left: this.levelToNormalized(left),
            right: this.levelToNormalized(right)
        };
    }

    rmsFromChannel(channelData, start, end) {
        // Root mean square is a good visual loudness estimate for the meter.
        let sum = 0;
        for (let i = start; i < end; i++) {
            const sample = channelData[i] || 0;
            sum += sample * sample;
        }

        return Math.sqrt(sum / Math.max(1, end - start));
    }

    levelToNormalized(level) {
        // Convert linear amplitude to dB, then map into the meter range.
        const db = 20 * Math.log10(Math.max(0.000001, level));
        return constrain(map(db, this.minDb, this.maxDb, 0, 1), 0, 1);
    }

    smoothLevel(previous, next) {
        // Separate attack/release makes rises snappy and falls weighted.
        const amount = next > previous ? this.attack : this.release;
        return previous + (next - previous) * amount;
    }

    drawMeter(label, level, peak, x) {
        const meterW = Math.max(18, this.width / 2 - 28);
        const meterH = Math.max(60, this.height - 42);
        const y = 18;
        const peakY = y + meterH - meterH * peak;

        noStroke();
        fill(UI.field[0], UI.field[1], UI.field[2]);
        rect(x, y, meterW, meterH, 4);

        const segmentCount = 18;
        const segmentGap = 2;
        const segmentH = (meterH - segmentGap * (segmentCount - 1)) / segmentCount;
        for (let i = 0; i < segmentCount; i++) {
            // Segments are drawn bottom-up. Higher segments change color to
            // amber/pink so hot levels are legible at a glance.
            const segmentLevel = (i + 1) / segmentCount;
            const segmentY = y + meterH - (i + 1) * segmentH - i * segmentGap;
            const active = segmentLevel <= level;
            const colorValue = this.segmentColor(segmentLevel);
            fill(colorValue[0], colorValue[1], colorValue[2], active ? 220 : 36);
            rect(x + 4, segmentY, meterW - 8, segmentH, 2);
        }

        stroke(UI.text[0], UI.text[1], UI.text[2], 220);
        strokeWeight(2 / this.zoomfactor);
        line(x + 3, peakY, x + meterW - 3, peakY);

        noFill();
        stroke(UI.line[0], UI.line[1], UI.line[2], 120);
        strokeWeight(1 / this.zoomfactor);
        rect(x, y, meterW, meterH, 4);

        noStroke();
        fill(UI.text[0], UI.text[1], UI.text[2]);
        textSize(10);
        textAlign(CENTER, CENTER);
        text(label, x + meterW / 2, this.height - 12);
    }

    segmentColor(level) {
        // Use the current theme palette so the component works in CYBER/STELLAR.
        if (level > 0.86) {
            return UI.pink;
        }
        if (level > 0.68) {
            return UI.amber;
        }
        return UI.line;
    }

    setZoom(val) {
        this.zoomfactor = val;
        this.round = 5 / this.zoomfactor;
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
    }

    fitToPanel(panel) {
        this.x = panel.x + 16;
        this.y = panel.y + 34;
        this.setSize(Math.max(70, panel.w - 32), Math.max(80, panel.h - 48));
    }

    getMinPanelSize() {
        return { w: 110, h: 135 };
    }
}
