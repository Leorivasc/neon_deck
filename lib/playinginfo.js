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
                const img = this.subsonicObj.getCoverArt(this.coverid);
                this.cover = loadImage(img,
                                        ()=>{},                                     //success callback
                                        ()=>{                                       //error callback
                                            this.createFallbackCover();
                                        });
            }else{
                this.createFallbackCover();
            }


        }catch{

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

        fill(9, 14, 25, 235);
        stroke(0, 229, 255, 140);
        strokeWeight(1);

        rect(this.x,this.y,350,120,6);//cover border
        noStroke();
        fill(0, 229, 255, 24);
        rect(this.x + 1, this.y + 1, 348, 22, 5);

        fill(237, 247, 255);
        textSize(15);
        textStyle(BOLD);
        text(this.title || "No track selected", this.x+124, this.y+34, 210);
        textStyle(NORMAL);
        fill(143, 167, 184);
        textSize(12);
        text(this.album || "Album pending", this.x+124, this.y+62, 210);
        fill(0, 229, 255);
        text(this.artist || "Artist pending", this.x+124, this.y+84, 210);

        try{
            image(this.cover,this.x+10,this.y+10);
            noFill();

        }catch{

        }
            noFill();
            stroke(0, 229, 255, 150);
            rect(this.x+9,this.y+9,101,101,4);

        if(this.isBusy){
            fill(0,229,255);
        }else{
            fill(255,43,214);
        }
            noStroke();
            ellipse(this.x+340, this.y+110,10,10);

        pop();

       this.isBusy=false;
    }

    drawBusy(){
        this.isBusy=true;
    }


}
