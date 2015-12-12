/*ololord global object*/

var lord = lord || {};

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

/*Functions*/

lord.worker.addEventListener("message", function(message) {
    try {
        message = JSON.parse(message.data);
    } catch (err) {
        lord.handleError(err);
        return;
    }
    var task = lord.workerTasks[message.id];
    if (!task)
        return;
    delete lord.workerTasks[message.id];
    if (!message.error)
        task.resolve(message.data);
    else
        task.reject(message.error);
});

lord.doWork = function(type, data) {
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
        }));
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
        lord.api("captchaQuota", { boardName: lord.data("boardName") }).then(function(quota) {
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
    model.compareRatings = function(r1, r2) {
        if (["SFW", "R-15", "R-18", "R-18G"].indexOf(r2) < 0)
            throw "Invalid rating r2: " + r2;
        switch (r1) {
        case "SFW":
            return (r1 == r2) ? 0 : -1;
        case "R-15":
            if (r1 == r2)
                return 0;
            return ("SFW" == r2) ? 1 : -1;
        case "R-18":
            if (r1 == r2)
                return 0;
            return ("R-18G" == r2) ? -1 : 1;
        case "R-18G":
            return (r1 == r2) ? 0 : 1;
        default:
            throw "Invalid rating r1: " + r1;
        }
    };
    model.compareRegisteredUserLevels = lord.compareRegisteredUserLevels;
    model.formattedDate = function(date) {
        return moment(date).utcOffset(timeOffset).locale(locale).format(dateFormat);
    };
    var ownPosts = lord.getLocalObject("ownPosts", {});
    model.checkOwnPost = function(post) {
        return !!ownPosts[post.boardName + "/" + (post.number || post.postNumber)];
    };
    model.minimalisticPostform = function() {
        return settings.minimalisticPostform;
    };
    model.scaledSize = function(size) {
        if (lord.deviceType("desktop"))
            return size;
        return Math.floor(0.7 * size);
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
        c.model.includeThreadScripts = !!lord.data("threadNumber");
        lord.appendExtrasToModel(c.model);
        c.node = lord.template("post", c.model);
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
            var actions = lord.queryOne(".postActions", c.node);
            if (actions)
                actions.parentNode.removeChild(actions);
            var qr = lord.nameOne("quickReplyContainer", c.node);
            if (qr)
                qr.parentNode.removeChild(qr);
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
        lord.doWork("processPosts", {
            posts: [data],
            spells: lord.spells
        }).then(function(list) {
            lord.processPost(c.node, (list && list.length > 0) ? list[0] : null);
        }).catch(lord.handleError);
        if (!permanent || !post.referencedPosts || post.referencedPosts.length < 1)
            return Promise.resolve();
        var model = lord.model(["base", "board/" + lord.data("boardName")], true);
        model.settings = lord.settings();
        model.checkOwnPost = function(post) {
            return !!ownPosts[post.boardName + "/" + (post.number || post.postNumber)];
        };
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
    }).then(function() {
        return c.node;
    });
};

lord.updatePost = function(postNumber) {
    var post = lord.id(postNumber);
    if (!post)
        return Promise.reject("No such post");
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
    var preview = lord.queryOne("img", div);
    if (preview && div == preview.parentNode)
        preview.src = "/" + lord.data("sitePathPrefix") + "img/addfile.png";
    var span = lord.queryOne("span", div);
    if (span && div == span.parentNode) {
        while (span.firstChild)
            span.removeChild(span.firstChild);
    }
    if (div.parentNode)
        lord.removeFileHash(div);
    div.fileHash = null;
    if ("droppedFile" in div)
        delete div.droppedFile;
    if ("fileUrl" in div)
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
    return Promise.resolve(sz);
};

lord.getFileHashes = function(div) {
    var parent = div.parentNode.parentNode;
    var fhs = lord.nameOne("fileHashes", parent);
    if (fhs)
        return fhs;
    return lord.nameOne("fileHashes", parent.parentNode.parentNode.parentNode);
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
        textArea.rows = "30";
        textArea.cols = "56";
        return lord.showDialog("postSourceText", null, textArea);
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
    lord.showDialog("chatText", null, div).then(function(result) {
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
        c.div = lord.template("deletePostDialog", model);
    lord.showDialog("enterPasswordTitle", "enterPasswordText", c.div).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        return lord.post(form.action, new FormData(form));
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var post = lord.id(postNumber);
        if (!post)
            return Promise.reject("No such post");
        if (lord.data("isOp", post)) {
            if (!isNaN(+lord.data("threadNumber"))) {
                window.location = window.location.protocol + "//" + model.site.domain + "/" + model.site.pathPrefix
                    + lord.data("boardName");
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
    lord.showDialog("moveThreadText", null, c.div).then(function(result) {
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
            return Promise.reject("No such post");
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
        return lord.showDialog("banUserText", null, c.div);
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
    lord.showDialog("addFilesText", null, c.div).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        var formData = new FormData(form);
        lord.query(".postformFile", form).forEach(function(div) {
            if (div.droppedFile)
                formData.append(div.droppedFileName || "file", div.droppedFile);
            else if (div.fileUrl)
                formData.append(div.droppedFileName, div.fileUrl);
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
        return lord.showDialog("editPostText", null, c.div);
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
            return Promise.reject("Failed to generate hash");
        c.hash = hash;
        var spells = lord.getLocalObject("spells", lord.DefaultSpells) + "\n#ihash(" + c.hash + ")";
        lord.setLocalObject("spells", spells);
        if (!lord.getLocalObject("spellsEnabled", true))
            return Promise.resolve();
        return lord.doWork("parseSpells", spells);
    }).then(function(spells) {
        if (!spells || !spells.root)
            return Promise.resolve();
        lord.spells = spells.root.spells;
        if (!spellsEnabled)
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
            return Promise.reolve();
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
        return lord.gently(c.posts, function(post) {
            var data = map[+post.id];
            lord.processPost(post, data);
        }, {
            delay: 10,
            n: 10
        });
    }).catch(lord.handleError);
};

lord.deleteFile = function(el) {
    var model = lord.model(["base", "tr"], true);
    model.fileName = lord.data("fileName", el, true);
    var div = lord.template("deleteFileDialog", model);
    lord.showDialog("enterPasswordTitle", "enterPasswordText", div).then(function(result) {
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
        return lord.showDialog("editAudioTagsText", null, c.div);
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
        var actions = lord.queryOne(".postActions", post);
        if (actions)
            actions.parentNode.removeChild(actions);
        var qr = lord.nameOne("quickReplyContainer", post);
        if (qr)
            qr.parentNode.removeChild(qr);
        var ptt = lord.queryOne(".postToThread", post);
        if (ptt)
            ptt.parentNode.removeChild(ptt);
        lord.removeClass(post, "opPost hidden");
        lord.addClass(post, "post temporary");
        p = Promise.resolve(post);
    } else {
        p = lord.api("post", {
            boardName: boardName,
            postNumber: postNumber
        }).then(function(post) {
            if (!post)
                return Promise.reject("Failed to get post");
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
                post.style.left = linkCenter - post.scrollWidth + "px";
            }
            var scrollTop = doc.scrollTop;
            if (!scrollTop) //NOTE: Workaround for Chrome/Safari. I really HATE you, HTML/CSS/JS!
                scrollTop = document.body.scrollTop;
            post.style.top = (doc.clientHeight - coords.bottom >= post.scrollHeight)
                ? (scrollTop + coords.bottom - 4 + "px")
                : (scrollTop + coords.top - post.scrollHeight - 4 + "px");
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
    if (!div)
        return;
    if (!div.fileHash)
        return;
    var fileHashes = lord.getFileHashes(div);
    var val = fileHashes.value.replace("," + div.fileHash, "");
    if (val === fileHashes.value)
        val = fileHashes.value.replace(div.fileHash + ",", "");
    if (val === fileHashes.value)
        val = fileHashes.value.replace(div.fileHash, "");
    fileHashes.value = val;
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

lord.fileAddedCommon = function(div, file) {
    if (!div || (!file && !div.fileUrl))
        return;
    var inp = lord.queryOne("input", div);
    if (!inp)
        return;
    var warn = function() {
        var txt = lord.text("fileTooLargeWarningText") + " (>" + lord.readableSize(+lord.data("maxFileSize")) + ")";
        lord.showPopup(txt, {type: "warning"});
    };
    var fileName = file ? file.name : div.fileUrl.split("/").pop();
    var fileNameFull = fileName;
    fileName = (fileName || "");
    if (fileName.length > 30)
        fileName = fileName.substr(0, 27) + "...";
    var p;
    if (file) {
        p = lord.readableSize(file.size).then(function(txt) {
            return Promise.resolve("(" + txt + ")");
        });
        if (+file.size > +lord.data("maxFileSize"))
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
    lord.queryOne("input", div).name = "file_" + _uuid;
    div.droppedFileName = "file_" + (div.fileUrl ? "url_" : "") + _uuid;
    var ratingSelect = lord.queryOne("[name='ratingSelectContainer'] > select");
    if (ratingSelect)
        ratingSelect.name = "file_" + _uuid + "_rating";
    lord.removeFileHash(div);
    var prefix = lord.data("sitePathPrefix");
    if (file && lord.getLocalObject("checkFileExistence", true)) {
        lord.readAs(file).then(function(data) {
            return lord.doWork("getFileHash", data);
        }).then(function(fileHash) {
            return lord.api("fileInfo", { fileHash: fileHash }).then(function(fileInfo) {
                if (!fileInfo)
                    return;
                var img = lord.node("img");
                img.src = "/" + prefix + "img/storage.png";
                img.title = lord.text("fileExistsOnServerText");
                lord.queryOne("span", div).appendChild(lord.node("text", " "));
                lord.queryOne("span", div).appendChild(img);
                var fileHashes = lord.getFileHashes(div);
                if (fileHashes.value.indexOf(fileHash) < 0)
                    fileHashes.value = fileHashes.value + (fileHashes.value.length > 0 ? "," : "") + fileHash;
                var f = inp.onchange;
                delete inp.onchange;
                inp.value = "";
                inp.onchange = f;
                div.fileHash = fileHash;
                if (div.droppedFile)
                    delete div.droppedFile;
            });
        }).catch(lord.handleError);
    }
    var preview = function() {
        if (!file)
            return;
        lord.readAs(file, "DataURL").then(function(url) {
            lord.queryOne("img", div).src = url;
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
    if (file && fileNameFull.match(/\.(jpe?g)$/i) && lord.getLocalObject("stripExifFromJpeg", true)) {
        lord.readAs(file).then(function(data) {
            return lord.removeExifData(data);
        }).then(function(pieces) {
            if (pieces)
                div.droppedFile = new File(pieces, file.name, {"type": "image/jpeg"});
            if (lord.getLocalObject("showAttachedFilePreview", true))
                preview();
        }).catch(lord.handleError);
    }
    var f = inp.onchange;
    delete inp.onchange;
    inp.value = "";
    inp.onchange = f;
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
        if (!c.fileHash && lord.queryOne("input", c).value === "" && !c.droppedFile && !c.fileUrl)
            return;
        lord.queryOne("a.postformFileRemoveButton", c).style.display = "inline";
    }
    (function(div) {
        div = div.cloneNode(true);
        var span = lord.queryOne(".postformFileText", div);
        lord.queryOne("a.postformFileRemoveButton", div).style.display = "none";
        div.innerHTML = div.innerHTML; //NOTE: Workaround since we can't clear it other way
        lord.clearFileInput(div);
        parent.appendChild(div);
    })(div);
};

lord.fileDrop = function(e, div) {
    e.preventDefault();
    lord.removeClass(div, "drag");
    var inp = lord.queryOne("input", div);
    inp.parentNode.replaceChild(inp.cloneNode(true), inp);
    lord.clearFileInput(div);
    var dt = e.dataTransfer;
    if (lord.in(dt.types, "text/uri-list")) {
        if (div.droppedFile)
            delete div.droppedFile;
        div.fileUrl = dt.getData("text/uri-list");
        lord.fileAddedCommon(div);
    } else if (dt.files) {
        var file = e.dataTransfer.files[0];
        div.droppedFile = file;
        lord.fileAddedCommon(div, file);
    }
    return false;
};

lord.fileSelected = function(current) {
    if (!current)
        return;
    var div = current.parentNode;
    if (div.droppedFile)
        delete div.droppedFile;
    if (current.value == "")
        return lord.removeFile(current);
    var file = current.files[0];
    var inp = lord.queryOne("input", div);
    inp.parentNode.replaceChild(inp.cloneNode(true), inp);
    lord.clearFileInput(div);
    div.droppedFile = file;
    lord.fileAddedCommon(div, file);
};

lord.attachFileByLink = function(a) {
    if (!a)
        return;
    var div = a.parentNode;
    if (!div)
        return;
    var url = prompt(lord.text("linkLabelText"), div.fileUrl);
    if (null === url)
        return;
    if (div.droppedFile)
        delete div.droppedFile;
    var inp = lord.queryOne("input", div);
    inp.parentNode.replaceChild(inp.cloneNode(true), inp);
    lord.clearFileInput(div);
    div.fileUrl = url;
    lord.fileAddedCommon(div);
};

lord.attachFileByVk = function(a) {
    if (!a)
        return;
    var div = a.parentNode;
    if (!div)
        return;
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
            lord.showDialog("selectTrackTitle", null, c.div).then(function(result) {
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
                if (div.droppedFile)
                    delete div.droppedFile;
                var inp = lord.queryOne("input", div);
                inp.parentNode.replaceChild(inp.cloneNode(true), inp);
                lord.clearFileInput(div);
                div.fileUrl = "vk://" + uid + "_" + trackId + "/" + (title || "unknown");
                lord.fileAddedCommon(div);
            }).catch(lord.handleError);
        });
    });
};

lord.removeFile = function(current) {
    if (!current)
        return;
    var div = current.parentNode;
    lord.removeFileHash(div);
    var parent = div.parentNode;
    parent.removeChild(div);
    lord.clearFileInput(div);
    if (div.droppedFile)
        delete div.droppedFile;
    if (parent.children.length > 0) {
        for (var i = 0; i < parent.children.length; ++i) {
            var c = parent.children[i];
            if (!c.fileHash && lord.queryOne("input", c).value === "" && !c.droppedFile) {
                if (parent.children.length > 0)
                    return;
                else
                    lord.queryOne("a.postformFileRemoveButton", c).style.display = "none";
            }
        }
        var maxCount = +lord.data("maxFileCount");
        maxCount -= +lord.data("fileCount", div, true) || 0;
        if (maxCount <= 0)
            return;
        if (parent.children.length >= maxCount)
            return;
        div = div.cloneNode(true);
        lord.queryOne("a.postformFileRemoveButton", div).style.display = "none";
        div.innerHTML = div.innerHTML; //NOTE: Workaround since we can't clear it other way
        parent.appendChild(div);
    }
    if (parent.children.length < 1) {
        lord.queryOne("a.postformFileRemoveButton", div).style.display = "none";
        div.innerHTML = div.innerHTML; //NOTE: Workaround since we can't clear it other way
        parent.appendChild(div);
    }
};

lord.browseFile = function(e, div) {
    var inp = lord.queryOne("input", div);
    if (!inp)
        return;
    var e = window.event || e;
    var a = e.target;
    while (!!a) {
        if (a.tagName === "A" || a.tagName === "SELECT" || a.tagName === "OPTION")
            return;
        a = a.parentNode;
    }
    inp.click();
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
    case "sup":
    case "sub":
    case "url": {
        wrap("[" + tag + "]", "[/" + tag + "]");
        break;
    }
    case ">": {
        lord.quoteSelectedText();
        break;
    }
    case "code": {
        var sel = lord.queryOne(".postformMarkup > span > [name='langSelect']");
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
    var sel = lord.queryOne(".postformMarkup > span > [name='langSelect']");
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
        width = lord.data("width", a, true);
        height = lord.data("height", a, true);
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
        if (!opPost)
            return Promise.reject("The thread was deleted");
        c.opPost = opPost;
        return lord.api("threadLastPostNumber", {
            boardName: boardName,
            threadNumber: threadNumber
        });
    }).then(function(lastPostNumber) {
        if (!lastPostNumber)
            return Promise.reject("The thread was deleted");
        var favoriteThreads = lord.getLocalObject("favoriteThreads", {});
        if (favoriteThreads.hasOwnProperty(boardName + "/" + threadNumber))
            return Promise.reject("Already in favorites");
        var txt = c.opPost.subject || c.opPost.rawText || (boardName + "/" + threadNumber);
        favoriteThreads[boardName + "/" + threadNumber] = {
            boardName: boardName,
            threadNumber: threadNumber,
            lastPostNumber: lastPostNumber,
            previousLastPostNumber: lastPostNumber,
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
        if (div.droppedFile)
            formData.append(div.droppedFileName || "file", div.droppedFile);
        else if (div.fileUrl)
            formData.append(div.droppedFileName, div.fileUrl);
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
                    if (lord.getLocalObject("moveToPostOnReplyInThread", true))
                        window.location.hash = "#" + result.number;
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
    var raw = lord.nameOne("raw", postForm);
    var op = lord.nameOne("signAsOp", postForm);
    var tripcode = lord.nameOne("tripcode", postForm);
    var markupMode = lord.nameOne("markupMode", postForm);
    //TODO: confirm is form not empty
    email.value = draft.email;
    name.value = draft.name;
    subject.value = draft.subject;
    text.value = draft.rawText;
    raw.checked = draft.options.rawHtml;
    op.checked = draft.options.signAsOp;
    tripcode.checked = draft.options.showTripcode;
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
    var raw = lord.nameOne("raw", postForm);
    if (raw && raw.checked)
        formData.append("raw", "true");
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
    lord.viewPost(a, boardName, postNumber, !!lord.data("hiddenPost", a));
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
    lord.lastPostPreviewTimer = setTimeout(function() {
        if (!lord.lastPostPreview)
            return;
        if (lord.lastPostPreview.mustHide && lord.lastPostPreview.parentNode)
            lord.lastPostPreview.parentNode.removeChild(lord.lastPostPreview);
    }, 500);
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
    if (a.textContent.indexOf("(OP)") >= 0)
        return;
    var postNumber = +lord.data("postNumber", a);
    if (!postNumber)
        return;
    var threadNumber = +lord.data("threadNumber", a);
    if (!threadNumber)
        return;
    if (postNumber == threadNumber)
        a.appendChild(lord.node("text", " (OP)"));
};

lord.signOwnPostLink = function(a, ownPosts) {
    if (!a)
        return;
    if (a.textContent.indexOf("(You)") >= 0)
        return;
    if (ownPosts.hasOwnProperty(lord.data("boardName", a) + "/" + lord.data("postNumber", a)))
        a.appendChild(lord.node("text", " (You)"));
};

lord.strikeOutHiddenPostLinks = function(parent) {
    if (!parent)
        parent = document;
    var list = lord.getLocalObject("hiddenPosts", {});
    lord.gently(lord.query("a", parent), function(a) {
        lord.strikeOutHiddenPostLink(a, list);
    }, {
        delay: 10,
        n: 20
    });
};

lord.signOpPostLinks = function(parent) {
    if (!parent)
        parent = document.body;
    var list = [];
    return lord.gently(lord.query("a", parent), function(a) {
        lord.signOpPostLink(a);
    }, {
        delay: 10,
        n: 20
    });
};

lord.signOwnPostLinks = function(parent, ownPosts) {
    if (!parent)
        parent = document.body;
    ownPosts = ownPosts || lord.getLocalObject("ownPosts", {});
    lord.gently(lord.query("a", parent), function(a) {
        lord.signOwnPostLink(a, ownPosts);
    }, {
        delay: 10,
        n: 20
    });
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

lord.currentPost = function() {
    var list = lord.query(".opPost, .post");
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]) && window.location.hash.replace("#", "") == list[i].id.replace("post", ""))
            return list[i];
    }
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]))
            return list[i];
    }
    list = lord.query(".opPost, .post");
    if (list && list.length > 0)
        return list[0];
    return null;
};

lord.currentThread = function() {
    if (+lord.data("threadNumber"))
        return null;
    var list = lord.query(".opPost");
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]))
            return lord.id("thread" + list[i].id);
    }
    list = lord.query(".opPost, .post");
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]) && window.location.hash.replace("#", "") == list[i].id)
            return lord.id(list[i].parentNode.id.replace("threadPosts", "thread"));
    }
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]))
            return lord.id(list[i].parentNode.id.replace("threadPosts", "thread"));
    }
    list = lord.query(".opPost");
    if (list && list.length > 0)
        return lord.id("thread" + list[0].id);
    return null;
};

lord.previousNextThreadPostCommon = function(next, post) {
    var list = null;
    var f = function(list, i) {
        if (next && i < list.length - 1)
            return i + 1;
        else if (!next && i > 0)
            return i - 1;
        return i;
    };
    if (!post && !lord.data("threadNumber")) {
        list = lord.query(".opPost");
        for (var i = 0; i < list.length; ++i) {
            if (lord.isInViewport(list[i])) {
                i = f(list, i);
                window.location.hash = list[i].id.replace("post", "");
                return false;
            }
        }
    }
    list = lord.query(".opPost, .post");
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]) && window.location.hash.replace("#", "") == list[i].id.replace("post", "")) {
            if (post || +lord.data("threadNumber")) {
                i = f(list, i);
                window.location.hash = list[i].id.replace("post", "");
            } else {
                window.location.hash = list[i].parentNode.id.replace("threadPosts", "");
            }
            return false;
        }
    }
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i])) {
            if (post || +lord.data("threadNumber")) {
                i = f(list, i);
                window.location.hash = list[i].id.replace("post", "");
            } else {
                window.location.hash = list[i].parentNode.id.replace("threadPosts", "");
            }
            return false;
        }
    }
    list = lord.query(!post ? ".opPost" : ".opPost, .post");
    if (list && list.length > 0) {
        var ind = next ? 0 : (list.length - 1);
        window.location.hash = list[ind].id.replace("post", "");
        return false;
    }
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
    var opPost = lord.queryOne(".opPost", t);
    window.open(lord.queryOne(".postHeader > [name='toThreadLink']", opPost).href, '_blank').focus();
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
    lord.quickReply(p.id.replace("post", ""));
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

lord.initializeOnLoadBaseBoard = function() {
    var c = {};
    c.model = lord.model(["base", "tr", "boards", "board/" + lord.data("boardName")], true);
    c.model.settings = lord.settings();
    lord.appendExtrasToModel(c.model);
    var p;
    if (+lord.data("threadNumber")) {
        c.model.includeThreadScripts = true;
        p = lord.api(lord.data("threadNumber"), {}, lord.data("boardName") + "/res");
    } else if (+lord.data("currentPage") >= 0) {
        p = lord.api(lord.data("currentPage"), {}, lord.data("boardName"));
    } else {
        p = lord.api("catalog", { sort: lord.data("sortMode") }, lord.data("boardName"));
    }
    var bannerFileNames = c.model.board.bannerFileNames;
    if (bannerFileNames.length > 0) {
        var bannerFileName = bannerFileNames[Math.floor(Math.random() * bannerFileNames.length)];
        var bannerPlaceholder = lord.id("bannerPlaceholder");
        c.model.bannerFileName = bannerFileName;
        var banner = lord.template("banner", c.model);
        bannerPlaceholder.parentNode.replaceChild(banner, bannerPlaceholder);
        banner.parentNode.insertBefore(lord.node("br"), banner);
    }
    p.then(function(model) {
        if ((+lord.data("threadNumber") || +lord.data("currentPage") >= 0)
            && lord.model("board/" + lord.data("boardName")).board.captchaEnabled) {
            c.model.customPostFormField = lord.customPostFormField;
            c.model.customPostFormOption = lord.customPostFormOption;
            if (+lord.data("threadNumber"))
                c.model.thread = model.thread;
            c.model.postformRules = JSON.parse(lord.id("model-postformRules").innerHTML);
            lord.id("hiddenPostForm").appendChild(lord.template("postForm", c.model));
            var captcha = lord.selectCaptchaEngine();
            var appendCaptchaWidgetToContainer = function(container) {
                if (captcha && captcha.widgetHtml)
                    container.innerHTML = captcha.widgetHtml;
                else if (captcha && captcha.widgetTemplate)
                    container.appendChild(lord.template(captcha.widgetTemplate, captcha));
            };
            lord.api("captchaQuota", { boardName: lord.data("boardName") }).then(function(quota) {
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
            }).catch(lord.handleError);
        }
        c.notCatalog = (+lord.data("threadNumber") || +lord.data("currentPage") >= 0);
        if (+lord.data("threadNumber")) {
            lord.queryOne(".theTitle > h1").innerHTML = lord.escaped(model.thread.title);
            lord.queryOne("head > title").innerHTML = lord.escaped(model.thread.title);
            var upperPlaceholder = lord.id("upperPlaceholder");
            upperPlaceholder.parentNode.replaceChild(lord.template("threadPageUpper", c.model), upperPlaceholder);
            var lowerPlaceholder = lord.id("lowerPlaceholder");
            lowerPlaceholder.parentNode.replaceChild(lord.template("threadPageLower", c.model), lowerPlaceholder);
        } else if (c.notCatalog) {
            c.model.pageCount = model.pageCount;
            c.model.currentPage = model.currentPage;
            var upperPlaceholder = lord.id("upperPlaceholder");
            upperPlaceholder.parentNode.replaceChild(lord.template("boardPageUpper", c.model), upperPlaceholder);
            var lowerPlaceholder = lord.id("lowerPlaceholder");
            lowerPlaceholder.parentNode.replaceChild(lord.template("boardPageLower", c.model), lowerPlaceholder);
            var pagesPlaceholder = lord.id("pagesPlaceholder");
            pagesPlaceholder.parentNode.replaceChild(lord.template("pagination", c.model), pagesPlaceholder);
        }
        if (!lord.data("threadNumber")) {
            var postingSpeedPlaceholder = lord.id("postingSpeedPlaceholder");
            c.model.postingSpeed = model.postingSpeed;
            postingSpeedPlaceholder.parentNode.replaceChild(lord.template("postingSpeed", c.model),
                postingSpeedPlaceholder);
        }
        c.threads = model.threads || [model.thread];
        var threads = lord.id("threads");
        lord.removeChildren(threads);
        lord.removeClass(threads, "loadingMessage");
        return c.threads.forEach(function(thread) {
            c.model.thread = thread;
            if (c.notCatalog)
                threads.appendChild(lord.node("hr"));
            threads.appendChild(lord.template(c.notCatalog ? ("thread") : "catalogThread", c.model));
        });
    }).then(function() {
        setTimeout(function() {
            var hash = lord.hash();
            if (hash && "#" != hash) {
                window.location.hash = "";
                window.location.hash = hash;
            }
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
        if (lord.getCookie("show_tripcode") === "true")
            lord.id("showTripcodeCheckbox").checked = true;
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
                a.title += " (" + key("goToThread") + ")";
            });
            lord.query("[name='hideButton'] > img").forEach(function(img) {
                img.title += " (" + key("hidePost") + ")";
            });
            var table = lord.queryOne(".postformMarkup");
            if (table) {
                ["Bold", "Italics", "StrikedOut", "Underlined", "Spoiler", "Quotation", "Code"].forEach(function(s) {
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
                btn.title += " (" + key("submitReply") + ")";
        }
        if (lord.showTripcode(lord.data("threadNumber"))) {
            var postForm = lord.id("postForm");
            if (postForm) {
                var sw = lord.nameOne("tripcode", postForm);
                if (sw)
                    sw.checked = true;
            }
        }
        var fav = lord.getLocalObject("favoriteThreads", {});
        var currentBoardName = lord.data("boardName");
        var spellsEnabled = lord.getLocalObject("spellsEnabled", true);
        var posts = lord.query(".post, .opPost");
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
            lord.gently(posts, function(post) {
                lord.processPost(post, map[+post.id]);
            }, {
                delay: 10,
                n: 10
            });
        }).catch(lord.handleError);
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
        var lastLang = lord.getLocalObject("lastCodeLang", "-");
        var sel = lord.queryOne(".postformMarkup > span > [name='langSelect']");
        if (sel) {
            lord.arr(sel.options).forEach(function(opt) {
                if (opt.value == lastLang)
                    opt.selected = true;
            });
        }
        lord.setPostformMarkupVisible(!lord.getLocalObject("hidePostformMarkup", false));
        if (lord.getLocalObject("strikeOutHiddenPostLinks", true))
            lord.strikeOutHiddenPostLinks();
        if (lord.getLocalObject("signOpPostLinks", true))
            lord.signOpPostLinks();
        if (lord.getLocalObject("signOwnPostLinks", true))
            lord.signOwnPostLinks(document.body);
        if (!lord.data("threadNumber")) {
            lord.api("lastPostNumber", { boardName: currentBoardName }).then(function(result) {
                var lastPostNumbers = lord.getLocalObject("lastPostNumbers", {});
                lastPostNumbers[currentBoardName] = result.lastPostNumber;
                lord.setLocalObject("lastPostNumbers", lastPostNumbers);
            }).catch(lord.handleError);
        }
        lord.initFiles();
        lord.scrollHandler();
    }).catch(lord.handleError);
};

lord.scrollHandler = function(e) {
    var k = 1300;
    var top = ((window.innerHeight + window.scrollY + k) >= document.body.offsetHeight);
    var bottom = (window.scrollY <= k);
    lord.queryOne(".navigationButtonTop").style.display = bottom ? "none" : "";
    lord.queryOne(".navigationButtonBottom").style.display = top ? "none" : "";
};

window.addEventListener("load", function load() {
    window.removeEventListener("load", load, false);
    lord.initializeOnLoadBaseBoard();
}, false);

window.addEventListener("scroll", lord.scrollHandler, false);
