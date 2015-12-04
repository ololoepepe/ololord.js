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

lord.getImageHash = function(url, width, height) {
    width = +width;
    height = +height;
    if (!url || isNaN(width) || width <= 0 || isNaN(height) || height < 0)
        return Promise.resolve(null);
    var xhr = new XMLHttpRequest();
    xhr.open("get", url, true);
    xhr.responseType = "arraybuffer";
    return new Promise(function(resolve, reject) {
        xhr.onreadystatechange = function() {
            if (xhr.readyState != 4)
                return;
            if (xhr.status != 200)
                return resolve(null);
            var response = xhr.response;
            if (!response)
                return resolve(null);
            resolve(lord.generateImageHash(response, width, height));
        };
        xhr.send(null);
    });
};

lord.parseSpells = function(text) {
    if (typeof text != "string")
        return Promise.reject("Internal error");
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
        return Promise.resolve({ "root": { "name": "program" } });
    var i = 0;
    while (true) {
        if (tokens.length == i)
            return Promise.reject("unexpectedEndOfTokenListErrorText");
        var token = tokens[i];
        var name = ("spell" == token.type) ? "SPELL" : token.name;
        var x = table[name];
        if (!x)
            return Promise.reject("noTokenInTableErrorText"); //, "data": name
        var f = x[lord.last(states)];
        if (!f)
            return Promise.reject("noTokenInTableErrorText"); //, "data": name
        if (typeof f == "function") {
            var ntoken = f();
            if (!ntoken)
                return Promise.reject("internalErrorText");
            if ("Program" == ntoken.name && stack.length < 1)
                return Promise.resolve({ "root": ntoken });
            x = table[ntoken.name];
            if (!x)
                return Promise.reject("noTokenInTableErrorText"); //, "data": name
            f = x[lord.last(states)];
            if (!f)
                return Promise.reject("noTokenInTableErrorText"); //, "data": name
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
        return Promise.resolve(null);
    if (post.text.toLowerCase().indexOf(args.toLowerCase()) >= 0)
        return Promise.resolve({ "hidden": true });
    return Promise.resolve(null);
};

lord.spell_all = function() {
    return Promise.resolve({ "hidden": true });
};

lord.spell_op = function(post) {
    if (post && post.isOp)
        return Promise.resolve({ "hidden": true });
    return Promise.resolve(null);
};

lord.spell_wipe = function(post, args) {
    if (!post || !args || !post.text)
        return Promise.resolve(null);
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
                        return Promise.resolve({ "hidden": true });
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
                            return Promise.resolve({ "hidden": true });
                    }
                }
                if ((keys / len) < 0.25)
                    return Promise.resolve({ "hidden": true });
            }
            break;
        }
        case "longwords": {
            var words = text.replace(/https*:\/\/.*?(\s|$)/g, "").replace(/[\s\.\?!,>:;-]+/g, " ").split(" ");
            if (words[0].length > 50 || words.length > 1 && (words.join("").length / words.length) > 10)
                return Promise.resolve({ "hidden": true });
            break;
        }
        case "symbols": {
            var txt = text.replace(/\s+/g, "");
            if (txt.length > 30 && (txt.replace(/[0-9a-zа-я\.\?!,]/ig, "").length / txt.length) > 0.4)
                return Promise.resolve({ "hidden": true });
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
                    return Promise.resolve({ "hidden": true });
                else if ((casew / n) >= 0.3 && n > 8)
                    return Promise.resolve({ "hidden": true });
            }
            break;
        }
        case "numbers": {
            var txt = text.replace(/\s+/g, " ").replace(/>>\d+|https*:\/\/.*?(?: |$)/g, "");
            if (txt.length > 30 && (txt.length - txt.replace(/\d/g, "").length) / words.length > 0.4)
                return Promise.resolve({ "hidden": true });
            break;
        }
        case "whitespace": {
            if (/(?:\n\s*){10}/i.test(text))
                return Promise.resolve({ "hidden": true });
            break;
        }
        default: {
            break;
        }
        }
    }
    return Promise.resolve(null);
};

lord.spell_subj = function(post, args) {
    if (!post || !post.subject)
        return Promise.resolve(null);
    if (args) {
        var rx = lord.regexp(args);
        if (!rx)
            return Promise.resolve(null);
        if (post.subject.search(rx) >= 0)
            return Promise.resolve({ "hidden": true });
    } else if (!post.isDefaultSubject) {
        return Promise.resolve({ "hidden": true });
    }
    return Promise.resolve(null);
};

lord.spell_name = function(post, args) {
    if (!post || !post.name)
        return Promise.resolve(null);
    if ((args && post.userName.toLowerCase().indexOf(args.toLowerCase()) >= 0) || !post.isDefaultUserName)
        return Promise.resolve({ "hidden": true });
    return Promise.resolve(null);
};

lord.spell_trip = function(post, args) {
    if (!post || !post.tripcode)
        return Promise.resolve(null);
    if (!args || post.tripcode.toLowerCase().indexOf(args.toLowerCase()) >= 0)
        return Promise.resolve({ "hidden": true });
    return Promise.resolve(null);
};

lord.spell_sage = function(post) {
    if (!post || !post.mailto)
        return Promise.resolve(null);
    if (post.mailto.toLowerCase() == "mailto:sage")
        return Promise.resolve({ "hidden": true });
    return Promise.resolve(null);
};

lord.spell_tlen = function(post, args) {
    if (!post || !post.text)
        return Promise.resolve(null);
    if (!args) {
        if (post.text.length > 0)
            return Promise.resolve({ "hidden": true });
    } else if (lord.inRanges(args, post.text.length)) {
        return Promise.resolve({ "hidden": true });
    }
    return Promise.resolve(null);
};

lord.spell_num = function(post, args) {
    if (!post || !args)
        return Promise.resolve(null);
    if (lord.inRanges(args, post.number))
        return Promise.resolve({ "hidden": true });
    return Promise.resolve(null);
};

lord.spell_img = function(post, args) {
    if (!post || !post.files)
        return Promise.resolve(null);
    if (args) {
        var m = args.match(/^(>|<|\=)?([\d\.\,\-]+)?(@([\d\,\-]+)x([\d\,\-]+))?$/);
        if (!m)
            return Promise.resolve(null);
        var sizes = m[2];
        var widths = m[4];
        var heights = m[5];
        if (!sizes && !widths && !heights)
            return Promise.resolve(null);
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
                return Promise.resolve({ "hidden": true });
            }
        }
    } else if (post.files.length > 0) {
        return Promise.resolve({ "hidden": true });
    }
    return Promise.resolve(null);
};

lord.spell_imgn = function(post, args) {
    if (!post || !args || !post.files)
        return Promise.resolve(null);
    var rx = lord.regexp(args);
    if (!rx)
        return Promise.resolve(null);
    for (var i = 0; i < post.files.length; ++i) {
        var f = post.files[i];
        if (f.sizeText.search(rx) >= 0)
            return Promise.resolve({ "hidden": true });
    }
    return Promise.resolve(null);
};

lord.spell_ihash = function(post, args) {
    args = +args;
    if (!post || !args || args <= 0 || !post.files)
        return Promise.resolve(null);
    var f = function(i) {
        if (i >= post.files.length)
            return Promise.resolve(null);
        var f = post.files[i];
        if (!f)
            return f(i + 1);
        return lord.getImageHash(f.href, f.width, f.height).then(function(hash) {
            if (hash && hash == args)
                return Promise.resolve({ "hidden": true });
            return Promise.resolve(null);
        });
    };
    return f(0);
};

lord.spell_exp = function(post, args) {
    if (!post || !args || !post.text)
        return Promise.resolve(null);
    var rx = lord.regexp(args);
    if (!rx)
        return Promise.resolve(null);
    if (post.text.search(rx) >= 0)
        return Promise.resolve({ "hidden": true });
    return Promise.resolve(null);
};

lord.spell_exph = function(post, args) {
    if (!post || !args || !post.textHTML)
        return Promise.resolve(null);
    var rx = lord.regexp(args);
    if (!rx)
        return Promise.resolve(null);
    if (post.textHTML.search(rx) >= 0)
        return Promise.resolve({ "hidden": true });
    return Promise.resolve(null);
};

lord.spell_video = function(post, args) {
    if (!post || !post.videos)
        return Promise.resolve(null);
    if (args) {
        var rx = lord.regexp(args);
        if (!rx)
            return Promise.resolve(null);
        for (var i = 0; i < post.videos.length; ++i) {
            var video = post.videos[i];
            if (video.title && video.title.search(rx) >= 0)
                return Promise.resolve({ "hidden": true });
        }
    } else {
        return Promise.resolve({ "hidden": true });
    }
    return Promise.resolve(null);
};

lord.spell_vauthor = function(post, args) {
    if (!post || !post.videos || !args)
        return Promise.resolve(null);
    for (var i = 0; i < post.videos.length; ++i) {
        var video = post.videos[i];
        if (video && video.author && video.author == args)
            return Promise.resolve({ "hidden": true });
    }
    return Promise.resolve(null);
};

lord.spell_rep = function(post, args) {
    if (!post || !args || !post.innerHTML)
        return Promise.resolve(null);
    var m = args.match("/((\\\\/|[^/])+?)/(i(gm?|mg?)?|g(im?|mi?)?|m(ig?|gi?)?)?\\,(.*)");
    if (!m)
        return Promise.resolve(null);
    var s = lord.last(m) || "";
    var nih = post.innerHTML.replace(new RegExp(m[1], m[3]), s);
    if (post.innerHTML == nih)
        return Promise.resolve(null);
    return Promise.resolve({ "replacements": [ { "innerHTML": nih } ] });
};

lord.applySpell = function(post, spell) {
    if (!post || !spell)
        return Promise.resolve(null);
    switch (spell.type) {
    case "SPELL": {
        return lord.applySpell(post, spell.value);
    }
    case "spell": {
        if (spell.board && post.board != spell.board)
            return Promise.resolve(null);
        if (spell.thread && post.thread != spell.thread)
            return Promise.resolve(null);
        return lord["spell_" + spell.name](post, spell.args);
    }
    case "|": {
        var f = function(i) {
            if (i >= spell.value.length)
                return Promise.resolve(null);
            return lord.applySpell(post, spell.value[i].value).then(function(result) {
                if (result && result.hidden)
                    return Promise.resolve(result);
                return f(i + 1);
            });
        };
        return f(0);
    }
    case "&": {
        var f = function(i) {
            if (i >= spell.value.length)
                return Promise.resolve(null);
            return lord.applySpell(post, spell.value[i].value).then(function(result) {
                if (!result || !result.hidden)
                    return Promise.resolve(null);
                return f(i + 1);
            });
        };
        return f(0);
    }
    case "!": {
        var result = lord.applySpell(post, spell.value);
        return Promise.resolve({ "hidden": (!result || !hidden) });
    }
    default: {
        break;
    }
    }
    return Promise.resolve(null);
};

lord.applySpells = function(post, spells) {
    if (!post || !spells || spells.length < 1)
        return Promise.resolve(null);
    var npost = { replacements: [] };
    var promises = spells.map(function(spell) {
        if (npost.hidden && ("SPELL" != spell.value.type || "rep" != spell.value.value.name))
            return Promise.resolve();
        return lord.applySpell(post, spell.value).then(function(result) {
            if (!result)
                return Promise.resolve();
            npost.hidden = result.hidden;
            if (result.replacements)
                npost.replacements = npost.replacements.concat(result.replacements);
            return Promise.resolve();
        });
    });
    return Promise.all(promises).then(function() {
        return Promise.resolve(npost);
    });
};

lord.processPosts = function(posts, spells) {
    if (!posts)
        return Promise.reject("Internal error");
    var promises = posts.map(function(post) {
        var npost = {
            "boardName": post.boardName,
            "postNumber": post.postNumber
        };
        var p = Promise.resolve();
        if (spells && !post.hidden) {
            p = p.then(function() {
                return lord.applySpells(post, spells);
            }).then(function(result) {
                if (result) {
                    npost.hidden = result.hidden;
                    npost.replacements = result.replacements;
                }
                return Promise.resolve();
            });
        }
        return p.then(function() {
            return Promise.resolve(npost);
        });
    });
    return Promise.all(promises);
};

lord.getFileHash = function(data) {
    if (!data)
        return Promise.reject("Invalid data");
    return new Promise(function(resolve, reject) {
        try {
            var wordArray = CryptoJS.lib.WordArray.create(data);
            var fileHash = CryptoJS.SHA1(wordArray).toString(CryptoJS.enc.Hex);
            resolve(fileHash);
        } catch (err) {
            reject(err);
        }
    });
};

lord.message_parseSpells = function(data) {
    if (!data || typeof data != "string")
        return Promise.reject("Invalid data");
    return lord.parseSpells(data);
};

lord.message_processPosts = function(data) {
    if (!data)
        return Promise.reject("Invalid data");
    return lord.processPosts(data.posts, data.spells);
};

lord.message_getImageHash = function(data) {
    if (!data)
        return Promise.reject("Invalid data");
    return lord.getImageHash(data.href, data.width, data.height);
};

lord.message_getFileHash = function(data) {
    if (!data)
        return Promise.reject("Invalid data");
    return lord.getFileHash(data);
};

importScripts("3rdparty/Promise.min.js");
importScripts("3rdparty/sha1.js");
importScripts("api.js");

self.addEventListener("message", function(message) {
    try {
        message = JSON.parse(message.data);
    } catch (err) {
        console.log(err);
        return;
    }
    var f = lord["message_" + message.type];
    if (!f) {
        self.postMessage(JSON.stringify({
            id: message.id,
            type: message.type,
            error: "Worker method not found: " + message.type
        }));
    }
    f(message.data).then(function(data) {
        self.postMessage(JSON.stringify({
            id: message.id,
            type: message.type,
            data: data
        }));
    }).catch(function(error) {
        self.postMessage(JSON.stringify({
            id: message.id,
            type: message.type,
            error: error
        }));
    });
}, false);
