class PlayList{

    constructor(songslist=[]){
        this.songslist = songslist;
        this.pointer = 0;
        this.dropdown = createSelect();
    }

    next(){
        if (this.pointer==this.songslist.length-1){
            this.pointer=0;
        }else{
            this.pointer+=1;
        }
    }

    previous(){
        if (this.pointer==0){
            this.pointer==this.songslist.length-1
        }else{
            this.pointer-=1;
        }
    }

    getCurrent(){
        return this.songslist[this.pointer];
    }

    getNext(){
        this.next();
        return this.getCurrent();
    }

    clear(){
        this.songslist.splice(0,this.songslist.length);
        this.pointer=0;
    }

    addSongsList(songslist){
        this.songslist.push(...songslist); //'...' spread append
    }

    removeSong(index){
        this.songslist.splice(index,1);
    }   

    addSong(song){
        this.songslist.push(song);
    }

    isPlaying(playing=null){
        if (playing==null){
            return this.playing;
        }else{
            this.playing=playing;
        }
        
    }

    isNextLoaded(loaded=null){
        if (loaded==null){
            return this.nextloaded;
        }else{
            this.nextloaded=loaded;
        }
        
    }

    setPointer(val){
        if(val>=0 && val<=this.songslist.length-1){
            this.pointer=val;
        }else{
            console.log("Playlist: Pointer sent out of bounds");
        }
    }

    getPlayList(){
        return this.songslist;
    }

    pointToRandom(){
        this.pointer=Math.floor(Math.random()*this.songslist.length)
    }


    putDropDown(x,y){
        this.dropdown.position(x,y);
        this.dropdown.size(200,25);
        this.dropdown.id('playListSongSelect');
        //this.dropdown.changed()
        this.refreshDropDown();
        
    }

    refreshDropDown(){
        document.getElementById('playListSongSelect').innerText = null;//clear
        this.dropdown.option('Select',-1);
        for(var i=0;i<this.songslist.length;i++){
            this.dropdown.option(this.songslist[i].title, i);
        }
    }


}