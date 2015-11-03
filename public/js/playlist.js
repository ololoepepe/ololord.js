/*ololord global object*/

var lord = lord || {};

/*Variables*/

lord.currentTracks = {};
lord.blockVolumeChange = false;

/*Functions*/

lord.addTrack = function(key, track) {
    var c = {};
    lord.getModel("misc/base").then(function(model) {
        c.model = merge.recursive(track, model);
        return lord.getModel("misc/tr");
    }).then(function(model) {
        c.model = merge.recursive(c.model, model);
        return lord.getTemplate("playlistItem");
    }).then(function(template) {
        var nodes = $.parseHTML(template(c.model));
        lord.id("playlist").appendChild(nodes[0]);
        lord.currentTracks[key] = track;
    });
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
