/*ololord global object*/

var lord = lord || {};

/*Variables*/

lord.currentTracks = {};

/*Functions*/

lord.allowTrackDrop = function(e) {
    e.preventDefault();
}

lord.trackDrag = function(e) {
    e.dataTransfer.setData("text", $(e.target).closest(".track")[0].id);
}

lord.trackDrop = function(e) {
    e.preventDefault();
    var data = e.dataTransfer.getData("text");
    var parent = lord.id("playlist");
    var draggedTrack = lord.id(data);
    var replacedTrack = $(e.target).closest(".track")[0];
    if (!draggedTrack || !replacedTrack)
        return;
    var draggedBoardName = lord.data("boardName", draggedTrack);
    var draggedFileName = lord.data("fileName", draggedTrack);
    var replacedBoardName = lord.data("boardName", replacedTrack);
    var replacedFileName = lord.data("fileName", replacedTrack);
    var draggedIndex;
    var replacedIndex;
    var trackList = lord.getLocalObject("playlist/trackList", []);
    for (var i = 0; i < trackList.length; ++i) {
        var track = trackList[i];
        if (draggedBoardName == track.boardName && draggedFileName == track.fileName) {
            draggedIndex = i;
            if (replacedIndex >= 0)
                break;
        }
        if (replacedBoardName == track.boardName && replacedFileName == track.fileName) {
            replacedIndex = i;
            if (draggedIndex >= 0)
                break;
        }
    }
    if (draggedIndex >= 0 && replacedIndex >= 0)
        trackList[draggedIndex] = trackList.splice(replacedIndex, 1, trackList[draggedIndex])[0];
    lord.setLocalObject("playlist/trackList", trackList);
    parent.insertBefore(draggedTrack, replacedTrack);
};

lord.addTrack = function(key, track) {
    var model = merge.recursive(track, lord.model(["base", "tr"], true));
    var node = lord.template("playlistItem", model);
    lord.id("playlist").appendChild(node);
    lord.currentTracks[key] = track;
    var audio = lord.queryOne("audio", node);
    audio.addEventListener("play", function() {
        lord.forIn(lord.currentTracks, function(_, k) {
            if (k == key)
                return;
            var div = lord.id("track/" + k);
            var prev = lord.queryOne("audio", div);
            if (!prev.paused) {
                audio.volume = prev.volume;
                prev.pause();
            }
        });
    }, false);
    audio.addEventListener("ended", function() {
        var nextDiv = audio.parentNode.nextSibling;
        if (!nextDiv)
            return;
        var nextAudio = lord.queryOne("audio", nextDiv);
        nextAudio.volume = audio.volume;
        nextAudio.play();
    }, false);
};

lord.removeFromPlaylist = function(a) {
    var boardName = lord.data("boardName", a, true);
    var fileName = lord.data("fileName", a, true);
    var key = boardName + "/" + fileName;
    var trackList = lord.getLocalObject("playlist/trackList", []);
    for (var i = 0; i < trackList.length; ++i) {
        var track = trackList[i];
        if (boardName == track.boardName && fileName == track.fileName) {
            trackList.splice(i, 1);
            break;
        }
    }
    lord.setLocalObject("playlist/trackList", trackList);
    var node = lord.id("track/" + key);
    if (node)
        lord.id("playlist").removeChild(node);
    if (lord.currentTracks.hasOwnProperty(key))
        delete lord.currentTracks[key];
};

lord.checkPlaylist = function() {
    lord.getLocalObject("playlist/trackList", []).forEach(function(track) {
        var key = track.boardName + "/" + track.fileName;
        if (lord.currentTracks.hasOwnProperty(key))
            return;
        lord.currentTracks[key] = {};
        lord.addTrack(key, track);
    });
    setTimeout(lord.checkPlaylist, lord.Second);
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.checkPlaylist();
}, false);
