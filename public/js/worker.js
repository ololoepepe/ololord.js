/*ololord global object*/

var lord = lord || {};

/*Constants*/

//TODO: Individual argument regexp
lord.TokenTypes = [{
    "name": "all"
}, {
    "name": "words",
    "args": true
}, {
    "name": "op"
}, {
    "name": "wipe",
    "args": true
}, {
    "name": "subj",
    "args": "opt"
}, {
    "name": "name",
    "args": "opt"
}, {
    "name": "trip",
    "args": "opt"
}, {
    "name": "sage",
    "args": false
}, {
    "name": "tlen",
    "args": "opt"
}, {
    "name": "num",
    "args": true
}, {
    "name": "img",
    "args": "opt"
}, {
    "name": "imgn",
    "args": true
}, {
    "name": "ihash",
    "args": true
}, {
    "name": "exp",
    "args": true
}, {
    "name": "exph",
    "args": true
}, {
    "name": "video",
    "args": "opt"
}, {
    "name": "vauthor",
    "args": true
}, {
    "name": "rep",
    "args": true
}];

/*Functions*/

lord.getYoutubeVideoInfo = function(href, apiKey) {
    if (!href || !apiKey)
        return null;
    if (href.replace("v=", "") == href)
        return null;
    var videoId = href.split("v=").pop().match(/[a-zA-Z0-9_\-]{11}/)[0];
    if (!videoId)
        return null;
    var xhr = new XMLHttpRequest();
    var url = "https://www.googleapis.com/youtube/v3/videos?id=" + videoId + "&key=" + apiKey + "&part=snippet";
    xhr.open("get", url, false);
    xhr.send(null);
    if (xhr.status != 200)
        return null;
    var response = null;
    try {
        response = JSON.parse(xhr.responseText);
    } catch (ex) {
        return null;
    }
    var info = response.items[0].snippet;
    info.id = videoId;
    return info;
};

lord.getCoubVideoInfo = function(href) {
    if (!href)
        return null;
    var videoId = href.match(/^http:\/\/coub\.com\/view\/([^\/\?]+)?/)[1];
    if (!videoId)
        return null;
    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open("post", "../api", false);
    xhr.setRequestHeader("Content-Type", "application/json");
    var request = {
        "method": "get_coub_video_info",
        "params": [videoId],
        "id": lord.RpcGetCoubVideoInfoId
    };
    xhr.send(JSON.stringify(request));
    if (xhr.status != 200)
        return null;
    var response = null;
    try {
        response = JSON.parse(xhr.responseText);
    } catch (ex) {
        return null;
    }
    if (!response.result)
        return null;
    response = response.result;
    var info = {
        "videoTitle": response.title,
        "authorName": response.author_name,
        "thumbnail": response.thumbnail_url ? {
            "url": response.thumbnail_url,
            "width": response.thumbnail_width,
            "height": response.thumbnail_height
        } : null
    };
    info["id"] = videoId;
    return info;
};

lord.parseSpells = function(text) {
    if (typeof text != "string")
        return { "error:": { "text": "internalErrorText" } };
    var skipSpaces = function(text) {
        var first = text.search(/\S/);
        if (first < 0)
            return "";
        pos += first;
        return text.slice(first);
    };
    var nextToken = function(text) {
        if (text.search(/[&\|\!\(\)]/) == 0) { //Special tokens
            pos += 1;
            return {
                "text": text.slice(1),
                "token": {
                    "name": text.substr(0, 1),
                    "terminal": true,
                    "type": "other"
                }
            };
        }
        for (var i = 0; i < lord.TokenTypes.length; ++i) {
            var TokenType = lord.TokenTypes[i];
            var pattern = "^\\#" + TokenType.name + "(\\[(\\w+)(\\,(\\d+))?\\])?";
            if ("opt" == TokenType.args)
                pattern += "\\(((\\\\\\)|[^\\)])*?)\\)";
            else if (TokenType.args)
                pattern += "\\(((\\\\\\)|[^\\)])+?)\\)";
            var rx = new RegExp(pattern);
            if (0 != text.search(rx))
                continue;
            var m = text.match(rx);
            var len = m[0].length;
            var token = {
                "name": TokenType.name,
                "terminal": true,
                "type": "spell"
            };
            if (m[2])
                token.board = m[2];
            if (m[4])
                token.thread = m[4];
            if (m[5])
                token.args = m[5];
            pos += len;
            return {
                "text": text.slice(len),
                "token": token
            };
        }
        return { "text": "" };
    };
    var pos = 0;
    var tokens = [];
    var stack = [];
    var states = [0];
    var r = {
        0: function() {
            var ntoken = { "name": "Program" };
            return ntoken;
        },
        1: function() {
            var ntoken = stack.pop();
            var spell = stack.pop();
            if (!ntoken.spells)
                ntoken.spells = [];
            ntoken.spells.unshift(spell);
            states.pop();
            states.pop();
            return ntoken;
        },
        2: function() {
            var ntoken = { "name": "Spell" };
            var value = stack.pop();
            ntoken.value = {
                "type": "rep",
                "value": value
            };
            states.pop();
            return ntoken;
        },
        3: function() {
            var ntoken = { "name": "Spell" };
            var expr3 = stack.pop();
            ntoken.value = expr3.value; //Optimisation
            states.pop();
            return ntoken;
        },
        4: function() {
            var ntoken = { "name": "Expr3" };
            var expr2 = stack.pop();
            ntoken.value = expr2.value; //Optimisation
            states.pop();
            return ntoken;
        },
        5: function() {
            var ntoken = { "name": "Expr3" };
            var expr3 = stack.pop();
            stack.pop();
            var expr2 = stack.pop();
            ntoken.value = {
                "type": "|",
                "value": [expr2]
            };
            if ("|" == expr3.value.type) { //Optimisation
                expr3.value.value.forEach(function(v) {
                    ntoken.value.value.push(v);
                });
            } else {
                ntoken.value.value.push(expr3);
            }
            states.pop();
            states.pop();
            states.pop();
            return ntoken;
        },
        6: function() {
            var ntoken = { "name": "Expr2" };
            var expr1 = stack.pop();
            ntoken.value = expr1.value; //Optimisation
            states.pop();
            return ntoken;
        },
        7: function() {
            var ntoken = { "name": "Expr2" };
            var expr3 = stack.pop();
            stack.pop();
            var expr1 = stack.pop();
            ntoken.value = {
                "type": "&",
                "value": [expr1]
            };
            if ("&" == expr3.value.type) { //Optimisation
                expr3.value.value.forEach(function(v) {
                    ntoken.value.value.push(v);
                });
            } else {
                ntoken.value.value.push(expr3);
            }
            states.pop();
            states.pop();
            states.pop();
            return ntoken;
        },
        8: function() {
            var ntoken = { "name": "Expr1" };
            stack.pop();
            var expr3 = stack.pop();
            stack.pop();
            ntoken.value = expr3.value; //Optimisation
            states.pop();
            states.pop();
            states.pop();
            return ntoken;
        },
        9: function() {
            var ntoken = { "name": "Expr1" };
            var SPELL = stack.pop();
            ntoken.value = {
                "type": "SPELL",
                "value": SPELL
            };
            states.pop();
            return ntoken;
        },
        10: function() {
            var ntoken = { "name": "Expr1" };
            var spell = stack.pop();
            stack.pop();
            ntoken.value = {
                "type": "!",
                "value": spell
            };
            states.pop();
            states.pop();
            return ntoken;
        }
    };
    var table = {
        "rep": { 0: 2, 1: 2, 2: r[2], 3: r[3], 4: r[4], 5: r[6], 7: r[9], 9: r[1], 11: r[5], 13: r[7], 15: r[10], 16: r[8] },
        "|": { 1: r[0], 2: r[2], 3: r[3], 4: 10, 5: r[6], 7: r[9], 9: r[1], 11: r[5], 13: r[7], 15: r[10], 16: r[8] },
        "&": { 1: r[0], 2: r[2], 3: r[3], 4: r[4], 5: 12, 7: r[9], 9: r[1], 11: r[5], 13: r[7], 15: r[10], 16: r[8] },
        "(": { 0: 6, 1: 6, 2: r[2], 3: r[3], 4: r[4], 5: r[6], 6: 6, 7: r[9], 9: r[1], 10: 6, 11: r[5], 12: 6, 13: r[7], 15: r[10], 16: r[8] },
        ")": { 1: r[0], 2: r[2], 3: r[3], 4: r[4], 5: r[6], 7: r[9], 9: r[1], 11: r[5], 13: r[7], 14: 16, 15: r[10], 16: r[8] },
        "SPELL": { 0: 7, 1: 7, 2: r[2], 3: r[3], 4: r[4], 5: r[6], 6: 7, 7: r[9], 8: 15, 9: r[1], 10: 7, 11: r[5], 12: 7, 13: r[7], 15: r[10], 16: r[8] },
        "!": { 0: 8, 1: 8, 2: r[2], 3: r[3], 4: r[4], 5: r[6], 6: 8, 7: r[9], 9: r[1], 10: 8, 11: r[5], 12: 8, 13: r[7], 15: r[10], 16: r[8] },
        "EOF": { 1: r[0], 2: r[2], 3: r[3], 4: r[4], 5: r[6], 7: r[9], 9: r[1], 11: r[5], 13: r[7], 15: r[10], 16: r[8] },
        "Program": { 1: 9 },
        "Spell": { 0: 1, 1: 1 },
        "Expr3": { 0: 3, 1: 3, 6: 14, 10: 11, 12: 13 },
        "Expr2": { 0: 4, 1: 4, 6: 4, 10: 4, 12: 4 },
        "Expr1": { 0: 5, 1: 5, 6: 5, 10: 5, 12: 5 }
    };
    while (text.length > 0) {
        var token = nextToken(skipSpaces(text));
        text = token.text;
        if (token.token)
            tokens.push(token.token);
    }
    tokens.push({
        "name": "EOF",
        "terminal": true,
        "type": "EOF"
    });
    if (tokens.length < 1 || "EOF" == tokens[0].name)
        return { "root": { "name": "program" } };
    var i = 0;
    while (true) {
        if (tokens.length == i)
            return { "error": { "text": "unexpectedEndOfTokenListErrorText" } };
        var token = tokens[i];
        var name = ("spell" == token.type) ? "SPELL" : token.name;
        var x = table[name];
        if (!x)
            return { "error": { "text": "noTokenInTableErrorText", "data": name } };
        var f = x[lord.last(states)];
        if (!f)
            return { "error": { "text": "noTokenInTableErrorText", "data": name } };
        if (typeof f == "function") {
            var ntoken = f();
            if (!ntoken)
                return { "error": { "text": "internalErrorText" } };
            if ("Program" == ntoken.name && stack.length < 1)
                return { "root": ntoken };
            x = table[ntoken.name];
            if (!x)
                return { "error": { "text": "noTokenInTableErrorText", "data": name } };
            f = x[lord.last(states)];
            if (!f)
                return { "error": { "text": "noTokenInTableErrorText", "data": name } };
            stack.push(ntoken);
            states.push(f);
        } else {
            stack.push(token);
            states.push(f);
            ++i;
        }
    }
};

lord.inRanges = function(ranges, val, pred) {
    if (!ranges || typeof ranges != "string")
        return false;
    val = +val;
    if (isNaN(val))
        return false;
    if (!pred) {
        pred = function(x, y) {
            return x == y;
        };
    }
    ranges = ranges.split(",");
    for (var i = 0; i < ranges.length; ++i) {
        if (ranges[i] == "")
            return false;
        var range = ranges[i].split("-");
        if (range.length > 2)
            return false;
        if (range.length == 1 && pred(val, +range[0]))
            return true;
        return (val >= +range[0] && val <= +range[1]) || (pred(val, +range[0]) && pred(val, +range[1]));
    }
    return false;
};

lord.spell_words = function(post, args) {
    if (!post || !args || !post.text)
        return null;
    if (post.text.toLowerCase().indexOf(args.toLowerCase()) >= 0)
        return { "hidden": true };
    return null;
};

lord.spell_all = function() {
    return { "hidden": true };
};

lord.spell_op = function(post) {
    if (post && post.isOp)
        return { "hidden": true };
    return null;
};

lord.spell_wipe = function(post, args) {
    if (!post || !args || !post.text)
        return null;
    var text = post.text;
    var list = args.split(",");
    for (var i = 0; i < list.length; ++i) {
        var a = list[i];
        switch (a) {
        case "samelines": {
            var lines = text.replace(/>/g, "").split(/\s*\n\s*/);
            if (lines.length > 5) {
                lines.sort();
                var len = lines.length;
                for (var i = 0, n = len / 4; i < len;) {
                    var line = lines[i];
                    var j = 0;
                    while (lines[i++] === line)
                        ++j;
                    if (j > 4 && j > n && line)
                        return { "hidden": true };
                }
            }
            break;
        }
        case "samewords": {
            var words = text.replace(/[\s\.\?\!,>]+/g, " ").toUpperCase().split(" ");
            if (words.length > 3) {
                words.sort();
                var keys = 0;
                for (var i = 0, n = len / 4, pop = 0; i < words.length; keys++) {
                    var word = words[i];
                    var j = 0;
                    while (words[i++] === word)
                        ++j;
                    if (words.length > 25) {
                        if (j > pop && word.length > 2)
                            pop = j;
                         if (pop >= n)
                            return { "hidden": true };
                    }
                }
                if ((keys / len) < 0.25)
                    return { "hidden": true };
            }
            break;
        }
        case "longwords": {
            var words = text.replace(/https*:\/\/.*?(\s|$)/g, "").replace(/[\s\.\?!,>:;-]+/g, " ").split(" ");
            if (words[0].length > 50 || words.length > 1 && (words.join("").length / words.length) > 10)
                return { "hidden": true };
            break;
        }
        case "symbols": {
            var txt = text.replace(/\s+/g, "");
            if (txt.length > 30 && (txt.replace(/[0-9a-zа-я\.\?!,]/ig, "").length / txt.length) > 0.4)
                return { "hidden": true };
            break;
        }
        case "capslock": {
            var words = text.replace(/[\s\.\?!;,-]+/g, " ").trim().split(" ");
            if (words.length > 4) {
                var n = 0;
                var capsw = 0;
                var casew = 0;
                for (var i = 0; i < words.length; i++) {
                    var word = words[i];
                    if ((word.match(/[a-zа-я]/ig) || []).length < 5)
                        continue;
                    if ((word.match(/[A-ZА-Я]/g) || []).length > 2)
                        casew++;
                    if (word === word.toUpperCase())
                        capsw++;
                    n++;
                }
                if ((capsw / n >= 0.3) && n > 4)
                    return { "hidden": true };
                else if ((casew / n) >= 0.3 && n > 8)
                    return { "hidden": true };
            }
            break;
        }
        case "numbers": {
            var txt = text.replace(/\s+/g, " ").replace(/>>\d+|https*:\/\/.*?(?: |$)/g, "");
            if (txt.length > 30 && (txt.length - txt.replace(/\d/g, "").length) / words.length > 0.4)
                return { "hidden": true };
            break;
        }
        case "whitespace": {
            if (/(?:\n\s*){10}/i.test(text))
                return { "hidden": true };
            break;
        }
        default: {
            break;
        }
        }
    }
    return null;
};

lord.spell_subj = function(post, args) {
    if (!post || !post.subject)
        return null;
    if (args) {
        var rx = lord.regexp(args);
        if (!rx)
            return null;
        if (post.subject.search(rx) >= 0)
            return { "hidden": true };
    } else if (!post.isDefaultSubject) {
        return { "hidden": true };
    }
    return null;
};

lord.spell_name = function(post, args) {
    if (!post || !post.name)
        return null;
    if ((args && post.userName.toLowerCase().indexOf(args.toLowerCase()) >= 0) || !post.isDefaultUserName)
        return { "hidden": true };
    return null;
};

lord.spell_trip = function(post, args) {
    if (!post || !post.tripcode)
        return null;
    if (!args || post.tripcode.toLowerCase().indexOf(args.toLowerCase()) >= 0)
        return { "hidden": true };
    return null;
};

lord.spell_sage = function(post) {
    if (!post || !post.mailto)
        return null;
    if (post.mailto.toLowerCase() == "mailto:sage")
        return { "hidden": true };
    return null;
};

lord.spell_tlen = function(post, args) {
    if (!post || !post.text)
        return null;
    if (!args) {
        if (post.text.length > 0)
            return { "hidden": true };
    } else if (lord.inRanges(args, post.text.length)) {
        return { "hidden": true };
    }
    return null;
};

lord.spell_num = function(post, args) {
    if (!post || !args)
        return null;
    if (lord.inRanges(args, post.number))
        return { "hidden": true };
    return null;
};

lord.spell_img = function(post, args) {
    if (!post || !post.files)
        return null;
    if (args) {
        var m = args.match(/^(>|<|\=)?([\d\.\,\-]+)?(@([\d\,\-]+)x([\d\,\-]+))?$/);
        if (!m)
            return null;
        var sizes = m[2];
        var widths = m[4];
        var heights = m[5];
        if (!sizes && !widths && !heights)
            return null;
        var pred = function(x, y) {
            return x == y;
        };
        if (m[1]) {
            if (m[1] == ">") {
                pred = function(x, y) {
                    return x > y;
                };
            } else if (m[1] == "<") {
                pred = function(x, y) {
                    return x < y;
                };
            }
        }
        for (var i = 0; i < post.files.length; ++i) {
            var f = post.files[i];
            if ((sizes && lord.inRanges(sizes, f.size, pred)) || (widths && lord.inRanges(widths, f.width, pred))
                || (heights && lord.inRanges(heights, f.height, pred))) {
                return { "hidden": true };
            }
        }
    } else if (post.files.length > 0) {
        return { "hidden": true };
    }
    return null;
};

lord.spell_imgn = function(post, args) {
    if (!post || !args || !post.files)
        return null;
    var rx = lord.regexp(args);
    if (!rx)
        return null;
    for (var i = 0; i < post.files.length; ++i) {
        var f = post.files[i];
        if (f.sizeText.search(rx) >= 0)
            return { "hidden": true };
    }
    return null;
};

lord.spell_ihash = function(post, args) {
    if (!post || !args || !args.match(/^\d+$/) || !post.files)
        return null;
    for (var i = 0; i < post.files.length; ++i) {
        var f = post.files[i];
        if (!f || !f.thumb)
            continue;
        var data = lord.base64ToArrayBuffer(f.thumb.base64Data);
        if (lord.generateImageHash(data, f.thumb.width, f.thumb.height) == args)
            return { "hidden": true };
    }
    return null;
};

lord.spell_exp = function(post, args) {
    if (!post || !args || !post.text)
        return null;
    var rx = lord.regexp(args);
    if (!rx)
        return null;
    if (post.text.search(rx) >= 0)
        return { "hidden": true };
    return null;
};

lord.spell_exph = function(post, args) {
    if (!post || !args || !post.textHTML)
        return null;
    var rx = lord.regexp(args);
    if (!rx)
        return null;
    if (post.textHTML.search(rx) >= 0)
        return { "hidden": true };
    return null;
};

lord.spell_video = function(post, args, youtube) {
    if (!post)
        return null;
    if (args) {
        if (!youtube || youtube.length < 1)
            return null;
        var rx = lord.regexp(args);
        if (!rx)
            return null;
        for (var i = 0; i < youtube.length; ++i) {
            var video = youtube[i];
            if (video.videoTitle && video.videoTitle.search(rx) >= 0)
                return { "hidden": true };
        }
        return null;
    } else if (youtube && youtube.length > 0) {
        return { "hidden": true };
    }
    return null;
};

lord.spell_vauthor = function(post, args, youtube) {
    if (!post || !args || !youtube)
        return null;
    for (var i = 0; i < youtube.length; ++i) {
        var video = youtube[i];
        if (video && video.channelTitle && video.channelTitle == args)
            return { "hidden": true };
    }
    return null;
};

lord.spell_rep = function(post, args) {
    if (!post || !args || !post.innerHTML)
        return null;
    var m = args.match("/((\\\\/|[^/])+?)/(i(gm?|mg?)?|g(im?|mi?)?|m(ig?|gi?)?)?\\,(.*)");
    if (!m)
        return null;
    var s = lord.last(m) || "";
    var nih = post.innerHTML.replace(new RegExp(m[1], m[3]), s);
    if (post.innerHTML == nih)
        return null;
    return { "replacements": [ { "innerHTML": nih } ] };
};

lord.applySpell = function(post, spell, youtube) {
    if (!post || !spell)
        return null;
    switch (spell.type) {
    case "SPELL":
        return lord.applySpell(post, spell.value, youtube);
    case "spell":
        if (spell.board && post.board != spell.board)
            return null;
        if (spell.thread && post.thread != spell.thread)
            return null;
        return lord["spell_" + spell.name](post, spell.args, youtube);
    case "|":
        for (var i = 0; i < spell.value.length; ++i) {
            var result = lord.applySpell(post, spell.value[i].value, youtube);
            if (result && result.hidden)
                return result;
        }
        return null;
    case "&":
        var result = null;
        for (var i = 0; i < spell.value.length; ++i) {
            result = lord.applySpell(post, spell.value[i].value);
            if (!result || !result.hidden)
                return null;
        }
        return result;
    case "!":
        var result = lord.applySpell(post, spell.value);
        return { "hidden": (!result || !hidden) };
    default:
        break;
    }
    return null;
};

lord.applyYouTube = function(post, apiKey) {
    if (!post || !post.youtube || post.youtube.length < 1 || !apiKey)
        return null;
    var videos = null;
    post.youtube.forEach(function(href) {
        var info = lord.getYoutubeVideoInfo(href, apiKey);
        if (!info)
            return;
        if (!videos)
            videos = {};
        videos[href] = {
            "id": info.id,
            "videoTitle": info.title,
            "channelTitle": info.channelTitle
        };
        if (info.thumbnails.medium)
            videos[href].thumbnail = info.thumbnails.medium;
    });
    return videos;
};

lord.applyCoub = function(post) {
    if (!post || !post.coub || post.coub.length < 1)
        return null;
    var videos = null;
    post.coub.forEach(function(href) {
        var info = lord.getCoubVideoInfo(href);
        if (!info)
            return;
        if (!videos)
            videos = {};
        videos[href] = {
            "id": info.id,
            "videoTitle": info.videoTitle,
            "authorName": info.authorName
        };
        if (info.thumbnail)
            videos[href].thumbnail = info.thumbnail;
    });
    return videos;
};

lord.applySpells = function(post, spells, youtube) {
    if (!post || !spells || spells.length < 1)
        return null;
    var npost = {
        "replacements": []
    };
    spells.forEach(function(spell) {
        if (npost.hidden && ("SPELL" != spell.value.type || "rep" != spell.value.value.name))
            return;
        var result = lord.applySpell(post, spell.value, youtube);
        if (!result)
            return;
        npost.hidden = result.hidden;
        if (result.replacements)
            npost.replacements = npost.replacements.concat(result.replacements);
    });
    return npost;
};

lord.processPosts = function(posts, spells, youtube) {
    if (!posts)
        return { "error": { "text": "internalErrorText" } };
    var processed = [];
    lord.arr(posts).forEach(function(post) {
        var npost = {
            "board": post.board,
            "number": post.number
        };
        if (youtube && youtube.apiKey) {
            npost.youtube = lord.applyYouTube(post, youtube.apiKey);
            npost.coub = lord.applyCoub(post);
        }
        if (spells && !post.hidden) {
            var result = lord.applySpells(post, spells, npost.youtube);
            if (result) {
                npost.hidden = result.hidden;
                npost.replacements = result.replacements;
            }
        }
        processed.push(npost);
    });
    return { "posts": processed };
};

lord.message_parseSpells = function(data) {
    if (!data || typeof data != "string")
        return;
    return lord.parseSpells(data);
};

lord.message_parseSpells.type = "spellsParsed";

lord.message_processPosts = function(data) {
    if (!data)
        return;
    return lord.processPosts(data.posts, data.spells, data.youtube);
};

lord.message_processPosts.type = "postsProcessed";

importScripts("api.js");

onmessage = function(msg) {
    if (!msg || !msg.data)
        return;
    msg = msg.data;
    if (!msg.type)
        return;
    var f = lord["message_" + msg.type];
    if (!f || !f.type)
        return;
    var result = f(msg.data);
    if (!result)
        return;
    postMessage({
        "type": f.type,
        "data": result
    });
};
