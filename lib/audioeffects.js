/**
 * Audio effects and output routing for Subsonic Neon Deck.
 *
 * AudioEffects owns the WebAudio/p5.sound nodes used for volume, balance,
 * playback rate, three-band filtering, and reverb. The sketch still owns the
 * UI sliders and passes their values in as plain data each frame.
 */
class AudioEffects {
    constructor() {
        // The current song and filter state are cached so routing is rebuilt
        // only when the source or filter switch changes.
        this.song = null;
        this.filtersOn = true;
        this.routedSong = null;
        this.routedFiltersState = null;

        // Parallel EQ buses. Each band-pass feeds its own gain node and then
        // returns to the p5 master output.
        this.bassGain = new p5.Gain();
        this.midGain = new p5.Gain();
        this.trebleGain = new p5.Gain();

        this.bassFilter = new p5.BandPass();
        this.bassFilter.freq(100);
        this.bassFilter.res(0.2);

        this.midFilter = new p5.BandPass();
        this.midFilter.freq(2000);
        this.midFilter.res(0.4);

        this.trebleFilter = new p5.BandPass();
        this.trebleFilter.freq(12000);
        this.trebleFilter.res(0.4);

        // CPU leak prevention patch: reverb is created lazily only when the
        // filter/FX bus is enabled. Firefox profiles showed GraphRunner doing
        // expensive WebAudio graph work during long sessions, so the default
        // route should not keep an unused convolver path alive.
        this.reverb = null;

        this.resetAppliedValues();
    }

    configure(song, filtersOn, force = false, controls = {}) {
        if (!song) {
            this.clearRouting();
            return;
        }

        this.song = song;
        this.filtersOn = !!filtersOn;

        if (!force && this.routedSong === song && this.routedFiltersState === this.filtersOn) {
            return;
        }

        this.rebuildRouting(controls);
        this.routedSong = song;
        this.routedFiltersState = this.filtersOn;
        this.resetAppliedValues();
    }

    /**
     * Releases the current song routing while the player has no active source.
     * Used during track handoff so old decoded buffers and FX nodes are not
     * kept reachable while the next stream is loading.
     */
    clearRouting() {
        if (!this.song && !this.routedSong) {
            return;
        }

        // Memory optimization: when Player detaches a song during track load,
        // the FX graph must drop its references too. Otherwise Web Audio nodes
        // can keep the old decoded buffer reachable until the next route build.
        this.disconnectNode(this.song);
        this.disconnectNode(this.bassFilter);
        this.disconnectNode(this.midFilter);
        this.disconnectNode(this.trebleFilter);
        this.disconnectNode(this.bassGain);
        this.disconnectNode(this.midGain);
        this.disconnectNode(this.trebleGain);
        this.disposeNode(this.reverb);
        this.reverb = null;
        this.song = null;
        this.routedSong = null;
        this.routedFiltersState = null;
        this.resetAppliedValues();
    }

    /**
     * Rebuilds the current song's WebAudio routing.
     * CPU leak prevention patch: the direct route avoids creating p5.Reverb
     * and its convolver worker when filters are disabled, keeping Firefox's
     * GraphRunner graph as small as possible during long idle sessions.
     * @param {Object} controls - Current UI control values for initial FX state.
     */
    rebuildRouting(controls = {}) {
        this.disconnectNode(this.song);
        this.disconnectNode(this.bassFilter);
        this.disconnectNode(this.midFilter);
        this.disconnectNode(this.trebleFilter);
        this.disconnectNode(this.bassGain);
        this.disconnectNode(this.midGain);
        this.disconnectNode(this.trebleGain);
        this.disposeNode(this.reverb);
        this.reverb = null;

        if (this.filtersOn) {
            this.song.connect(this.bassFilter);
            this.bassFilter.connect(this.bassGain);
            this.bassGain.connect();

            this.song.connect(this.midFilter);
            this.midFilter.connect(this.midGain);
            this.midGain.connect();

            this.song.connect(this.trebleFilter);
            this.trebleFilter.connect(this.trebleGain);
            this.trebleGain.connect();

            this.reverb = this.createReverb();
            this.reverb.process(this.song, 3, 2);
            this.reverb.drywet(controls.reverbMix || 0);
            this.reverb.amp(controls.reverbVolume || 0);
        } else {
            this.song.connect();
        }
    }

    /**
     * Creates a fresh p5.Reverb instance for the active FX route.
     * CPU leak prevention patch: p5.Reverb owns convolver resources, so the
     * app creates it only for the enabled FX graph and disposes it on rebuild.
     * @returns {p5.Reverb} A new reverb node for the current route.
     */
    createReverb() {
        return new p5.Reverb();
    }

    applyControls(controls = {}) {
        if (!this.song) {
            return;
        }

        this.applyVolume(controls.volume);
        this.applyPan(controls.pan);
        this.applyRate(controls.rate);
        this.applyFilterValues(controls);
    }

    applyVolume(value) {
        if (value === undefined || !this.valueChanged(value, this.lastVolumeValue)) {
            return;
        }

        // Slider travel is mapped to a logarithmic-feeling curve so the low
        // half of the control is usable instead of feeling almost silent.
        const volume = -Math.log10(1 - value * 0.9);
        this.song.setVolume(volume, 0.03);
        this.lastVolumeValue = value;
    }

    applyPan(value) {
        if (value === undefined || !this.valueChanged(value, this.lastPanValue)) {
            return;
        }

        this.song.pan(value);
        this.lastPanValue = value;
    }

    applyRate(value) {
        if (value === undefined || !this.valueChanged(value, this.lastRateValue)) {
            return;
        }

        this.song.rate(value);
        this.lastRateValue = value;
    }

    applyFilterValues(controls) {
        if (controls.bass !== undefined && this.valueChanged(controls.bass, this.lastBassValue)) {
            this.bassGain.amp(controls.bass, 0.03);
            this.lastBassValue = controls.bass;
        }

        if (controls.mid !== undefined && this.valueChanged(controls.mid, this.lastMidValue)) {
            this.midGain.amp(controls.mid, 0.03);
            this.lastMidValue = controls.mid;
        }

        if (controls.treble !== undefined && this.valueChanged(controls.treble, this.lastTrebleValue)) {
            this.trebleGain.amp(controls.treble, 0.03);
            this.lastTrebleValue = controls.treble;
        }

        if (this.reverb && controls.reverbMix !== undefined && this.valueChanged(controls.reverbMix, this.lastReverbValue)) {
            this.reverb.drywet(controls.reverbMix);
            this.lastReverbValue = controls.reverbMix;
        }

        if (this.reverb && controls.reverbVolume !== undefined && this.valueChanged(controls.reverbVolume, this.lastReverbVolValue)) {
            this.reverb.amp(controls.reverbVolume, 0.03);
            this.lastReverbVolValue = controls.reverbVolume;
        }
    }

    resetAppliedValues() {
        this.lastVolumeValue = null;
        this.lastPanValue = null;
        this.lastRateValue = null;
        this.lastBassValue = null;
        this.lastMidValue = null;
        this.lastTrebleValue = null;
        this.lastReverbValue = null;
        this.lastReverbVolValue = null;
    }

    valueChanged(current, previous) {
        return previous === null || Math.abs(current - previous) > 0.0001;
    }

    disconnectNode(node) {
        try {
            if (node) {
                node.disconnect();
            }
        } catch (error) {
            // Some p5/WebAudio nodes throw when already disconnected.
        }
    }

    disposeNode(node) {
        // Use dispose() for nodes we replace completely. p5.sound keeps many
        // objects in its internal soundArray, and dispose() removes them while
        // releasing internal buffers/nodes. This prevents long-running sessions
        // from accumulating old effect graphs after several songs.
        try {
            if (node && typeof node.dispose === "function") {
                node.dispose();
                return;
            }
        } catch (error) {
            // Fall back to disconnect below.
        }

        this.disconnectNode(node);
    }
}
