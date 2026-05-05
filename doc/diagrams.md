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
    Sketch --> Knobs[MakeKnob controls]

    Client --> Server[Subsonic REST API]
    Browser --> Client
    Browser --> Queue
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
    ClickRoot -->|Song with id| RootSong[loadAndPlaySong]

    Artists --> ClickArtist{User clicks artist/folder/song}
    ClickArtist -->|Folder with id| Directory[getMusicDirectory]
    Directory --> Items[Show child folders and songs]
    Items --> ClickChild{User clicks child}
    ClickChild -->|Folder with id| Directory
    ClickChild -->|Song with id| BuildQueue[Clear queue and add selected song plus later songs]
    BuildQueue --> Play[loadAndPlaySong]

    Artists --> Back[Back button]
    Items --> Back
    Back --> Previous[Reload previous level]
```

## Playback Flow

```mermaid
sequenceDiagram
    participant User
    participant Sketch as lib/sketch.js
    participant Queue as PlayList
    participant Client as SubsonicClient
    participant P5 as p5.sound
    participant Info as PlayingInfo

    User->>Sketch: select song or press play
    Sketch->>Queue: get/set pointer
    Sketch->>Client: getSong(id)
    Client-->>Sketch: stream URL
    Sketch->>P5: loadSound(stream URL)
    P5-->>Sketch: success callback
    Sketch->>Client: getSongInfo(id)
    Sketch->>Info: setSong(metadata or queue item)
    Sketch->>Sketch: loadLyrics if artist/title exist
    Sketch->>Sketch: setupFilters()
    Sketch->>P5: song.play()
    P5-->>Sketch: onended()
    Sketch->>Queue: next()
    Sketch->>Sketch: loadAndPlaySong(next id)
```

## Audio Routing

```mermaid
flowchart LR
    Song[p5.SoundFile song] --> BassFilter[Bass BandPass 100 Hz]
    Song --> MidFilter[Mid BandPass 2000 Hz]
    Song --> TrebleFilter[Treble BandPass 12000 Hz]

    BassFilter --> BassGain[Bass Gain knob]
    MidFilter --> MidGain[Mid Gain knob]
    TrebleFilter --> TrebleGain[Treble Gain knob]

    BassGain --> Master[Master output]
    MidGain --> Master
    TrebleGain --> Reverb[Reverb]
    Reverb --> Master

    Volume[Volume knob] --> Song
    Pan[Pan knob] --> Song
    Rate[Rate knob] --> Song
    ReverbMix[Reverb mix knob] --> Reverb
    ReverbVol[Reverb volume knob] --> Reverb
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
    PlayingInfo --> SubsonicClient
    PlayList --> "song objects"
```

