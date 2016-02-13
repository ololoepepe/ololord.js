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

lord.postPreviews = {};
lord.lastPostPreview = null;
lord.lastPostPreviewTimer = null;
lord.postPreviewMask = null;
lord.images = {};
lord.img = null;
lord.imgWrapper = null;
lord.lastPostFormPosition = "";
lord.files = null;
lord.filesMap = null;
lord.spells = null;
lord.worker = new Worker("/js/worker.js");
lord.workerTasks = {};
lord.customPostFormField = {};
lord.customPostFormOption = {};
lord.customPostHeaderPart = {};
lord.customPostMenuAction = {};
lord.customPostBodyPart = {};
lord.customEditPostDialogPart = {};
lord.autoUpdateTimer = null;
lord.blinkTimer = null;
lord.pageVisible = "visible";
lord.loadingImage = null;

/*Functions*/

lord.worker.addEventListener("message", function(message) {
    try {
        message = JSON.parse(message.data);
    } catch (err) {
        lord.handleError(err);
        return;
    }
    var task = lord.workerTasks[message.id];
    if (!task) {
        if ("_error" == message.id)
            lord.handleError(message.error);
        return;
    }
    delete lord.workerTasks[message.id];
    if (!message.error)
        task.resolve(message.data);
    else
        task.reject(message.error);
});

lord.doWork = function(type, data, transferable) {
    return new Promise(function(resolve, reject) {
        var id = uuid.v1();
        lord.workerTasks[id] = {
            resolve: resolve,
            reject: reject
        };
        lord.worker.postMessage(JSON.stringify({
            id: id,
            type: type,
            data: data
        }), transferable || []);
    });
};

lord.isSpecialThumbName = function(thumbName) {
    return lord.isAudioType(thumbName) || lord.isImageType(thumbName) || lord.isVideoType(thumbName);
};

lord.getPostData = function(post) {
    if (!post)
        return null;
    var currentBoardName = lord.data("boardName");
    var threadNumber = +lord.data("threadNumber");
    var postNumber = +post.id;
    if (!threadNumber) {
        if (lord.hasClass(post, "opPost"))
            threadNumber = postNumber;
        else
            threadNumber = +lord.data("threadNumber", post, true);
    }
    var data = {
        boardName: currentBoardName,
        threadNumber: threadNumber,
        postNumber: postNumber
    };
    if (lord.getLocalObject("spellsEnabled", true)) {
        var blockquote = lord.queryOne("blockquote", post);
        var files = [];
        lord.query(".postFile", post).forEach(function(file) {
            files.push({
                "href": lord.data("href", file),
                "mimeType": lord.data("mimeType", file),
                "size": +lord.data("sizeKB", file),
                "sizeText": lord.data("sizeText", file),
                "width": +lord.data("width", file),
                "height": +lord.data("height", file)
            });
        });
        var mailto = lord.queryOne(".mailtoName", post);
        var trip = lord.queryOne(".tripcode", post);
        data.hidden = !!lord.getLocalObject("hiddenPosts", {})[currentBoardName + "/" + postNumber];
        data.innerHTML = post.innerHTML;
        data.text = lord.getPlainText(blockquote);
        data.textHTML = blockquote.innerHTML;
        data.mailto = (mailto ? mailto.href : null);
        data.tripcode = (trip ? trip.value : null);
        data.userName = lord.queryOne(".someName", post).value;
        data.isDefaultUserName = !!lord.queryOne(".defaultUserName", post);
        data.subject = lord.queryOne(".postSubject", post).value;
        data.isDefaultSubject = !!lord.queryOne(".defaultPostSubject", post);
        data.files = (files.length > 0) ? files : null;
        var videos = [];
        lord.query("[data-video-id]", blockquote).forEach(function(span) {
            videos.push({
                title: lord.data("videoTitle", span),
                author: lord.data("videoAuthor", span)
            });
        });
        data.videos = (videos.length > 0) ? videos : null;
    }
    return data;
};

lord.processPost = function(post, data) {
    if (data) {
        if (data.replacements && data.replacements.length > 0) {
            lord.forIn(data.replacements, function(value) {
                if (value.innerHTML)
                    post.innerHTML = value.innerHTML;
            });
        }
        if (data.hidden)
            lord.addPostToHidden(data.boardName, data.postNumber, data.threadNumber);
    }
    lord.tryHidePost(post);
}

lord.resetScale = function(image) {
    if (!image.scale)
        return;
    var k = (image.scale / 100);
    var tr = "scale(" + k + ", " + k + ")";
    //Fuck you all who create those stupid browser-specific features
    image.style.webkitTransform = tr;
    image.style.MozTransform = tr;
    image.style.msTransform = tr;
    image.style.OTransform = tr;
    image.style.transform = tr;
    lord.showPopup(parseFloat(image.scale.toString().substr(0, 5)) + "%", { "timeout": +lord.Second });
};

lord.removeReferences = function(postNumber, referencedOnly) {
    postNumber = +postNumber;
    if (isNaN(postNumber))
        return;
    var as = lord.query("a[data-board-name='" + lord.data("boardName") + "'][data-post-number='" + postNumber + "']");
    if (!as)
        return;
    as.forEach(function(a) {
        var parent = a.parentNode;
        if (lord.hasClass(parent, "referencedBy")) {
            parent.removeChild(a);
            if (parent.children.length <= 1)
                parent.style.display = "none";
        } else if (!referencedOnly) {
            parent.replaceChild(lord.node("text", a.textContent), a);
        }
    });
};

lord.setInitialScale = function(image, sizeHintX, sizeHintY, border) {
    if (!sizeHintX || !sizeHintY || sizeHintX <= 0 || sizeHintY <= 0)
        return;
    border = +border;
    if (!isNaN(border)) {
        sizeHintX += border * 2;
        sizeHintY += border * 2;
    }
    var doc = document.documentElement;
    var maxWidth = doc.clientWidth - 10;
    var maxHeight = doc.clientHeight - 10;
    var kw = 1;
    var kh = 1;
    var s = lord.getLocalObject("imageZoomSensitivity", 25);
    var k = 1;
    while ((kw * sizeHintX) > maxWidth) {
        if (((kw * 100) - (s / k)) > 0)
            kw = ((kw * 100) - (s / k)) / 100;
        else
            k *= 10;
    }
    k = 1;
    while ((kh * sizeHintY) > maxHeight) {
        if (((kh * 100) - (s / k)) > 0)
            kh = ((kh * 100) - (s / k)) / 100;
        else
            k *= 10;
    }
    image.scale = ((kw < kh) ? kw : kh) * 100;
};

lord.reloadCaptchaFunction = function() {
    if (window.grecaptcha)
        grecaptcha.reset();
    else if (window.Recaptcha)
        Recaptcha.reload();
};

lord.resetCaptcha = function() {
    var captcha = lord.id("captcha");
    if (captcha) {
        lord.api("captchaQuota", { boardName: lord.data("boardName") }).then(function(result) {
            var quota = result.quota;
            if (isNaN(quota))
                return;
            var hiddenCaptcha = lord.id("hiddenCaptcha");
            var td = lord.id("captchaContainer");
            for (var i = 0; i < td.children.length; ++i) {
                if (td.children[i] == captcha)
                    continue;
                td.removeChild(td.children[i]);
            }
            if (quota > 0) {
                hiddenCaptcha.appendChild(captcha);
                var span = lord.node("span");
                lord.addClass(span, "noCaptchaText");
                var text = lord.text("noCaptchaText") + ". " + lord.text("captchaQuotaText") + " " + quota;
                span.appendChild(lord.node("text", text));
                td.appendChild(span);
            } else {
                lord.id("captchaContainer").appendChild(captcha);
                if (lord.reloadCaptchaFunction && "hiddenCaptcha" !== captcha.parentNode.id)
                    lord.reloadCaptchaFunction();
            }
        });
    }
};

lord.traverseChildren = function(elem) {
    var children = [];
    var q = [];
    q.push(elem);
    function pushAll(elemArray) {
        for (var i = 0; i < elemArray.length; ++i)
            q.push(elemArray[i]);
    }
    while (q.length > 0) {
        var elem = q.pop();
        children.push(elem);
        pushAll(elem.children);
    }
    return children;
};

lord.appendExtrasToModel = function(model) {
    var settings = lord.settings();
    var locale = model.site.locale;
    var dateFormat = model.site.dateFormat;
    var timeOffset = ("local" == settings.time) ? +settings.timeZoneOffset : model.site.timeOffset;
    model.settings = settings;
    model.compareRegisteredUserLevels = lord.compareRegisteredUserLevels;
    model.formattedDate = function(date) {
        return moment(date).utcOffset(timeOffset).locale(locale).format(dateFormat);
    };
    model.minimalisticPostform = function() {
        return settings.minimalisticPostform;
    };
    model.customPostBodyPart = lord.customPostBodyPart;
    model.customPostHeaderPart = lord.customPostHeaderPart;
    model.customPostMenuAction = lord.customPostMenuAction;
};

lord.createPostNode = function(post, permanent, threadInfo) {
    if (typeof permanent == "undefined")
        permanent = true;
    var c = {};
    c.model = lord.model(["base", "tr", "boards", "board/" + post.boardName], true);
    var p;
    if (threadInfo) {
        p = Promise.resolve(threadInfo);
    } else {
        p = lord.api("threadInfo", {
            boardName: post.boardName,
            threadNumber: post.threadNumber
        });
    }
    var ownPosts = lord.getLocalObject("ownPosts", {});
    return p.then(function(thread) {
        c.model.thread = thread;
        c.model.post = post;
        c.model.isThreadPage = !!lord.data("threadNumber");
        c.model.archived = !!lord.data("archived");
        lord.appendExtrasToModel(c.model);
        c.node = lord.template("post", c.model);
        $(".postBody", c.node).css("maxWidth", ($(window).width() - 30) + "px");
        var dw = (c.model.deviceType == "mobile") ? 100 : 320;
        $(".codeBlock", c.node).css("maxWidth", ($(window).width() - dw) + "px");
        if (lord.deviceType("mobile"))
            lord.setTooltips(c.node);
        if (lord.getLocalObject("strikeOutHiddenPostLinks", true))
            lord.strikeOutHiddenPostLinks(c.node);
        if (lord.getLocalObject("signOpPostLinks", true))
            lord.signOpPostLinks(c.node);
        if (lord.getLocalObject("signOwnPostLinks", true))
            lord.signOwnPostLinks(c.node, ownPosts);
        if (lord.getLocalObject("mumWatching", false)) {
            lord.query(".postFileFile > a > img", c.node).forEach(function(img) {
                lord.addClass(img, "mumWatching");
            });
        }
        if (!permanent) {
            var actions = lord.nameOne("postActionsContainer", c.node);
            if (actions)
                actions.parentNode.removeChild(actions);
            var qr = lord.nameOne("quickReplyContainer", c.node);
            if (qr)
                qr.parentNode.removeChild(qr);
            lord.name("toThread", c.node).forEach(lord.removeSelf.bind(lord));
            lord.removeClass(c.node, "opPost");
            lord.addClass(c.node, "post");
            lord.addClass(c.node, "temporary");
        } else {
            var lastPostNumbers = lord.getLocalObject("lastPostNumbers", {});
            var lastPostNumber = lastPostNumbers[post.boardName];
            if (isNaN(lastPostNumber) || post.number > lastPostNumber) {
                lastPostNumbers[post.boardName] = post.number;
                lord.setLocalObject("lastPostNumbers", lastPostNumbers);
            }
            lord.files = null;
            lord.filesMap = null;
            lord.initFiles();
        }
        var data = lord.getPostData(c.node);
        return lord.doWork("processPosts", {
            posts: [data],
            spells: lord.spells
        }).then(function(list) {
            lord.processPost(c.node, (list && list.length > 0) ? list[0] : null);
            if (!permanent || !post.referencedPosts || post.referencedPosts.length < 1)
                return Promise.resolve();
            var model = lord.model(["base", "board/" + lord.data("boardName")], true);
            model.settings = lord.settings();
            var promises = post.referencedPosts.filter(function(reference) {
                return reference.boardName == lord.data("boardName") && lord.id(reference.postNumber);
            }).map(function(reference) {
                var targetPost = lord.id(reference.postNumber);
                lord.nameOne("referencedByContainer", targetPost).style.display = "";
                var referencedBy = lord.nameOne("referencedBy", targetPost);
                var list = lord.query("a", referencedBy);
                for (var i = 0; i < list.length; ++i) {
                    if (lord.data("boardName", list[i]) == post.boardName
                        && lord.data("postNumber", list[i]) == post.number) {
                        return Promise.resolve();
                    }
                }
                model.reference = {
                    boardName: post.boardName,
                    postNumber: post.number,
                    threadNumber: post.threadNumber,
                    user: post.user
                };
                var a = lord.template("postReference", model);
                referencedBy.appendChild(lord.node("text", " "));
                referencedBy.appendChild(a);
                if (lord.getLocalObject("strikeOutHiddenPostLinks", true))
                    lord.strikeOutHiddenPostLinks(targetPost);
                if (lord.getLocalObject("signOpPostLinks", true))
                    lord.signOpPostLinks(targetPost);
                if (lord.getLocalObject("signOwnPostLinks", true))
                    lord.signOwnPostLinks(targetPost, ownPosts);
                return Promise.resolve();
            });
            return Promise.all(promises);
        }).catch(lord.handleError);
    }).then(function() {
        return c.node;
    });
};

lord.updatePost = function(postNumber) {
    var post = lord.id(postNumber);
    if (!post)
        return Promise.reject("noSuchPostErrorText");
    var boardName = lord.data("boardName");
    return lord.api("post", {
        boardName: boardName,
        postNumber: postNumber
    }).then(function(model) {
        return lord.createPostNode(model, true);
    }).then(function(newPost) {
        post.parentNode.replaceChild(newPost, post);
        return Promise.resolve();
    });
};

lord.clearFileInput = function(div) {
    if (!div)
        return;
    lord.queryOne("img.postformFilePreview", div).src = "/" + lord.data("sitePathPrefix") + "img/addfile.png";
    lord.removeChildren(lord.queryOne("span.postformFileText", div));
    lord.removeFileHash(div);
    if (div.hasOwnProperty("fileInput"))
        delete div.fileInput;
    if (div.hasOwnProperty("file"))
        delete div.file;
    if (div.hasOwnProperty("fileUrl"))
        delete div.fileUrl;
};

lord.readableSize = function(sz) {
    sz = +sz;
    if (isNaN(sz))
        return "";
    if (sz / 1024 >= 1) {
        sz /= 1024;
        if (sz / 1024 >= 1) {
            sz = (sz / 1024).toFixed(1);
            sz += " " + lord.text("megabytesText");
        } else {
            sz = sz.toFixed(1);
            sz += " " + lord.text("kilobytesText");
        }
    } else {
        sz = sz.toString();
        sz += " " + lord.text("bytesText");
    }
    return sz;
};

lord.getFileHashes = function(div) {
    if (!div)
        return;
    var form = $(div).closest("form")[0];
    if (!form)
        return;
    return lord.nameOne("fileHashes", form);
};

lord.hideImage = function() {
    if (lord.img) {
        if (lord.isAudioType(lord.img.mimeType) || lord.isVideoType(lord.img.mimeType)) {
            lord.setLocalObject("audioVideoVolume", +lord.img.volume);
            lord.img.pause();
            lord.img.load();
        }
        lord.imgWrapper.style.display = "none";
        lord.img = null;
        lord.query(".leafButton").forEach(function(a) {
            a.style.display = "none";
        });
    }
};

lord.globalOnclick = function(e) {
    if (e.button)
        return;
    if (lord.currentMenu && (!e.target || !lord.hasClass(e.target, "ui-widget-header"))) {
        lord.currentMenu.hide();
        lord.currentMenu = null;
    }
    var t = e.target;
    if (t && lord.img && t == lord.img)
        return;
    while (t) {
        if ("mobile" == lord.deviceType() && "A" == t.tagName) {
            var boardName = lord.data("boardName", t);
            var postNumber = +lord.data("postNumber", t);
            if (!isNaN(postNumber) && postNumber > 0 && /^>>.*$/gi.test(t.textContent)) {
                e.preventDefault();
                lord.viewPost(t, boardName, postNumber);
                return false;
            }
        }
        if (t.tagName === "A" && (t.onclick || t.onmousedown || t.href))
            return;
        t = t.parentNode;
    }
    if (lord.deviceType("mobile")) {
        var post = lord.lastPostPreview;
        if (post && post.parentNode) {
            post.parentNode.removeChild(post);
            lord.lastPostPreview = post.previousPostPreview || null;
            if (!lord.lastPostPreview) {
                document.body.removeChild(lord.postPreviewMask);
                lord.postPreviewMask = null;
            }
            return;
        }
    }
    if (!lord.getLocalObject("closeFilesByClickingOnly", false)
        || (lord.img && lord.img.mimeType.replace("audio/", "") != lord.img.mimeType)) {
        lord.hideImage();
    }
};

lord.initFiles = function() {
    if (lord.files)
        return;
    lord.files = [];
    lord.filesMap = {};
    lord.query(".postFile").forEach(function(td) {
        var href = lord.data("href", td);
        var mimeType = lord.data("mimeType", td);
        if ("application/pdf" == mimeType)
            return;
        if (lord.getLocalObject("leafThroughImagesOnly", false) && !lord.isImageType(mimeType))
            return;
        lord.files.push({
            "href": href,
            "mimeType": mimeType,
            "width": +lord.data("width", td),
            "height": +lord.data("height", td)
        });
        lord.filesMap[href] = lord.files.length - 1;
    });
};

lord.nextOrPreviousFile = function(previous) {
    if (!lord.img || !lord.files || !lord.filesMap || lord.files.length < 1)
        return null;
    var href = lord.img.src;
    if (!href)
        href = lord.queryOne("source", lord.img).src;
    if (!href)
        return null;
    var ind = lord.filesMap[href];
    if (ind < 0)
        return null;
    if (!!previous)
        return lord.files[(ind > 0) ? (ind - 1) : (lord.files.length - 1)];
    else
        return lord.files[(ind < lord.files.length - 1) ? (ind + 1) : 0];
};

lord.addPostToHidden = function(boardName, postNumber, threadNumber) {
    postNumber = +postNumber;
    if (!boardName || isNaN(postNumber) || postNumber <= 0)
        return;
    var key = boardName + "/" + postNumber;
    var hiddenPosts = lord.getLocalObject("hiddenPosts", {});
    if (hiddenPosts.hasOwnProperty(key))
        return;
    hiddenPosts[key] = {
        boardName: boardName,
        postNumber: postNumber,
        threadNumber: threadNumber
    };
    lord.setLocalObject("hiddenPosts", hiddenPosts);
};

lord.tryHidePost = function(post, list) {
    if (!post)
        return;
    var postNumber = +post.id;
    if (isNaN(+postNumber))
        return;
    var boardName = lord.data("boardName");
    if (!list)
        list = lord.getLocalObject("hiddenPosts", {});
    if (!list[boardName + "/" + postNumber])
        return;
    lord.addClass(post, "hidden");
    var thread = lord.id("thread" + postNumber);
    if (!thread)
        return;
    lord.addClass(thread, "hidden");
    lord.strikeOutHiddenPostLinks();
};

lord.showHidePostForm = function(el) {
    var postForm = lord.id("postForm");
    var position = lord.data("position", el);
    var container = postForm.parentNode;
    var hide = ("postFormContainer" + position) == container.id;
    lord.hidePostForm();
    if (hide) {
        lord.lastPostFormPosition = "";
    } else {
        lord.id("postFormContainer" + position).appendChild(postForm);
        lord.lastPostFormPosition = position;
        lord.id("showHidePostFormButton" + position).innerHTML = lord.text("hidePostFormText");
    }
};

lord.quickReply = function(el) {
    var postNumber = +lord.data("number", el, true);
    if (isNaN(postNumber) || postNumber <= 0)
        return;
    var post = lord.id(postNumber);
    if (!post)
        return;
    var postForm = lord.id("postForm");
    var targetContainer = post.parentNode;
    var same = (postForm.parentNode == targetContainer
            && post.nextSibling && postForm.nextSibling == post.nextSibling.nextSibling);
    var selection = document.getSelection().toString();
    lord.hidePostForm();
    if (same)
        return;
    var inputThread = lord.nameOne("threadNumber", postForm);
    if (!inputThread) {
        inputThread = lord.node("input");
        inputThread.type = "hidden";
        inputThread.name = "threadNumber";
        inputThread.value = lord.data("threadNumber", el, true);
        postForm.appendChild(inputThread);
        postForm.action = postForm.action.replace("createThread", "createPost");
    }
    if (post.nextSibling)
        targetContainer.insertBefore(postForm, post.nextSibling);
    else
        targetContainer.appendChild(postForm);
    lord.insertPostNumber(postNumber);
    lord.quoteSelectedText(selection);
    var tripcode = lord.nameOne("tripcode", postForm);
    if (tripcode) {
        var threadNumber = lord.nameOne("threadNumber", postForm);
        tripcode.checked = lord.showTripcode(threadNumber ? threadNumber.value : null);
        $(tripcode).button("refresh");
    }
};

lord.hidePostForm = function() {
    var postForm = lord.id("postForm");
    if (!lord.data("threadNumber")) {
        var inputThread = lord.nameOne("threadNumber", postForm);
        if (inputThread)
            inputThread.parentNode.removeChild(inputThread);
        postForm.action = postForm.action.replace("createPost", "createThread");
    }
    var container = postForm.parentNode;
    lord.id("hiddenPostForm").appendChild(postForm);
    ["Top", "Bottom"].forEach(function(position) {
        if (("postFormContainer" + position) == container.id) {
            lord.id("showHidePostFormButton" + position).innerHTML = lord.text("showPostFormText");
        }
    });
};

lord.switchShowTripcode = function() {
    var postForm = lord.id("postForm");
    var sw = lord.nameOne("tripcode", postForm);
    var showTripcode = lord.getLocalObject("showTripcode", {});
    var key;
    var threadNumber = lord.nameOne("threadNumber", postForm);
    if (threadNumber) {
        lord.showPopup(lord.text(sw.checked ? "threadTripcodeActivatedText" : "threadTripcodeDeactivatedText"));
        key = lord.data("boardName") + "/" + +threadNumber.value;
    } else {
        lord.showPopup(lord.text(sw.checked ? "globalTripcodeActivatedText" : "globalTripcodeDeactivatedText"));
        key = "global";
    }
    if (sw.checked)
        showTripcode[key] = true;
    else if (showTripcode.hasOwnProperty(key))
        delete showTripcode[key];
    lord.setLocalObject("showTripcode", showTripcode);
};

lord.countSymbols = function(textarea) {
    if (!textarea)
        return;
    var span = lord.queryOne(".symbolCounter", textarea.parentNode);
    span = lord.nameOne("used", span);
    if (span.childNodes.length > 0)
        span.removeChild(span.childNodes[0]);
    span.appendChild(lord.node("text", textarea.value.length.toString()));
};

lord.showPostSourceText = function(el) {
    var boardName = lord.data("boardName", el, true);
    var postNumber = +lord.data("number", el, true);
    if (!boardName || isNaN(postNumber) || postNumber <= 0)
        return;
    lord.api("post", {
        boardName: boardName,
        postNumber: postNumber
    }).then(function(post) {
        var textArea = lord.node("textarea");
        textArea.value = post.rawText;
        textArea.rows = "28";
        textArea.cols = "43";
        return lord.showDialog(textArea, {
            title: "postSourceText",
            buttons: ["close"]
        });
    }).catch(lord.handleError);
};

lord.chatWithUser = function(el) {
    var boardName = lord.data("boardName", el, true);
    if (!boardName)
        return;
    var postNumber = +lord.data("number", el, true);
    if (!postNumber)
        return;
    var div = lord.node("div");
    var ta = lord.node("textArea");
    ta.rows = 10;
    ta.cols = 43;
    div.appendChild(ta);
    lord.showDialog(div, { title: "chatText" }).then(function(result) {
        if (!result)
            return Promise.resolve();
        if (!ta.value)
            return Promise.resolve();
        var formData = new FormData();
        formData.append("boardName", lord.data("boardName"));
        formData.append("postNumber", postNumber);
        formData.append("text", ta.value);
        return lord.post("/" + lord.data("sitePathPrefix") + "action/sendChatMessage", formData);
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        lord.checkChats();
    }).catch(lord.handleError);
};

lord.deletePost = function(el) {
    var c = {};
    var postNumber = +lord.data("number", el, true);
    var model = lord.model(["base", "tr"], true);
    model.boardName = lord.data("boardName", el, true);
    model.postNumber = postNumber;
    c.div = lord.node("div");
    c.div.appendChild(lord.node("text", lord.text("enterPasswordText")));
    c.div.appendChild(lord.node("br"));
    c.div.appendChild(lord.template("deletePostDialog", model));
    lord.showDialog(c.div, { title: "enterPasswordTitle" }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        var formData = new FormData(form);
        if (lord.data("archived", el, true) == "true")
            formData.append("archived", true);
        return lord.post(form.action, formData);
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var post = lord.id(postNumber);
        if (!post)
            return Promise.reject("noSuchPostErrorText");
        if (lord.data("isOp", post)) {
            if (!isNaN(+lord.data("threadNumber"))) {
                window.location = window.location.protocol + "//" + model.site.domain + "/" + model.site.pathPrefix
                    + lord.data("boardName") + ((lord.data("archived", el, true) == "true") ? "/archive.html" : "");
            } else {
                lord.reloadPage();
            }
        } else {
            post.parentNode.removeChild(post);
        }
        lord.removeReferences(postNumber);
    }).catch(lord.handleError);
};

lord.setThreadFixed = function(el, fixed) {
    var formData = new FormData();
    formData.append("boardName", lord.data("boardName"));
    formData.append("threadNumber", lord.data("number", el, true));
    formData.append("fixed", fixed);
    lord.post("/" + lord.data("sitePathPrefix") + "action/setThreadFixed", formData).then(function(result) {
        lord.reloadPage();
    }).catch(lord.handleError);
};

lord.setThreadClosed = function(el, closed) {
    var formData = new FormData();
    formData.append("boardName", lord.data("boardName"));
    formData.append("threadNumber", lord.data("number", el, true));
    formData.append("closed", closed);
    lord.post("/" + lord.data("sitePathPrefix") + "action/setThreadClosed", formData).then(function(result) {
        lord.reloadPage();
    }).catch(lord.handleError);
};

lord.setThreadUnbumpable = function(el, unbumpable) {
    var postNumber = +lord.data("number", el, true);
    var formData = new FormData();
    formData.append("boardName", lord.data("boardName"));
    formData.append("threadNumber", postNumber);
    formData.append("unbumpable", unbumpable);
    lord.post("/" + lord.data("sitePathPrefix") + "action/setThreadUnbumpable",
        formData).then(function(result) {
        lord.removeReferences(postNumber, true);
        return lord.updatePost(postNumber);
    }).catch(lord.handleError);
};

lord.moveThread = function(el) {
    var boardName = lord.data("boardName");
    var threadNumber = +lord.data("threadNumber", el, true);
    if (!boardName || isNaN(threadNumber) || threadNumber <= 0)
        return;
    var c = {};
    var model = lord.model(["base", "tr", "boards"], true);
    model.boardName = boardName;
    model.threadNumber = threadNumber;
    c.div = lord.template("moveThreadDialog", model);
    lord.showDialog(c.div, { title: "moveThreadText" }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        return lord.post(form.action, new FormData(form));
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        window.location = "/" + lord.data("sitePathPrefix") + result.boardName + "/res/" + result.threadNumber
            + ".html";
    }).catch(lord.handleError);
};

lord.banUser = function(el) {
    var boardName = lord.data("boardName", el, true);
    var postNumber = +lord.data("number", el, true);
    if (!boardName || isNaN(postNumber) || postNumber <= 0)
        return;
    var c = {};
    c.model = lord.model(["base", "tr", "boards"], true);
    var settings = lord.settings();
    var locale = c.model.site.locale;
    var timeOffset = ("local" == settings.time) ? +settings.timeZoneOffset : c.model.site.timeOffset;
    c.model.settings = settings;
    c.model.formattedDate = function(date) {
        return moment(date).utcOffset(timeOffset).locale(locale).format("DD/MM/YYYY HH:mm");
    };
    lord.api("userIp", {
        boardName: boardName,
        postNumber: postNumber
    }).then(function(ip) {
        if (!ip)
            return Promise.reject("noSuchPostErrorText");
        c.userIp = ip.ipv4 || ip.ip;
        return lord.api("bannedUser", { ip: c.userIp });
    }).then(function(model) {
        if (model)
            c.model.bannedUser = model;
        c.model.boardName = boardName;
        c.model.postNumber = postNumber;
        c.model.userIp = c.userIp;
        c.div = lord.template("userBan", c.model);
        lord.query("[name='expires'], [name^='banExpires_']", c.div).forEach(function(inp) {
            $(inp).change(function(){
                $(this).attr("value", $(inp).val());
            });
            $(inp).datetimepicker({
                i18n: { format: "YYYY/MM/DD HH:mm" },
                mask: true,
                value: inp.value
            });
        });
        $(".xdsoft_datetimepicker").css("zIndex", 11000);
        return lord.showDialog(c.div, { title: "banUserText" });
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        return lord.post(form.action, new FormData(form));
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        return lord.updatePost(postNumber);
    }).catch(lord.handleError);
};

lord.clearDate = function(inputName) {
    var inp = lord.queryOne("[name='" + inputName + "']");
    inp.value = "____/__/__ __:__";
    $(inp).attr("value", "");
};

lord.bansSelectAll = function(e, btn) {
    e.preventDefault();
    var form = btn.parentNode;
    var levelInd = lord.nameOne("level", form).selectedIndex;
    var expires = lord.nameOne("expires", form).value;
    var reason = lord.nameOne("reason", form).value;
    lord.query("div", form).forEach(function(div) {
        lord.queryOne("select", div).selectedIndex = levelInd;
        lord.query("input", div).forEach(function(inp) {
            if (inp.name.substr(0, 11) == "banExpires_") {
                inp.value = expires;
                $(inp).attr("value", expires);
            } else if (inp.name.substr(0, 10) == "banReason_") {
                inp.value = reason;
            }
        });
    });
};

lord.delall = function(e, form) {
    e.preventDefault();
    var boardName = lord.nameOne("boardName", form);
    boardName = boardName.options[boardName.selectedIndex].value;
    if (!boardName)
        return;
    lord.post(form.action, new FormData(form)).then(function(result) {
        if (!result)
            return Promise.resolve();
        window.location = "/" + lord.data("sitePathPrefix") + (("*" != boardName) ? boardName : "");
        return Promise.resolve();
    }).catch(lord.handleError);
};

lord.insertPostNumber = function(postNumber) {
    try {
        var field = lord.nameOne("text", lord.id("postForm"));
        var value = ">>" + postNumber + "\n";
        if (document.selection) {
            var sel = document.selection.createRange();
            sel.text = value;
        } else if (field.selectionStart || field.selectionStart == "0") {
            var startPos = field.selectionStart;
            var endPos = field.selectionEnd;
            field.value = field.value.substring(0, startPos) + value + field.value.substring(endPos);
            var pos = ((startPos < endPos) ? startPos : endPos) + value.length;
            field.setSelectionRange(pos, pos);
        } else {
            field.value += value;
        }
        field.focus();
    } catch (err) {
        console.log(err);
    }
};

lord.addFiles = function(el) {
    var postNumber = +lord.data("number", el, true);
    if (isNaN(postNumber) || postNumber <= 0)
        return;
    var post = lord.id(postNumber);
    if (!post)
        return;
    var boardName = lord.data("boardName");
    var c = {};
    var model = lord.model(["base", "tr", "board/" + boardName], true);
    model.settings = lord.settings();
    model.boardName = boardName;
    model.postNumber = postNumber;
    model.fileCount = +lord.data("fileCount", el, true);
    model.minimalisticPostform = function() {
        return model.settings.minimalisticPostform;
    };
    c.div = lord.template("addFilesDialog", model);
    lord.showDialog(c.div, { title: "addFilesText" }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        var formData = new FormData(form);
        lord.query(".postformFile", form).forEach(function(div) {
            if (div.file)
                formData.append(div.fileName || "file", div.file);
            else if (div.fileUrl)
                formData.append(div.fileName, div.fileUrl);
        });
        return lord.post(form.action, formData, c);
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        c.progressBar.hide();
        return lord.updatePost(postNumber);
    }).catch(function(err) {
        if (c.progressBar)
            c.progressBar.hide();
        lord.handleError(err);
    });
};

lord.editPost = function(el) {
    var boardName = lord.data("boardName", el, true);
    var postNumber = +lord.data("number", el, true);
    var c = {};
    lord.api("post", {
        boardName: boardName,
        postNumber: postNumber
    }).then(function(post) {
        c.model = { post: post };
        return lord.api("threadInfo", {
            boardName: post.boardName,
            threadNumber: post.threadNumber
        });
    }).then(function(thread) {
        c.model.thread = thread;
        c.model = merge.recursive(c.model, lord.model(["base", "tr", "board/" + boardName], true));
        c.model.settings = lord.settings();
        c.model.compareRegisteredUserLevels = lord.compareRegisteredUserLevels;
        c.model.customEditPostDialogPart = lord.customEditPostDialogPart;
        c.div = lord.template("editPostDialog", c.model);
        var textField = $("[name='text']", c.div);
        $(c.div).css("visibility", "hidden");
        $(c.div).css("position", "absolute");
        document.body.appendChild(c.div);
        textField.css("minWidth", textField.width() + 20);
        textField.css("minHeight", 50);
        document.body.removeChild(c.div);
        $(c.div).css("visibility", "");
        $(c.div).css("position", "");
        return lord.showDialog(c.div, { title: "editPostText" });
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        return lord.post(form.action, new FormData(form));
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        lord.removeReferences(postNumber, true);
        return lord.updatePost(postNumber);
    }).catch(lord.handleError);
};

lord.setPostHidden = function(el) {
    var boardName = lord.data("boardName", el, true);
    var postNumber = +lord.data("number", el, true);
    var threadNumber = +lord.data("threadNumber", el, true);
    if (!boardName || isNaN(postNumber) || postNumber < 1 || isNaN(threadNumber) || threadNumber < 1)
        return;
    var post = lord.id(postNumber);
    if (!post)
        return;
    var thread = lord.id("thread" + postNumber);
    var hidden = lord.hasClass(post, "hidden");
    var f = !hidden ? lord.addClass : lord.removeClass;
    f(post, "hidden");
    if (thread)
        f(thread, "hidden");
    var list = lord.getLocalObject("hiddenPosts", {});
    if (!hidden) {
        lord.addPostToHidden(boardName, postNumber, threadNumber);
    } else if (list[boardName + "/" + postNumber]) {
        delete list[boardName + "/" + postNumber];
        lord.setLocalObject("hiddenPosts", list);
    }
    lord.strikeOutHiddenPostLinks();
};

lord.hideByImage = function(a) {
    if (!a)
        return;
    var file = $(a).closest(".postFile")[0];
    if (!file)
        return;
    var c = {};
    lord.doWork("getImageHash", {
        href: lord.data("href", file),
        width: +lord.data("width", file),
        height: +lord.data("height", file)
    }).then(function(hash) {
        if (!hash)
            return Promise.reject("failedToGenerateHashErrorText");
        c.hash = hash;
        var spells = lord.getLocalObject("spells", lord.DefaultSpells);
        if (spells && spells[spells.length - 1] != "\n")
            spells += "\n";
        spells += "#ihash(" + c.hash + ")";
        lord.setLocalObject("spells", spells);
        if (!lord.getLocalObject("spellsEnabled", true))
            return Promise.resolve();
        return lord.doWork("parseSpells", spells);
    }).then(function(spells) {
        if (!spells || !spells.root)
            return Promise.resolve();
        lord.spells = spells.root.spells;
        if (!lord.getLocalObject("spellsEnabled", true))
            return Promise.resolve();
        c.list = [];
        c.posts = lord.query(".post, .opPost");
        return lord.gently(c.posts, function(post) {
            var data = lord.getPostData(post);
            if (!data)
                return;
            c.list.push(data);
        }, {
            delay: 10,
            n: 10
        }).then(function() {
            return Promise.resolve(true);
        });
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        return lord.doWork("processPosts", {
            posts: c.list,
            spells: lord.spells
        });
    }).then(function(list) {
        if (!list)
            return Promise.resolve();
        var map = list.reduce(function(acc, data) {
            acc[data.postNumber] = data;
            return acc;
        }, {});
        c.posts.forEach(function(post) {
            var data = map[+post.id];
            lord.processPost(post, data);
        });
        return Promise.resolve();
    }).catch(lord.handleError);
};

lord.deleteFile = function(el) {
    var model = lord.model(["base", "tr"], true);
    model.fileName = lord.data("fileName", el, true);
    var div = lord.node("div");
    div.appendChild(lord.node("text", lord.text("enterPasswordText")));
    div.appendChild(lord.node("br"));
    div.appendChild(lord.template("deleteFileDialog", model));
    lord.showDialog(div, { title: "enterPasswordTitle" }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", div);
        return lord.post(form.action, new FormData(form));
    }).then(function(result) {
        return lord.updatePost(+lord.data("number", el, true));
    }).catch(lord.handleError);
};

lord.editAudioTags = function(el) {
    var fileName = lord.data("fileName", el, true);
    var c = {};
    lord.api("fileInfo", { fileName: fileName }).then(function(fileInfo) {
        c.model = merge.recursive({ fileInfo: fileInfo }, lord.model(["base", "tr"], true));
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
        return lord.updatePost(+lord.data("number", el, true));
    }).catch(lord.handleError);
};

lord.addToPlaylist = function(a) {
    var boardName = lord.data("boardName", a, true);
    var fileName = lord.data("fileName", a, true);
    var trackList = lord.getLocalObject("playlist/trackList", []);
    for (var i = 0; i < trackList.length; ++i) {
        var track = trackList[i];
        if (boardName == track.boardName && fileName == track.fileName)
            return;
    }
    trackList.push({
        boardName: boardName,
        fileName: fileName,
        mimeType: lord.data("mimeType", a, true),
        bitrate: lord.data("bitrate", a, true),
        duration: lord.data("duration", a, true),
        album: lord.data("audioTagAlbum", a, true),
        artist: lord.data("audioTagArtist", a, true),
        title: lord.data("audioTagTitle", a, true),
        year: lord.data("audioTagYear", a, true)
    });
    lord.setLocalObject("playlist/trackList", trackList);
};

lord.viewPost = function(a, boardName, postNumber, hiddenPost) {
    var previousPostPreview = lord.lastPostPreview;
    var post;
    if (boardName == lord.data("boardName"))
        post = lord.id(postNumber);
    var p;
    if (post) {
        post = post.cloneNode(true);
        var actions = lord.nameOne("postActionsContainer", post);
        if (actions)
            actions.parentNode.removeChild(actions);
        var qr = lord.nameOne("quickReplyContainer", post);
        if (qr)
            qr.parentNode.removeChild(qr);
        lord.name("toThread", post).forEach(lord.removeSelf.bind(lord));
        lord.removeClass(post, "opPost hidden");
        lord.addClass(post, "post temporary");
        p = Promise.resolve(post);
    } else {
        p = lord.api("post", {
            boardName: boardName,
            postNumber: postNumber
        }).then(function(post) {
            return lord.createPostNode(post, false);
        });
    }
    p.then(function(post) {
        if (!lord.deviceType("mobile")) {
            post.onmouseout = function(event) {
                var next = post;
                while (next) {
                    var list = lord.traverseChildren(next);
                    var e = event.toElement || event.relatedTarget;
                    if (list.indexOf(e) >= 0)
                        return;
                    next = next.nextPostPreview;
                }
                if (post.parentNode)
                    post.parentNode.removeChild(post);
                if (post.previousPostPreview)
                    post.previousPostPreview.onmouseout(event);
            };
            post.onmouseover = function(event) {
                post.mustHide = false;
            };
        }
        post.previousPostPreview = lord.lastPostPreview;
        if (lord.lastPostPreview)
            lord.lastPostPreview.nextPostPreview = post;
        lord.lastPostPreview = post;
        post.mustHide = true;
        if (lord.lastPostPreviewTimer) {
            clearTimeout(lord.lastPostPreviewTimer);
            lord.lastPostPreviewTimer = null;
        }
        post.style.width = "auto";
        document.body.appendChild(post);
        if (!lord.deviceType("mobile")) {
            post.style.position = "absolute";
            var doc = document.documentElement;
            var coords = a.getBoundingClientRect();
            var linkCenter = coords.left + (coords.right - coords.left) / 2;
            if (linkCenter < 0.6 * doc.clientWidth) {
                post.style.maxWidth = doc.clientWidth - linkCenter + "px";
                post.style.left = linkCenter + "px";
            } else {
                post.style.maxWidth = linkCenter + "px";
                post.style.left = linkCenter - $(post).width() + "px";
            }
            var scrollTop = doc.scrollTop;
            if (!scrollTop) //NOTE: Workaround for Chrome/Safari. I really HATE you, HTML/CSS/JS!
                scrollTop = document.body.scrollTop;
            post.style.top = (doc.clientHeight - coords.bottom >= $(post).height())
                ? (scrollTop + coords.bottom - 4 + "px")
                : (scrollTop + coords.top - $(post).height() - 4 + "px");
            post.style.zIndex = previousPostPreview ? previousPostPreview.style.zIndex : (hiddenPost? 11000 : 9001);
        } else {
            lord.addClass(post, "cursorPointer");
            post.style.position = "fixed";
            lord.toCenter(post, null, null, 1);
            post.style.zIndex = previousPostPreview ? previousPostPreview.style.zIndex : (hiddenPost? 11000 : 9001);
            if (!lord.postPreviewMask) {
                lord.postPreviewMask = lord.node("div");
                lord.postPreviewMask.className = "temporaryPostOverlayMask cursorPointer";
                document.body.appendChild(lord.postPreviewMask);
            }
        }
    }).catch(lord.handleError);
};

lord.fileDragOver = function(e, div) {
    e.preventDefault();
    lord.addClass(div, "drag");
    return false;
};

lord.fileDragLeave = function(e, div) {
    e.preventDefault();
    lord.removeClass(div, "drag");
    return false;
};

lord.removeFileHash = function(div) {
    if (!div || !div.fileHash)
        return;
    var fileHashes = lord.getFileHashes(div);
    if (!fileHashes)
        return;
    var list = (fileHashes.value || "").split(",");
    var ind = list.indexOf(div.fileHash);
    if (ind >= 0)
        list.splice(ind, 1);
    fileHashes.value = list.join(",");
    delete div.fileHash;
};

lord.removeExifData = function(data) {
    return new Promise(function(resolve, reject) {
        try {
            var dv = new DataView(data);
            var offset = 0;
            var recess = 0;
            var pieces = [];
            var i = 0;
            if (dv.getUint16(offset) != 0xffd8)
                return resolve();
            offset += 2;
            var app1 = dv.getUint16(offset);
            offset += 2;
            while (offset < dv.byteLength) {
                if (app1 == 0xffe1) {
                    pieces[i] = {
                        "recess": recess,
                        "offset": offset - 2
                    };
                    recess = offset + dv.getUint16(offset);
                    i++;
                } else if (app1 == 0xffda) {
                    break;
                }
                offset += dv.getUint16(offset);
                var app1 = dv.getUint16(offset);
                offset += 2;
            }
            if (pieces.length <= 0)
                return resolve();
            var newPieces = [];
            pieces.forEach(function(v) {
                newPieces.push(data.slice(v.recess, v.offset));
            });
            newPieces.push(data.slice(recess));
            resolve(newPieces);
        } catch (err) {
            reject(err);
        }
    });
};

lord.fileAddedCommon = function(div) {
    if (!div || (!div.file && !div.fileUrl))
        return;
    var warn = function() {
        var txt = lord.text("fileTooLargeWarningText") + " (>" + lord.readableSize(+lord.data("maxFileSize")) + ")";
        lord.showPopup(txt, {type: "warning"});
    };
    var fileName = div.file ? div.file.name : div.fileUrl.split("/").pop();
    var fileNameFull = fileName;
    fileName = (fileName || "");
    if (fileName.length > 30)
        fileName = fileName.substr(0, 27) + "...";
    var p;
    if (div.file) {
        p = Promise.resolve("(" + lord.readableSize(div.file.size) + ")");
        if (+div.file.size > +lord.data("maxFileSize"))
            warn();
    } else if (div.fileUrl.replace("vk://", "") != div.fileUrl) {
        p = Promise.resolve(fileName + " [VK]");
    } else {
        p = lord.api("fileHeaders", { url: encodeURIComponent(div.fileUrl) }).then(function(headers) {
            var size = +headers["content-length"];
            if (!size)
                return Promise.resolve("");
            return lord.readableSize(size);
        }).then(function(txt) {
            if (!txt)
                return Promise.resolve("[URL]");
            return Promise.resolve("(" + txt + ") [URL]");
        }).catch(function(err) {
            lord.handleError(err);
            return Promise.resolve("[URL]");
        });
    }
    p.then(function(txt) {
        txt = fileName + " " + txt;
        lord.queryOne(".postformFileText", div).appendChild(lord.node("text", txt));
    }).catch(lord.handleError);
    var _uuid = uuid.v1();
    div.fileName = "file_" + (div.fileUrl ? "url_" : "") + _uuid;
    var ratingSelect = lord.queryOne("[name='ratingSelectContainer'] > select", div);
    if (ratingSelect)
        ratingSelect.name = "file_" + _uuid + "_rating";
    lord.removeFileHash(div);
    var prefix = lord.data("sitePathPrefix");
    if (div.file && lord.getLocalObject("checkFileExistence", true)) {
        var c = {};
        lord.readAs(div.file).then(function(data) {
            div.fileHash = sha1(data);
            return lord.api("fileExistence", { fileHash: div.fileHash });
        }).then(function(exists) {
            if (!exists)
                return;
            div.fileName = "file_" + (div.fileUrl ? "url_" : "") + div.fileHash;
            var ratingSelect = lord.queryOne("[name='ratingSelectContainer'] > select", div);
            if (ratingSelect)
                ratingSelect.name = "file_" + div.fileHash + "_rating";
            var img = lord.node("img");
            img.src = "/" + prefix + "img/storage.png";
            lord.addClass(img, "signImage");
            img.title = lord.text("fileExistsOnServerText");
            lord.queryOne("span", div).appendChild(lord.node("text", " "));
            lord.queryOne("span", div).appendChild(img);
            var fileHashes = lord.getFileHashes(div);
            if (fileHashes.value.indexOf(div.fileHash) < 0)
                fileHashes.value = fileHashes.value + (fileHashes.value.length > 0 ? "," : "") + div.fileHash;
            if (div.hasOwnProperty("fileInput"))
                delete div.fileInput;
            if (div.hasOwnProperty("file"))
                delete div.file;
        }).catch(lord.handleError);
    }
    var preview = function() {
        if (!div.file)
            return;
        lord.readAs(div.file, "DataURL").then(function(url) {
            var img = lord.queryOne("img", div);
            img.src = url;
            if ("neutron" == lord.settings().style.name)
                lord.addClass(img, "noInvert");
        }).catch(lord.handleError);
    };
    if (fileNameFull.match(/\.(jpe?g|png|gif)$/i) && lord.getLocalObject("showAttachedFilePreview", true)) {
        if (!fileName.match(/\.(jpe?g)$/i) || !lord.getLocalObject("stripExifFromJpeg", true))
            preview();
    } else {
        var match = fileNameFull.match(/\.(jpe?g|png|gif|mpeg|mp1|m1a|m2a|mpa|mp3|mpg|mp4|ogg|ogv|webm|wav|pdf)$/i);
        if (match) {
            var extension = match[1].replace("jpg", "jpeg").replace("ogv", "ogg");
            ["mpeg", "mp1", "m1a", "m2a", "mpa", "mpg"].forEach(function(alias) {
                extension = extension.replace(alias, "mp3");
            });
            lord.queryOne("img", div).src = "/" + prefix + "img/" + extension + "_file.png";
        } else {
            lord.queryOne("img", div).src = "/" + prefix + "img/file.png";
        }
    }
    if (div.file && fileNameFull.match(/\.(jpe?g)$/i) && lord.getLocalObject("stripExifFromJpeg", true)) {
        lord.readAs(div.file).then(function(data) {
            return lord.removeExifData(data);
        }).then(function(pieces) {
            if (pieces) {
                if (typeof window.File == "function")
                    div.file = new File(pieces, div.file.name, {"type": "image/jpeg"});
                else
                    div.file = new Blob(pieces, {"type": "image/jpeg"});
            }
            if (lord.getLocalObject("showAttachedFilePreview", true))
                preview();
        }).catch(lord.handleError);
    }
    if (div.hasOwnProperty("fileInput"))
        delete div.fileInput;
    lord.queryOne("a.postformFileRemoveButton", div).style.display = "inline";
    var maxCount = +lord.data("maxFileCount");
    maxCount -= +lord.data("fileCount", div, true) || 0;
    if (maxCount <= 0)
        return;
    var parent = div.parentNode;
    if (parent.children.length >= maxCount)
        return;
    for (var i = 0; i < parent.children.length; ++i) {
        var c = parent.children[i];
        if (!c.fileHash && !c.file && !c.fileUrl)
            return;
        lord.queryOne("a.postformFileRemoveButton", c).style.display = "inline";
    }
    var ndiv = div.cloneNode(true);
    lord.queryOne("a.postformFileRemoveButton", ndiv).style.display = "none";
    lord.clearFileInput(ndiv);
    parent.appendChild(ndiv);
};

lord.fileDrop = function(e, div) {
    e.preventDefault();
    lord.removeClass(div, "drag");
    lord.clearFileInput(div);
    var dt = e.dataTransfer;
    if (lord.in(dt.types, "text/uri-list")) {
        div.fileUrl = dt.getData("text/uri-list");
        lord.fileAddedCommon(div);
    } else if (dt.files) {
        var file = e.dataTransfer.files[0];
        div.file = file;
        lord.fileAddedCommon(div);
    }
    return false;
};

lord.fileSelected = function(div) {
    if (!div.fileInput.value)
        return lord.removeFile(div);
    var file = div.fileInput.files[0];
    lord.clearFileInput(div);
    div.file = file;
    lord.fileAddedCommon(div);
};

lord.attachFileByLink = function(a) {
    var div = a.parentNode;
    var url = prompt(lord.text("linkLabelText"), div.fileUrl);
    if (null === url)
        return;
    lord.clearFileInput(div);
    div.fileUrl = url;
    lord.fileAddedCommon(div);
};

lord.attachFileByVk = function(a) {
    var div = a.parentNode;
    VK.Auth.getLoginStatus(function(response) {
        if (!response.session || !response.session.mid)
            return;
        var uid = response.session.mid;
        VK.Api.call("audio.get", {owner_id: uid}, function(response) {
            if (!response.response)
                return;
            response = response.response.slice(1);
            var c = {};
            c.div = lord.template("vkAudioList", { tracks: response });
            lord.showDialog(c.div, { title: "selectTrackTitle" }).then(function(result) {
                if (!result)
                    return Promise.resolve();
                var trackId = +lord.queryOne("input[name='track']:checked", c.div).value;
                if (!trackId)
                    return Promise.resolve();
                var title;
                response.forEach(function(track) {
                    if (title)
                        return;
                    if (track.aid != trackId)
                        return;
                    title = track.title;
                });
                lord.clearFileInput(div);
                div.fileUrl = "vk://" + uid + "_" + trackId + "/" + (title || "unknown");
                lord.fileAddedCommon(div);
            }).catch(lord.handleError);
        });
    });
};

lord.removeFile = function(div) {
    if (!div)
        return;
    if ("DIV" != div.tagName)
        div = div.parentNode;
    var parent = div.parentNode;
    if (parent.children.length > 1) {
        lord.removeFileHash(div);
        parent.removeChild(div);
    } else {
        lord.clearFileInput(div);
        lord.queryOne("a.postformFileRemoveButton", div).style.display = "none";
    }
};

lord.browseFile = function(e, div) {
    if (!div.fileInput) {
        div.fileInput = lord.node("input");
        div.fileInput.type = "file";
        div.accept = lord.model("board/" + lord.data("boardName")).board.supportedFileTypes.join(",");
        div.fileInput.onchange = function() {
            return lord.fileSelected(div);
        };
    }
    var a = e.target;
    while (a) {
        if (a.tagName === "A" || a.tagName === "SELECT" || a.tagName === "OPTION")
            return;
        a = a.parentNode;
    }
    div.fileInput.click();
};

lord.setPostformRulesVisible = function(visible) {
    var hide = !visible;
    lord.setCookie("hidePostformRules", hide, {
        "expires": lord.Billion, "path": "/"
    });
    lord.query(".postformRules > ul").forEach(function(ul) {
        ul.style.display = hide ? "none" : "";
    });
    var a = lord.queryOne("a.hidePostformRulesButton");
    var aa = lord.node("a");
    lord.addClass(aa, "hidePostformRulesButton");
    aa.onclick = lord.setPostformRulesVisible.bind(lord, hide);
    aa.appendChild(lord.node("text", lord.text(hide ? "showPostformRulesText" : "hidePostformRulesText")));
    a.parentNode.replaceChild(aa, a);
};

lord.quoteSelectedText = function(selection) {
    try {
        var field = lord.nameOne("text", lord.id("postForm"));
        var value = "";
        var pos = 0;
        if (document.getSelection()) {
            value = "";
            var sel = lord.arr((selection || document.getSelection().toString()).split("\n")).forEach(function(line) {
                if ("" != line)
                    value += ">" + line;
                value += "\n";
            });
            value = value.substr(0, value.length - 1);
        }
        if ("" == value)
            value += ">";
        value += "\n";
        if (typeof selection != "undefined" && selection.length < 1)
            return;
        if (field.selectionStart || field.selectionStart == "0") {
            var startPos = field.selectionStart;
            var endPos = field.selectionEnd;
            field.value = field.value.substring(0, startPos) + value + field.value.substring(endPos);
            pos = ((startPos < endPos) ? startPos : endPos) + value.length;
        } else {
            field.value += value;
        }
        field.setSelectionRange(pos, pos);
        field.focus();
    } catch (ex) {
        //Do nothing
    }
};

lord.markup = function(tag) {
    var wrap = function(opTag, clTag) {
        if (!opTag || !clTag)
            return;
        try {
            var field = lord.nameOne("text", lord.id("postForm"));
            var pos = 0;
            if (field.selectionStart || field.selectionStart == "0") {
                var startPos = field.selectionStart;
                var endPos = field.selectionEnd;
                var selected = field.value.substring(startPos, endPos);
                var value = opTag + selected + clTag;
                field.value = field.value.substring(0, startPos) + value + field.value.substring(endPos);
                pos = ((startPos < endPos) ? startPos : endPos) + opTag.length;
                if (selected.length > 0)
                    pos += selected.length + clTag.length;
            } else {
                field.value += opTag + clTag;
                pos = field.value.length - clTag.length;
            }
            field.setSelectionRange(pos, pos);
            field.focus();
        } catch (ex) {
            //Do nothing
        }
    };
    switch (tag) {
    case "b":
    case "i":
    case "s":
    case "u":
    case "spoiler":
    case "ul":
    case "ol":
    case "li":
    case "sup":
    case "sub":
    case "raw-html":
    case "url": {
        wrap("[" + tag + "]", "[/" + tag + "]");
        break;
    }
    case "uld": {
        wrap("[ul type=disc]", "[/ul]");
        break;
    }
    case "ulc": {
        wrap("[ul type=circle]", "[/ul]");
        break;
    }
    case "uls": {
        wrap("[ul type=square]", "[/ul]");
        break;
    }
    case "ol1": {
        wrap("[ol type=1]", "[/ol]");
        break;
    }
    case "olI": {
        wrap("[ol type=I]", "[/ol]");
        break;
    }
    case "oli": {
        wrap("[ol type=i]", "[/ol]");
        break;
    }
    case "olA": {
        wrap("[ol type=A]", "[/ol]");
        break;
    }
    case "ola": {
        wrap("[ol type=a]", "[/ol]");
        break;
    }
    case ">": {
        lord.quoteSelectedText();
        break;
    }
    case "code": {
        var sel = lord.queryOne(".postformMarkup > span > [name='codeLang']");
        var lang = sel.options[sel.selectedIndex].value;
        wrap("[" + (("-" != lang) ? (tag + " lang=\"" + lang + "\"") : tag) + "]", "[/" + tag + "]");
        break;
    }
    default: {
        break;
    }
    }
};

lord.changeLastCodeLang = function() {
    var sel = lord.queryOne(".postformMarkup > span > [name='codeLang']");
    var lang = sel.options[sel.selectedIndex].value;
    lord.setLocalObject("lastCodeLang", lang);
};

lord.setPostformMarkupVisible = function(visible) {
    var tr = lord.nameOne("postformMarkup");
    if (!tr)
        return false;
    var hide = !visible;
    lord.setLocalObject("hidePostformMarkup", hide);
    tr.style.display = hide ? "none" : "";
    var a = lord.queryOne("a.hidePostformMarkupButton");
    if (!a)
        return false;
    lord.removeChildren(a);
    a.appendChild(lord.node("text", lord.text(hide ? "showPostformMarkupText" : "hidePostformMarkupText")));
    a.onclick = lord.setPostformMarkupVisible.bind(lord, hide);
    return false;
};

lord.fileWheelHandler = function(e) {
    var e = window.event || e; //NOTE: Old IE support
    e.preventDefault();
    var delta = lord.getLocalObject("imageZoomSensitivity", 25);
    if ((e.wheelDelta || -e.detail) < 0)
        delta *= -1;
    var k = 1;
    if (delta < 0) {
        while ((lord.imgWrapper.scale + (delta / k)) <= 0)
            k *= 10;
    } else {
        //NOTE: This is shitty, because floating point calculations are shitty
        var s = parseFloat((lord.imgWrapper.scale / (delta / k)).toString().substr(0, 5));
        while (!lord.nearlyEqual(s - Math.floor(s), 0, 1 / 1000000)) {
            k *= 10;
            s = parseFloat((lord.imgWrapper.scale / (delta / k)).toString().substr(0, 5));
        }
    }
    lord.imgWrapper.scale += (delta / k);
    lord.resetScale(lord.imgWrapper);
};

lord.fileWrapperOnmousedown = function(e) {
    if (e.button)
        return;
    e.preventDefault();
    if (lord.isAudioType(lord.img.mimeType))
        return;
    if (lord.isVideoType(lord.img.mimeType) && (lord.img.height - e.offsetY < 35))
        return;
    lord.img.moving = true;
    lord.img.wasPaused = lord.img.paused;
    lord.img.coord.x = e.clientX;
    lord.img.coord.y = e.clientY;
    lord.img.initialCoord.x = e.clientX;
    lord.img.initialCoord.y = e.clientY;
};

lord.fileWrapperOnmouseup = function(e) {
    if (e.button)
        return;
    e.preventDefault();
    if (!lord.img.moving)
        return;
    lord.img.moving = false;
    if (lord.img.initialCoord.x === e.clientX && lord.img.initialCoord.y === e.clientY) {
        if (lord.isAudioType(lord.img.mimeType) || lord.isVideoType(lord.img.mimeType)) {
            lord.img.pause();
            lord.img.currentTime = 0;
        }
        lord.imgWrapper.style.display = "none";
        lord.query(".leafButton").forEach(function(a) {
            a.style.display = "none";
        });
    } else if (!lord.img.wasPaused) {
        setTimeout(function() {
            if (lord.img.paused)
                lord.img.play();
        }, 10);
    }
};

lord.fileWrapperOnmousemove = function(e) {
    if (!lord.img.moving)
        return;
    e.preventDefault();
    var dx = e.clientX - lord.img.coord.x;
    var dy = e.clientY - lord.img.coord.y;
    lord.imgWrapper.style.left = (lord.imgWrapper.offsetLeft + dx) + "px";
    lord.imgWrapper.style.top = (lord.imgWrapper.offsetTop + dy) + "px";
    lord.img.coord.x = e.clientX;
    lord.img.coord.y = e.clientY;
};

lord.showImage = function(a, mimeType, width, height) {
    lord.hideImage();
    var href = a;
    if (typeof a != "string") {
        href = window.location.protocol + "//" + window.location.host + "/" + lord.data("sitePathPrefix")
            + lord.data("boardName", a, true) + "/src/" + lord.data("fileName", a, true);
        mimeType = lord.data("mimeType", a, true);
        width = +lord.data("width", a, true) || (lord.deviceType("mobile") ? 500 : 400);
        height = +lord.data("height", a, true);
    }
    lord.img = lord.images[href];
    if (lord.img) {
        lord.removeChildren(lord.imgWrapper);
        lord.imgWrapper.appendChild(lord.img);
        if (lord.isAudioType(mimeType)) {
            if (lord.deviceType("mobile"))
                lord.imgWrapper.scale = 60;
            else
                lord.imgWrapper.scale = 100;
        }
        lord.setInitialScale(lord.imgWrapper, width, height);
        lord.resetScale(lord.imgWrapper);
        lord.imgWrapper.style.display = "";
        lord.toCenter(lord.imgWrapper, width, height, 3);
        if (lord.isAudioType(lord.img.mimeType) || lord.isVideoType(lord.img.mimeType)) {
            setTimeout(function() {
                lord.img.play();
            }, 500);
        }
        if (lord.getLocalObject("showLeafButtons", true)) {
            lord.query(".leafButton").forEach(function(a) {
                a.style.display = "";
            });
        }
        return Promise.resolve();
    }
    var append = false;
    if (!lord.imgWrapper) {
        lord.imgWrapper = lord.node("div");
        lord.addClass(lord.imgWrapper, "movableImage");
        if (lord.imgWrapper.addEventListener) {
            lord.imgWrapper.addEventListener("mousewheel", lord.fileWheelHandler, false); //IE9, Chrome, Safari, Opera
            lord.imgWrapper.addEventListener("DOMMouseScroll", lord.fileWheelHandler, false); //Firefox
        } else {
            lord.imgWrapper.attachEvent("onmousewheel", lord.fileWheelHandler); //IE 6/7/8
        }
        lord.imgWrapper.onmousedown = lord.fileWrapperOnmousedown;
        lord.imgWrapper.onmouseup = lord.fileWrapperOnmouseup;
        lord.imgWrapper.onmousemove = lord.fileWrapperOnmousemove;
        append = true;
    } else {
        lord.removeChildren(lord.imgWrapper);
    }
    if (lord.isAudioType(mimeType)) {
        width = (lord.deviceType("mobile")) ? 500 : 400;
        lord.img = lord.node("audio");
        lord.img.width = width + "px";
        lord.img.controls = true;
        if (lord.getLocalObject("loopAudioVideo", false))
            lord.img.loop = true;
        if (lord.deviceType("mobile"))
            lord.imgWrapper.scale = 60;
        else
            lord.imgWrapper.scale = 100;
        var defVol = lord.getLocalObject("defaultAudioVideoVolume", 100) / 100;
        var remember = lord.getLocalObject("rememberAudioVideoVolume", false);
        lord.img.volume = remember ? lord.getLocalObject("audioVideoVolume", defVol) : defVol;
        var src = lord.node("source");
        src.src = href;
        src.type = mimeType;
        lord.img.appendChild(src);
    } else if (lord.isImageType(mimeType)) {
        if (width <= 0 || height <= 0)
            return;
        lord.img = lord.node("img");
        lord.img.width = width;
        lord.img.height = height;
        lord.img.src = href;
    } else if (lord.isVideoType(mimeType)) {
        lord.img = lord.node("video");
        lord.img.controls = true;
        if (lord.getLocalObject("loopAudioVideo", false))
            lord.img.loop = true;
        var defVol = lord.getLocalObject("defaultAudioVideoVolume", 100) / 100;
        var remember = lord.getLocalObject("rememberAudioVideoVolume", false);
        lord.img.volume = remember ? lord.getLocalObject("audioVideoVolume", defVol) : defVol;
        var src = lord.node("source");
        src.src = href;
        src.type = mimeType;
        lord.img.appendChild(src);
    }
    lord.img.mimeType = mimeType;
    lord.img.width = width;
    if (height)
        lord.img.height = height;
    lord.imgWrapper.appendChild(lord.img);
    lord.setInitialScale(lord.imgWrapper, width, height);
    lord.resetScale(lord.imgWrapper);
    lord.img.moving = false;
    lord.img.coord = {
        "x": 0,
        "y": 0
    };
    lord.img.initialCoord = {
        "x": 0,
        "y": 0
    };
    var wheelHandler = lord.fileWheelHandler;
    if (append) {
        document.body.appendChild(lord.imgWrapper);
    } else {
        lord.imgWrapper.style.display = "";
    }
    lord.toCenter(lord.imgWrapper, width, height, 3);
    if ((lord.isAudioType(lord.img.mimeType) || lord.isVideoType(lord.img.mimeType))
        && lord.getLocalObject("playAudioVideoImmediately", true)) {
        setTimeout(function() {
            lord.img.play();
        }, 500);
    }
    lord.images[href] = lord.img;
    if (lord.getLocalObject("showLeafButtons", true)) {
        lord.query(".leafButton").forEach(function(a) {
            a.style.display = "";
        });
    }
};

lord.previousFile = function() {
    var f = lord.nextOrPreviousFile(true);
    if (!f)
        return;
    lord.showImage(f.href, f.mimeType, f.width, f.height);
};

lord.nextFile = function() {
    var f = lord.nextOrPreviousFile(false);
    if (!f)
        return;
    lord.showImage(f.href, f.mimeType, f.width, f.height);
};

lord.addThreadToFavorites = function(boardName, threadNumber) {
    var c = {};
    lord.api("post", {
        boardName: boardName,
        postNumber: threadNumber
    }).then(function(opPost) {
        c.opPost = opPost;
        return lord.api("threadLastPostNumber", {
            boardName: boardName,
            threadNumber: threadNumber
        });
    }).then(function(result) {
        if (!result || !result.lastPostNumber)
            return Promise.reject("threadDeletedErrorText"); //TODO: remove
        var favoriteThreads = lord.getLocalObject("favoriteThreads", {});
        if (favoriteThreads.hasOwnProperty(boardName + "/" + threadNumber))
            return Promise.reject("alreadyInFavoritesErrorText");
        var txt = c.opPost.subject || c.opPost.rawText || (boardName + "/" + threadNumber);
        favoriteThreads[boardName + "/" + threadNumber] = {
            boardName: boardName,
            threadNumber: threadNumber,
            lastPostNumber: result.lastPostNumber,
            previousLastPostNumber: result.lastPostNumber,
            subject: txt.substring(0, 150)
        };
        lord.setLocalObject("favoriteThreads", favoriteThreads);
        var opPost = lord.id(threadNumber);
        var btn = lord.nameOne("addToFavoritesButton", opPost);
        var img = lord.queryOne("img", btn);
        img.src = img.src.replace("favorite.png", "favorite_active.png");
        var div = lord.id("favorites");
        var span = lord.queryOne("span", btn);
        lord.removeChildren(span);
        span.appendChild(lord.node("text", lord.text("removeThreadFromFavoritesText")));
        if (!div)
            return Promise.resolve();
        var model = lord.model(["base", "tr"], true);
        model.favorite = {
            boardName: boardName,
            threadNumber: threadNumber,
            text: txt
        };
        var fdiv = lord.template("favoritesElement", model);
        lord.nameOne("favorites", div).appendChild(fdiv);
        return Promise.resolve();
    }).catch(lord.handleError);
};

lord.showUserIp = function(a) {
    var boardName = lord.data("boardName", a, true);
    if (!boardName)
        return;
    var postNumber = +lord.data("number", a, true);
    if (!postNumber || postNumber < 1)
        return;
    lord.api("userIp", {
        boardName: boardName,
        postNumber: postNumber
    }).then(function(result) {
        prompt("IP:", result.ipv4 || result.ip);
    }).catch(lord.handleError);
};

lord.showLoadingPostsPopup = function(text) {
    var span = lord.node("span");
    if (!lord.loadingImage) {
        lord.loadingImage = lord.node("img");
        lord.loadingImage.src = "/" + lord.data("sitePathPrefix") + "img/loading.gif";
    }
    span.appendChild(lord.loadingImage.cloneNode(true));
    span.appendChild(lord.node("text", " " + lord.text(text || "loadingPostsText")));
    return lord.showPopup(span, {
        type: "node",
        timeout: lord.Billion
    });
};

lord.submitted = function(event, form) {
    if (event)
        event.preventDefault();
    if (!form);
        form = lord.id("postForm");
    var btn = lord.nameOne("submit", form);
    var markupMode = lord.nameOne("markupMode", form);
    lord.setCookie("markupMode", markupMode.options[markupMode.selectedIndex].value);
    btn.disabled = true;
    btn.value = "0%";
    var formData = new FormData(form);
    lord.query(".postformFile", form).forEach(function(div) {
        if (div.file)
            formData.append(div.fileName || "file", div.file);
        else if (div.fileUrl)
            formData.append(div.fileName, div.fileUrl);
    });
    var c = {};
    var resetButton = function() {
        btn.disabled = false;
        btn.value = lord.text("postFormButtonSubmit");
    };
    lord.post(form.action, formData, c, {
        delay: 500,
        uploadProgress: function(e) {
            var percent = Math.floor(100 * (e.loaded / e.total));
            if (100 == percent)
                btn.value = "...";
            else
                btn.value = percent + "%";
        }
    }).then(function(result) {
        var ownPosts = lord.getLocalObject("ownPosts", {});
        ownPosts[result.boardName + "/" + (result.postNumber || result.threadNumber)] = 1;
        lord.setLocalObject("ownPosts", ownPosts);
        if (result.postNumber) {
            c.post = true;
            return lord.api("post", {
                boardName: result.boardName,
                postNumber: result.postNumber
            });
        } else {
            c.post = false;
            return Promise.resolve(result);
        }
    }).then(function(result) {
        if (c.post) {
            c.progressBar.hideDelayed(200);
            resetButton();
            var threadId = +lord.nameOne("threadNumber", postForm).value;
            lord.resetPostForm();
            if (["postFormContainerTop", "postFormContainerBottom"].indexOf(form.parentNode.id) < 0)
                lord.hidePostForm();
            lord.resetCaptcha();
            var currentThreadNumber = lord.data("threadNumber");
            if (currentThreadNumber) {
                lord.updateThread(true).then(function() {
                    if (lord.getLocalObject("moveToPostOnReplyInThread", false))
                        lord.hash(result.number);
                });
            } else {
                var action = lord.getLocalObject("quickReplyAction", "append_post");
                if ("goto_thread" == action) {
                    window.location = "/" + lord.data("sitePathPrefix") + result.boardName + "/res/"
                        + result.threadNumber + ".html#" + result.number;
                    return;
                } else if (threadId) {
                    var thread = lord.id("thread" + threadId);
                    var threadPosts = lord.queryOne(".threadPosts", thread);
                    if (!threadPosts) {
                        threadPosts = lord.node("div");
                        threadPosts.setAttribute("id", "threadPosts" + threadId);
                        lord.addClass(threadPosts, "threadPosts");
                        thread.appendChild(threadPosts);
                    }
                    lord.createPostNode(result, true).then(function(post) {
                        threadPosts.appendChild(post);
                    }).catch(lord.handleError);
                }
            }
        } else {
            c.progressBar.hide(200);
            resetButton();
            window.location = "/" + lord.data("sitePathPrefix") + result.boardName + "/res/" + result.threadNumber
                + ".html";
        }
        return Promise.resolve();
    }).catch(function(err) {
        c.progressBar.hideDelayed(200);
        resetButton();
        lord.resetCaptcha();
        lord.handleError(err);
    });
};

lord.switchDraftsVisibility = function(visible) {
    var draftsContainer = lord.id("drafts");
    if (typeof visible != "boolean")
        visible = ("none" == draftsContainer.style.display);
    draftsContainer.style.display = (visible ? "" : "none");
    lord.setLocalObject("draftsVisible", visible);
    var sw = lord.id("draftsVisibilitySwitch");
    lord.removeChildren(sw);
    sw.appendChild(lord.node("text", lord.text(visible ? "hideDraftsText" : "showDraftsText")));
};

lord.appendDraft = function(draft, visible) {
    var drafts = lord.id("drafts");
    if (!drafts)
        return;
    lord.switchDraftsVisibility(typeof visible == "boolean" ? visible : true);
    var model = lord.model(["base", "tr", "boards", "board/" + lord.data("boardName")], true);
    model.settings = lord.settings();
    model.draft = draft;
    model.draft.user = model.user;
    lord.appendExtrasToModel(model);
    drafts.appendChild(lord.template("draft", model));
};

lord.fillFormWithDraft = function(a) {
    var key = lord.data("key", a, true);
    var createdAt = lord.data("createdAt", a, true);
    if (!key || !createdAt)
        return;
    var drafts = lord.getLocalObject("drafts", {});
    var list = drafts[key];
    if (!list)
        return;
    var draft;
    for (var i = 0; i < list.length; ++i) {
        if (createdAt == list[i].createdAt) {
            draft = list[i];
            break;
        }
    }
    if (!draft)
        return;
    var postForm = lord.id("postForm");
    var email = lord.nameOne("email", postForm);
    var name = lord.nameOne("name", postForm);
    var subject = lord.nameOne("subject", postForm);
    var text = lord.nameOne("text", postForm);
    var op = lord.nameOne("signAsOp", postForm);
    var tripcode = lord.nameOne("tripcode", postForm);
    var markupMode = lord.nameOne("markupMode", postForm);
    //TODO: confirm is form not empty
    email.value = draft.email;
    name.value = draft.name;
    subject.value = draft.subject;
    text.value = draft.rawText;
    op.checked = draft.options.signAsOp;
    $(op).button("refresh");
    tripcode.checked = draft.options.showTripcode;
    $(tripcode).button("refresh");
    for (var i = 0; i < markupMode.options.length; ++i) {
        if (draft.markupMode == markupMode.options[i].value) {
            markupMode.selectedIndex = i;
            break;
        }
    }
};

lord.deleteDraft = function(a) {
    var key = lord.data("key", a, true);
    var createdAt = lord.data("createdAt", a, true);
    if (!key || !createdAt)
        return;
    var draftsContainer = lord.id("drafts");
    var draft = lord.id("draft/" + createdAt);
    if (draft)
        draftsContainer.removeChild(draft);
    var drafts = lord.getLocalObject("drafts", {});
    var list = drafts[key];
    if (!list)
        return;
    for (var i = 0; i < list.length; ++i) {
        if (createdAt == list[i].createdAt) {
            list.splice(i, 1);
            break;
        }
    }
    if (list.length < 1) {
        delete drafts[key];
        lord.switchDraftsVisibility(false);
    }
    lord.setLocalObject("drafts", drafts);
};

lord.addToDrafts = function(a) {
    var postForm = lord.id("postForm");
    var boardName = lord.nameOne("boardName", postForm).value;
    var threadNumber = lord.nameOne("threadNumber", postForm);
    threadNumber = threadNumber ? +threadNumber.value : null;
    var markupMode = lord.nameOne("markupMode", postForm);
    markupMode = markupMode.options[markupMode.selectedIndex].value;
    var formData = new FormData();
    formData.append("boardName", boardName);
    formData.append("text", lord.nameOne("text", postForm).value);
    if (lord.nameOne("signAsOp", postForm).checked)
        formData.append("signAsOp", "true");
    var tripcode = lord.nameOne("tripcode", postForm);
    if (tripcode && tripcode.checked)
        formData.append("tripcode", "true");
    formData.append("markupMode", markupMode);
    var c = {};
    lord.post("/" + lord.data("sitePathPrefix") + "action/markupText", formData, c, {
        delay: 500,
        uploadProgress: function(e) {
            var percent = Math.floor(100 * (e.loaded / e.total));
            if (100 == percent)
                btn.value = "...";
            else
                btn.value = percent + "%";
        }
    }).then(function(result) {
        c.progressBar.hideDelayed(200);
        result.email = lord.nameOne("email", postForm).value;
        result.name = lord.nameOne("name", postForm).value;
        result.subject = lord.nameOne("subject", postForm).value;
        result.markupMode = markupMode;
        var key = boardName + (threadNumber ? ("/" + threadNumber) : "");
        result.key = key;
        var drafts = lord.getLocalObject("drafts", {});
        if (!drafts.hasOwnProperty(key))
            drafts[key] = [];
        drafts[key].push(result);
        lord.setLocalObject("drafts", drafts);
        lord.appendDraft(result);
    }).catch(function(err) {
        c.progressBar.hideDelayed(200);
        lord.handleError(err);
    });
};

lord.resetPostForm = function() {
    var postForm = lord.id("postForm");
    postForm.reset();
    var divs = lord.query(".postformFile", postForm);
    for (var i = divs.length - 1; i >= 0; --i)
    lord.removeFile(lord.queryOne("a", divs[i]));
    var trip = lord.nameOne("tripcode", postForm);
    if (trip) {
        var threadNumber = lord.nameOne("threadNumber", postForm);
        trip.checked = lord.showTripcode(threadNumber ? threadNumber.value : null);
        $(trip).button("refresh");
    }
    var markupMode = lord.nameOne("markupMode", postForm);
    for (var i = 0; i < markupMode.options.length; ++i) {
        if (markupMode.options[i].value == lord.getCookie("markupMode", "EXTENDED_WAKABA_MARK,BB_CODE")) {
            markupMode.selectedIndex = i;
            break;
        }
    }
    if (lord.customResetForm)
        lord.customResetForm(postForm);
};

lord.globalOnmouseover = function(e) {
    var a = e.target;
    if (a.tagName != "A")
        return;
    var boardName = lord.data("boardName", a);
    if (!boardName)
        return;
    var postNumber = +lord.data("postNumber", a);
    if (isNaN(postNumber) || postNumber <= 0)
        return;
    if (!/^>>.*$/gi.test(a.textContent))
        return;
    var viewPostPreviewDelay = lord.getLocalObject("viewPostPreviewDelay", 200);
    if (viewPostPreviewDelay > 0) {
        a.viewPostTimer = setTimeout(function() {
            delete a.viewPostTimer;
            lord.viewPost(a, boardName, postNumber, !!lord.data("hiddenPost", a));
        }, viewPostPreviewDelay);
    } else {
        lord.viewPost(a, boardName, postNumber, !!lord.data("hiddenPost", a));
    }
};

lord.globalOnmouseout = function(e) {
    var a = e.target;
    if (a.tagName != "A")
        return;
    var boardName = lord.data("boardName", a);
    if (!boardName)
        return;
    var postNumber = +lord.data("postNumber", a);
    if (isNaN(postNumber) || postNumber <= 0)
        return;
    if (!/^>>.*$/gi.test(a.textContent))
        return;
    if (a.viewPostTimer) {
        clearTimeout(a.viewPostTimer);
        delete a.viewPostTimer;
    } else {
        lord.lastPostPreviewTimer = setTimeout(function() {
            if (!lord.lastPostPreview)
                return;
            if (lord.lastPostPreview.mustHide && lord.lastPostPreview.parentNode)
                lord.lastPostPreview.parentNode.removeChild(lord.lastPostPreview);
        }, 500);
    }
};

lord.strikeOutHiddenPostLink = function(a, list) {
    if (!a)
        return;
    var boardName = lord.data("boardName", a);
    if (!boardName)
        return;
    var postNumber = +lord.data("postNumber", a);
    if (!postNumber)
        return;
    if (!/^>>.*$/gi.test(a.textContent))
        return;
    if (!list)
        list = lord.getLocalObject("hiddenPosts", {});
    if (list[boardName + "/" + postNumber])
        lord.addClass(a, "hiddenPostLink");
    else
        lord.removeClass(a, "hiddenPostLink");
};

lord.signOpPostLink = function(a, data) {
    if (!a)
        return;
    if (lord.hasClass(a, "opPostLink"))
        return;
    var postNumber = +lord.data("postNumber", a);
    if (!postNumber)
        return;
    var threadNumber = +lord.data("threadNumber", a);
    if (!threadNumber)
        return;
    if (postNumber == threadNumber)
        lord.addClass(a, "opPostLink");
};

lord.signOwnPostLink = function(a, ownPosts) {
    if (!a)
        return;
    if (lord.hasClass(a, "ownPostLink"))
        return;
    if (ownPosts.hasOwnProperty(lord.data("boardName", a) + "/" + lord.data("postNumber", a)))
        lord.addClass(a, "ownPostLink");
};

lord.strikeOutHiddenPostLinks = function(parent) {
    if (!parent)
        parent = document;
    var list = lord.getLocalObject("hiddenPosts", {});
    lord.query("a", parent).forEach(function(a) {
        lord.strikeOutHiddenPostLink(a, list);
    });
};

lord.signOpPostLinks = function(parent) {
    if (!parent)
        parent = document.body;
    lord.query("a", parent).forEach(function(a) {
        lord.signOpPostLink(a);
    });
};

lord.signOwnPostLinks = function(parent, ownPosts) {
    if (!parent)
        parent = document.body;
    ownPosts = ownPosts || lord.getLocalObject("ownPosts", {});
    lord.query("a", parent).forEach(function(a) {
        lord.signOwnPostLink(a, ownPosts);
    });
};

lord.downloadThread = function(el) {
    var suffix = lord.data("archived", el, true) ? "arch" : "res";
    var p;
    var title;
    if (+lord.data("threadNumber")) {
        var fileNames = lord.query(".postFile[data-file-name]").map(function(div) {
            return lord.data("fileName", div);
        });
        title = document.title;
        p = Promise.resolve(fileNames);
    } else {
        p = lord.api(lord.data("number", el, true), {}, lord.data("boardName") + "/" + suffix).then(function(thread) {
            var thread = thread.thread;
            var fileNames = [thread.opPost].concat(thread.lastPosts).reduce(function(acc, post) {
                return acc.concat(post.fileInfos.map(function(fileInfo) {
                    return fileInfo.name;
                }));
            }, []);
            title = thread.title || (lord.data("boardName") + " — " + thread.opPost.number);
            return Promise.resolve(fileNames);
        });
    }
    p.then(function(fileNames) {
        if (fileNames.length < 1)
            return Promise.resolve();
        var cancel = false;
        var zip = new JSZip();
        var progressBar = new lord.OverlayProgressBar({
            max: fileNames.length,
            cancelCallback: function() {
                cancel = true;
            },
            finishCallback: function() {
                progressBar.hide();
                saveAs(zip.generate({ "type": "blob" }), title + ".zip");
            }
        });
        var last = 0;
        var prefix = "/" + lord.data("sitePathPrefix") + lord.data("boardName") + "/src";
        var append = function(i) {
            if (cancel) {
                progressBar.hide();
                return;
            }
            var fileName = fileNames[i];
            JSZipUtils.getBinaryContent(prefix + "/" + fileName, function(err, data) {
                if (!err) {
                    zip.file(fileName, data, {
                        "binary": true
                    });
                }
                progressBar.progress(progressBar.value + 1);
                if (last < fileNames.length - 1)
                    append(++last);
            });
        };
        progressBar.show();
        append(last);
        if (fileNames.length > 1)
            append(++last);
    }).catch(lord.handleError);
};

lord.expandCollapseThread = function(el) {
    lord.expandThread($(el).closest(".thread")[0]);
};

lord.expandThread = function(thread) {
    if (!thread)
        return;
    var div = lord.node("div");
    var img = lord.node("img");
    img.src = "/" + lord.data("sitePathPrefix") + "img/loading_big.gif";
    div.appendChild(img);
    var h1 = lord.node("h1");
    h1.appendChild(lord.node("text", lord.text("loadingPostsMessage")));
    div.appendChild(h1);
    thread.appendChild(div);
    var threadNumber = +thread.id.replace("thread", "");
    var c = {};
    c.model = lord.model(["base", "tr", "boards", "board/" + lord.data("boardName")], true);
    c.model.settings = lord.settings();
    lord.api(threadNumber, {}, lord.data("boardName") + "/res").then(function(model) {
        lord.appendExtrasToModel(c.model);
        thread.removeChild(div);
        c.model.thread = model.thread;
        c.model.thread.expanded = !lord.data("expanded", thread);
        if (!c.model.thread.expanded) {
            c.model.thread.omittedPosts = c.model.thread.lastPosts.length - c.model.board.maxLastPosts;
            var offset = c.model.thread.lastPosts.length - c.model.board.maxLastPosts;
            c.model.thread.lastPosts = c.model.thread.lastPosts.slice(offset);
        }
        thread.parentNode.replaceChild(lord.template("thread", c.model), thread);
    }).catch(function(err) {
        lord.handleError(err);
        thread.removeChild(div);
    });
};

lord.hotkey_previousPageImage = function() {
    if (lord.img) {
        lord.previousFile();
        return false;
    }
    if (+lord.data("threadNumber"))
        return;
    var curr = lord.queryOne(".pagesItem.currentPage");
    var list = lord.query(".pagesItem:not(.metaPage)");
    for (var i = 1; i < list.length; ++i) {
        if (curr == list[i]) {
            window.location.href = lord.queryOne("a", list[i - 1]).href;
            return false;
        }
    }
};

lord.hotkey_nextPageImage = function() {
    if (lord.img) {
        lord.nextFile();
        return false;
    }
    if (+lord.data("threadNumber"))
        return;
    var curr = lord.queryOne(".pagesItem.currentPage");
    var list = lord.query(".pagesItem:not(.metaPage)");
    for (var i = 0; i < list.length - 1; ++i) {
        if (curr == list[i]) {
            window.location.href = lord.queryOne("a", list[i + 1]).href;
            return false;
        }
    }
};

lord.currentPost = function(selectLast) {
    var hash = lord.hash();
    var post;
    if (hash && !isNaN(+hash))
        post = $("#" + hash + ":in-viewport");
    if (post && post[0])
        return post[0];
    post = $(".opPost:in-viewport, .post:in-viewport");
    if (post[0])
        return selectLast ? post.last()[0] : post[0];
    return null;
};

lord.currentThread = function(selectLast) {
    if (+lord.data("threadNumber"))
        return null;
    var post = lord.currentPost(selectLast);
    if (!post)
        return null;
    var thread = $(post).closest(".thread");
    return thread[0] || null;
};

lord.previousNextThreadPostCommon = function(next, post) {
    var iterationLoop = function(container, el) {
        for (var i = 0; i < container.length; i += 1) {
            if (container[i] == el) {
                if (next && (i + 1) < container.length)
                    return container[i + 1];
                else if (!next && i > 0)
                    return container[i - 1];
                return el;
            }
        }
        return el;
    };
    if (post) {
        var el = iterationLoop($(".opPost, .post"), lord.currentPost(next));
        if (el)
            lord.hash(el.id);
    } else {
        var el = iterationLoop($(".thread"), lord.currentThread(next));
        if (el)
            lord.hash(el.id.replace("thread", ""));
    }
    return false;
};

lord.hotkey_previousThreadPost = function() {
    return lord.previousNextThreadPostCommon(false, false);
};

lord.hotkey_nextThreadPost = function() {
    return lord.previousNextThreadPostCommon(true, false);
};

lord.hotkey_previousPost = function() {
    return lord.previousNextThreadPostCommon(false, true);
};

lord.hotkey_nextPost = function() {
    return lord.previousNextThreadPostCommon(true, true);
};

lord.hotkey_hidePost = function() {
    var p = lord.currentPost();
    if (!p)
        return;
    lord.setPostHidden(p);
    return false;
};

lord.hotkey_goToThread = function() {
    var t = lord.currentThread();
    if (!t)
        return;
    var p = lord.queryOne(".opPost", t);
    var href = "/" + lord.data("sitePathPrefix") + lord.data("boardName") + "/res/" + lord.data("number", p) + ".html";
    var w = window.open(href, '_blank');
    if (w)
        w.focus();
    return false;
};

lord.hotkey_expandThread = function() {
    lord.expandThread(lord.currentThread());
    return false;
};

lord.hotkey_expandImage = function() {
    var p = lord.currentPost();
    if (!p)
        return;
    if (lord.img && lord.img.style.display != "none") {
        lord.hideImage();
    } else {
        var f = lord.query(".postFile", p);
        if (!f)
            return;
        f = f[0];
        var href = lord.data("href", f);
        var mimeType = lord.data("mimeType", f);
        if ("application/pdf" == mimeType) {
            window.open(href, '_blank').focus();
        } else {
            var width = +lord.data("width", f);
            var height = +lord.data("height", f);
            lord.showImage(href, mimeType, width, height);
        }
    }
    return false;
};

lord.hotkey_quickReply = function() {
    var p = lord.currentPost();
    if (!p)
        return;
    lord.quickReply(p);
    return false;
};

lord.hotkey_submitReply = function() {
    lord.submitted();
    return false;
};

lord.hotkey_updateThread = function() {
    var tn = +lord.data("threadNumber");
    if (isNaN(tn))
        return;
    lord.updateThread();
    return false;
};

lord.hotkey_markupCommon = function(tag) {
    if (!tag)
        return;
    if (lord.id("hiddenPostForm") == lord.id("postForm").parentNode)
        return;
    lord.markup(tag);
    return false;
};

lord.hotkey_markupBold = function() {
    return lord.hotkey_markupCommon("b");
};

lord.hotkey_markupItalics = function() {
    return lord.hotkey_markupCommon("i");
};

lord.hotkey_markupStrikedOut = function() {
    return lord.hotkey_markupCommon("s");
};

lord.hotkey_markupUnderlined = function() {
    return lord.hotkey_markupCommon("u");
};

lord.hotkey_markupSpoiler = function() {
    return lord.hotkey_markupCommon("spoiler");
};

lord.hotkey_markupQuotation = function() {
    return lord.hotkey_markupCommon(">");
};

lord.hotkey_markupCode = function() {
    return lord.hotkey_markupCommon("code");
};

lord.addToOrRemoveFromFavorites = function(el) {
    var fav = lord.getLocalObject("favoriteThreads", {});
    var currentBoardName = lord.data("boardName");
    var threadNumber = +lord.data("number", el, true);
    if (fav.hasOwnProperty(currentBoardName + "/" + threadNumber))
        lord.removeThreadFromFavorites(currentBoardName, threadNumber);
    else
        lord.addThreadToFavorites(currentBoardName, threadNumber);
};

lord.showTripcode = function(threadNumber) {
    var showTripcode = lord.getLocalObject("showTripcode", {});
    if (showTripcode.global)
        return true;
    if (!threadNumber)
        return false;
    return !!lord.getLocalObject("showTripcode", {})[lord.data("boardName") + "/" + threadNumber];
};

lord.showMenu = function(e, input, selector) {
    e.stopPropagation();
    if (lord.currentMenu) {
        var same = (lord.currentMenu.selector == selector);
        lord.currentMenu.hide();
        if (same) {
            lord.currentMenu = null;
            return;
        }
    }
    lord.currentMenu = $(selector);
    lord.currentMenu.menu({ items: "> :not(.ui-widget-header)" }).toggle().position({
        my: "left top",
        at: "left bottom+2px",
        of: $(input),
        collision: "fit flip"
    }).show();
};

lord.selectCaptchaEngine = function() {
    var captcha = lord.settings().captchaEngine;
    var supportedCaptchaEngines = lord.model("board/" + lord.data("boardName")).board.supportedCaptchaEngines;
    if (supportedCaptchaEngines.length < 1)
        return null;
    var ceid = captcha ? captcha.id : null;
    var isSupported = function(id) {
        for (var i = 0; i < supportedCaptchaEngines.length; ++i) {
            if (supportedCaptchaEngines[i].id == id)
                return true;
        }
        return false;
    };
    if (!ceid || !isSupported(ceid)) {
        if (isSupported("google-recaptcha"))
            ceid = "google-recaptcha";
        else
            ceid = supportedCaptchaEngines[0].id;
    }
    for (var i = 0; i < supportedCaptchaEngines.length; ++i) {
        if (supportedCaptchaEngines[i].id == ceid)
            return supportedCaptchaEngines[i];
    }
    return null;
};

lord.initializeOnLoadBoard = function() {
    var c = {};
    c.model = lord.model(["base", "tr", "boards", "board/" + lord.data("boardName")], true);
    c.model.settings = lord.settings();
    lord.appendExtrasToModel(c.model);
    var p;
    c.threadOrBoard = (+lord.data("threadNumber") || +lord.data("currentPage") >= 0);
    if (+lord.data("threadNumber")) {
        c.model.isThreadPage = true;
        var suffix = lord.data("archived") ? "arch" : "res";
        p = lord.api(lord.data("threadNumber"), {}, lord.data("boardName") + "/" + suffix);
    } else if (+lord.data("currentPage") >= 0) {
        p = lord.api(lord.data("currentPage"), {}, lord.data("boardName"));
    } else {
        p = lord.api("catalog", { sort: lord.data("sortMode") }, lord.data("boardName"));
    }
    var bannerFileNames = [];
    var bannerBoardName = lord.data("boardName");
    var bannerBoardTitle = null;
    switch (c.model.settings.bannersMode) {
    case "random":
        var boards = [];
        for (var i = 0; i < c.model.boards.length; ++i) {
            var board = c.model.boards[i];
            if (board.name == lord.data("boardName"))
                continue;
            if (board.bannerFileNames.length > 0) {
                boards.push({
                    name: board.name,
                    title: board.title,
                    bannerFileNames: board.bannerFileNames
                });
            }
        }
        if (boards.length > 0) {
            var board = boards[Math.floor(Math.random() * boards.length)];
            bannerFileNames = board.bannerFileNames;
            bannerBoardName = board.name;
            bannerBoardTitle = board.title;
        }
        break;
    case "same":
        bannerFileNames = c.model.board.bannerFileNames;
        break;
    default:
        break;
    }
    if (bannerFileNames.length > 0) {
        var bannerFileName = bannerFileNames[Math.floor(Math.random() * bannerFileNames.length)];
        var bannerPlaceholder = lord.id("bannerPlaceholder");
        c.model.bannerFileName = bannerFileName;
        c.model.bannerBoardName = bannerBoardName;
        c.model.bannerBoardTitle = bannerBoardTitle;
        var banner = lord.template("banner", c.model);
        bannerPlaceholder.parentNode.replaceChild(banner, bannerPlaceholder);
        banner.parentNode.insertBefore(lord.node("br"), banner);
    }
    p.then(function(model) {
        if (c.threadOrBoard && lord.compareRegisteredUserLevels(c.model.user.level, "MODER") >= 0)
            lord.createScript("3rdparty/jquery.datetimepicker.js", true);
        if (+lord.data("threadNumber") && lord.data("archived"))
            model.thread.archived = true;
        if ((+lord.data("threadNumber") || +lord.data("currentPage") >= 0)
            && lord.model("board/" + lord.data("boardName")).board.captchaEnabled) {
            c.model.customPostFormField = lord.customPostFormField;
            c.model.customPostFormOption = lord.customPostFormOption;
            if (+lord.data("threadNumber"))
                c.model.thread = model.thread;
            c.model.postformRules = JSON.parse(lord.id("model-postformRules").innerHTML);
            lord.id("hiddenPostForm").appendChild(lord.template("postForm", c.model));
            lord.arr(lord.id("options").childNodes).forEach(function(node) {
                if (3 != node.nodeType)
                    return;
                node.parentNode.removeChild(node);
            });
            $("#options").buttonset();
            $("[name='markupHtml'], [name='optionDraft']").button();
            var captcha = lord.selectCaptchaEngine();
            var appendCaptchaWidgetToContainer = function(container) {
                if (captcha && captcha.widgetHtml)
                    container.innerHTML = captcha.widgetHtml;
                else if (captcha && captcha.widgetTemplate)
                    container.appendChild(lord.template(captcha.widgetTemplate, captcha));
            };
            lord.api("captchaQuota", { boardName: lord.data("boardName") }).then(function(result) {
                var quota = result.quota;
                if (quota > 0) {
                    appendCaptchaWidgetToContainer(lord.id("hiddenPostForm"));
                    var span = lord.node("span");
                    span.appendChild(lord.node("text", lord.text("noCaptchaText") + ". "
                        + lord.text("captchaQuotaText") + " " + quota));
                    lord.id("captchaContainer").appendChild(span);
                } else {
                    appendCaptchaWidgetToContainer(lord.id("captchaContainer"));
                }
                if (captcha && captcha.script) {
                    var script = lord.node("script");
                    script.type = "text/javascript";
                    script.innerHTML = captcha.script;
                    lord.queryOne("head").appendChild(script);
                }
                if (captcha && captcha.scriptSource) {
                    var script = lord.node("script");
                    script.type = "text/javascript";
                    script.src = captcha.scriptSource;
                    lord.queryOne("head").appendChild(script);
                }
                if (typeof lord.postFormLoaded == "function")
                    lord.postFormLoaded();
            }).catch(lord.handleError);
        }
        if (+lord.data("threadNumber")) {
            var title = model.thread.title || (c.model.board.title + " — " + model.thread.number);
            lord.queryOne(".theTitle > h1").innerHTML = lord.escaped(title);
            lord.queryOne("head > title").innerHTML = lord.escaped(title);
            var upperPlaceholder = lord.id("upperPlaceholder");
            upperPlaceholder.parentNode.replaceChild(lord.template("threadPageUpper", c.model),
                upperPlaceholder);
            var lowerPlaceholder = lord.id("lowerPlaceholder");
            lowerPlaceholder.parentNode.replaceChild(lord.template("threadPageLower", c.model),
                lowerPlaceholder);
        } else if (c.threadOrBoard) {
            c.model.pageCount = model.pageCount;
            c.model.currentPage = model.currentPage;
            var upperPlaceholder = lord.id("upperPlaceholder");
            upperPlaceholder.parentNode.replaceChild(lord.template("boardPageUpper", c.model),
                upperPlaceholder);
            var lowerPlaceholder = lord.id("lowerPlaceholder");
            lowerPlaceholder.parentNode.replaceChild(lord.template("boardPageLower", c.model),
                lowerPlaceholder);
            var pagesPlaceholder = lord.id("pagesPlaceholder");
            pagesPlaceholder.parentNode.replaceChild(lord.template("pagination", c.model), pagesPlaceholder);
        }
        var ppp;
        if (c.threadOrBoard) {
        c.threads = model.threads || [model.thread];
        var threads = lord.id("threads");
        var html = "";
        c.threads.forEach(function(thread) {
            c.model.thread = thread;
            if (c.threadOrBoard)
                html += "<hr />";
            var templateName = c.threadOrBoard ? "thread" : "catalogThread";
            html += lord.template(templateName, c.model, true);
        });
        ppp = lord.createDocumentFragment(html)} else { ppp = Promise.resolve(); };ppp.then(function(frag) {
            if (frag) {
            lord.removeChildren(threads);
            lord.removeClass(threads, "loadingMessage");
            threads.appendChild(frag);
            lord.scriptWorkaround(threads);
        }
            if (lord.queryOne(".opPost[data-archived='true']")) {
                lord.name("backButton").forEach(function(btn) {
                    btn.href += "/archive.html";
                });
            }
            if (typeof lord.postsLoaded == "function")
                lord.postsLoaded();
            $(".postBody").css("maxWidth", ($(window).width() - 30) + "px");
            var dw = (c.model.deviceType == "mobile") ? 100 : 320;
            $(".codeBlock").css("maxWidth", ($(window).width() - dw) + "px");
            if (lord.deviceType("mobile"))
                lord.setTooltips();
            setTimeout(function() {
                lord.hash(lord.hash());
            }, lord.Second);
            var threadNumber = +lord.data("threadNumber");
            var key = lord.data("boardName") + (threadNumber ? ("/" + threadNumber) : "");
            var drafts = lord.getLocalObject("drafts", {})[key];
            if (drafts) {
                drafts.forEach(function(draft) {
                    lord.appendDraft(draft, lord.getLocalObject("draftsVisible", true));
                });
            }
            document.body.onclick = lord.globalOnclick;
            if (!lord.deviceType("mobile")) {
                document.body.onmouseover = lord.globalOnmouseover;
                document.body.onmouseout = lord.globalOnmouseout;
            }
            if (lord.getLocalObject("mumWatching", false)) {
                var img = lord.queryOne("[name='switchMumWatchingButton'] > img");
                img.src = "/" + lord.data("sitePathPrefix") + "img/mum_watching.png";
                lord.query(".postFileFile > a > img").forEach(function(img) {
                    lord.addClass(img, "mumWatching");
                });
            }
            if (lord.getLocalObject("hotkeysEnabled", true) && !lord.deviceType("mobile")) {
                var hotkeys = lord.getLocalObject("hotkeys", {}).dir;
                var key = function(name) {
                    if (!hotkeys)
                        return lord.DefaultHotkeys.dir[name];
                    return hotkeys[name] || lord.DefaultHotkeys.dir[name];
                };
                var btn = lord.queryOne(".leafButton.leafButtonPrevious");
                if (btn)
                    btn.title += " (" + key("previousPageImage") + ")";
                btn = lord.queryOne(".leafButton.leafButtonNext");
                if (btn)
                    btn.title += " (" + key("nextPageImage") + ")";
                lord.query("[name='quickReply']").forEach(function(a) {
                    a.title += " (" + key("quickReply") + ")";
                });
                lord.query("[name='toThreadLink']").forEach(function(a) {
                    a.title += "(" + key("goToThread") + ")";
                });
                lord.query("[name='hideButton']").forEach(function(img) {
                    img.title += "(" + key("hidePost") + ")";
                });
                var table = lord.queryOne(".postformMarkup");
                if (table) {
                    var markupList = ["Bold", "Italics", "StrikedOut", "Underlined", "Spoiler", "Quotation", "Code"];
                    markupList.forEach(function(s) {
                        s = "markup" + s;
                        var btn = lord.nameOne(s, table);
                        if (!btn)
                            return;
                        btn.title += " (" + key(s) + ")";
                    });
                }
                lord.query("[name='updateThreadButton']").forEach(function(a) {
                    a.title += " (" + key("updateThread") + ")";
                });
                btn = lord.nameOne("submit", lord.id("postForm"));
                if (btn)
                    btn.title += "(" + key("submitReply") + ")";
            }
            if (lord.showTripcode(lord.data("threadNumber"))) {
                var postForm = lord.id("postForm");
                if (postForm) {
                    var sw = lord.nameOne("tripcode", postForm);
                    if (sw) {
                        sw.checked = true;
                        $(sw).button("refresh");
                    }
                }
            }
            var fav = lord.getLocalObject("favoriteThreads", {});
            var currentBoardName = lord.data("boardName");
            var spellsEnabled = lord.getLocalObject("spellsEnabled", true);
            var posts = lord.query(".post, .opPost");
            var p;
            if (lord.getLocalObject("strikeOutHiddenPostLinks", true))
                lord.strikeOutHiddenPostLinks();
            if (lord.getLocalObject("signOpPostLinks", true))
                lord.signOpPostLinks();
            if (lord.getLocalObject("signOwnPostLinks", true))
                lord.signOwnPostLinks();
            var p;
            if (spellsEnabled)
                p = lord.doWork("parseSpells", lord.getLocalObject("spells", lord.DefaultSpells));
            else
                p = Promise.resolve();
            p.then(function(spells) {
                if (spells && spells.root)
                    lord.spells = spells.root.spells;
                if (!spellsEnabled)
                    return Promise.resolve();
                var boardName = lord.data("boardName");
                var list = [];
                return lord.gently(posts, function(post) {
                    var data = lord.getPostData(post);
                    if (!data)
                        return;
                    list.push(data);
                }, {
                    delay: 10,
                    n: 10
                }).then(function() {
                    return lord.doWork("processPosts", {
                        posts: list,
                        spells: lord.spells
                    });
                });
            }).then(function(list) {
                var map = list ? list.reduce(function(acc, data) {
                    acc[data.postNumber] = data;
                    return acc;
                }, {}) : {};
                posts.forEach(function(post) {
                    lord.processPost(post, map[+post.id]);
                });
            }).then(function() {
                lord.query(".opPost").forEach(function(opPost) {
                    var threadNumber = +opPost.id;
                    var btn = lord.nameOne("addToFavoritesButton", opPost);
                    if (fav.hasOwnProperty(currentBoardName + "/" + threadNumber)) {
                        var img = lord.queryOne("img", btn);
                        var span = lord.queryOne("span", btn);
                        lord.removeChildren(span);
                        span.appendChild(lord.node("text", lord.text("removeThreadFromFavoritesText")));
                        img.src = img.src.replace("favorite.png", "favorite_active.png");
                    }
                });
                if (lord.getLocalObject("hideTripcodes", false)) {
                    lord.query(".tripcode").forEach(function(span) {
                        span.style.display = "none";
                    });
                }
                if (lord.getLocalObject("hideUserNames", false)) {
                    lord.query(".someName").forEach(function(span) {
                        span.style.display = "none";
                    });
                }
            }).catch(lord.handleError);
            var lastLang = lord.getLocalObject("lastCodeLang", "-");
            var sel = lord.queryOne(".postformMarkup > span > [name='codeLang']");
            if (sel) {
                lord.arr(sel.options).forEach(function(opt) {
                    if (opt.value == lastLang)
                        opt.selected = true;
                });
            }
            lord.setPostformMarkupVisible(!lord.getLocalObject("hidePostformMarkup", false));
            if (!lord.data("threadNumber")) {
                lord.api("lastPostNumber", { boardName: currentBoardName }).then(function(result) {
                    var lastPostNumbers = lord.getLocalObject("lastPostNumbers", {});
                    lastPostNumbers[currentBoardName] = result.lastPostNumber;
                    lord.setLocalObject("lastPostNumbers", lastPostNumbers);
                }).catch(lord.handleError);
            }
            lord.initFiles();
            lord.scrollHandler();
        });
    }).catch(lord.handleError);
};

lord.initializeOnLoadThread = function() {
    lord.addVisibilityChangeListener(lord.visibilityChangeListener);
    var enabled = lord.getLocalObject("autoUpdate", {})[+lord.data("threadNumber")];
    if (true === enabled || (false !== enabled && lord.getLocalObject("autoUpdateThreadsByDefault", false)))
        lord.setAutoUpdateEnabled(true);
};

lord.scrollHandler = function() {
    var k = 1300;
    var top = ((window.innerHeight + window.scrollY + k) >= document.body.offsetHeight);
    var bottom = (window.scrollY <= k);
    lord.queryOne(".navigationButtonTop").style.display = bottom ? "none" : "";
    lord.queryOne(".navigationButtonBottom").style.display = top ? "none" : "";
};

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
    }).then(function(result) {
        if (!result || !result.lastPostNumber)
            return Promise.reject("threadDeletedErrorText");
        c.newLastPostNumber = result.lastPostNumber;
        if (c.newLastPostNumber <= lastPostNumber)
            return Promise.resolve({ thread: { lastPosts: [] } });
        return lord.api(threadNumber, {}, lord.data("boardName") + "/res");
    }).then(function(model) {
        if (!model)
            return Promise.reject("threadDeletedErrorText");
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
            if (lord.soundEnabled())
                lord.playSound();
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

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.initializeOnLoadBoard();
    if (+lord.data("threadNumber"))
        lord.initializeOnLoadThread();
}, false);

window.addEventListener("scroll", lord.scrollHandler, false);
