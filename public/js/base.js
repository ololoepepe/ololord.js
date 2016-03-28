/*ololord global object*/

var lord = lord || {};

/*Constants*/

lord.WindowID = uuid.v4();
lord.DefaultSpells = "#wipe(samelines,samewords,longwords,symbols,capslock,numbers,whitespace)";
lord.DefaultHotkeys = {
    "dir": {},
    "rev": {}
};

lord._defineHotkey = function(name, key) {
    if (typeof name != "string" || typeof key != "string")
        return;
    lord.DefaultHotkeys.dir[name] = key;
    lord.DefaultHotkeys.rev[key] = name;
};

lord._defineHotkey("previousPageImage", "Ctrl+Left");
lord._defineHotkey("nextPageImage", "Ctrl+Right");
lord._defineHotkey("previousThreadPost", "Ctrl+Up");
lord._defineHotkey("nextThreadPost", "Ctrl+Down");
lord._defineHotkey("previousPost", "Ctrl+Shift+Up");
lord._defineHotkey("nextPost", "Ctrl+Shift+Down");
lord._defineHotkey("hidePost", "H");
lord._defineHotkey("goToThread", "V");
lord._defineHotkey("expandThread", "E");
lord._defineHotkey("expandImage", "I");
lord._defineHotkey("quickReply", "R");
lord._defineHotkey("submitReply", "Alt+Enter");
lord._defineHotkey("showFavorites", "Alt+F");
lord._defineHotkey("showSettings", "Alt+T");
lord._defineHotkey("updateThread", "U");
lord._defineHotkey("markupBold", "Alt+B");
lord._defineHotkey("markupItalics", "Alt+I");
lord._defineHotkey("markupStrikedOut", "Alt+S");
lord._defineHotkey("markupUnderlined", "Alt+U");
lord._defineHotkey("markupSpoiler", "Alt+P");
lord._defineHotkey("markupQuotation", "Alt+Q");
lord._defineHotkey("markupCode", "Alt+C");

/*Variables*/

lord.chatDialog = null;
lord.lastChatCheckDate = lord.getLocalObject("lastChatCheckDate", null);
lord.notificationQueue = [];
lord.pageProcessors = [];
lord.postProcessors = [];
lord.currentTracks = {};
lord.lastWindowSize = {
    width: $(window).width(),
    height: $(window).height()
};

/*Functions*/

(function() {
    var settings = lord.settings();
    var model = lord.model("base");
    var locale = model.site.locale;
    var dateFormat = model.site.dateFormat;
    var timeOffset = ("local" == settings.time) ? (+settings.timeZoneOffset - model.site.timeOffset) : 0;

    lord.processFomattedDate = function(parent) {
        if ("local" != settings.time || !timeOffset)
            return;
        if (!parent)
            parent = document.body;
        var q = "[name='dateTime']:not(.processedFormattedDate), [name='formattedDate']:not(.processedFormattedDate)";
        lord.queryAll(q, parent).forEach(function(span) {
            var date = span.textContent.replace(/^\s+/, "").replace(/\s+$/, "");
            moment.locale(locale);
            var oldDate = date;
            date = moment(date, dateFormat).add(timeOffset, "minutes").locale(locale).format(dateFormat);
            $(span).empty();
            span.appendChild(lord.node("text", date));
            $(span).addClass("processedFormattedDate");
        });
    };

    lord.pageProcessors.push(lord.processFomattedDate);
})();

lord.pageProcessors.push(function() {
    if (lord.getLocalObject("mumWatching", false)) {
        lord.queryAll(".banner > a > img").forEach(function(img) {
            $(img).addClass("mumWatching");
        });
    }
});

lord.logoutImplementation = function(form, vk) {
    lord.setCookie("hashpass", "", {
        expires: lord.Billion,
        path: "/"
    });
    if (vk) {
        lord.setCookie("vkAuth", "", {
            expires: lord.Billion,
            path: "/"
        });
    }
    lord.reloadPage();
};

lord.doLogout = function(event, form) {
    event.preventDefault();
    if (typeof VK == "undefined" || lord.getCookie("vkAuth", "false") != "true")
        return lord.logoutImplementation(form, false);
    VK.Auth.logout(function() {
        return lord.logoutImplementation(form, true);
    });
    setTimeout(function() {
        return lord.logoutImplementation(form, true);
    }, 1000);
};

lord.redirectToLoginPage = function() {
    window.location = "/" + lord.data("sitePathPrefix") + "login.html?source=" + window.location.pathname;
};

lord.switchShowLogin = function() {
    var inp = lord.id("loginInput");
    if (inp.type === "password")
        inp.type = "text";
    else if (inp.type === "text")
        inp.type = "password";
};

lord.preventOnclick = function(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    return false;
};

lord.localData = function(includeSettings) {
    var o = {};
    if (includeSettings)
        o.settings = lord.settings();
    var f = function(key, def) {
        if (typeof def == "undefined")
            def = {};
        o[key] = lord.getLocalObject(key, def);
    };
    f("favoriteThreads");
    f("ownPosts");
    f("spells", "");
    f("userJavaScript", "");
    f("hotkeys", {});
    f("hiddenPosts", {});
    f("lastCodeLang", "");
    f("chats");
    f("drafts");
    f("playerTracks", []);
    f("lastChatCheckDate", null);
    f("audioVideoVolume", 1);
    f("userCss", "");
    f("ownLikes");
    f("ownVotes");
    f("lastPostNumbers");
    f("showTripcode");
    f("mumWatching", false);
    return o;
};

lord.setLocalData = function(o, includeSettings, includeCustom) {
    if (includeSettings && o.settings) {
        if (o.settings.captchaEngine.id)
            o.settings.captchaEngine = o.settings.captchaEngine.id;
        if (o.settings.style.name)
            o.settings.style = o.settings.style.name;
        if (o.settings.codeStyle.name)
            o.settings.codeStyle = o.settings.codeStyle.name;
        lord.setSettings(o.settings);
    }
    var f = function(key, doMerge) {
        var val = o[key];
        if (typeof val == "undefined")
            return;
        if (!doMerge)
            return lord.setLocalObject(key, val);
        var src = lord.getLocalObject(key, {});
        lord.each(val, function(v, k) {
            if (typeof doMerge == "function")
                doMerge(src, k, v);
            else
                src[k] = v;
        });
        lord.setLocalObject(key, src);
    };
    if (includeCustom) {
        f("userCss");
        f("userJavaScript");
    }
    f("favoriteThreads", true);
    f("ownPosts", true);
    f("spells");
    f("hotkeys");
    f("hiddenPosts");
    f("lastCodeLang");
    f("chats", function(src, key, value) {
        if (!src.hasOwnProperty(key))
            return src[key] = value;
        var newMessages = [];
        src[key].forEach(function(message) {
            for (var i = 0; i < value.length; ++i) {
                var msg = value[i];
                if (message.type == msg.type && message.date == msg.date && message.text == msg.text)
                    return;
                newMessages.push(msg);
            }
        });
        src[key] = src[key].concat(newMessages).sort(function(m1, m2) {
            if (m1.date < m2.date)
                return -1;
            else if (m1.date > m2.date)
                return 1;
            else
                return 0;
        });
    });
    f("drafts", true);
    f("playerTracks");
    f("lastChatCheckDate");
    f("audioVideoVolume");
    f("ownLikes", true);
    f("ownVotes", true);
    f("lastPostNumbers");
    f("showTripcode");
    f("mumWatching");
};

lord.exportSettings = function() {
    prompt(lord.text("copySettingsHint"), JSON.stringify(lord.localData(true)));
};

lord.importSettings = function() {
    var s = prompt(lord.text("pasteSettingsHint"));
    if (!s)
        return;
    var o;
    try {
        o = JSON.parse(s);
    } catch(err) {
        lord.handleError(err);
        return;
    }
    lord.setLocalData(o, true, true);
};

lord.synchronize = function() {
    var div = lord.template("synchronizationDialog", lord.model("tr"));
    lord.showDialog(div, {
        title: "synchronizationText",
        buttons: [
            "cancel",
            "ok"
        ]
    }).then(function(accepted) {
        if (!accepted)
            return;
        var password = lord.nameOne("password", div).value || lord.getCookie("hashpass");
        if (!password) {
            lord.showPopup(lord.text("noPasswordNotLoggedInerror"), { type: "critical" });
            return;
        }
        var settings = !!lord.nameOne("synchronizeSettings", div).checked;
        var cssJs = !!lord.nameOne("synchronizeCssAndJs", div).checked;
        return lord.api("synchronization", { key: password }).then(function(result) {
            if (result)
                lord.setLocalData(result, settings, cssJs);
            var formData = new FormData();
            formData.append("key", password);
            formData.append("data", JSON.stringify(lord.localData(settings)));
            return lord.post("/" + lord.data("sitePathPrefix") + "action/synchronize", formData);
        }).then(function() {
            lord.showPopup(lord.text("synchronizationSuccessfulText"));
            lord.showPopup(lord.text("synchronizationTimeoutText"), { timeout: 10 * lord.Second, type: "warning" });
        }).catch(lord.handleError);
    }).catch(lord.handleError);
};

lord.showSettings = function() {
    var c = {};
    var model = { settings: lord.settings() };
    c.model = merge.recursive(model,
            lord.model(["base", "tr", "boards", "board/" + lord.data("boardName")]));
    c.div = lord.template("settingsDialog", c.model);
    $("[name='exportSettingsButton'], [name='importSettingsButton'], [name='synchronizationButton']", c.div).button();
    lord.showDialog(c.div, {
        title: "settingsDialogTitle",
        buttons: [
            "cancel",
            "ok"
        ],
        afterShow: function() {
            $(":focus", c.div).blur();
        }
    }).then(function(accepted) {
        if (!accepted)
            return;
        var model = {};
        model.hiddenBoards = [];
        lord.queryAll("input, select", c.div).forEach(function(el) {
            var key = el.name;
            var val;
            if (el.tagName == "select")
                val = el.options[el.selectedIndex].value;
            else if (el.name.substr(0, 6) != "board_")
                val = ("checkbox" == el.type) ? !!el.checked : el.value;
            else if (el.checked)
                model.hiddenBoards.push(el.name.substr(6));
            if (typeof val != undefined)
                model[key] = val;
        });
        lord.setSettings(model);
        lord.reloadPage();
    }).catch(lord.handleError);
};

lord.showFavorites = function() {
    var div = lord.id("favorites");
    if (div)
        return;
    var model = lord.model(["base", "tr"]);
    model.favorites = lord.toArray(lord.getLocalObject("favoriteThreads", {}));
    div = lord.template("favoritesDialog", model);
    lord.showDialog(div, {
        title: lord.text("favoriteThreadsText"),
        buttons: [ "close" ]
    }).then(function() {
        var favoriteThreads = lord.getLocalObject("favoriteThreads", {});
        lord.each(favoriteThreads, function(fav) {
            fav.previousLastPostNumber = fav.lastPostNumber;
        });
        lord.setLocalObject("favoriteThreads", favoriteThreads);
    }).catch(lord.handleError);
};

lord.removeFavorite = function(el) {
    var div = el.parentNode;
    div.parentNode.removeChild(div);
    lord.removeThreadFromFavorites(lord.data("boardName", el, true), +lord.data("threadNumber", el, true));
};

lord.switchMumWatching = function() {
    var watching = lord.getLocalObject("mumWatching", false);
    var img = lord.queryOne("[name='switchMumWatchingButton'] > img");
    img.src = "/" + lord.data("sitePathPrefix") + "img/" + (watching ? "show" : "hide") + ".png";
    lord.queryAll(".postFileFile > a > img, .banner > a > img").forEach(function(img) {
        if (watching)
            $(img).removeClass("mumWatching");
        else
            $(img).addClass("mumWatching");
    });
    lord.setLocalObject("mumWatching", !watching);
};

lord.isMediaTypeSupported = function(mimeType) {
    var type;
    if (lord.isAudioType(mimeType))
        type = "audio";
    else if (lord.isVideoType(mimeType))
        type = "video";
    if (!type)
        return false;
    var node = lord.node(type);
    return !!(node.canPlayType && node.canPlayType(mimeType + ";").replace(/no/, ""));
};

lord.updatePlayerTracksHeight = function() {
    var tracks = $("#playerTracks");
    tracks.css("max-height", ($("#player").height() - tracks.position().top - 44) + "px");
};

lord.setPlayerVisible = function(e, visible) {
    e.stopPropagation();
    $("#player")[visible ? "removeClass" : "addClass"]("minimized");
    if (visible)
        lord.updatePlayerTracksHeight();
};

lord.durationToString = function(duration) {
    if (!duration)
        return "00:00:00";
    duration = Math.floor(+duration);
    var hours = "" + Math.floor(duration / 3600);
    if (hours.length < 2)
        hours = "0" + hours;
    duration %= 3600;
    var minutes = "" + Math.floor(duration / 60);
    if (minutes.length < 2)
        minutes = "0" + minutes;
    var seconds = "" + (duration % 60);
    if (seconds.length < 2)
        seconds = "0" + seconds;
    return hours + ":" + minutes + ":" + seconds;
};

lord.updatePlayerTrackTags = function() {
    var tags = lord.id("playerTrackTags");
    $(tags).empty();
    tags.style.display = "none";
    if (!lord.currentTrack)
        return lord.updatePlayerTracksHeight();
    var t = lord.currentTrack;
    var s = t.artist || "";
    s += (t.artist && t.title) ? " — " : "";
    s += t.title || "";
    s += ((t.artist || t.title) && t.album) ? " " : "";
    s += t.album ? ("[" + t.album + "]") : "";
    s += (s && t.year) ? (" (" + t.year + ")") : "";
    s += s ? " " : "";
    if (!s)
        return lord.updatePlayerTracksHeight();
    tags.appendChild(lord.node("text", s));
    tags.style.display = "";
    lord.updatePlayerTracksHeight();
};

lord.updatePlayerTrackInfo = function() {
    var info = lord.id("playerTrackInfo");
    $(info).empty();
    if (!lord.currentTrack)
        return;
    var s = lord.durationToString(lord.playerElement.currentTime) + " / " + lord.currentTrack.duration;
    info.appendChild(lord.node("text", s));
};

lord.resetPlayerSource = function(track) {
    if (lord.playerElement) {
        if (!lord.playerElement.paused)
            lord.playerElement.pause();
        $(lord.playerElement).remove();
    }
    $("#playerDurationSlider").slider("destroy");
    $("#playerDurationSlider").slider({
        min: 0,
        max: 0,
        step: 0,
        value: 0,
        disabled: true
    });
    lord.playerElement = lord.node("audio");
    var defVol = lord.getLocalObject("defaultAudioVideoVolume", 100) / 100;
    lord.playerElement.volume = lord.getLocalObject("playerVolume", defVol);
    lord.playerElement.style.display = "none";
    lord.setLocalObject("playerLastTrack", track);
    var source = lord.node("source");
    source.type = track.mimeType;
    source.src = "/" + lord.data("sitePathPrefix") + track.boardName + "/src/" + track.fileName;
    lord.playerElement.appendChild(source);
    lord.playerElement.addEventListener("play", function() {
        lord.setSessionObject("playerPlaying", true);
    }, false);
    lord.playerElement.addEventListener("pause", function() {
        lord.removeSessionObject("playerPlaying");
    }, false);
    lord.playerElement.addEventListener("ended", function() {
        lord.playerPreviousOrNext(true);
    }, false);
    lord.playerElement.addEventListener("volumechange", function() {
        lord.setLocalObject("playerVolume", lord.playerElement.volume);
        lord.updatePlayerButtons();
    }, false);
    lord.playerElement.addEventListener("timeupdate", function() {
        lord.setSessionObject("playerCurrentTime", lord.playerElement.currentTime);
        if (lord.playerUserSliding)
            return;
        $("#playerDurationSlider").slider("value", lord.playerElement.currentTime);
        lord.updatePlayerTrackInfo();
    }, false);
    lord.playerElement.addEventListener("durationchange", function() {
        $("#playerDurationSlider").slider("destroy");
        $("#playerDurationSlider").slider({
            min: 0,
            max: lord.playerElement.duration,
            step: 1,
            value: 0,
            start: function() {
                lord.playerUserSliding = true;
            },
            stop: function() {
                lord.playerUserSliding = false;
                lord.playerElement.currentTime = +$(this).slider("value");
            }
        });
    }, false);
    lord.updatePlayerTrackInfo();
    document.body.appendChild(lord.playerElement);
};

lord.updatePlayerButtons = function() {
    lord.nameAll("playerPlayPauseButton", lord.id("player")).forEach(function(btn) {
        btn.disabled = !lord.playerElement && !lord.currentTrack;
        btn.src = btn.src.replace(/\/(play|pause)\.png$/,
            "/" + ((!lord.playerElement || lord.playerElement.paused) ? "play" : "pause") + ".png");
        btn.title = lord.text((!lord.playerElement || lord.playerElement.paused) ? "playerPlayText"
            : "playerPauseText");
    });
    lord.queryAll("[name='playerPreviousTrackButton'], [name='playerNextTrackButton']",
        lord.id("player")).forEach(function(btn) {
        btn.disabled = !lord.playerElement;
    });
    lord.nameAll("playerMuteButton", lord.id("player")).forEach(function(btn) {
        btn.disabled = !lord.playerElement;
        btn.src = btn.src.replace(/(on|off)\.png$/,
            ((!lord.playerElement || lord.playerElement.volume) ? "on" : "off") + ".png");
        btn.title = lord.text((!lord.playerElement || lord.playerElement.volume) ? "playerMuteText"
            : "playerUnmuteText");
    });
};

lord.playerPlayPause = function(e, time) {
    if (e)
        e.stopPropagation();
    if (lord.playerElement) {
        lord.playerElement[lord.playerElement.paused ? "play" : "pause"]();
        if (!isNaN(+time) && +time >= 0 && lord.playerElement.paused)
            lord.playerElement.currentTime = +time;
    } else if (lord.currentTrack) {
        lord.resetPlayerSource(lord.currentTrack);
        lord.playerElement.play();
        if (!isNaN(+time) && +time >= 0)
            lord.playerElement.currentTime = +time;
    } else {
        return;
    }
    lord.updatePlayerButtons();
    lord.updatePlayerTrackTags();
};

lord.playerPreviousOrNext = function(next, e) {
    if (e)
        e.stopPropagation();
    var current = lord.queryOne(".track.selected", lord.id("playerTracks"));
    if (!current)
        return;
    var el = current[next ? "nextElementSibling" : "previousElementSibling"];
    if (!el && e) {
        var list = lord.queryAll(".track", lord.id("playerTracks"));
        if (!list)
            return;
        el = list[next ? "shift" : "pop"]();
    }
    if (!el)
        return;
    lord.playTrack(el);
};

lord.playerPrevious = function(e) {
    lord.playerPreviousOrNext(false, e);
};

lord.playerNext = function(e) {
    lord.playerPreviousOrNext(true, e);
};

lord.playerMute = function(e) {
    e.stopPropagation();
    if (!lord.playerElement)
        return;
    if (lord.playerElement.volume) {
        lord.lastPlayerVolume = lord.playerElement.volume;
        lord.playerElement.volume = 0;
        $("#playerVolumeSlider").slider("value", 0);
    } else {
        lord.playerElement.volume = lord.lastPlayerVolume;
        $("#playerVolumeSlider").slider("value", lord.lastPlayerVolume);
    }
};

lord.playTrack = function(el) {
    if ($(el).hasClass("selected") && lord.playerElement) {
        if (!lord.playerElement.paused)
            return;
        if (el.id.replace(/^track\//, "") == lord.currentTrack.fileName) {
            lord.playerElement.play();
            lord.updatePlayerButtons();
            return;
        }
    }
    lord.queryAll(".track.selected", lord.id("playerTracks")).forEach(function(div) {
        $(div).removeClass("selected");
    });
    $(el).addClass("selected");
    lord.currentTrack = lord.currentTracks[el.id.replace(/^track\//, "")];
    lord.resetPlayerSource(lord.currentTrack);
    lord.playerElement.play();
    lord.updatePlayerButtons();
    lord.updatePlayerTrackTags();
};

lord.allowTrackDrop = function(e) {
    e.preventDefault();
};

lord.trackDrag = function(e) {
    e.dataTransfer.setData("text", $(e.target).closest(".track")[0].id);
};

lord.trackDrop = function(e) {
    e.preventDefault();
    var data = e.dataTransfer.getData("text");
    var parent = lord.id("playerTracks");
    var draggedTrack = lord.id(data);
    var replacedTrack = $(e.target).closest(".track")[0];
    if (!draggedTrack || !replacedTrack)
        return;
    var draggedFileName = lord.data("fileName", draggedTrack);
    var replacedFileName = lord.data("fileName", replacedTrack);
    var draggedIndex;
    var replacedIndex;
    var tracks = lord.getLocalObject("playerTracks", []);
    tracks.some(function(track, i) {
        if (draggedFileName == track.fileName) {
            draggedIndex = i;
            if (replacedIndex >= 0)
                return true;
        }
        if (replacedFileName == track.fileName) {
            replacedIndex = i;
            if (draggedIndex >= 0)
                return true;
        }
    });
    if (draggedIndex >= 0 && replacedIndex >= 0 && draggedIndex != replacedIndex)
        tracks.splice(replacedIndex, 0, tracks.splice(draggedIndex, 1)[0]);
    lord.setLocalObject("playerTracks", tracks);
    lord.setLocalObject("playerMustReorder", lord.WindowID);
    lord.checkPlaylist();
    setTimeout(function() {
        lord.setLocalObject("playerMustReorder", false);
    }, lord.Second);
};

lord.addTrack = function(track) {
    var model = merge.recursive(track, lord.model(["base", "tr"]));
    lord.id("playerTracks").appendChild(lord.template("playerTrack", model));
    lord.currentTracks[track.fileName] = track;
};

lord.editAudioTags = function(el, e) {
    if (e)
        e.stopPropagation();
    var fileName = lord.data("fileName", el, true);
    var c = {};
    lord.api("fileInfo", { fileName: fileName }).then(function(fileInfo) {
        c.model = merge.recursive({ fileInfo: fileInfo }, lord.model(["base", "tr"]));
        c.div = lord.template("editAudioTagsDialog", c.model);
        return lord.showDialog(c.div, { title: "editAudioTagsText" });
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        return lord.post(form.action, new FormData(form));
    }).then(function(result) {
        if (typeof result == "undefined")
            return Promise.resolve();
        var tracks = lord.getLocalObject("playerTracks", []);
        var tags;
        var inPlaylist = tracks.some(function(track) {
            if (fileName != track.fileName)
                return;
            var form = lord.queryOne("form", c.div);
            var t = lord.currentTracks[fileName];
            tags = ["album", "artist", "title", "year"].reduce(function(acc, name) {
                var tag = lord.nameOne(name, form).value;
                track[name] = tag;
                t[name] = tag;
                if (lord.currentTrack && fileName == lord.currentTrack.fileName)
                    lord.currentTrack[name] = tag;
                acc[name] = tag;
                return acc;
            }, {});
            return true;
        });
        if (inPlaylist) {
            lord.setLocalObject("playerTracks", tracks);
            if (lord.currentTrack && fileName == lord.currentTrack.fileName)
                lord.updatePlayerTrackTags();
            var t = lord.currentTracks[fileName];
            var pnode = lord.id("track/" + fileName);
            if (pnode) {
                var selected = $(pnode).hasClass("selected");
                var model = merge.recursive(t, lord.model(["base", "tr"]));
                var node = lord.template("playerTrack", model);
                if (selected)
                    $(node).addClass("selected");
                lord.id("playerTracks").replaceChild(node, pnode);
            }
        }
        if (!e)
            return lord.updatePost(+lord.data("number", el, true));
    }).catch(lord.handleError);
};

lord.removeFromPlaylist = function(e, a) {
    e.stopPropagation();
    var fileName = lord.data("fileName", a, true);
    var tracks = lord.getLocalObject("playerTracks", []);
    var exists = tracks.some(function(track, i) {
        var exists = (fileName == track.fileName);
        if (exists)
            tracks.splice(i, 1);
        return exists;
    });
    if (!exists)
        return;
    lord.setLocalObject("playerTracks", tracks);
    $(lord.id("track/" + fileName)).remove();
    if (lord.currentTracks.hasOwnProperty(fileName))
        delete lord.currentTracks[fileName];
};

lord.checkPlaylist = function() {
    var reorder = lord.getLocalObject("playerMustReorder", false);
    reorder == reorder && (reorder != lord.WindowID);
    var lastCurrentTrack;
    if (reorder) {
        $("#playerTracks").empty();
        lord.currentTracks = {};
        lastCurrentTrack = lord.currentTrack;
        lord.currentTrack = null;
    }
    var tracks = lord.getLocalObject("playerTracks", []);
    if (!reorder) {
        var trackMap = tracks.reduce(function(acc, track) {
            acc[track.fileName] = track;
            return acc;
        }, {});
        lord.each(lord.currentTracks, function(track) {
            if (!trackMap.hasOwnProperty(track.fileName))
                $(lord.id("track/" + track.fileName)).remove();
        });
    }
    tracks.forEach(function(track) {
        if (!reorder && lord.currentTracks.hasOwnProperty(track.fileName))
            return;
        lord.addTrack(track);
    });
    if (!lord.queryOne(".track.selected", lord.id("playerTracks"))) {
        var storedLastTrack = lord.getLocalObject("playerLastTrack", {});
        var node = lord.id("track/" + storedLastTrack.fileName);
        if (lastCurrentTrack && lord.currentTracks.hasOwnProperty(lastCurrentTrack.fileName))
            lord.currentTrack = lastCurrentTrack;
        else if (node)
            lord.currentTrack = storedLastTrack;
        else if (tracks.length > 0)
            lord.currentTrack = tracks[0];
        if (lord.currentTrack) {
            $(lord.id("track/" + lord.currentTrack.fileName)).addClass("selected");
            lord.updatePlayerTrackTags();
        }
    }
    lord.updatePlayerButtons();
    if (lord.getLocalObject("autoUpdatePlayer", !lord.deviceType("mobile")))
        setTimeout(lord.checkPlaylist, lord.Second);
};

lord.expandCollapseSpoiler = function(titleSpan) {
    if (!titleSpan)
        return;
    var span = titleSpan.parentNode;
    if (!span)
        return;
    var bodySpan = lord.queryOne(".cspoilerBody", span);
    if (!bodySpan)
        return;
    var expanded = (bodySpan.style.display != "none");
    bodySpan.style.display = expanded ? "none" : "block";
    var blockquote = $(span).closest("blockquote");
    if (blockquote[0]) {
        if (expanded) {
            --blockquote[0]._expand;
            if (blockquote[0]._expand <= 0)
                blockquote.removeClass("expand");
        } else {
            if (!blockquote[0]._expand)
                blockquote[0]._expand = 1;
            else
                ++blockquote[0]._expand;
            blockquote.addClass("expand");
        }
    }
};

lord.removeThreadFromFavorites = function(boardName, threadNumber) {
    var fav = lord.getLocalObject("favoriteThreads", {});
    delete fav[boardName + "/" + threadNumber];
    lord.setLocalObject("favoriteThreads", fav);
    var opPost = lord.id(threadNumber);
    if (!opPost)
        return false;
    var btn = lord.nameOne("addToFavoritesButton", opPost);
    var img = lord.queryOne("img", btn);
    img.src = img.src.replace("favorite_active.png", "favorite.png");
    var span = lord.queryOne("span", btn);
    $(span).empty();
    span.appendChild(lord.node("text", lord.text("addThreadToFavoritesText")));
};

lord.checkFavoriteThreads = function() {
    var favoriteThreads = lord.getLocalObject("favoriteThreads", {});
    var parameters = lord.toArray(favoriteThreads).map(function(fav) {
        return fav.boardName + ":" + fav.threadNumber;
    });
    if (parameters.length <= 0)
        return;
    lord.api("threadLastPostNumbers", { threads: parameters }).then(function(lastPostNumbers) {
        favoriteThreads = lord.getLocalObject("favoriteThreads", {});
        var div = lord.id("favorites");
        var show = false;
        lord.toArray(favoriteThreads).forEach(function(fav, i) {
            var lastPostNumber = lastPostNumbers[i];
            if (!lastPostNumber)
                fav.subject = "[404] " + fav.subject;
            fav.lastPostNumber = lastPostNumber;
            if (fav.lastPostNumber > fav.previousLastPostNumber) {
                var sameThread = (+lord.data("threadNumber") == fav.threadNumber);
                if (!sameThread && lord.notificationsEnabled()) {
                    lord.notificationQueue.push({
                        key: fav.boardName + "/" + fav.threadNumber,
                        boardName: fav.boardName,
                        postNumber: fav.lastPostNumber,
                        threadNumber: fav.threadNumber
                    });
                }
                if (!sameThread && lord.soundEnabled())
                    lord.playSound();
                if (div) {
                    var postDiv = lord.id("favorite/" + fav.boardName + "/" + fav.threadNumber);
                    if (!postDiv)
                        return;
                    var fnt = lord.queryOne("font", postDiv);
                    $(fnt).empty();
                    var diff = fav.lastPostNumber - fav.previousLastPostNumber;
                    fnt.appendChild(lord.node("text", "+" + diff));
                } else if (!sameThread) {
                    show = true;
                }
            }
            if (show) {
                lord.setLocalObject("favoriteThreads", favoriteThreads);
                lord.showFavorites();
            }
        });
        lord.setLocalObject("favoriteThreads", favoriteThreads);
        setTimeout(lord.checkFavoriteThreads, 15 * lord.Second);
    });
};

lord.showNewPosts = function() {
    var lastPostNumbers = lord.getLocalObject("lastPostNumbers", {});
    var currentBoardName = lord.data("boardName");
    lord.api("lastPostNumbers").then(function(result) {
        var getNewPostCount = function(boardName) {
            if (!boardName || currentBoardName == boardName || !result[boardName])
                return 0;
            var lastPostNumber = lastPostNumbers[boardName];
            if (!lastPostNumber)
                return 0;
            var newPostCount = result[boardName] - lastPostNumber;
            return (newPostCount > 0) ? newPostCount : 0;
        };
        if (lord.deviceType("mobile")) {
            lord.queryAll(".boardSelect").forEach(function(sel) {
                lord.queryAll("option", sel).forEach(function(opt) {
                    var newPostCount = getNewPostCount(lord.data("boardName", opt));
                    if (!newPostCount)
                        return;
                    opt.insertBefore(lord.node("text", "+" + newPostCount + " "), opt.childNodes[0]);
                });
            });
        } else {
            lord.queryAll(".navbar, .toolbar").forEach(function(navbar) {
                lord.queryAll(".navbarItem", navbar).forEach(function(item) {
                    var a = lord.queryOne("a", item);
                    if (!a)
                        return;
                    var newPostCount = getNewPostCount(lord.data("boardName", a));
                    if (!newPostCount)
                        return;
                    var span = lord.node("span");
                    $(span).addClass("newPostCount");
                    span.appendChild(lord.node("text", "+" + newPostCount));
                    var parent = a.parentNode;
                    parent.insertBefore(span, a);
                    parent.insertBefore(lord.node("text", " "), a);
                });
            });
        }
        lord.each(result, function(lastPostNumber, boardName) {
            if (lastPostNumbers[boardName])
                return;
            lastPostNumbers[boardName] = lastPostNumber;
        });
        if (typeof result[currentBoardName] == "number")
            lastPostNumbers[currentBoardName] = result[currentBoardName];
        lord.setLocalObject("lastPostNumbers", lastPostNumbers);
    }).catch(lord.handleError);
};

lord.editHotkeys = function() {
    var c = {};
    c.hotkeys = lord.getLocalObject("hotkeys", {
        dir: {},
        rev: {}
    });
    var model = {
        hotkeys: c.hotkeys.dir,
        defaultHotkeys: lord.DefaultHotkeys.dir
    };
    model = merge.recursive(model, lord.model("tr"));
    c.div = lord.template("hotkeysDialog", model);
    lord.showDialog(c.div).then(function(accepted) {
        if (!accepted)
            return;
        lord.queryAll("input", c.div).forEach(function(el) {
            var name = el.name;
            var value = el.value || lord.DefaultHotkeys.dir[name];
            c.hotkeys.dir[name] = value;
            c.hotkeys.rev[value] = name;
            lord.setLocalObject("hotkeys", c.hotkeys);
        });
    }).catch(lord.handleError);
};

lord.assignHotkey = function(e, inp) {
    if (!e || e.type != "keyup" || !inp)
        return;
    e.preventDefault();
    var name = inp.name;
    var key = lord.keyboardMap[e.which || e.keyCode || e.key];
    if (!key)
        return false;
    if (e.metaKey)
        key = "Meta+" + key;
    if (e.altKey)
        key = "Alt+" + key;
    if (e.shiftKey)
        key = "Shift+" + key;
    if (e.ctrlKey)
        key = "Ctrl+" + key;
    var hotkeys = lord.getLocalObject("hotkeys", {
        dir: {},
        rev: {}
    });
    inp.value = key;
    return false;
};

lord.editSpells = function() {
    var ta = lord.node("textarea");
    ta.rows = 10;
    ta.cols = 43;
    ta.value = lord.getLocalObject("spells", lord.DefaultSpells);
    lord.showDialog(ta).then(function(result) {
        if (!result)
            return Promise.resolve();
        var spells = ta.value;
        lord.setLocalObject("spells", spells);
        if (!lord.doWork || !lord.getLocalObject("spellsEnabled", true))
            return;
        return lord.doWork("parseSpells", spells);
    }).catch(lord.handleError);
};

lord.showHiddenPostList = function() {
    var model = lord.model(["base", "tr"]);
    model.hiddenPosts = lord.toArray(lord.getLocalObject("hiddenPosts", {}));
    var div = lord.template("hiddenPostList", model);
    return lord.showDialog(div, {
        title: "hiddenPostListText",
        buttons: ["close"]
    }).catch(lord.handleError);
};

lord.removeHidden = function(el) {
    var div = el.parentNode;
    div.parentNode.removeChild(div);
    var list = lord.getLocalObject("hiddenPosts", {});
    delete list[lord.data("boardName", div) + "/" + lord.data("postNumber", div)];
    lord.setLocalObject("hiddenPosts", list);
};

lord.createCodemirrorEditor = function(parent, mode, value) {
    return CodeMirror(parent, {
        mode: mode,
        indentUnit: 4,
        lineNumbers: true,
        autofocus: true,
        value: value
    });
};

lord.editUserCss = function() {
    var div = lord.node("div");
    var subdiv = lord.node("div");
    $(subdiv).width($(window).width() - 100).height($(window).height() - 150);
    div.appendChild(subdiv);
    var c = {};
    if (lord.getLocalObject("sourceHighlightingEnabled", false)) {
        c.editor = lord.createCodemirrorEditor(subdiv, "css", lord.getLocalObject("userCss", ""));
    } else {
        var ta = lord.node("textarea");
        ta.style = "box-sizing: border-box; width: 100%; height: 100%";
        ta.value = lord.getLocalObject("userCss", "");
        subdiv.appendChild(ta);
    }
    lord.showDialog(div, {
        afterShow: function() {
            if (c.editor)
                c.editor.refresh();
            $(".CodeMirror", subdiv).css("height", "100%");
        }
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        lord.setLocalObject("userCss", c.editor ? c.editor.getValue() : ta.value);
        return Promise.resolve();
    }).catch(lord.handleError);
};

lord.editUserJavaScript = function() {
    var div = lord.node("div");
    var subdiv = lord.node("div");
    $(subdiv).width($(window).width() - 100).height($(window).height() - 150);
    div.appendChild(subdiv);
    var c = {};
    if (lord.getLocalObject("sourceHighlightingEnabled", false)) {
        c.editor = lord.createCodemirrorEditor(subdiv, "javascript", lord.getLocalObject("userJavaScript", ""));
    } else {
        var ta = lord.node("textarea");
        ta.style = "box-sizing: border-box; width: 100%; height: 100%";
        ta.value = lord.getLocalObject("userJavaScript", "");
        subdiv.appendChild(ta);
    }
    lord.showDialog(div, {
        afterShow: function() {
            if (c.editor)
                c.editor.refresh();
            $(".CodeMirror", subdiv).css("height", "100%");
        }
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        lord.setLocalObject("userJavaScript", c.editor ? c.editor.getValue() : ta.value);
        return Promise.resolve();
    }).catch(lord.handleError);
};

lord.hotkey_showFavorites = function() {
    lord.showFavorites();
    return false;
};

lord.hotkey_showSettings = function() {
    lord.showSettings();
    return false;
};

lord.interceptHotkey = function(e) {
    if (!e || e.type != "keyup" || (e.target.tagName && !e.metaKey && !e.altKey && !e.ctrlKey
        && lord.contains(["TEXTAREA", "INPUT", "BUTTON"], e.target.tagName))) {
        return;
    }
    var hotkeys = lord.getLocalObject("hotkeys", {});
    var key = lord.keyboardMap[e.which || e.keyCode || e.key];
    if (!key)
        return;
    if (e.metaKey)
        key = "Meta+" + key;
    if (e.altKey)
        key = "Alt+" + key;
    if (e.shiftKey)
        key = "Shift+" + key;
    if (e.ctrlKey)
        key = "Ctrl+" + key;
    var name = hotkeys.rev ? (hotkeys.rev[key] || lord.DefaultHotkeys.rev[key]) : lord.DefaultHotkeys.rev[key];
    if (!name || !lord["hotkey_" + name])
        return;
    if (lord["hotkey_" + name]() !== false)
        return;
    e.preventDefault();
    return false;
};

lord.populateChatHistory = function(key) {
    var history = lord.nameOne("history", lord.chatDialog);
    $(history).empty();
    var model = lord.model("base");
    var settings = lord.settings();
    var timeOffset = ("local" == settings.time) ? +settings.timeZoneOffset : model.site.timeOffset;
    model.formattedDate = function(date) {
        return moment(date).utcOffset(timeOffset).locale(model.site.locale).format(model.site.dateFormat);
    };
    var messages = lord.getLocalObject("chats", {})[key] || [];
    messages = messages.map(function(message) {
        var m = merge.recursive(model, message);
        history.appendChild(lord.template("chatMessage", m));
    });
};

lord.updateChat = function(keys) {
    if (!lord.chatDialog) {
        lord.queryAll(".navbarItem > [name='chatButton']").forEach(function(a) {
            var img = lord.queryOne("img", a);
            if (img.src.replace("chat_message.gif", "") == img.src)
                img.src = img.src.replace("chat.png", "chat_message.gif");
        });
        var div = lord.node("div");
        var a = lord.node("a");
        var img = lord.node("img");
        $(img).addClass("buttonImage");
        img.src = "/" + lord.data("sitePathPrefix") + "img/chat_message.gif";
        a.title = lord.text("chatText");
        a.appendChild(img);
        var lastKey = lord.last(keys);
        a.onclick = lord.showChat.bind(lord, lastKey);
        div.appendChild(a);
        div.appendChild(lord.node("text", " " + lord.text("newChatMessageText") + " [" + lastKey + "]"));
        lord.showPopup(div, { type: "node" });
        if (lord.soundEnabled())
            lord.playSound();
    } else {
        keys.forEach(function(key) {
            var div = lord.nameOne(key, lord.chatDialog);
            if (div) {
                if ($(div).hasClass("selected")) {
                    lord.populateChatHistory(key);
                } else {
                    var newMessages = lord.queryOne(".chatContactNewMessages", div);
                    $(newMessages).empty();
                    newMessages.appendChild(lord.node("text", "!!!"));
                }
            } else {
                var contacts = lord.queryOne(".chatContactList", lord.chatDialog);
                var model = lord.model(["base", "tr"]);
                model.contact = { key: key };
                contacts.appendChild(lord.template("chatContact", model));
            }
        });
    }
};

lord.checkChats = function() {
    if (lord.checkChats.timer)
        clearTimeout(lord.checkChats.timer);
    lord.api("chatMessages", { lastRequestDate: lord.lastChatCheckDate || "" }).then(function(model) {
        if (!model)
            return Promise.resolve();
        lord.lastChatCheckDate = model.lastRequestDate;
        lord.setLocalObject("lastChatCheckDate", lord.lastChatCheckDate);
        var keys = [];
        var chats = lord.getLocalObject("chats", {});
        lord.each(model.chats, function(messages, key) {
            if (!chats[key])
                chats[key] = [];
            var list = chats[key];
            if (messages.length > 0)
                keys.push(key);
            messages.forEach(function(message) {
                for (var i = 0; i < list.length; ++i) {
                    var msg = list[i];
                    if (message.type == msg.type && message.date == msg.date && message.text == msg.text)
                        return;
                }
                list.push(message);
            });
        });
        lord.setLocalObject("chats", chats);
        if (keys.length > 0)
            lord.updateChat(keys);
        lord.checkChats.timer = setTimeout(lord.checkChats.bind(lord),
            lord.chatDialog ? (5 * lord.Second) : lord.Minute);
    }).catch(function(err) {
        lord.handleError(err);
        lord.checkChats.timer = setTimeout(lord.checkChats.bind(lord), lord.Minute);
    });
};

lord.showChat = function(key) {
    lord.queryAll(".navbarItem > [name='chatButton']").forEach(function(a) {
        var img = lord.queryOne("img", a);
        if (img.src.replace("chat_message.gif", "") != img.src)
            img.src = img.src.replace("chat_message.gif", "chat.png");
    });
    var model = lord.model(["base", "tr"]);
    model.contacts = [];
    lord.each(lord.getLocalObject("chats", {}), function(_, key) {
        model.contacts.push({ key: key });
    });
    lord.chatDialog = lord.template("chatDialog", model);
    lord.showDialog(lord.chatDialog, {
        title: "chatText",
        afterShow: function() {
            lord.checkChats();
            if (!key)
                return;
            lord.selectChatContact(key);
        },
        buttons: ["close"]
    }).then(function() {
        lord.chatDialog = null;
    }).catch(lord.handleError);
};

lord.selectChatContact = function(key) {
    if (!key|| !lord.chatDialog)
        return;
    var div = lord.nameOne(key, lord.chatDialog);
    if (!div)
        return;
    var newMessages = lord.queryOne(".chatContactNewMessages", div);
    $(newMessages).empty();
    var contactList = lord.queryOne(".chatContactList", lord.chatDialog);
    var previous = lord.queryOne(".chatContact.selected", contactList);
    if (previous)
        $(previous).removeClass("selected");
    $(div).addClass("selected");
    lord.populateChatHistory(key);
    lord.nameOne("sendMessageButton", lord.chatDialog).disabled = false;
    lord.nameOne("message", lord.chatDialog).disabled = false;
};

lord.deleteChat = function(key) {
    if (!key)
        return;
    if (key.tagName) {
        key = lord.queryOne(".chatContact.selected", lord.chatDialog);
        if (key)
            key = $(key).attr("name");
    }
    if (!key)
        return;
    var formData = new FormData();
    formData.append("boardName", key.split(":").shift());
    formData.append("postNumber", +key.split(":").pop());
    return lord.post("/" + lord.data("sitePathPrefix") + "action/deleteChatMessages", formData).then(function(result) {
        var chats = lord.getLocalObject("chats", {});
        delete chats[key];
        lord.setLocalObject("chats", chats);
        if (!lord.chatDialog)
            return Promise.resolve();
        var contact = lord.nameOne(key, lord.chatDialog);
        if (!contact)
            return Promise.resolve();
        if ($(contact).hasClass("selected")) {
            $(lord.nameOne("targetKey", lord.chatDialog)).empty();
            $(lord.nameOne("history", lord.chatDialog)).empty();
            lord.nameOne("sendMessageButton", lord.chatDialog).disabled = true;
            lord.nameOne("message", lord.chatDialog).disabled = true;
        }
        contact.parentNode.removeChild(contact);
    }).catch(lord.handleError);
};

lord.sendChatMessage = function() {
    var contact = lord.queryOne(".chatContact.selected", lord.chatDialog);
    if (!contact)
        return;
    var message = lord.nameOne("message", lord.chatDialog);
    var formData = new FormData();
    var key = $(contact).attr("name");
    formData.append("text", message.value);
    formData.append("boardName", key.split(":").shift());
    formData.append("postNumber", +key.split(":").pop());
    return lord.post("/" + lord.data("sitePathPrefix") + "action/sendChatMessage", formData).then(function(result) {
        message.value = "";
        $(message).focus();
        lord.checkChats();
    }).catch(lord.handleError);
};

lord.checkNotificationQueue = function() {
    var f = function() {
        setTimeout(function() {
            lord.checkNotificationQueue();
        }, lord.Second);
    };
    if (lord.notificationQueue.length <= 0)
        return f();
    var notification = lord.notificationQueue.shift();
    for (var i = lord.notificationQueue.length - 1; i >= 0; --i) {
        if (notification.key == lord.notificationQueue[i].key)
            notification = lord.notificationQueue.splice(i, 1)[0];
    }
    lord.api("post", {
        boardName: notification.boardName,
        postNumber: notification.postNumber
    }).then(function(post) {
        var sitePathPrefix = lord.data("sitePathPrefix");
        var icon = "/" + sitePathPrefix;
        if (post && post.fileInfos && post.fileInfos.length > 0)
            icon += notification.boardName + "/thumb/" + post.fileInfos[0].thumb.name;
        else
            icon += "favicon.ico";
        var text = "[" + notification.boardName + "/" + notification.threadNumber + "]";
        if (post && post.subject || post.rawText)
            text += " " + (post.subject || post.rawText);
        lord.showNotification("favoriteThreadsText", text.substr(0, 300), icon);
        f();
    }).catch(function(err) {
        lord.handleError(err);
        f();
    });
};

lord.showVideoThumb = function(e, a) {
    if (a.img) {
        document.body.appendChild(a.img);
        return;
    }
    var thumbUrl = lord.data("thumbUrl", a, true);
    var thumbWidth = +lord.data("thumbWidth", a, true);
    var thumbHeight = +lord.data("thumbHeight", a, true);
    if (!thumbUrl)
        return;
    a.img = lord.node("img");
    a.img.width = thumbWidth;
    a.img.height = thumbHeight;
    a.img.src = thumbUrl;
    $(a.img).addClass("movableImage");
    a.img.style.left = (e.clientX + 30) + "px";
    a.img.style.top = (e.clientY - 10) + "px";
    document.body.appendChild(a.img);
};

lord.moveVideoThumb = function(e, a) {
    if (!a.img)
        return;
    a.img.style.left = (e.clientX + 30) + "px";
    a.img.style.top = (e.clientY - 10) + "px";
};

lord.hideVideoThumb = function(e, a) {
    if (!a.img)
        return;
    document.body.removeChild(a.img);
};

lord.expandCollapseYoutubeVideo = function(a) {
    var videoId = lord.data("videoId", a, true);
    if (!videoId)
        return;
    var blockquote = $(a).closest("blockquote");
    if (a.lordExpanded) {
        a.parentNode.removeChild(a.nextSibling);
        a.parentNode.removeChild(a.nextSibling);
        a.replaceChild(lord.node("text", "[" + lord.text("expandVideoText") + "]"), a.childNodes[0]);
        if (blockquote[0]) {
            --blockquote[0]._expand;
            if (blockquote[0]._expand <= 0)
                blockquote.removeClass("expand");
        }
    } else {
        if (blockquote[0]) {
            if (!blockquote[0]._expand)
                blockquote[0]._expand = 1;
            else
                ++blockquote[0]._expand;
            blockquote.addClass("expand");
        }
        var iframe = lord.node("iframe");
        var start = +lord.data("start", a, true);
        if (isNaN(start) || start <= 0)
            start = 0;
        iframe.src = "https://youtube.com/embed/" + videoId + "?autoplay=1&start=" + start;
        iframe.allowfullscreen = true;
        iframe.frameborder = "0px";
        iframe.height = "360";
        iframe.width = "640";
        iframe.display = "block";
        var parent = a.parentNode;
        var el = a.nextSibling;
        if (el) {
            parent.insertBefore(lord.node("br"), el);
            parent.insertBefore(iframe, el);
        } else {
            parent.appendChild(lord.node("br"));
            parent.appendChild(iframe);
        }
        a.replaceChild(lord.node("text", "[" + lord.text("collapseVideoText") + "]"), a.childNodes[0]);
    }
    a.lordExpanded = !a.lordExpanded;
};

lord.expandCollapseCoubVideo = function(a) {
    var videoId = lord.data("videoId", a, true);
    if (!videoId)
        return;
    var blockquote = $(a).closest("blockquote");
    if (a.lordExpanded) {
        a.parentNode.removeChild(a.nextSibling);
        a.parentNode.removeChild(a.nextSibling);
        a.replaceChild(lord.node("text", "[" + lord.text("expandVideoText") + "]"), a.childNodes[0]);
        --blockquote._expand;
        if (blockquote._expand <= 0)
            blockquote.removeClass("expand");
    } else {
        if (!blockquote._expand)
            blockquote._expand = 1;
        else
            ++blockquote._expand;
        blockquote.addClass("expand");
        var iframe = lord.node("iframe");
        iframe.src = "https://coub.com/embed/" + videoId
            + "?muted=false&autostart=false&originalSize=false&hideTopBar=false&startWithHD=false";
        iframe.allowfullscreen = true;
        iframe.frameborder = "0px";
        iframe.height = "360";
        iframe.width = "480";
        iframe.display = "block";
        var parent = a.parentNode;
        var el = a.nextSibling;
        if (el) {
            parent.insertBefore(lord.node("br"), el);
            parent.insertBefore(iframe, el);
        } else {
            parent.appendChild(lord.node("br"));
            parent.appendChild(iframe);
        }
        a.replaceChild(lord.node("text", "[" + lord.text("collapseVideoText") + "]"), a.childNodes[0]);
    }
    a.lordExpanded = !a.lordExpanded;
};

lord.hashChangeHandler = function() {
    var target = $(":target");
    if (!target || !target[0])
        return;
    var offset = target.offset();
    var scrollto = offset.top - $(".toolbar.sticky").height() - 4;
    $("html, body").animate({ scrollTop: scrollto }, 0);
};

lord.setTooltips = function(parent) {
    $(".codeBlock, .tooltip, .flag, .postFileSize", parent).css("cursor", "pointer").click(function(e) {
        var _this = $(this);
        _this.tooltip({
            position: {
                using: function() {
                    var pos = _this.position();
                    $(this).css({
                        position: "absolute",
                        left: Math.max(e.pageX - 100, 5) + "px",
                        top: (e.pageY + 15) + "px",
                        width: "200px"
                    });
                },
                collision: "fit flip"
            },
            disabled: true,
            close: function() {
                $(this).tooltip("disable");
            }
        }).tooltip("enable").tooltip("open");
        setTimeout(function() {
            _this.tooltip("close");
        }, 15 * lord.Second);
    });
};

lord.initializeOnLoadBase = function() {
    lord.hashChangeHandler(lord.hash());
    lord.series(lord.pageProcessors, function(f) {
        return f();
    }).catch(lord.handleError);
    if (lord.getLocalObject("mumWatching", false)) {
        var img = lord.queryOne("[name='switchMumWatchingButton'] > img");
        img.src = "/" + lord.data("sitePathPrefix") + "img/hide.png";
    }
    var settings = lord.settings();
    var model = lord.model(["base", "tr", "boards"]);
    if (lord.data("boardName"))
        model.board = lord.model("board/" + lord.data("boardName")).board;
    model.settings = settings;
    model.compareRegisteredUserLevels = lord.compareRegisteredUserLevels;
    if (lord.getLocalObject("hotkeysEnabled", true) && !lord.deviceType("mobile")) {
        document.body.addEventListener("keyup", lord.interceptHotkey, false);
        var hotkeys = lord.getLocalObject("hotkeys", {}).dir;
        var key = function(name) {
            if (!hotkeys)
                return lord.DefaultHotkeys.dir[name];
            return hotkeys[name] || lord.DefaultHotkeys.dir[name];
        };
        var settingsButton = lord.queryOne("[name='settingsButton']");
        var favoritesButton = lord.queryOne("[name='favoritesButton']");
        if (settingsButton)
            settingsButton.title += " (" + key("showSettings") + ")";
        if (favoritesButton)
            favoritesButton.title += " (" + key("showFavorites") + ")";
    }
    $(".searchAction > form").hover(function() {
        $(".searchActionSelect", this).removeClass("hiddenElement");
        $(".searchActionInput", this).css("width", "60%");
    });
    if (lord.getLocalObject("showNewPosts", true))
        lord.showNewPosts();
    if (lord.getLocalObject("chatEnabled", true))
        lord.checkChats();
    if (lord.notificationsEnabled())
        lord.checkNotificationQueue();
    if (lord.queryOne(".toolbar.sticky"))
        window.addEventListener("hashchange", lord.hashChangeHandler, false);
    var bsc = lord.getLocalObject("tooltips/boardSelect", 0);
    if (lord.deviceType("mobile"))
        lord.setTooltips();
    if (lord.deviceType("mobile") && bsc < 5) {
        lord.setLocalObject("tooltips/boardSelect", bsc + 1);
        var bs = $(lord.queryOne(".boardSelectContainer > select"));
        bs.tooltip({
            position: {
                using: function() {
                    var pos = bs.position();
                    $(this).css({
                        position: "absolute",
                        left: Math.floor(pos.left + bs.width() / 2 - 100) + "px",
                        top: Math.floor(pos.top + bs.height() + 15) + "px",
                        width: "200px"
                    });
                }
            }
        });
        setTimeout(function() {
            bs.tooltip("open");
            setTimeout(function() {
                bs.tooltip("close");
            }, 10 * lord.Second);
        }, 3 * lord.Second);
    }
    var defVol = lord.getLocalObject("defaultAudioVideoVolume", 100) / 100;
    $("#playerVolumeSlider").slider({
        min: 0,
        max: 1,
        step: 0.01,
        value: lord.getLocalObject("playerVolume", defVol),
        slide: function() {
            var volume = +$(this).slider("value");
            if (lord.playerElement)
                lord.playerElement.volume = volume;
            else
                lord.setLocalObject("playerVolume", volume);
        }
    });
    $("#playerDurationSlider").slider({
        min: 0,
        max: 0,
        step: 0,
        value: 0,
        disabled: true
    });
    if (lord.id("player"))
        lord.checkPlaylist();
    if (lord.queryOne(".track", lord.id("playerTracks")) && lord.getSessionObject("playerPlaying", false))
        lord.playerPlayPause(null, lord.getSessionObject("playerCurrentTime", 0));
    var w = $(window);
    w.resize(function() {
        var n = {
            width: w.width(),
            height: w.height()
        };
        if (n.height != lord.lastWindowSize.height && !$("#player").hasClass("minimized"))
            lord.updatePlayerTracksHeight();
        if (n.width != lord.lastWindowSize.width) {
            $(".postBody").css("maxWidth", (n.width - 30) + "px");
            if (lord.getLocalObject("stickyToolbar", true))
                $(document.body).css("padding-top", $(".toolbar.sticky").height() + "px");
        }
        lord.lastWindowSize = n;
    });
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    if (/\/(frame|login).html$/.test(window.location.pathname))
        return;
    lord.initializeOnLoadBase();
    lord.checkFavoriteThreads();
}, false);

window.addEventListener("beforeunload", function unload() {
    window.removeEventListener("beforeunload", unload, false);
    lord.unloading = true;
}, false);
