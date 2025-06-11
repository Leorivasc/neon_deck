
class PlayingInfo{

    
    constructor(x,y,mainurl,idstring){
        this.x=x;
        this.y=y;
        this.mainurl = mainurl;
        this.idstring = idstring;
        this.title = "";
        this.album = "";
        this.artist = "";
        this.cover = "";
        this.isBusy=false;
    }

    setSong(currentSong){

        try{
            
            this.title = currentSong.title;
            this.album = currentSong.album;
            this.artist = currentSong.artist;
            this.coverid = currentSong.coverArt;
            this.cover = loadImage(this.mainurl+"getCoverArt?size=100&id="+this.coverid+idstring, 
                                    ()=>{},
                                    ()=>{
                                        //Create false cover to cover (oj, oj)
                                        this.cover = createImage(100,100);
                                        this.cover.loadPixels();
                                        for (let i = 0; i < this.cover.width; i++) {
                                            for (let j = 0; j < this.cover.height; j++) {
                                              this.cover.set(i, j, color(0, 90, 102, (i % this.cover.width) * 2));
                                            }
                                          }
                                        this.cover.updatePixels();
                                       
                                    });


        }catch{
    
        }
    }
   

    draw(){
        push();

        fill(125);
        stroke(0);
        strokeWeight(1);
        
        rect(this.x,this.y,350,120,10);//cover border
        fill(0);
        textSize(15);
        text("\t"+ this.title+"\n"+ this.album+"\n"+ this.artist, this.x+120, this.y+20, 240);

        try{
            image(this.cover,this.x+10,this.y+10);
            noFill();
                    
        }catch{

        }
            noFill();
            rect(this.x+9,this.y+9,101,101);
            
        if(this.isBusy){
            fill(0,255,0);
        }   
            ellipse(this.x+340, this.y+110,10,10);
        
        pop();

       this.isBusy=false;
    }

    drawBusy(){
        this.isBusy=true;
    }


}