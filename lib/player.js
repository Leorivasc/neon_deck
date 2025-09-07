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
        this.loopPlaylist = false; // Whether to loop the playlist
        this.isLoading = false; // Flag to prevent multiple loads
    }

    /**
     * Plays a song from the file path.
     * @param {string} filepath - The file path of the song to play.
     * @param {function} [onEndCallback] - Optional callback to execute when the song ends.
     */
    playSongFromFile(filepath, onEndCallback = null) {
        if (this.isLoading) {
            console.warn("Player: A song is already loading. Please wait.");
            return;
        }

        if (this.song) {
            this.song.stop();
            this.song = null;
        }

        this.isLoading = true; // Set loading flag
        this.song = loadSound(
            filepath,
            () => {
                console.log(`Player: Loaded song from ${filepath}`);
                this.isLoading = false; // Clear loading flag
                this.playSong();
                if (onEndCallback) {
                    this.song.onended(() => {
                        this.isLoading = false; // Ensure loading flag is cleared
                        onEndCallback();
                    });
                }
            },
            () => {
                console.error(`Player: Failed to load song from ${filepath}`);
                this.isLoading = false; // Clear loading flag on error
            },
            (progress) => {
                console.log(`Player: Loading song... ${Math.round(progress * 100)}%`);
            }
        );
    }


    /**
     * Plays a song from its ID in the playlist.
     * @param {string} id - The ID of the song to play.
     * @param {function} [onEndCallback] - Optional callback to execute when the song ends.
     */
    playSongById(id, onEndCallback = null) {
        if (this.isLoading) {
            console.warn("Player: A song is already loading. Please wait.");
            return;
        }

        const position = this.playlist.getPointerFromSongId(id);
        if (position !== -1) {
            this.playlist.setPointer(position);
            const songUrl = this.subsonicClient.getSong(id);

            if (this.song) {
                this.song.stop();
                this.song = null;
            }

            this.isLoading = true; // Set loading flag
            this.song = loadSound(
                songUrl,
                () => {
                    console.log(`Player: Loaded song with ID ${id}`);
                    this.isLoading = false; // Clear loading flag
                    this.playSong();
                    if (onEndCallback) {
                        this.song.onended(() => {
                            this.isLoading = false; // Ensure loading flag is cleared
                            onEndCallback();
                        });
                    }
                },
                () => {
                    console.error(`Player: Failed to load song with ID ${id}`);
                    this.isLoading = false; // Clear loading flag on error
                },
                (progress) => {
                    console.log(`Player: Loading song... ${Math.round(progress * 100)}%`);
                }
            );
        } else {
            console.warn(`Player: Song ID ${id} not found in playlist`);
        }
    }

    
    /**
     * Plays the currently loaded song.
     */
    playSong() {
        if (this.song && this.song.isLoaded()) {
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


        this.playlist.next();
        const nextSong = this.playlist.getCurrent();
        if (nextSong) {
            this.playSongById(nextSong.id);
        } else {
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

        this.playlist.previous();
        const previousSong = this.playlist.getCurrent();
        if (previousSong) {
            this.playSongById(previousSong.id);
        } else {
            console.warn("Player: No previous song in the playlist");
        }
    }

    /**
     * Toggles looping for the playlist.
     */
    toggleLoop() {
        this.loopPlaylist = !this.loopPlaylist;
        console.log(`Player: Looping is now ${this.loopPlaylist ? "enabled" : "disabled"}`);
    }

    /**
     * Starts playing the full playlist in a loop.
     */
    playFullPlaylist() {
        this.keepPlaying = true;
        const currentSong = this.playlist.getCurrent();
        if (currentSong) {
            this.playSongById(currentSong.id, () => {
                if (this.loopPlaylist) {
                    this.playNext();
                } else {
                    this.keepPlaying = false;
                    console.log("Player: Finished playing the playlist");
                }
            });
        } else {
            console.warn("Player: Playlist is empty");
        }
    }

    /**
     * Exposes the current p5.SoundFile object for external use (e.g., applying filters).
     * @returns {p5.SoundFile|null} The current sound object, or null if no song is loaded.
     */
    getSoundObject() {
        return this.song;
    }
}