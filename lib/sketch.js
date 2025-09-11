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
var mainurl = "https://www.rivas.co:8081";

var spectrum;
var waveform;
var keepPlaying=false; //semaphore

var song = null; // p5.SoundFile object for playback
var SongsListObj; //local playlist object


var vol;
var pan;
var rate;

var playPlaylistImg;
var pausePlaylistImg;
var stopPlayListImg;

var playListSelect;
var songSelect;

var progressBar;

var playingInfo;

var knobVolume;

var bassGain;
var midGain;
var trebleGain;
var reverb;

var bassFilter
var midFilter;
var trebleFilter;

var knobPan;
var knobRate;
var knobBass;
var knobMid;
var knobTreble;
var knobReverb;
var knobReverbVol;
var filtersON = true; //if filters are on or off

var knobsPanelbg

var filtersOnOffSwitch; //switch for filters on/off

//MD5. From: https://stackoverflow.com/questions/14733374/how-to-generate-an-md5-file-hash-in-javascript-node-js
//var MD5 = function(d){var r = M(V(Y(X(d),8*d.length)));return r.toLowerCase()};function M(d){for(var _,m="0123456789ABCDEF",f="",r=0;r<d.length;r++)_=d.charCodeAt(r),f+=m.charAt(_>>>4&15)+m.charAt(15&_);return f}function X(d){for(var _=Array(d.length>>2),m=0;m<_.length;m++)_[m]=0;for(m=0;m<8*d.length;m+=8)_[m>>5]|=(255&d.charCodeAt(m/8))<<m%32;return _}function V(d){for(var _="",m=0;m<32*d.length;m+=8)_+=String.fromCharCode(d[m>>5]>>>m%32&255);return _}function Y(d,_){d[_>>5]|=128<<_%32,d[14+(_+64>>>9<<4)]=_;for(var m=1732584193,f=-271733879,r=-1732584194,i=271733878,n=0;n<d.length;n+=16){var h=m,t=f,g=r,e=i;f=md5_ii(f=md5_ii(f=md5_ii(f=md5_ii(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_ff(f=md5_ff(f=md5_ff(f=md5_ff(f,r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+0],7,-680876936),f,r,d[n+1],12,-389564586),m,f,d[n+2],17,606105819),i,m,d[n+3],22,-1044525330),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+4],7,-176418897),f,r,d[n+5],12,1200080426),m,f,d[n+6],17,-1473231341),i,m,d[n+7],22,-45705983),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+8],7,1770035416),f,r,d[n+9],12,-1958414417),m,f,d[n+10],17,-42063),i,m,d[n+11],22,-1990404162),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+12],7,1804603682),f,r,d[n+13],12,-40341101),m,f,d[n+14],17,-1502002290),i,m,d[n+15],22,1236535329),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+1],5,-165796510),f,r,d[n+6],9,-1069501632),m,f,d[n+11],14,643717713),i,m,d[n+0],20,-373897302),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+5],5,-701558691),f,r,d[n+10],9,38016083),m,f,d[n+15],14,-660478335),i,m,d[n+4],20,-405537848),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+9],5,568446438),f,r,d[n+14],9,-1019803690),m,f,d[n+3],14,-187363961),i,m,d[n+8],20,1163531501),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+13],5,-1444681467),f,r,d[n+2],9,-51403784),m,f,d[n+7],14,1735328473),i,m,d[n+12],20,-1926607734),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+5],4,-378558),f,r,d[n+8],11,-2022574463),m,f,d[n+11],16,1839030562),i,m,d[n+14],23,-35309556),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+1],4,-1530992060),f,r,d[n+4],11,1272893353),m,f,d[n+7],16,-155497632),i,m,d[n+10],23,-1094730640),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+13],4,681279174),f,r,d[n+0],11,-358537222),m,f,d[n+3],16,-722521979),i,m,d[n+6],23,76029189),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+9],4,-640364487),f,r,d[n+12],11,-421815835),m,f,d[n+15],16,530742520),i,m,d[n+2],23,-995338651),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+0],6,-198630844),f,r,d[n+7],10,1126891415),m,f,d[n+14],15,-1416354905),i,m,d[n+5],21,-57434055),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+12],6,1700485571),f,r,d[n+3],10,-1894986606),m,f,d[n+10],15,-1051523),i,m,d[n+1],21,-2054922799),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+8],6,1873313359),f,r,d[n+15],10,-30611744),m,f,d[n+6],15,-1560198380),i,m,d[n+13],21,1309151649),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+4],6,-145523070),f,r,d[n+11],10,-1120210379),m,f,d[n+2],15,718787259),i,m,d[n+9],21,-343485551),m=safe_add(m,h),f=safe_add(f,t),r=safe_add(r,g),i=safe_add(i,e)}return Array(m,f,r,i)}function md5_cmn(d,_,m,f,r,i){return safe_add(bit_rol(safe_add(safe_add(_,d),safe_add(f,i)),r),m)}function md5_ff(d,_,m,f,r,i,n){return md5_cmn(_&m|~_&f,d,_,r,i,n)}function md5_gg(d,_,m,f,r,i,n){return md5_cmn(_&f|m&~f,d,_,r,i,n)}function md5_hh(d,_,m,f,r,i,n){return md5_cmn(_^m^f,d,_,r,i,n)}function md5_ii(d,_,m,f,r,i,n){return md5_cmn(m^(_|~f),d,_,r,i,n)}function safe_add(d,_){var m=(65535&d)+(65535&_);return(d>>16)+(_>>16)+(m>>16)<<16|65535&m}function bit_rol(d,_){return d<<_|d>>>32-_}


/**
 * An instance of the SubsonicClient class, used to interact with the Subsonic API.
 * @type {SubsonicClient}
 */
var SubsonicObj = new SubsonicClient(mainurl, u, t, s);

/**
 * File browser instance
 * @type {FileBrowser} 
 */
var FileBrowserObj;



/**
 * Player instance
 * @type {Player} 
*/
var PlayerObj;



/**
 * Preloads assets before the sketch starts.
 * Loads a dummy audio file to enable isPaused() or isPlaying() functionality.
 * 
 * @function
 * @global
 */
function preload()
{



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

    //frameRate(60);

    //Divs
    cnv=createCanvas(1024, 768); 
    //thediv = createDiv();
    cnv.parent("cnv");

    SongsListObj = new PlayList(680,550,250,200); //local playlist object
    PlayerObj = new Player(SubsonicObj, SongsListObj);
    song = PlayerObj.getSoundObject(); //get the song object from the player fot init purposes

    background(180);

    //LIST buttons
    playPlaylistImg = createImg("assets/play.png", "Play");
    playPlaylistImg.mousePressed(()=>PlayerObj.playSong());
    
    pausePlaylistImg = createImg("assets/pause.png", "Pause");
    pausePlaylistImg.mousePressed(()=>PlayerObj.pauseSong());



    stopPlayListImg = createImg("assets/stop.png","Stop");
    stopPlayListImg.mousePressed(()=>PlayerObj.stopSong());

    //Playlist select
    playListSelect = createSelect();
    playListSelect.size(200,25)
    playListSelect.position(40,240);
    playListSelect.option("Select",0);
    playListSelect.id('playListSelect');
    playListSelect.changed(playListElementSelected);



    //Song select
    songSelect = createSelect();
    songSelect.position(40,285);
    songSelect.size(200,25);
    songSelect.id('playListSongSelect');
    songSelect.option("Select",0);
    //Will select a song from SubsonicObj
   // songSelect.changed(PlayerObj.playSongByPlaylistId(songSelect.value()));




    


    //Visualization components
    spectrum = new Spectrum(410,30,1500,700);
    waveform = new WaveForm(410,270,1500,700);
    progressBar=new ProgressBarH(410,510,450,20);
    


    //fill playlist
    getPlaylists();

    //create Playing info
    playingInfo = new PlayingInfo(30,30,SubsonicObj);


    //Knobs
    knobVolume = new MakeKnob("lib/images/knob.png",100,70,390,0,1,0.8,2,"Volume");
    knobVolume.textColor = "black";
    knobVolume.textPt = 10;
    knobVolume.showValue = false;


    knobPan = new MakeKnob("lib/images/knob.png",100,190,390,-1,1,0,2,"Pan");
    knobPan.textColor = "black";
    knobPan.textPt = 10;
    knobPan.showValue = false;


    knobRate = new MakeKnob("lib/images/knob.png",100,310,390,0.01,2,1,2,"Play Speed");
    knobRate.textColor = "black";
    knobRate.textPt = 10;
    knobRate.showValue = false;


    knobBass = new MakeKnob("lib/images/knob.png",100,70,540,0,5,2.5,2,"Bass");
    knobBass.textColor = "black";
    knobBass.textPt = 10;
    knobBass.showValue = false;

    knobMid = new MakeKnob("lib/images/knob.png",100,190,540,0,5,1.5,2,"Mid");
    knobMid.textColor = "black";
    knobMid.textPt = 10;
    knobMid.showValue = false;

    knobTreble = new MakeKnob("lib/images/knob.png",100,310,540,0,5,1.5,2,"Treble");
    knobTreble.textColor = "black";
    knobTreble.textPt = 10;
    knobTreble.showValue = false;


    knobReverb = new MakeKnob("lib/images/knob.png",100,70,690,0,1,0.01,2,"Reverb");
    knobReverb.textColor = "black";
    knobReverb.textPt = 10;
    knobReverb.showValue = false;


    knobReverbVol = new MakeKnob("lib/images/knob.png",60,160,710,0,10,0,2,"Reverb Volume");
    knobReverbVol.textColor = "black";
    knobReverbVol.textPt = 10;
    knobReverbVol.showValue = false;

        // Create filters for each band
        bassGain = new p5.Gain();
        midGain = new p5.Gain();
        trebleGain = new p5.Gain();

        bassFilter = new p5.BandPass();
        bassFilter.freq(100);
        bassFilter.res(0.2);

        midFilter = new p5.BandPass();
        midFilter.freq(2000);
        midFilter.res(0.4);

        trebleFilter = new p5.BandPass();
        trebleFilter.freq(12000);
        trebleFilter.res(0.4);

        reverb = new p5.Reverb();

        setupFilters(); //setup filters

    FileBrowserObj = new FileBrowser(410, 550, 250, 200, SongsListObj, SubsonicObj,PlayerObj); //file browser instance


    knobsPanelbg = loadImage("assets/nogal.png");
    // Create a mask with rounded corners
    let maskGfx = createGraphics(365, 440);
    maskGfx.rect(0,0, 365, 440, 10); // 30 is the corner radius
    // Apply mask to image
    knobsPanelbg.mask(maskGfx)

    filtersOnOffSwitch = new Switch(240, 650, 20, 80); //switch for filters on/off
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
    var progress;
    try{
        song = PlayerObj.getSoundObject();
        progress = song.currentTime()/song.duration();
    }catch{
        progress=0;
    }

    //Update progressbar only if not manually changed (interference with mouse click and drag)
    if(!progressBar.isChanged()){
        progressBar.setValue(progress);
    }


    progressBar.draw();
    

    //Draw spectrum and waveform
    spectrum.draw();
    waveform.draw();

    //Info box
    playingInfo.draw();


    //img buttons
    imgButtons();

    //********Knobs
    fill(125);

    // Draw the masked image
    image(knobsPanelbg, 12, 322,356,440);
    circle(70,390,101);
    knobVolume.update();
    setVolume(); //set volume to knob value

    circle(190,390,101);
    knobPan.update();
    setPan(); //set pan to knob value

    circle(310,390,101);
    knobRate.update();
    setRate(); //set rate to knob value

    //Filters knobs
    circle(70,540,101);
    knobBass.update();
    circle(190,540,101);
    knobMid.update();
    circle(310,540,101);
    knobTreble.update();
    circle(70,690,101);
    knobReverb.update();
    circle(160,710,61);
    knobReverbVol.update();


    //Apply filter values
    bassGain.amp(knobBass.getValue());
    midGain.amp(knobMid.getValue());
    trebleGain.amp(knobTreble.getValue());
    reverb.drywet(knobReverb.getValue());
    reverb.amp(knobReverbVol.getValue());

    //Draw file browser
    FileBrowserObj.draw();

    SongsListObj.draw();

    //Draw switch for filters on/off
    filtersOnOffSwitch.draw();

    //MouseHelper
    fill(0);
    text("x: "+Math.floor(mouseX)+" y: "+Math.floor(mouseY), mouseX, mouseY);



    

}

//Add img buttons PLAY PAUSE STOP (to be refreshed in draw())
function imgButtons(){

    //Playlist buttons
    playPlaylistImg.position(135,160);
    pausePlaylistImg.position(160,160);
    stopPlayListImg.position(180,162);

}


//Handles mouse click events
function mousePressed(){
    knobVolume.active();
    knobPan.active();
    knobRate.active();
    knobBass.active();
    knobMid.active();
    knobTreble.active();
    knobReverb.active();
    knobReverbVol.active();

    progressBar.handleMouse(mouseX, mouseY);//Check if the progress bar was clicked

    FileBrowserObj.handleMouse(mouseX, mouseY); //handle mouse click on file browser

    SongsListObj.handleMouse(mouseX, mouseY); //handle mouse click on playlist

    filtersOnOffSwitch.handleMouse(mouseX, mouseY); //handle mouse click on switch
    setupFilters(filtersOnOffSwitch.getState()); //setup filters after switch change
    
}


function mouseDragged(){
    progressBar.handleMouse(mouseX, mouseY); //handle mouse drag on progress bar
    //FileBrowserObj.handleMouse(mouseX, mouseY); //handle mouse drag on file browser
    FileBrowserObj.handleMouseDrag(mouseX, mouseY); //handle mouse drag on file browser scrollbar

    SongsListObj.handleMouseDrag(mouseX, mouseY); //handle mouse drag on playlist scrollbar
}


function mouseReleased(){
    knobVolume.inactive();
    knobPan.inactive();
    knobRate.inactive();
    knobBass.inactive();
    knobMid.inactive();
    knobTreble.inactive();
    knobReverb.inactive();
    knobReverbVol.inactive();

    //Jump to the new position in the song if the progress bar was changed
    if (song && song.isLoaded() && progressBar.isChanged()) {  
        song.jump(progressBar.getValue() * song.duration());//Notice that this will trigger the onended() event
        progressBar.resetChanged(); //reset the changed flag
    }

    FileBrowserObj.handleMouseReleased(); //handle mouse release on file browser
    SongsListObj.handleMouseReleased(); //handle mouse release on playlist

    setupFilters(filtersOnOffSwitch.getState()); //re-setup filters after mouse release
}

function touchStarted(){
    knobVolume.active();
    knobPan.active();
    knobRate.active();
    knobBass.active();
    knobMid.active();
    knobTreble.active();
    knobReverb.active();
    knobReverbVol.active();
}

function touchEnded(){
    knobVolume.inactive();
    knobPan.inactive();
    knobRate.inactive();
    knobBass.inactive();
    knobMid.inactive();
    knobTreble.inactive();
    knobReverb.inactive();
    knobReverbVol.inactive();
}


/**
 * Sets up the audio filters and connects them to the song.
 * Disconnects the song from the master output and connects it to the filters.
 * Connects the filters to their respective gain nodes.
 *
 * This function should be called after the song is loaded to ensure proper audio processing.
 * @function
 * @global
 */
function setupFilters(filtersON=true){

    if(filtersON){
        //Set filters
        song.disconnect(); //disconnect song from master output
        bassFilter.disconnect(); //disconnect bass filter
        midFilter.disconnect(); //disconnect mid filter
        trebleFilter.disconnect(); //disconnect treble filter

        //Set gain nodes
        bassGain.disconnect(); //disconnect bass gain
        midGain.disconnect(); //disconnect mid gain
        trebleGain.disconnect(); //disconnect treble gain

        //Connect song to filters
        song.connect(bassFilter); //connect song to bass filter
        bassFilter.connect(bassGain); //connect bass filter to bass gain
        bassGain.connect(); //connect bass gain to master output

        song.connect(midFilter); //connect song to mid filter
        midFilter.connect(midGain); //connect mid filter to mid gain
        midGain.connect(); //connect mid gain to master output

        song.connect(trebleFilter); //connect song to treble filter
        trebleFilter.connect(trebleGain); //connect treble filter to treble gain
        trebleGain.connect(); //connect treble gain to master output

        reverb.connect(); //connect reverb to master output
        reverb.process(song, 3, 2); //apply reverb to song


    }else{
        //If filters are off, connect song to master output
        song.disconnect(); //disconnect song from filters
        bassFilter.disconnect(); //disconnect bass filter
        midFilter.disconnect(); //disconnect mid filter
        trebleFilter.disconnect(); //disconnect treble filter
        bassGain.disconnect(); //disconnect bass gain
        midGain.disconnect(); //disconnect mid gain
        trebleGain.disconnect(); //disconnect treble gain
        reverb.disconnect(); //disconnect reverb
        reverb.process(song, 0, 0); //disable reverb

        //Connect song to master output
        song.connect(); //connect song to master output
    }
}


//Prints text labels
function printLabels(){

    textSize(10);
    text('Playlist', 140, 235);
    text('Songs', 140, 280);
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





// Set volume using knob
function setVolume(){
    var volval = knobVolume.getValue();
    var volume = -Math.log10(1-volval*(0.9)); //convert to logarithmic scale
    song.setVolume(volume);
}


//Set Pan
function setPan(){
    song.pan(knobPan.getValue());
}

//Set Rate
function setRate(){
    song.rate(knobRate.getValue());
}


//Toggle loop mode for the song
function toggleLoop(){
    if (song.isLooping()){
        song.setLoop(false);
        loopButton.html('Loop OFF');
    }else{
        song.setLoop(true);
        loopButton.html('Loop ON');
    }
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
        SongsListObj.clear(); //clear local playlist
        SongsListObj.addSongsList(songs);//add all to local playlist
        //clear song selector
        let dropdown=document.getElementById('playListSongSelect');//grab the select element
        dropdown.innerText = null;//clear song selector
        //repopulate song selector
        songSelect.option('Select',-1);
        for(var i=0;i<SongsListObj.getLength();i++){
            songSelect.option(SongsListObj.songslist[i].title, SongsListObj.songslist[i].id);
        }
    });
}




////////////////////TEST AREA///////////////////////


////////////////////TEST AREA END///////////////////////