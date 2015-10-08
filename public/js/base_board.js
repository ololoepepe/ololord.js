/*ololord global object*/

var lord = lord || {};

/*Variables*/

lord.postPreviews = {};
lord.lastPostPreview = null;
lord.lastPostPreviewTimer = null;
lord.images = {};
lord.img = null;
lord.imgWrapper = null;
lord.postForm = {
    "visibility": {
        "Top": false,
        "Bottom": false
    },
    "last": "",
    "quickReply": false
};
lord.complainVideo = null;
lord.files = null;
lord.filesMap = null;
lord.spells = null;
lord.worker = new Worker("/js/worker.js");
lord.youtubeApplied = false;
lord.lastSelectedElement = null;

/*Functions*/

lord.isSpecialThumbName = function(thumbName) {
    return lord.isAudioType(thumbName) || lord.isImageType(thumbName) || lord.isVideoType(thumbName);
};

lord.getPostData = function(post, youtube) {
    if (!post)
        return null;
    var currentBoardName = lord.text("currentBoardName");
    var threadNumber = lord.text("currentThreadNumber");
    if (!threadNumber) {
        if (lord.hasClass(post, "opPost"))
            threadNumber = postNumber;
        else
            threadNumber = post.parentNode.id.replace("threadPosts", "");
    }
    var postNumber = +post.id.replace("post", "");
    var p = {
        "board": currentBoardName,
        "thread": +threadNumber,
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
        }, 10, 10);
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

lord.addReferences = function(postNumber, referencedPosts) {
    postNumber = +postNumber;
    if (isNaN(postNumber))
        return;
    if (!referencedPosts)
        return;
    var prefix = lord.text("sitePathPrefix");
    var currentBoardName = lord.text("currentBoardName");
    for (key in referencedPosts) {
        if (!referencedPosts.hasOwnProperty(key))
            continue;
        var bn = key.split("/").shift();
        if (bn !== currentBoardName)
            continue;
        var pn = key.split("/").pop();
        var tn = referencedPosts[key];
        var post = lord.id("post" + pn);
        if (!post)
            continue;
        var referencedBy = lord.nameOne("referencedBy", post);
        var a = lord.node("a");
        a.href = "/" + prefix + bn + "/thread/" + tn + ".html#" + postNumber;
        var list = lord.query("a", referencedBy);
        var cont = false;
        for (var i = 0; i < list.length; ++i) {
            if (a.href == list[i].href) {
                cont = true;
                break;
            }
        }
        if (cont)
            continue;
        var referencedByTr = lord.nameOne("referencedByTr", post);
        referencedByTr.style.display = "";
        referencedBy.appendChild(lord.node("text", " "));
        a.appendChild(lord.node("text", ">>" + postNumber));
        if (!!lord.getLocalObject("strikeOutHiddenPostLinks", true))
            lord.strikeOutHiddenPostLink(a);
        if (!!lord.getLocalObject("signOpPostLinks", true))
            lord.signOpPostLink(a);
        if (!!lord.getLocalObject("signOwnPostLinks", true))
            lord.signOwnPostLink(a);
        referencedBy.appendChild(a);
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
    if (!!captcha) {
        var boardName = lord.text("currentBoardName");
        lord.ajaxRequest("get_captcha_quota", [boardName], lord.RpcGetCaptchaQuotaId, function(res) {
            res = +res;
            if (isNaN(res))
                return;
            var hiddenCaptcha = lord.id("hiddenCaptcha");
            var td = lord.id("captchaContainer");
            for (var i = 0; i < td.children.length; ++i) {
                if (td.children[i] == captcha)
                    continue;
                td.removeChild(td.children[i]);
            }
            if (res > 0) {
                hiddenCaptcha.appendChild(captcha);
                var span = lord.node("span");
                lord.addClass(span, "noCaptchaText");
                var text = lord.text("noCaptchaText") + ". " + lord.text("captchaQuotaText") + " " + res;
                span.appendChild(lord.node("text", text));
                td.appendChild(span);
            } else {
                lord.id("captchaContainer").appendChild(captcha);
            }
            if (!!lord.reloadCaptchaFunction && "hiddenCaptcha" !== captcha.parentNode.id)
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

lord.createPostFile = function(f, boardName, postNumber) {
    if (!f || !boardName || isNaN(+postNumber))
        return null;
    var sitePrefix = lord.text("sitePathPrefix");
    if (!boardName)
        boardName = lord.text("currentBoardName");
    var file = lord.node("td");
    file.id = "file" + f["sourceName"];
    lord.addClass(file, "postFile");
    if (lord.isAudioType(f["type"])) {
        ["Album", "Artist", "Title", "Year"].forEach(function(key) {
            var inp = lord.node("input");
            inp.type = "hidden";
            inp.name = "audioTag" + key;
            inp.value = f["audioTag" + key];
            file.appendChild(inp);
        });
    }
    var divFileName = lord.node("div");
    lord.addClass(divFileName, "postFileName");
    var aFileName = lord.node("a");
    aFileName.href = "/" + sitePrefix + boardName + "/" + f["sourceName"];
    aFileName.target = "_blank";
    aFileName.appendChild(lord.node("text", f["sourceName"]));
    divFileName.appendChild(aFileName);
    file.appendChild(divFileName);
    var divFileSize = lord.node("div");
    lord.addClass(divFileSize, "postFileSize");
    lord.addClass(divFileSize, lord.text("deviceType"));
    divFileSize.appendChild(lord.node("text", "(" + f["size"] + ")"));
    divFileSize.title = f["sizeTooltip"];
    file.appendChild(divFileSize);
    var divFileSearch = lord.node("div");
    lord.addClass(divFileSearch, "postFileSearch");
    var a = lord.node("a");
    a.href = "javascript:lord.deleteFile('" + boardName + "', " + postNumber + ", '" + f["sourceName"] + "');";
    a.title = lord.text("deleteFileText");
    var logo = lord.node("img");
    logo.src = "/" + sitePrefix + "img/delete.png";
    a.appendChild(logo);
    divFileSearch.appendChild(a);
    if (lord.isImageType(f["type"])) {
        var a = lord.node("a");
        a.onclick = lord.hideByImage.bind(lord, a);
        a.title = lord.text("hideByImageText");
        var logo = lord.node("img");
        logo.src = "/" + sitePrefix + "img/hide.png";
        a.appendChild(logo);
        divFileSearch.appendChild(lord.node("text", " "));
        divFileSearch.appendChild(a);
        [{
            "link": "//www.google.com/searchbyimage?image_url=",
            "text": lord.text("findSourceWithGoogleText"),
            "img": "google.png"
        }, {
            "link": "http://iqdb.org/?url=",
            "text": lord.text("findSourceWithIqdbText"),
            "img": "iqdb.png"
        }].forEach(function(el) {
            var a = lord.node("a");
            a.href = el.link + location.origin + "/" + sitePrefix + boardName + "/" + f["sourceName"];
            a.title = el.text;
            a.target = "_blank";
            var logo = lord.node("img");
            logo.src = "/" + sitePrefix + "img/" + el.img;
            a.appendChild(logo);
            divFileSearch.appendChild(lord.node("text", " "));
            divFileSearch.appendChild(a);
        });
    }
    if (lord.isAudioType(f["type"])) {
        var a = lord.node("a");
        a.href = "javascript:lord.editAudioTags('" + boardName + "', " + postNumber + ", '" + f["sourceName"] + "');";
        a.title = lord.text("editAudioTagsText");
        var logo = lord.node("img");
        logo.src = "/" + sitePrefix + "img/audio_edit_tags.png";
        a.appendChild(logo);
        divFileSearch.appendChild(lord.node("text", " "));
        divFileSearch.appendChild(a);
        a = lord.node("a");
        a.href = "javascript:lord.addToPlaylist('" + boardName + "', '" + f["sourceName"] + "');";
        a.title = lord.text("addToPlaylistText");
        logo = lord.node("img");
        logo.src = "/" + sitePrefix + "img/playlist_add.png";
        a.appendChild(logo);
        divFileSearch.appendChild(lord.node("text", " "));
        divFileSearch.appendChild(a);
    }
    file.appendChild(divFileSearch);
    var divImage = lord.node("div");
    lord.addClass(divImage, "postFileFile");
    lord.addClass(divImage, lord.text("deviceType"));
    var inpType = lord.node("input");
    inpType.type = "hidden";
    inpType.name = "type";
    inpType.value = f["type"];
    divImage.appendChild(inpType);
    var inpSizeKB = lord.node("input");
    inpSizeKB.type = "hidden";
    inpSizeKB.name = "sizeKB";
    inpSizeKB.value = f["sizeKB"];
    divImage.appendChild(inpSizeKB);
    var inpSizeX = lord.node("input");
    inpSizeX.type = "hidden";
    inpSizeX.name = "sizeX";
    inpSizeX.value = f["sizeX"];
    divImage.appendChild(inpSizeX);
    var inpSizeY = lord.node("input");
    inpSizeY.type = "hidden";
    inpSizeY.name = "sizeY";
    inpSizeY.value = f["sizeY"];
    divImage.appendChild(inpSizeY);
    var aImage = lord.node("a");
    aImage.href = "/" + sitePrefix + boardName + "/" + f["sourceName"];
    (function(a, href, type, sizeX, sizeY) {
        a.onclick = function(e) {
            e.preventDefault();
            lord.showImage(href, type, sizeX, sizeY);
            return false;
        };
    })(aImage, "/" + sitePrefix + boardName + "/" + f["sourceName"], f["type"], f["sizeX"], f["sizeY"]);
    var image = lord.node("img");
    var maxRatingS = lord.getCookie("maxAllowedRating") || "R-18G";
    var maxRating = 180;
    if ("SFW" == maxRatingS)
        maxRating = 0;
    else if ("R-18" == maxRatingS)
        maxRating = 18;
    else if ("R-15" == maxRatingS)
        maxRating = 15;
    if (f["rating"] > maxRating) {
        image.width = 200;
        image.height = 200;
        var ratingMap = {
            15: "r-15",
            18: "r-18",
            180: "r-18g"
        };
        image.src = "/" + sitePrefix + "img/" + ratingMap[+f["rating"]] + ".png";
    } else {
        var thumbSizeX = +f["thumbSizeX"];
        var thumbSizeY = +f["thumbSizeY"];
        if (!isNaN(thumbSizeX) && thumbSizeX > 0)
            image.width = thumbSizeX;
        if (!isNaN(thumbSizeY) && thumbSizeY > 0)
            image.height = thumbSizeY;
        if (lord.isSpecialThumbName(f["thumbName"])) {
            image.src = "/" + sitePrefix + "img/" + f["thumbName"].replace("/", "_") + "_logo.png";
        } else {
            image.src = "/" + sitePrefix + boardName + "/" + f["thumbName"];
        }
    }
    aImage.appendChild(image);
    divImage.appendChild(aImage);
    file.appendChild(divImage);
    return file;
};

lord.createPostNode = function(res, permanent, boardName) {
    if (!res)
        return null;
    post = lord.id("postTemplate");
    if (!post)
        return null;
    post = post.cloneNode(true);
    post.id = !!permanent ? ("post" + res["number"]) : "";
    post.style.display = "";
    post["fromAjax"] = true;
    if (!boardName)
        boardName = lord.text("currentBoardName");
    var fixed = lord.nameOne("fixed", post);
    if (!!res["fixed"])
        fixed.style.display = "";
    else
        fixed.parentNode.removeChild(fixed);
    var closed = lord.nameOne("closed", post);
    if (!!res["closed"])
        closed.style.display = "";
    else
        closed.parentNode.removeChild(closed);
    var bumpLimit = lord.nameOne("bumpLimit", post);
    if (!!res["bumpLimitReached"])
        bumpLimit.style.display = "";
    else
        bumpLimit.parentNode.removeChild(bumpLimit);
    var postLimit = lord.nameOne("postLimit", post);
    if (!!res["postLimitReached"])
        postLimit.style.display = "";
    else
        postLimit.parentNode.removeChild(postLimit);
    var draftIndicator = lord.nameOne("draftIndicator", post);
    if (!!res["draft"])
        draftIndicator.style.display = "";
    else
        draftIndicator.parentNode.removeChild(draftIndicator);    
    var opSign = lord.nameOne("opSign", post);
    if (!res["signAsOp"] || !res["opIp"])
        opSign.parentNode.removeChild(opSign);
    var postSubject = lord.nameOne("postSubject", post);
    postSubject.appendChild(lord.node("text", res["subject"]));
    if (res["subject"].length < 1)
        lord.addClass(postSubject, "defaultPostSubject");
    if (res["opIp"])
        lord.addClass(post, "opIp");
    if (res["ownIp"])
        lord.addClass(post, "ownIp");
    if (+lord.text("shrinkPosts"))
        lord.addClass(post, "shrinkedPost");
    var registered = lord.nameOne("registered", post);
    if (!!res["showRegistered"] && !!res["showTripcode"])
        registered.style.display = "";
    else
        registered.parentNode.removeChild(registered);
    var name = lord.nameOne("someName", post);
    if (!!lord.getLocalObject("hideUserNames", false))
        name.style.display = "none";
    if (!!res["email"])
        name.innerHTML = "<a class='mailtoName' href='mailto:" + res["email"] + "'>" + res["nameRaw"] + "</a>";
    else
        name.innerHTML = res["name"];
    var tripcode = lord.nameOne("tripcode", post);
    if (!!res["showTripcode"] && "" !== res["tripcode"]) {
        if (!lord.getLocalObject("hideTripcodes", false))
            tripcode.style.display = "";
        tripcode.appendChild(lord.node("text", res["tripcode"]));
    } else {
        tripcode.parentNode.removeChild(tripcode);
    }
    var whois = lord.nameOne("whois", post);
    var sitePathPrefix = lord.text("sitePathPrefix");
    if (!!res["flagName"]) {
        whois.style.display = "";
        whois.src = whois.src.replace("%flagName%", res["flagName"]);
        whois.title = res["countryName"];
        if (!!res["cityName"])
            whois.title = res["cityName"] + ", " + whois.title;
    } else {
        whois.parentNode.removeChild(whois);
    }
    lord.nameOne("dateTime", post).appendChild(lord.node("text", res["dateTime"]));
    var moder = (lord.text("moder") === "true");
    var number = lord.nameOne("number", post);
    number.appendChild(lord.node("text", res["number"]));
    if (moder)
        number.title = res["ip"];
    var postingEnabled = (lord.text("postingEnabled") === "true");
    var inp = lord.id("currentThreadNumber");
    if (!!inp && +inp.value === res["threadNumber"]) {
        number.href = "#" + res["number"];
    } else {
        number.href = "/" + sitePathPrefix + boardName + "/thread/" + res["threadNumber"] + ".html#"
        if (postingEnabled)
            number.href += "i";
        number.href += res["number"];
    }
    var files = lord.nameOne("files", post);
    if (!!res["files"]) {
        post.ajaxFiles = {};
        for (var i = 0; i < res["files"].length; ++i) {
            var file = lord.createPostFile(res["files"][i], boardName, res["number"]);
            if (!!file)
                files.insertBefore(file, files.children[files.children.length - 1]);
            post.ajaxFiles[res["files"][i]["thumbName"]] = res["files"][i];
        }
    }
    var blockquoteThread = !!lord.id("currentThreadNumber");
    var modificationDateTimeTd = lord.nameOne("modificationDateTimeTd", post);
    var bannedForTd = lord.nameOne("bannedForTd", post);
    var referencedByTd = lord.nameOne("referencedByTd", post);
    var oneFileTr = lord.nameOne("files", post);
    var manyFilesTr = lord.nameOne("manyFilesTr", post);
    var textOneFile = lord.nameOne("textOneFile", post);
    var textManyFiles = lord.nameOne("textManyFiles", post);
    if ((lord.text("deviceType") != "mobile" && res["files"].length < 2)
        || (lord.text("deviceType") == "mobile" && res["files"].length < 1)) {
        manyFilesTr.parentNode.removeChild(manyFilesTr);
        textOneFile.innerHTML = res["text"];
        if (blockquoteThread)
            lord.addClass(textOneFile, "blockquoteThread");
    } else {
        var oneFileTd = lord.nameOne("oneFileTd", post);
        oneFileTd.removeChild(textOneFile);
        lord.addClass(oneFileTd, "shrink");
        lord.nameOne("manyFilesTd", post).colSpan = res["files"].length + 2;
        lord.nameOne("textManyFiles", post).innerHTML = res["text"];
        if (blockquoteThread)
            lord.addClass(textManyFiles, "blockquoteThread");
        modificationDateTimeTd.colSpan = res["files"].length + 2;
        bannedForTd.colSpan = res["files"].length + 2;
        referencedByTd.colSpan = res["files"].length + 2;
    }
    var modificationDateTime = lord.nameOne("modificationDateTime", post);
    if ("" !== res["modificationDateTime"]) {
        modificationDateTime.style.display = "";
        modificationDateTime.childNodes[0].nodeValue += " " + res["modificationDateTime"];
    } else {
        modificationDateTime.parentNode.removeChild(modificationDateTime);
    }
    var bannedFor = lord.nameOne("bannedFor", post);
    if (!!res["bannedFor"])
        bannedFor.style.display = "";
    else
        bannedFor.parentNode.removeChild(bannedFor);
    var referencedBy = lord.nameOne("referencedBy", post);
    if (!!res["referencedBy"] && res["referencedBy"].length > 0) {
        lord.nameOne("referencedByTr", post).style.display = "";
        for (var i = 0; i < res["referencedBy"].length; ++i) {
            var ref = res["referencedBy"][i];
            var bn = ref["boardName"]
            var pn = ref["postNumber"];
            var tn = ref["threadNumber"];
            var a = lord.node("a");
            a.href = "/" + sitePathPrefix + bn + "/thread/" + tn + ".html#" + pn;
            referencedBy.appendChild(lord.node("text", " "));
            a.appendChild(lord.node("text", ">>" + (bn !== boardName ? ("/" + bn + "/") : "") + pn));
            referencedBy.appendChild(a);
        }
    }
    if (lord.createPostNodeCustom)
        lord.createPostNodeCustom(post, res, permanent, boardName);
    if (res["sequenceNumber"]) {
        var seqNum = lord.queryOne(".postSequenceNumber", post);
        seqNum.appendChild(lord.node("text", res["sequenceNumber"]));
    }
    var perm = lord.nameOne("permanent", post);
    if (!permanent) {
        perm.parentNode.removeChild(perm);
        lord.addClass(post, "temporary");
        return post;
    }
    lord.nameOne("postAnchor", post).id = res["number"];
    var quickReply = lord.nameOne("quickReply", post);
    quickReply.href = quickReply.href.replace("%postNumber%", res["number"]);
    lord.removeReferences(res["number"]);
    if (!!res["refersTo"]) {
        var refersTo = {};
        for (var i = 0; i < res["refersTo"].length; ++i) {
            var v = res["refersTo"][i];
            refersTo[v["boardName"] + "/" + v["postNumber"]] = v["threadNumber"];
        }
        lord.addReferences(res["number"], refersTo);
    }
    lord.addClass(post, "newPost");
    post.onmouseover = function() {
        lord.removeClass(this, "newPost");
        this.onmouseover = null;
    }
    if (res["number"] === res["threadNumber"]) {
        lord.removeClass(post, "post");
        lord.addClass(post, "opPost");
    }
    perm.style.display = "";
    if (+lord.text("currentThreadNumber") > 0) {
        var anumber = lord.node("a");
        number.parentNode.insertBefore(anumber, number);
        number.parentNode.removeChild(number);
        anumber.title = number.title;
        anumber.setAttribute("name", "number");
        anumber.appendChild(number.firstChild);
        anumber.href = "#" + res["number"];
        (function(pn) {
            if (postingEnabled) {
                anumber.onclick = function(e) {
                    e.preventDefault();
                    lord.insertPostNumber(pn);
                    return false;
                };
            }
        })(res["number"]);
    }
    var deleteButton = lord.nameOne("deleteButton", post);
    deleteButton.href = deleteButton.href.replace("%postNumber%", res["number"]);
    var hideButton = lord.nameOne("hideButton", post);
    hideButton.id = hideButton.id.replace("%postNumber%", res["number"]);
    hideButton.href = hideButton.href.replace("%postNumber%", res["number"]);
    var addFileButton = lord.nameOne("addFileButton", post);
    var editButton = lord.nameOne("editButton", post);
    var fixButton = lord.nameOne("fixButton", post);
    var unfixButton = lord.nameOne("unfixButton", post);
    var openButton = lord.nameOne("openButton", post);
    var closeButton = lord.nameOne("closeButton", post);
    var moveButton = lord.nameOne("moveButton", post);
    var banButton = lord.nameOne("banButton", post);
    var ipButton = lord.nameOne("ipButton", post);
    var downloadButton = lord.nameOne("downloadButton", post);
    var favButton = lord.nameOne("addToFavoritesButton", post);
    var rawText = lord.nameOne("rawText", post);
    var rawHtml = lord.nameOne("rawHtml", post);
    if (res["rawHtml"])
        rawHtml.value = "true";
    lord.nameOne("markupMode", post).value = res["markupMode"];
    lord.nameOne("draft", post).value = res["draft"];
    if ((moder || res["draft"]) && (res["files"].length < +lord.text("maxFileCount"))) {
        addFileButton.href = addFileButton.href.replace("%postNumber%", res["number"]);
    } else {
        addFileButton.parentNode.removeChild(addFileButton);
    }
    if (moder || res["draft"]) {
        editButton.href = editButton.href.replace("%postNumber%", res["number"]);
        rawText.value = res["rawPostText"];
        lord.nameOne("email", post).value = res["email"];
        lord.nameOne("name", post).value = res["rawName"];
        lord.nameOne("subject", post).value = res["rawSubject"];
    } else {
        editButton.parentNode.removeChild(editButton);
    }
    if (res["number"] != res["threadNumber"] || !inp || +inp.value !== res["threadNumber"])
        downloadButton.parentNode.removeChild(downloadButton);
    if (res["number"] == res["threadNumber"]) {
        var fav = lord.getLocalObject("favoriteThreads", {});
        if (fav.hasOwnProperty(boardName + "/" + res["number"])) {
            var img = lord.queryOne("img", favButton);
            img.title = lord.text("removeFromFavoritesText");
            img.src = img.src.replace("favorite.png", "favorite_active.png");
            favButton.onclick = lord.removeThreadFromFavorites.bind(lord, boardName, res["number"]);
        } else {
            favButton.onclick = lord.addThreadToFavorites.bind(lord, boardName, res["number"]);
        }
    } else {
        favButton.parentNode.removeChild(favButton);
    }
    if (!moder) {
        fixButton.parentNode.removeChild(fixButton);
        unfixButton.parentNode.removeChild(unfixButton);
        openButton.parentNode.removeChild(openButton);
        closeButton.parentNode.removeChild(closeButton);
        moveButton.parentNode.removeChild(moveButton);
        ipButton.parentNode.removeChild(ipButton);
        banButton.parentNode.removeChild(banButton);
        return post;
    }
    var toThread = lord.nameOne("toThread", post);
    if (res["number"] === res["threadNumber"]) {
        if (!!res["fixed"]) {
            unfixButton.style.display = "";
            unfixButton.href = unfixButton.href.replace("%postNumber%", res["number"]);
            fixButton.parentNode.removeChild(fixButton);
        } else {
            fixButton.style.display = "";
            fixButton.href = fixButton.href.replace("%postNumber%", res["number"]);
            unfixButton.parentNode.removeChild(unfixButton);
        }
        if (!!res["closed"]) {
            openButton.style.display = "";
            openButton.href = openButton.href.replace("%postNumber%", res["number"]);
            closeButton.parentNode.removeChild(closeButton);
        } else {
            closeButton.style.display = "";
            closeButton.href = closeButton.href.replace("%postNumber%", res["number"]);
            openButton.parentNode.removeChild(openButton);
        }
        moveButton.parentNode.removeChild(moveButton);
        moveButton.href = moveButton.href.replace("%postNumber%", res["number"]);
        if (!inp) {
            toThread.style.display = "";
            var toThreadLink = lord.nameOne("toThreadLink", post);
            toThreadLink.href = toThreadLink.href.replace("%postNumber%", res["number"]);
        } else {
            toThread.parentNode.removeChild(toThread);
        }
    } else {
        fixButton.parentNode.removeChild(fixButton);
        unfixButton.parentNode.removeChild(unfixButton);
        openButton.parentNode.removeChild(openButton);
        closeButton.parentNode.removeChild(closeButton);
        moveButton.parentNode.removeChild(moveButton);
        toThread.parentNode.removeChild(toThread);
    }
    ipButton.href = ipButton.href.replace("%postIp%", res["ip"]);
    banButton.href = banButton.href.replace("%postNumber%", res["number"]);
    return post;
};

lord.updatePost = function(boardName, postNumber, post) {
    postNumber = +postNumber;
    if (!boardName || !post || isNaN(postNumber) || postNumber <= 0)
        return;
    var seqNum = +lord.getPlainText(lord.queryOne(".postSequenceNumber", post));
    lord.ajaxRequest("get_post", [boardName, postNumber], lord.RpcGetPostId, function(res) {
        var newPost = lord.createPostNode(res, true);
        if (!newPost)
            return;
        var postLimit = lord.nameOne("postLimit", post);
        var bumpLimit = lord.nameOne("bumpLimit", post);
        if (!!postLimit || !!bumpLimit) {
            var postHeader = lord.queryOne(".postHeader", newPost);
            if (!!postLimit)
                postHeader.appendChild(postLimit.cloneNode(true));
            if (!!bumpLimit)
                postHeader.appendChild(bumpLimit.cloneNode(true));
        }
        post.parentNode.replaceChild(newPost, post);
        if (!isNaN(seqNum))
            lord.queryOne(".postSequenceNumber", newPost).appendChild(lord.node("text", seqNum));
        lord.postNodeInserted(newPost);
    });
};

lord.clearFileInput = function(div) {
    var preview = div.querySelector("img");
    if (!!preview && div == preview.parentNode)
        preview.src = "/" + lord.text("sitePathPrefix") + "img/addfile.png";
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
    if (!!lord.img) {
        if (lord.isAudioType(lord.img.fileType) || lord.isVideoType(lord.img.fileType)) {
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
    if (!!lord.files)
        return;
    lord.files = [];
    lord.filesMap = {};
    lord.query(".postFileFile").forEach(function(div) {
        var href = lord.queryOne("a", div).href;
        var type = lord.nameOne("type", div).value;
        if ("application/pdf" == type)
            return;
        if (lord.getLocalObject("leafThroughImagesOnly", false) && !lord.isImageType(type))
            return;
        lord.files.push({
            "href": href,
            "type": type,
            "sizeX": +lord.nameOne("sizeX", div).value,
            "sizeY": +lord.nameOne("sizeY", div).value
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

lord.postNodeInserted = function(post) {
    if (!post)
        return;
    if (!!lord.getLocalObject("strikeOutHiddenPostLinks", true))
        lord.strikeOutHiddenPostLinks(post);
    if (!!lord.getLocalObject("signOpPostLinks", true))
        lord.signOpPostLinks(post);
    if (!!lord.getLocalObject("signOwnPostLinks", true))
        lord.signOwnPostLinks(post);
    var lastPostNumbers = lord.getLocalObject("lastPostNumbers", {});
    lastPostNumbers[lord.text("currentBoardName")] = +post.id.replace("post", "");
    lord.setLocalObject("lastPostNumbers", lastPostNumbers);
    lord.files = null;
    lord.filesMap = null;
    lord.initFiles();
    var youtube = lord.getLocalObject("showYoutubeVideosTitles", true);
    var p = lord.getPostData(post, youtube);
    if (!p)
        return;
    youtube = youtube ? { "apiKey": lord.text("youtubeApiKey") } : undefined;
    var posts = [p];
    lord.worker.postMessage({
        "type": "processPosts",
        "data": {
            "youtube": youtube,
            "posts": posts,
            "spells": (lord.getLocalObject("spellsEnabled", true) ? lord.spells : undefined)
        }
    }); //No way to transfer an object with subobjects
};

lord.showPasswordDialog = function(title, label, callback) {
    var div = lord.node("div");
    var input = lord.node("input");
    input.type = "password";
    lord.addClass(input, "input");
    input.maxlength = 150;
    input.size = 30;
    div.appendChild(input);
    var sw = lord.node("input");
    sw.type = "checkbox";
    lord.addClass(sw, "checkbox");
    sw.title = lord.text("showPasswordText");
    sw.onclick = function() {
        if (input.type === "password")
            input.type = "text";
        else if (input.type === "text")
            input.type = "password";
    };
    div.appendChild(sw);
    lord.showDialog(title, label, div, function() {
        callback(input.value);
    }, function() {
        input.focus();
    });
};

lord.showHidePostForm = function(position) {
    lord.removeQuickReply();
    var postForm = lord.id("postForm");
    var theButton = lord.id("showHidePostFormButton" + position);
    if (lord.postForm.visibility[position]) {
        theButton.innerHTML = lord.text("showPostFormText");
        lord.id("hiddenPostForm").appendChild(postForm);
        lord.postForm.last = "";
    } else {
        var p = ("Top" === position) ? "Bottom" : "Top";
        if (lord.postForm.visibility[p])
            lord.showHidePostForm(p);
        theButton.innerHTML = lord.text("hidePostFormText");
        var t = lord.id("createActionContainer" + position);
        lord.queryOne("div > div", t).appendChild(postForm);
    }
    lord.postForm.visibility[position] = !lord.postForm.visibility[position];
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

lord.deletePost = function(boardName, postNumber, fromThread) {
    if (!boardName || isNaN(+postNumber))
        return;
    var title = lord.text("enterPasswordTitle");
    var label = lord.text("enterPasswordText");
    lord.showPasswordDialog(title, label, function(pwd) {
        if (null === pwd)
            return;
        if (pwd.length < 1) {
            if (!lord.getCookie("hashpass"))
                return lord.showPopup(lord.text("notLoggedInText"), {type: "critical"});
        } else if (!lord.isHashpass(pwd)) {
            pwd = lord.toHashpass(pwd);
        }
        lord.ajaxRequest("delete_post", [boardName, +postNumber, pwd], lord.RpcDeletePostId, function(res) {
            var post = lord.id("post" + postNumber);
            if (!post) {
                if (!!fromThread) {
                    var suffix = "thread/" + postNumber + ".html";
                    window.location.href = window.location.href.replace(suffix, "").split("#").shift();
                } else {
                    lord.reloadPage();
                }
                return;
            } else if (lord.hasClass(post, "opPost")) {
                var suffix = "thread/" + postNumber + ".html";
                window.location.href = window.location.href.replace(suffix, "").split("#").shift();
            } else {
                post.parentNode.removeChild(post);
                lord.removeReferences(postNumber);
                var postLinks = lord.query("a");
                if (!!postLinks) {
                    for (var i = 0; i < postLinks.length; ++i) {
                        var link = postLinks[i];
                        if (("&gt;&gt;" + postNumber) !== link.innerHTML)
                            continue;
                        var text = link.innerHTML.replace("&gt;&gt;", ">>");
                        link.parentNode.replaceChild(lord.node("text", text), link);
                    }
                }
                if (!!lord.postPreviews[boardName + "/" + postNumber])
                    delete lord.postPreviews[boardName + "/" + postNumber];
            }
        });
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

lord.quickReply = function(postNumber) {
    var selection = document.getSelection().toString();
    var postForm = lord.id("postForm");
    if (lord.postForm.quickReply) {
        var prev = postForm.previousSibling;
        prev = prev ? prev.id.replace("post", "") : 0;
        lord.removeQuickReply();
        if (prev == postNumber)
            return;
    }
    postNumber = +postNumber;
    if (isNaN(postNumber) || postNumber <= 0)
        return;
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    var parent = post.parentNode;
    var thread = lord.nameOne("thread", postForm);
    if (!thread) {
        var inp = lord.node("input");
        inp.type = "hidden";
        inp.name = "thread";
        inp.value = parent.id.replace("threadPosts", "").replace("thread", "");
        postForm.appendChild(inp);
        postForm.action = postForm.action.replace("create_thread", "create_post");
    }
    ["Top", "Bottom"].forEach(function(pos) {
        if (lord.postForm.visibility[pos]) {
            lord.showHidePostForm(pos);
            lord.postForm.last = pos;
        }
    });
    if (post.nextSibling)
        parent.insertBefore(postForm, post.nextSibling);
    else
        parent.appendChild(postForm);
    lord.insertPostNumber(postNumber);
    lord.quoteSelectedText(selection);
    lord.postForm.quickReply = true;
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
                    if (!!err)
                        return lord.showPopup(err, {type: "critical"});
                    lord.updatePost(boardName, postNumber, post);
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

lord.editPost = function(boardName, postNumber) {
    if (!boardName || isNaN(+postNumber))
        return;
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    var stage2 = function(boardName, postNumber, post, rawPostText) {
        var title = lord.text("editPostText");
        var form = lord.id("editPostTemplate").cloneNode(true);
        form.id = "";
        form.style.display = "";
        var email = lord.nameOne("email", form);
        var name = lord.nameOne("name", form);
        var subject = lord.nameOne("subject", form);
        var text = lord.nameOne("text", form);
        var used = lord.queryOne(".symbolCounter", form);
        used = lord.nameOne("used", used);
        email.value = lord.nameOne("email", post).value;
        name.value = lord.nameOne("name", post).value;
        subject.value = lord.nameOne("subject", post).value;
        text.appendChild(lord.node("text", rawPostText));
        used.appendChild(lord.node("text", text.value.length.toString()));
        var markupModeSelect = lord.nameOne("markupMode", form);
        lord.queryOne("[value='" + lord.nameOne("markupMode", post).value + "']", markupModeSelect).selected = true;
        var moder = (lord.text("moder") === "true");
        var draftField = lord.nameOne("draft", form);
        var rawField = lord.nameOne("raw", form);
        if (!!draftField) {
            if (lord.nameOne("draft", post).value == "true")
                draftField.checked = true;
            else
                draftField.parentNode.parentNode.style.display = "none";
        }
        if (!!rawField && lord.nameOne("rawHtml", post).value == "true")
            rawField.checked = true;
        if (lord.customEditFormSet)
            lord.customEditFormSet(form, post, !!draftField, !!rawField);
        lord.showDialog(title, null, form, function() {
            var pwd = lord.nameOne("password", form).value;
            if (pwd.length < 1) {
                if (!lord.getCookie("hashpass"))
                    return lord.showPopup(lord.text("notLoggedInText"), {type: "critical"});
            } else if (!lord.isHashpass(pwd)) {
                pwd = lord.toHashpass(pwd);
            }
            var markupMode = markupModeSelect.options[markupModeSelect.selectedIndex].value;
            lord.setCookie("markupMode", markupMode, {
                "expires": lord.Billion, "path": "/"
            });
            lord.queryOne("[value='" + markupMode + "']", lord.id("postForm")).selected = true;
            var params = {
                "boardName": boardName,
                "postNumber": +postNumber,
                "text": text.value,
                "email": email.value,
                "name": name.value,
                "subject": subject.value,
                "raw": !!rawField ? form.querySelector("[name='raw']").checked : false,
                "draft": !!draftField ? draftField.checked : false,
                "markupMode": markupMode,
                "password": pwd,
                "userData": null
            };
            if (lord.customEditFormGet)
                params["userData"] = lord.customEditFormGet(form, params);
            lord.ajaxRequest("edit_post", [params], lord.RpcEditPostId, function() {
                lord.updatePost(boardName, postNumber, post);
            });
        });
    };
    var rawPostText = lord.nameOne("rawText", post);
    if (rawPostText) {
        stage2(boardName, postNumber, post, rawPostText.value);
    } else {
        lord.ajaxRequest("get_post", [boardName, +postNumber], lord.RpcGetPostId, function(res) {
            stage2(boardName, postNumber, post, res["rawPostText"]);
        });
    }
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
            lord.updatePost(boardName, postNumber, post);
        });
    });
};

lord.editAudioTags = function(boardName, postNumber, fileName) {
    if (!boardName || isNaN(+postNumber) || !fileName)
        return;
    var post = lord.id("post" + postNumber);
    if (!post)
        return;
    var dlgTitle = lord.text("editAudioTagsText");
    var table = lord.id("editAudioTagsTemplate").cloneNode(true);
    table.id = "";
    table.style.display = "";
    var f = lord.id("file" + fileName);
    var album = lord.nameOne("album", table);
    var artist = lord.nameOne("artist", table);
    var title = lord.nameOne("title", table);
    var year = lord.nameOne("year", table);
    album.value = lord.nameOne("audioTagAlbum", f).value;
    artist.value = lord.nameOne("audioTagArtist", f).value;
    title.value = lord.nameOne("audioTagTitle", f).value;
    year.value = lord.nameOne("audioTagYear", f).value;
    lord.showDialog(dlgTitle, null, table, function() {
        var pwd = lord.nameOne("password", table).value;
        if (pwd.length < 1) {
            if (!lord.getCookie("hashpass"))
                return lord.showPopup(lord.text("notLoggedInText"), {type: "critical"});
        } else if (!lord.isHashpass(pwd)) {
            pwd = lord.toHashpass(pwd);
        }
        var tags = {
            "album": album.value,
            "artist": artist.value,
            "title": title.value,
            "year": year.value
        };
        lord.ajaxRequest("edit_audio_tags", [boardName, fileName, pwd, tags], lord.RpcEditAudioTagsId, function() {
            lord.updatePost(boardName, postNumber, post);
        });
    });
};

lord.addToPlaylist = function(boardName, fileName) {
    if (!boardName || !fileName)
        return;
    var tracks = lord.getLocalObject("playlist/tracks", {});
    if (tracks[boardName + "/" + fileName])
        return;
    tracks[boardName + "/" + fileName] = {};
    lord.setLocalObject("playlist/tracks", tracks);
};

lord.viewPostStage2 = function(link, boardName, postNumber, post) {
    post.onmouseout = function(event) {
        var next = post;
        while (!!next) {
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
    if (!lord.postPreviews[boardName + "/" + postNumber])
        lord.postPreviews[boardName + "/" + postNumber] = post;
    else
        post.style.display = "";
    post.previousPostPreview = lord.lastPostPreview;
    if (!!lord.lastPostPreview)
        lord.lastPostPreview.nextPostPreview = post;
    lord.lastPostPreview = post;
    post.mustHide = true;
    if (!!lord.lastPostPreviewTimer) {
        clearTimeout(lord.lastPostPreviewTimer);
        lord.lastPostPreviewTimer = null;
    }
    document.body.appendChild(post);
    post.style.position = "absolute";
    var doc = document.documentElement;
    var coords = link.getBoundingClientRect();
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
};

lord.viewPost = function(link, boardName, postNumber) {
    if (lord.text("deviceType") == "mobile")
        return;
    postNumber = +postNumber;
    if (!link || !boardName || isNaN(postNumber) || postNumber <= 0)
        return;
    var currentBoardName = lord.text("currentBoardName");
    var post = null;
    if (boardName === currentBoardName)
        post = lord.id("post" + postNumber);
    if (!post)
        post = lord.postPreviews[boardName + "/" + postNumber];
    if (!post) {
        lord.ajaxRequest("get_post", [boardName, +postNumber], lord.RpcGetPostId, function(res) {
            post = lord.createPostNode(res, false, boardName);
            if (!post)
                return;
            if (!!lord.getLocalObject("strikeOutHiddenPostLinks", true))
                lord.strikeOutHiddenPostLinks(post);
            if (!!lord.getLocalObject("signOpPostLinks", true))
                lord.signOpPostLinks(post);
            if (!!lord.getLocalObject("signOwnPostLinks", true))
                lord.signOwnPostLinks(post);
            lord.viewPostStage2(link, boardName, postNumber, post);
        });
    } else {
        var fromAjax = !!post.fromAjax;
        if (fromAjax)
            var ajaxFiles = post.ajaxFiles;
        post = post.cloneNode(true);
        lord.removeClass(post, "newPost selectedPost");
        lord.addClass(post, "temporary");
        if (fromAjax) {
            post.addEventListener("click", function(e) {
                var img = e.target;
                if (img.tagName != "IMG")
                    return;
                if (!ajaxFiles)
                    return;
                var ajaxFile = ajaxFiles[img.src.split("/").pop()];
                if (!ajaxFile)
                    return;
                var ind = img.src.lastIndexOf("/");
                var href = img.src.substring(0, ind) + "/" + ajaxFile["sourceName"];
                e.preventDefault();
                lord.showImage(href, ajaxFile["type"], ajaxFile["sizeX"], ajaxFile["sizeY"]);
            });
        }
        lord.removeClass(post, "opPost");
        lord.addClass(post, "post");
        var list = lord.traverseChildren(post);
        for (var i = 0; i < list.length; ++i) {
            switch (list[i].name) {
            case "editButton":
            case "fixButton":
            case "closeButton":
            case "banButton":
            case "deleteButton":
            case "hideButton":
                list[i].parentNode.removeChild(list[i]);
                break;
            default:
                break;
            }
            list[i].id = "";
        }
        lord.viewPostStage2(link, boardName, postNumber, post);
    }
};

lord.noViewPost = function() {
    lord.lastPostPreviewTimer = setTimeout(function() {
        if (!lord.lastPostPreview)
            return;
        if (!!lord.lastPostPreview.mustHide && !!lord.lastPostPreview.parentNode)
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
        var txt = lord.text("fileTooLargeWarningText") + " (>" + lord.readableSize(+lord.text("maxFileSize")) + ")";
        lord.showPopup(txt, {type: "warning"});
    };
    var fileName = file ? file.name : div.fileUrl.split("/").pop();
    var txt = fileName;
    if (file) {
        txt += " (" + lord.readableSize(file.size) + ")";
        if (+file.size > +lord.text("maxFileSize"))
            warn();
    } else {
        txt += " [URL]";
        /*var xhr = new XMLHttpRequest();
        xhr.open("HEAD", div.fileUrl, true);
        xhr.onreadystatechange = (function(div, fn) {
            if (this.readyState != this.DONE)
                return;
            var sz = +this.getResponseHeader("Content-Length");
            if (isNaN(sz))
                return;
            if (sz > +lord.text("maxFileSize"))
                warn();
            var txt = fn + " (" + lord.readableSize(sz) + ") [URL]";
            var t = lord.queryOne(".postformFileText", div);
            lord.removeChildren(t);
            t.appendChild(lord.node("text", txt));
        }).bind(xhr, div, fileName);
        xhr.send();*/
    }
    lord.queryOne(".postformFileText", div).appendChild(lord.node("text", txt));
    var uuid = lord.createUuid();
    lord.queryOne("input", div).name = "file_" + uuid;
    div.droppedFileName = "file_" + (div.fileUrl ? "url_" : "") + uuid;
    lord.queryOne(".ratingSelectContainer > select").name = "file_" + uuid + "_rating";
    lord.removeFileHash(div);
    var binaryReader = new FileReader();
    var prefix = lord.text("sitePathPrefix");
    binaryReader.onload = function(e) {
        var wordArray = CryptoJS.lib.WordArray.create(e.target.result);
        var currentBoardName = lord.text("currentBoardName");
        var fileHash = lord.toHashpass(wordArray);
        lord.ajaxRequest("get_file_existence", [currentBoardName, fileHash], lord.RpcGetFileExistenceId, function(res) {
            if (!res)
                return;
            var img = lord.node("img");
            img.src = "/" + prefix + "img/storage.png";
            img.title = lord.text("fileExistsOnServerText");
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
        });
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
    var inpMax = lord.id("maxFileCount");
    if (!inpMax)
        return;
    var maxCount = +inpMax.value;
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
    var url = prompt(lord.text("linkLabelText"));
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

lord.showImage = function(href, type, sizeHintX, sizeHintY) {
    lord.hideImage();
    if (!href || !type)
        return true;
    if (lord.isAudioType(type)) {
        sizeHintX = 0;
        sizeHintY = 0;
    }
    lord.img = lord.images[href];
    if (!!lord.img) {
        lord.removeChildren(lord.imgWrapper);
        lord.imgWrapper.appendChild(lord.img);
        if (lord.isAudioType(type)) {
            if (lord.text("deviceType") == "mobile")
                lord.imgWrapper.scale = 60;
            else
                lord.imgWrapper.scale = 100;
        }
        lord.setInitialScale(lord.imgWrapper, sizeHintX, sizeHintY);
        lord.resetScale(lord.imgWrapper);
        lord.imgWrapper.style.display = "";
        lord.toCenter(lord.imgWrapper, sizeHintX, sizeHintY, 3);
        if (lord.isAudioType(lord.img.fileType) || lord.isVideoType(lord.img.fileType)) {
            setTimeout(function() {
                lord.img.play();
            }, 500);
        }
        if (lord.getLocalObject("showLeafButtons", true)) {
            lord.query(".leafButton").forEach(function(a) {
                a.style.display = "";
            });
        }
        return false;
    }
    var append = false;
    if (!lord.imgWrapper) {
        lord.imgWrapper = lord.node("div");
        lord.addClass(lord.imgWrapper, "movableImage");
        append = true;
    } else {
        lord.removeChildren(lord.imgWrapper);
    }
    if (lord.isAudioType(type)) {
        sizeHintX = (lord.text("deviceType") == "mobile") ? 500 : 400;
        lord.img = lord.node("audio");
        lord.img.width = sizeHintX + "px";
        lord.img.controls = true;
        if (lord.getLocalObject("loopAudioVideo", false))
            lord.img.loop = true;
        if (lord.text("deviceType") == "mobile")
            lord.imgWrapper.scale = 60;
        else
            lord.imgWrapper.scale = 100;
        var defVol = lord.getLocalObject("defaultAudioVideoVolume", 100) / 100;
        var remember = lord.getLocalObject("rememberAudioVideoVolume", false);
        lord.img.volume = remember ? lord.getLocalObject("audioVideoVolume", defVol) : defVol;
        var src = lord.node("source");
        src.src = href;
        src.type = type;
        lord.img.appendChild(src);
    } else if (lord.isImageType(type)) {
        if (!sizeHintX || !sizeHintY || sizeHintX <= 0 || sizeHintY <= 0)
            return true;
        lord.img = lord.node("img");
        lord.img.width = sizeHintX;
        lord.img.height = sizeHintY;
        lord.img.src = href;
    } else if (lord.isVideoType(type)) {
        lord.img = lord.node("video");
        lord.img.controls = true;
        if (lord.getLocalObject("loopAudioVideo", false))
            lord.img.loop = true;
        var defVol = lord.getLocalObject("defaultAudioVideoVolume", 100) / 100;
        var remember = lord.getLocalObject("rememberAudioVideoVolume", false);
        lord.img.volume = remember ? lord.getLocalObject("audioVideoVolume", defVol) : defVol;
        var src = lord.node("source");
        src.src = href;
        src.type = type;
        lord.img.appendChild(src);
    }
    lord.img.fileType = type;
    lord.img.sizeHintX = sizeHintX;
    lord.img.sizeHintY = sizeHintY;
    lord.imgWrapper.appendChild(lord.img);
    lord.setInitialScale(lord.imgWrapper, sizeHintX, sizeHintY);
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
    var wheelHandler = function(e) {
        var e = window.event || e; //Old IE support
        e.preventDefault();
        var delta = lord.getLocalObject("imageZoomSensitivity", 25);
        if ((e.wheelDelta || -e.detail) < 0)
            delta *= -1;
        var k = 1;
        if (delta < 0) {
            while ((lord.imgWrapper.scale + (delta / k)) <= 0)
                k *= 10;
        } else {
            //This is shitty, because floating point calculations are shitty
            var s = parseFloat((lord.imgWrapper.scale / (delta / k)).toString().substr(0, 5));
            while (!lord.nearlyEqual(s - Math.floor(s), 0, 1 / 1000000)) {
                k *= 10;
                s = parseFloat((lord.imgWrapper.scale / (delta / k)).toString().substr(0, 5));
            }
        }
        lord.imgWrapper.scale += (delta / k);
        lord.resetScale(lord.imgWrapper);
    };
    if (append) {
        if (lord.imgWrapper.addEventListener) {
        	lord.imgWrapper.addEventListener("mousewheel", wheelHandler, false); //IE9, Chrome, Safari, Opera
	        lord.imgWrapper.addEventListener("DOMMouseScroll", wheelHandler, false); //Firefox
        } else {
            lord.imgWrapper.attachEvent("onmousewheel", wheelHandler); //IE 6/7/8
        }
        if (lord.isImageType(type) || lord.isVideoType(type)) {
            lord.imgWrapper.onmousedown = function(e) {
                if (!!e.button)
                    return;
                e.preventDefault();
                if (lord.isAudioType(lord.img.fileType))
                    return;
                if (lord.isVideoType(lord.img.fileType) && (lord.img.sizeHintY - e.offsetY < 35))
                    return;
                lord.img.moving = true;
                lord.img.wasPaused = lord.img.paused;
                lord.img.coord.x = e.clientX;
                lord.img.coord.y = e.clientY;
                lord.img.initialCoord.x = e.clientX;
                lord.img.initialCoord.y = e.clientY;
            };
            lord.imgWrapper.onmouseup = function(e) {
                if (!!e.button)
                    return;
                e.preventDefault();
                if (!lord.img.moving)
                    return;
                lord.img.moving = false;
                if (lord.img.initialCoord.x === e.clientX && lord.img.initialCoord.y === e.clientY) {
                    if (lord.isAudioType(type) || lord.isVideoType(type)) {
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
            lord.imgWrapper.onmousemove = function(e) {
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
        }
        document.body.appendChild(lord.imgWrapper);
    } else {
        lord.imgWrapper.style.display = "";
    }
    lord.toCenter(lord.imgWrapper, sizeHintX, sizeHintY, 3);
    if ((lord.isAudioType(lord.img.fileType) || lord.isVideoType(lord.img.fileType))
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
    return false;
};

lord.previousFile = function() {
    var f = lord.nextOrPreviousFile(true);
    if (!f)
        return;
    lord.showImage(f.href, f.type, f.sizeX, f.sizeY);
};

lord.nextFile = function() {
    var f = lord.nextOrPreviousFile(false);
    if (!f)
        return;
    lord.showImage(f.href, f.type, f.sizeX, f.sizeY);
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

lord.submitted = function(event, form) {
    if (event)
        event.preventDefault();
    if (!form);
        form = lord.id("postForm");
    var btn = lord.nameOne("submit", form);
    btn.disabled = true;
    btn.value = lord.text("postFormButtonSubmitSending") + " 0%";
    var resetButton = function() {
        btn.disabled = false;
        btn.value = lord.text("postFormButtonSubmit");
    };
    var formData = new FormData(form);
    lord.query(".postformFile", form).forEach(function(div) {
        if (div.droppedFile)
            formData.append(div.droppedFileName || "file", div.droppedFile);
        else if (div.fileUrl)
            formData.append(div.droppedFileName, div.fileUrl);
    });
    var xhr = new XMLHttpRequest();
    xhr.open("POST", form.action);
    xhr.upload.onprogress = function(e) {
        var percent = Math.floor(100 * (e.loaded / e.total));
        if (100 == percent)
            btn.value = lord.text("postFormButtonSubmitWaiting");
        else
            btn.value = lord.text("postFormButtonSubmitSending") + " " + percent + "%";
    };
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var response = xhr.responseText;
                var err = response.error;
                if (!!err) {
                    resetButton();
                    lord.showPopup(err, {type: "critical"});
                }
                lord.posted(response);
            } else {
                resetButton();
                var text = lord.text("ajaxErrorText") + " " + xhr.status;
                switch (+xhr.status) {
                case 413:
                    text = lord.text("error" + xhr.status + "Text");
                    break;
                default:
                    break;
                }
                lord.showPopup(text, {type: "critical"});
            }
        }
    };
    xhr.send(formData);
    return false;
};

lord.removeQuickReply = function() {
    if (!lord.postForm.quickReply)
        return;
    var postForm = lord.id("postForm");
    if (!lord.text("currentThreadNumber")) {
        postForm.removeChild(lord.nameOne("thread", postForm));
        postForm.action = postForm.action.replace("create_post", "create_thread");
    }
    lord.id("hiddenPostForm").appendChild(postForm);
    lord.postForm.quickReply = false;
    if (lord.postForm.last)
        lord.showHidePostForm(lord.postForm.last);
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
    if (lord.customResetForm)
        lord.customResetForm(postForm);
};

lord.posted = function(response) {
    var postForm = lord.id("postForm");
    var o = {};
    try {
        o = JSON.parse(response);
    } catch (ex) {
        //
    }
    var postNumber = o.postNumber;
    var threadNumber = o.threadNumber;
    var boardName = lord.text("currentBoardName");
    var currentThreadNumber = lord.text("currentThreadNumber");
    var resetButton = function() {
        var btn = postForm.querySelector("[name='submit']");
        btn.disabled = false;
        btn.value = lord.text("postFormButtonSubmit");
    };
    var f = function() {
        if (postNumber) {
            if (lord.postForm.quickReply && !currentThreadNumber) {
                var action = lord.getLocalObject("quickReplyAction", "goto_thread");
                if ("do_nothing" === action) {
                    //Do nothing
                } else if ("append_post" == action) {
                    var parent = postForm.parentNode;
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
                    lord.ajaxRequest("get_post", [boardName, postNumber], lord.RpcGetPostId, function(res) {
                        var newPost = lord.createPostNode(res, true);
                        if (newPost) {
                            var lastPost = lord.query(".post, .opPost", parent).pop();
                            var seqNum = +lord.getPlainText(lord.queryOne(".postSequenceNumber", lastPost));
                            if (!isNaN(seqNum))
                                lord.queryOne(".postSequenceNumber", newPost).appendChild(lord.node("text", ++seqNum));
                            parent.appendChild(newPost, parent.lastChild);
                            lord.postNodeInserted(newPost);
                        }
                    });
                } else {
                    //The default
                    var href = window.location.href.split("#").shift();
                    href += "/thread/" + lord.nameOne("thread", postForm).value + ".html#" + postNumber;
                    window.location.href = href;
                    return;
                }
            }
            resetButton();
            lord.resetPostForm();
            if (currentThreadNumber)
                lord.updateThread(boardName, currentThreadNumber, true, (function(pn) {
                    if (lord.getLocalObject("moveToPostOnReplyInThread", true))
                        window.location.hash = "#" + postNumber;
                }).bind(lord, postNumber));
            lord.removeQuickReply();
            lord.resetCaptcha();
        } else if (threadNumber) {
            var href = window.location.href.split("#").shift();
            window.location.href = href + (href.substring(href.length - 1) != "/" ? "/" : "") + "thread/"
                + threadNumber + ".html";
        } else {
            resetButton();
            var errmsg = o.errorMessage;
            var errdesc = o.errorDescription;
            var txt = (errmsg && errdesc) ? (errmsg + ": " + errdesc) : response.substring(0, 150);
            lord.showPopup(txt, {type: "critical"});
            lord.resetCaptcha();
        }
    };
    if (lord.getLocalObject("addToFavoritesOnReply", false) && (postNumber || threadNumber))
        lord.addThreadToFavorites(boardName, threadNumber || lord.nameOne("thread", postForm).value, f, f);
    else
        f();
};

lord.globalOnmouseover = function(e) {
    var a = e.target;
    if (a.tagName != "A" || a.innerHTML == a.innerHTML.replace("&gt;&gt;", ""))
        return;
    var pn = +a.href.split("#").pop();
    if (isNaN(pn) || pn <= 0)
        return;
    var bn = a.href.replace(/\/thread\/\d+\.html#\d+$/, "").split("/").pop();
    lord.viewPost(a, bn, pn);
};

lord.globalOnmouseout = function(e) {
    var a = e.target;
    if (a.tagName != "A" || a.innerHTML == a.innerHTML.replace("&gt;&gt;", ""))
        return;
    var pn = +a.href.split("#").pop();
    if (isNaN(pn) || pn <= 0)
        return;
    lord.noViewPost();
};

lord.strikeOutHiddenPostLink = function(a, list, cbn) {
    if (!a)
        return;
    if (!list)
        list = lord.getLocalObject("hiddenPosts", {});
    if (!cbn)
        cbn = lord.text("currentBoardName");
    var m = a.href.match(/^.*\/(.+)\/thread\/\d+\.html#(\d+)$/);
    if (!m || !m.length || m.length < 3)
        return;
    var bn = m[1];
    var pn = m[2];
    if (list[bn + "/" + pn])
        lord.addClass(a, "hiddenPostLink");
    else
        lord.removeClass(a, "hiddenPostLink");
};

lord.signOpPostLink = function(a, cbn) {
    if (!a)
        return;
    if (!cbn)
        cbn = lord.text("currentBoardName");
    var m = a.href.match(/^.*\/(.+)\/thread\/\d+\.html#(\d+)$/);
    if (!m || !m.length || m.length < 3)
        return;
    var bn = m[1];
    var pn = m[2];
    var post = lord.id("post" + pn);
    if (post) {
        if (!lord.hasClass(post, "opPost") || a.textContent.indexOf("(OP)") >= 0)
            return;
        a.appendChild(lord.node("text", " (OP)"));
    } else {
        (function(a, bn, pn) {
            lord.ajaxRequest("get_post", [bn, +pn], lord.RpcGetPostId, function(res) {
                if (res["number"] != res["threadNumber"])
                    return;
                a.appendChild(lord.node("text", " (OP)"));
            });
        })(a, bn, pn);
    }
};

lord.signOwnPostLink = function(a, cbn) {
    if (!a)
        return;
    if (!cbn)
        cbn = lord.text("currentBoardName");
    var m = a.href.match(/^.*\/(.+)\/thread\/\d+\.html#(\d+)$/);
    if (!m || !m.length || m.length < 3)
        return;
    var bn = m[1];
    var pn = m[2];
    var post = lord.id("post" + pn);
    if (post) {
        if (!lord.hasClass(post, "ownIp") || a.textContent.indexOf("(You)") >= 0)
            return;
        a.appendChild(lord.node("text", " (You)"));
    } else {
        (function(a, bn, pn) {
            lord.ajaxRequest("get_post", [bn, +pn], lord.RpcGetPostId, function(res) {
                if (!res["ownIp"])
                    return;
                a.appendChild(lord.node("text", " (You)"));
            });
        })(a, bn, pn);
    }
};

lord.strikeOutHiddenPostLinks = function(parent) {
    if (!parent)
        parent = document;
    (function() {
        var list = lord.getLocalObject("hiddenPosts", {});
        var cbn = lord.text("currentBoardName");
        lord.gently(lord.query("a", parent), function(a) {
            lord.strikeOutHiddenPostLink(a, list, cbn);
        }, 10, 20);
    });
};

lord.signOpPostLinks = function(parent) {
    if (!parent)
        parent = document;
    (function() {
        var cbn = lord.text("currentBoardName");
        lord.gently(lord.query("a", parent), function(a) {
            lord.signOpPostLink(a, cbn);
        }, 10, 20);
    })();
};

lord.signOwnPostLinks = function(parent) {
    if (!parent)
        parent = document;
    (function() {
        var cbn = lord.text("currentBoardName");
        lord.gently(lord.query("a", parent), function(a) {
            lord.signOwnPostLink(a, cbn);
        }, 10, 20);
    })();
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
            }, 10, 10);
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
        var f = lord.query(".postFileFile", p);
        if (!f)
            return;
        f = f[0];
        var href = lord.queryOne("a", f).href;
        var type = lord.nameOne("type", f).value;
        if ("application/pdf" == type) {
            window.open(href, '_blank').focus();
        } else {
            var sizeX = lord.nameOne("sizeX", f).value;
            var sizeY = lord.nameOne("sizeY", f).value;
            lord.showImage(href, type, sizeX, sizeY);
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
    document.body.onmouseover = lord.globalOnmouseover;
    document.body.onmouseout = lord.globalOnmouseout;
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
    var fav = lord.getLocalObject("favoriteThreads", {});
    var currentBoardName = lord.text("currentBoardName");
    if (lord.getLocalObject("spellsEnabled", true)) {
        lord.worker.postMessage({
            "type": "parseSpells",
            "data": lord.getLocalObject("spells", lord.DefaultSpells)
        });
    } else if (lord.getLocalObject("showYoutubeVideosTitles", true)) {
        lord.processPosts(null, true);
    } else {
        lord.gently(lord.query(".post:not(#postTemplate), .opPost"), lord.tryHidePost(post), 10, 10);
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
    lord.setPostformMarkupVisible(!lord.getLocalObject("hidePostformMarkup", false));
    if (!!lord.getLocalObject("strikeOutHiddenPostLinks", true))
        lord.strikeOutHiddenPostLinks();
    if (!!lord.getLocalObject("signOpPostLinks", true))
        lord.signOpPostLinks();
    if (!!lord.getLocalObject("signOwnPostLinks", true))
        lord.signOwnPostLinks();
    if (!lord.text("currentThreadNumber")) {
        var lastPostNumbers = lord.getLocalObject("lastPostNumbers", {});
        lastPostNumbers[lord.text("currentBoardName")] = +lord.text("lastPostNumber");
        lord.setLocalObject("lastPostNumbers", lastPostNumbers);
    }
    lord.initFiles();
    lord.hashChangedHandler(lord.hash());
    lord.scrollHandler();
};

lord.hashChangedHandler = function(hash) {
    if (lord.lastSelectedElement)
        lord.removeClass(lord.lastSelectedElement, "selectedPost");
    var pn = +hash;
    if (isNaN(pn))
        return;
    var post = lord.id("post" + pn);
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
            }, 10, 10);
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
