
/**
 * @fileOverview
 * This file contains the main sketch for a Subsonic music player using p5.js.
 * It includes the setup, preload, and draw functions,
 * as well as various helper functions for audio playback, UI elements, and API interactions.
 * @Leo
 */

//t was pre calculated using MD5()
var u='todos';
var s='12345678';
var t='8a88e30167c2902a16ad085742f0e1e9';
var idstring = '&u='+u+'&s='+s+'&t='+t+'&v=1.16.1&c=JSclientLeo&f=json';
var mainurl = "https://www.rivas.co:8081/rest/";
var response;
var spectrum;
var waveform;
var keepPlaying=false; //semaphore

var playImg;
var pauseImg;
var nextImg;
var prevImg;
var stopImg;

var song;
var songs;
var songsList; //local playlist object
var pp;

var vol;
var pan;
var rate;

var playPlaylistImg;
var pausePlaylistImg;
var stopPlayListImg;

var playListSelect;
var songSelect;


var spectrum;
var waveform;
var progressBar;

var playingInfo;

var knobVolume;

//MD5. From: https://stackoverflow.com/questions/14733374/how-to-generate-an-md5-file-hash-in-javascript-node-js
//var MD5 = function(d){var r = M(V(Y(X(d),8*d.length)));return r.toLowerCase()};function M(d){for(var _,m="0123456789ABCDEF",f="",r=0;r<d.length;r++)_=d.charCodeAt(r),f+=m.charAt(_>>>4&15)+m.charAt(15&_);return f}function X(d){for(var _=Array(d.length>>2),m=0;m<_.length;m++)_[m]=0;for(m=0;m<8*d.length;m+=8)_[m>>5]|=(255&d.charCodeAt(m/8))<<m%32;return _}function V(d){for(var _="",m=0;m<32*d.length;m+=8)_+=String.fromCharCode(d[m>>5]>>>m%32&255);return _}function Y(d,_){d[_>>5]|=128<<_%32,d[14+(_+64>>>9<<4)]=_;for(var m=1732584193,f=-271733879,r=-1732584194,i=271733878,n=0;n<d.length;n+=16){var h=m,t=f,g=r,e=i;f=md5_ii(f=md5_ii(f=md5_ii(f=md5_ii(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_ff(f=md5_ff(f=md5_ff(f=md5_ff(f,r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+0],7,-680876936),f,r,d[n+1],12,-389564586),m,f,d[n+2],17,606105819),i,m,d[n+3],22,-1044525330),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+4],7,-176418897),f,r,d[n+5],12,1200080426),m,f,d[n+6],17,-1473231341),i,m,d[n+7],22,-45705983),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+8],7,1770035416),f,r,d[n+9],12,-1958414417),m,f,d[n+10],17,-42063),i,m,d[n+11],22,-1990404162),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+12],7,1804603682),f,r,d[n+13],12,-40341101),m,f,d[n+14],17,-1502002290),i,m,d[n+15],22,1236535329),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+1],5,-165796510),f,r,d[n+6],9,-1069501632),m,f,d[n+11],14,643717713),i,m,d[n+0],20,-373897302),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+5],5,-701558691),f,r,d[n+10],9,38016083),m,f,d[n+15],14,-660478335),i,m,d[n+4],20,-405537848),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+9],5,568446438),f,r,d[n+14],9,-1019803690),m,f,d[n+3],14,-187363961),i,m,d[n+8],20,1163531501),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+13],5,-1444681467),f,r,d[n+2],9,-51403784),m,f,d[n+7],14,1735328473),i,m,d[n+12],20,-1926607734),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+5],4,-378558),f,r,d[n+8],11,-2022574463),m,f,d[n+11],16,1839030562),i,m,d[n+14],23,-35309556),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+1],4,-1530992060),f,r,d[n+4],11,1272893353),m,f,d[n+7],16,-155497632),i,m,d[n+10],23,-1094730640),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+13],4,681279174),f,r,d[n+0],11,-358537222),m,f,d[n+3],16,-722521979),i,m,d[n+6],23,76029189),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+9],4,-640364487),f,r,d[n+12],11,-421815835),m,f,d[n+15],16,530742520),i,m,d[n+2],23,-995338651),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+0],6,-198630844),f,r,d[n+7],10,1126891415),m,f,d[n+14],15,-1416354905),i,m,d[n+5],21,-57434055),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+12],6,1700485571),f,r,d[n+3],10,-1894986606),m,f,d[n+10],15,-1051523),i,m,d[n+1],21,-2054922799),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+8],6,1873313359),f,r,d[n+15],10,-30611744),m,f,d[n+6],15,-1560198380),i,m,d[n+13],21,1309151649),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+4],6,-145523070),f,r,d[n+11],10,-1120210379),m,f,d[n+2],15,718787259),i,m,d[n+9],21,-343485551),m=safe_add(m,h),f=safe_add(f,t),r=safe_add(r,g),i=safe_add(i,e)}return Array(m,f,r,i)}function md5_cmn(d,_,m,f,r,i){return safe_add(bit_rol(safe_add(safe_add(_,d),safe_add(f,i)),r),m)}function md5_ff(d,_,m,f,r,i,n){return md5_cmn(_&m|~_&f,d,_,r,i,n)}function md5_gg(d,_,m,f,r,i,n){return md5_cmn(_&f|m&~f,d,_,r,i,n)}function md5_hh(d,_,m,f,r,i,n){return md5_cmn(_^m^f,d,_,r,i,n)}function md5_ii(d,_,m,f,r,i,n){return md5_cmn(m^(_|~f),d,_,r,i,n)}function safe_add(d,_){var m=(65535&d)+(65535&_);return(d>>16)+(_>>16)+(m>>16)<<16|65535&m}function bit_rol(d,_){return d<<_|d>>>32-_}


/**
 * An instance of the SubsonicClient class, used to interact with the Subsonic API.
 *
 * @type {SubsonicClient}
 * @param {string} mainurl - The base URL of the Subsonic server.
 * @param {string} u - The username for authentication.
 * @param {string} t - The authentication token or password.
 * @param {string} s - The client identifier or salt.
 */
var SubsonicObj = new SubsonicClient(mainurl, u, t, s);



/**
 * Preloads assets before the sketch starts.
 * Loads a dummy audio file to enable isPaused() or isPlaying() functionality.
 * 
 * @function
 * @global
 */
function preload()
{

//dummy audio so that isPaused() or isPlaying() are enabled
song = loadSound('assets/dot.mp3');

}



/**
 * Initializes the main UI and audio controls for the sketch.
 * 
 * Sets up the canvas, control buttons (play, pause, stop), sliders for volume, pan, and rate,
 * playlist and song selection dropdowns, and visual components such as spectrum, waveform, and progress bar.
 * Also initializes playlist data and creates knob and playing info UI elements.
 * 
 * This function should be called once at the start of the program.
 * 
 * @function
 * @global
 */
function setup()
{

    frameRate(60);

    //Divs
    cnv=createCanvas(1024, 768); 
    //thediv = createDiv();
    cnv.parent("cnv");



    background(180);

    //LIST buttons
    playPlaylistImg = createImg("assets/play.png", "Play");
    playPlaylistImg.mousePressed( ()=>{
                                keepPlaying=true;

                                if(song.isPaused()){         //was it paused?
                                    song.play();
                                }else if(!song.isPlaying()){ //was it idle?
                                    playFullPlayList();
                                }else if(!song.isLoaded()){

                                }
                             
                            });
    
    pausePlaylistImg = createImg("assets/pause.png", "Pause");
    pausePlaylistImg.mousePressed( ()=>{
                                keepPlaying=false;
                                song.pause();
                            });



    stopPlayListImg = createImg("assets/stop.png","Stop");
    stopPlayListImg.mousePressed(()=>{
                                keepPlaying=false;
                                song.stop()

                            });


    //Volume Slider
    vol = createSlider(0, 1, 0.5, 0.01);
    vol.position(140,430);
    vol.style('width', '200px');
    vol.input(setVolume);
   

    //Pan Slider
    pan = createSlider(-1, 1, 0, 0.01);
    pan.value(0);
    pan.position(140,480);
    pan.style('width', '200px');
    pan.input(setPan);
    

    //Rate Slider
    rate = createSlider(0.5, 2, 1, 0.01);
    rate.position(140,530);
    rate.style('width', '200px');
    rate.input(setRate);
  
 


    //Playlist select
    playListSelect = createSelect();
    playListSelect.size(200,25)
    playListSelect.position(130,240);
    playListSelect.option("Select",0);
    playListSelect.id('playListSelect');
    playListSelect.changed(playListElementSelected);



    //Song select
    songsList = new PlayList();
    

    songSelect = createSelect();
    songSelect.position(130,285);
    songSelect.size(200,25);
    songSelect.id('playListSongSelect');
    songSelect.option("Select",0);
    //Will select a song from SubsonicObj
    songSelect.changed(()=>{
                                    var id = songSelect.value();
                                    var songinfo = SubsonicObj.getSongInfo(id);
                                    var position = songsList.getPointerFromSongId(id);
                                    songsList.setPointer(position); //set songslist pointer to current song

                                    keepPlaying=true; //set semaphore
                                    song.stop(); //stop current song if playing
                                    loadAndPlaySong(id, playNext);     //Load and play song, and make sure to play next song on end
                                    
                                    

                                    songinfo.then((song)=>{
                                        loadLyrics(song.artist, song.title);  //Load Lyrics                                    
                                    });
                            });



    


    //Other objects
    spectrum = new Spectrum(410,30,1500,700);
    waveform = new WaveForm(410,270,1500,700);
    progressBar=new ProgressBarH(410,510,450,20);
    


    //fill playlist
    getPlaylists();

    //create Playing info
    playingInfo = new PlayingInfo(30,30,mainurl, idstring);


    //Knobs
    knobVolume = new MakeKnob("lib/images/knob.png",50,150,360,0,1,0.5,2,"Volume");
    knobVolume.textColor = "black";
    knobVolume.textPt = 10;
    knobVolume.showValue = false;
}

/**
 * Main draw loop for the sketch.
 * This function is called repeatedly to update the canvas and UI elements.
 * It handles screen refresh, drawing the progress bar, spectrum, waveform,
 * playing info, and other UI elements.
 */
function draw(){

    //screen refresh
    background(180);

   

    printLabels();

    //Updates the progress bar slider for duration
    var length,currentTime,progress;
    try{
        progress = song.currentTime()/song.duration();
    }catch{
        progress=0;
    }
    //Draw progressbar
    progressBar.setValue(progress);
    progressBar.draw();
    

    //Draw spectrum and waveform
    spectrum.draw();
    waveform.draw();

    //Info box
    playingInfo.draw();


    //img buttons
    imgButtons();

    //Knobs
    knobVolume.update();

    //MouseHelper
    fill(0);
    text("x: "+Math.floor(mouseX)+" y: "+Math.floor(mouseY), mouseX, mouseY);


}

//Add img buttons PLAY PAUSE STOP (to be refreshed in draw())
function imgButtons(){

    //Playlist buttons
    playPlaylistImg.position(355,245);
    pausePlaylistImg.position(383,245);
    stopPlayListImg.position(405,246);

}



function mousePressed(){
    knobVolume.active();
}

function mouseReleased(){
    knobVolume.inactive();
}

function touchStarted(){
    knobVolume.active();
}


//Prints text labels
function printLabels(){

    textSize(10);
    text('Volume', 140, 430);
    text('Pan', 140, 480);
    text('Rate', 140, 530);
    
    text('Playlist', 140, 235);
    text('Songs', 140, 280);
}


//load and play immediately. Calls back on end
function loadAndPlaySong(id,callback){
       

    try{
        song.stop();
    }catch{
        //nuthn
    }
    //print(mainurl+'stream?id='+id+idstring);
    //print(SubsonicObj.getSong(id));
    var songurl=SubsonicObj.getSong(id);
    song = loadSound(songurl, //load song from SubsonicObj
                        ()=>{
                            if(keepPlaying){
                                playSong();//start playing once loaded                               
                            }
                        },

                        ()=>{
                            console.log("Error loading song: "+id);//on error
                        }, 
                        (p)=>{
                            //loading led on
                            playingInfo.drawBusy();
                        }
    );


    playingInfo.setSong(songsList.getCurrent());

    //Attach event on song end
    song.onended(callback);
}



//Loads lyrics from server and displays them in the dedicated divs below the player
//pretty prone to get wrong lyrics, though. This is a server fault, not this script
function loadLyrics(artist, title){
    var lyrics = SubsonicObj.getLyrics(artist, title);

    lyrics.then((res) => {
            
                //console.log(res, artist,title);
                select('#lyrics').html("<pre>"+res+"</pre>");
                select('#title').html(title);
            
        });
   
}


//Play currently loaded song
function playSong(){

    try{
        if(!song.isPlaying() && song.isLoaded()){
            setVolume();//make sure volume is set to the slider value
            song.play();
            keepPlaying=true;

        }else{
            song.pause();
            keepPlaying=false;
        }
    }catch{

    }

}


//Stop all sounds
function allStop(){
    
    keepPlaying=false;
    song.stop();

}


function pauseSong(){
    keepPlaying=false;
    song.pause();
}

//Set volume
function setVolume(){
    //using an exponential function to make it more linear
    var volval = vol.value();
    var volume = -Math.log10(1-volval*(0.9));

    song.setVolume(volume);
}

//Set Pan
function setPan(){
    song.pan(pan.value());
}

//Set Rate
function setRate(){
    song.rate(rate.value());
}



function toggleLoop(){
    if (song.isLooping()){
        song.setLoop(false);
        loopButton.html('Loop OFF');
    }else{
        song.setLoop(true);
        loopButton.html('Loop ON');
    }
}


//Warning. Async inside. Callback needed
function readRestOLD(method, params, mainurl, idstring, callback){

    var url = mainurl+method+"?"+params+"&"+idstring;

    //from:https://stackoverflow.com/questions/12460378/how-to-get-json-from-url-in-javascript
    fetch(url)
        .then(r=>r.json())
        .then(o=>callback(o));
}


/**
 * Will read playlists from the subsonicOb object
 * and add them to the dropdown
 * @function
 * @global
 * @returns {void}
 */
function getPlaylists(){
    var list =  SubsonicObj.getPlaylists();

    list.then((ret)=>{
        //add items to dropdown
        for(item of ret){
            playListSelect.option(item['name'], item['id']);
            //console.log("Added playlist: "+item['name']);
        }
    });

}



/**
 * Handles the event when a playlist is selected from the dropdown.
 * using the SubsonicObj object to get the playlist data
 * fills sons selector with the songs in the playlist
 */
function playListElementSelected(){
    var sel = playListSelect.value();
    var list = SubsonicObj.getPlaylist(sel);
    list.then((ret)=>{
        //console.log(ret);
        let songs = ret['entry'];
        songsList.clear(); //clear local playlist
        songsList.addSongsList(songs);//add all to local playlist
        //clear song selector
        let dropdown=document.getElementById('playListSongSelect');//grab the select element
        dropdown.innerText = null;//clear song selector
        //repopulate song selector
        songSelect.option('Select',-1);
        for(var i=0;i<songsList.getLength();i++){
            songSelect.option(songsList.songslist[i].title, songsList.songslist[i].id);
        }
    });
}



//Triggers full playlist play
function playFullPlayList(){
    try{
        allStop();
    }catch{}
    let current = songsList.getCurrent();
    loadAndPlaySong(current.id, playNext);     //Load and play song
    loadLyrics(current.artist,current.title);  //Load Lyrics
    keepPlaying=true;
    playingInfo.draw();
}

//To be used ad callback only
function playNext(){

    //Depends on keepPlaying
    if(keepPlaying){
        //recursion here
        songsList.next();
        loadAndPlaySong(songsList.getCurrent().id, playNext);//Load and play song
        loadLyrics(songsList.getCurrent().artist,songsList.getCurrent().title);  //Load Lyrics
    }else{
        console.log("Keep-playing skipped");
    }
}


