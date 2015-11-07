/*ololord global object*/

var lord = lord || {};

/*Variables*/

lord.postPreviews = {};
lord.lastPostPreview = null;
lord.lastPostPreviewTimer = null;
lord.images = {};
lord.img = null;
lord.imgWrapper = null;
lord.lastPostFormPosition = "";
lord.complainVideo = null;
lord.files = null;
lord.filesMap = null;
lord.spells = null;
lord.worker = new Worker("/js/worker.js");
lord.youtubeApplied = false;
lord.lastSelectedElement = null;
lord.customPostBodyPart = {};
lord.customEditPostDialogPart = {};

/*Functions*/

lord.isSpecialThumbName = function(thumbName) {
    return lord.isAudioType(thumbName) || lord.isImageType(thumbName) || lord.isVideoType(thumbName);
};

lord.getPostData = function(post, youtube) {
    if (!post)
        return null;
    var currentBoardName = lord.data("boardName");
    var threadNumber = +lord.data("threadNumber");
    var postNumber = lord.data("number", post);
    if (!threadNumber) {
        if (lord.hasClass(post, "opPost"))
            threadNumber = postNumber;
        else
            threadNumber = lord.data("threadNumber", post);
    }
    var p = {
        "board": currentBoardName,
        "thread": threadNumber,
        "number": postNumber
    };
    if (lord.getLocalObject("spellsEnabled", true)) {
        var blockquote = lord.queryOne("blockquote", post);
        var files = [];
        lord.query(".postFile", post).forEach(function(file) {
            var img = lord.queryOne(".postFileFile > a > img", file);
            var f = {
                "type": +lord.nameOne("type", file).value,
                "size": +lord.nameOne("sizeKB", file).value,
                "sizeText": lord.getPlainText(lord.queryOne(".postFileSize", file)),
                "width": +lord.nameOne("sizeX", file).value,
                "height": +lord.nameOne("sizeY", file).value,
                "thumb": {
                    "width": +img.width,
                    "height": +img.height,
                    "base64Data": lord.getImageBase64Data(img)
                }
            };
            files.push(f);
        });
        var mailto = lord.queryOne(".mailtoName", post);
        var trip = lord.queryOne(".tripcode", post);
        p.hidden = !!lord.getLocalObject("hiddenPosts", {})[currentBoardName + "/" + postNumber];
        p.innerHTML = post.innerHTML;
        p.text = lord.getPlainText(blockquote);
        p.textHTML = blockquote.innerHTML;
        p.mailto = (mailto ? mailto.href : undefined);
        p.tripcode = (trip ? trip.value : undefined);
        p.userName = lord.queryOne(".someName", post).value;
        p.isDefaultUserName = !!lord.queryOne(".defaultUserName", post);
        p.subject = lord.queryOne(".postSubject", post).value;
        p.isDefaultSubject = !!lord.queryOne(".defaultPostSubject", post);
        p.files = ((files.length > 0) ? files : undefined);
    }
    if (youtube) {
        var ytvideos = [];
        var q = "a[href^='http://youtube.com'], a[href^='https://youtube.com'], "
            + "a[href^='http://www.youtube.com'], a[href^='https://www.youtube.com'], "
            + "a[href^='http://m.youtube.com'], a[href^='https://m.youtube.com']";
        lord.query(q, post).forEach(function(video) {
            ytvideos.push(video.href);
        });
        p.youtube = ((ytvideos.length > 0) ? ytvideos : undefined);
        var cvideos = [];
        var q = "a[href^='http://coub.com'], a[href^='https://coub.com']";
        lord.query(q, post).forEach(function(video) {
            cvideos.push(video.href);
        });
        p.coub = ((cvideos.length > 0) ? cvideos : undefined);
    }
    return p;
};

lord.processPosts = function(spells, youtube) {
    if (!spells && !youtube)
        return;
    (function(spells, youtube) {
        var posts = lord.query(".post:not(#postTemplate), .opPost");
        var boardName = lord.text("currentBoardName");
        lord.gently(posts, function(post) {
            var p = lord.getPostData(post, youtube);
            if (!p)
                return;
            youtube = youtube ? { "apiKey": lord.text("youtubeApiKey") } : undefined;
            lord.worker.postMessage({
                "type": "processPosts",
                "data": {
                    "youtube": youtube,
                    "posts": [p],
                    "spells": spells
                }
            }); //No way to transfer an object with subobjects
        }, {
            delay: 10,
            n: 10
        });
    })(spells, youtube);
};

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

lord.removeReferences = function(postNumber) {
    postNumber = +postNumber;
    if (isNaN(postNumber))
        return;
    var referencedByTrs = lord.name("referencedByTr");
    if (!referencedByTrs)
        return;
    for (var i = 0; i < referencedByTrs.length; ++i) {
        var referencedByTr = referencedByTrs[i];
        var as = lord.query("a", referencedByTr);
        if (!as)
            continue;
        for (var j = 0; j < as.length; ++j) {
            var a = as[j];
            if (a.innerHTML.replace("&gt;&gt;" + postNumber, "") != a.innerHTML) {
                a.parentNode.removeChild(a);
                if (as.length < 2)
                    referencedByTr.style.display = "none";
                break;
            }
        }
    }
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
        lord.getModel("api/captchaQuota", "boardName=" + lord.data("boardName")).then(function(quota) {
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
                lord.getModel("misc/tr").then(function(mode) {
                    hiddenCaptcha.appendChild(captcha);
                    var span = lord.node("span");
                    lord.addClass(span, "noCaptchaText");
                    var text = model.tr.noCaptchaText + ". " + model.tr.captchaQuotaText + " " + res;
                    span.appendChild(lord.node("text", text));
                    td.appendChild(span);
                });
            } else {
                lord.id("captchaContainer").appendChild(captcha);
            }
            if (lord.reloadCaptchaFunction && "hiddenCaptcha" !== captcha.parentNode.id)
                lord.reloadCaptchaFunction();
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

lord.createPostNode = function(post, permanent) {
    if (typeof permanent == "undefined")
        permanent = true;
    var c = {};
    console.log(c);
    return lord.getModel([
        "misc/base",
        "misc/tr",
        "misc/boards",
        {
            name: "misc/board",
            query: "boardName=" + post.boardName
        },
        {
            name: "api/threadInfo",
            query: "boardName=" + post.boardName + "&threadNumber=" + post.threadNumber
        }
    ], true).then(function(model) {
        var settings = lord.settings();
        c.model = model;
        c.locale = model.site.locale;
        c.dateFormat = model.site.dateFormat;
        c.timeOffset = ("local" == settings.time) ? settings.timeZoneOffset : model.site.timeOffset;
        c.model.settings = settings;
        return lord.getModel("api/threadInfo", "boardName=" + post.boardName + "&threadNumber=" + post.threadNumber);
    }).then(function(thread) {
        c.model.thread = thread;
        c.model.post = post;
        c.model.compareRatings = function(r1, r2) {
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
        c.model.compareRegisteredUserLevels = function(l1, l2) {
            if (!l1)
                l1 = null;
            if (!l2)
                l2 = null;
            if (["ADMIN", "MODER", "USER", null].indexOf(l2) < 0)
                throw "Invalid registered user level l2: " + l2;
            switch (l1) {
            case "ADMIN":
                return (l1 == l2) ? 0 : 1;
            case "MODER":
                if (l1 == l2)
                    return 0;
                return ("ADMIN" == l2) ? -1 : 1;
            case "USER":
                if (l1 == l2)
                    return 0;
                return (null == l2) ? 1 : -1;
            case null:
                return (l1 == l2) ? 0 : -1;
            default:
                throw "Invalid reistered user level l1: " + l1;
            }
        };
        c.model.formattedDate = function(date) {
            return moment(date).utcOffset(c.timeOffset).locale(c.locale).format(c.dateFormat);
        };
        var indexes = [];
        for (var i = 0; i < 60; i += 10)
            indexes.push(i);
        var promises = indexes.map(function(index) {
            if (!lord.customPostBodyPart[index])
                return Promise.resolve(null);
            return lord.customPostBodyPart[index]().then(function(part) {
                if (!part)
                    return Promise.resolve(null);
                return Promise.resolve({
                    index: index,
                    part: part
                });
            });
        });
        return Promise.all(promises);
    }).then(function(parts) {
        c.model.customPostBodyPart = {};
        parts.forEach(function(part) {
            if (!part)
                return;
            c.model.customPostBodyPart[part.index] = part.part;
        });
        return lord.getTemplate("post");
    }).then(function(template) {
        var nodes = $.parseHTML(template(c.model));
        c.node = (nodes.length > 1) ? nodes[1] : nodes[0];
        if (lord.getLocalObject("strikeOutHiddenPostLinks", true))
            lord.strikeOutHiddenPostLinks(c.node);
        if (lord.getLocalObject("signOpPostLinks", true))
            lord.signOpPostLinks(c.node);
        if (lord.getLocalObject("signOwnPostLinks", true))
            lord.signOwnPostLinks(c.node);
        if (!permanent) {
            var actions = lord.queryOne(".postActions", c.node);
            actions.parentNode.removeChild(actions);
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
            /*var youtube = lord.getLocalObject("showYoutubeVideosTitles", true);
            var p = lord.getPostData(c.node, youtube);
            if (p) {
                youtube = youtube ? { "apiKey": lord.data("youtubeApiKey") } : undefined;
                var posts = [p];
                lord.worker.postMessage({
                    "type": "processPosts",
                    "data": {
                        "youtube": youtube,
                        "posts": posts,
                        "spells": (lord.getLocalObject("spellsEnabled", true) ? lord.spells : undefined)
                    }
                }); //No way to transfer an object with subobjects
            }*/
        }
        if (!post.referencedPosts || post.referencedPosts.length < 1)
            return Promise.resolve();
        var model = {
            site: {
                pathPrefix: lord.data("sitePathPrefix")
            },
            board: {
                name: lord.data("boardName")
            }
        };
        return lord.getTemplate("postReference").then(function(template) {
            var promises = post.referencedPosts.filter(function(reference) {
                return reference.boardName == lord.data("boardName") && lord.id("post" + reference.postNumber);
            }).map(function(reference) {
                var targetPost = lord.id("post" + reference.postNumber);
                lord.nameOne("referencedByTr", targetPost).style.display = "";
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
                    threadNumber: post.threadNumber
                };
                var nodes = $.parseHTML(template(model));
                var a = (nodes.length > 1) ? nodes[1] : nodes[0];
                referencedBy.appendChild(lord.node("text", " "));
                referencedBy.appendChild(a);
                if (lord.getLocalObject("strikeOutHiddenPostLinks", true))
                    lord.strikeOutHiddenPostLinks(targetPost);
                if (lord.getLocalObject("signOpPostLinks", true))
                    lord.signOpPostLinks(targetPost);
                if (lord.getLocalObject("signOwnPostLinks", true))
                    lord.signOwnPostLinks(targetPost);
                return Promise.resolve();
            });
            return Promise.all(promises);
        });
    }).then(function() {
        return c.node;
    });
};

lord.updatePost = function(postNumber) {
    var post = lord.id("post" + postNumber);
    if (!post)
        return Promise.reject("No such post");
    var boardName = lord.data("boardName");
    return lord.getModel("api/post", "boardName=" + boardName + "&postNumber=" + postNumber).then(function(model) {
        return lord.createPostNode(model, true);
    }).then(function(newPost) {
        post.parentNode.replaceChild(newPost, post);
        return Promise.resolve();
    });
};

lord.clearFileInput = function(div) {
    var preview = div.querySelector("img");
    if (preview && div == preview.parentNode)
        preview.src = "/" + lord.data("sitePathPrefix") + "img/addfile.png";
    var span = div.querySelector("span");
    if (!!span && div == span.parentNode) {
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
        return Promise.resolve("");
    return lord.getModel("misc/tr").then(function(model) {
        if (sz / 1024 >= 1) {
            sz /= 1024;
            if (sz / 1024 >= 1) {
                sz = (sz / 1024).toFixed(1);
                sz += " " + model.tr.megabytesText;
            } else {
                sz = sz.toFixed(1);
                sz += " " + model.tr.kilobytesText;
            }
        } else {
            sz = sz.toString();
            sz += " " + model.tr.bytesText;
        }
        return Promise.resolve(sz);
    });
};

lord.getFileHashes = function(div) {
    var parent = div.parentNode.parentNode;
    var fhs = parent.querySelector("[name='fileHashes']");
    if (fhs)
        return fhs;
    return parent.parentNode.parentNode.parentNode.querySelector("[name='fileHashes']");
};

lord.getAdditionalCount = function(el) {
    if (!el)
        return 0;
    el = el.parentNode;
    if (!el)
        return 0;
    el = el.parentNode;
    if (!el)
        return 0;
    el = el.parentNode;
    if (!el)
        return 0;
    el = el.parentNode;
    if (!el)
        return 0;
    el = lord.nameOne("additionalCount", el);
    return el ? el.value : 0;
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
    if (!!e.button)
        return;
    var t = e.target;
    if (!!t && !!lord.img && t == lord.img)
        return;
    while (!!t) {
        if (t.tagName === "A" && (!!t.onclick || !!t.onmousedown || !!t.href))
            return;
        t = t.parentNode;
    }
    lord.hideImage();
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

lord.addYoutubeButton = function(post, youtube) {
    if (!post || !youtube)
        return;
    lord.forIn(youtube, function(info, href) {
        var link = lord.queryOne("a[href='" + href + "']", post);
        if (!link)
            return;
        var img = lord.node("img");
        img.src = "https://youtube.com/favicon.ico";
        img.title = "YouTube";
        link.parentNode.insertBefore(img, link);
        link.parentNode.insertBefore(lord.node("text", " "), link);
        link.replaceChild(lord.node("text", info.videoTitle), link.firstChild);
        link.title = info.channelTitle;
        link.thumb = info.thumbnail;
        link.onmouseover = function(e) {
            if (this.img) {
                this.img.style.display = "";
                document.body.appendChild(this.img);
                return;
            }
            if (!this.thumb)
                return;
            this.img = lord.node("img");
            this.img.width = this.thumb.width;
            this.img.height = this.thumb.height;
            this.img.src = this.thumb.url;
            lord.addClass(this.img, "movableImage");
            this.img.style.left = (e.clientX + 30) + "px";
            this.img.style.top = (e.clientY - 10) + "px";
            document.body.appendChild(this.img);
        };
        link.onmousemove = function(e) {
            if (!this.img)
                return;
            this.img.style.left = (e.clientX + 30) + "px";
            this.img.style.top = (e.clientY - 10) + "px";
        };
        link.onmouseout = function(e) {
            if (!this.img)
                return;
            document.body.removeChild(this.img);
            this.img.style.display = "none";
        };
        var a = lord.node("a");
        lord.addClass(a, "expandCollapse");
        a.lordExpanded = false;
        a.onclick = (function(videoId) {
            if (this.lordExpanded) {
                this.parentNode.removeChild(this.nextSibling);
                this.parentNode.removeChild(this.nextSibling);
                this.replaceChild(lord.node("text", "[" + lord.text("expandVideoText") + "]"), this.childNodes[0]);
                lord.removeClass(this.parentNode, "expand");
            } else {
                lord.addClass(this.parentNode, "expand");
                var iframe = lord.node("iframe");
                iframe.src = "https://youtube.com/embed/" + videoId + "?autoplay=1";
                iframe.allowfullscreen = true;
                iframe.frameborder = "0px";
                iframe.height = "360";
                iframe.width = "640";
                iframe.display = "block";
                var parent = this.parentNode;
                var el = this.nextSibling;
                if (el) {
                    parent.insertBefore(lord.node("br"), el);
                    parent.insertBefore(iframe, el);
                } else {
                    parent.appendChild(lord.node("br"));
                    parent.appendChild(iframe);
                }
                this.replaceChild(lord.node("text", "[" + lord.text("collapseVideoText") + "]"), this.childNodes[0]);
            }
            this.lordExpanded = !this.lordExpanded;
        }).bind(a, info.id);
        a.appendChild(lord.node("text", "[" + lord.text("expandVideoText") + "]"));
        var el = link.nextSibling;
        var parent = link.parentNode;
        if (el) {
            parent.insertBefore(lord.node("text", " "), el);
            parent.insertBefore(a, el);
        } else {
            parent.appendChild(lord.node("text", " "));
            parent.appendChild(a);
        }
    });
};

lord.addCoubButton = function(post, coub) {
    if (!post || !coub)
        return;
    lord.forIn(coub, function(info, href) {
        var link = lord.queryOne("a[href='" + href + "']", post);
        if (!link)
            return;
        var img = lord.node("img");
        img.src = "https://coub.com/favicon.ico";
        img.title = "COUB";
        img.width = 16;
        img.height = 16;
        link.parentNode.insertBefore(img, link);
        link.parentNode.insertBefore(lord.node("text", " "), link);
        link.replaceChild(lord.node("text", info.videoTitle), link.firstChild);
        link.title = info.authorName;
        link.thumb = info.thumbnail;
        link.onmouseover = function(e) {
            if (this.img) {
                this.img.style.display = "";
                document.body.appendChild(this.img);
                return;
            }
            if (!this.thumb)
                return;
            this.img = lord.node("img");
            this.img.width = this.thumb.width;
            this.img.height = this.thumb.height;
            this.img.src = this.thumb.url;
            lord.addClass(this.img, "movableImage");
            this.img.style.left = (e.clientX + 30) + "px";
            this.img.style.top = (e.clientY - 10) + "px";
            document.body.appendChild(this.img);
        };
        link.onmousemove = function(e) {
            if (!this.img)
                return;
            this.img.style.left = (e.clientX + 30) + "px";
            this.img.style.top = (e.clientY - 10) + "px";
        };
        link.onmouseout = function(e) {
            if (!this.img)
                return;
            document.body.removeChild(this.img);
            this.img.style.display = "none";
        };
        var a = lord.node("a");
        lord.addClass(a, "expandCollapse");
        a.lordExpanded = false;
        a.onclick = (function(videoId) {
            if (this.lordExpanded) {
                this.parentNode.removeChild(this.nextSibling);
                this.parentNode.removeChild(this.nextSibling);
                this.replaceChild(lord.node("text", "[" + lord.text("expandVideoText") + "]"), this.childNodes[0]);
                lord.removeClass(this.parentNode, "expand");
            } else {
                lord.addClass(this.parentNode, "expand");
                var iframe = lord.node("iframe");
                iframe.src = "https://coub.com/embed/" + videoId
                    + "?muted=false&autostart=false&originalSize=false&hideTopBar=false&startWithHD=false";
                iframe.allowfullscreen = true;
                iframe.frameborder = "0px";
                iframe.height = "360";
                iframe.width = "480";
                iframe.display = "block";
                var parent = this.parentNode;
                var el = this.nextSibling;
                if (el) {
                    parent.insertBefore(lord.node("br"), el);
                    parent.insertBefore(iframe, el);
                } else {
                    parent.appendChild(lord.node("br"));
                    parent.appendChild(iframe);
                }
                this.replaceChild(lord.node("text", "[" + lord.text("collapseVideoText") + "]"), this.childNodes[0]);
            }
            this.lordExpanded = !this.lordExpanded;
        }).bind(a, info.id);
        a.appendChild(lord.node("text", "[" + lord.text("expandVideoText") + "]"));
        var el = link.nextSibling;
        var parent = link.parentNode;
        if (el) {
            parent.insertBefore(lord.node("text", " "), el);
            parent.insertBefore(a, el);
        } else {
            parent.appendChild(lord.node("text", " "));
            parent.appendChild(a);
        }
    });
};

lord.addPostToHidden = function(boardName, postNumber) {
    postNumber = +postNumber;
    if (!boardName || isNaN(postNumber))
        return;
    var hiddenPosts = lord.getLocalObject("hiddenPosts", {});
    hiddenPosts[boardName + "/" + postNumber] = {};
    lord.setLocalObject("hiddenPosts", hiddenPosts);
    (function(boardName, postNumber) {
        lord.ajaxRequest("get_post", [boardName, +postNumber], lord.RpcGetPostId, function(res) {
            if (!res)
                return;
            var hiddenPosts = lord.getLocalObject("hiddenPosts", {});
            if (!hiddenPosts[boardName + "/" + postNumber])
                return;
            var subject = (res["subject"] ? res["subject"] : res["text"]).substring(0, 150);
                hiddenPosts[boardName + "/" + postNumber].subject = subject;
        });
    })(boardName, postNumber);
};

lord.tryHidePost = function(post, list) {
    if (!post)
        return;
    var postNumber = post.id.replace("post", "");
    if (isNaN(+postNumber))
        return;
    var boardName = lord.text("currentBoardName");
    if (!list)
        list = lord.getLocalObject("hiddenPosts", {});
    if (!list[boardName + "/" + postNumber])
        return;
    lord.addClass(post, "hiddenPost");
    var thread = lord.id("thread" + postNumber);
    if (!thread)
        return;
    lord.addClass(thread, "hiddenThread");
    lord.addClass(lord.id("threadOmitted" + postNumber), "hiddenPosts");
    lord.addClass(lord.id("threadPosts" + postNumber), "hiddenPosts");
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
        lord.getModel("misc/tr").then(function(model) {
            lord.id("showHidePostFormButton" + position).innerHTML = model.tr.hidePostFormText;
        });
    }
};

lord.quickReply = function(el) {
    var postNumber = +lord.data("number", el, true);
    if (isNaN(postNumber) || postNumber <= 0)
        return;
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    var postForm = lord.id("postForm");
    var targetContainer = post.parentNode;
    var same = (postForm.parentNode == targetContainer);
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
            lord.getModel("misc/tr").then(function(model) {
                lord.id("showHidePostFormButton" + position).innerHTML = model.tr.showPostFormText;
            });
        }
    });
};

lord.switchShowTripcode = function() {
    var postForm = lord.id("postForm");
    var sw = lord.nameOne("tripcode", postForm);
    if (sw.checked)
        lord.setLocalObject("showTripcode", true);
    else
        lord.removeLocalObject("showTripcode");
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

lord.getRawPostText = function(boardName, postNumber) {
    if (!boardName || isNaN(+postNumber))
        return;
    var stage2 = function(text) {
        var ta = lord.node("textarea");
        ta.value = text;
        ta.style.height = "400px";
        ta.style.width = "400px";
        lord.showDialog(lord.text("rawPostTextText"), null, ta);
    };
    if (lord.text("currntBoardName") == boardName) {
        var post = lord.id("post" + postNumber);
        var rawPostText = lord.nameOne("rawText", post);
        if (rawPostText)
            return stage2(rawPostText.value);
    }
    lord.ajaxRequest("get_post", [boardName, +postNumber], lord.RpcGetPostId, function(res) {
        return stage2(res["rawPostText"]);
    });
};

lord.deletePost = function(el) {
    var c = {};
    var postNumber = +lord.data("number", el, true);
    lord.getModel(["misc/base", "misc/tr"], true).then(function(model) {
        c.model = model;
        c.model.boardName = lord.data("boardName", el, true);
        c.model.postNumber = postNumber;
        return lord.getTemplate("deletePostDialog");
    }).then(function(template) {
        c.div = $.parseHTML(template(c.model))[0];
        return lord.showDialog("enterPasswordTitle", "enterPasswordText", c.div);
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        var formData = new FormData(form);
        return $.ajax(form.action, {
            type: "POST",
            data: formData,
            processData: false,
            contentType: false
        });
    }).then(function(result) {
        if (result.errorMessage)
            return Promise.reject(result.errorMessage);
        var post = lord.id("post" + postNumber);
        if (!post)
            return Promise.reject("No such post");
        if (lord.data("isOp", post)) {
            if (!isNaN(+lord.data("threadNumber"))) {
                window.location = c.model.site.protocol + "://" + c.model.site.domain + "/" + c.model.site.pathPrefix
                    + lord.data("boardName");
            } else {
                lord.reloadPage();
            }
        } else {
            post.parentNode.removeChild(post);
        }
        //TODO
        /*lord.removeReferences(postNumber);
        var postLinks = lord.query("a");
        if (!!postLinks) {
            for (var i = 0; i < postLinks.length; ++i) {
                var link = postLinks[i];
                if (("&gt;&gt;" + postNumber) !== link.innerHTML)
                    continue;
                var text = link.innerHTML.replace("&gt;&gt;", ">>");
                link.parentNode.replaceChild(lord.node("text", text), link);
            }
        }*/
    }).catch(function(err) {
        console.log(err);
    });
};

lord.setThreadFixed = function(boardName, postNumber, fixed) {
    if (!boardName || isNaN(+postNumber))
        return;
    if (!lord.getCookie("hashpass"))
        return lord.showPopup(lord.text("notLoggedInText"), {type: "critical"});
    lord.ajaxRequest("set_thread_fixed", [boardName, +postNumber, !!fixed], lord.RpcSetThreadFixedId, lord.reloadPage);
};

lord.setThreadOpened = function(boardName, postNumber, opened) {
    if (!boardName || isNaN(+postNumber))
        return;
    if (!lord.getCookie("hashpass"))
        return lord.showPopup(lord.text("notLoggedInText"), {type: "critical"});
    lord.ajaxRequest("set_thread_opened", [boardName, +postNumber, !!opened], lord.RpcSetThreadOpenedId, lord.reloadPage);
};

lord.moveThread = function(boardName, threadNumber) {
    if (!boardName || isNaN(+threadNumber))
        return;
    if (!lord.getCookie("hashpass"))
        return lord.showPopup(lord.text("notLoggedInText"), {type: "critical"});
    var title = lord.text("moveThreadText");
    var div = lord.node("div");
    div.appendChild(lord.node("text", lord.text("boardLabelText")));
    var selBoard = lord.id("availableBoardsSelect").cloneNode(true);
    var b = lord.queryOne("[value='" + boardName + "']", selBoard);
    b.parentNode.removeChild(b);
    b = lord.queryOne("[value='*']", selBoard);
    b.parentNode.removeChild(b);
    selBoard.style.display = "block";
    div.appendChild(selBoard);
    div.appendChild(lord.node("text", lord.text("moveThreadWarningText")));
    lord.showDialog(title, null, div, function() {
        var targetBoardName = selBoard.options[selBoard.selectedIndex].value;
        lord.ajaxRequest("move_thread", [boardName, +threadNumber, targetBoardName], lord.RpcMoveThreadId, function(res) {
            var href = location.href.split("/" + boardName).shift();
            if (href[href.length - 1] != "/")
                href += "/";
            href += targetBoardName + "/thread/" + res + ".html";
            location.href = href;
        });
    });
};

lord.banUser = function(boardName, postNumber) {
    if (!boardName || isNaN(+postNumber))
        return;
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    var ip = lord.nameOne("number", post);
    if (!ip)
        return;
    ip = ip.title;
    if (!ip)
        return;
    lord.ajaxRequest("get_user_ban_info", [ip], lord.RpcGetUserBanInfoId, function(res) {
        if (!res)
            return;
        var title = lord.text("banUserText");
        var div = lord.node("div");
        var div1 = lord.node("div");
        lord.forIn(lord.availableBoards(), function(bt, bn) {
            var div2 = lord.node("div");
            lord.addClass(div2, "nowrap");
            var binp = lord.node("input");
            binp.type = "hidden";
            binp.setAttribute("name", "boardName");
            binp.value = bn;
            div2.appendChild(binp);
            div2.appendChild(lord.node("text", "[" + bn + "] " + bt + " "));
            var selLevel = lord.id("banLevelsSelect").cloneNode(true);
            selLevel.style.display = "";
            selLevel.setAttribute("name", "level");
            if (res[bn]) {
                for (var i = 0; i < selLevel.options.length; ++i) {
                    if (+selLevel.options[i] == res[bn].level) {
                        selLevel.selectedIndex = i;
                        break;
                    }
                }
            } else {
                selLevel.selectedIndex = 0;
            }
            div2.appendChild(selLevel);
            div2.appendChild(lord.node("text", " "));
            var expires = lord.node("input");
            expires.type = "text";
            expires.setAttribute("name", "expires");
            expires.size = "23";
            expires.placeholder = lord.text("banExpiresLabelText") + " <dd.MM.yyyy:hh>";
            if (res[bn])
                expires.value = res[bn].expires;
            div2.appendChild(expires);
            div2.appendChild(lord.node("text", " "));
            var reason = lord.node("input");
            reason.type = "text";
            reason.placeholder = lord.text("banReasonLabelText") + " [...]";
            reason.setAttribute("name", "reason");
            reason.size = "33";
            if (res[bn])
                reason.value = res[bn].reason;
            div2.appendChild(reason);
            div1.appendChild(div2);
        });
        div.appendChild(div1);
        div.appendChild(lord.node("br"));
        var div2 = lord.node("div");
        var btnSel = lord.node("button");
        btnSel.appendChild(lord.node("text", lord.text("selectAllText")));
        btnSel.onclick = function() {
            var levelInd = lord.nameOne("level", div2).selectedIndex;
            var expires = lord.nameOne("expires", div2).value;
            var reason = lord.nameOne("reason", div2).value;
            lord.query("div", div1).forEach(function(d) {
                lord.nameOne("level", d).selectedIndex = levelInd;
                lord.nameOne("expires", d).value = expires;
                lord.nameOne("reason", d).value = reason;
            });
        };
        div2.appendChild(btnSel);
        div2.appendChild(lord.node("text", " "));
        var selLevel = lord.id("banLevelsSelect").cloneNode(true);
        selLevel.style.display = "";
        selLevel.setAttribute("name", "level");
        selLevel.selectedIndex = 0;
        div2.appendChild(selLevel);
        div2.appendChild(lord.node("text", " "));
        var expires = lord.node("input");
        expires.type = "text";
        expires.setAttribute("name", "expires");
        expires.placeholder = lord.text("banExpiresLabelText") + " <dd.MM.yyyy:hh>";
        expires.size = "23";
        div2.appendChild(expires);
        div2.appendChild(lord.node("text", " "));
        var reason = lord.node("input");
        reason.type = "text";
        reason.placeholder = lord.text("banReasonLabelText") + " [...]";
        reason.setAttribute("name", "reason");
        reason.size = "33";
        div2.appendChild(reason);
        div.appendChild(div2);
        div.appendChild(lord.node("br"));
        var div3 = lord.node("div");
        var selBoards = lord.id("availableBoardsSelect").cloneNode(true);
        selBoards.style.display = "";
        div3.appendChild(selBoards);
        div3.appendChild(lord.node("text", " "));
        var btnDel = lord.node("button");
        btnDel.appendChild(lord.node("text", lord.text("delallButtonText")));
        btnDel.onclick = function() {
            var bn = selBoards.options[selBoards.selectedIndex].value;
            lord.ajaxRequest("delall", [ip, bn], lord.RpcBanPosterId, function(res) {
                lord.reloadPage();
            });
        };
        div3.appendChild(btnDel);
        div.appendChild(div3);
        lord.showDialog(title, null, div, function() {
            var bans = [];
            lord.query("div", div1).forEach(function(d) {
                var selLevel = lord.nameOne("level", d);
                bans.push({
                    "boardName": lord.nameOne("boardName", d).value,
                    "level": +selLevel.options[selLevel.selectedIndex].value,
                    "expires": lord.nameOne("expires", d).value,
                    "reason": lord.nameOne("reason", d).value
                });
            });
            var params = {
                "boardName": boardName,
                "postNumber": +postNumber,
                "bans": bans
            };
            lord.ajaxRequest("ban_poster", [params], lord.RpcBanPosterId, function(res) {
                lord.reloadPage();
            });
        });
    });
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
    } catch (ex) {
        //Do nothing
    }
};

lord.addFile = function(boardName, postNumber) {
    if (!boardName || isNaN(+postNumber))
        return;
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    var title = lord.text("addFileText");
    var div = lord.id("addFileTemplate").cloneNode(true);
    var form = lord.queryOne("form", div);
    div.id = "";
    div.style.display = "";
    lord.nameOne("additionalCount", div).value = lord.query(".postFile", post).length;
    lord.showDialog(title, null, div, function() {
        if (!lord.getCookie("hashpass"))
            return lord.showPopup(lord.text("notLoggedInText"), {type: "critical"});
        lord.nameOne("postNumber", form).value = postNumber;
        var formData = new FormData(form);
        lord.query(".postformFile", form).forEach(function(div) {
            if (div.droppedFile)
                formData.append(div.droppedFileName || "file", div.droppedFile);
            else if (div.fileUrl)
                formData.append(div.droppedFileName, div.fileUrl);
        });
        var xhr = new XMLHttpRequest();
        xhr.open("POST", form.action);
        var progress = lord.node("progress");
        lord.addClass(progress, "progressBlocking");
        progress.max = 100;
        progress.value = 0;
        document.body.appendChild(progress);
        lord.toCenter(progress, progress.offsetWidth, progress.offsetHeight);
        xhr.upload.onprogress = function(e) {
            progress.value = Math.floor(100 * (e.loaded / e.total));
        };
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    document.body.removeChild(progress);
                    var response = xhr.responseText;
                    var err = response.error;
                    if (err)
                        return lord.showPopup(err, {type: "critical"});
                    lord.updatePost(postNumber, post);
                } else {
                    document.body.removeChild(progress);
                    lord.showPopup(lord.text("ajaxErrorText") + " " + xhr.status, {type: "critical"});
                }
            }
        };
        xhr.send(formData);
        return false;
    });
};

lord.editPost = function(el) {
    var boardName = lord.data("boardName", el, true);
    var postNumber = +lord.data("number", el, true);
    var c = {};
    lord.getModel("api/post", "boardName=" + boardName + "&postNumber=" + postNumber).then(function(post) {
        c.model = { post: post };
        return lord.getModel("api/threadInfo", "boardName=" + post.boardName + "&threadNumber=" + post.threadNumber);
    }).then(function(thread) {
        c.model.thread = thread;
        return lord.getModel([
            "misc/base",
            "misc/tr",
            {
                name: "misc/board",
                query: "boardName=" + boardName
            }
        ], true);
    }).then(function(model) {
        c.model = merge.recursive(c.model, model);
        c.model.compareRegisteredUserLevels = function(l1, l2) {
            if (!l1)
                l1 = null;
            if (!l2)
                l2 = null;
            if (["ADMIN", "MODER", "USER", null].indexOf(l2) < 0)
                throw "Invalid registered user level l2: " + l2;
            switch (l1) {
            case "ADMIN":
                return (l1 == l2) ? 0 : 1;
            case "MODER":
                if (l1 == l2)
                    return 0;
                return ("ADMIN" == l2) ? -1 : 1;
            case "USER":
                if (l1 == l2)
                    return 0;
                return (null == l2) ? 1 : -1;
            case null:
                return (l1 == l2) ? 0 : -1;
            default:
                throw "Invalid reistered user level l1: " + l1;
            }
        };
        var indexes = [];
        for (var i = 0; i < 110; i += 10)
            indexes.push(i);
        var promises = indexes.map(function(index) {
            if (!lord.customEditPostDialogPart[index])
                return Promise.resolve(null);
            return lord.customEditPostDialogPart[index]().then(function(part) {
                if (!part)
                    return Promise.resolve(null);
                return Promise.resolve({
                    index: index,
                    part: part
                });
            });
        });
        return Promise.all(promises);
    }).then(function(parts) {
        c.model.customEditPostDialogPart = {};
        parts.forEach(function(part) {
            if (!part)
                return;
            c.model.customEditPostDialogPart[part.index] = part.part;
        });
        return lord.getTemplate("editPostDialog");
    }).then(function(template) {
        c.div = $.parseHTML(template(c.model))[0];
        return lord.showDialog("editPostText", null, c.div);
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        var formData = new FormData(form);
        return $.ajax(form.action, {
            type: "POST",
            data: formData,
            processData: false,
            contentType: false
        });
    }).then(function(result) {
        if (result.errorMessage)
            return Promise.reject(result.errorMessage);
        return lord.updatePost(postNumber);
    }).catch(function(err) {
        console.log(err);
    });
};

lord.setPostHidden = function(boardName, postNumber) {
    if (!boardName || isNaN(+postNumber))
        return;
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    var thread = lord.id("thread" + postNumber);
    var list = lord.getLocalObject("hiddenPosts", {});
    var hidden = lord.hasClass(post, "hiddenPost");
    var f = !hidden ? lord.addClass : lord.removeClass;
    f(post, "hiddenPost");
    if (thread) {
        var omitted = lord.id("threadOmitted" + postNumber);
        var posts = lord.id("threadPosts" + postNumber);
        f(thread, "hiddenThread");
        f(omitted, "hiddenPosts");
        f(posts, "hiddenPosts");
    }
    if (!hidden) {
        list[boardName + "/" + postNumber] = {};
        (function(bn, pn) {
            lord.ajaxRequest("get_post", [bn, +pn], lord.RpcGetPostId, function(res) {
                if (!res)
                    return;
                var list = lord.getLocalObject("hiddenPosts", {});
                if (!list[bn + "/" + pn])
                    return;
                list[bn + "/" + pn].subject = (res["subject"] ? res["subject"] : res["text"]).substring(0, 150);
                list[bn + "/" + pn].threadNumber = res["threadNumber"];
                lord.setLocalObject("hiddenPosts", list);
            });
        })(boardName, postNumber);
    }
    else if (list[boardName + "/" + postNumber])
        delete list[boardName + "/" + postNumber];
    lord.setLocalObject("hiddenPosts", list);
    lord.strikeOutHiddenPostLinks();
};

lord.hideByImage = function(a) {
    if (!a)
        return;
    var img = lord.queryOne(".postFileFile > a > img", a.parentNode.parentNode);
    if (!img)
        return;
    var data = lord.base64ToArrayBuffer(lord.getImageBase64Data(img));
    var hash = lord.generateImageHash(data, img.width, img.height);
    if (!hash)
        return;
    var spells = lord.getLocalObject("spells", lord.DefaultSpells) + "\n#ihash(" + hash + ")";
    lord.setLocalObject("spells", spells);
    lord.worker.postMessage({
        "type": "parseSpells",
        "data": lord.getLocalObject("spells", lord.DefaultSpells)
    });
};

lord.deleteFile = function(boardName, postNumber, fileName) {
    if (!boardName || isNaN(+postNumber) || !fileName)
        return;
    var title = lord.text("enterPasswordTitle");
    var label = lord.text("enterPasswordText");
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    lord.showPasswordDialog(title, label, function(pwd) {
        if (null === pwd)
            return;
        if (pwd.length < 1) {
            if (!lord.getCookie("hashpass"))
                return lord.showPopup(lord.text("notLoggedInText"), {type: "critical"});
        } else if (!lord.isHashpass(pwd)) {
            pwd = lord.toHashpass(pwd);
        }
        lord.ajaxRequest("delete_file", [boardName, fileName, pwd], lord.RpcDeleteFileId, function() {
            lord.updatePost(postNumber, post);
        });
    });
};

lord.editAudioTags = function(el) {
    var fileName = lord.data("fileName", el, true);
    var c = {};
    lord.getModel("api/fileInfo", "fileName=" + fileName).then(function(fileInfo) {
        c.model = { fileInfo: fileInfo };
        return lord.getModel(["misc/base", "misc/tr"], true);
    }).then(function(model) {
        c.model = merge.recursive(c.model, model);
        return lord.getTemplate("editAudioTagsDialog");
    }).then(function(template) {
        c.div = $.parseHTML(template(c.model))[0];
        return lord.showDialog("editAudioTagsText", null, c.div);
    }).then(function(result) {
        if (!result)
            return Promise.resolve();
        var form = lord.queryOne("form", c.div);
        var formData = new FormData(form);
        return $.ajax(form.action, {
            type: "POST",
            data: formData,
            processData: false,
            contentType: false
        });
    }).then(function(result) {
        if (typeof result == "undefined")
            return Promise.resolve();
        return lord.updatePost(+lord.data("number", el, true));
    }).catch(function(err) {
        console.log(err);
    });
};

lord.addToPlaylist = function(a) {
    var boardName = lord.data("boardName", a, true);
    var fileName = lord.data("fileName", a, true);
    var tracks = lord.getLocalObject("playlist/tracks", {});
    if (tracks.hasOwnProperty(boardName + "/" + fileName))
        return;
    tracks[boardName + "/" + fileName] = {
        boardName: boardName,
        fileName: fileName,
        mimeType: lord.data("mimeType", a, true),
        bitrate: lord.data("bitrate", a, true),
        duration: lord.data("duration", a, true),
        album: lord.data("audioTagAlbum", a, true),
        artist: lord.data("audioTagArtist", a, true),
        title: lord.data("audioTagTitle", a, true),
        year: lord.data("audioTagYear", a, true)
    };
    lord.setLocalObject("playlist/tracks", tracks);
};

lord.viewPost = function(a, boardName, postNumber) {
    lord.getModel("api/post", "boardName=" + boardName + "&postNumber=" + postNumber).then(function(post) {
        if (!post)
            return Promise.reject("Failed to get post");
        if (post.errorMessage)
            return Promise.reject(post.errorMessage);
        return lord.createPostNode(post, false, boardName);
    }).then(function(post) {
        post.onmouseout = function(event) {
            var next = post;
            while (next) {
                var list = lord.traverseChildren(next);
                var e = event.toElement || event.relatedTarget;
                if (list.indexOf(e) >= 0)
                    return;
                next = next.nextPostPreview;
            }
            if (!!post.parentNode)
                post.parentNode.removeChild(post);
            if (post.previousPostPreview)
                post.previousPostPreview.onmouseout(event);
        };
        post.onmouseover = function(event) {
            post.mustHide = false;
        };
        post.previousPostPreview = lord.lastPostPreview;
        if (lord.lastPostPreview)
            lord.lastPostPreview.nextPostPreview = post;
        lord.lastPostPreview = post;
        post.mustHide = true;
        if (lord.lastPostPreviewTimer) {
            clearTimeout(lord.lastPostPreviewTimer);
            lord.lastPostPreviewTimer = null;
        }
        document.body.appendChild(post);
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
        post.style.zIndex = 9001;
    }).catch(function(err) {
        console.log(err);
    });
};

lord.noViewPost = function() {
    lord.lastPostPreviewTimer = setTimeout(function() {
        if (!lord.lastPostPreview)
            return;
        if (lord.lastPostPreview.mustHide && lord.lastPostPreview.parentNode)
            lord.lastPostPreview.parentNode.removeChild(lord.lastPostPreview);
    }, 500);
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

lord.fileAddedCommon = function(div, file) {
    if (!div || (!file && !div.fileUrl))
        return;
    var inp = lord.queryOne("input", div);
    if (!inp)
        return;
    var warn = function() {
        var c = {};
        lord.getModel("misc/tr").then(function(model) {
            c.txt = model.tr.fileTooLargeWarningText + " (>";
            return lord.readableSize(+lord.data("maxFileSize"));
        }).then(function(txt) {
            c.txt += txt + ")";
            lord.showPopup(txt, {type: "warning"});
        });
    };
    var fileName = file ? file.name : div.fileUrl.split("/").pop();
    var p;
    if (file) {
        p = lord.readableSize(file.size).then(function(txt) {
            return Promise.resolve("(" + txt + ")");
        });
        if (+file.size > +lord.data("maxFileSize"))
            warn();
    } else {
        p = Promise.resolve("[URL]");
        //TODO: get size
    }
    p.then(function(txt) {
        txt = fileName + " " + txt;
        lord.queryOne(".postformFileText", div).appendChild(lord.node("text", txt));
    });
    var _uuid = uuid.v1();
    lord.queryOne("input", div).name = "file_" + _uuid;
    div.droppedFileName = "file_" + (div.fileUrl ? "url_" : "") + _uuid;
    lord.queryOne(".ratingSelectContainer > select").name = "file_" + _uuid + "_rating";
    lord.removeFileHash(div);
    var binaryReader = new FileReader();
    var prefix = lord.data("sitePathPrefix");
    binaryReader.onload = function(e) {
        var wordArray = CryptoJS.lib.WordArray.create(e.target.result);
        var currentBoardName = lord.data("boardName");
        var fileHash = lord.toHashpass(wordArray);
        /*lord.ajaxRequest("get_file_existence", [currentBoardName, fileHash], lord.RpcGetFileExistenceId, function(res) {
            if (!res)
                return;
            var img = lord.node("img");
            img.src = "/" + prefix + "img/storage.png";
            lord.getModel("misc/tr").then(function(model) {
                img.title = model.tr.fileExistsOnServerText;
            });
            div.querySelector("span").appendChild(lord.node("text", " "));
            div.querySelector("span").appendChild(img);
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
        });*/
    };
    if (file && lord.getLocalObject("checkFileExistence", true))
        binaryReader.readAsArrayBuffer(file);
    var preview = function() {
        if (!file)
            return;
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(e) {
            div.querySelector("img").src = e.target.result;
        };
    };
    if (!!fileName.match(/\.(jpe?g|png|gif)$/i) && lord.getLocalObject("showAttachedFilePreview", true)) {
        if (!fileName.match(/\.(jpe?g)$/i) || !lord.getLocalObject("stripExifFromJpeg", true))
            preview();
    } else if (!!fileName.match(/\.(jpe?g)$/i)) {
        div.querySelector("img").src = "/" + prefix + "img/jpeg_file.png";
    } else if (!!fileName.match(/\.(png)$/i)) {
        div.querySelector("img").src = "/" + prefix + "img/png_file.png";
    } else if (!!fileName.match(/\.(gif)$/i)) {
        div.querySelector("img").src = "/" + prefix + "img/gif_file.png";
    } else if (!!fileName.match(/\.(mp3)$/i)) {
        div.querySelector("img").src = "/" + prefix + "img/mp3_file.png";
    } else if (!!fileName.match(/\.(mp4)$/i)) {
        div.querySelector("img").src = "/" + prefix + "img/mp4_file.png";
    } else if (!!fileName.match(/\.(ogg|ogv)$/i)) {
        div.querySelector("img").src = "/" + prefix + "img/ogg_file.png";
    } else if (!!fileName.match(/\.(webm)$/i)) {
        div.querySelector("img").src = "/" + prefix + "img/webm_file.png";
    } else if (!!fileName.match(/\.(wav)$/i)) {
        div.querySelector("img").src = "/" + prefix + "img/wav_file.png";
    } else if (!!fileName.match(/\.(pdf)$/i)) {
        div.querySelector("img").src = "/" + prefix + "img/pdf_file.png";
    } else {
        div.querySelector("img").src = "/" + prefix + "img/file.png";
    }
    if (file && !!fileName.match(/\.(jpe?g)$/i) && lord.getLocalObject("stripExifFromJpeg", true)) {
        var fr = new FileReader();
        fr.onload = function() {
            var dv = new DataView(fr.result);
            var offset = 0;
            var recess = 0;
            var pieces = [];
            var i = 0;
            if (dv.getUint16(offset) == 0xffd8) {
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
                if (pieces.length > 0) {
                    var newPieces = [];
                    pieces.forEach(function(v) {
                        newPieces.push(fr.result.slice(v.recess, v.offset));
                    });
                    newPieces.push(fr.result.slice(recess));
                    div.droppedFile = new File(newPieces, file.name, {"type": "image/jpeg"});
                }
                if (lord.getLocalObject("showAttachedFilePreview", true))
                    preview();
            }
        };
        fr.readAsArrayBuffer(file);
    }
    var f = inp.onchange;
    delete inp.onchange;
    inp.value = "";
    inp.onchange = f;
    div.querySelector("a").style.display = "inline";
    var maxCount = +lord.data("maxFileCount");
    var additionalCount = lord.getAdditionalCount(inp);
    if (additionalCount)
        maxCount -= +additionalCount;
    if (isNaN(maxCount))
        return;
    var parent = div.parentNode;
    if (parent.children.length >= maxCount)
        return;
    for (var i = 0; i < parent.children.length; ++i) {
        var c = parent.children[i];
        if (!c.fileHash && lord.queryOne("input", c).value === "" && !c.droppedFile)
            return;
        c.querySelector("a").style.display = "inline";
    }
    (function(div) {
        div = div.cloneNode(true);
        var span = lord.queryOne(".postformFileText", div);
        div.querySelector("a").style.display = "none";
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
    div = div.parentNode;
    if (!div)
        return;
    lord.getModel("misc/tr").then(function(model) {
        var url = prompt(model.tr.linkLabelText);
        if (null === url)
            return;
        if (div.droppedFile)
            delete div.droppedFile;
        var inp = lord.queryOne("input", div);
        inp.parentNode.replaceChild(inp.cloneNode(true), inp);
        lord.clearFileInput(div);
        div.fileUrl = url;
        lord.fileAddedCommon(div);
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
    if (parent.children.length > 1) {
        for (var i = 0; i < parent.children.length; ++i) {
            var c = parent.children[i];
            if (!c.fileHash && lord.queryOne("input", c).value === "" && !c.droppedFile)
                return;
        }
        var inp = lord.id("maxFileCount");
        if (!inp)
            return;
        var maxCount = +inp.value;
        var additionalCount = lord.getAdditionalCount(current);
        if (additionalCount)
            maxCount -= +additionalCount;
        if (isNaN(maxCount))
            return;
        if (parent.children.length >= maxCount)
            return;
        div = div.cloneNode(true);
        div.querySelector("a").style.display = "none";
        div.innerHTML = div.innerHTML; //NOTE: Workaround since we can't clear it other way
        parent.appendChild(div);
    }
    if (parent.children.length > 0) {
        var c = parent.children[0];
        if (!c.fileHash && lord.queryOne("input", c).value === "" && !c.droppedFile)
            c.querySelector("a").style.display = "none";
    }
    if (parent.children.length < 1) {
        div.querySelector("a").style.display = "none";
        div.innerHTML = div.innerHTML; //NOTE: Workaround since we can't clear it other way
        parent.appendChild(div);
    }
};

lord.browseFile = function(e, div) {
    var inp = div.querySelector("input");
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
    var span = lord.queryOne(".postformMarkup > span");
    if (!span)
        return false;
    var hide = !visible;
    lord.setLocalObject("hidePostformMarkup", hide);
    span.style.display = hide ? "none" : "";
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
    lord.getModel("misc/base").then(function(model) {
        var href = a;
        if (typeof a != "string") {
            href = model.site.protocol + "://" + model.site.domain + "/" + model.site.pathPrefix
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
                if (lord.data("deviceType") == "mobile")
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
            width = (lord.data("deviceType") == "mobile") ? 500 : 400;
            lord.img = lord.node("audio");
            lord.img.width = width + "px";
            lord.img.controls = true;
            if (lord.getLocalObject("loopAudioVideo", false))
                lord.img.loop = true;
            if (lord.data("deviceType") == "mobile")
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
    });
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

lord.addThreadToFavorites = function(boardName, threadNumber, callback, callbackError) {
    threadNumber = +threadNumber;
    if (!boardName || isNaN(threadNumber)) {
        if (typeof callbackError == "function")
            callbackError();
        return false;
    }
    var fav = lord.getLocalObject("favoriteThreads", {});
    if (fav.hasOwnProperty(boardName + "/" + threadNumber)) {
        if (typeof callbackError == "function")
            callbackError();
        return false;
    }
    lord.ajaxRequest("get_new_posts", [boardName, threadNumber, 0], lord.RpcGetNewPostsId, function(res) {
        if (!res || res.length < 1) {
            if (typeof callbackError == "function")
                callbackError();
            return false;
        }
        var pn = res.pop()["number"];
        var opPost = res.shift();
        fav[boardName + "/" + threadNumber] = {
            "lastPostNumber": pn,
            "previousLastPostNumber": pn,
            "subject": (opPost["subject"] ? opPost["subject"] : opPost["text"]).substring(0, 150)
        };
        var opPost = lord.id("post" + threadNumber);
        var btn = lord.nameOne("addToFavoritesButton", opPost);
        var img = lord.queryOne("img", btn);
        img.title = lord.text("removeFromFavoritesText");
        img.src = img.src.replace("favorite.png", "favorite_active.png");
        btn.onclick = lord.removeThreadFromFavorites.bind(lord, boardName, threadNumber);
        lord.setLocalObject("favoriteThreads", fav);
        if (typeof callback == "function")
            callback();
    });
    return false;
};

lord.complain = function() {
    lord.showPopup(lord.text("complainMessage"), {type: "critical"});
    if (!lord.complainVideo) {
        lord.complainVideo = lord.node("video");
        lord.complainVideo.style.display = "none";
        var src = lord.node("source");
        src.src = "/" + lord.text("sitePathPrefix") + "video/fail.webm";
        src.type = "video/webm";
        lord.complainVideo.appendChild(src);
        lord.complainVideo.volume = 0.5;
        document.body.appendChild(lord.complainVideo);
    }
    lord.complainVideo.play();
};

lord.showUserIp = function(a) {
    prompt("IP:", lord.data("userIp", a, true));
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
    btn.value = lord.text("postFormButtonSubmitSending") + " 0%";
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
        btn.value = c.tr.postFormButtonSubmit;
    };
    lord.getModel("misc/tr").then(function(model) {
        c.tr = model.tr;
        return $.ajax(form.action, {
            type: "POST",
            breforeSend: function(xhr) {
                xhr.upload.onprogress = function(e) {
                    var percent = Math.floor(100 * (e.loaded / e.total));
                    if (100 == percent)
                        btn.value = lord.text("postFormButtonSubmitWaiting");
                    else
                        btn.value = lord.text("postFormButtonSubmitSending") + " " + percent + "%";
                };
            },
            data: formData,
            processData: false,
            contentType: false
        });
    }).then(function(result) {
        resetButton();
        if (result.errorMessage)
            return Promise.reject(result.errorMessage);
        if (result.postNumber) {
            c.post = true;
            return lord.getModel("api/post", "boardName=" + result.boardName + "&postNumber=" + result.postNumber);
        } else {
            c.post = false;
            return Promise.resolve(result);
        }
    }).then(function(result) {
        if (c.post) {
            var parent = postForm.parentNode;
            lord.resetPostForm();
            lord.hidePostForm();
            lord.resetCaptcha();
            var currentThreadNumber = lord.data("threadNumber");
            if (currentThreadNumber) {
                lord.updateThread(true).then(function() {
                    if (lord.getLocalObject("moveToPostOnReplyInThread", true))
                        window.location.hash = "#" + result.number;
                });
            } else {
                var action = lord.getLocalObject("quickReplyAction", "goto_thread");
                if ("do_nothing" === action) {
                    //Do nothing
                } else if ("append_post" == action) {
                    if (!lord.hasClass(parent, "threadPosts")) {
                        parent = parent.nextSibling;
                        if (!parent.tagName)
                            parent = parent.nextSibling;
                    }
                    //NOTE: Yep, twice
                    if (!lord.hasClass(parent, "threadPosts")) {
                        parent = parent.nextSibling;
                        if (!parent.tagName)
                            parent = parent.nextSibling;
                    }
                    lord.createPostNode(result, true).then(function(post) {
                        var lastPost = lord.query(".post, .opPost", parent).pop();
                        parent.appendChild(post, parent.lastChild);
                    }).catch(function(err) {
                        console.log(err);
                    });
                } else {
                    //The default
                    window.location = "/" + lord.data("sitePathPrefix") + result.boardName + "/res/"
                        + result.threadNumber + ".html#" + result.number;
                    return;
                }
            }
        } else {
            window.location = "/" + lord.data("sitePathPrefix") + result.boardName + "/res/" + result.threadNumber
                + ".html";
        }
        return Promise.resolve();
    }).catch(function(err) {
        resetButton();
        lord.resetCaptcha();
        console.log(err);
    });
};

lord.resetPostForm = function() {
    var postForm = lord.id("postForm");
    postForm.reset();
    var divs = lord.query(".postformFile", postForm);
    for (var i = divs.length - 1; i >= 0; --i)
    lord.removeFile(lord.queryOne("a", divs[i]));
    var trip = lord.nameOne("tripcode", postForm);
    if (trip)
        trip.checked = !!lord.getLocalObject("showTripcode", false);
    var dr = lord.nameOne("draft", postForm);
    if (dr)
        dr.checked = (lord.getCookie("draftsByDefault") === "true");
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
    lord.viewPost(a, boardName, postNumber);
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
    lord.noViewPost();
};

lord.strikeOutHiddenPostLink = function(a, list) {
    if (!a)
        return;
    if (!list)
        list = lord.getLocalObject("hiddenPosts", {});
    var boardName = lord.data("boardName", a);
    if (!boardName)
        return;
    var postNumber = +lord.data("postNumber", a);
    if (!postNumber)
        return;
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
    var boardName = lord.data("boardName", a);
    if (!boardName)
        return;
    var postNumber = +lord.data("postNumber", a);
    if (!postNumber)
        return;
    var post = lord.id("post" + postNumber);
    if (lord.data("boardName", post) != boardName)
        post = null;
    if (post || data) {
        if (post ? lord.data("isOp", post) : data.isOp)
            a.appendChild(lord.node("text", " (OP)"));
        return;
    }
    return {
        boardName: boardName,
        postNumber: postNumber
    };
};

lord.signOwnPostLink = function(a, data) {
    if (!a)
        return;
    if (a.textContent.indexOf("(You)") >= 0)
        return;
    var boardName = lord.data("boardName", a);
    if (!boardName)
        return;
    var postNumber = +lord.data("postNumber", a);
    if (!postNumber)
        return;
    var post = lord.id("post" + postNumber);
    if (lord.data("boardName", post) != boardName)
        post = null;
    if (post || data) {
        if (post ? lord.data("ownIp", post) : data.ownIp)
            a.appendChild(lord.node("text", " (You)"));
        return;
    }
    return {
        boardName: boardName,
        postNumber: postNumber
    };
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
        parent = document;
    var list = [];
    lord.gently(lord.query("a", parent), function(a) {
        var post = lord.signOpPostLink(a);
        if (!post)
            return;
        list.push({
            a: a,
            boardName: post.boardName,
            postNumber: post.postNumber
        });
    }, {
        delay: 10,
        n: 20
    }).then(function() {
        if (list.length < 0)
            return [];
        var query = "posts=" + list[0].boardName + ":" + list[0].postNumber;
        for (var i = 1; i < list.length; ++i)
            query += "&posts=" + list[i].boardName + ":" + list[i].postNumber;
        return lord.getModel("api/posts", query);
    }).then(function(posts) {
        posts.forEach(function(post, i) {
            if (!post)
                return;
            lord.signOpPostLink(list[i].a, post);
        });
    });
};

lord.signOwnPostLinks = function(parent) {
    if (!parent)
        parent = document;
    var list = [];
    lord.gently(lord.query("a", parent), function(a) {
        var post = lord.signOwnPostLink(a);
        if (!post)
            return;
        list.push({
            a: a,
            boardName: post.boardName,
            postNumber: post.postNumber
        });
    }, {
        delay: 10,
        n: 20
    }).then(function() {
        if (list.length < 0)
            return [];
        var query = "posts=" + list[0].boardName + ":" + list[0].postNumber;
        for (var i = 1; i < list.length; ++i)
            query += "&posts=" + list[i].boardName + ":" + list[i].postNumber;
        return lord.getModel("api/posts", query);
    }).then(function(posts) {
        posts.forEach(function(post, i) {
            if (!post)
                return;
            lord.signOwnPostLink(list[i].a, post);
        });
    });
};

lord.hotkey_previousPageImage = function() {
    if (!!lord.img) {
        lord.previousFile();
        return false;
    }
    if (lord.text("currentThreadNumber"))
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
    if (!!lord.img) {
        lord.nextFile();
        return false;
    }
    if (lord.text("currentThreadNumber"))
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
    var list = lord.query(".opPost:not(#postTemplate), .post:not(#postTemplate)");
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]) && window.location.hash.replace("#", "") == list[i].id.replace("post", ""))
            return list[i];
    }
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]))
            return list[i];
    }
    list = lord.query(".opPost:not(#postTemplate), .post:not(#postTemplate)");
    if (list && list.length > 0)
        return list[0];
    return null;
};

lord.currentThread = function() {
    if (lord.text("currentThreadNumber"))
        return null;
    var list = lord.query(".opPost:not(#postTemplate)");
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]))
            return lord.id(list[i].id.replace("post", "thread"));
    }
    list = lord.query(".opPost:not(#postTemplate), .post:not(#postTemplate)");
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]) && window.location.hash.replace("#", "") == list[i].id.replace("post", ""))
            return lord.id(list[i].parentNode.id.replace("threadPosts", "thread"));
    }
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]))
            return lord.id(list[i].parentNode.id.replace("threadPosts", "thread"));
    }
    list = lord.query(".opPost:not(#postTemplate)");
    if (list && list.length > 0)
        return lord.id(list[0].id.replace("post", "thread"));
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
    if (!post && !lord.text("currentThreadNumber")) {
        list = lord.query(".opPost:not(#postTemplate)");
        for (var i = 0; i < list.length; ++i) {
            if (lord.isInViewport(list[i])) {
                i = f(list, i);
                window.location.hash = list[i].id.replace("post", "");
                return false;
            }
        }
    }
    list = lord.query(".opPost:not(#postTemplate), .post:not(#postTemplate)");
    for (var i = 0; i < list.length; ++i) {
        if (lord.isInViewport(list[i]) && window.location.hash.replace("#", "") == list[i].id.replace("post", "")) {
            if (post || lord.text("currentThreadNumber")) {
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
            if (post || lord.text("currentThreadNumber")) {
                i = f(list, i);
                window.location.hash = list[i].id.replace("post", "");
            } else {
                window.location.hash = list[i].parentNode.id.replace("threadPosts", "");
            }
            return false;
        }
    }
    list = lord.query(!post ? ".opPost:not(#postTemplate)" : ".opPost:not(#postTemplate), .post:not(#postTemplate)");
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
    lord.setPostHidden(lord.text("currentBoardName"), p.id.replace("post", ""));
    return false;
};

lord.hotkey_goToThread = function() {
    var t = lord.currentThread();
    if (!t)
        return;
    var opPost = lord.queryOne(".opPost", t);
    window.open(lord.queryOne(".postHeader > [name='toThreadLink']", opPost).href, '_blank').focus();
};

lord.hotkey_expandThread = function() {
    var t = lord.currentThread();
    if (!t)
        return;
    var tn = +t.id.replace("thread", "");
    var posts = lord.id("threadPosts" + tn);
    if (!posts || posts.length < 1)
        return;
    (function(tn, posts) {
        var div = lord.node("div");
        div.appendChild(lord.node("text", lord.text("loadingPostsText")));
        posts.parentNode.insertBefore(div, posts);
        var lastPost = lord.query(".post", posts).pop();
        var seqNum = 1;
        lord.ajaxRequest("get_new_posts", [lord.text("currentBoardName"), tn, tn], lord.RpcGetNewPostsId, function(res) {
            if (!res || res.length < 1)
                return;
            lord.removeChildren(posts);
            var omitted = lord.id("threadOmitted" + tn);
            if (omitted)
                omitted.parentNode.removeChild(omitted);
            div.parentNode.removeChild(div);
            lord.gently(lord.arr(res), function(ps) {
                var newPost = lord.createPostNode(ps, true);
                if (!newPost)
                    return;
                lord.removeClass(newPost, "newPost");
                if (!isNaN(seqNum))
                    lord.queryOne(".postSequenceNumber", newPost).appendChild(lord.node("text", ++seqNum));
                posts.appendChild(newPost);
                lord.postNodeInserted(newPost);
            }, {
                delay: 10,
                n: 10
            });
        });
    })(tn, posts);
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
    var tn = +lord.text("currentThreadNumber");
    if (isNaN(tn))
        return;
    lord.updateThread(lord.text("currentBoardName"), tn);
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

lord.initializeOnLoadBaseBoard = function() {
    document.body.onclick = lord.globalOnclick;
    if (lord.text("deviceType") != "mobile") {
        document.body.onmouseover = lord.globalOnmouseover;
        document.body.onmouseout = lord.globalOnmouseout;
    }
    if (lord.getLocalObject("mumWatching", false)) {
        var img = lord.queryOne("[name='switchMumWatchingButton'] > img");
        img.src = "/" + lord.text("sitePathPrefix") + "img/mum_watching.png";
        lord.query(".postFileFile > a > img").forEach(function(img) {
            lord.addClass(img, "mumWatching");
        });
    }
    if (lord.getLocalObject("hotkeysEnabled", true) && lord.text("deviceType") != "mobile") {
        var hotkeys = lord.getLocalObject("hotkeys", {}).dir;
        var key = function(name) {
            if (!hotkeys)
                return lord.DefaultHotkeys.dir[name];
            return hotkeys[name] || lord.DefaultHotkeys.dir[name];
        };
        var btn = lord.queryOne(".leafButton.leafButtonPrevious");
        btn.title = btn.title + " (" + key("previousPageImage") + ")";
        btn = lord.queryOne(".leafButton.leafButtonNext");
        btn.title = btn.title + " (" + key("nextPageImage") + ")";
        lord.query("[name='quickReply']").forEach(function(a) {
            a.title = a.title + " (" + key("quickReply") + ")";
        });
        lord.query("[name='toThreadLink']").forEach(function(a) {
            a.title = "(" + key("goToThread") + ")";
        });
        lord.query("[name='hideButton'] > img").forEach(function(img) {
            img.title = img.title + " (" + key("hidePost") + ")";
        });
        var table = lord.queryOne(".postformMarkup");
        ["Bold", "Italics", "StrikedOut", "Underlined", "Spoiler", "Quotation", "Code"].forEach(function(s) {
            s = "markup" + s;
            var btn = lord.nameOne(s, table);
            if (!btn)
                return;
            btn.title = btn.title + " (" + key(s) + ")";
        });
        lord.query("[name='updateThreadButton']").forEach(function(a) {
            a.title = "(" + key("updateThread") + ")";
        });
        lord.nameOne("submit", lord.id("postForm")).title = "(" + key("submitReply") + ")";
    }
    if (lord.getLocalObject("showTripcode", false)) {
        var postForm = lord.id("postForm");
        var sw = lord.nameOne("tripcode", postForm);
        sw.checked = true;
    }
    /*var fav = lord.getLocalObject("favoriteThreads", {});
    var currentBoardName = lord.text("currentBoardName");
    if (lord.getLocalObject("spellsEnabled", true)) {
        lord.worker.postMessage({
            "type": "parseSpells",
            "data": lord.getLocalObject("spells", lord.DefaultSpells)
        });
    } else if (lord.getLocalObject("showYoutubeVideosTitles", true)) {
        lord.processPosts(null, true);
    } else {
        lord.gently(lord.query(".post:not(#postTemplate), .opPost"), lord.tryHidePost(post), {
            delay: 10,
            n: 10
        });
    }
    lord.query(".opPost").forEach(function(opPost) {
        var threadNumber = +opPost.id.replace("post", "");
        var btn = lord.nameOne("addToFavoritesButton", opPost);
        if (fav.hasOwnProperty(currentBoardName + "/" + threadNumber)) {
            var img = lord.queryOne("img", btn);
            img.title = lord.text("removeFromFavoritesText");
            img.src = img.src.replace("favorite.png", "favorite_active.png");
            btn.onclick = lord.removeThreadFromFavorites.bind(lord, currentBoardName, threadNumber);
        } else {
            btn.onclick = lord.addThreadToFavorites.bind(lord, currentBoardName, threadNumber);
        }
    });
    if (!!lord.getLocalObject("hideTripcodes", false)) {
        lord.query(".tripcode").forEach(function(span) {
            span.style.display = "none";
        });
    }
    if (!!lord.getLocalObject("hideUserNames", false)) {
        lord.query(".someName").forEach(function(span) {
            span.style.display = "none";
        });
    }
    var lastLang = lord.getLocalObject("lastCodeLang", "-");
    var sel = lord.queryOne(".postformMarkup > span > [name='langSelect']");
    if (!!sel) {
        lord.arr(sel.options).forEach(function(opt) {
            if (opt.value == lastLang)
                opt.selected = true;
        });
    }
    lord.setPostformMarkupVisible(!lord.getLocalObject("hidePostformMarkup", false));*/
    if (lord.getLocalObject("strikeOutHiddenPostLinks", true))
        lord.strikeOutHiddenPostLinks();
    if (lord.getLocalObject("signOpPostLinks", true))
        lord.signOpPostLinks();
    if (lord.getLocalObject("signOwnPostLinks", true))
        lord.signOwnPostLinks();
    /*if (!lord.text("currentThreadNumber")) {
        var lastPostNumbers = lord.getLocalObject("lastPostNumbers", {});
        lastPostNumbers[lord.text("currentBoardName")] = +lord.text("lastPostNumber");
        lord.setLocalObject("lastPostNumbers", lastPostNumbers);
    }*/
    lord.initFiles();
    lord.hashChangedHandler(lord.hash());
    lord.scrollHandler();
};

lord.hashChangedHandler = function(hash) {
    if (lord.lastSelectedElement)
        lord.removeClass(lord.lastSelectedElement, "selectedPost");
    var postNumber = +hash;
    if (isNaN(postNumber) || postNumber <= 0)
        return;
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    lord.lastSelectedElement = post;
    lord.addClass(post, "selectedPost");
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

window.addEventListener("hashchange", function(e) {
    lord.hashChangedHandler(lord.hash());
}, false);

window.addEventListener("scroll", lord.scrollHandler, false);

lord.message_spellsParsed = function(data) {
    if (!data)
        return;
    if (data.root)  {
        lord.spells = data.root.spells;
        var youtube = (lord.getLocalObject("showYoutubeVideosTitles", true) && !lord.youtubeApplied);
        if (!lord.getLocalObject("spellsEnabled", true) && !youtube)
            return;
        lord.processPosts(lord.spells, youtube);
    } else if (data.error) {
        var txt = lord.text(data.error.text);
        if (data.error.data)
            txt += ": " + data.error.data;
        lord.showPopup(txt, {"type": "critical"});
    }
};

lord.message_postsProcessed = function(data) {
    if (!data)
        return;
    if (data.posts) {
        lord.youtubeApplied = true;
        var posts = {};
        lord.query(".post:not(#postTemplate), .opPost").forEach(function(post) {
            posts[+post.id.replace("post", "")] = post;
        });
        (function(posts) {
            lord.gently(data.posts, function(post) {
                var p = posts[post.number];
                if (!p)
                    return;
                if (post.youtube)
                    lord.addYoutubeButton(p, post.youtube);
                if (post.coub)
                    lord.addCoubButton(p, post.coub);
                if (post.replacements && post.replacements.length > 0) {
                    lord.forIn(post.replacements, function(value) {
                        if (value.innerHTML)
                            p.innerHTML = value.innerHTML;
                    });
                }
                if (post.hidden)
                    lord.addPostToHidden(post.board, post.number);
                lord.tryHidePost(p);
            }, {
                delay: 10,
                n: 10
            });
        })(posts);
    } else if (data.error) {
        var txt = lord.text(data.error.text);
        if (data.error.data)
            txt += ": " + data.error.data;
        lord.showPopup(txt, {"type": "critical"});
    }
};

lord.worker.addEventListener("message", function(msg) {
    if (!msg || !msg.data)
        return;
    msg = msg.data;
    if (!msg.type)
        return;
    var f = lord["message_" + msg.type];
    if (!f)
        return;
    f(msg.data);
});
