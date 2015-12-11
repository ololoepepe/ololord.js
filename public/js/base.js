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
lord.chats = lord.getLocalObject("chats", {});
lord.chatDialog = null;
lord.lastChatCheckDate = lord.getLocalObject("lastChatCheckDate", null);
lord.notificationQueue = [];

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
    setTimeout(function() {
        return lord.logoutImplementation(form, true);
    }, 1000);
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
    var model = { settings: lord.settings() };
    c.model = merge.recursive(model,
            lord.model(["base", "tr", "boards", "board/" + lord.data("boardName")], true));
    c.div = lord.template("settingsDialog", c.model);
    lord.showDialog("settingsDialogTitle", null, c.div).then(function(accepted) {
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
    var model = lord.model(["base", "tr"], true);
    model.favorites = lord.toArray(lord.getLocalObject("favoriteThreads", {}));
    div = lord.template("favoritesDialog", model);
    document.body.appendChild(div);
    lord.toCenter(div, null, null, 1);
};

lord.closeFavorites = function() {
    var favoriteThreads = lord.getLocalObject("favoriteThreads", {});
    lord.forIn(favoriteThreads, function(fav) {
        fav.previousLastPostNumber = fav.lastPostNumber;
    });
    lord.setLocalObject("favoriteThreads", favoriteThreads);
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
    var span = lord.queryOne("span", btn);
    lord.removeChildren(span);
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
                if (lord.notificationsEnabled()) {
                    lord.notificationQueue.push({
                        key: fav.boardName + "/" + fav.threadNumber,
                        boardName: fav.boardName,
                        postNumber: fav.lastPostNumber,
                        threadNumber: fav.threadNumber
                    });
                }
                if (lord.soundEnabled())
                    lord.playSound();
                if (div) {
                    var postDiv = lord.id("favorite/" + fav.boardName + "/" + fav.threadNumber);
                    if (!postDiv)
                        return;
                    var fnt = lord.queryOne("font", postDiv);
                    if (fnt.childNodes.length > 0)
                        fnt.removeChild(fnt.childNodes[0]);
                    var diff = fav.lastPostNumber - fav.previousLastPostNumber;
                    fnt.appendChild(lord.node("text", "+" + diff));
                } else {
                    if (+lord.data("threadNumber") != fav.threadNumber)
                        show = true;
                }
            }
            if (show)
                lord.showFavorites();
        });
        lord.setLocalObject("favoriteThreads", favoriteThreads);
        setTimeout(lord.checkFavoriteThreads, 15 * lord.Second);
    });
};

lord.showNewPosts = function() {
    var lastPostNumbers = lord.getLocalObject("lastPostNumbers", {});
    var currentBoardName = lord.data("boardName");
    lord.api("lastPostNumbers").then(function(result) {
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
    lord.showDialog(null, null, c.div).then(function(accepted) {
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
    var model = lord.model(["base", "tr"], true);
    model.hiddenPosts = lord.toArray(lord.getLocalObject("hiddenPosts", {}));
    var div = lord.template("hiddenPostList", model);
    return lord.showDialog("hiddenPostListText", null, div);
};

lord.removeHidden = function(el) {
    var div = el.parentNode;
    div.parentNode.removeChild(div);
    var list = lord.getLocalObject("hiddenPosts", {});
    delete list[lord.data("boardName", div) + "/" + lord.data("postNumber", div)];
    lord.setLocalObject("hiddenPosts", list);
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

lord.populateChatHistory = function(key) {
    var history = lord.nameOne("history", lord.chatDialog);
    lord.removeChildren(history);
    var model = lord.model("base");
    var settings = lord.settings();
    var timeOffset = ("local" == settings.time) ? +settings.timeZoneOffset : model.site.timeOffset;
    model.formattedDate = function(date) {
        return moment(date).utcOffset(timeOffset).locale(model.site.locale).format(model.site.dateFormat);
    };
    var messages = lord.chats[key] || [];
    messages = messages.map(function(message) {
        var m = merge.recursive(model, message);
        history.appendChild(lord.template("chatMessage", m));
    });
};

lord.updateChat = function(keys) {
    if (!lord.chatDialog) {
        var a = lord.nameOne("chatButton");
        var img = lord.queryOne("img", a);
        if (img.src.replace("chat_message", "") == img.src)
            img.src = img.src.replace("chat", "chat_message");
        var div = lord.node("div");
        var a = lord.createChatButton(true);
        var lastKey = lord.last(keys);
        a.onclick = lord.showChat.bind(lord, lastKey);
        div.appendChild(a);
        div.appendChild(lord.node("text", " " + lord.text("newChatMessageText") + " [" + lastKey + "]"));
        lord.showPopup(div, { type: "node" });
    } else {
        keys.forEach(function(key) {
            var div = lord.nameOne(key, lord.chatDialog);
            if (div) {
                if (lord.hasClass(div, "selected")) {
                    lord.populateChatHistory(key);
                } else {
                    var newMessages = lord.queryOne(".chatContactNewMessages", div);
                    lord.removeChildren(newMessages);
                    newMessages.appendChild(lord.node("text", "!!!"));
                }
            } else {
                var contacts = lord.queryOne(".chatContactList", lord.chatDialog);
                var model = lord.model(["base", "tr"], true);
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
        lord.forIn(model.chats, function(messages, key) {
            if (!lord.chats[key])
                lord.chats[key] = [];
            var list = lord.chats[key];
            if (messages.length > 0)
                keys.push(key);
            messages.forEach(function(message) {
                list.push(message);
            });
        });
        if (keys.length > 0)
            lord.updateChat(keys);
        lord.setLocalObject("chats", lord.chats);
        lord.checkChats.timer = setTimeout(lord.checkChats.bind(lord),
            lord.chatDialog ? (5 * lord.Second) : lord.Minute);
    }).catch(function(err) {
        lord.handleError(err);
        lord.checkChats.timer = setTimeout(lord.checkChats.bind(lord), lord.Minute);
    });
};

lord.showChat = function(key) {
    var a = lord.nameOne("chatButton");
    var img = lord.queryOne("img", a);
    if (img.src.replace("chat_message", "") != img.src)
        img.src = img.src.replace("chat_message", "chat");
    var model = lord.model(["base", "tr"], true);
    model.contacts = [];
    lord.forIn(lord.chats, function(_, key) {
        model.contacts.push({ key: key });
    });
    lord.chatDialog = lord.template("chatDialog", model);
    lord.showDialog("chatText", null, lord.chatDialog, function() {
        lord.checkChats();
        if (!key)
            return;
        lord.selectChatContact(key);
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
    lord.removeChildren(newMessages);
    var contactList = lord.queryOne(".chatContactList", lord.chatDialog);
    var previous = lord.queryOne(".chatContact.selected", contactList);
    if (previous)
        lord.removeClass(previous, "selected");
    lord.addClass(div, "selected");
    var target = lord.nameOne("target", lord.chatDialog);
    target.style.display = "";
    var targetKey = lord.nameOne("targetKey", lord.chatDialog);
    lord.removeChildren(targetKey);
    targetKey.appendChild(lord.node("text", key));
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
        delete lord.chats[key];
        lord.setLocalObject("chats", lord.chats);
        if (!lord.chatDialog)
            return Promise.resolve();
        var contact = lord.nameOne(key, lord.chatDialog);
        if (!contact)
            return Promise.resolve();
        if (lord.hasClass(contact, "selected")) {
            lord.nameOne("target", lord.chatDialog).style.display = "none";
            lord.removeChildren(lord.nameOne("targetKey", lord.chatDialog));
            lord.removeChildren(lord.nameOne("history", lord.chatDialog));
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

lord.createChatButton = function(key) {
    var a = lord.node("a");
    a.name = "chatButton";
    a.onclick = lord.showChat.bind(lord);
    var img = lord.node("img");
    lord.addClass(img, "buttonImage");
    img.src = "/" + lord.data("sitePathPrefix") + "img/chat" + (key ? "_message" : "") + ".png";
    a.title = lord.text("chatText");
    a.appendChild(img);
    return a;
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

lord.initializeOnLoadSettings = function() {
    var settings = lord.settings();
    lord.createStylesheetLink(settings.style.name + ".css", true);
    var defaultStylesheet = lord.id("defaultStylesheet");
    defaultStylesheet.parentNode.removeChild(defaultStylesheet);
    lord.createStylesheetLink("3rdparty/highlight.js/" + settings.codeStyle.name + ".css", true);
    var model = lord.model(["base", "tr", "boards"], true);
    model.settings = settings;
    model.compareRegisteredUserLevels = lord.compareRegisteredUserLevels;
    if (model.user.loggedIn) {
        if (lord.compareRegisteredUserLevels(model.user.level, "ADMIN") >= 0)
            model.loginMessageText = lord.text("loginMessageAdminText");
        else if (lord.compareRegisteredUserLevels(model.user.level, "MODER") >= 0)
            model.loginMessageText = lord.text("loginMessageModerText");
        else if (lord.compareRegisteredUserLevels(model.user.level, "USER") >= 0)
            model.loginMessageText = lord.text("loginMessageUserText");
        else
            model.loginMessageText = lord.text("loginMessageNoneText");
    }
    var toolbarPlaceholder = lord.id("toolbarPlaceholder");
    toolbarPlaceholder.parentNode.replaceChild(lord.template("toolbar", model), toolbarPlaceholder);
    var navbarPlaceholder = lord.id("navbarPlaceholder");
    if (navbarPlaceholder)
        navbarPlaceholder.parentNode.replaceChild(lord.template("navbar", model), navbarPlaceholder);
    var searchPlaceholder = lord.id("searchPlaceholder");
    searchPlaceholder.parentNode.replaceChild(lord.template("searchAction", model), searchPlaceholder);
    if (lord.getCookie("show_tripcode") === "true")
        lord.id("showTripcodeCheckbox").checked = true;
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
    if (lord.getLocalObject("showNewPosts", true))
        lord.showNewPosts();
    if (lord.getLocalObject("sourceHighlightingEnabled", false)) {
        var head = lord.queryOne("head");
        var script = lord.node("script");
        script.type = "text/javascript";
        script.src = "/" + lord.data("sitePathPrefix") + "js/3rdparty/codemirror/codemirror.min.js";
        head.appendChild(script);
        lord.createStylesheetLink("3rdparty/codemirror.css", true);
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
    if (lord.getLocalObject("chatEnabled", true))
        lord.checkChats();
    if (lord.notificationsEnabled())
        lord.checkNotificationQueue();
    if (lord.getLocalObject("userJavaScriptEnabled", true)) {
        var js = lord.getLocalObject("userJavaScript", "");
        var head = lord.queryOne("head");
        var script = lord.node("script");
        script.type = "text/javascript";
        script.innerHTML = js;
        head.appendChild(script);
    }
    if (lord.queryOne(".toolbar")) {
        window.addEventListener("hashchange", function() {
            var offset = $(":target").offset();
            var scrollto = offset.top - $(".toolbar").height();
            $("html, body").animate({ scrollTop: scrollto }, 0);
        }, false);
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
