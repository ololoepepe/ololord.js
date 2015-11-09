/*ololord global object*/

var lord = lord || {};

/*Constants*/

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

/*Functions*/

lord.availableBoards = function() {
    if (lord.availableBoards._boards)
        return lord.availableBoards._boards;
    lord.availableBoards._boards = {};
    lord.arr(lord.text("availableBoards").split(";")).forEach(function(brd) {
        lord.availableBoards._boards[brd.split("|").shift()] = brd.split("|").pop();
    });
    return lord.availableBoards._boards;
};

lord.changeLocale = function() {
    var sel = lord.id("localeChangeSelect");
    var ln = sel.options[sel.selectedIndex].value;
    lord.setCookie("locale", ln, {
        "expires": lord.Billion, "path": "/"
    });
    lord.reloadPage();
};

lord.doLogout = function(event, form) {
    event.preventDefault();
    lord.setCookie("hashpass", "", {
        expires: lord.Billion,
        path: "/"
    });
    window.location = lord.nameOne("source", form).value;
};

lord.switchShowLogin = function() {
    var inp = lord.id("loginInput");
    if (inp.type === "password")
        inp.type = "text";
    else if (inp.type === "text")
        inp.type = "password";
};

lord.searchKeyPress = function(e) {
    e = e || window.event;
    if (e.keyCode != 13)
        return;
    lord.doSearch();
};

lord.preventOnclick = function(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    return false;
};

lord.showSettings = function() {
    var c = {};
    lord.getTemplate("settingsDialog").then(function(template) {
        c.template = template;
        c.model = {
            settings: lord.settings()
        };
        return lord.getModel(["misc/tr", "misc/base", "misc/board" + lord.data("boardName"), "misc/boards"], true);
    }).then(function(model) {
        c.model = merge.recursive(c.model, model);
        c.div = $.parseHTML(c.template(c.model))[0];
        return lord.showDialog("settingsDialogTitle", null, c.div);
    }).then(function(accepted) {
        if (!accepted)
            return;
        var model = {};
        model.hiddenBoards = [];
        lord.query("input, select", c.div).forEach(function(el) {
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
    });
};

lord.showFavorites = function() {
    var div = lord.id("favorites");
    if (div)
        return;
    div = lord.node("div");
    div.id = "favorites";
    lord.addClass(div, "favorites");
    var h = lord.node("h1");
    h.appendChild(lord.node("text", lord.text("favoriteThreadsText")));
    div.appendChild(h);
    var fav = lord.getLocalObject("favoriteThreads", {});
    var span = lord.node("span");
    var clBtn = lord.node("button");
    clBtn.appendChild(lord.node("text", lord.text("closeButtonText")));
    clBtn.onclick = function() {
        fav = lord.getLocalObject("favoriteThreads", {});
        lord.forIn(fav, function(o, x) {
            o.previousLastPostNumber = o.lastPostNumber;
            fav[x] = o;
        });
        lord.setLocalObject("favoriteThreads", fav);
        document.body.removeChild(div);
    };
    span.appendChild(clBtn);
    div.appendChild(span);
    var sitePathPrefix = lord.text("sitePathPrefix");
    var f = function(res, x) {
        var postDiv = lord.node("div");
        postDiv.id = "favorite/" + x;
        var a = lord.node("a");
        var boardName = x.split("/").shift();
        var threadNumber = x.split("/").pop();
        a.href = "/" + sitePathPrefix + boardName + "/thread/" + threadNumber + ".html";
        var txt = "";
        var fav = lord.getLocalObject("favoriteThreads", {});
        if (typeof res != "string") {
            txt = (res["subject"] ? res["subject"] : res["text"]).substring(0, 150);
            fav[x].subject = txt;
            lord.setLocalObject("favoriteThreads", fav);
        } else {
            txt = fav[x].subject ? fav[x].subject : ("[" + res + "]");
        }
        a.appendChild(lord.node("text", "[" + x + "] " + txt.substring(0, 50)));
        a.title = txt;
        a.target = "_blank";
        postDiv.appendChild(a);
        postDiv.appendChild(lord.node("text", " "));
        var fnt = lord.node("font");
        fnt.color = "green";
        postDiv.appendChild(fnt);
        div.insertBefore(postDiv, span);
        var p = fav[x];
        if (p["lastPostNumber"] > p["previousLastPostNumber"]) {
            fnt.appendChild(lord.node("text", "+" + (p["lastPostNumber"] - p["previousLastPostNumber"])));
        }
        var rmBtn = lord.node("a");
        rmBtn.onclick = function() {
            postDiv.parentNode.removeChild(postDiv);
            lord.removeThreadFromFavorites(x.split("/")[0], x.split("/")[1]);
        };
        rmBtn.title = lord.text("removeFromFavoritesText");
        var img = lord.node("img");
        img.src = "/" + sitePathPrefix + "img/delete.png";
        rmBtn.appendChild(img);
        postDiv.appendChild(rmBtn);
    };
    lord.forIn(fav, function(_, x) {
        var boardName = x.split("/").shift();
        var threadNumber = x.split("/").pop();
        lord.ajaxRequest("get_post", [boardName, +threadNumber], lord.RpcGetPostId, function(res) {
            f(res, x);
        }, function(err) {
            f(err, x);
        });
    });
    document.body.appendChild(div);
    lord.toCenter(div, null, null, 1);
};

lord.switchMumWatching = function() {
    var watching = lord.getLocalObject("mumWatching", false);
    var img = lord.queryOne("[name='switchMumWatchingButton'] > img");
    img.src = "/" + lord.text("sitePathPrefix") + "img/mum" + (watching ? "_not" : "") + "_watching.png";
    lord.query(".postFileFile > a > img").forEach(function(img) {
        if (watching)
            lord.removeClass(img, "mumWatching");
        else
            lord.addClass(img, "mumWatching");
    });
    lord.setLocalObject("mumWatching", !watching);
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
};

lord.removeThreadFromFavorites = function(boardName, threadNumber) {
    threadNumber = +threadNumber;
    if (!boardName || isNaN(threadNumber))
        return false;
    var fav = lord.getLocalObject("favoriteThreads", {});
    delete fav[boardName + "/" + threadNumber];
    lord.setLocalObject("favoriteThreads", fav);
    var opPost = lord.id("post" + threadNumber);
    if (!opPost)
        return false;
    var btn = lord.nameOne("addToFavoritesButton", opPost);
    var img = lord.queryOne("img", btn);
    img.src = img.src.replace("favorite_active.png", "favorite.png");
    img.title = lord.text("addThreadToFavoritesText");
    btn.onclick = lord.addThreadToFavorites.bind(lord, boardName, threadNumber);
    return false;
};

lord.checkFavoriteThreads = function() {
    var fav = lord.getLocalObject("favoriteThreads", {});
    var nfav = {};
    lord.forIn(fav, function(o, x) {
        var boardName = x.split("/").shift();
        var threadNumber = x.split("/").pop();
        lord.ajaxRequest("get_new_posts", [boardName, +threadNumber, o.lastPostNumber], lord.RpcGetNewPostsId, function(res) {
            if (!res || res.length < 1)
                return;
            o.lastPostNumber = res[res.length - 1]["number"];
            nfav[x] = o;
        });
    });
    if (lord.notificationsEnabled() && lord.hasOwnProperties(nfav)) {
        var title = lord.text("favoriteThreadsText");
        var sitePathPrefix = lord.text("sitePathPrefix");
        var icon = "/" + sitePathPrefix + "favicon.ico";
        var text = "";
        lord.forIn(nfav, function(v, k) {
            text += k + ", ";
        });
        text = text.substr(0, text.length - 2);
        lord.showNotification(title, text.substr(0, 300), icon);
    }
    setTimeout(function() {
        fav = lord.getLocalObject("favoriteThreads", {});
        lord.forIn(nfav, function(o, x) {
            fav[x].lastPostNumber = o.lastPostNumber;
        });
        lord.setLocalObject("favoriteThreads", fav);
        var div = lord.id("favorites");
        if (div) {
            lord.forIn(fav, function(o, x) {
                var postDiv = lord.id("favorite/" + x);
                var fnt = lord.queryOne("font", postDiv);
                if (fnt.childNodes.length > 0)
                    fnt.removeChild(fnt.childNodes[0]);
                if (o.lastPostNumber > o.previousLastPostNumber)
                    fnt.appendChild(lord.node("text", "+" + (o.lastPostNumber - o.previousLastPostNumber)));
            });
        } else {
            var threadNumber = lord.text("currentThreadNumber");
            lord.forIn(fav, function(o, x) {
                if (o.lastPostNumber > o.previousLastPostNumber) {
                    if (threadNumber && x.split("/").pop() == threadNumber)
                        return;
                    lord.showFavorites();
                }
            });
        }
        setTimeout(lord.checkFavoriteThreads, 15 * lord.Second);
    }, 5 * lord.Second);
};

lord.showNewPosts = function() {
    var lastPostNumbers = lord.getLocalObject("lastPostNumbers", {});
    var currentBoardName = lord.data("boardName");
    $.ajax("/" + lord.data("sitePathPrefix") + "api/lastPostNumbers.json").then(function(result) {
        if (result.errorMessage)
            return Promise.reject(ersult.errorMessage);
        lastPostNumbers[currentBoardName]
        lord.query(".navbar, .toolbar").forEach(function(navbar) {
            lord.query(".navbarItem", navbar).forEach(function(item) {
                var a = lord.queryOne("a", item);
                if (!a)
                    return;
                var boardName = lord.data("boardName", a);
                if (!boardName || currentBoardName == boardName || !result[boardName])
                    return;
                var lastPostNumber = lastPostNumbers[boardName];
                if (!lastPostNumber)
                    lastPostNumber = 0;
                var newPostCount = result[boardName] - lastPostNumber;
                if (newPostCount <= 0)
                    return;
                var span = lord.node("span");
                lord.addClass(span, "newPostCount");
                span.appendChild(lord.node("text", "+" + newPostCount));
                var parent = a.parentNode;
                parent.insertBefore(span, a);
                parent.insertBefore(lord.node("text", " "), a);
            });
        });
        if (typeof result[currentBoardName] == "number") {
            lastPostNumbers[currentBoardName] = result[currentBoardName];
            lord.setLocalObject("lastPostNumbers", lastPostNumbers);
        }
    });
};

lord.editHotkeys = function() {
    var table = lord.id("hotkeysDialogTemplate").cloneNode(true);
    table.id = "";
    table.style.display = "";
    var hotkeys = lord.getLocalObject("hotkeys", {});
    if (!hotkeys.dir)
        hotkeys.dir = {};
    if (!hotkeys.rev)
        hotkeys.rev = {};
    lord.forIn(lord.DefaultHotkeys.dir, function(key, name) {
        lord.nameOne(name, table).value = hotkeys.dir[name] || key;
    });
    lord.showDialog(null, null, table, function() {
        lord.forIn(lord.DefaultHotkeys.dir, function(key, name) {
            key = lord.nameOne(name, table).value || key;
            hotkeys.dir[name] = key;
            hotkeys.rev[key] = name;
        });
        lord.setLocalObject("hotkeys", hotkeys);
    });
};

lord.assignHotkey = function(e, inp) {
    if (!e || e.type != "keypress" || !inp)
        return;
    var name = inp.name;
    var key = e.key;
    if (key.length == 1)
        key = key.toUpperCase();
    if (e.metaKey)
        key = "Meta+" + key;
    if (e.altKey)
        key = "Alt+" + key;
    if (e.shiftKey)
        key = "Shift+" + key;
    if (e.ctrlKey)
        key = "Ctrl+" + key;
    var hotkeys = lord.getLocalObject("hotkeys", {});
    if (!hotkeys.dir)
        hotkeys.dir = {};
    if (!hotkeys.rev)
        hotkeys.rev = {};
    var curr = hotkeys.dir[name];
    if (curr)
        delete hotkeys.rev[curr];
    hotkeys.dir[name] = key;
    hotkeys.rev[key] = name;
    inp.value = key;
    e.preventDefault();
    return false;
};

lord.editSpells = function() {
    var ta = lord.node("textarea");
    ta.rows = 10;
    ta.cols = 43;
    ta.value = lord.getLocalObject("spells", lord.DefaultSpells);
    lord.showDialog(null, null, ta, function() {
        lord.setLocalObject("spells", ta.value);
        if (!lord.worker || !lord.getLocalObject("spellsEnabled", true))
            return;
        lord.worker.postMessage({
            "type": "parseSpells",
            "data": lord.getLocalObject("spells", lord.DefaultSpells)
        });
    });
};

lord.showHiddenPostList = function() {
    var title = lord.text("hiddenPostListText");
    var div = lord.node("div");
    lord.addClass(div, "hiddenPostList");
    var list = lord.getLocalObject("hiddenPosts", {});
    var sitePathPrefix = lord.text("sitePathPrefix");
    var f = function(res, x) {
        var postDiv = lord.node("div");
        lord.addClass(postDiv, "nowrap");
        postDiv.id = "hidden/" + x;
        var boardName = x.split("/").shift();
        var postNumber = x.split("/").pop();
        var txt = "[" + x + "]";
        if (typeof res != "string") {
            txt = (res["subject"] ? res["subject"] : res["text"]).substring(0, 150);
            list[x].subject = txt;
            list[x].threadNumber = res["threadNumber"];
            lord.setLocalObject("hiddenPosts", list);
        } else {
            txt = list[x].subject ? list[x].subject : ("[" + res + "]");
        }
        if (list[x].threadNumber) {
            var a = lord.node("a");
            a.href = "/" + sitePathPrefix + boardName + "/thread/" + list[x].threadNumber + ".html#" + postNumber;
            a.title = txt;
            a.target = "_blank";
            a.appendChild(lord.node("text", "[" + x + "] " + txt.substring(0, 50) + " "));
            postDiv.appendChild(a);
        } else {
            postDiv.title = txt;
            postDiv.appendChild(lord.node("text", "[" + x + "] " + txt.substring(0, 50) + " "));
        }
        var rmBtn = lord.node("a");
        rmBtn.onclick = function() {
            postDiv.parentNode.removeChild(postDiv);
            delete list[x];
        };
        rmBtn.title = lord.text("removeFromHiddenPostListText");
        var img = lord.node("img");
        img.src = "/" + sitePathPrefix + "img/delete.png";
        rmBtn.appendChild(img);
        postDiv.appendChild(rmBtn);
        div.appendChild(postDiv);
    };
    lord.forIn(list, function(_, x) {
        var boardName = x.split("/").shift();
        var postNumber = x.split("/").pop();
        lord.ajaxRequest("get_post", [boardName, +postNumber], lord.RpcGetPostId, function(res) {
            f(res, x);
        }, function(err) {
            f(err, x);
        });
    });
    lord.showDialog(title, null, div, function() {
        lord.setLocalObject("hiddenPosts", list);
    });
};

lord.editUserCss = function() {
    var ta = lord.node("textarea");
    ta.rows = 10;
    ta.cols = 43;
    ta.value = lord.getLocalObject("userCss", "");
    lord.showDialog(null, null, ta, function() {
        lord.setLocalObject("userCss", ta.value);
    });
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
    if (e.target.tagName && !e.metaKey && !e.altKey && !e.ctrlKey
        && lord.in(["TEXTAREA", "INPUT", "BUTTON"], e.target.tagName))
        return;
    var hotkeys = lord.getLocalObject("hotkeys", {});
    var key = e.key;
    if (key.length == 1)
        key = key.toUpperCase();
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

lord.initializeOnLoadSettings = function() {
    if (lord.getCookie("show_tripcode") === "true")
        lord.id("showTripcodeCheckbox").checked = true;
    if (lord.getLocalObject("hotkeysEnabled", true) && lord.text("deviceType") != "mobile") {
        document.body.addEventListener("keypress", lord.interceptHotkey, false);
        var hotkeys = lord.getLocalObject("hotkeys", {}).dir;
        var key = function(name) {
            if (!hotkeys)
                return lord.DefaultHotkeys.dir[name];
            return hotkeys[name] || lord.DefaultHotkeys.dir[name];
        };
        lord.queryOne("[name='settingsButton']").title = "(" + key("showSettings") + ")";
        lord.queryOne("[name='favoritesButton']").title = "(" + key("showFavorites") + ")";
    }
    if (lord.getLocalObject("showNewPosts", true))
        lord.showNewPosts();
    if (lord.getLocalObject("userCssEnabled", false)) {
        var css = lord.getLocalObject("userCss", "");
        var head = lord.queryOne("head");
        var style = lord.node("style");
        style.type = "text/css";
        if (style.styleSheet)
            style.styleSheet.cssText = css;
        else
            style.appendChild(lord.node("text", css));
        head.appendChild(style);
    }
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.initializeOnLoadSettings();
    lord.checkFavoriteThreads();
}, false);

window.addEventListener("beforeunload", function unload() {
    window.removeEventListener("beforeunload", unload, false);
    lord.unloading = true;
}, false);
