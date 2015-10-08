/*ololord global object*/

var lord = lord || {};

/*Variables*/

lord.currentTracks = {};
lord.blockVolumeChange = false;

/*Functions*/

lord.addTrack = function(track) {
    if (!track)
        return;
    var div = lord.node("div");
    div.id = "track/" + track;
    lord.addClass(div, "track");
    var span = lord.node("span");
    div.appendChild(span);
    div.appendChild(lord.node("br"));
    (function(span, track) {
        var boardName = track.split("/").shift();
        var fileName = track.split("/").pop();
        if (!boardName || !fileName)
            return;
        lord.ajaxRequest("get_file_meta_data", [boardName, fileName], lord.RpcGetFileMetaDataId, function(res) {
            var s = res["artist"] ? res["artist"] : lord.text("unknownArtistText");
            s += " - ";
            s += res["title"] ? res["title"] : lord.text("unknownTitleText");
            s += " [";
            s += res["album"] ? res["album"] : lord.text("unknownAlbumText");
            s += "]";
            if (res["year"])
                s += " (" + res["year"] + ")";
            span.appendChild(lord.node("text", s));
            if (res["duration"] || res["bitrate"]) {
                span.appendChild(lord.node("text", " "));
                var b = lord.node("b");
                if (res["duration"])
                    b.appendChild(lord.node("text", res["duration"]));
                if (res["duration"] && res["bitrate"])
                    b.appendChild(lord.node("text", " / "));
                if (res["bitrate"])
                    b.appendChild(lord.node("text", res["bitrate"] + "kbps"));
                span.appendChild(b);
            }
        });
    })(span, track);
    var audio = lord.node("audio");
    audio.width = "400px";
    audio.controls = "controls";
    var src = lord.node("source");
    var sitePathPrefix = lord.text("sitePathPrefix");
    src.src = "/" + sitePathPrefix + track;
    src.type = "audio/" + track.split(".").pop();
    audio.appendChild(src);
    (function(audio, track) {
        audio.addEventListener("play", function() {
            lord.forIn(lord.currentTracks, function(_, t) {
                if (t == track)
                    return;
                var div = lord.id("track/" + t);
                lord.queryOne("audio", div).pause();
            });
        }, false);
        //TODO
        /*audio.addEventListener("volumechange", function() {
            if (lord.blockVolumeChange)
                return;
            lord.blockVolumeChange = true;
            lord.forIn(lord.currentTracks, function(_, t) {
                if (t == track)
                    return;
                var div = lord.id("track/" + t);
                lord.queryOne("audio", div).volume = track.volume;
            });
            lord.blockVolumeChange = false;
        }, false);*/
        audio.addEventListener("ended", function() {
            var nextDiv = audio.parentNode.nextSibling;
            if (!nextDiv)
                return;
            lord.queryOne("audio", nextDiv).play();
        }, false);
    })(audio, track);
    div.appendChild(audio);
    var dlBtn = lord.node("a");
    dlBtn.href = "/" + sitePathPrefix + track;
    dlBtn.title = lord.text("downloadPlaylistFileText");
    dlBtn.download = track.split("/").pop();
    var img = lord.node("img");
    img.src = "/" + sitePathPrefix + "img/playlist_download.png";
    dlBtn.appendChild(img);
    div.appendChild(dlBtn);
    var rmBtn = lord.node("a");
    rmBtn.href = "javascript:lord.removeFromPlaylist('" + track + "');";
    rmBtn.title = lord.text("removeFromPlaylistText");
    var img = lord.node("img");
    img.src = "/" + sitePathPrefix + "img/playlist_delete.png";
    rmBtn.appendChild(img);
    div.appendChild(rmBtn);
    lord.id("playlist").appendChild(div);
    lord.currentTracks[track] = {};
};

lord.removeTrack = function(track) {
    if (!track)
        return;
    lord.id("playlist").removeChild(lord.id("track/" + track));
    delete lord.currentTracks[track];
};

lord.removeFromPlaylist = function(track) {
    if (!track)
        return;
    var tracks = lord.getLocalObject("playlist/tracks", {});
    if (!tracks[track])
        return;
    delete tracks[track];
    lord.setLocalObject("playlist/tracks", tracks);
    lord.removeTrack(track);
};

lord.checkPlaylist = function() {
    var tracks = lord.getLocalObject("playlist/tracks", {});
    lord.forIn(tracks, function(_, track) {
        if (!lord.currentTracks[track])
            lord.addTrack(track);
    });
    lord.forIn(lord.currentTracks, function(_, track) {
        if (!tracks[track])
            lord.removeTrack(track);
    });
    setTimeout(lord.checkPlaylist, 1000);
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.checkPlaylist();
}, false);
