class Player {
    /**
     * Creates a new Player instance.
     * @param {SubsonicClient} subsonicClient - The Subsonic API client for fetching songs.
     * @param {PlayList} playlist - The playlist object to manage songs.
     */
    constructor(subsonicClient, playlist) {
        this.subsonicClient = subsonicClient; // Subsonic API client
        this.playlist = playlist; // Playlist object
        this.song = null; // p5.SoundFile object for playback
        this.keepPlaying = false; // Semaphore for continuous playback
        this.loopPlaylist = true; // Whether to loop the playlist
        this.isLoading = false; // Flag to prevent multiple loads
        this.isRequested = false; // Flag to indicate if the song is freshly loaded. The idea is to avoid the sketch from reassigning the sound object every frame. Set to true when the song is requested from the sketch.
        this.onSongLoaded = null; // Optional callback for UI metadata updates.
        this.onMaintenance = null; // Optional callback for periodic audio-runtime maintenance.
        // PERF PATCH [bounded-load-progress-log]: keep loading logs sparse so
        // long sessions with DevTools open do not retain thousands of rows.
        this.lastLoadProgressPercent = -1;
        // PERF PATCH [firefox-graphrunner-idle-suspend]: remember the pending
        // suspend timer so pause/play bursts do not race GraphRunner cleanup.
        this.audioIdleSuspendTimer = null;
        // PERF PATCH [audio-runtime-periodic-maintenance]: long Firefox
        // sessions can accumulate WebAudio/AudioWorklet CPU inside p5.sound.
        // Count completed tracks and insert a small maintenance gap so the app
        // can detach/recycle runtime nodes before loading the next stream.
        this.completedPlaybackCount = 0;
        this.maintenanceInterval = 50;
        this.maintenanceDelayMs = 1000;
        this.isPerformingMaintenance = false;

        //Loads dummy sound to init the sound system
        this.song=loadSound('assets/dot.mp3', () => console.log("Player: Dummy sound loaded."));
    }

    setOnSongLoaded(callback) {
        this.onSongLoaded = callback;
    }

    /**
     * Registers a callback for periodic audio-runtime maintenance.
     * PERF PATCH [audio-runtime-periodic-maintenance]: sketch.js uses this
     * hook to log the maintenance cycle and recycle visualization/FX nodes
     * outside Player, keeping Player focused on transport state.
     * @param {function|null} callback - Receives maintenance event details.
     */
    setOnMaintenance(callback) {
        this.onMaintenance = callback;
    }

    /**
     * Plays a song from the file path.
     * @param {string} filepath - The file path of the song to play.
     * @param {function} [onEndCallback] - Optional callback to execute when the song ends.
     */
    playSongFromFile(filepath) {
        if (this.isLoading) {
            console.warn("Player: A song is already loading. Please wait.");
            return;
        }

        const previousSong = this.detachCurrentSong();
        // PERF PATCH [soundfile-handoff-release]: dispose the old decoded
        // buffer before the next load to avoid a two-track decode peak.
        this.disposeSound(previousSong);
        this.resetLoadProgressLog();

        this.isLoading = true; // Set loading flag
        this.song = loadSound(
            filepath,
            () => {
                console.log(`Player: Loaded song from ${filepath}`);
                this.isLoading = false; // Clear loading flag
                this.playSong();

            },
            () => {
                console.error(`Player: Failed to load song from ${filepath}`);
                this.isLoading = false; // Clear loading flag on error
                this.disposeSound(this.song);
                this.song = null;
            },
            (progress) => {
                this.logLoadProgress(progress);
            }
        );
    }

    /**
     * Plays a song from its index in the playlist.
     * @param {string} index - The position on the playlist to play.
     */
    playSongByPlaylistId(index) {
        if (index === undefined || index === null) {
            console.warn("Player: Playlist index is undefined or null.");
            return;
        }

        var id=null;
        try {
            id = this.playlist.getSong(index).id;
        } catch (error) {
            console.warn(`Player: Invalid playlist index ${index}`);
            return;
        }


        if (!id) {
            console.warn(`Player: Song ID ${id} not found in playlist`);
            return;
        }
        
        this.playlist.setPointer(index);//just in case it was called elsewhere
        this.playSongById(id);

    }

    /**
     * Plays a song from its ID in the playlist.
     * @param {string} id - The ID of the song to play.
     * @param {function} [onEndCallback] - Optional callback to execute when the song ends.
     */
    playSongById(id) {
        if (this.isLoading) {
            console.warn("Player: A song is already loading. Please wait.");
            return;
        }

        //just crosscheck if the song is in the playlist
        const position = this.playlist.getPointerFromSongId(id);
        if (position !== -1) {
            this.playlist.setPointer(position);
            const songUrl = this.subsonicClient.getSong(id);

            const previousSong = this.detachCurrentSong();
            // PERF PATCH [soundfile-handoff-release]: release the previous
            // p5.SoundFile before fetching and decoding the next stream.
            this.disposeSound(previousSong);
            this.resetLoadProgressLog();

            this.isLoading = true; // Set loading flag
            this.song = loadSound(
                songUrl,
                () => {
                    console.log(`Player: Loaded song with ID ${id}`);
                    this.isLoading = false; // Clear loading flag
                    this.playSong();
                    this.notifySongLoaded(id);
                    
                },
                () => {
                    console.error(`Player: Failed to load song with ID ${id}`);
                    this.isLoading = false; // Clear loading flag on error
                    this.disposeSound(this.song);
                    this.song = null;
                },
                (progress) => {
                    this.logLoadProgress(progress);
                }
            );
        } else {
            console.warn(`Player: Song ID ${id} not found in playlist`);
        }
    }

    notifySongLoaded(id) {
        if (!this.onSongLoaded) {
            return;
        }

        try {
            this.onSongLoaded(id, this.playlist.getCurrent());
        } catch (error) {
            console.error("Player: onSongLoaded callback failed:", error);
        }
    }

    /**
     * Emits the maintenance callback without letting UI/log failures break
     * playback handoff.
     * PERF PATCH [audio-runtime-periodic-maintenance]: maintenance is a
     * defensive runtime patch, so telemetry must be best-effort only.
     * @param {Object} event - Maintenance details for logging/diagnostics.
     */
    notifyMaintenance(event) {
        if (!this.onMaintenance) {
            return;
        }

        try {
            this.onMaintenance(event);
        } catch (error) {
            console.error("Player: onMaintenance callback failed:", error);
        }
    }

    detachCurrentSong() {
        // A song change can otherwise leave decoded buffers and Web Audio nodes
        // alive after several tracks. Stop immediately and let callers dispose
        // the detached object before loading the next decoded buffer.
        const previousSong = this.song;
        if (previousSong) {
            try {
                previousSong.stop();
            } catch (error) {
                // Some p5.SoundFile instances can throw if they are mid-load.
            }
        }
        this.song = null;
        this.isRequested = false;
        return previousSong;
    }

    disposeSound(soundFile) {
        // PERF PATCH [soundfile-handoff-release]: p5.SoundFile.dispose()
        // removes the object from p5.sound's soundArray and disconnects graph
        // nodes, but Firefox can retain decoded buffers unless we also clear
        // p5.SoundFile's internal references below.
        if (!soundFile) {
            return;
        }

        try {
            if (typeof soundFile.dispose === "function") {
                soundFile.dispose();
            }
        } catch (error) {
            console.warn("Player: Could not dispose previous sound file:", error);
        }

        this.releaseSoundFileReferences(soundFile);
    }

    /**
     * Returns p5.sound's shared AudioContext when it is available.
     * PERF PATCH [firefox-graphrunner-idle-suspend]: all GraphRunner
     * suspend/resume work must use the same context that p5.sound owns.
     *
     * Developer note: getAudioContext() is provided by p5.sound in this app.
     * Access is guarded because tests/static checks can load this file without
     * a browser AudioContext.
     * @returns {AudioContext|null} The active p5.sound AudioContext.
     */
    getManagedAudioContext() {
        if (typeof getAudioContext === "function") {
            try {
                return getAudioContext();
            } catch (error) {
                return null;
            }
        }

        return null;
    }

    /**
     * Cancels a queued idle suspend before starting or resuming playback.
     * PERF PATCH [firefox-graphrunner-idle-suspend]: quick pause/play
     * interactions must not suspend AudioContext after playback has resumed.
     */
    cancelAudioIdleSuspend() {
        if (!this.audioIdleSuspendTimer) {
            return;
        }

        clearTimeout(this.audioIdleSuspendTimer);
        this.audioIdleSuspendTimer = null;
    }

    /**
     * Resumes p5.sound's AudioContext before playback starts.
     * PERF PATCH [firefox-graphrunner-idle-suspend]: pause/stop can suspend
     * Firefox's WebAudio graph to make GraphRunner sleep, so playback requests
     * must wake the same context before calling p5.SoundFile.play().
     *
     * Developer note: resume() returns a Promise in modern browsers. Playback
     * is still attempted immediately by callers because p5.sound also handles
     * user-gesture resume paths; the Promise is used for diagnostics only.
     */
    resumeAudioContextForPlayback() {
        this.cancelAudioIdleSuspend();

        const audioContext = this.getManagedAudioContext();
        if (!audioContext || audioContext.state !== "suspended" || typeof audioContext.resume !== "function") {
            return;
        }

        try {
            const resumeResult = audioContext.resume();
            if (resumeResult && typeof resumeResult.catch === "function") {
                resumeResult.catch((error) => {
                    console.warn("Player: Could not resume AudioContext for playback:", error);
                });
            }
        } catch (error) {
            console.warn("Player: Could not resume AudioContext for playback:", error);
        }
    }

    /**
     * Suspends p5.sound's AudioContext specifically for maintenance gaps.
     * PERF PATCH [audio-runtime-periodic-maintenance]: this intentionally
     * bypasses the idle guards used by suspendAudioContextWhenIdle() because
     * the player is between tracks and wants a short GraphRunner sleep before
     * the next SoundFile rebuilds the graph.
     */
    suspendAudioContextForMaintenance() {
        const audioContext = this.getManagedAudioContext();
        if (!audioContext || audioContext.state !== "running" || typeof audioContext.suspend !== "function") {
            return;
        }

        try {
            const suspendResult = audioContext.suspend();
            if (suspendResult && typeof suspendResult.catch === "function") {
                suspendResult.catch((error) => {
                    console.warn("Player: Could not suspend AudioContext for maintenance:", error);
                });
            }
        } catch (error) {
            console.warn("Player: Could not suspend AudioContext for maintenance:", error);
        }
    }

    /**
     * Schedules p5.sound's AudioContext suspension while playback is idle.
     * PERF PATCH [firefox-graphrunner-idle-suspend]: Firefox keeps
     * GraphRunner active while the WebAudio graph is running, even when a
     * p5.SoundFile is paused or stopped. Suspending AudioContext sleeps it.
     *
     * Developer note: the small delay avoids suspend/resume churn if the user
     * taps Pause and Play immediately, and it avoids interfering with active
     * track handoff where the next song should start without a GraphRunner
     * restart.
     * @param {number} delayMs - Delay before suspending the AudioContext.
     */
    suspendAudioContextWhenIdle(delayMs = 1200) {
        this.cancelAudioIdleSuspend();

        this.audioIdleSuspendTimer = setTimeout(() => {
            this.audioIdleSuspendTimer = null;
            if (this.isLoading || this.keepPlaying || (this.song && this.song.isPlaying && this.song.isPlaying())) {
                return;
            }

            const audioContext = this.getManagedAudioContext();
            if (!audioContext || audioContext.state !== "running" || typeof audioContext.suspend !== "function") {
                return;
            }

            try {
                const suspendResult = audioContext.suspend();
                if (suspendResult && typeof suspendResult.catch === "function") {
                    suspendResult.catch((error) => {
                        console.warn("Player: Could not suspend idle AudioContext:", error);
                    });
                }
            } catch (error) {
                console.warn("Player: Could not suspend idle AudioContext:", error);
            }
        }, delayMs);
    }

    /**
     * Clears p5.SoundFile fields that dispose() leaves reachable in Firefox.
     * PERF PATCH [soundfile-internal-reference-release]: decoded AudioBuffer
     * objects are large native allocations, so old tracks must drop buffer and
     * source references as soon as the player advances to the next song.
     *
     * Developer note: this intentionally reaches into p5.sound internals.
     * In long Firefox sessions, p5.SoundFile.dispose() disconnects the audible
     * graph but can leave decoded buffers, source nodes, and the position
     * tracking AudioWorklet reachable long enough to grow RAM or keep
     * GraphRunner busy. These fields belong to a discarded SoundFile and must
     * not be reused after handoff, so clearing them is safer than waiting for
     * p5.sound/browser cleanup heuristics.
     * @param {p5.SoundFile} soundFile - Discarded p5.SoundFile instance.
     */
    releaseSoundFileReferences(soundFile) {
        try {
            // PERF PATCH [soundfile-internal-reference-release]: source nodes
            // can retain their AudioBuffer after dispose() disconnects output.
            if (Array.isArray(soundFile.bufferSourceNodes)) {
                for (const node of soundFile.bufferSourceNodes) {
                    this.releaseAudioBufferSource(node, soundFile);
                }
                soundFile.bufferSourceNodes.length = 0;
            }

            this.releaseAudioBufferSource(soundFile.bufferSourceNode, soundFile);
            soundFile.bufferSourceNode = null;
            this.releaseAudioBufferSource(soundFile._counterNode, soundFile);
            soundFile._counterNode = null;
            // PERF PATCH [soundfile-worklet-release]: p5.sound creates
            // _workletNode as a silent position tracker for each SoundFile.
            // Discarded connected trackers can keep GraphRunner processing.
            this.releaseAudioWorkletNode(soundFile._workletNode);
            soundFile._workletNode = null;

            // PERF PATCH [soundfile-internal-reference-release]: dispose()
            // disconnects graph nodes but does not clear decoded AudioBuffer.
            // Keeping it matches the observed RAM growth while skipping songs.
            soundFile.buffer = null;
            // PERF PATCH [soundfile-internal-reference-release]: callbacks,
            // cues, and files can keep discarded SoundFiles reachable.
            soundFile._onended = function () {};
            soundFile._whileLoading = function () {};
            soundFile._cues = [];
            soundFile.file = null;
            soundFile.url = null;
        } catch (error) {
            console.warn("Player: Could not release sound file references:", error);
        }
    }

    /**
     * Disconnects/stops an AudioBufferSourceNode and severs its buffer link.
     * PERF PATCH [soundfile-internal-reference-release]: cleanup for
     * discarded p5.SoundFile source nodes.
     *
     * Developer note: p5.sound stores every started source in
     * bufferSourceNodes until its ended handler trims the array. Rapid track
     * handoff can leave old source nodes waiting for that cleanup while they
     * still reference the decoded AudioBuffer. We remove the handler, stop the
     * node, disconnect it, and clear node.buffer when the browser permits it.
     * @param {AudioBufferSourceNode|null} node - Web Audio source node.
     * @param {p5.SoundFile} soundFile - Owner used to remove p5 ended handler.
     */
    releaseAudioBufferSource(node, soundFile) {
        if (!node) {
            return;
        }

        try {
            if (soundFile && soundFile._clearOnEnd && typeof node.removeEventListener === "function") {
                // PERF PATCH [soundfile-internal-reference-release]: remove
                // p5.sound's ended handler so old SoundFiles can be released.
                node.removeEventListener("ended", soundFile._clearOnEnd);
            }
        } catch (error) {
            // Some source nodes may already have been finalized by p5.sound.
        }

        try {
            node.disconnect();
        } catch (error) {
            // Already-disconnected AudioBufferSourceNodes throw in some browsers.
        }

        try {
            node.stop();
        } catch (error) {
            // stop() throws after a source has already stopped; safe to ignore.
        }

        try {
            // PERF PATCH [soundfile-internal-reference-release]: sever the
            // native AudioBuffer reference when the browser allows it.
            node.buffer = null;
        } catch (error) {
            // Some implementations expose buffer as non-writable after start.
        }
    }

    /**
     * Disconnects the p5.SoundFile position-tracking AudioWorklet.
     * PERF PATCH [soundfile-worklet-release]: p5.sound connects this worklet
     * to a silent timing output, and orphaned worklets can keep Firefox's
     * GraphRunner busy even after playback is paused.
     *
     * Developer note: GraphRunner is the Firefox WebAudio graph execution
     * thread seen in about:processes/profiler. A disconnected visual player can
     * still burn CPU there if stale AudioWorkletNodes remain connected to the
     * silent output path. Closing the MessagePort and disconnecting the node
     * ensures the discarded SoundFile no longer schedules work.
     * @param {AudioWorkletNode|null} node - Internal p5.sound worklet node.
     */
    releaseAudioWorkletNode(node) {
        if (!node) {
            return;
        }

        try {
            if (node.port) {
                // PERF PATCH [soundfile-worklet-release]: remove the message
                // callback so the discarded SoundFile cannot stay reachable.
                node.port.onmessage = null;
                if (typeof node.port.close === "function") {
                    node.port.close();
                }
            }
        } catch (error) {
            // Some AudioWorklet ports may already be closed by the browser.
        }

        try {
            node.disconnect();
        } catch (error) {
            // Already-disconnected AudioWorkletNodes can throw.
        }
    }

    /**
     * Resets sparse load-progress logging for the next track request.
     */
    resetLoadProgressLog() {
        this.lastLoadProgressPercent = -1;
    }

    /**
     * Logs coarse loading progress buckets instead of every p5.sound progress
     * callback, keeping long-session console memory bounded.
     * @param {number} progress - Fractional loading progress from p5.sound.
     */
    logLoadProgress(progress) {
        // PERF PATCH [bounded-load-progress-log]: p5.sound can emit many
        // progress callbacks per track. Buckets keep console history bounded.
        const percent = Math.round((Number(progress) || 0) * 100);
        const bucket = Math.floor(percent / 25) * 25;
        if (bucket <= this.lastLoadProgressPercent && percent < 100) {
            return;
        }

        this.lastLoadProgressPercent = Math.max(bucket, percent);
        console.log(`Player: Loading song... ${percent}%`);
    }


    /**
     * Plays the currently loaded song.
     */
    playSong() {
        if (this.song && this.song.isPlaying()) {
            console.log("Player: Song is already playing");
            return;
        }

        if (this.song && this.song.isLoaded()) {
            this.resumeAudioContextForPlayback();
            this.isRequested = false; // Indicate that the song has not been requested from the sketch yet
            this.song.play();
            this.keepPlaying = true;
            console.log("Player: Playing song");
        } else {
            console.warn("Player: No song loaded to play");
        }
    }

    /**
     * Pauses the currently playing song.
     */
    pauseSong() {
        if (this.song && this.song.isPlaying()) {
            this.song.pause();
            this.keepPlaying = false;
            this.suspendAudioContextWhenIdle();
            console.log("Player: Paused song");
        }
    }

    /**
     * Stops the currently playing song.
     */
    stopSong() {
        if (this.song) {
            this.song.stop();
            this.keepPlaying = false;
            this.suspendAudioContextWhenIdle();
            console.log("Player: Stopped song");
        }
    }

    /**
     * Plays the next song in the playlist.
     */
    playNext() {
        if (this.isLoading) {
            console.warn("Player: A song is already loading. Skipping playNext.");
            return;
        }
        if (this.playlist.getLength() === 0) {
            console.warn("Player: No songs in the playlist");
            return;
        }

        const advanced = this.playlist.next(this.loopPlaylist);// advance the pointer
        if (advanced) {
            this.playSongByPlaylistId(this.playlist.getPointer());
        } else {
            this.stopSong();
            console.warn("Player: No next song in the playlist");
        }

    }

    /**
     * Handles natural end-of-track advancement and periodic maintenance.
     * PERF PATCH [audio-runtime-periodic-maintenance]: the counter is based on
     * completed playbacks rather than queue index so random/loop playback still
     * refreshes the audio runtime every N actual songs.
     */
    handleSongEnded() {
        this.completedPlaybackCount++;

        if (this.shouldPerformMaintenance()) {
            this.performMaintenance(() => this.playNext());
            return;
        }

        this.playNext();
    }

    /**
     * Reports whether the next track handoff should include maintenance.
     * PERF PATCH [audio-runtime-periodic-maintenance]: default cadence is 50
     * completed songs, matching the observed overnight Firefox CPU drift.
     * @returns {boolean} True when maintenance should run before advancing.
     */
    shouldPerformMaintenance() {
        return this.maintenanceInterval > 0 &&
            this.completedPlaybackCount > 0 &&
            this.completedPlaybackCount % this.maintenanceInterval === 0;
    }

    /**
     * Inserts a short maintenance gap between completed songs.
     * PERF PATCH [audio-runtime-periodic-maintenance]: this detaches the ended
     * SoundFile, clears p5.sound internals, asks sketch.js to recycle app-owned
     * audio nodes, and briefly suspends AudioContext so Firefox GraphRunner can
     * drop stale work before the next stream starts.
     * @param {function} continuePlayback - Called after the maintenance gap.
     */
    performMaintenance(continuePlayback) {
        if (this.isPerformingMaintenance) {
            return;
        }

        const completedCount = this.completedPlaybackCount;
        this.isPerformingMaintenance = true;
        this.isLoading = true;
        const shouldContinue = this.keepPlaying;

        const previousSong = this.detachCurrentSong();
        this.disposeSound(previousSong);
        this.resetLoadProgressLog();
        this.keepPlaying = false;

        const event = {
            completedCount: completedCount,
            interval: this.maintenanceInterval,
            delayMs: this.maintenanceDelayMs
        };
        this.notifyMaintenance(event);
        this.suspendAudioContextForMaintenance();

        setTimeout(() => {
            this.isPerformingMaintenance = false;
            this.isLoading = false;
            this.keepPlaying = shouldContinue;

            if (shouldContinue && typeof continuePlayback === "function") {
                continuePlayback();
            }
        }, this.maintenanceDelayMs);
    }

    /**
     * Plays the previous song in the playlist.
     */
    playPrevious() {
        if (this.isLoading) {
            console.warn("Player: A song is already loading. Skipping playPrevious.");
            return;
        }
        if (this.playlist.getLength() === 0) {
            console.warn("Player: No songs in the playlist");
            return;
        }

        const advanced = this.playlist.previous(true);
        if (advanced) {
            this.playSongByPlaylistId(this.playlist.getPointer());
        } else {
            console.warn("Player: No previous song in the playlist");
        }
    }

    /**
     * Toggles looping for the playlist.
     */
    setLoop(loop) {
        //this.loopPlaylist = !this.loopPlaylist;
        this.loopPlaylist = loop;
        //console.log(`Player: Looping is now ${this.loopPlaylist ? "enabled" : "disabled"}`);
    }

    /**
     * Starts playing the full playlist in a loop.
     */
    playFullPlaylist() {
        this.keepPlaying = true;
        const currentSong = this.playlist.getCurrent();
        if (currentSong) {
            this.playSongById(currentSong.id);
        } else {
            console.warn("Player: Playlist is empty");
        }
    }

    getProgress(){
        if(this.song && this.song.isLoaded()){
            return this.song.currentTime() / this.song.duration();
        }
        return 0;  
    }

    /**
     * Exposes the current p5.SoundFile object for external use (e.g., applying filters).
     * @returns {p5.SoundFile|null} The current sound object, or null if no song is loaded.
     * Note: This method returns the sound object only once after loading or playing a new song to avoid reassigning it every frame.
     */
    getSoundObject() {
        if(!this.isRequested){
            this.isRequested = true; // Reset the flag after the first request
            return this.song;
        }
        return null ;//to avoid reassigning the sound object every frame. See in sketch.js draw()
    }


    draw() {
        //Not actual drawing code, just controlling the NEXT song if keepPlaying is true
        //This is actually a dirty way because the onended() is not reliable
        if (this.keepPlaying && !this.isLoading && !this.isPerformingMaintenance && this.getProgress() >= 0.999) { //detect song ended
            this.handleSongEnded();
        }   
    }


}
