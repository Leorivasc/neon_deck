class PlayList{

    /**
     * Creates a new PlayList instance
     * (not using the word playlist to avoid confusion with Subsonic's playlist)
     * @param {Array} songslist - An array of song objects to initialize the playlist
     */
    constructor(x,y,w,h){ // Initialize with an empty array if no songs are provided
        this.songslist = []; // Store the list of songs
        this.pointer = 0;
        this.randomPlayEnabled = false;
        this.randomPending = [];
        this.randomHistory = [];
        // Memory optimization: previous-track support should not turn random
        // playback into an unbounded history during all-day sessions.
        this.maxRandomHistory = 500;

        this.x=x;
        this.y=y;
        this.w=w;
        this.h=h;

        this.scrollOffset = 0; // Scroll offset for the list
        this.itemHeight = 20; // Height of each item
        this.scrollbarWidth = 20; // Width of the scrollbar
        this.scrollbarDragging = false; // Is the scrollbar being dragged
        this.scrollbarY = 0; // Y position of the scrollbar
        this.scrollbarHeight = 0; // Height of the scrollbar
        this.scrollbarDragOffset = 0; // Offset when dragging the scrollbar
        this.scrollbarColor = null; // Scrollbar drawing reads the active theme from UI.line.
    }

    /**
     * Moves the pointer to the next song in the playlist
     */
    next(loop = true){
        if (this.songslist.length === 0) {
            return false;
        }

        if (this.randomPlayEnabled) {
            return this.nextRandom(loop);
        }

        if (this.pointer==this.songslist.length-1){
            if (!loop) {
                return false;
            }
            this.pointer=0;
        }else{
            this.pointer+=1;
        }

        return true;
    }

    /**
     * Moves the pointer to the previous song in the playlist
     */
    previous(loop = true){
        if (this.songslist.length === 0) {
            return false;
        }

        if (this.randomPlayEnabled && this.randomHistory.length > 0) {
            this.pointer = this.randomHistory.pop();
            this.rebuildRandomPending();
            return true;
        }

        if (this.pointer==0){
            if (!loop) {
                return false;
            }
            this.pointer=this.songslist.length-1
        }else{
            this.pointer-=1;
        }

        return true;
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
        this.resetRandomPlayState();
    }

    /**
     * Adds a list of songs to the playlist
     * @param {Array} songslist - The list of songs to add
     */
    addSongsList(songslist){
        this.songslist.push(...songslist); //'...' spread append
        this.rebuildRandomPending();
    }

    /**
     * Removes a song from the playlist by index
     * @param {number} index - The index of the song to remove
     */
    removeSong(index){
        this.songslist.splice(index,1);
        this.pointer = Math.min(this.pointer, Math.max(0, this.songslist.length - 1));
        this.resetRandomPlayState();
    }

    /**
     * Adds a song to the playlist
     * @param {Object} song - The song object to add
     */
    addSong(song){
        this.songslist.push(song);
        this.rebuildRandomPending();
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
            this.markRandomIndexPlayed(val);
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
        this.nextRandom();
    }

    /**
     * Enables or disables random play without reordering the visible queue.
     * Random play chooses a random next pointer from unplayed candidates.
     */
    setRandomPlay(enabled) {
        const nextEnabled = !!enabled;
        if (this.randomPlayEnabled === nextEnabled) {
            return;
        }

        this.randomPlayEnabled = nextEnabled;
        this.resetRandomPlayState();
        this.markRandomIndexPlayed(this.pointer);
    }

    isRandomPlayEnabled() {
        return this.randomPlayEnabled;
    }

    resetRandomPlayState() {
        this.randomPending = [];
        this.randomHistory = [];
        this.rebuildRandomPending();
    }

    rebuildRandomPending() {
        this.randomPending = [];
        for (let i = 0; i < this.songslist.length; i++) {
            if (i !== this.pointer) {
                this.randomPending.push(i);
            }
        }
    }

    markRandomIndexPlayed(index) {
        this.randomPending = this.randomPending.filter((candidate) => candidate !== index);
    }

    nextRandom(loop = true) {
        if (this.songslist.length === 0) {
            return false;
        }

        if (this.songslist.length <= 1) {
            return loop;
        }

        if (this.randomPending.length === 0) {
            if (!loop) {
                return false;
            }
            this.rebuildRandomPending();
        }

        if (this.randomPending.length === 0) {
            return false;
        }

        const previousPointer = this.pointer;
        const randomPosition = Math.floor(Math.random() * this.randomPending.length);
        this.pointer = this.randomPending.splice(randomPosition, 1)[0];
        if (previousPointer !== this.pointer) {
            this.randomHistory.push(previousPointer);
            this.trimRandomHistory();
        }

        return true;
    }

    /**
     * Trims random playback history so previous-track navigation remains useful
     * without retaining an unbounded list during long random sessions.
     */
    trimRandomHistory() {
        // Memory optimization: keep enough history for UX, but cap it by both
        // queue size and a fixed ceiling.
        const maxHistory = Math.max(1, Math.min(this.maxRandomHistory, this.songslist.length));
        if (this.randomHistory.length > maxHistory) {
            this.randomHistory.splice(0, this.randomHistory.length - maxHistory);
        }
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


    // Draw the playlist with a scrollbar
    draw() {
        push();
        // Draw the background of the playlist
        noStroke();
        fill(UI.surface[0], UI.surface[1], UI.surface[2], 238);
        rect(this.x, this.y, this.w, this.h, 4);

        // Calculate visible items
        let visibleItems = Math.floor(this.h / this.itemHeight);
        let startIndex = Math.max(0, this.scrollOffset);
        let endIndex = Math.min(this.songslist.length, startIndex + visibleItems);

        // Draw the songs in the playlist
        fill(UI.text[0], UI.text[1], UI.text[2]);
        textSize(12);
        textAlign(LEFT, TOP);

        for (let i = startIndex; i < endIndex; i++) {
            let yPosition = this.y + (i - startIndex) * this.itemHeight;
            if (i === this.pointer) {
                fill(UI.pink[0], UI.pink[1], UI.pink[2], 36);
                rect(this.x, yPosition, this.w - this.scrollbarWidth, this.itemHeight);
                fill(UI.text[0], UI.text[1], UI.text[2]);
            } else {
                fill(UI.muted[0], UI.muted[1], UI.muted[2]);
            }

            // Truncate text if it exceeds the width of the box
            let textToDisplay = this.songslist[i]?.title || "Untitled";
            let trimmed = false;
            const maxTextWidth = this.w - this.scrollbarWidth - 15; // Account for padding and scrollbar
            while (textWidth(textToDisplay) > maxTextWidth) {
                textToDisplay = textToDisplay.slice(0, -1); // Remove the last character
                trimmed = true;
            }

            if (trimmed) textToDisplay = textToDisplay.trim() + "..."; // Add ellipsis

            // Draw the item name aligned to the left
            text(textToDisplay, this.x + 5, yPosition + 5);
        }

        // Draw the scrollbar
        if (this.songslist.length > visibleItems) {
            // Calculate the scrollbar height and position
            this.scrollbarHeight = Math.max((visibleItems / this.songslist.length) * this.h, 20); // Minimum height
            this.scrollbarY = this.y + (this.scrollOffset / (this.songslist.length - visibleItems)) * (this.h - this.scrollbarHeight);

            // Ensure the scrollbar stays within bounds
            this.scrollbarY = Math.max(this.y, Math.min(this.scrollbarY, this.y + this.h - this.scrollbarHeight));

            fill(UI.line[0], UI.line[1], UI.line[2]);
            rect(this.x + this.w - this.scrollbarWidth + 6, this.scrollbarY, 8, this.scrollbarHeight, 4);
        }

        // Draw separator scrollbar separator
        stroke(UI.line[0], UI.line[1], UI.line[2], 70);
        line(this.x + this.w - this.scrollbarWidth, this.y, this.x + this.w - this.scrollbarWidth, this.y + this.h);

        pop();
    }

    /**
     * Tests whether the pointer is inside the playlist list area.
     * @param {number} mx - Pointer x coordinate.
     * @param {number} my - Pointer y coordinate.
     * @returns {boolean} True when the pointer is inside the playlist box.
     */
    contains(mx, my) {
        return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
    }

    /**
     * Handles mouse wheel scrolling over the playlist.
     * @param {number} delta - Mouse wheel delta from p5's wheel event.
     */
    handleMouseWheel(delta) {
        let visibleItems = Math.floor(this.h / this.itemHeight);
        if (this.songslist.length > visibleItems) {
            // Update the scroll offset based on the wheel delta
            this.scrollOffset += delta > 0 ? 1 : -1;
            this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, this.songslist.length - visibleItems));
        }
    }

    // Handle mouse pressed events for the scrollbar
    handleMouse(mx, my) {
        // Check if the mouse is within the bounds of the scrollbar
        if (
            mx >= this.x + this.w - this.scrollbarWidth && // Within the scrollbar's X bounds
            mx <= this.x + this.w &&
            my >= this.scrollbarY && // Within the scrollbar's Y bounds
            my <= this.scrollbarY + this.scrollbarHeight
        ) {
            this.scrollbarDragging = true; // Start dragging
            this.scrollbarDragOffset = my - this.scrollbarY; // Calculate drag offset
        }
    }

    getItemIndexAt(mx, my) {
        const visibleItems = Math.floor(this.h / this.itemHeight);
        const insideList = mx >= this.x &&
            mx <= this.x + this.w - this.scrollbarWidth &&
            my >= this.y &&
            my <= this.y + this.h;

        if (!insideList) {
            return -1;
        }

        const row = Math.floor((my - this.y) / this.itemHeight);
        if (row < 0 || row >= visibleItems) {
            return -1;
        }

        const index = this.scrollOffset + row;
        return index >= 0 && index < this.songslist.length ? index : -1;
    }

    // Handle mouse dragged events for the scrollbar
    handleMouseDrag(mx, my) {
        if (this.scrollbarDragging) {
            let visibleItems = Math.floor(this.h / this.itemHeight);
            let maxScrollY = this.y + this.h - this.scrollbarHeight;

            // Calculate the new Y position of the scrollbar
            let newY = my - this.scrollbarDragOffset;

            // Clamp the scrollbar position to stay within bounds
            newY = Math.max(this.y, Math.min(newY, maxScrollY));
            this.scrollbarY = newY;

            // Update the scroll offset based on the scrollbar position
            this.scrollOffset = Math.round(
                ((this.scrollbarY - this.y) / (this.h - this.scrollbarHeight)) * (this.songslist.length - visibleItems)
            );

            // Ensure the scroll offset stays within bounds
            this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, this.songslist.length - visibleItems));
        }
    }

    // Handle mouse released events
    handleMouseReleased() {
        this.scrollbarDragging = false;
    }

    getLayoutBounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }
}
