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
        // Memory optimization: keep load progress logging sparse so a long
        // session with DevTools open does not retain thousands of console rows.
        this.lastLoadProgressPercent = -1;

        //Loads dummy sound to init the sound system
        this.song=loadSound('assets/dot.mp3', () => console.log("Player: Dummy sound loaded."));
    }

    setOnSongLoaded(callback) {
        this.onSongLoaded = callback;
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
        // Memory optimization: dispose the old decoded buffer before starting
        // the next load, avoiding a two-track peak while p5.sound decodes.
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
            // Memory optimization: release the previous p5.SoundFile before
            // fetching/decoding the next stream.
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
        // Memory leak prevention patch: p5.SoundFile.dispose() removes the
        // object from p5.sound's soundArray and disconnects graph nodes, but in
        // Firefox long sessions can still retain decoded buffers unless we also
        // clear p5.SoundFile's internal references below.
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
     * Clears p5.SoundFile fields that dispose() leaves reachable in Firefox.
     * Memory leak prevention patch: decoded AudioBuffer objects are large
     * native allocations, so old tracks must drop their buffer and source
     * references as soon as the player advances to the next song.
     * @param {p5.SoundFile} soundFile - Discarded p5.SoundFile instance.
     */
    releaseSoundFileReferences(soundFile) {
        try {
            // Memory leak prevention patch: source nodes can retain their
            // AudioBuffer even after p5.SoundFile.dispose() has disconnected
            // the audible output path.
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

            // Memory leak prevention patch: p5.SoundFile.dispose() disconnects
            // graph nodes but does not clear the decoded AudioBuffer. Leaving
            // this reference alive matches the observed ~track-size RAM
            // increase when skipping many songs.
            soundFile.buffer = null;
            // Memory leak prevention patch: callbacks/cues/files can keep the
            // discarded sound object reachable through closures or event paths.
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
     * Memory leak prevention patch for discarded p5.SoundFile source nodes.
     * @param {AudioBufferSourceNode|null} node - Web Audio source node.
     * @param {p5.SoundFile} soundFile - Owner used to remove p5 ended handler.
     */
    releaseAudioBufferSource(node, soundFile) {
        if (!node) {
            return;
        }

        try {
            if (soundFile && soundFile._clearOnEnd && typeof node.removeEventListener === "function") {
                // Memory leak prevention patch: remove p5.sound's bound ended
                // handler so the stopped source cannot keep the old SoundFile
                // reachable after track handoff.
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
            // Memory leak prevention patch: explicitly sever the native
            // AudioBuffer reference held by the source node when the browser
            // allows it.
            node.buffer = null;
        } catch (error) {
            // Some implementations expose buffer as non-writable after start.
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
        // Memory optimization: p5.sound can emit many progress callbacks per
        // track. Bucket logging keeps diagnostics useful without growing the
        // browser console for hours.
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
        if (this.keepPlaying && this.getProgress() >= 0.999) { //detect song ended
            this.playNext();
        }   
    }


}
