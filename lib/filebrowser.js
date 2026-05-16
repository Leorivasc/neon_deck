/**
 * Class that creates a file browser using the Subsonic API getIndexes() and getMusicDirectory()
 * and displays it in a scrollable list.
 * Allows navigation through folders and selection of songs to play.
 */
class FileBrowser {
    /**
     * Creates a new FileBrowser instance.
     * @param {number} x - The x-coordinate of the file browser.
     * @param {number} y - The y-coordinate of the file browser.
     * @param {number} w - The width of the file browser.
     * @param {number} h - The height of the file browser.
     * @param {Object} songsList - The playlist object to manage songs.
     * @param {Object} subsonicObj - The Subsonic API object to interact with the API.
     * @param {Object} playerObj - Playback controller used by normal click playback.
     * @param {TelemetryLog|null} telemetry - Optional DATA FEED logger.
     */
    constructor(x, y, w, h, songsList, subsonicObj, playerObj, telemetry = null) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.items = []; // items to display
        this.scrollOffset = 0; // scroll offset
        this.itemHeight = 20; // height of each item
        this.selectedIndex = 0; // selected item index
        this.fontSize = 12; // font size
        this.scrollbarWidth = 20; // width of scrollbar
        this.scrollbarColor = null; // Scrollbar drawing reads the active theme from UI.line.
        this.scrollbarDragging = false; // is scrollbar being dragged
        this.scrollbarDragOffset = 0; // offset when dragging scrollbar
        this.visibleItems = Math.floor(this.h / this.itemHeight); // number of visible items
        this.totalItems = 0; // total number of items
        this.scrollbarHeight = 0; // height of scrollbar
        this.scrollbarY = 0; // y position of scrollbar
        this.scrollbarHover = false; // is mouse over scrollbar
        this.subsonicObj = subsonicObj; // Subsonic API object
        this.loadIndexes(); // load indexes from Subsonic API
        this.songsList = songsList || []; // list of songs for playlist
        this.folderHistory = []; // stack to keep track of previous folder ids for navigation
        this.playerObj = playerObj; // Player object to play songs
        this.telemetry = telemetry; // DATA FEED logger for browser queue actions
        this.addMode = false; // When enabled, song clicks append to queue instead of replacing playback.
        // Browser row glyphs keep folder/song rows visually distinct without
        // changing the underlying Subsonic item model.
        this.folderIcon = "🗀";
        this.songIcon = "♪";

        // Toolbar properties
        this.toolbarWidth = 28; // Width of the vertical toolbar
        this.toolbarButtons = [
            {
                icon: "⟳", // Reload icon
                action: () => { this.loadIndexes(); this.folderHistory = []; }, // Action to invoke loadIndexes()
                color: color(246, 200, 95), // Button background color
                height: 20, // Button height
            },
            {
                icon: "←", // Back icon
                action: () => this.navigateBack(), // Action to invoke navigateBack()
                color: color(246, 200, 95), // Button background color
                height: 20, // Button height
            },
            {
                icon: "+", // Add mode toggle
                action: () => this.toggleAddMode(),
                active: () => this.addMode,
                height: 20,
            },
        ];
    }

    /**
     * Draws the file browser, including the toolbar, items, and scrollbar.
     */
    draw() {
        push();
        // Draw the toolbar
        noStroke();
        fill(UI.panelAlt[0], UI.panelAlt[1], UI.panelAlt[2]);
        rect(this.x, this.y, this.toolbarWidth, this.h, 4);

        // Draw toolbar buttons
        let buttonY = this.y + 5; // Initial Y position for the first button
        for (const button of this.toolbarButtons) {
            const active = typeof button.active === "function" && button.active();
            const buttonColor = active ? UI.line : UI.amber;
            fill(buttonColor[0], buttonColor[1], buttonColor[2], active ? 80 : 45);
            stroke(buttonColor[0], buttonColor[1], buttonColor[2]);
            rect(this.x + 5, buttonY, this.toolbarWidth - 10, button.height, 3); // Use the button's height
            noStroke();
            fill(UI.text[0], UI.text[1], UI.text[2]);
            textSize(17);
            textAlign(CENTER, CENTER);
            text(button.icon, this.x + this.toolbarWidth / 2, buttonY + button.height / 2); // Center the icon
            buttonY += button.height + 5; // Add spacing between buttons
        }

        // Draw the file browser background
        noStroke();
        fill(UI.surface[0], UI.surface[1], UI.surface[2], 238);
        rect(this.x + this.toolbarWidth, this.y, this.w - this.toolbarWidth, this.h, 4);

        this.visibleItems = Math.floor(this.h / this.itemHeight); // recalculate visible items
        this.totalItems = this.items.length; // update total items

        // Set text properties
        fill(UI.text[0], UI.text[1], UI.text[2]);
        textSize(this.fontSize);
        textAlign(LEFT, TOP); // Align text to the left and top

        // Fill the box with items
        for (let i = 0; i < this.visibleItems; i++) {
            const itemIndex = i + this.scrollOffset;
            if (itemIndex >= this.totalItems) break;
            const item = this.items[itemIndex];

            // Highlight the selected item
            if (itemIndex === this.selectedIndex) {
                fill(UI.line[0], UI.line[1], UI.line[2], 36);
                rect(this.x + this.toolbarWidth, this.y + i * this.itemHeight, this.w - this.toolbarWidth - this.scrollbarWidth, this.itemHeight);
                fill(UI.text[0], UI.text[1], UI.text[2]);
            } else {
                fill(UI.muted[0], UI.muted[1], UI.muted[2]);
            }

            // Truncate text if it exceeds the width of the box
            let textToDisplay = this.getItemDisplayLabel(item);
            let trimmed = false;
            const maxTextWidth = this.w - this.toolbarWidth - this.scrollbarWidth - 15; // Account for padding and scrollbar
            while (textWidth(textToDisplay) > maxTextWidth) {
                textToDisplay = textToDisplay.slice(0, -1); // Remove the last character
                trimmed = true;
            }

            if (trimmed) textToDisplay = textToDisplay.trim() + "..."; // Add ellipsis

            // Draw the item name aligned to the left
            text(textToDisplay, this.x + this.toolbarWidth + 5, this.y + i * this.itemHeight + 5);
        }

        // Draw the scrollbar
        fill(UI.line[0], UI.line[1], UI.line[2]);

        if (this.totalItems > this.visibleItems) {
            // Calculate the scrollbar height based on the ratio of visible items to total items
            this.scrollbarHeight = Math.max((this.visibleItems / this.totalItems) * this.h, 20); // Ensure a minimum height

            // Calculate the scrollbar's Y position based on the current offset
            this.scrollbarY = this.y + (this.scrollOffset / (this.totalItems - this.visibleItems)) * (this.h - this.scrollbarHeight);

            // Clamp scrollbarY to ensure it stays within bounds
            if (this.scrollbarY < this.y) {
                this.scrollbarY = this.y;
            }
            if (this.scrollbarY + this.scrollbarHeight > this.y + this.h) {
                this.scrollbarY = this.y + this.h - this.scrollbarHeight;
            }

            // Draw scrollbar background
            rect(this.x + this.w - this.scrollbarWidth + 6, this.scrollbarY, 8, this.scrollbarHeight, 4);
            // Draw scrollbar border
            noStroke();
        }

        // Line to separate scrollbar
        stroke(UI.line[0], UI.line[1], UI.line[2], 70);
        line(this.x + this.w - this.scrollbarWidth, this.y, this.x + this.w - this.scrollbarWidth, this.y + this.h);
        noStroke();
        pop();
    }

    /**
     * Handles mouse pressed events.
     * Detects clicks on toolbar buttons, scrollbar, and items in the file browser.
     * @param {number} mx - The x-coordinate of the mouse click.
     * @param {number} my - The y-coordinate of the mouse click.
     * @param {Object} options - Optional behavior flags.
     * @param {boolean} options.addToQueue - Appends song clicks to the queue.
     * @returns {boolean} True when the browser consumed the click.
     */
    handleMouse(mx, my, options = {}) {
        // Check if the mouse is over a toolbar button
        let buttonY = this.y + 5; // Initial Y position for the first button
        for (const button of this.toolbarButtons) {
            if (
                mx > this.x + 5 &&
                mx < this.x + this.toolbarWidth - 5 &&
                my > buttonY &&
                my < buttonY + button.height
            ) {
                button.action(); // Invoke the button's action
                return true;
            }
            buttonY += button.height + 5; // Add spacing between buttons
        }

        // Check if mouse is over scrollbar
        if (
            mx > this.x + this.w - this.scrollbarWidth &&
            mx < this.x + this.w &&
            my > this.scrollbarY &&
            my < this.scrollbarY + this.scrollbarHeight
        ) {
            this.scrollbarHover = true;
            this.scrollbarDragging = true;
            this.scrollbarDragOffset = my - this.scrollbarY;
            return true;
        } else {
            this.scrollbarHover = false;
        }

        // If mouse is over items
        if (
            mx > this.x + this.toolbarWidth &&
            mx < this.x + this.w - this.scrollbarWidth &&
            my > this.y &&
            my < this.y + this.h
        ) {
            const itemIndex = Math.floor((my - this.y) / this.itemHeight) + this.scrollOffset;

            const level = this.folderHistory.length;
            const appendToQueue = this.addMode || options.addToQueue === true;

            //Clicked on root level, (A,B,C, etc)
            if(itemIndex<this.totalItems && level===0){
                this.selectedIndex=itemIndex;
                const item = this.items[itemIndex];
                if(!item){
                    return true;
                }

                if(item.type==='folder'){ //load folder array
                    if (appendToQueue) {
                        this.addFolderToQueue(item);
                        return true;
                    }

                    //clear items and load new items from  items.indexes[itemIndex].id
                    //this.items=[{name:'Loading'}]; //clear items array
                    this.items=Array.isArray(item.artists) ? item.artists : []; //load artists array
                    this.totalItems=this.items.length;
                    this.scrollOffset=0; //reset offset
                    this.selectedIndex=0; //reset selected index
                    this.folderHistory.push(itemIndex); //This is a sort of exception, sice Artists are NOT folders, but we need to store something for navigation


                }else if(item.type==='song'){ //play song located in root
                    if (appendToQueue) {
                        this.addSongToQueue(item);
                        return true;
                    }

                    if(item.id && this.playerObj){
                        this.playerObj.playSongById(item.id);
                    }
                }
                return true;
            }


            //Clicked on a folder or song inside a folder
            else if(itemIndex<this.totalItems && level>0){
               this.selectedIndex=itemIndex;
                const item = this.items[itemIndex];
                if(!item){
                    return true;
                }

                const itemId = item.id;
                //If it's a song, play it
                if(item.type==='song'){
                    if (appendToQueue) {
                        this.addSongToQueue(item);
                        return true;
                    }

                    if(this.playerObj){
                        this.playerObj.stopSong(); //stop current song if any
                    }
                    //loadAndPlaySong(itemId);
                    this.songsList.clear(); //clear current playlist
                    this.songsList.addSong(item); //add seclected song to playlist
                    this.songsList.setPointer(0); //set pointer to first song
                    //add this and the rest of the songs in the current folder to the playlist
                    for(let i=itemIndex+1; i<this.totalItems; i++){
                        if(this.items[i].type==='song'){
                            this.songsList.addSong(this.items[i]);
                        }
                    }
                    if(item.id && this.playerObj){
                        this.playerObj.playSongById(item.id); //play the song
                    }

                }
                else{
                    if (appendToQueue) {
                        this.addFolderToQueue(item);
                        return true;
                    }

                 //obtain only the folder information
                    if(itemId){
                        this.loadMusicDirectory(itemId); //load music directory for the selected folder
                    }
                }
                return true;

            }

        }

        return false;
    }

    /**
     * Toggles append mode for visible browser song clicks.
     * Normal mode keeps the existing play-now behavior; add mode appends the
     * clicked song to QUEUE without interrupting playback.
     */
    toggleAddMode() {
        this.addMode = !this.addMode;
        if (this.telemetry) {
            this.telemetry.emit("QUEUE", `Add mode :: ${this.addMode ? "enabled" : "disabled"}`, {
                key: "browser-add-mode",
                dedupe: true
            });
        }
    }

    /**
     * Appends a browser song item to the local queue without starting playback.
     * Used by Shift+Click and by the toolbar add mode.
     * @param {Object} item - Browser item representing a song.
     */
    addSongToQueue(item) {
        if (!item || item.type !== "song" || !this.songsList || typeof this.songsList.addSong !== "function") {
            return;
        }

        this.songsList.addSong(item);
        this.emitSongAdded(item);
    }

    /**
     * Appends every song found inside a browser folder to the local queue.
     * Folder expansion is recursive so album/artist containers can be queued
     * from the same add mode used for individual tracks.
     * @param {Object} item - Browser item representing a folder-like row.
     */
    async addFolderToQueue(item) {
        if (!item || item.type === "song" || !this.songsList || typeof this.songsList.addSongsList !== "function") {
            return;
        }

        const folderName = item.name || item.title || "Untitled folder";
        if (this.telemetry) {
            this.telemetry.emit("QUEUE", `Scanning folder :: ${folderName}`);
        }

        const songs = await this.collectSongsFromFolder(item);
        // Batch append avoids rebuilding playlist random state once per track
        // when a large folder is sent to the queue.
        this.songsList.addSongsList(songs);

        if (this.telemetry) {
            this.telemetry.emit("QUEUE", `Added folder :: ${folderName} :: ${songs.length} tracks`);
        }
    }

    /**
     * Emits a DATA FEED event for an appended track.
     * @param {Object} item - Browser song item.
     */
    emitSongAdded(item) {
        if (!this.telemetry || !item) {
            return;
        }

        const artist = item.artist || "Unknown artist";
        const title = item.title || item.name || "Untitled";
        this.telemetry.emit("QUEUE", `Added track :: ${artist} - ${title}`);
    }

    /**
     * Recursively reads Subsonic folder children and returns queue-ready songs.
     * The visited set prevents accidental cycles or repeated directory IDs from
     * expanding forever if the server returns unusual directory data.
     * @param {Object} item - Folder-like browser item.
     * @param {Set<string>} visited - Directory IDs already scanned.
     * @returns {Promise<Array>} Queue-ready song items.
     */
    async collectSongsFromFolder(item, visited = new Set()) {
        if (!item) {
            return [];
        }

        if (item.type === "song") {
            return [item];
        }

        if (Array.isArray(item.artists)) {
            const collected = [];
            for (const artist of item.artists) {
                collected.push(...await this.collectSongsFromFolder(artist, visited));
            }
            return collected;
        }

        if (!item.id || visited.has(item.id)) {
            return [];
        }

        visited.add(item.id);
        const children = await this.subsonicObj.getMusicDirectory(item.id);
        const collected = [];
        for (const child of children) {
            if (!child) {
                continue;
            }

            const childItem = this.createBrowserItemFromDirectoryChild(child);
            if (childItem.type === "song") {
                collected.push(childItem);
            } else {
                collected.push(...await this.collectSongsFromFolder(childItem, visited));
            }
        }

        return collected;
    }

    /**
     * Builds the visible browser row label with a type glyph.
     * Items without an explicit song type are treated as folders because
     * Subsonic artist/index rows navigate like containers in this browser.
     * @param {Object|null} item - Browser row item.
     * @returns {string} Display label with icon prefix.
     */
    getItemDisplayLabel(item) {
        const icon = item?.type === "song" ? this.songIcon : this.folderIcon;
        const name = item?.name || item?.title || "Untitled";
        return `${icon} ${name}`;
    }

    /**
     * Converts a Subsonic directory child into the browser item shape.
     * Keeping this mapping in one place lets drawing, navigation, and recursive
     * queue appends use the same folder/song metadata.
     * @param {Object} child - Raw Subsonic directory child.
     * @returns {Object} Browser item.
     */
    createBrowserItemFromDirectoryChild(child) {
        const name = child.title || child.name || "Untitled";
        return {
            name: name,
            id: child.id,
            type: child.isDir ? "folder" : "song",
            album: child.album,
            albumId: child.albumId,
            artist: child.artist,
            artistId: child.artistId,
            coverArt: child.coverArt,
            parent: child.parent,
            title: child.title,
        };
    }

    /**
     * Handles mouse dragged events for the scrollbar.
     * Updates the scrollbar position and scroll offset based on mouse movement.
     * @param {number} mx - The x-coordinate of the mouse drag.
     * @param {number} my - The y-coordinate of the mouse drag.
     */
    handleMouseDrag(mx, my) {
        if (this.scrollbarDragging) {
            this.visibleItems = Math.floor(this.h / this.itemHeight);
            let maxScrollY = this.y + this.h - this.scrollbarHeight;

            // Calculate the new Y position of the scrollbar
            let newY = my - this.scrollbarDragOffset;

            // Clamp the scrollbar position to stay within bounds
            newY = Math.max(this.y, Math.min(newY, maxScrollY));
            this.scrollbarY = newY;

            // Update the scroll offset based on the scrollbar position
            this.scrollOffset = Math.round(
                ((this.scrollbarY - this.y) / (this.h - this.scrollbarHeight)) * (this.items.length - this.visibleItems)
            );

            // Ensure the scroll offset stays within bounds
            this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, this.items.length - this.visibleItems));
        }
    }

    /**
     * Tests whether the pointer is inside the scrollable browser item area.
     * The toolbar is excluded so wheel input over toolbar buttons does not
     * accidentally scroll the item list.
     * @param {number} mx - Pointer x coordinate.
     * @param {number} my - Pointer y coordinate.
     * @returns {boolean} True when the pointer is inside the browser list.
     */
    containsScrollableArea(mx, my) {
        return mx >= this.x + this.toolbarWidth &&
            mx <= this.x + this.w &&
            my >= this.y &&
            my <= this.y + this.h;
    }

    /**
     * Handles mouse wheel scrolling over the file browser list.
     * @param {number} delta - Mouse wheel delta from p5's wheel event.
     */
    handleMouseWheel(delta) {
        this.visibleItems = Math.floor(this.h / this.itemHeight);
        this.totalItems = this.items.length;
        if (this.totalItems <= this.visibleItems) {
            return;
        }

        // Wheel direction follows the same convention as playlist and DATA FEED:
        // positive deltas move down through the list, negative deltas move up.
        this.scrollOffset += delta > 0 ? 1 : -1;
        this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, this.totalItems - this.visibleItems));
    }

    /**
     * Handles mouse released events.
     * Stops dragging the scrollbar.
     */
    handleMouseReleased() {
        this.scrollbarDragging=false;
    }

    getLayoutBounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Loads the root-level indexes from the Subsonic API and populates the items array.
     * This includes the "A, B, C..." level and associated artists or songs.
     * Resets the file browser state.
     * @async
     */
    async loadIndexes() {
        this.items = []; // clear items array
        this.totalItems = 0; // reset total items

        const indexes = await this.subsonicObj.getIndexes();
        const indexItems = indexes?.index || [];
        const childItems = indexes?.child || [];

        if (indexItems.length > 0) {
            for (const index of indexItems) {
                if(!index){
                    continue;
                }

                const name = index.name || "Untitled";
                const id = index.id;
                const artists = Array.isArray(index.artist) ? index.artist : (index.artist ? [index.artist] : []);
                this.items.push({ name: name, id: id, type: 'folder', artists: artists });
            }
        }
        if (childItems.length > 0) {
            for (const child of childItems) {
                if(!child){
                    continue;
                }

                const name = child.title || child.name || "Untitled";
                const id = child.id;
                this.items.push({ name: name, id: id, type: 'song' });
            }
        }

        this.totalItems = this.items.length;
        console.log("FileBrowser: Loaded indexes");
    }

    /**
     * Loads a music directory from the Subsonic API and populates the items array.
     * Updates the file browser to display the contents of the specified folder.
     * @param {string} id - The ID of the folder to load.
     * @async
     */
    async loadMusicDirectory(id) {
        const directory = await this.subsonicObj.getMusicDirectory(id);

        this.scrollOffset = 0; // reset offset
        this.selectedIndex = 0; // reset selected index
        this.totalItems = 0; // reset total items
        this.items = []; // clear items array
        if (directory.length > 0) {
            for (const child of directory) {
                if(!child){
                    continue;
                }

                this.items.push(this.createBrowserItemFromDirectoryChild(child));
            }
        }
        this.totalItems = this.items.length;
        this.scrollOffset = 0; // reset offset
        this.selectedIndex = 0; // reset selected index
        console.log("FileBrowser: Loaded music directory for id " + id);

        // Update navigation history
        this.folderHistory.push(id);
    }



    /**
     * Navigates back to the previous folder in the navigation history.
     * If at the root level, reloads the root indexes.
     * @async
     */
    async navigateBack() {
        var selected=0;
        if (this.folderHistory.length > 2) {
            // Remove the current folder ID from the history
            this.folderHistory.pop();

            // Get the previous folder ID
            const previousFolderId = this.folderHistory[this.folderHistory.length - 1];

            // Load the previous folder
            await this.loadMusicDirectory(previousFolderId);

            this.folderHistory.pop(); // Remove it again since it will be added again in loadMusicDirectory

            console.log(`FileBrowser: Navigated back to folder id ${previousFolderId}`);
        } else if (this.folderHistory.length === 2) {
            // Remove the current folder ID from the history
            this.folderHistory.pop();
            selected =this.folderHistory[0]; // Get the index of the artist level
            await this.loadIndexes(); // Load the root level
            // Set the selected index to the artist level
            const item = this.items[selected];
            this.items=Array.isArray(item?.artists) ? item.artists : []; //load artists array
            this.totalItems=this.items.length;


            console.log("FileBrowser: Navigated back to the artist level");
        } else{
            this.folderHistory = []; // Clear history
            this.selectedIndex=selected;
            this.scrollOffset=selected;
            await this.loadIndexes(); // Reload the root level
            console.log("FileBrowser: Navigated back to the ABC level");

        }
    }
}
