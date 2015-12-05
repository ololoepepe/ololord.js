/*ololord global object*/

var lord = lord || {};

/*Classes*/

/*constructor*/ lord.AutoUpdateTimer = function(intervalSeconds) {
    this.intervalSeconds = intervalSeconds;
    this.updateTimer = null;
    this.countdownTimer = null;
    this.secondsLeft = 0;
};

/*private*/ lord.AutoUpdateTimer.prototype.createCountdownTimer = function() {
    this.secondsLeft = this.intervalSeconds;
    this.countdownTimer = setInterval((function() {
        this.secondsLeft -= 1;
        if (this.secondsLeft <= 0)
            this.secondsLeft = this.intervalSeconds;
        var _this = this;
        ["Top", "Bottom"].forEach(function(position) {
            $("#autoUpdate" + position).trigger("configure", { max: _this.intervalSeconds });
            $("#autoUpdate" + position).val(_this.intervalSeconds).trigger("change");
        });
        this.update();
    }).bind(this), lord.Second);
};

/*private*/ lord.AutoUpdateTimer.prototype.update = function() {
    if (this.secondsLeft <= 0)
        return;
    var _this = this;
    ["Top", "Bottom"].forEach(function(position) {
        $("#autoUpdate" + position).val(_this.secondsLeft).trigger("change");
    });
};

/*public*/ lord.AutoUpdateTimer.prototype.start = function() {
    if (this.updateTimer)
        return;
    this.updateTimer = setInterval((function() {
        var boardName = lord.data("boardName");
        var threadNumber = +lord.data("threadNumber");
        lord.updateThread(true);
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.createCountdownTimer();
        }
        this.update();
    }).bind(this), this.intervalSeconds * lord.Second);
    this.createCountdownTimer();
    this.update();
};

/*public*/ lord.AutoUpdateTimer.prototype.stop = function() {
    if (!this.updateTimer)
        return;
    clearInterval(this.updateTimer);
    this.updateTimer = null;
    if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
    }
    this.secondsLeft = 0;
    this.update();
};

/*Variables*/

lord.autoUpdateTimer = null;
lord.blinkTimer = null;
lord.pageVisible = "visible";
lord.loadingImage = null;

/*Functions*/

lord.addVisibilityChangeListener = function(callback) {
    if ("hidden" in document)
        document.addEventListener("visibilitychange", callback);
    else if ((hidden = "mozHidden") in document)
        document.addEventListener("mozvisibilitychange", callback);
    else if ((hidden = "webkitHidden") in document)
        document.addEventListener("webkitvisibilitychange", callback);
    else if ((hidden = "msHidden") in document)
        document.addEventListener("msvisibilitychange", callback);
    else if ("onfocusin" in document) //IE 9 and lower
        document.onfocusin = document.onfocusout = callback;
    else //All others
        window.onpageshow = window.onpagehide = window.onfocus = window.onblur = callback;
    if (document["hidden"] !== undefined) {
        callback({
            "type": document["hidden"] ? "blur" : "focus"
        });
    }
};

lord.visibilityChangeListener = function(e) {
    var v = "visible";
    var h = "hidden";
    var eMap = {
        "focus": v,
        "focusin": v,
        "pageshow": v,
        "blur": h,
        "focusout": h,
        "pagehide": h
    };
    e = e || window.event;
    if (e.type in eMap)
        lord.pageVisible = eMap[e.type];
    else
        lord.pageVisible = this["hidden"] ? "hidden" : "visible";
    if ("hidden" == lord.pageVisible)
        return;
    if (!lord.blinkTimer)
        return;
    clearInterval(lord.blinkTimer);
    lord.blinkTimer = null;
    var link = lord.id("favicon");
    var finame = link.href.split("/").pop();
    if ("favicon.ico" != finame)
        link.href = link.href.replace("favicon_newmessage.ico", "favicon.ico");
    if (document.title.substring(0, 2) == "* ")
        document.title = document.title.substring(2);
};

lord.blinkFaviconNewMessage = function() {
    var link = lord.id("favicon");
    var finame = link.href.split("/").pop();
    if ("favicon.ico" == finame)
        link.href = link.href.replace("favicon.ico", "favicon_newmessage.ico");
    else
        link.href = link.href.replace("favicon_newmessage.ico", "favicon.ico");
};

lord.updateThread = function(silent) {
    var boardName = lord.data("boardName");
    var threadNumber = +lord.data("threadNumber");
    var posts = lord.query(".opPost:not(.temporary), .post:not(.temporary)");
    if (!posts)
        return;
    var lastPost = posts[posts.length - 1];
    var lastPostNumber = +lord.data("number", lastPost);
    var popup;
    var c = {};
    if (!silent)
        popup = lord.showLoadingPostsPopup();
    return lord.api("threadLastPostNumber", {
        boardName: lord.data("boardName"),
        threadNumber: threadNumber
    }).then(function(newLastPostNumber) {
        if (!newLastPostNumber)
            return Promise.reject("Thre thread was deleted");
        c.newLastPostNumber = newLastPostNumber;
        if (c.newLastPostNumber <= lastPostNumber)
            return Promise.resolve({ thread: { lastPosts: [] } });
        return lord.api(threadNumber, {}, lord.data("boardName") + "/res");
    }).then(function(model) {
        if (!model)
            return Promise.reject("Thre thread was deleted");
        var posts = model.thread.lastPosts.filter(function(post) {
            return post.number > lastPostNumber;
        });
        if (popup) {
            var txt = (posts.length >= 1) ? lord.text("newPostsText") : lord.text("noNewPostsText");
            if (posts.length >= 1)
                txt += " " + posts.length;
            popup.resetText(txt);
            popup.resetTimeout();
        }
        if (posts.length < 1)
            return Promise.resolve();
        c.posts = posts;
        return lord.api("threadInfo", {
            boardName: boardName,
            threadNumber: threadNumber
        });
    }).then(function(threadInfo) {
        if (!c.posts)
            return Promise.resolve();
        c.threadInfo = threadInfo;
        c.sequenceNumber = c.posts[c.posts.length - 1].sequenceNumber;
        var promises = c.posts.map(function(post) {
            return lord.createPostNode(post, true, c.threadInfo);
        });
        return Promise.all(promises);
    }).then(function(posts) {
        if (!posts || !posts.length || posts.length < 1)
            return Promise.resolve();
        var before = lord.id("afterAllPosts");
        posts.forEach(function(post) {
            if (lord.id(post.id))
                return;
            lord.addClass(post, "newPost");
            post.onmouseover = function() {
                post.onmouseover = undefined;
                lord.removeClass(post, "newPost");
            };
            document.body.insertBefore(post, before);
        });
        var board = lord.model("board/" + boardName).board;
        var bumpLimitReached = c.sequenceNumber >= board.bumpLimit;
        var postLimitReached = c.sequenceNumber >= board.postLimit;
        if (postLimitReached) {
            var pl = lord.nameOne("insteadOfPostLimitReached");
            if (pl) {
                var div = lord.node("div");
                div.className = "theMessage";
                var h2 = lord.node("h2");
                h2.className = "postLimitReached";
                h2.appendChild(lord.node("text", lord.text("postLimitReachedText")));
                div.appendChild(h2);
                pl.parentNode.replaceChild(div, pl);
            }
            var bl = lord.nameOne("insteadOfBumpLimitReached");
            if (bl)
                bl.parentNode.removeChild(bl);
            bl = lord.nameOne("bumpLimitReached");
            if (bl)
                bl.parentNode.removeChild(bl);
            lord.query(".createAction").forEach(function(act) {
                act.parentNode.removeChild(act);
            });
        }
        if (!postLimitReached && bumpLimitReached) {
            var bl = lord.nameOne("insteadOfBumpLimitReached");
            if (bl) {
                var div = lord.node("div");
                div.className = "theMessage";
                div.setAttribute("name", "bumpLimitReached");
                var h3 = lord.node("h3");
                h3.className = "bumpLimitReached";
                h3.appendChild(lord.node("text", lord.text("bumpLimitReachedText")));
                div.appendChild(h3);
                bl.parentNode.replaceChild(div, bl);
            }
        }
        if ("hidden" == lord.pageVisible) {
            if (!lord.blinkTimer) {
                lord.blinkTimer = setInterval(lord.blinkFaviconNewMessage, 500);
                document.title = "* " + document.title;
            }
            if (lord.notificationsEnabled()) {
                var subject = lord.queryOne(".theTitle > h1").textContent;
                var title = "[" + subject + "] " + lord.text("newPostsText") + " " + c.posts.length;
                var sitePathPrefix = lord.data("sitePathPrefix");
                var icon = "/" + sitePathPrefix + "favicon.ico";
                var p = c.posts[0];
                if (p && p.fileInfos.length > 0)
                    icon = "/" + sitePathPrefix + boardName + "/thumb/" + p.fileInfos[0].thumb.name;
                lord.showNotification(title, (p.rawText || (boardName + "/" + p.number)).substr(0, 300), icon);
            }
        }
    }).catch(function(err) {
        if (popup)
            popup.hide();
        lord.handleError(err);
    });
};

lord.setAutoUpdateEnabled = function(enabled) {
    if (enabled) {
        var intervalSeconds = lord.getLocalObject("autoUpdateInterval", 15);
        lord.autoUpdateTimer = new lord.AutoUpdateTimer(intervalSeconds);
        lord.autoUpdateTimer.start();
    } else if (lord.autoUpdateTimer) {
        lord.autoUpdateTimer.stop();
        lord.autoUpdateTimer = null;
    }
    var list = lord.getLocalObject("autoUpdate", {});
    var threadNumber = +lord.data("threadNumber");
    list[threadNumber] = enabled;
    lord.setLocalObject("autoUpdate", list);
};

lord.downloadThread = function() {
    var as = lord.query(".postFile > .postFileFile > a");
    if (!as || as.length < 1)
        return;
    var cancel = false;
    var zip = new JSZip();
    var progressBar = new lord.OverlayProgressBar({
        max: as.length,
        cancelCallback: function() {
            cancel = true;
        },
        finishCallback: function() {
            progressBar.hide();
            saveAs(zip.generate({ "type": "blob" }), document.title + ".zip");
        }
    });
    var last = 0;
    var append = function(i) {
        if (cancel) {
            progressBar.hide();
            return;
        }
        var a = as[i];
        JSZipUtils.getBinaryContent(a.href, function (err, data) {
            if (!err) {
                zip.file(a.href.split("/").pop(), data, {
                    "binary": true
                });
            }
            progressBar.progress(progressBar.value + 1);
            if (last < as.length - 1)
                append(++last);
        });
    };
    progressBar.show();
    append(last);
    if (as.length > 1)
        append(++last);
};

lord.initializeOnLoadThread = function() {
    lord.addVisibilityChangeListener(lord.visibilityChangeListener);
    var enabled = lord.getLocalObject("autoUpdate", {})[+lord.data("threadNumber")];
    if (true === enabled || (false !== enabled && lord.getLocalObject("autoUpdateThreadsByDefault", false)))
        lord.setAutoUpdateEnabled(true);
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.initializeOnLoadThread();
}, false);
