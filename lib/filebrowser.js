/**
 * Class that creates a file browser using the Subsonic API getIndexes() and getMusicDirectory()
    * and displays it in a scrollable list.
    * Allows navigation through folders and selection of songs to play.
    * 
 */
class FileBrowser {
    constructor(x, y, w, h, songsList) {
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
        this.scrollbarColor = color(200); // color of scrollbar
        this.scrollbarDragging = false; // is scrollbar being dragged
        this.scrollbarDragOffset = 0; // offset when dragging scrollbar
        this.visibleItems = Math.floor(this.h / this.itemHeight); // number of visible items
        this.totalItems = 0; // total number of items
        this.scrollbarHeight = 0; // height of scrollbar
        this.scrollbarY = 0; // y position of scrollbar
        this.scrollbarHover = false; // is mouse over scrollbar
        this.loadIndexes(); // load indexes from Subsonic API
        this.songsList = songsList || []; // list of songs for playlist
        this.folderHistory = []; // stack to keep track of previous folder ids for navigation

        // Toolbar properties
        this.toolbarWidth = 28; // Width of the vertical toolbar
        this.toolbarButtons = [
            {
                icon: "⟳", // Reload icon
                action: () => {this.loadIndexes();this.folderHistory=[]}, // Action to invoke loadIndexes()
                color: color(250,200,0), // Button background color
                height: 20, // Button height
            },
            {
                icon: "←", // Back icon
                action: () => this.navigateBack(), // Action to invoke navigateBack()
                color: color(250,200,0), // Button background color
                height: 20, // Button height
            },
        ];
    }




    //Draw the file browser
    draw(){
        push();
        // Draw the toolbar
        fill(80);
        rect(this.x, this.y, this.toolbarWidth, this.h);

        // Draw toolbar buttons
        let buttonY = this.y + 5; // Initial Y position for the first button
        for (const button of this.toolbarButtons) {
            fill(button.color); // Use the button's color
            rect(this.x + 5, buttonY, this.toolbarWidth - 10, button.height); // Use the button's height
            fill(0);
            textSize(20);
            textAlign(CENTER, CENTER);
            text(button.icon, this.x + this.toolbarWidth / 2, buttonY + button.height / 2); // Center the icon
            buttonY += button.height + 5; // Add spacing between buttons
        }

        // Draw the file browser background
        fill(150);
        rect(this.x + this.toolbarWidth, this.y, this.w - this.toolbarWidth, this.h);

        this.visibleItems = Math.floor(this.h / this.itemHeight); // recalculate visible items
        this.totalItems = this.items.length; // update total items

        // Set text properties
        fill(255);
        textSize(this.fontSize);
        textAlign(LEFT, TOP); // Align text to the left and top

        // Fill the box with items
        for (let i = 0; i < this.visibleItems; i++) {
            const itemIndex = i + this.scrollOffset;
            if (itemIndex >= this.totalItems) break;
            const item = this.items[itemIndex];

            // Highlight the selected item
            if (itemIndex === this.selectedIndex) {
                fill(100);
                rect(this.x + this.toolbarWidth, this.y + i * this.itemHeight, this.w - this.toolbarWidth - this.scrollbarWidth, this.itemHeight);
                fill(255);
            } else {
                fill(255);
            }

            // Truncate text if it exceeds the width of the box
            let textToDisplay = item.name;
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
        fill(this.scrollbarColor);

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
            rect(this.x + this.w - this.scrollbarWidth, this.scrollbarY, this.scrollbarWidth, this.scrollbarHeight);
            // Draw scrollbar border
            stroke(0);
            rect(this.x + this.w - this.scrollbarWidth, this.scrollbarY, this.scrollbarWidth, this.scrollbarHeight);
        }

        // Line to separate scrollbar
        stroke(0);
        line(this.x + this.w - this.scrollbarWidth, this.y, this.x + this.w - this.scrollbarWidth, this.y + this.h);
        noStroke();
        pop();
    }


    //Handle mouse pressed events   
    handleMouse(mx,my){
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

                if(item.type==='folder'){ //load folder array
                    //clear list and load new items from  items.indexes[itemIndex].id
                    //this.items=[{name:'Loading'}]; //clear items array
                    this.items=item.artists; //load artists array
                    this.totalItems=this.items.length;
                    this.scrollOffset=0; //reset offset
                    this.selectedIndex=0; //reset selected index
                    this.folderHistory.push(itemIndex); //This is a sort of exception, sice Artists are NOT folders, but we need to store something for navigation

                    
                }else if(item.type==='song'){ //play song located in root
                    allStop();
                    loadAndPlaySong(item.id);
                }
            }


            //Clicked on a folder or song inside a folder
            else if(itemIndex<this.totalItems && level>0){ 
               this.selectedIndex=itemIndex;
                const itemId = this.items[itemIndex].id;
                //If it's a song, play it
                if(this.items[itemIndex].type==='song'){
                    allStop();
                    //loadAndPlaySong(itemId);
                    this.songsList.clear(); //clear current playlist
                    this.songsList.addSong(this.items[itemIndex]); //add seclected song to playlist
                    this.songsList.setPointer(0); //set pointer to first song
                    //add this and the rest of the songs in the current folder to the playlist
                    for(let i=itemIndex+1; i<this.totalItems; i++){
                        if(this.items[i].type==='song'){
                            this.songsList.addSong(this.items[i]);
                        }
                    }
                    loadAndPlaySong(this.items[itemIndex].id); //play the song

                }
                else{
                 //obtain only the folder information
                
                this.loadMusicDirectory(itemId); //load music directory for the selected folder
                }
        
            }

        }
    }


    //Handle mouse dragged events
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


    //Handle mouse released events
    handleMouseReleased(){
        this.scrollbarDragging=false;
    }



    //Load indexes from Subsonic API and populate items array
    //Just for the root level (A,B,C, etc)
    async loadIndexes(){
        this.items=[]; //clear items array
        this.totalItems=0; //reset total items

        
        const indexes = await SubsonicObj.getIndexes();
        if(indexes.index.length>0){
            for(const index of indexes.index){
                const name = index.name;
                const id = index.id;
                const artists = index.artist;
                this.items.push({name:name, id:id, type:'folder', artists:artists});
            }
        }    
        if(indexes.child.length>0){
            for(const child of indexes.child){
                const name = child.title;
                const id = child.id;
                this.items.push({name:name, id:id, type:'song'});
            }
        }
            
            this.totalItems=this.items.length;
            console.log("FileBrowser: Loaded indexes");

    }



    //Load music directory from Subsonic API and populate items array
    // id found under directory.child.[x].id
    // isDir found under directory.child.[x].isDir
    async loadMusicDirectory(id){
        const directory = await SubsonicObj.getMusicDirectory(id);
        
        this.scrollOffset=0; //reset offset
        this.selectedIndex=0; //reset selected index
        this.totalItems=0; //reset total items
        this.items=[]; //clear items array
        if(directory.length>0){
            for(const child of directory){
                const name = child.title;
                const id = child.id;
                const type = child.isDir ? 'folder' : 'song'; //All for this
                const album = child.album;
                const albumId = child.albumId;
                const artist = child.artist;
                const astistId = child.artistId;
                const covertArt = child.coverArt;
                const parent = child.parent; //key for navigation
                const title = child.title; 

                this.items.push({name:name, 
                    id:id, 
                    type:type,
                    album:album,
                    albumId:albumId,
                    artist:artist,
                    artistId:astistId,
                    coverArt:covertArt,
                    parent:parent,
                    title:title                               
                });
            }
        }
        this.totalItems=this.items.length;
        this.scrollOffset=0; //reset offset
        this.selectedIndex=0; //reset selected index
        //this.updateScrollbar();
        console.log("FileBrowser: Loaded music directory for id "+id);

        // Update navigation history
        this.folderHistory.push(id);

    }   
    


    // Navigate back to the previous folder
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
            this.items=item.artists; //load artists array
            this.totalItems=this.items.length;
            //this.scrollOffset=selected; //reset offset
            //this.selectedIndex=selected; //set selected index to the previous letter



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