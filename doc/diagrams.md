# Inner Workings Diagrams

These diagrams use Mermaid syntax. Many Markdown renderers, including GitHub, can display them directly.

## Component Overview

```mermaid
flowchart LR
    HTML[index.html] --> P5[p5.js lifecycle]
    HTML --> Sound[p5.sound]
    P5 --> Sketch[lib/sketch.js]

    Sketch --> Config[localStorage config]
    Sketch --> Client[SubsonicClient]
    Sketch --> Browser[FileBrowser]
    Sketch --> Queue[PlayList]
    Sketch --> Info[PlayingInfo]
    Sketch --> Progress[ProgressBarH]
    Sketch --> Spectrum[Spectrum]
    Sketch --> Waveform[WaveForm]
    Sketch --> Sliders[Slider controls]
    Sketch --> Player[Player]

    Client --> Server[Subsonic REST API]
    Browser --> Client
    Browser --> Queue
    Browser --> Player
    Player --> Queue
    Player --> Client
    Queue --> Sketch
    Info --> Client
    Spectrum --> Sound
    Waveform --> Sound
```

## First-Run Configuration

```mermaid
sequenceDiagram
    participant Browser
    participant Sketch as lib/sketch.js
    participant Storage as localStorage
    participant User

    Browser->>Sketch: p5 setup()
    Sketch->>Storage: get subsonicPlayerConfig
    alt Config missing or invalid
        Sketch->>Sketch: noLoop()
        Sketch->>User: show setup form
        User->>Sketch: submit server, username, password
        Sketch->>Sketch: normalize server
        Sketch->>Sketch: create salt
        Sketch->>Sketch: MD5(password + salt)
        Sketch->>Storage: save server, user, token, salt
        Sketch->>Browser: reload page
    else Config present
        Sketch->>Sketch: create SubsonicClient
        Sketch->>Sketch: initialize player UI
    end
```

## API Request Flow

```mermaid
sequenceDiagram
    participant UI as UI code
    participant Client as SubsonicClient
    participant Server as Subsonic server

    UI->>Client: getPlaylists() / getIndexes() / getPlaylist()
    Client->>Client: request(endpoint, params)
    Client->>Client: add u, t, s, v, c, f=json
    Client->>Server: fetch /rest/endpoint
    Server-->>Client: JSON response
    alt HTTP and Subsonic status OK
        Client->>Client: normalize fields into arrays/objects
        Client-->>UI: predictable result shape
    else HTTP error, API error, missing field, or network failure
        Client->>Client: console.error
        Client-->>UI: null or empty normalized result
    end
```

## Music Browser Flow

```mermaid
flowchart TD
    Start[FileBrowser created] --> LoadIndexes[getIndexes]
    LoadIndexes --> Root[Show ABC/root index]
    Root --> ClickRoot{User clicks item}

    ClickRoot -->|Folder/index| Artists[Show artist list]
    ClickRoot -->|Song with id| RootSong[Player.playSongById]

    Artists --> ClickArtist{User clicks artist/folder/song}
    ClickArtist -->|Folder with id| Directory[getMusicDirectory]
    Directory --> Items[Show child folders and songs]
    Items --> ClickChild{User clicks child}
    ClickChild -->|Folder with id| Directory
    ClickChild -->|Song with id| BuildQueue[Clear queue and add selected song plus later songs]
    BuildQueue --> Play[Player.playSongById]

    Artists --> Back[Back button]
    Items --> Back
    Back --> Previous[Reload previous level]
```

## Playback Flow

```mermaid
sequenceDiagram
    participant User
    participant Sketch as lib/sketch.js
    participant Player
    participant Queue as PlayList
    participant Client as SubsonicClient
    participant P5 as p5.sound

    User->>Sketch: select song or press play
    Sketch->>Player: playSongById(id)
    Player->>Queue: get/set pointer
    Player->>Client: getSong(id)
    Client-->>Player: stream URL
    Player->>P5: loadSound(stream URL)
    P5-->>Player: success callback
    Player->>P5: song.play()
    Sketch->>Player: getSoundObject()
    Player-->>Sketch: newly loaded p5.SoundFile
    Sketch->>Sketch: configureAudioRouting(true)
    Sketch->>Sketch: apply slider values when changed
    Player->>Player: draw() watches end of song
    Player->>Queue: next()
    Player->>Player: playSongByPlaylistId(next)
```

## Slider Interaction

```mermaid
flowchart TD
    Pointer[Pointer event] --> Over{Pointer over slider track?}
    Over -->|No| Ignore[Ignore]
    Over -->|Yes| Jump[Set value from click position]
    Jump --> Drag[Set isDragging true]
    Drag --> Move{Pointer moves?}
    Move -->|Yes| Update[Update value from pointer]
    Move -->|No| Hold[Keep current value]
    Update --> Release[Pointer released]
    Hold --> Release
    Release --> Stop[Set isDragging false]

    Wheel[Mouse wheel while hovering] --> WheelUpdate[Increment value by wheel step]
```

## Audio Routing

```mermaid
flowchart TD
    NewSong{Song changed?} -->|Yes| Route[configureAudioRouting]
    FilterSwitch{Filter switch changed?} -->|Yes| Route
    NewSong -->|No| NoRoute[Keep current graph]
    FilterSwitch -->|No| NoRoute

    Route --> Disconnect[Disconnect old nodes]
    Disconnect --> ReverbNew[Create fresh p5.Reverb]
    ReverbNew --> Filters{Filters on?}

    Filters -->|Yes| FilterGraph[Build filter graph]
    Filters -->|No| Direct[Connect song directly to master]

    subgraph FilterGraph[Filter graph]
        Song[p5.SoundFile song] --> BassFilter[Bass BandPass 100 Hz]
        Song --> MidFilter[Mid BandPass 2000 Hz]
        Song --> TrebleFilter[Treble BandPass 12000 Hz]

        BassFilter --> BassGain[Bass Gain slider]
        MidFilter --> MidGain[Mid Gain slider]
        TrebleFilter --> TrebleGain[Treble Gain slider]

        BassGain --> Master[Master output]
        MidGain --> Master
        TrebleGain --> Master

        Song --> Reverb[Reverb]
        Reverb --> Master
    end

    Direct --> DirectMaster[Master output]

    Volume[Volume slider] -. changed values .-> Song
    Pan[Balance slider] -. changed values .-> Song
    Rate[Speed slider] -. changed values .-> Song
    ReverbMix[Reverb mix slider] -. changed values .-> Reverb
    ReverbVol[Reverb volume slider] -. changed values .-> Reverb
```

## Local Data Relationships

```mermaid
classDiagram
    class SubsonicClient {
        server
        user
        token
        salt
        request(endpoint, params)
        getIndexes()
        getMusicDirectory(id)
        getPlaylists()
        getPlaylist(id)
        getSong(id)
        getSongInfo(id)
        getLyrics(artist, title)
        getCoverArt(id)
    }

    class FileBrowser {
        items
        folderHistory
        loadIndexes()
        loadMusicDirectory(id)
        navigateBack()
        handleMouse(mx, my)
        draw()
    }

    class Player {
        song
        keepPlaying
        playSongById(id)
        playSongByPlaylistId(index)
        playSong()
        pauseSong()
        stopSong()
        playNext()
        getSoundObject()
        draw()
    }

    class PlayList {
        songslist
        pointer
        addSong(song)
        addSongsList(songs)
        next()
        previous()
        getCurrent()
        clear()
        draw()
    }

    class PlayingInfo {
        title
        album
        artist
        coverid
        setSong(song)
        draw()
    }

    FileBrowser --> SubsonicClient
    FileBrowser --> PlayList
    FileBrowser --> Player
    Player --> SubsonicClient
    Player --> PlayList
    PlayingInfo --> SubsonicClient
    PlayList --> song objects
```
