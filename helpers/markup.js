var Highlight = require("highlight.js");
var HTTP = require("q-io/http");
var URL = require("url");
var XRegExp = require("xregexp");

var Board = require("../boards");
var config = require("./config");
var controller = require("./controller");
var Database = require("./database");
var Global = require("./global");
var Tools = require("./tools");

var langNames = require("../misc/lang-names.json");

var SkipTypes = {
    NoSkip: "NO_SKIP",
    HtmlSkip: "HTML_SKIP",
    CodeSkip: "CODE_SKIP"
};

var MarkupModes = {
    ExtendedWakabaMark: "EXTENDED_WAKABA_MARK",
    BBCode: "BB_CODE"
};

var MarkupTags = {
    "---": {
        op: "<s>",
        cl: "</s>"
    },
    "***": {
        op: "<u>",
        cl: "</u>"
    },
    "**": {
        op: "<strong>",
        cl: "</strong>"
    },
    "*": {
        op: "<em>",
        cl: "</em>"
    },
    "___": {
        op: "<u>",
        cl: "</u>"
    },
    "__": {
        op: "<strong>",
        cl: "</strong>"
    },
    "_": {
        op: "<em>",
        cl: "</em>"
    },
    "///": {
        op: "<em>",
        cl: "</em>"
    },
    "%%": {
        op: "<span class=\"spoiler\">",
        cl: "</span>"
    },
    "[b]": {
        op: "<strong>",
        cl: "</strong>"
    },
    "[i]": {
        op: "<em>",
        cl: "</em>"
    },
    "[s]": {
        op: "<s>",
        cl: "</s>"
    },
    "[u]": {
        op: "<u>",
        cl: "</u>"
    },
    "[sub]": {
        op: "<sub>",
        cl: "</sub>"
    },
    "[sup]": {
        op: "<sup>",
        cl: "</sup>"
    },
    "[spoiler]": {
        op: "<span class=\"spoiler\">",
        cl: "</span>"
    },
};

var ListTypes = {
    d: "disc",
    c: "circle",
    s: "square"
};

var isEscaped = function(s, pos) {
    if (pos <= 0 || pos >= s.length)
        return false;
    var n = 0;
    var i = pos - 1;
    while (i >= 0 && s[i] == "\\") {
        ++n;
        --i;
    }
    return (n % 2);
};

var withoutEscaped = function(text) {
    var rx = /``|''/gi;
    var ind = text.lastIndexOf(rx);
    while (ind >= 0) {
        if (isEscaped(text, ind)) {
            text.remove(ind - 1, 1);
            ind = text.lastIndexOf(rx, ind - text.length - 3);
            continue;
        }
        ind = text.lastIndexOf(rx, ind - text.length - 2);
    }
    return text;
};

var matchTwitterLink = function(href) {
    return config("site.twitter.integrationEnabled", true)
        && href.match(/^https?\:\/\/twitter\.com\/[^\/]+\/status\/\d+\/?$/);
};

var matchYoutubeLink = function(href) {
    return href.match(/^https?\:\/\/(m\.|www\.)?youtube\.com\/.*v\=[^\/]+.*$/)
        || href.match(/^https?\:\/\/youtu\.be\/[^\/]+.*$/);
};

var matchCoubLink = function(href) {
    return href.match(/^https?:\/\/coub\.com\/view\/[^\/\?]+.*$/);
};

var getTwitterEmbeddedHtml = function(href, defaultHtml) {
    return HTTP.request({
        method: "GET",
        url: `https://api.twitter.com/1/statuses/oembed.json?url=${href}`,
        timeout: Tools.Minute
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject(Tools.translate("Failed to get Twitter embedded HTML"));
        return response.body.read();
    }).then(function(data) {
        try {
            return Promise.resolve(JSON.parse(data.toString()).html);
        } catch (err) {
            return Promise.reject(err);
        }
    }).catch(function(err) {
        Global.error(err.stack || err);
        return Promise.resolve(defaultHtml);
    }).then(function(html) {
        return Promise.resolve(html);
    });
};

var youtubeVideoStartTime = function(href) {
    if (!href)
        return null;
    var t = URL.parse(href, true).query.t;
    if (!t)
        return null;
    var match = t.match(/((\d+)h)?((\d+)m)?((\d+)s)?/);
    if (!match)
        return null;
    var start = 0;
    if (match[2])
        start += +match[2] * 3600;
    if (match[4])
        start += +match[4] * 60;
    if (match[6])
        start += +match[6];
    if (isNaN(start) || start <= 0)
        return null;
    return start;
};

var getYoutubeEmbeddedHtml = function(href, defaultHtml) {
    var match = href.match(/^https?\:\/\/.*youtube\.com\/.*v\=([^\/#\?&]+).*$/);
    var videoId = match ? match[1] : null;
    if (!videoId) {
        match = href.match(/^https?\:\/\/youtu\.be\/([^\/#\?]+).*$/);
        videoId = match ? match[1] : null;
    }
    var apiKey = config("server.youtubeApiKey", "");
    if (!videoId || !apiKey)
        return Promise.resolve(defaultHtml);
    return HTTP.request({
        method: "GET",
        url: `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`,
        timeout: Tools.Minute
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject(Tools.translate("Failed to get YouTube embedded HTML"));
        return response.body.read();
    }).then(function(data) {
        try {
            var response = JSON.parse(data.toString());
            if (!response.items || response.items.length < 1)
                return Promise.reject(Tools.translate("Failed to get YouTube video info"));
            var info = response.items[0].snippet;
            info.id = videoId;
            info.href = href;
            info.start = youtubeVideoStartTime(href);
            var html = controller.sync("youtubeVideoLink", { info: info });
            if (!html)
                return Promise.reject(Tools.translate("Failed to create YouTube video link"));
            return Promise.resolve(html);
        } catch (err) {
            return Promise.reject(err);
        }
    }).catch(function(err) {
        Global.error(err.stack || err);
        return Promise.resolve(defaultHtml);
    }).then(function(html) {
        return Promise.resolve(html);
    });
};

var getCoubEmbeddedHtml = function(href, defaultHtml) {
    var match = href.match(/^https?:\/\/coub\.com\/view\/([^\/\?#]+).*$/);
    var videoId = match ? match[1] : null;
    if (!videoId)
        return Promise.resolve(defaultHtml);
    return HTTP.request({
        method: "GET",
        url: `https://coub.com/api/oembed.json?url=http://coub.com/view/${videoId}`,
        timeout: Tools.Minute
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject(Tools.translate("Failed to get Coub embedded HTML"));
        return response.body.read();
    }).then(function(data) {
        try {
            var response = JSON.parse(data.toString());
            if (!response)
                return Promise.reject(Tools.translate("Failed to get Coub video info"));
            var info = {
                href: href,
                videoTitle: response.title,
                authorName: response.author_name,
                thumbnail: response.thumbnail_url ? {
                    url: response.thumbnail_url,
                    width: response.thumbnail_width,
                    height: response.thumbnail_height
                } : null,
                id: videoId
            };
            var html = controller.sync("coubVideoLink", { info: info });
            if (!html)
                return Promise.reject(Tools.translate("Failed to create Coub video link"));
            return Promise.resolve(html);
        } catch (err) {
            return Promise.reject(err);
        }
    }).catch(function(err) {
        Global.error(err.stack || err);
        return Promise.resolve(defaultHtml);
    }).then(function(html) {
        return Promise.resolve(html);
    });
};

var ProcessingInfo = function(text, boardName, referencedPosts, deletedPost, referencesToReplace) {
    this.boardName = boardName;
    this.deletedPost = deletedPost;
    this.referencedPosts = referencedPosts;
    this.referencesToReplace = referencesToReplace;
    this.text = text;
    this.skipList = [];
};

ProcessingInfo.prototype.find = function(rx, from, escapable) {
    from = (+from > 0) ? from : 0;
    if (typeof rx == "string") {
        var ind = this.text.indexOf(rx, from);
        while (ind >= 0) {
            var isIn = false;
            for (var i = 0; i < this.skipList.length; ++i) {
                var inf = this.skipList[i];
                if (ind >= inf.from && ind < (inf.from + inf.length)) {
                    ind = this.text.indexOf(rx, inf.from + inf.length);
                    isIn = true;
                    break;
                }
            }
            if (!isIn) {
                if (escapable && isEscaped(this.text, ind)) {
                    ind = this.text.indexOf(rx, ind + 1);
                } else {
                    return {
                        0: rx,
                        index: ind
                    };
                }
            }
        }
    } else {
        rx.lastIndex = from;
        var match = rx.exec(this.text);
        while (match) {
            var isIn = false;
            for (var i = 0; i < this.skipList.length; ++i) {
                var inf = this.skipList[i];
                if (match && match.index >= inf.from && match.index < (inf.from + inf.length)) {
                    rx.lastIndex = inf.from + inf.length;
                    match = rx.exec(this.text);
                    isIn = true;
                    break;
                }
            }
            if (!isIn && match) {
                if (escapable && isEscaped(this.text, match.index)) {
                    rx.lastIndex = match.index + 1;
                    match = rx.exec(this.text);
                } else {
                    return match;
                }
            }
        }
    }
    return null;
};

ProcessingInfo.prototype.isIn = function(start, length, type) {
    if (start < 0 || length <= 0 || (start + length) > this.text.length || SkipTypes.NoSkip == type)
        return false;
    type = type || SkipTypes.CodeSkip;
    for (var i = 0; i < this.skipList.length; ++i) {
        var inf = this.skipList[i];
        if (inf.type != type)
            continue;
        var x = start;
        while (x < start + length) {
            if (x >= inf.from && x <= (inf.from + inf.length))
                return true;
            ++x;
        }
    }
    return false;
};

ProcessingInfo.prototype.insert = function(from, txt, type) {
    if (from < 0 || txt.length <= 0 || from > this.text.length)
        return;
    type = type || SkipTypes.HtmlSkip;
    var info = {
        from: from,
        length: txt.length,
        type: type
    };
    var found = false;
    for (var i = this.skipList.length - 1; i >= 0; --i) {
        var inf = this.skipList[i];
        if (from > inf.from) {
            if (SkipTypes.NoSkip != type)
                this.skipList.splice(i + 1, 0, info);
            found = true;
            break;
        }
        inf.from += txt.length;
    }
    if (!found && SkipTypes.NoSkip != type)
        this.skipList.unshift(info);
    this.text = this.text.substr(0, from) + txt + this.text.substr(from);
};

ProcessingInfo.prototype.replace = function(from, length, txt, correction, type) {
    if (from < 0 || length <= 0 || (txt.length < 1) || (length + from) > this.text.length)
        return;
    type = type || SkipTypes.HtmlSkip;
    var info = {
        from: from,
        length: txt.length,
        type: type
    };
    var dlength = txt.length - length;
    var found = false;
    for (var i = this.skipList.length - 1; i >= 0; --i) {
        var inf = this.skipList[i];
        if (from >= inf.from) {
            if (SkipTypes.NoSkip != type)
                this.skipList.splice(i + 1, 0, info);
            found = true;
            break;
        }
        if (inf.from < (from + length))
            inf.from -= correction;
        else
            inf.from += dlength;
    }
    if (!found && SkipTypes.NoSkip != type)
        this.skipList.unshift(info);
    this.text = this.text.substr(0, from) + txt + this.text.substr(from + length);
};

ProcessingInfo.prototype.toHtml = function() {
    var s = "";
    var last = 0;
    for (var i = 0; i < this.skipList.length; ++i) {
        var inf = this.skipList[i];
        s += Tools.toHtml(withoutEscaped(this.text.substr(last, inf.from - last)));
        s += this.text.substr(inf.from, inf.length);
        last = inf.from + inf.length;
    }
    s += Tools.toHtml(this.text.substr(last));
    s = s.replace(/<\/li>(\s|&nbsp;|<br \/>)+<li/g, "</li><li");
    s = s.replace(/<\/li>(\s|&nbsp;|<br \/>)+<\/ul/g, "</li></ul");
    s = s.replace(/<\/li>(\s|&nbsp;|<br \/>)+<\/ol/g, "</li></ol");
    s = s.replace(/<ol>(\s|&nbsp;|<br \/>)+<li/g, "<ol><li");
    var rx = /<ul type\="(disc|circle|square)">(\s|&nbsp;|<br \/>)+<li/g;
    var match = rx.exec(s);
    while (match) {
        var ns = "<ul type=\"" + match[1] + "\"><li";
        s = s.substr(0, match.index) + ns + s.substr(match.index + match[0].length);
        rx.lastIndex = ns.length;
        match = rx.exec(s);
    }
    return s;
};

var getIndE = function(info, rxOp, matchs, rxCl, inds, nestable, escapable, nested) {
    nested.nested = false;
    if (!nestable)
        return (inds >= 0) ? info.find(rxCl, inds + matchs[0].length, escapable) : -1;
    if (inds >= 0) {
        var matchst = info.find(rxOp, inds + matchs[0].length, escapable);
        var matchet = info.find(rxCl, inds + matchs[0].length, escapable);
        var depth = 1;
        while (matchst || matchet) {
            var tmp = (matchst && (!matchet || matchst.index < matchet.index)) ? matchst : matchet;
            var offs = (matchst && (!matchet || matchst.index < matchet.index)) ? matchst[0].length : matchet[0].length;
            depth += (tmp.index == (matchst ? matchst.index : -1)) ? 1 : -1;
            if (depth > 1)
                nested.nested = true;
            if (!depth)
                return tmp;
            matchst = info.find(rxOp, tmp.index + offs, escapable);
            matchet = info.find(rxCl, tmp.index + offs, escapable);
        }
    }
    return null;
};

var process = function(info, conversionFunction, regexps, options) {
    var rxOp = regexps.op;
    var rxCl = regexps.hasOwnProperty("cl") ? regexps.cl : rxOp;
    var nestable = options && options.nestable;
    var escapable = options && options.escapable;
    var checkFunction = options ? options.checkFunction : undefined;
    var nested = {
        nested: false
    };
    var matchs = info.find(rxOp, 0, escapable);
    var matche = rxCl ? getIndE(info, rxOp, matchs, rxCl, matchs ? matchs.index : -1, nestable, escapable, nested)
        : null;
    var rerun = false;
    var f = function() {
        if (!matchs || (rxCl && (!matche || matche.index <= matchs.index)))
            return Promise.resolve();
        if (checkFunction && !checkFunction(info, matchs, matche)) {
            if (rxCl && matche)
                matchs = info.find(rxOp, matche.index + matche[0].length, escapable);
            else
                matchs = info.find(rxOp, matchs.index + matchs[0].length, escapable);
            matche = rxCl ? getIndE(info, rxOp, matchs, rxCl, matchs ? matchs.index : -1, nestable, escapable, nested)
                : null;
            return f();
        }
        var options = {
            op: "",
            cl: "",
            type: SkipTypes.NoSkip
        };
        var start = matche ? (matchs.index + matchs[0].length) : matchs.index;
        var end = matche ? (matche.index - matchs.index - matchs[0].length) : (matchs.index + matchs[0].length);
        var txt = info.text.substr(start, end);
        return conversionFunction(info, txt, matchs, matche, options).then(function(ntxt) {
            txt = ntxt;
            if (txt) {
                if (options.cl)
                    info.insert(rxCl ? (matche.index + matche[0].length) : matchs.index + matchs[0].length, options.cl);
                if (rxCl) {
                    info.replace(matchs.index, matche.index - matchs.index + matche[0].length, txt, matchs[0].length,
                        options.type);
                } else {
                    info.replace(matchs.index, matchs[0].length, txt, matchs[0].length, options.type);
                }
                if (options.op)
                    info.insert(matchs.index, options.op);
                matchs = info.find(rxOp, matchs.index + txt.length + options.op.length + options.cl.length, escapable);
            } else {
                if (rxCl) {
                    matchs = info.find(rxOp, matche ? (matche.index + matche[0].length)
                        : (matchs.index + matchs[0].length), escapable);
                } else {
                    matchs = info.find(rxOp, matchs.index + matchs[0].index, escapable);
                }
            }
            if (nestable && nested.nested)
                rerun = true;
            matche = rxCl ? getIndE(info, rxOp, matchs, rxCl, matchs ? matchs.index : -1, nestable, escapable, nested)
                : null;
            return f();
        });
    };
    return f().then(function() {
        if (rerun)
            return process(info, conversionFunction, {
                op: rxOp,
                cl: rxCl
            }, {
                nestable: nestable,
                escapable: escapable,
                checkFunction: checkFunction
            });
        return Promise.resolve();
    })
};

var processStrikedOutShitty = function(info) {
    var rx = /(\^H)+/gi;
    var match = info.find(rx);
    while (match) {
        var s = match.index - (match[0].length / 2);
        if (s < 0) {
            match = info.find(rx, match.index + match[0].length);
            continue;
        }
        info.replace(match.index, match[0].length, "</s>", 0);
        info.insert(s, "<s>");
        match = info.find(rx, match.index + 7);
    }
    return Promise.resolve();
};

var processStrikedOutShittyWord = function(info) {
    var rx = /(\^W)+/gi;
    var match = info.find(rx);
    var txt = info.text;
    while (match) {
        var count = match[0].length / 2;
        var pcount = count;
        var s = match.index - 1;
        while (count > 0) {
            while (s >= 0 && /\s/.test(txt[s]))
                --s;
            while (s >= 0 && !/\s/.test(txt[s]))
                --s;
            --count;
        }
        info.replace(match.index, match[0].length, "</s>", 0);
        info.insert(s + 1, "<s>");
        match = info.find(rx, match.index + (7 * pcount));
    }
    return Promise.resolve();
};

var checkLangsMatch = function(info, matchs, matche) {
    return matchs && matche && matchs[1] && matchs[1] == matche[1];
};

var checkExternalLink = function(info, matchs) {
    return /^\d+\.\d+\.\d+\.\d+$/.test(matchs[2]) || Tools.externalLinkRootZoneExists(matchs[4]);
};

var checkQuotationNotInterrupted = function(info, matchs, matche) {
    if (info.isIn(matchs.index, matche.index - matchs.index))
        return false;
    if (0 == matchs.index)
        return true;
    if ("\n" == info.text.substr(matchs.index - 1, 1))
        return true;
    return (info.isIn(matchs.index - 6, 6, SkipTypes.HtmlSkip) && info.text.substr(matchs.index - 6, 6) == "<br />");
};

var convertMonospace = function(_, text, _, _, options) {
    options.op = "<font face=\"monospace\">";
    options.cl = "</font>";
    options.type = SkipTypes.CodeSkip;
    return Promise.resolve(Tools.toHtml(withoutEscaped(text)));
};

var convertNomarkup = function(_, text, _, _, options) {
    options.type = SkipTypes.CodeSkip;
    return Promise.resolve(Tools.toHtml(withoutEscaped(text)));
};

var convertPre = function(_, text, _, _, options) {
    options.op = "<pre>";
    options.cl = "</pre>";
    options.type = SkipTypes.CodeSkip;
    text = withoutEscaped(text).split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
    text = text.split("\"").join("&quot;");
    return Promise.resolve(text);
};

var convertCode = function(_, text, matchs, _, options) {
    options.type = SkipTypes.CodeSkip;
    var lang = matchs[1];
    if (lang)
        lang = lang.replace("++", "pp").replace("#", "s");
    Highlight.configure({
        tabReplace: "    ",
        useBR: true
    });
    var result = lang ? Highlight.highlight(lang, text, true) : Highlight.highlightAuto(text);
    text = result.value;
    lang = result.language || lang;
    var langClass = lang ? (" " + lang) : "";
    var langName = langNames.hasOwnProperty(lang) ? langNames[lang] : lang;
    options.op = `<div class="codeBlock${langClass} hljs" title="${langName || ''}">`;
    options.cl = "</div>";
    return Promise.resolve(Highlight.fixMarkup(text));
};

var convertVkontaktePost = function(_, _, matchs, _, options) {
    options.type = SkipTypes.HtmlSkip;
    return Promise.resolve("<div class=\"overflowContainer\">" + matchs[0] + "</div>");
};

var convertExternalLink = function(info, text, matchs, _, options) {
    if (!text)
        return Promise.resolve("");
    options.type = SkipTypes.HtmlSkip;
    if (info.isIn(matchs.index, matchs[0].length, SkipTypes.HtmlSkip))
        return Promise.resolve(text);
    var href = matchs[0];
    if (href.lastIndexOf("http", 0) && href.lastIndexOf("ftp", 0))
        href = "http://" + href;
    var def = "<a href=\"" + href + "\">" + Tools.toHtml(matchs[0]) + "</a>";
    if (matchTwitterLink(href))
        return getTwitterEmbeddedHtml(href, def);
    if (matchYoutubeLink(href))
        return getYoutubeEmbeddedHtml(href, def);
    if (matchCoubLink(href))
        return getCoubEmbeddedHtml(href, def);
    return Promise.resolve(def);
};

var convertProtocol = function(_, _, matchs, _, options) {
    options.type = SkipTypes.HtmlSkip;
    return Promise.resolve("<a href=\"" + matchs[0] + "\">" + Tools.toHtml(matchs[2]) + "</a>");
};

var convertTooltipShitty = function(_, _, matchs, _, options) {
    options.type = SkipTypes.NoSkip;
    var tooltip = matchs[2];
    options.op = "<span class=\"tooltip\" title=\"" + tooltip + "\">";
    options.cl = "</span>";
    return Promise.resolve(matchs[1]);
};

var convertPostLink = function(info, _, matchs, _, options) {
    options.type = SkipTypes.HtmlSkip;
    var boardName = (matchs.length > 2) ? matchs[1] : info.boardName;
    var postNumber = matchs[(matchs.length > 2) ? 2 : 1];
    var escaped = matchs[0].split(">").join("&gt;");
    if (postNumber && (postNumber != info.deletedPost)) {
        return Database.db.hget("posts", boardName + ":" + postNumber).then(function(post) {
            if (!post)
                return escaped;
            post = JSON.parse(post);
            if (info.referencedPosts) {
                var key = boardName + ":" + postNumber;
                if (!info.referencedPosts[key]) {
                    info.referencedPosts[key] = {
                        boardName: boardName,
                        postNumber: postNumber,
                        threadNumber: post.threadNumber,
                        createdAt: Tools.now()
                    };
                }
            }
            var href = "href=\"/" + config("site.pathPrefix", "") + boardName + "/res/" + post.threadNumber + ".html";
            if (postNumber != post.threadNumber)
                href += "#" + postNumber;
            href += "\"";
            var result = "<a " + href + " data-board-name=\"" + boardName + "\" data-post-number=\"" + postNumber
                + "\" data-thread-number=\"" + post.threadNumber + "\">" + escaped + "</a>";
            return result;
        });
    } else {
        return Promise.resolve(escaped);
    }
};

var convertHtml = function(_, text, _, _, options) {
    options.type = SkipTypes.HtmlSkip;
    return Promise.resolve(text);
};

var convertMarkup = function(_, text, matchs, _, options) {
    options.type = SkipTypes.NoSkip;
    if ("----" == matchs[0])
        return Promise.resolve("\u2014");
    else if ("--" == matchs[0])
        return Promise.resolve("\u2013");
    var tag = MarkupTags[matchs[0]];
    if (!tag)
        return Promise.resolve("");
    options.op = tag.op;
    options.cl = tag.cl;
    return Promise.resolve(text);
};

var convertLatex = function(inline, _, text, matchs, _, options) {
    options.type = SkipTypes.HtmlSkip;
    return Tools.markupLatex(text, inline);
};

var convertUrl = function(info, text, matchs, matche, options) {
    if (!text)
        return Promise.resolve("");
    options.type = SkipTypes.HtmlSkip;
    if (info.isIn(matchs.index, matchs[0].length, SkipTypes.HtmlSkip))
        return Promise.resolve(text);
    var href = text;
    if (href.lastIndexOf("http", 0) && href.lastIndexOf("ftp", 0))
        href = "http://" + href;
    var def = "<a href=\"" + href + "\">" + Tools.toHtml(text) + "</a>"
    if (matchTwitterLink(href))
        return getTwitterEmbeddedHtml(href, def);
    if (matchYoutubeLink(href))
        return getYoutubeEmbeddedHtml(href, def);
    if (matchCoubLink(href))
        return getCoubEmbeddedHtml(href, def);
    return Promise.resolve(def);
};

var convertCSpoiler = function(_, text, matchs, _, options) {
    var title = matchs[1];
    if (!title)
        title = "Spoiler";
    options.type = SkipTypes.NoSkip;
    options.op = "<span class=\"cspoiler\"><span class=\"cspoilerTitle\" title=\"Spoiler\" "
        + "onclick=\"lord.expandCollapseSpoiler(this);\">" + title
        + "</span><span class=\"cspoilerBody\" style=\"display: none;\">";
    options.cl = "</span></span>";
    return Promise.resolve(text);
};

var convertTooltip = function(_, text, matchs, _, options) {
    var tooltip = matchs[1];
    options.type = SkipTypes.NoSkip;
    options.op = "<span class=\"tooltip\" title=\"" + tooltip + "\">";
    options.cl = "</span>";
    return Promise.resolve(text);
};

var convertUnorderedList = function(_, text, matchs, _, options) {
    var t = matchs[2];
    if (!t)
        t = "disc";
    else if (t.length == 1)
        t = ListTypes[t];
    if (!t)
        return Promise.resolve("");
    options.type = SkipTypes.NoSkip;
    options.op = `<ul type="${t}">`;
    options.cl = "</ul>";
    return Promise.resolve(text);
};

var convertOrderedList = function(_, text, matchs, _, options) {
    var t = matchs[2];
    if (!t)
        t = "1";
    options.type = SkipTypes.NoSkip;
    options.op = `<ol type="${t}">`;
    options.cl = "</ol>";
    return Promise.resolve(text);
};

var convertListItem = function(_, text, matchs, _, options) {
    options.type = SkipTypes.NoSkip;
    options.op = "<li";
    if (matchs[2])
        op += " value=\"" + matchs[2] + "\"";
    options.op += ">";
    options.cl = "</li>";
    return Promise.resolve(text);
};

var convertCitation = function(_, text, matchs, matche, options) {
    options.type = SkipTypes.NoSkip;
    if (matchs[1] == "\n")
        options.op = "<br />";
    options.op += "<span class=\"quotation\">&gt;";
    options.cl = "</span>";
    if (matche[0] == "\n")
        options.cl += "<br />";
    return Promise.resolve(text);
};

var processPostText = function(boardName, text, options) {
    if (!text)
        return Promise.resolve(null);
    var deletedPost = (options && +(options.deletedPost) > 0) ? options.deletedPost : 0;
    var markupModes = (options && options.markupModes) ? options.markupModes : [
        MarkupModes.ExtendedWakabaMark,
        MarkupModes.BBCode
    ];
    var accessLevel = (options && options.accessLevel) || null;
    var c = {};
    var langs = [];
    Highlight.listLanguages().forEach(function(lang) {
        langs.push(lang);
        var aliases = Highlight.getLanguage(lang).aliases;
        if (aliases) {
            aliases.forEach(function(alias) {
                langs.push(alias);
            });
        }
    });
    langs.splice(langs.indexOf("cpp") + 1, 0, "c++");
    langs.splice(langs.indexOf("cs") + 1, 0, "c#");
    langs.splice(langs.indexOf("fsharp") + 1, 0, "f#");
    langs = langs.join("|").split("+").join("\\+").split("-").join("\\-").split(".").join("\\.");
    text = text.replace(/\r+\n/g, "\n").replace(/\r/g, "\n");
    var info = new ProcessingInfo(text, boardName, options ? options.referencedPosts : null, deletedPost,
        options ? options.referencesToReplace : null);
    var p = Promise.resolve();
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0) {
        p = p.then(function() {
            return process(info, convertMonospace, { op: "``" }, { escapable: true });
        }).then(function() {
            return process(info, convertNomarkup, { op: "''" }, { escapable: true });
        }).then(function() {
            return process(info, convertPre, {
                op: /\/\\-\\-pre\s+/g,
                cl: /\s+\\\\\\-\\-/g
            });
        }).then(function() {
            return process(info, convertCode, {
                op: new RegExp("/\\-\\-code\\s+(" + langs + ")\\s+", "gi"),
                cl: /\s+\\\\\\-\\-/g
            });
        });
    }
    if (markupModes.indexOf(MarkupModes.BBCode) >= 0) {
        if (Database.compareRegisteredUserLevels(accessLevel, Database.RegisteredUserLevels.Moder) >= 0) {
            p = p.then(function() {
                return process(info, convertHtml, {
                    op: "[raw-html]",
                    cl: "[/raw-html]"
                });
            });
        }
        p = p.then(function() {
            return process(info, convertPre, {
                op: "[pre]",
                cl:"[/pre]"
            });
        }).then(function() {
            return process(info, convertCode, {
                op: "[code]",
                cl: "[/code]"
            });
        }).then(function() {
            return process(info, convertCode, {
                op: new RegExp("\\[code\\s+lang\\=\"?(" + langs + ")\"?\\s*\\]", "gi"),
                cl: "[/code]"
            });
        }).then(function() {
            return process(info, convertCode, {
                op: new RegExp("\\[(" + langs + ")\\]", "gi"),
                cl: new RegExp("\\[/(" + langs + ")\\]", "gi")
            }, { checkFunction: checkLangsMatch });
        }).then(function() {
            return process(info, convertMonospace, {
                op: "[m]",
                cl: "[/m]"
            });
        }).then(function() {
            return process(info, convertNomarkup, {
                op: "[n]",
                cl: "[/n]"
            });
        }).then(function() {
            return process(info, convertLatex.bind(null, false), {
                op: "[latex]",
                cl: "[/latex]"
            });
        }).then(function() {
            return process(info, convertLatex.bind(null, true), {
                op: "[l]",
                cl: "[/l]"
            });
        });
    }
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0 || markupModes.indexOf(MarkupModes.BBCode) >= 0) {
        p = p.then(function() {
            if (!config("site.vkontakte.integrationEnabled", false))
                return Promise.resolve();
            return process(info, convertVkontaktePost, {
                op: /<div id\="vk_post_\-?\d+_\d+"><\/div><script type="text\/javascript">  \(function\(d\, s\, id\) \{ var js\, fjs \= d\.getElementsByTagName\(s\)\[0\]; if \(d\.getElementById\(id\)\) return; js \= d\.createElement\(s\); js\.id \= id; js\.src \= "\/\/vk\.com\/js\/api\/openapi\.js\?121"; fjs\.parentNode\.insertBefore\(js\, fjs\); \}\(document\, 'script'\, 'vk_openapi_js'\)\);  \(function\(\) \{    if \(\!window\.VK \|\| \!VK\.Widgets \|\| \!VK\.Widgets\.Post \|\| \!VK\.Widgets\.Post\("vk_post_\-?\d+_\d+"\, (\-?\d+)\, (\d+)\, '([a-zA-Z0-9_\-]+)'\, \{width\: 500\}\)\) setTimeout\(arguments\.callee\, 50\);  \}\(\)\);<\/script>/g,
                cl: null
            });
        }).then(function() {
            return process(info, convertUrl, {
                op: "[url]",
                cl: "[/url]"
            });
        }).then(function() {
            return process(info, convertExternalLink, {
                op: new XRegExp(Tools.ExternalLinkRegexpPattern, "gi"),
                cl: null
            }, { checkFunction: checkExternalLink });
        }).then(function() {
            return process(info, convertProtocol, {
                op: /(mailto|irc|news):(\S+)/gi,
                cl: null
            });
        }).then(function() {
            return processStrikedOutShitty(info);
        }).then(function() {
            return processStrikedOutShittyWord(info);
        }).then(function() {
            return process(info, convertTooltipShitty, {
                op: /([^\?\s]+)\?{3}"([^"]+)"/gi,
                cl: null
            });
        }).then(function() {
            return process(info, convertPostLink, {
                op: />>([1-9][0-9]*)/gi,
                cl: null
            });
        }).then(function() {
            var boards = Board.boardNames().join("|");
            return process(info, convertPostLink, {
                op: new RegExp(">>/(" + boards + ")/([1-9][0-9]*)", "gi"),
                cl: null
            });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "----",
                cl: null
            });
        });
    }
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0) {
        p = p.then(function() {
            return process(info, convertMarkup, { op: "---" });
        });
    }
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0 || markupModes.indexOf(MarkupModes.BBCode) >= 0) {
        p = p.then(function() {
            return process(info, convertMarkup, {
                op: "--",
                cl: null
            });
        });
    }
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0) {
        p = p.then(function() {
            return process(info, convertMarkup, { op: "***" });
        }).then(function() {
            return process(info, convertMarkup, { op: "**" });
        }).then(function() {
            return process(info, convertMarkup, { op: "*" });
        }).then(function() {
            return process(info, convertMarkup, { op: "___" });
        }).then(function() {
            return process(info, convertMarkup, { op: "__" });
        }).then(function() {
            return process(info, convertMarkup, { op: "_" });
        }).then(function() {
            return process(info, convertMarkup, { op: "///" });
        }).then(function() {
            return process(info, convertCSpoiler, { op: "%%%" });
        }).then(function() {
            return process(info, convertMarkup, { op: "%%" });
        }).then(function() {
            return process(info, convertLatex.bind(null, false), { op: "$$$" });
        }).then(function() {
            return process(info, convertLatex.bind(null, true), { op: "$$" });
        });
    }
    if (markupModes.indexOf(MarkupModes.BBCode) >= 0) {
        p = p.then(function() {
            return process(info, convertMarkup, {
                op: "[b]",
                cl: "[/b]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[i]",
                cl: "[/i]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[s]",
                cl: "[/s]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[u]",
                cl: "[/u]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[sub]",
                cl: "[/sub]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[sup]",
                cl: "[/sup]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[spoiler]",
                cl: "[/spoiler]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertCSpoiler, {
                op: "[cspoiler]",
                cl: "[/cspoiler]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertCSpoiler, {
                op: /\[cspoiler\s+title\="([^"]*)"\s*\]/gi,
                cl: "[/cspoiler]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertTooltip, {
                op: /\[tooltip\s+value\="([^"]*)"\s*\]/gi,
                cl: "[/tooltip]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertUnorderedList, {
                op: /\[ul(\s+type\="?(disc|circle|square|d|c|s)"?)?\s*\]/gi,
                cl: "[/ul]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertOrderedList, {
                op: /\[ol(\s+type\="?(A|a|I|i|1)"?)?\s*\]/gi,
                cl: "[/ol]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertListItem, {
                op: /\[li(\s+value\="?(\d+)"?\s*)?\]/gi,
                cl: "[/li]"
            }, { nestable: true });
        });
    }
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0 || markupModes.indexOf(MarkupModes.BBCode) >= 0) {
        p = p.then(function() {
            return process(info, convertCitation, {
                op: ">",
                cl: /\n|$/gi
            }, { checkFunction: checkQuotationNotInterrupted });
        });
    }
    return p.then(function() {
        return info.toHtml();
    });
};

Object.defineProperty(processPostText, "MarkupModes", { value: MarkupModes });

module.exports = processPostText;
