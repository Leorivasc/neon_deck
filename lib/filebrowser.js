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
     */
    constructor(x, y, w, h, songsList, subsonicObj, playerObj) {
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
        this.scrollbarColor = color(0, 229, 255); // color of scrollbar
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
            fill(UI.amber[0], UI.amber[1], UI.amber[2], 45);
            stroke(UI.amber[0], UI.amber[1], UI.amber[2]);
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
            let textToDisplay = item?.name || "Untitled";
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
     */
    handleMouse(mx, my) {
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
                return;
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

            //Clicked on root level, (A,B,C, etc)
            if(itemIndex<this.totalItems && level===0){
                this.selectedIndex=itemIndex;
                const item = this.items[itemIndex];
                if(!item){
                    return;
                }

                if(item.type==='folder'){ //load folder array
                    //clear items and load new items from  items.indexes[itemIndex].id
                    //this.items=[{name:'Loading'}]; //clear items array
                    this.items=Array.isArray(item.artists) ? item.artists : []; //load artists array
                    this.totalItems=this.items.length;
                    this.scrollOffset=0; //reset offset
                    this.selectedIndex=0; //reset selected index
                    this.folderHistory.push(itemIndex); //This is a sort of exception, sice Artists are NOT folders, but we need to store something for navigation


                }else if(item.type==='song'){ //play song located in root
                    if(item.id && this.playerObj){
                        this.playerObj.playSongById(item.id);
                    }
                }
            }


            //Clicked on a folder or song inside a folder
            else if(itemIndex<this.totalItems && level>0){
               this.selectedIndex=itemIndex;
                const item = this.items[itemIndex];
                if(!item){
                    return;
                }

                const itemId = item.id;
                //If it's a song, play it
                if(item.type==='song'){
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
                 //obtain only the folder information
                    if(itemId){
                        this.loadMusicDirectory(itemId); //load music directory for the selected folder
                    }
                }

            }

        }
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

                const name = child.title || child.name || "Untitled";
                const id = child.id;
                const type = child.isDir ? 'folder' : 'song'; // Determine if it's a folder or song
                const album = child.album;
                const albumId = child.albumId;
                const artist = child.artist;
                const artistId = child.artistId;
                const coverArt = child.coverArt;
                const parent = child.parent; // Key for navigation
                const title = child.title;

                this.items.push({
                    name: name,
                    id: id,
                    type: type,
                    album: album,
                    albumId: albumId,
                    artist: artist,
                    artistId: artistId,
                    coverArt: coverArt,
                    parent: parent,
                    title: title,
                });
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
