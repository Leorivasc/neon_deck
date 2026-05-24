/**
 * PlayingInfo class
 * This class is used to display the current song information
 * including title, album, artist, and cover art.
 *
 */
class PlayingInfo{


    constructor(x,y,subsonicObj){
        this.x=x;
        this.y=y;
        this.title = "";
        this.album = "";
        this.artist = "";
        this.cover = "";
        // PERF PATCH [bounded-cover-cache]: keep recent cover images for
        // repeated albums without retaining artwork for an entire session.
        this.coverCache = new Map();
        this.maxCoverCacheEntries = 24;
        this.isBusy=false;
        this.subsonicObj = subsonicObj;
    }

    setSong(currentSong){

        try{

            this.title = currentSong.title || "";
            this.album = currentSong.album || "";
            this.artist = currentSong.artist || "";
            this.coverid = currentSong.coverArt;
            //Load cover art
            if(this.coverid){
                if (this.coverCache.has(this.coverid)) {
                    this.cover = this.coverCache.get(this.coverid);
                    return;
                }

                const requestedCoverId = this.coverid;
                const img = this.subsonicObj.getCoverArt(this.coverid);
                this.cover = loadImage(img,
                                        ()=>{                                       //success callback
                                            if (this.coverid === requestedCoverId) {
                                                this.cacheCover(requestedCoverId, this.cover);
                                            }
                                        },
                                        ()=>{                                       //error callback
                                            if (this.coverid !== requestedCoverId) {
                                                return;
                                            }
                                            this.createFallbackCover();
                                        });
            }else{
                this.createFallbackCover();
            }


        }catch{

        }
    }

    /**
     * Stores a loaded cover image in a small insertion-ordered cache.
     * Repeated albums can reuse images while older artwork is released.
     * @param {string} coverId - Subsonic cover art identifier.
     * @param {p5.Image} image - Loaded cover image to cache.
     */
    cacheCover(coverId, image) {
        // PERF PATCH [bounded-cover-cache]: Map insertion order gives a tiny
        // LRU-style cache without retaining every cover loaded for hours.
        if (!coverId || !image) {
            return;
        }

        if (this.coverCache.has(coverId)) {
            this.coverCache.delete(coverId);
        }
        this.coverCache.set(coverId, image);

        while (this.coverCache.size > this.maxCoverCacheEntries) {
            const oldestKey = this.coverCache.keys().next().value;
            this.coverCache.delete(oldestKey);
        }
    }

    createFallbackCover(){
        //Create false cover to cover (oj, oj)
        this.cover = createImage(100,100);
        this.cover.loadPixels();
        for (let i = 0; i < this.cover.width; i++) {
            for (let j = 0; j < this.cover.height; j++) {
                this.cover.set(i, j, color(0, 90, 102, (i % this.cover.width) * 2));
            }
        }
        this.cover.updatePixels();
    }


    draw(){
        push();

        fill(UI.surface[0], UI.surface[1], UI.surface[2], 235);
        stroke(UI.line[0], UI.line[1], UI.line[2], 140);
        strokeWeight(1);

        rect(this.x,this.y,350,120,6);//cover border
        noStroke();
        fill(UI.line[0], UI.line[1], UI.line[2], 24);
        rect(this.x + 1, this.y + 1, 348, 22, 5);

        fill(UI.text[0], UI.text[1], UI.text[2]);
        textSize(15);
        textStyle(BOLD);
        text(this.title || "No track selected", this.x+124, this.y+34, 210);
        textStyle(NORMAL);
        fill(UI.muted[0], UI.muted[1], UI.muted[2]);
        textSize(12);
        text(this.album || "Album pending", this.x+124, this.y+62, 210);
        fill(UI.line[0], UI.line[1], UI.line[2]);
        text(this.artist || "Artist pending", this.x+124, this.y+84, 210);

        try{
            image(this.cover,this.x+10,this.y+10);
            noFill();

        }catch{

        }
            noFill();
            stroke(UI.line[0], UI.line[1], UI.line[2], 150);
            rect(this.x+9,this.y+9,101,101,4);

        if(this.isBusy){
            fill(UI.pink);  //Busy downloading indicator
        }else{
            fill(UI.bg);    //Not busy indicator
        }
            noStroke();
            ellipse(this.x+340, this.y+110,10,10);//Busy indicator

        pop();

       this.isBusy=false;
    }

    drawBusy(){
        this.isBusy=true;
    }

    getLayoutBounds(){
        return { x: this.x, y: this.y, w: 350, h: 120 };
    }

    moveTo(x, y){
        this.x = x;
        this.y = y;
    }

}
