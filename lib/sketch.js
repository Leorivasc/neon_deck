/**
 * @fileOverview
 * This file contains the main sketch for a Subsonic music player using p5.js.
 * It includes the setup, preload, and draw functions,
 * as well as various helper functions for audio playback, UI elements, and API interactions.
 * @Leo
 */

var SUBSONIC_CONFIG_KEY = 'subsonicPlayerConfig';
var SubsonicObj;

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

var filtersOnOffSwitch; //switch for filters on/off
var loopOnOffSwitch; //switch for loop on/off
var volSlider;
var balanceSlider;

/**
 * File browser instance
 * @type {FileBrowser}
 * @param {number} x - The x position of the file browser.
 * @param {number} y - The y position of the file browser.
 * @param {number} w - The width of the file browser.
 * @param {number} h - The height of the file browser.
 * @returns {void}
 * @description
 * Class that creates a file browser using the Subsonic API getIndexes() and getMusicDirectory()
 * and displays it in a scrollable list.
 *
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
//dummy audio so that isPaused() or isPlaying() are enabled
song = loadSound('assets/dot.mp3');
song.setVolume(0.5); //set default volume

}

function getStoredSubsonicConfig() {
    try {
        const rawConfig = localStorage.getItem(SUBSONIC_CONFIG_KEY);
        if (!rawConfig) {
            return null;
        }

        const config = JSON.parse(rawConfig);
        if (!config.server || !config.user || !config.token || !config.salt) {
            return null;
        }

        return config;
    } catch (error) {
        console.error("Unable to load saved Subsonic configuration:", error);
        return null;
    }
}

function saveSubsonicConfig(config) {
    localStorage.setItem(SUBSONIC_CONFIG_KEY, JSON.stringify(config));
}

function normalizeSubsonicServer(server) {
    const trimmed = server.trim().replace(/\/+$/, '');
    if (!trimmed) {
        return "";
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return "https://" + trimmed;
}

function createSalt(length) {
    const chars = "0123456789abcdef";
    const values = new Uint8Array(length);

    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(values);
    } else {
        for (let i = 0; i < values.length; i++) {
            values[i] = Math.floor(Math.random() * 256);
        }
    }

    let salt = "";
    for (let i = 0; i < values.length; i++) {
        salt += chars[values[i] % chars.length];
    }

    return salt;
}

function showSubsonicConfigForm() {
    const panel = document.createElement("div");
    panel.style.cssText = [
        "font-family: Arial, Helvetica, sans-serif",
        "max-width: 420px",
        "margin: 80px auto",
        "padding: 24px",
        "background: #d0d0d0",
        "border: 1px solid #555",
        "box-shadow: 0 8px 24px rgba(0,0,0,0.25)"
    ].join(";");

    panel.innerHTML = [
        "<h1 style='font-size: 20px; margin: 0 0 16px;'>Subsonic setup</h1>",
        "<form id='subsonic-config-form'>",
        "<label style='display:block; margin-bottom: 12px;'>Server URL",
        "<input name='server' required placeholder='https://example.com:4040' style='box-sizing:border-box; display:block; width:100%; margin-top:4px; padding:8px;'>",
        "</label>",
        "<label style='display:block; margin-bottom: 12px;'>Username",
        "<input name='user' required autocomplete='username' style='box-sizing:border-box; display:block; width:100%; margin-top:4px; padding:8px;'>",
        "</label>",
        "<label style='display:block; margin-bottom: 16px;'>Password",
        "<input name='password' type='password' required autocomplete='current-password' style='box-sizing:border-box; display:block; width:100%; margin-top:4px; padding:8px;'>",
        "</label>",
        "<button type='submit' style='padding:8px 14px;'>Save and start</button>",
        "<p id='subsonic-config-error' style='color:#8b0000; min-height:20px;'></p>",
        "</form>"
    ].join("");

    document.body.appendChild(panel);

    const form = document.getElementById("subsonic-config-form");
    const error = document.getElementById("subsonic-config-error");

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const data = new FormData(form);
        const server = normalizeSubsonicServer(String(data.get("server") || ""));
        const user = String(data.get("user") || "").trim();
        const password = String(data.get("password") || "");

        if (!server || !user || !password) {
            error.textContent = "Server, username, and password are required.";
            return;
        }

        const salt = createSalt(8);
        const token = MD5(password + salt);

        saveSubsonicConfig({
            server: server,
            user: user,
            token: token,
            salt: salt
        });

        window.location.reload();
    });
}

// MD5 is used by the Subsonic token authentication scheme.
function MD5(input) {
    function rotateLeft(value, shift) {
        return (value << shift) | (value >>> (32 - shift));
    }

    function addUnsigned(left, right) {
        const left4 = left & 0x40000000;
        const right4 = right & 0x40000000;
        const left8 = left & 0x80000000;
        const right8 = right & 0x80000000;
        const result = (left & 0x3fffffff) + (right & 0x3fffffff);

        if (left4 & right4) {
            return result ^ 0x80000000 ^ left8 ^ right8;
        }

        if (left4 | right4) {
            if (result & 0x40000000) {
                return result ^ 0xc0000000 ^ left8 ^ right8;
            }
            return result ^ 0x40000000 ^ left8 ^ right8;
        }

        return result ^ left8 ^ right8;
    }

    function f(x, y, z) { return (x & y) | ((~x) & z); }
    function g(x, y, z) { return (x & z) | (y & (~z)); }
    function h(x, y, z) { return x ^ y ^ z; }
    function i(x, y, z) { return y ^ (x | (~z)); }

    function ff(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function gg(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function hh(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function ii(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(value) {
        const messageLength = value.length;
        const numberOfWordsTemp1 = messageLength + 8;
        const numberOfWordsTemp2 = (numberOfWordsTemp1 - (numberOfWordsTemp1 % 64)) / 64;
        const numberOfWords = (numberOfWordsTemp2 + 1) * 16;
        const wordArray = new Array(numberOfWords - 1);
        let bytePosition = 0;
        let byteCount = 0;

        while (byteCount < messageLength) {
            const wordCount = (byteCount - (byteCount % 4)) / 4;
            bytePosition = (byteCount % 4) * 8;
            wordArray[wordCount] = wordArray[wordCount] | (value.charCodeAt(byteCount) << bytePosition);
            byteCount++;
        }

        const wordCount = (byteCount - (byteCount % 4)) / 4;
        bytePosition = (byteCount % 4) * 8;
        wordArray[wordCount] = wordArray[wordCount] | (0x80 << bytePosition);
        wordArray[numberOfWords - 2] = messageLength << 3;
        wordArray[numberOfWords - 1] = messageLength >>> 29;

        return wordArray;
    }

    function wordToHex(value) {
        let output = "";
        for (let count = 0; count <= 3; count++) {
            const byte = (value >>> (count * 8)) & 255;
            output += ("0" + byte.toString(16)).slice(-2);
        }
        return output;
    }

    const x = convertToWordArray(unescape(encodeURIComponent(input)));
    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    for (let k = 0; k < x.length; k += 16) {
        const aa = a;
        const bb = b;
        const cc = c;
        const dd = d;

        a = ff(a, b, c, d, x[k + 0], 7, 0xd76aa478);
        d = ff(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
        c = ff(c, d, a, b, x[k + 2], 17, 0x242070db);
        b = ff(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
        a = ff(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
        d = ff(d, a, b, c, x[k + 5], 12, 0x4787c62a);
        c = ff(c, d, a, b, x[k + 6], 17, 0xa8304613);
        b = ff(b, c, d, a, x[k + 7], 22, 0xfd469501);
        a = ff(a, b, c, d, x[k + 8], 7, 0x698098d8);
        d = ff(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
        c = ff(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
        b = ff(b, c, d, a, x[k + 11], 22, 0x895cd7be);
        a = ff(a, b, c, d, x[k + 12], 7, 0x6b901122);
        d = ff(d, a, b, c, x[k + 13], 12, 0xfd987193);
        c = ff(c, d, a, b, x[k + 14], 17, 0xa679438e);
        b = ff(b, c, d, a, x[k + 15], 22, 0x49b40821);

        a = gg(a, b, c, d, x[k + 1], 5, 0xf61e2562);
        d = gg(d, a, b, c, x[k + 6], 9, 0xc040b340);
        c = gg(c, d, a, b, x[k + 11], 14, 0x265e5a51);
        b = gg(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
        a = gg(a, b, c, d, x[k + 5], 5, 0xd62f105d);
        d = gg(d, a, b, c, x[k + 10], 9, 0x2441453);
        c = gg(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
        b = gg(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
        a = gg(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
        d = gg(d, a, b, c, x[k + 14], 9, 0xc33707d6);
        c = gg(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
        b = gg(b, c, d, a, x[k + 8], 20, 0x455a14ed);
        a = gg(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
        d = gg(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
        c = gg(c, d, a, b, x[k + 7], 14, 0x676f02d9);
        b = gg(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

        a = hh(a, b, c, d, x[k + 5], 4, 0xfffa3942);
        d = hh(d, a, b, c, x[k + 8], 11, 0x8771f681);
        c = hh(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
        b = hh(b, c, d, a, x[k + 14], 23, 0xfde5380c);
        a = hh(a, b, c, d, x[k + 1], 4, 0xa4beea44);
        d = hh(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
        c = hh(c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
        b = hh(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
        a = hh(a, b, c, d, x[k + 13], 4, 0x289b7ec6);
        d = hh(d, a, b, c, x[k + 0], 11, 0xeaa127fa);
        c = hh(c, d, a, b, x[k + 3], 16, 0xd4ef3085);
        b = hh(b, c, d, a, x[k + 6], 23, 0x4881d05);
        a = hh(a, b, c, d, x[k + 9], 4, 0xd9d4d039);
        d = hh(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
        c = hh(c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
        b = hh(b, c, d, a, x[k + 2], 23, 0xc4ac5665);

        a = ii(a, b, c, d, x[k + 0], 6, 0xf4292244);
        d = ii(d, a, b, c, x[k + 7], 10, 0x432aff97);
        c = ii(c, d, a, b, x[k + 14], 15, 0xab9423a7);
        b = ii(b, c, d, a, x[k + 5], 21, 0xfc93a039);
        a = ii(a, b, c, d, x[k + 12], 6, 0x655b59c3);
        d = ii(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
        c = ii(c, d, a, b, x[k + 10], 15, 0xffeff47d);
        b = ii(b, c, d, a, x[k + 1], 21, 0x85845dd1);
        a = ii(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
        d = ii(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
        c = ii(c, d, a, b, x[k + 6], 15, 0xa3014314);
        b = ii(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
        a = ii(a, b, c, d, x[k + 4], 6, 0xf7537e82);
        d = ii(d, a, b, c, x[k + 11], 10, 0xbd3af235);
        c = ii(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
        b = ii(b, c, d, a, x[k + 9], 21, 0xeb86d391);

        a = addUnsigned(a, aa);
        b = addUnsigned(b, bb);
        c = addUnsigned(c, cc);
        d = addUnsigned(d, dd);
    }

    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
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
    const subsonicConfig = getStoredSubsonicConfig();
    if (!subsonicConfig) {
        noLoop();
        showSubsonicConfigForm();
        return;
    }

    SubsonicObj = new SubsonicClient(
        subsonicConfig.server,
        subsonicConfig.user,
        subsonicConfig.token,
        subsonicConfig.salt
    );

    frameRate(60);

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
    songSelect.changed(()=>{
                                    var id = songSelect.value();
                                    if(id == -1 || id == 0){
                                        return;
                                    }
                                    PlayerObj.playSongById(id); //Load and play song, and make sure to play next song on end

                            });





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


    filtersOnOffSwitch = new Switch(240, 690, 20, 40, "Filters"); //switch for filters on/off
    loopOnOffSwitch = new Switch(280, 690, 20, 40, "Loop\nPlaylist"); //switch for loop on/off


    volSlider = new SliderV(870, 270, 40, 200, "Volume", 0, 1, 0.8,"#ccc","#00ff00ff",{wheelSteps:100, wheelSensitivity:2}); //vertical slider for volume
    balanceSlider = new SliderH(270, 200, 60, 10, "Balance", -1, 1, 0,"#ccc","#ccc",{wheelSteps:100, wheelSensitivity:2}); //horizontal slider for balance


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

    //Get the song object from the player only if NOT requested yet
    //i.e., avoid reassigning the sound object every frame, assign it only once after loading or playing a new song
    if(!PlayerObj.isRequested){
        song = PlayerObj.getSoundObject();
    }
    printLabels();

    //Updates the progress bar slider for duration
    var progress;
    try{

        progress = PlayerObj.getProgress();
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

    //Draw switch for loop on/off
    loopOnOffSwitch.draw();


    //MouseHelper
    fill(0);
    text("x: "+Math.floor(mouseX)+" y: "+Math.floor(mouseY), mouseX, mouseY);


    PlayerObj.draw(); //controls the playNext() if keepPlaying is true


    //Draw volume slider
    volSlider.draw();


    //draw balance slider
    balanceSlider.draw();

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

    loopOnOffSwitch.handleMouse(mouseX, mouseY); //handle mouse click on switch

    volSlider.handleMouse(mouseX, mouseY); //handle mouse click on volume slider

    balanceSlider.handleMouse(mouseX, mouseY); //handle mouse click on balance slider
}


function mouseDragged(){
    progressBar.handleMouse(mouseX, mouseY); //handle mouse drag on progress bar
    //FileBrowserObj.handleMouse(mouseX, mouseY); //handle mouse drag on file browser
    FileBrowserObj.handleMouseDrag(mouseX, mouseY); //handle mouse drag on file browser scrollbar

    SongsListObj.handleMouseDrag(mouseX, mouseY); //handle mouse drag on playlist scrollbar

    volSlider.mouseDragged(mouseX, mouseY); //handle mouse drag on volume slider

    balanceSlider.mouseDragged(mouseX, mouseY); //handle mouse drag on balance slider
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

    //Set loop state in player
    PlayerObj.setLoop(loopOnOffSwitch.getState()); //set loop state in player

    volSlider.mouseReleased(); //handle mouse release on volume slider

    balanceSlider.mouseReleased(); //handle mouse release on balance slider
}

function mouseWheel(event) {
    // forward wheel events to slider(s)
    volSlider.handleWheel(event);
    if (volSlider.isMouseOver()) return false; //prevent page scroll if over slider

    balanceSlider.handleWheel(event);
    if (balanceSlider.isMouseOver()) return false; //prevent page scroll if over slider
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
                select('#lyrics').html("<pre>"+(res || "")+"</pre>");
                select('#title').html(title || "");

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
        if(!Array.isArray(ret)){
            console.log("No playlists available");
            return;
        }

        //add items to dropdown
        for(let item of ret){
            if(item && item.name && item.id){
                playListSelect.option(item.name, item.id);
            }
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
    if(sel == -1 || sel == 0){
        return;
    }

    var list = SubsonicObj.getPlaylist(sel);
    list.then((ret)=>{
        //console.log(ret);
        let songs = Array.isArray(ret?.entry) ? ret.entry : [];
        SongsListObj.clear(); //clear local playlist
        SongsListObj.addSongsList(songs);//add all to local playlist
        //clear song selector
        let dropdown=document.getElementById('playListSongSelect');//grab the select element
        if(dropdown){
            dropdown.innerText = null;//clear song selector
        }
        //repopulate song selector
        songSelect.option('Select',-1);
        for(var i=0;i<SongsListObj.getLength();i++){
            const playlistSong = SongsListObj.songslist[i];
            if(playlistSong && playlistSong.id){
                songSelect.option(playlistSong.title || "Untitled", playlistSong.id);
            }
        }
    });
}
////////////////////TEST AREA///////////////////////


////////////////////TEST AREA END///////////////////////
