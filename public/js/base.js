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

/*Variables*/

lord.chatTasks = {};
lord.chatMessages = {};

/*Functions*/

lord.changeLocale = function() {
    var sel = lord.id("localeChangeSelect");
    var ln = sel.options[sel.selectedIndex].value;
    lord.setCookie("locale", ln, {
        "expires": lord.Billion, "path": "/"
    });
    lord.reloadPage();
};

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
    window.location = lord.nameOne("source", form).value;
};

lord.doLogout = function(event, form) {
    event.preventDefault();
    if (!VK || lord.getCookie("vkAuth", "false") != "true")
        return lord.logoutImplementation(form, false);
    VK.Auth.logout(function() {
        return lord.logoutImplementation(form, true);
    });
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
    var list = [];
    lord.forIn(lord.getLocalObject("favoriteThreads", {}), function(_, key) {
        list.push({
            boardName: key.split("/").shift(),
            threadNumber: key.split("/").pop()
        });
    });
    var query = list.reduce(function(query, item) {
        return query + (query ? "&" : "") + "posts=" + item.boardName + ":" + item.threadNumber;
    }, "");
    var c = {};
    lord.getModel("api/posts", query).then(function(posts) {
        if (lord.checkError(posts))
            return Promise.reject(posts);
        return Promise.resolve(posts);
    }).catch(function(err) {
        lord.handleError(err);
        return Promise.resolve(list);
    }).then(function(posts) {
        var fav = lord.getLocalObject("favoriteThreads", {});
        c.list = posts.map(function(post, i) {
            var item = post || list[i];
            var boardName = post.boardName;
            var threadNumber = post.threadNumber;
            var key = boardName + "/" + threadNumber;
            var txt = (post.subject || post.rawText || (boardName + "/" + threadNumber)).substring(0, 150);
            if (!post)
                txt += " (404)";
            fav[key].subject = txt;
            var data = {
                boardName: boardName,
                threadNumber: threadNumber,
                text: txt,
                shortText: txt.substr(0, 50)
            };
            var p = fav[key];
            if (p.lastPostNumber > p.previousLastPostNumber)
                data.newPostCount = p.lastPostNumber - p.previousLastPostNumber;
            return data;
        });
        lord.setLocalObject("favoriteThreads", fav);
        return lord.getModel(["misc/base", "misc/tr"], true);
    }).then(function(model) {
        c.model = model;
        c.model.favorites = c.list;
        return lord.getTemplate("favoritesDialog");
    }).then(function(template) {
        div = $.parseHTML(template(c.model))[0];
        document.body.appendChild(div);
        lord.toCenter(div, null, null, 1);
    }).catch(lord.handleError);
};

lord.closeFavorites = function() {
    var fav = lord.getLocalObject("favoriteThreads", {});
    lord.forIn(fav, function(o, x) {
        o.previousLastPostNumber = o.lastPostNumber;
        fav[x] = o;
    });
    lord.setLocalObject("favoriteThreads", fav);
    document.body.removeChild(lord.id("favorites"));
};

lord.removeFavorite = function(el) {
    var div = el.parentNode;
    div.parentNode.removeChild(div);
    lord.removeThreadFromFavorites(lord.data("boardName", el, true), +lord.data("threadNumber", el, true));
};

lord.switchMumWatching = function() {
    var watching = lord.getLocalObject("mumWatching", false);
    var img = lord.queryOne("[name='switchMumWatchingButton'] > img");
    img.src = "/" + lord.data("sitePathPrefix") + "img/mum" + (watching ? "_not" : "") + "_watching.png";
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
    var fav = lord.getLocalObject("favoriteThreads", {});
    delete fav[boardName + "/" + threadNumber];
    lord.setLocalObject("favoriteThreads", fav);
    var opPost = lord.id(threadNumber);
    if (!opPost)
        return false;
    var btn = lord.nameOne("addToFavoritesButton", opPost);
    var img = lord.queryOne("img", btn);
    img.src = img.src.replace("favorite_active.png", "favorite.png");
    lord.getModel("misc/tr").then(function(model) {
        var span = lord.queryOne("span", btn);
        lord.removeChildren(span);
        span.appendChild(lord.node("text", model.tr.addThreadToFavoritesText));
    }).catch(lord.handleError);
};

lord.checkFavoriteThreads = function() {
    var fav = lord.getLocalObject("favoriteThreads", {});
    var list = [];
    lord.forIn(fav, function(o, key) {
        list.push({
            boardName: key.split("/").shift(),
            threadNumber: key.split("/").pop(),
            lastPostNumber: o.lastPostNumber
        });
    });
    if (list.length < 1)
        return;
    var query = list.reduce(function(query, item) {
        return query + (query ? "&" : "") + "threads=" + item.boardName + ":" + item.threadNumber
            + (item.lastPostNumber ? (":" + item.lastPostNumber) : "");
    }, "");
    lord.getModel("api/lastPosts", query).then(function(results) {
        if (lord.checkError(results))
            return Promise.reject(results);
        return Promise.resolve(results);
    }).catch(function(err) {
        lord.handleError(err);
        return Promise.resolve(list);
    }).then(function(results) {
        fav = lord.getLocalObject("favoriteThreads", {});
        var newPosts = [];
        results.forEach(function(result, i) {
            var item = (result && result.boardName) || list[i];
            var key = item.boardName + "/" + item.threadNumber;
            if (!result || !result.length || result.length <= 0)
                return;
            fav[key].lastPostNumber = result.pop().number;
            newPosts.push({
                boardName: item.boardName,
                threadNumber: item.threadNumber
            });
        });
        lord.setLocalObject("favoriteThreads", fav);
        var div = lord.id("favorites");
        if (div) {
            lord.forIn(fav, function(o, key) {
                var postDiv = lord.id("favorite/" + key);
                if (!postDiv)
                    return;
                var fnt = lord.queryOne("font", postDiv);
                if (fnt.childNodes.length > 0)
                    fnt.removeChild(fnt.childNodes[0]);
                if (o.lastPostNumber > o.previousLastPostNumber)
                    fnt.appendChild(lord.node("text", "+" + (o.lastPostNumber - o.previousLastPostNumber)));
            });
        } else {
            var threadNumber = +lord.data("threadNumber");
            lord.forIn(fav, function(o, key) {
                if (o.lastPostNumber > o.previousLastPostNumber) {
                    if (threadNumber && +key.split("/").pop() == threadNumber)
                        return;
                    lord.showFavorites();
                }
            });
        }
        if (newPosts.length > 0 && lord.notificationsEnabled()) {
            lord.getModel("misc/tr").then(function(model) {
                var title = model.tr.favoriteThreadsText;
                var sitePathPrefix = lord.data("sitePathPrefix");
                var icon = "/" + sitePathPrefix + "favicon.ico";
                var text = newPosts.reduce(function(text, post) {
                    return text + (text ? ", " : "") + post.boardName + "/" + post.threadNumber;
                }, "");
                text = text.substr(0, text.length - 2);
                lord.showNotification(title, text.substr(0, 300), icon);
            }).catch(lord.handleError);
        }
        setTimeout(lord.checkFavoriteThreads, 15 * lord.Second);
    });
};

lord.showNewPosts = function() {
    var lastPostNumbers = lord.getLocalObject("lastPostNumbers", {});
    var currentBoardName = lord.data("boardName");
    lord.getModel("api/lastPostNumbers").then(function(result) {
        if (lord.checkError(result))
            return Promise.reject(result);
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
    }).catch(lord.handleError);
};

lord.editHotkeys = function() {
    var c = {};
    lord.getTemplate("hotkeysDialog").then(function(template) {
        c.template = template;
        c.hotkeys = lord.getLocalObject("hotkeys", {
            dir: {},
            rev: {}
        });
        c.model = {
            hotkeys: c.hotkeys.dir,
            defaultHotkeys: lord.DefaultHotkeys.dir
        };
        return lord.getModel(["misc/tr"], true);
    }).then(function(model) {
        c.model = merge.recursive(c.model, model);
        c.div = $.parseHTML(c.template(c.model))[0];
        return lord.showDialog(null, null, c.div);
    }).then(function(accepted) {
        if (!accepted)
            return;
        lord.query("input", c.div).forEach(function(el) {
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
    lord.showDialog(null, null, ta).then(function(result) {
        if (!result)
            return Promise.resolve();
        lord.setLocalObject("spells", ta.value);
        if (!lord.worker || !lord.getLocalObject("spellsEnabled", true))
            return;
        lord.worker.postMessage({
            "type": "parseSpells",
            "data": lord.getLocalObject("spells", lord.DefaultSpells)
        });
        return Promise.resolve();
    });
};

lord.showHiddenPostList = function() {
    var list = [];
    lord.forIn(lord.getLocalObject("hiddenPosts", {}), function(_, x) {
        list.push({
            boardName: x.split("/").shift(),
            postNumber: x.split("/").pop()
        });
    });
    var query = list.reduce(function(query, item) {
        return query + (query ? "&" : "") + "posts=" + item.boardName + ":" + item.postNumber;
    }, "");
    var c = {};
    lord.getModel("api/posts", query).then(function(posts) {
        if (lord.checkError(posts))
            return Promise.reject(posts);
        return Promise.resolve(posts);
    }).catch(function(err) {
        lord.handleError(err);
        return Promise.resolve(list);
    }).then(function(posts) {
        var hidden = lord.getLocalObject("hiddenPosts", {});
        c.list = posts.map(function(post, i) {
            var item = post || list[i];
            var boardName = post.boardName;
            var postNumber = post.number || post.postNumber;
            var key = boardName + "/" + postNumber;
            var txt = (post.subject || post.rawText || (boardName + "/" + postNumber)).substring(0, 150);
            if (!post)
                txt += " (404)";
            hidden[key].subject = txt;
            return {
                boardName: boardName,
                postNumber: postNumber,
                threadNumber: post.threadNumber,
                text: txt,
                shortText: txt.substr(0, 50)
            };
        });
        lord.setLocalObject("hiddenPosts", hidden);
        return lord.getModel(["misc/base", "misc/tr"], true);
    }).then(function(model) {
        c.model = model;
        c.model.hiddenPosts = c.list;
        return lord.getTemplate("hiddenPostList");
    }).then(function(template) {
        var div = $.parseHTML(template(c.model))[0];
        return lord.showDialog("hiddenPostListText", null, div);
    }).catch(lord.handleError);
};

lord.removeHidden = function(el) {
    var div = el.parentNode;
    div.parentNode.removeChild(div);
    var list = lord.getLocalObject("hiddenPosts", {});
    delete list[lord.data("boardName", div) + "/" + lord.data("postNumber", div)];
};

lord.editUserCss = function() {
    var div = lord.node("div");
    var c = {};
    if (lord.getLocalObject("sourceHighlightingEnabled", false)) {
        c.editor = CodeMirror(div, {
            mode: "javascript",
            lineNumbers: true,
            autofocus: true,
            value: lord.getLocalObject("userCss", "")
        });
    } else {
        var ta = lord.node("textarea");
        ta.rows = 10;
        ta.cols = 43;
        ta.value = lord.getLocalObject("userCss", "");
        div.appendChild(ta);
    }
    lord.showDialog(null, null, div, function() {
        if (c.editor)
            c.editor.refresh();
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        lord.setLocalObject("userCss", c.editor ? c.editor.getValue() : ta.value);
        return Promise.resolve();
    });
};

lord.editUserJavaScript = function() {
    var div = lord.node("div");
    var c = {};
    if (lord.getLocalObject("sourceHighlightingEnabled", false)) {
        c.editor = CodeMirror(div, {
            mode: "javascript",
            lineNumbers: true,
            autofocus: true,
            value: lord.getLocalObject("userJavaScript", "")
        });
    } else {
        var ta = lord.node("textarea");
        ta.rows = 10;
        ta.cols = 43;
        ta.value = lord.getLocalObject("userJavaScript", "");
        div.appendChild(ta);
    }
    lord.showDialog(null, null, div, function() {
        if (c.editor)
            c.editor.refresh();
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        lord.setLocalObject("userJavaScript", c.editor ? c.editor.getValue() : ta.value);
        return Promise.resolve();
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
    if (!e || e.type != "keyup" || (e.target.tagName && !e.metaKey && !e.altKey && !e.ctrlKey
        && lord.in(["TEXTAREA", "INPUT", "BUTTON"], e.target.tagName))) {
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

lord.chatMessage = function(data) {
    if (!lord.chatMessages[data.hash])
        lord.chatMessages[data.hash] = [];
    lord.chatMessages[data.hash].push({
        text: data.message,
        type: "in"
    });
    if (lord.chatDialog) {
        var chat = lord.nameOne(data.hash, lord.chatDialog);
        if (!chat) {
            chat = lord.createChatNode(data,hash);
            lord.chatDialog.appendChild(chat);
        }
        var img = lord.queryOne("img", chat);
        if (img.src.replace("chat_message", "") == img.src)
            img.src = img.src.replace("chat", "chat_message");
        if (lord.currentChat && lord.currentChat.name == data.hash) {
            var messages = lord.nameOne("messages", lord.currentChat);
            var msg = lord.node("div");
            msg.appendChild(lord.node("text", "< " + data.message));
            messages.appendChild(msg);
        }
    }
    if (!lord.chatOpened) {
        var a = lord.nameOne("chatButton");
        var img = lord.queryOne("img", a);
        if (img.src.replace("chat_message", "") == img.src)
            img.src = img.src.replace("chat", "chat_message");
        lord.getModel("misc/tr").then(function(model) {
            var div = lord.node("div");
            var a = lord.createChatButton(true);
            a.onclick = lord.showChat.bind(lord, data.hash);
            div.appendChild(a);
            div.appendChild(lord.node("text", " " + model.tr.newChatMessageText));
            lord.showPopup(div, { type: "node" });
        }).catch(lord.handleError);
    }
};

lord.chatMessageHandler = function(message) {
    try {
        message = JSON.parse(message.data);
    } catch (err) {
        lord.handleError(err);
        return;
    }
    var task = lord.chatTasks[message.id];
    if (task) {
        delete lord.chatTasks[message.id];
        if (!message.error)
            task.resolve(message.data);
        else
            task.reject(message.error);
    } else {
        switch (message.type) {
        case "message":
            lord.chatMessage(message.data);
            break;
        case "error":
            lord.handleError(message.data);
            break;
        default:
            lord.handleError("Unknown request");
            break;
        }
    }
};

lord.doChat = function(type, data) {
    if (!lord.wsChat)
        return Promise.reject("Connection lost");
    return new Promise(function(resolve, reject) {
        var id = uuid.v1();
        lord.chatTasks[id] = {
            resolve: resolve,
            reject: reject
        };
        lord.wsChat.send(JSON.stringify({
            id: id,
            type: type,
            data: data
        }));
    });
};

lord.showChat = function(hash) {
    if (lord.currentChat && lord.currentChat.name == hash)
        return;
    var div = lord.node("div");
    div.setAttribute("name", hash);
    var messages = lord.node("div");
    messages.setAttribute("name", "messages");
    lord.chatMessages[hash].forEach(function(message) {
        var msg = lord.node("div");
        msg.appendChild(lord.node("text", (("in" == message.type) ? ">" : "<") + " " + message.text));
        messages.appendChild(msg);
    });
    div.appendChild(messages);
    var actions = lord.node("div");
    var button = lord.node("button");
    button.onclick = lord.sendChatMessage.bind(lord, hash, null);
    lord.getModel("misc/tr").then(function(model) {
        button.appendChild(lord.node("text", model.tr.sendMessageButtonText));
    }).catch(lord.handleError);
    actions.appendChild(button);
    div.appendChild(actions);
    lord.currentChat = div;
    lord.showDialog(hash, null, div).then(function() {
        lord.currentChat = null;
    }).catch(lord.handleError);
    if (lord.chatDialog) {
        var chat = lord.nameOne(hash, lord.chatDialog);
        if (!chat)
            return;
        var img = lord.queryOne("img", chat);
        if (img.src.replace("chat_message", "") != img.src)
            img.src = img.src.replace("chat_message", "chat");
    }
};

lord.sendChatMessage = function(boardName, postNumber) {
    var div = lord.node("div");
    var ta = lord.node("textArea");
    ta.rows = 10;
    ta.cols = 43;
    div.appendChild(ta);
    lord.showDialog("chatText", null, div).then(function(result) {
        if (!result || !ta.value)
            return Promise.resolve();
        var data = { message: ta.value };
        if (postNumber) {
            data.boardName = boardName;
            data.postNumber = postNumber;
        } else {
            data.hash = boardName;
        }
        return lord.doChat("message", data);
    }).then(function(response) {
        if (!response)
            return Promise.resolve();
        if (lord.checkError(response))
            return Promise.reject(response);
        if (response.hash) {
            if (!lord.chatMessages[response.hash])
                lord.chatMessages[response.hash] = [];
            lord.chatMessages[response.hash].push({
                text: ta.value,
                type: "out"
            });
            if (lord.currentChat && lord.currentChat.name == response.hash) {
                var messages = lord.nameOne("messages", lord.currentChat);
                var msg = lord.node("div");
                msg.appendChild(lord.node("text", "< " + ta.value));
                messages.appendChild(msg);
            }
        }
    }).catch(lord.handleError);
};

lord.createChatNode = function(hash) {
    var chat = lord.node("div");
    chat.setAttribute("name", hash);
    chat.appendChild(lord.node("text", hash + " "));
    var a = lord.createChatButton();
    a.onclick = lord.showChat.bind(lord, hash);
    chat.appendChild(a);
    return chat;
};

lord.showChats = function() {
    lord.chatOpened = true;
    var a = lord.nameOne("chatButton");
    var img = lord.queryOne("img", a);
    img.src = img.src.replace("chat_message", "chat");
    var div = lord.chatDialog || lord.node("div");
    lord.forIn(lord.chatMessages, function(_, hash) {
        div.appendChild(lord.createChatNode(hash));
    });
    lord.chatDialog = div;
    lord.showDialog("chatText", null, div).then(function() {
        lord.chatOpened = false;
        lord.chatDialog = null;
    });
};

lord.createChatButton = function(message) {
    var a = lord.node("a");
    a.name = "chatButton";
    a.onclick = lord.showChats.bind(lord);
    var img = lord.node("img");
    lord.addClass(img, "buttonImage");
    img.src = "/" + lord.data("sitePathPrefix") + "img/chat" + (message ? "_message" : "") + ".png";
    lord.getModel("misc/tr").then(function(model) {
        a.title = model.tr.chatText;
    }).catch(lord.handleError);
    a.appendChild(img);
    return a;
};

lord.initializeOnLoadSettings = function() {
    if (lord.getCookie("show_tripcode") === "true")
        lord.id("showTripcodeCheckbox").checked = true;
    if (lord.getLocalObject("hotkeysEnabled", true) && lord.data("deviceType") != "mobile") {
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
    if (lord.getLocalObject("showNewPosts", true))
        lord.showNewPosts();
    if (lord.getLocalObject("sourceHighlightingEnabled", false)) {
        var head = lord.queryOne("head");
        var script = lord.node("script");
        script.type = "text/javascript";
        script.src = "/" + lord.data("sitePathPrefix") + "js/3rdparty/codemirror/codemirror.min.js";
        head.appendChild(script);
        var link = lord.node("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = "/" + lord.data("sitePathPrefix") + "css/3rdparty/codemirror.css";
        head.appendChild(link);
        script.onload = function() {
            script = lord.node("script");
            script.type = "text/javascript";
            script.src = "/" + lord.data("sitePathPrefix") + "js/3rdparty/codemirror/javascript.min.js";
            head.appendChild(script);
            script = lord.node("script");
            script.type = "text/javascript";
            script.src = "/" + lord.data("sitePathPrefix") + "js/3rdparty/codemirror/css.min.js";
            head.appendChild(script);
        };
    }
    if (lord.getLocalObject("userCssEnabled", true)) {
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
    if (lord.getLocalObject("chatEnabled", true)) {
        var loc = window.location;
        var path = "ws" + (("https:" == loc.protocol) ? "s" : "") + "://" + loc.host + lord.data("sitePathPrefix")
            + "/websocket/chat";
        lord.wsChat = new WebSocket(path);
        lord.wsChat.addEventListener("message", lord.chatMessageHandler);
        lord.wsChat.addEventListener("close", function() {
            delete lord.wsChat;
        });
        var toolbar = lord.queryOne(".toolbar");
        toolbar.appendChild(lord.node("text", " "));
        var span = lord.node("span");
        lord.addClass(span, "navbarItem");
        toolbar.appendChild(lord.node("text", "["));
        span.appendChild(lord.createChatButton());
        toolbar.appendChild(span);
        toolbar.appendChild(lord.node("text", "]"));
    }
    if (lord.getLocalObject("userJavaScriptEnabled", true)) {
        var js = lord.getLocalObject("userJavaScript", "");
        var head = lord.queryOne("head");
        var script = lord.node("script");
        script.type = "text/javascript";
        script.innerHTML = js;
        head.appendChild(script);
    }
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.initializeOnLoadSettings();
    lord.checkFavoriteThreads();
    lord.getTemplate("post").then(function() {
        return lord.getTemplate("settingsDialog");
    }).then(function() {
        return lord.getTemplate("editPostDialog");
    }).catch(lord.handleError);
}, false);

window.addEventListener("beforeunload", function unload() {
    window.removeEventListener("beforeunload", unload, false);
    lord.unloading = true;
}, false);
