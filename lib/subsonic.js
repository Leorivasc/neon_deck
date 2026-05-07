class SubsonicClient {
    /**
     * Creates an instance of SubsonicClient.
     * @param {string} server - The server URL.
     * @param {string} user - The username.
     * @param {string} token - The authentication token.
     * @param {string} salt - The salt for the token.
     * @param {string} [version="1.16.0"] - The API version.
     * @param {string} [client="CustomClient"] - The client name.
     */
    constructor(server, user, token, salt, version = "1.16.0", client = "CustomClient") {
        this.server = server;
        this.user = user;
        this.token = token;
        this.salt = salt;
        this.version = version;
        this.client = client;
    }

    asArray(value) {
        if (!value) {
            return [];
        }

        return Array.isArray(value) ? value : [value];
    }

    /**
     * Makes a request to the Subsonic API.
     * @param {string} endpoint - The API endpoint.
     * @param {Object} [params={}] - The query parameters.
     * @returns {Promise<Object|null>} The response data or null if the request failed.
     */
    async request(endpoint, params = {}) {
        try {
            const url = new URL(`${this.server}/rest/${endpoint}`);
            params = {
                ...params,
                u: this.user,
                t: this.token,
                s: this.salt,
                v: this.version,
                c: this.client,
                f: "json"
            };
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const subsonicResponse = data?.['subsonic-response'];

            if (!subsonicResponse) {
                throw new Error("Subsonic API Error: missing subsonic-response");
            }

            if (subsonicResponse.status === "ok") {
                return subsonicResponse;
            } else {
                throw new Error("Subsonic API Error: " + JSON.stringify(subsonicResponse));
            }
        } catch (error) {
            console.error("Request failed:", error);
            return null;
        }
    }

    /**
     * Retrieves a list of artists.
     * @returns {Promise<Array>} The list of artists.
     */
    async getArtists() {
        const data = await this.request("getArtists");
        return this.asArray(data?.artists?.index);
    }

    /**
     * Retrieves information about a specific artist.
     * Includes a link to the artist's albums. <---HERE
     * @param {string} artistId - The artist ID.
     * @returns {Promise<Object|null>} The artist information or null if not found.
     */
    async getArtist(artistId) {
        const data = await this.request("getArtist", { id: artistId });
        return data?.artist || null;
    }

    /**
     * Retrieves information about a specific album.
     * @param {string} albumId - The album ID.
     * @returns {Promise<Object|null>} The album information or null if not found.
     */
    async getAlbum(albumId) {
        const data = await this.request("getAlbum", { id: albumId });
        if (data?.album?.song) {
            data.album.song = this.asArray(data.album.song).map(song => ({
                ...song,
                link: this.getSong(song.id)
            }));
        }
        return data?.album || null;
    }

    /**
     * Retrieves the URL to stream a specific song.
     * @param {string} songId - The song ID.
     * @returns {string} The URL to stream the song.
     */
    getSong(songId) {
        return `${this.server}/rest/stream?id=${songId}&u=${this.user}&t=${this.token}&s=${this.salt}&v=${this.version}&c=${this.client}`;
    }

    /**
     * Retrieves information about a specific song.
     * @param {string} songId - The song ID.
     * @returns {Promise<Object|null>} The song information or null if not found.
     */
    async getSongInfo(songId) {
        const data = await this.request("getSong", { id: songId });
        return data?.song || null;
    }

    /**
     * Searches for songs matching the query.
     * @param {string} query - The search query.
     * @returns {Promise<Object>} The search results including albums, artists, and songs with links.
     */
    async search(query) {
        const data = await this.request("search3", { query });
        const albums = this.asArray(data?.searchResult3?.album);
        const songs = this.asArray(data?.searchResult3?.song);
        const artists = this.asArray(data?.searchResult3?.artist);

        // Use getAlbum to obtain the details for every album
        const albumsWithSongs = await Promise.all(albums.map(async album => {
            const albumDetails = await this.getAlbum(album.id);
            return albumDetails ? { ...album, song: albumDetails.song } : album;
        }));

        return {
            album: albumsWithSongs,
            artist: artists,
            song: songs.map(song => ({
                ...song,
                link: this.getSong(song.id)
            }))
        };
    }

    /**
     * Displays search results in a specified container.
     * @param {string} query - The search query.
     * @param {string} containerId - The ID of the container to display results in.
     */
    async displaySearchResults(query, containerId) {
        const results = await this.search(query);
        const container = document.getElementById(containerId);
        container.innerHTML = "";

        if (results.song.length > 0) {
            results.song.forEach(song => {
                const songElement = document.createElement("div");
                songElement.textContent = `${song.artist} - ${song.title}`;
                container.appendChild(songElement);
            });
        } else {
            container.textContent = "No results found.";
        }
    }

    /**
     * Logs search results to the console.
     * @param {string} query - The search query.
     */
    async consoleSearch(query) {
        const results = await this.search(query);
        if (results.song.length > 0) {
            results.song.forEach(song => {
                console.log(`${song.id} - ${song.artist} - ${song.title}`);
            });
        } else {
            console.log("No results found.");
        }
    }

    /**
     * Returns a list of music folders
     */
    async getMusicFolders() {
        const data = await this.request("getMusicFolders");
        return this.asArray(data?.musicFolders?.musicFolder);
    }

    /**
     * Returns the music directory
     */
    async getMusicDirectory(Id) {
        const data = await this.request("getMusicDirectory",{ id:Id });
        return this.asArray(data?.directory?.child);
    }


    /*
    * Returns the full index. (this is represents the folder structure of the music library)
    * @param {int} - The index id to retrieve (0 for the first index)
    */
    async getIndexes(id=0) {
        const data = await this.request("getIndexes",{ musicFolderId:id });
        return {
            index: this.asArray(data?.indexes?.index),
            child: this.asArray(data?.indexes?.child)
        };
    }



    /**
     * Returns the playlists
     */
    async getPlaylists() {
        const data = await this.request("getPlaylists");
        return this.asArray(data?.playlists?.playlist);

    }

    /**
     * Returns the playlist
     */
    async getPlaylist(Id) {
        const data = await this.request("getPlaylist",{ id:Id });
        return {
            ...data?.playlist,
            entry: this.asArray(data?.playlist?.entry)
        };

    }

    // TODO: Lyrics feature is parked until the external lyrics API is available again.
    // /**
    //  * Returns the current song lyrics
    //  * @param {string} title - The song title
    //  * @param {string} artist - The artist name
    //  * @returns {Promise<string|null>} The lyrics of the song or null if not found
    //  */
    // async getLyrics(artist,title) {
    //     const data = await this.request("getLyrics", { title, artist });
    //     return data?.lyrics?.value || null;
    //
    // }


    /**
     * Runs a command on the Subsonic server.
     * @param {string} command - The command to run.
     * @returns {Promise<Object|null>} The response from the server or null if the command failed.
     */
    async runCommand(command) {
        const data = await this.request(command);
        return data || null;
    }

    /**
     * Gets the cover art URL for a given ID.
     * Rough on the edges but meh, it works.
     * @param {*} id
     * @returns
     */
    getCoverArt(id) {
        return `${this.server}/rest/getCoverArt?id=${id}&u=${this.user}&t=${this.token}&s=${this.salt}&v=${this.version}&c=${this.client}&size=100`;
    }

}
