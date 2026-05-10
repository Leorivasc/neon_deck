/**
 * Stereo vectorscope for the final p5.sound output bus.
 *
 * The scope taps p5.soundOut.input with a ChannelSplitter and two analysers.
 * It does not reroute or consume audio; Web Audio nodes can fan out to this
 * visualizer while the normal output path keeps playing.
 */
class VectorScope {
    constructor(x, y, width, height, options = {}) {
        this.name = "vectorscope";
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.zoomfactor = options.zoomfactor || 1;
        this.round = 5 / this.zoomfactor;

        this.fftSize = options.fftSize || 1024;
        this.sampleStep = options.sampleStep || 3;
        this.connected = false;
        this.correlation = 0;

        this.context = null;
        this.splitter = null;
        this.leftAnalyser = null;
        this.rightAnalyser = null;
        this.leftBuffer = new Float32Array(this.fftSize);
        this.rightBuffer = new Float32Array(this.fftSize);
        // Inactive means hidden and disconnected from p5.soundOut.input. This
        // avoids the analyser fan-out work while Skinny mode is enabled.
        this.inactive = false;

        this.connectToOutput();
    }

    connectToOutput() {
        // Do not reconnect while inactive. Skinny mode controls this state
        // through setInactive().
        if (this.inactive) {
            return;
        }

        if (this.connected || !window.p5 || !p5.soundOut || !p5.soundOut.input || !p5.soundOut.audiocontext) {
            return;
        }

        try {
            this.context = p5.soundOut.audiocontext;
            this.splitter = this.context.createChannelSplitter(2);
            this.leftAnalyser = this.createAnalyser();
            this.rightAnalyser = this.createAnalyser();

            p5.soundOut.input.connect(this.splitter);
            this.splitter.connect(this.leftAnalyser, 0);
            this.splitter.connect(this.rightAnalyser, 1);
            this.connected = true;
        } catch (error) {
            console.warn("VectorScope could not connect to p5.soundOut:", error);
            this.connected = false;
        }
    }

    disconnectFromOutput() {
        // Disconnect analyzer-only nodes. They are not part of the audible path,
        // so this should never interrupt playback.
        try {
            if (this.splitter) {
                this.splitter.disconnect();
            }
            if (this.leftAnalyser) {
                this.leftAnalyser.disconnect();
            }
            if (this.rightAnalyser) {
                this.rightAnalyser.disconnect();
            }
        } catch (error) {
            // Web Audio nodes can throw when already disconnected.
        }

        this.splitter = null;
        this.leftAnalyser = null;
        this.rightAnalyser = null;
        this.connected = false;
    }

    setInactive(value) {
        this.inactive = !!value;
        if (this.inactive) {
            // VectorScope owns real Web Audio analyzer nodes, so it can do more
            // than skip draw(): it can remove its tap from the output bus.
            this.disconnectFromOutput();
        } else {
            this.connectToOutput();
        }
    }

    isInactive() {
        return this.inactive;
    }

    createAnalyser() {
        const analyser = this.context.createAnalyser();
        analyser.fftSize = this.fftSize;
        analyser.smoothingTimeConstant = 0.45;
        return analyser;
    }

    draw() {
        // Skip before reading analyzer buffers and calculating correlation.
        if (this.inactive) {
            return;
        }

        this.connectToOutput();
        this.readSamples();

        push();
        translate(this.x, this.y);
        scale(this.zoomfactor);

        this.drawFrame();
        this.drawTrace();
        this.drawCorrelation();

        pop();
    }

    readSamples() {
        if (!this.connected || !this.leftAnalyser || !this.rightAnalyser) {
            this.leftBuffer.fill(0);
            this.rightBuffer.fill(0);
            this.correlation = 0;
            return;
        }

        this.leftAnalyser.getFloatTimeDomainData(this.leftBuffer);
        this.rightAnalyser.getFloatTimeDomainData(this.rightBuffer);
        this.correlation = this.calculateCorrelation();
    }

    calculateCorrelation() {
        let lr = 0;
        let ll = 0;
        let rr = 0;

        for (let i = 0; i < this.leftBuffer.length; i += this.sampleStep) {
            const left = this.leftBuffer[i] || 0;
            const right = this.rightBuffer[i] || 0;
            lr += left * right;
            ll += left * left;
            rr += right * right;
        }

        const denominator = Math.sqrt(ll * rr);
        if (!denominator) {
            return 0;
        }

        return constrain(lr / denominator, -1, 1);
    }

    drawFrame() {
        fill(UI.surface[0], UI.surface[1], UI.surface[2]);
        stroke(UI.line[0], UI.line[1], UI.line[2], 120);
        strokeWeight(1 / this.zoomfactor);
        rect(0, 0, this.width, this.height, this.round);

        const centerX = this.width / 2;
        const scopeTop = 12;
        const scopeSize = this.getScopeSize();
        const centerY = scopeTop + scopeSize / 2;

        stroke(UI.text[0], UI.text[1], UI.text[2], 28);
        line(centerX - scopeSize / 2, centerY, centerX + scopeSize / 2, centerY);
        line(centerX, centerY - scopeSize / 2, centerX, centerY + scopeSize / 2);
        line(centerX - scopeSize / 2, centerY + scopeSize / 2, centerX + scopeSize / 2, centerY - scopeSize / 2);
        line(centerX - scopeSize / 2, centerY - scopeSize / 2, centerX + scopeSize / 2, centerY + scopeSize / 2);

        noFill();
        stroke(UI.line[0], UI.line[1], UI.line[2], 85);
        ellipse(centerX, centerY, scopeSize, scopeSize);
    }

    drawTrace() {
        const centerX = this.width / 2;
        const scopeTop = 12;
        const scopeSize = this.getScopeSize();
        const centerY = scopeTop + scopeSize / 2;
        const radius = scopeSize * 0.48;
        const trace = UI.waveformTrace || UI.line;

        noFill();
        stroke(trace[0], trace[1], trace[2], 185);
        strokeWeight(1.4 / this.zoomfactor);
        beginShape();

        for (let i = 0; i < this.leftBuffer.length; i += this.sampleStep) {
            const left = constrain(this.leftBuffer[i] || 0, -1, 1);
            const right = constrain(this.rightBuffer[i] || 0, -1, 1);

            // Classic Lissajous mapping: horizontal shows stereo difference,
            // vertical shows summed mono energy.
            const side = (right - left) * 0.5;
            const mid = (right + left) * 0.5;
            vertex(centerX + side * radius * 2, centerY - mid * radius * 2);
        }

        endShape();
    }

    drawCorrelation() {
        const barW = Math.max(60, this.width - 34);
        const barH = 8;
        const x = (this.width - barW) / 2;
        const y = this.height - 24;
        const markerX = x + map(this.correlation, -1, 1, 0, barW);

        noStroke();
        fill(UI.field[0], UI.field[1], UI.field[2]);
        rect(x, y, barW, barH, 4);

        fill(UI.line[0], UI.line[1], UI.line[2], 210);
        rect(x, y, markerX - x, barH, 4);

        stroke(UI.text[0], UI.text[1], UI.text[2], 220);
        strokeWeight(2 / this.zoomfactor);
        line(markerX, y - 3, markerX, y + barH + 3);

        noStroke();
        fill(UI.text[0], UI.text[1], UI.text[2]);
        textSize(9);
        textAlign(CENTER, CENTER);
        text(`CORR ${this.correlation.toFixed(2)}`, this.width / 2, this.height - 9);
    }

    getScopeSize() {
        return Math.max(54, Math.min(this.width - 24, this.height - 48));
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
    }

    fitToPanel(panel) {
        this.x = panel.x + 16;
        this.y = panel.y + 34;
        this.setSize(Math.max(90, panel.w - 32), Math.max(80, panel.h - 48));
    }

    getMinPanelSize() {
        return { w: 130, h: 130 };
    }
}
