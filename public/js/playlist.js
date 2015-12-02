/*ololord global object*/

var lord = lord || {};

/*Variables*/

lord.currentTracks = {};
lord.blockVolumeChange = false;

/*Functions*/

lord.addTrack = function(key, track) {
    var model = merge.recursive(track, lord.model(["base", "tr"], true));
    var nodes = $.parseHTML(lord.template("playlistItem")(model));
    var node = nodes[0];
    lord.id("playlist").appendChild(node);
    lord.currentTracks[key] = track;
    var audio = lord.queryOne("audio", node);
    audio.addEventListener("play", function() {
        lord.forIn(lord.currentTracks, function(_, k) {
            if (k == key)
                return;
            var div = lord.id("track/" + k);
            lord.queryOne("audio", div).pause();
        });
    }, false);
    audio.addEventListener("ended", function() {
        var nextDiv = audio.parentNode.nextSibling;
        if (!nextDiv)
            return;
        lord.queryOne("audio", nextDiv).play();
    }, false);
};

lord.removeTrack = function(key) {
    var node = lord.id("track/" + key);
    if (node)
        lord.id("playlist").removeChild(node);
    if (lord.currentTracks.hasOwnProperty(key))
        delete lord.currentTracks[key];
};

lord.removeFromPlaylist = function(a) {
    var boardName = lord.data("boardName", a, true);
    var fileName = lord.data("fileName", a, true);
    var key = boardName + "/" + fileName;
    var tracks = lord.getLocalObject("playlist/tracks", {});
    if (!tracks.hasOwnProperty(key))
        return;
    delete tracks[key];
    lord.setLocalObject("playlist/tracks", tracks);
    lord.removeTrack(key);
};

lord.checkPlaylist = function() {
    var tracks = lord.getLocalObject("playlist/tracks", {});
    lord.forIn(tracks, function(track, key) {
        if (!lord.currentTracks[key])
            lord.addTrack(key, track);
    });
    lord.forIn(lord.currentTracks, function(_, key) {
        if (!tracks[key])
            lord.removeTrack(key);
    });
    setTimeout(lord.checkPlaylist, 1000);
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.checkPlaylist();
}, false);
