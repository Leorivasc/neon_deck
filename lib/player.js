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

        //Loads dummy sound to init the sound system
        this.song=loadSound('assets/dot.mp3', () => console.log("Player: Dummy sound loaded."));
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

        this.playlist.next();// advance the pointer
        const nextSong = this.playlist.getPointer();
        if (nextSong || this.loopPlaylist) {
            this.playSongByPlaylistId(nextSong);
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

        this.playlist.previous();
        const previousSong = this.playlist.getPointer();
        if (previousSong) {
            this.playSongByPlaylistId(previousSong);
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

