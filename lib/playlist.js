class PlayList{

    /**
     * Creates a new PlayList instance
     * (not using the word playlist to avoid confusion with Subsonic's playlist)
     * @param {Array} songslist - An array of song objects to initialize the playlist
     */
    constructor(songslist=[]){ // Initialize with an empty array if no songs are provided
        this.songslist = songslist; // Store the list of songs
        this.pointer = 0;
        
    }

    /**
     * Moves the pointer to the next song in the playlist
     */
    next(){
        if (this.pointer==this.songslist.length-1){
            this.pointer=0;
        }else{
            this.pointer+=1;
        }
    }

    /**
     * Moves the pointer to the previous song in the playlist
     */
    previous(){
        if (this.pointer==0){
            this.pointer==this.songslist.length-1
        }else{
            this.pointer-=1;
        }
    }

    /**
     * Returns the current song in the playlist
     * @returns {Object} The current song object
     */
    getCurrent(){
        return this.songslist[this.pointer];
    }

    /**
     * Returns the next song in the playlist
     * @returns {Object} The next song object
     */
    getNext(){
        this.next();
        return this.getCurrent();
    }

    /**
     * Returns the length of the playlist
     * @returns {number} The length of the playlist
     */
    getLength(){
        return this.songslist.length;
    }

    /**
     * Returns a song from the playlist by index
     * @param {number} index - The index of the song to retrieve
     * @returns {Object|null} The song object or null if index is out of bounds
     */
    getSong(index){
        if(index>=0 && index<=this.songslist.length-1){
            return this.songslist[index];
        }else{
            console.log("Playlist: Index sent out of bounds");
            return null;
        }
    }

    /**
     * Clears the playlist
     */
    clear(){
        this.songslist.splice(0,this.songslist.length);//remove all elements
        this.songslist=[]; //make sure the array is empty
        this.pointer=0;
    }

    /**
     * Adds a list of songs to the playlist
     * @param {Array} songslist - The list of songs to add
     */
    addSongsList(songslist){
        this.songslist.push(...songslist); //'...' spread append
    }

    /**
     * Removes a song from the playlist by index
     * @param {number} index - The index of the song to remove
     */
    removeSong(index){
        this.songslist.splice(index,1);
    }   

    /**
     * Adds a song to the playlist
     * @param {Object} song - The song object to add
     */
    addSong(song){
        this.songslist.push(song);
    }

    /**
     * Queries the playing state
     * @returns {boolean} The playing state
     * @param {boolean} playing - The next playing state
     */
    isPlaying(playing=null){
        if (playing==null){
            return this.playing;
        }else{
            this.playing=playing;
        }
        
    }

    /**
     * Queries the next loaded state
     * @returns {boolean} The next loaded state
     * @param {boolean} loaded - The next loaded state
     */
    isNextLoaded(loaded=null){
        if (loaded==null){
            return this.nextloaded;
        }else{
            this.nextloaded=loaded;
        }
        
    }

    /**
     * Sets the pointer to a specific value
     * @param {number} val - The value to set the pointer to
     */
    setPointer(val){
        if(val>=0 && val<=this.songslist.length-1){
            this.pointer=val;
        }else{
            console.log("Playlist: Pointer sent out of bounds "+ val);
        }
    }

    /**
     * Returns the playlist
     * @returns {Array} The songs list
     */
    getPlayList(){
        return this.songslist;
    }

    /**
     * Points to a random song in the playlist
     * @returns {void}
     */
    pointToRandom(){
        this.pointer=Math.floor(Math.random()*this.songslist.length)
    }



    /**
     * Returns the pointer from a songId
     * @param {ret} songId 
     * @returns 
     */
    getPointerFromSongId(songId){
        for (let i=0;i<this.songslist.length;i++){
            if (this.songslist[i].id==songId){
                return i;
            }
        }
        console.log("Playlist: SongId not found in playlist");
        return -1;
    }

    /**
     * Returns the pointer
     * @returns 
     */
    getPointer(){
        return this.pointer;
    }



}