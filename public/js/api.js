if (typeof $ != "undefined") {
    $._ajax = $.ajax;
    $.ajax = function() {
        var _arguments = arguments;
        return new Promise(function(resolve, reject) {
            $._ajax.apply($, _arguments).then(function(data) {
                resolve(data);
            }).fail(function(err) {
                reject(err);
            });
        });
    };
}

/*ololord global object*/

var lord = lord || {};

/*Classes*/

/*constructor*/ lord.PopupMessage = function(text, options) {
    this.hideTimer = null;
    this.text = text;
    this.timeout = (options && !isNaN(+options.timeout)) ? +options.timeout : 5 * 1000;
    this.classNames = (options && typeof options.classNames == "string") ? options.classNames : "";
    if (options && typeof options.type == "string" && lord.in(["critical", "warning"], options.type.toLowerCase()))
        this.classNames += options.type.toLowerCase() + (("" != this.classNames) ? " " : "");
    this.html = (options && typeof options.type == "string" && options.type.toLowerCase() == "html");
    this.node = (options && typeof options.type == "string" && options.type.toLowerCase() == "node");
    this.msg = lord.node("div");
    lord.addClass(this.msg, "popup");
    lord.addClass(this.msg, this.classNames);
    this.msg.onclick = this.hide.bind(this);
    if (lord.popups.length > 0) {
        var prev = lord.popups[lord.popups.length - 1];
        this.msg.style.top = (prev.msg.offsetTop + prev.msg.offsetHeight + 5) + "px";
    }
    if (this.html)
        this.msg.innerHTML = text;
    else if (this.node)
        this.msg.appendChild(text);
    else
        this.msg.appendChild(lord.node("text", text));
};

/*public*/ lord.PopupMessage.prototype.show = function() {
    if (this.hideTimer)
        return;
    document.body.appendChild(this.msg);
    lord.popups.push(this);
    this.hideTimer = setTimeout(this.hide.bind(this), this.timeout);
};

/*public*/ lord.PopupMessage.prototype.hide = function() {
    if (!this.hideTimer)
        return;
    clearTimeout(this.hideTimer);
    this.hideTimer = null;
    var offsH = this.msg.offsetHeight + 5;
    document.body.removeChild(this.msg);
    var ind = lord.popups.indexOf(this);
    if (ind < 0)
        return;
    lord.popups.splice(ind, 1);
    for (var i = ind; i < lord.popups.length; ++i) {
        var top = +lord.popups[i].msg.style.top.replace("px", "");
        top -= offsH;
        lord.popups[i].msg.style.top = top + "px";
    }
};

/*public*/ lord.PopupMessage.prototype.resetTimeout = function(timeout) {
    if (!this.hideTimer)
        return;
    clearTimeout(this.hideTimer);
    this.timeout = (!isNaN(+timeout)) ? +timeout : 5 * 1000;
    this.hideTimer = setTimeout(this.hide.bind(this), this.timeout);
};

/*public*/ lord.PopupMessage.prototype.resetText = function(text, options) {
    var offsH = this.msg.offsetHeight;
    this.text = text;
    this.classNames = (options && typeof options.classNames == "string") ? options.classNames : "";
    if (options && typeof options.type == "string" && lord.in(["critical", "warning"], options.type.toLowerCase()))
        this.classNames += options.type.toLowerCase() + (("" != this.classNames) ? " " : "");
    this.html = (options && typeof options.type == "string" && options.type.toLowerCase() == "html");
    this.node = (options && typeof options.type == "string" && options.type.toLowerCase() == "node");
    this.msg.className = "";
    lord.addClass(this.msg, "popup");
    lord.addClass(this.msg, this.classNames);
    lord.removeChildren(this.msg);
    if (this.html)
        this.msg.innerHTML = text;
    else if (this.node)
        this.msg.appendChild(text);
    else
        this.msg.appendChild(lord.node("text", text));
    if (!this.hideTimer)
        return;
    var ind = lord.popups.indexOf(this);
    if (ind < 0)
        return;
    offsH = this.msg.offsetHeight - offsH;
    for (var i = ind + 1; i < lord.popups.length; ++i) {
        var top = +lord.popups[i].msg.style.top.replace("px", "");
        top += offsH;
        lord.popups[i].msg.style.top = top + "px";
    }
};

/*constructor*/ lord.OverlayProgressBar = function(options) {
    this.visible = false;
    this.max = (options && +options.max >= 0) ? +options.max : 100;
    this.value = (options && +options.value <= this.max) ? +options.value : 0;
    this.mask = lord.node("div");
    lord.addClass(this.mask, "overlayMask");
    this.progressBar = lord.node("progress");
    this.progressBar.max = this.max;
    this.progressBar.value = this.value;
    lord.addClass(this.progressBar, "overlayProgressBar");
    var _this = this;
    var createCancelButton = function(callback) {
        _this.cancelButton = lord.node("button");
        lord.addClass(_this.cancelButton, "button overlayProgressBarCancelButton");
        _this.cancelButton.onclick = function() {
            _this.cancelButton.disabled = true;
            callback();
        };
        _this.cancelButton.appendChild(lord.node("text", "Cancel"));
        lord.removeChildren(_this.cancelButton);
        _this.cancelButton.appendChild(lord.node("text", lord.text("cancelButtonText")));
    };
    if (options && typeof options.cancelCallback == "function")
        createCancelButton(options.cancelCallback);
    else
        this.cancelButton = null;
    if (options && typeof options.finishCallback == "function") {
        this.finishCallback = options.finishCallback;
    } else {
        this.finishCallback = function() {
            _this.hide();
        };
    }
    if (options && options.xhr) {
        if (!this.cancelButton)
            createCancelButton(options.xhr.abort);
        options.xhr.upload.onprogress = function(e) {
            if (!e.lengthComputable)
                return;
            _this.max = e.total;
            _this.progressBar.max = _this.max;
            _this.progress(e.loaded);
        };
        options.xhr.upload.onload = function() {
            _this.max = 0;
            _this.value = 0;
            _this.progressBar.removeAttribute("max");
            _this.progressBar.removeAttribute("value");
        };
        options.xhr.onprogress = function(e) {
            if (!e.lengthComputable)
                return;
            _this.max = e.total;
            _this.progressBar.max = _this.max;
            _this.progress(e.loaded);
        };
        options.xhr.onload = function() {
            _this.max = 0;
            _this.value = 0;
            _this.progressBar.removeAttribute("max");
            _this.progressBar.removeAttribute("value");
            _this.finishCallback();
        };
    }
};

/*public*/ lord.OverlayProgressBar.prototype.progress = function(value) {
    value = +value;
    if (isNaN(value) || value < 0 || value > this.max)
        return;
    this.value = value;
    this.progressBar.value = this.value;
};

/*public*/ lord.OverlayProgressBar.prototype.show = function() {
    if (this.visible)
        return;
    this.visible = true;
    document.body.appendChild(this.mask);
    document.body.appendChild(this.progressBar);
    if (this.cancelButton)
        document.body.appendChild(this.cancelButton);
};

/*public*/ lord.OverlayProgressBar.prototype.showDelayed = function(delay) {
    var _this = this;
    this.mustShow = true;
    setTimeout(function() {
        if (!_this.mustShow)
            return;
        _this.show();
    }, delay || 0);
};

/*public*/ lord.OverlayProgressBar.prototype.hide = function() {
    this.mustShow = false;
    this.mustHide = false;
    if (!this.visible)
        return;
    this.visible = false;
    if (this.cancelButton)
        document.body.removeChild(this.cancelButton);
    document.body.removeChild(this.progressBar);
    document.body.removeChild(this.mask);
};

/*public*/ lord.OverlayProgressBar.prototype.hideDelayed = function(delay) {
    var _this = this;
    this.mustHide = true;
    setTimeout(function() {
        if (!_this.mustHide)
            return;
        _this.hide();
    }, delay || 0);
};

/*Constants*/

lord.Second = 1000;
lord.Minute = 60 * lord.Second;
lord.Hour = 60 * lord.Minute;
lord.Day = 24 * lord.Hour;
lord.Year = 365 * lord.Day;
lord.Billion = 2 * 1000 * 1000 * 1000;
lord.SettingsStoredInCookies = ["style", "codeStyle", "stickyToolbar", "shrinkPosts", "markupMode", "time",
                                "timeZoneOffset", "captchaEngine", "maxAllowedRating", "hidePostformRules",
                                "minimalisticPostform", "hiddenBoards"];
//
lord.keyboardMap = [
  "", // [0]
  "", // [1]
  "", // [2]
  "CANCEL", // [3]
  "", // [4]
  "", // [5]
  "HELP", // [6]
  "", // [7]
  "Backspace", // [8]
  "Tab", // [9]
  "", // [10]
  "", // [11]
  "CLEAR", // [12]
  "Enter", // [13]
  "ENTER_SPECIAL", // [14]
  "", // [15]
  "", // [16]
  "", // [17]
  "", // [18]
  "Pause", // [19]
  "CapsLock", // [20]
  "KANA", // [21]
  "EISU", // [22]
  "JUNJA", // [23]
  "FINAL", // [24]
  "HANJA", // [25]
  "", // [26]
  "Esc", // [27]
  "CONVERT", // [28]
  "NONCONVERT", // [29]
  "ACCEPT", // [30]
  "MODECHANGE", // [31]
  "Space", // [32]
  "PageUp", // [33]
  "PageDown", // [34]
  "End", // [35]
  "Home", // [36]
  "Left", // [37]
  "Up", // [38]
  "Right", // [39]
  "Down", // [40]
  "SELECT", // [41]
  "Print", // [42]
  "EXECUTE", // [43]
  "PrintScreen", // [44]
  "Insert", // [45]
  "Delete", // [46]
  "", // [47]
  "0", // [48]
  "1", // [49]
  "2", // [50]
  "3", // [51]
  "4", // [52]
  "5", // [53]
  "6", // [54]
  "7", // [55]
  "8", // [56]
  "9", // [57]
  ":", // [58]
  ";", // [59]
  "<", // [60]
  "=", // [61]
  ">", // [62]
  "?", // [63]
  "@", // [64]
  "A", // [65]
  "B", // [66]
  "C", // [67]
  "D", // [68]
  "E", // [69]
  "F", // [70]
  "G", // [71]
  "H", // [72]
  "I", // [73]
  "J", // [74]
  "K", // [75]
  "L", // [76]
  "M", // [77]
  "N", // [78]
  "O", // [79]
  "P", // [80]
  "Q", // [81]
  "R", // [82]
  "S", // [83]
  "T", // [84]
  "U", // [85]
  "V", // [86]
  "W", // [87]
  "X", // [88]
  "Y", // [89]
  "Z", // [90]
  "OS_KEY", // [91] Windows Key (Windows) or Command Key (Mac)
  "", // [92]
  "CONTEXT_MENU", // [93]
  "", // [94]
  "SLEEP", // [95]
  "Num0", // [96]
  "Num1", // [97]
  "Num2", // [98]
  "Num3", // [99]
  "Num4", // [100]
  "Num5", // [101]
  "Num6", // [102]
  "Num7", // [103]
  "Num8", // [104]
  "Num9", // [105]
  "*", // [106]
  "+", // [107]
  "SEPARATOR", // [108]
  "-", // [109]
  "/", // [110]
  "/", // [111]
  "F1", // [112]
  "F2", // [113]
  "F3", // [114]
  "F4", // [115]
  "F5", // [116]
  "F6", // [117]
  "F7", // [118]
  "F8", // [119]
  "F9", // [120]
  "F10", // [121]
  "F11", // [122]
  "F12", // [123]
  "F13", // [124]
  "F14", // [125]
  "F15", // [126]
  "F16", // [127]
  "F17", // [128]
  "F18", // [129]
  "F19", // [130]
  "F20", // [131]
  "F21", // [132]
  "F22", // [133]
  "F23", // [134]
  "F24", // [135]
  "", // [136]
  "", // [137]
  "", // [138]
  "", // [139]
  "", // [140]
  "", // [141]
  "", // [142]
  "", // [143]
  "NumLock", // [144]
  "ScrollLock", // [145]
  "WIN_OEM_FJ_JISHO", // [146]
  "WIN_OEM_FJ_MASSHOU", // [147]
  "WIN_OEM_FJ_TOUROKU", // [148]
  "WIN_OEM_FJ_LOYA", // [149]
  "WIN_OEM_FJ_ROYA", // [150]
  "", // [151]
  "", // [152]
  "", // [153]
  "", // [154]
  "", // [155]
  "", // [156]
  "", // [157]
  "", // [158]
  "", // [159]
  "CIRCUMFLEX", // [160]
  "EXCLAMATION", // [161]
  "\"", // [162]
  "#", // [163]
  "$", // [164]
  "%", // [165]
  "&", // [166]
  "_", // [167]
  "(", // [168]
  ")", // [169]
  "*", // [170]
  "+", // [171]
  "|", // [172]
  "-", // [173]
  "{", // [174]
  "}", // [175]
  "~", // [176]
  "", // [177]
  "", // [178]
  "", // [179]
  "", // [180]
  "VOLUME_MUTE", // [181]
  "VOLUME_DOWN", // [182]
  "VOLUME_UP", // [183]
  "", // [184]
  "", // [185]
  ";", // [186]
  "=", // [187]
  ",", // [188]
  "-", // [189]
  "PERIOD", // [190]
  "/", // [191]
  "`", // [192]
  "", // [193]
  "", // [194]
  "", // [195]
  "", // [196]
  "", // [197]
  "", // [198]
  "", // [199]
  "", // [200]
  "", // [201]
  "", // [202]
  "", // [203]
  "", // [204]
  "", // [205]
  "", // [206]
  "", // [207]
  "", // [208]
  "", // [209]
  "", // [210]
  "", // [211]
  "", // [212]
  "", // [213]
  "", // [214]
  "", // [215]
  "", // [216]
  "", // [217]
  "", // [218]
  "[", // [219]
  "\\", // [220]
  "]", // [221]
  "'", // [222]
  "", // [223]
  "", // [224]
  "ALTGR", // [225]
  "", // [226]
  "WIN_ICO_HELP", // [227]
  "WIN_ICO_00", // [228]
  "", // [229]
  "WIN_ICO_CLEAR", // [230]
  "", // [231]
  "", // [232]
  "WIN_OEM_RESET", // [233]
  "WIN_OEM_JUMP", // [234]
  "WIN_OEM_PA1", // [235]
  "WIN_OEM_PA2", // [236]
  "WIN_OEM_PA3", // [237]
  "WIN_OEM_WSCTRL", // [238]
  "WIN_OEM_CUSEL", // [239]
  "WIN_OEM_ATTN", // [240]
  "WIN_OEM_FINISH", // [241]
  "WIN_OEM_COPY", // [242]
  "WIN_OEM_AUTO", // [243]
  "WIN_OEM_ENLW", // [244]
  "WIN_OEM_BACKTAB", // [245]
  "ATTN", // [246]
  "CRSEL", // [247]
  "EXSEL", // [248]
  "EREOF", // [249]
  "PLAY", // [250]
  "ZOOM", // [251]
  "", // [252]
  "PA1", // [253]
  "WIN_OEM_CLEAR", // [254]
  "" // [255]
];

/*Variables*/

lord.popups = [];
lord.unloading = false;
lord.leftChain = [];
lord.rightChain = [];
lord.models = {};
//lord.partials = null;
lord.templates = {};

/*Functions*/

lord.isAudioType = function(type) {
    return type in {"audio/mpeg": true, "audio/ogg": true, "audio/wav": true};
};

lord.isImageType = function(type) {
    return type in {"image/gif": true, "image/jpeg": true, "image/png": true};
};

lord.isVideoType = function(type) {
    return type in {"video/mp4": true, "video/ogg": true, "video/webm": true};
};

lord.getCookie = function(name, defValue) {
    var matches = document.cookie.match(
        new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
    return matches ? decodeURIComponent(matches[1]) : defValue;
};

lord.setCookie = function(name, value, options) {
    options = options || {};
    var expires = options.expires;
    if (typeof expires == "number" && expires) {
        var d = new Date();
        d.setTime(d.getTime() + expires * 1000);
        expires = options.expires = d;
    }
    if (expires && expires.toUTCString)
        options.expires = expires.toUTCString();
    value = encodeURIComponent(value);
    var updatedCookie = name + "=" + value;
    for (var propName in options) {
        updatedCookie += "; " + propName;
        var propValue = options[propName];
        if (propValue !== true)
            updatedCookie += "=" + propValue;
    }
    document.cookie = updatedCookie;
};

lord.deleteCookie = function(name) {
    lord.setCookie(name, "", {expires: -1});
};

lord.getLocalObject = function(key, defValue) {
    if (!key || typeof key != "string")
        return null;
    try {
        var val = localStorage.getItem(key);
        return (null != val) ? JSON.parse(val) : defValue;
    } catch (ex) {
        return null;
    }
};

lord.setLocalObject = function(key, value) {
    if (!key || typeof key != "string")
        return false;
    try {
        if (null != value && typeof value != "undefined")
            localStorage.setItem(key, JSON.stringify(value));
        else
            localStorage.setItem(key, null);
        return true;
    } catch (ex) {
        return false;
    }
};

lord.removeLocalObject = function(key) {
    if (!key || typeof key != "string")
        return;
    try {
        return localStorage.removeItem(key);
    } catch (ex) {
        //
    }
};

lord.in = function(arr, obj, strict) {
    if (!arr || !arr.length)
        return false;
    for (var i = 0; i < arr.length; ++i) {
        if ((strict && obj === arr[i]) || (!strict && obj == arr[i]))
            return true;
    }
    return false;
};

lord.arr = function(obj) {
    var arr = [];
    if (!obj || !obj.length)
        return arr;
    for (var i = 0; i < obj.length; ++i)
        arr.push(obj[i]);
    return arr;
};

lord.hasOwnProperties = function(obj) {
    if (!obj)
        return false;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            return true;
    }
    return false;
};

lord.forIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            f(obj[x], x);
    }
};

lord.mapIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    var arr = [];
    for (var x in obj) {
        if (obj.hasOwnProperty(x))
            arr.push(f(obj[x], x));
    }
    return arr;
};

lord.filterIn = function(obj, f) {
    if (!obj || typeof f != "function")
        return;
    var nobj = {};
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
            var item = obj[x];
            if (f(item, x))
                nobj[x] = item;
        }
    }
    return nobj;
};

lord.toArray = function(obj) {
    var arr = [];
    var i = 0;
    for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
            arr[i] = obj[x];
            ++i;
        }
    }
    return arr;
};

lord.removeChildren = function(obj) {
    if (!obj || typeof obj.removeChild != "function")
        return;
    while (obj.firstChild)
        obj.removeChild(obj.firstChild);
};

lord.last = function(arr) {
    if (!arr || !arr.length)
        return null;
    return arr[arr.length - 1];
};

lord.equal = function(x, y) {
    var p;
    if (isNaN(x) && isNaN(y) && typeof x === "number" && typeof y === "number")
        return true;
    if (x === y)
        return true;
    if ((typeof x === "function" && typeof y === "function") ||
        (x instanceof Date && y instanceof Date) ||
        (x instanceof RegExp && y instanceof RegExp) ||
        (x instanceof String && y instanceof String) ||
        (x instanceof Number && y instanceof Number)) {
        return x.toString() === y.toString();
    }
    if (!(x instanceof Object && y instanceof Object))
        return false;
    if (x.isPrototypeOf(y) || y.isPrototypeOf(x))
        return false;
    if (x.constructor !== y.constructor)
        return false;
    if (x.prototype !== y.prototype)
        return false;
    if (lord.leftChain.indexOf(x) > -1 || lord.rightChain.indexOf(y) > -1)
         return false;
    for (p in y) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p))
            return false;
        else if (typeof y[p] !== typeof x[p])
            return false;
    }
    for (p in x) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p))
            return false;
        else if (typeof y[p] !== typeof x[p])
            return false;
        switch (typeof (x[p])) {
        case "object":
        case "function":
            lord.leftChain.push(x);
            lord.rightChain.push(y);
            if (!equal(x[p], y[p]))
                return false;
            lord.leftChain.pop();
            lord.rightChain.pop();
            break;
        default:
            if (x[p] !== y[p])
                return false;
            break;
        }
    }
    return true;
};

lord.gently = function(obj, f, options) {
    if (!obj || typeof f != "function")
        return Promise.reject("Invalid arguments");
    var delay = options ? +options.delay : undefined;
    var n = options ? +options.n : undefined;
    var promise = options && options.promise;
    if (isNaN(delay) || delay < 1)
        delay = 1;
    if (isNaN(n) || n < 1)
        n = 1;
    return new Promise(function(resolve, reject) {
        if (Array.isArray(obj)) {
            var arr = obj;
            var ind = 0;
            var g = function() {
                if (ind >= arr.length)
                    return resolve();
                if (promise) {
                    var i = ind;
                    var h = function() {
                        return f(arr[i], i).then(function() {
                            ++i;
                            if (i >= Math.min(ind + n, arr.length))
                                return Promise.resolve();
                            return h();
                        });
                    };
                    h().then(function() {
                        ind += n;
                        setTimeout(g, delay);
                    });
                } else {
                    for (var i = ind; i < Math.min(ind + n, arr.length); ++i)
                        f(arr[i], i);
                    ind += n;
                    setTimeout(g, delay);
                }
            };
            g();
        } else {
            var arr = [];
            for (var x in obj) {
                if (obj.hasOwnProperty(x)) {
                    arr.push({
                        "key": x,
                        "value": obj[x]
                    });
                }
            }
            var ind = 0;
            var g = function() {
                if (ind >= arr.length)
                    return resolve();
                if (promise) {
                    var i = ind;
                    var h = function() {
                        return f(arr[i].value, arr[i].key).then(function() {
                            ++i;
                            if (i >= Math.min(ind + n, arr.length))
                                return Promise.resolve();
                            return h();
                        });
                    };
                    h().then(function() {
                        ind += n;
                        setTimeout(g, delay);
                    });
                } else {
                    for (var i = ind; i < Math.min(ind + n, arr.length); ++i)
                        f(arr[i].value, arr[i].key);
                    ind += n;
                    setTimeout(g, delay);
                }
            };
            g();
        }
    });
};

lord.regexp = function(s) {
    if (!s || typeof s != "string")
        return null;
    var m = s.match("/((\\\\/|[^/])+?)/(i(gm?|mg?)?|g(im?|mi?)?|m(ig?|gi?)?)?");
    if (!m)
        return null;
    return new RegExp(m[1], m[3]);
};

lord.id = function(id) {
    if (typeof id != "string" && typeof id != "number")
        return null;
    return document.getElementById(id);
};

lord.query = function(query, parent) {
    if (typeof query != "string")
        return null;
    if (!parent)
        parent = document;
    var elements = parent.querySelectorAll(query);
    var list = [];
    if (!elements)
        return list;
    for (var i = 0; i < elements.length; ++i)
        list.push(elements[i]);
    return list;
};

lord.queryOne = function(query, parent) {
    if (typeof query != "string")
        return null;
    if (!parent)
        parent = document;
    return parent.querySelector(query);
};

lord.name = function(name, parent) {
    return lord.query("[name='" + name + "']", parent);
};

lord.nameOne = function(name, parent) {
    return lord.queryOne("[name='" + name + "']", parent);
};

lord.contains = function(s, subs) {
    if (typeof s == "string" && typeof subs == "string")
        return s.replace(subs, "") != s;
    if (!s || !s.length || s.length < 1)
        return false;
    for (var i = 0; i < s.length; ++i) {
        if (lord.equal(s[i], subs))
            return true;
    }
    return false;
};

lord.isInViewport = function(el) {
    var rect = el.getBoundingClientRect();
    return (rect.top >= 0 && rect.left >= 0
        && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
        && rect.right <= (window.innerWidth || document.documentElement.clientWidth));
};

lord.addClass = function(element, classNames) {
    if (!element || !element.tagName || !classNames || typeof classNames != "string")
        return;
    lord.arr(classNames.split(" ")).forEach(function(className) {
        if (!className)
            return;
        if (lord.hasClass(element, className))
            return;
        if (element.className)
            element.className += " " + className;
        else
            element.className = className;
    });
};

lord.hasClass = function(element, className) {
    if (!element || !element.tagName || !className || typeof className != "string")
        return false;
    return !!element.className.match(new RegExp("(^| )" + className + "( |$)"));
};

lord.removeClass = function(element, classNames) {
    if (!element || !element.tagName || !classNames || typeof classNames != "string")
        return;
    lord.arr(classNames.split(" ")).forEach(function(className) {
        if (!className)
            return;
        element.className = element.className.replace(new RegExp("(^| )" + className + "$"), "");
        element.className = element.className.replace(new RegExp("^" + className + "( |$)"), "");
        element.className = element.className.replace(new RegExp(" " + className + " "), " ");
    });
};

lord.node = function(type, text) {
    if (typeof type != "string")
        return null;
    type = type.toUpperCase();
    return ("TEXT" == type) ? document.createTextNode(text ? text : "") : document.createElement(type);
};

lord.toCenter = function(element, sizeHintX, sizeHintY, border) {
    var doc = document.documentElement;
    sizeHintX = +sizeHintX;
    sizeHintY = +sizeHintY;
    if (isNaN(sizeHintX) || sizeHintX <= 0)
        sizeHintX = +element.offsetWidth;
    if (isNaN(sizeHintY)  || sizeHintY <= 0)
        sizeHintY = +element.offsetHeight;
    borded = +border;
    if (!isNaN(border)) {
        sizeHintX += border * 2;
        sizeHintY += border * 2;
    }
    element.style.left = (doc.clientWidth / 2 - sizeHintX / 2) + "px";
    element.style.top = (doc.clientHeight / 2 - sizeHintY / 2) + "px";
};

lord.reloadPage = function() {
    document.location.reload(true);
};

lord.showPopup = function(text, options) {
    var popup = new lord.PopupMessage(text, options);
    popup.show();
    return popup;
};

lord.showNotification = function(title, body, icon) {
    if (!("Notification" in window))
        return;
    Notification.requestPermission(function(permission) {
        if (permission !== "granted")
            return;
        var notification = new Notification(lord.text(title), {
            "body": body,
            "icon": icon
        });
    });
};

lord.text = function(id) {
    if (!id)
        return id;
    var text = lord.models.tr.tr[id];
    if (text)
        return text;
    return id;
};

lord.deviceType = function(expected) {
    var base = lord.models.base;
    if (!base)
        return expected ? false : null;
    if (expected)
        return expected == base.deviceType;
    return base.deviceType;
};

lord.showDialog = function(title, label, body, afterShow) {
    var root = lord.node("div");
    title = lord.text(title);
    label = lord.text(label);
    if (title || label) {
        var div = lord.node("div");
        if (title) {
            var c = lord.node("center");
            var t = lord.node("b");
            t.appendChild(lord.node("text", title));
            c.appendChild(t);
            div.appendChild(c);
            div.appendChild(lord.node("br"));
        }
        if (label) {
            div.appendChild(lord.node("text", label));
            div.appendChild(lord.node("br"));
        }
        root.appendChild(div);
        root.appendChild(lord.node("br"));
    }
    if (body) {
        root.appendChild(body);
        root.appendChild(lord.node("br"));
    }
    var div2 = lord.node("div");
    var dialog = null;
    var cancel = lord.node("button");
    return new Promise(function(resolve, reject) {
        cancel.onclick = function() {
            dialog.close();
        };
        cancel.appendChild(lord.node("text", lord.text("cancelButtonText")));
        div2.appendChild(cancel);
        var ok = lord.node("button");
        ok.onclick = function() {
            resolve(true);
            dialog.close();
        };
        ok.appendChild(lord.node("text", lord.text("confirmButtonText")));
        div2.appendChild(ok);
        root.appendChild(div2);
        dialog = picoModal({
            content: root,
            modalStyles: function (styles) {
                styles.maxHeight = "80%";
                styles.maxWidth = "80%";
                styles.overflow = "auto";
                styles.border = "1px solid #777777";
                return styles;
            }
        }).afterShow(function(modal) {
            if (afterShow)
                afterShow();
        }).afterClose(function(modal) {
            modal.destroy();
            resolve(false);
        });
        dialog.show();
    });
};

lord.isHashpass = function(s) {
    return !!s.match(/([0-9a-fA-F]{8}\-){4}[0-9a-fA-F]{8}/g);
};

lord.generateImageHash = function(imageData, sizeX, sizeY) {
    sizeX = +sizeX;
    sizeY = +sizeY;
    if (!imageData || isNaN(sizeX) || isNaN(sizeY))
        return null;
    var buf = new Uint8Array(imageData);
    var oldw = sizeX;
    var oldh = sizeY;
    var size = oldw * oldh;
    for (var i = 0, j = 0; i < size; i++, j += 4)
        buf[i] = buf[j] * 0.3 + buf[j + 1] * 0.59 + buf[j + 2] * 0.11;
    var newh = 8;
    var neww = 8;
    var levels = 3;
    var areas = 256 / levels;
    var values = 256 / (levels - 1);
    var hash = 0;
    for (var i = 0; i < newh; i++) {
        for (var j = 0; j < neww; j++) {
            var tmp = i / (newh - 1) * (oldh - 1);
            var l = Math.min(tmp | 0, oldh - 2);
            var u = tmp - l;
            tmp = j / (neww - 1) * (oldw - 1);
            var c = Math.min(tmp | 0, oldw - 2);
            var t = tmp - c;
            var first = buf[l * oldw + c] * ((1 - t) * (1 - u));
            first += buf[l * oldw + c + 1] * (t * (1 - u));
            first += buf[(l + 1) * oldw + c + 1] * (t * u);
            first += buf[(l + 1) * oldw + c] * ((1 - t) * u);
            first /= areas;
            first = values * (first | 0);
            hash = (hash << 4) + Math.min(first, 255);
            var g = hash & 4026531840;
            if (g)
                hash ^= g >>> 24;
            hash &= ~g;
        }
    }
    return hash;
};

lord.getPlainText = function(node) {
    if (!node)
        return "";
    function normalize(a) {
        if (!a)
            return "";
        a = a.replace(/ +/g, " ").replace(/[\t]+/gm, "").replace(/[ ]+$/gm, "").replace(/^[ ]+/gm, "");
        a = a.replace(/\n+/g, "\n").replace(/\n+$/, "").replace(/^\n+/, "").replace(/\nNEWLINE\n/g, "\n\n");
        return a.replace(/NEWLINE\n/g, "\n\n");
    }
    function removeWhiteSpace(node) {
        var isWhite = function(node) {
            return !(/[^\t\n\r ]/.test(node.nodeValue));
        };
        var ws = [];
        var findWhite = function(node) {
            for(var i = 0; i < node.childNodes.length; i++) {
                var n = node.childNodes[i];
                if (n.nodeType == 3 && isWhite(n))
                    ws.push(n);
                else if (n.hasChildNodes())
                    findWhite(n);
            }
        };
        findWhite(node);
        for(var i = 0; i < ws.length; i++)
            ws[i].parentNode.removeChild(ws[i]);
    }
    function sty(n, prop) {
        if (n.style[prop])
            return n.style[prop];
        var s = n.currentStyle || n.ownerDocument.defaultView.getComputedStyle(n, null);
        if (n.tagName == "SCRIPT")
            return "none";
        if(!s[prop])
            return ("LI,P,TR".indexOf(n.tagName) > -1) ? "block" : n.style[prop];
        if (s[prop] =="block" && n.tagName=="TD")
            return "feaux-inline";
        return s[prop];
    }
    var blockTypeNodes = "table-row,block,list-item";
    function isBlock(n) {
        var s = sty(n, "display") || "feaux-inline";
        if (blockTypeNodes.indexOf(s) > -1)
            return true;
        return false;
    }
    function recurse(n) {
        if (/pre/.test(sty(n, "whiteSpace"))) {
            t += n.innerHTML.replace(/\t/g, " ").replace(/\n/g, " ");
            return "";
        }
        var s = sty(n, "display");
        if (s == "none")
            return "";
        var gap = isBlock(n) ? "\n" : " ";
        t += gap;
        for (var i = 0; i < n.childNodes.length; i++) {
            var c = n.childNodes[i];
            if (c.nodeType == 3)
                t += c.nodeValue;
            if (c.childNodes.length)
                recurse(c);
        }
        t += gap;
        return t;
    }
    node = node.cloneNode(true);
    node.innerHTML = node.innerHTML.replace(/<br>/g, "\n");
    var paras = node.getElementsByTagName("p");
    for (var i = 0; i < paras.length; i++)
        paras[i].innerHTML += "NEWLINE";
    var t = "";
    removeWhiteSpace(node);
    return normalize(recurse(node));
};

lord.activateTab = function(a, tabIndex, display) {
    if (!a)
        return;
    tabIndex = +tabIndex;
    if (isNaN(tabIndex))
        return;
    var tab = a.parentNode;
    var header = tab.parentNode;
    var widget = header.nextSibling.nextSibling;
    var page = lord.nameOne(tabIndex, widget);
    if (typeof display != "string")
        display = "block";
    lord.arr(widget.childNodes).forEach(function(node) {
        if (node.nodeType != 1) //Element
            return;
        node.style.display = ((node == page) ? display : "none");
    });
    lord.arr(header.childNodes).forEach(function(node) {
        if (node.nodeType != 1) //Element
            return;
        if (node == tab)
            lord.addClass(node, "activated");
        else
            lord.removeClass(node, "activated");
    });
};

lord.notificationsEnabled = function() {
    return lord.getLocalObject("showAutoUpdateDesktopNotifications", true);
};

lord.soundEnabled = function() {
    return lord.getLocalObject("playAutoUpdateSound", false);
};

lord.playSound = function() {
    if (!lord.sound) {
        lord.sound = lord.node("audio");
        var source = lord.node("source");
        source.type = "audio/ogg";
        source.src = "/" + lord.data("sitePathPrefix") + "audio/signal.ogg";
        lord.sound.volume = lord.getLocalObject("soundNotificationsVolume", 100) / 100;
        lord.sound.appendChild(source);
    }
    lord.sound.play();
};

lord.nearlyEqual = function(a, b, epsilon) {
    var absA = Math.abs(a);
    var absB = Math.abs(b);
    var diff = Math.abs(a - b);
    if (a == b) {
        return true;
    } else if (a == 0 || b == 0 || diff < Number.MIN_VALUE) {
        return diff < (epsilon * Number.MIN_VALUE);
    } else {
        return diff / (absA + absB) < epsilon;
    }
};

lord.hash = function() {
    return window.location.hash.substr(1, window.location.hash.length - 1);
};

lord.data = function(key, el, bubble) {
    el = el || document.body;
    while (el && el.dataset) {
        if (key in el.dataset)
            return el.dataset[key];
        el = bubble ? el.parentNode : undefined;
    }
    return undefined;
};

lord.template = function(templateName, model, noparse) {
    var template = lord.templates[templateName];
    if (!template)
        return null;
    if (!model)
        return template;
    var html = template(model);
    if (noparse)
        return html;
    var nodes = $.parseHTML(html, document, true);
    var node;
    for (var i = 0; i < nodes.length; ++i) {
        if (1 == nodes[i].nodeType) {
            node = nodes[i];
            break;
        }
    }
    if (!node)
        return null;
    lord.query("script", node).forEach(function(script) {
        var nscript = lord.node("script");
        if (script.src)
            nscript.src = script.src;
        else if (script.innerHTML)
            nscript.innerHTML = script.innerHTML;
        script.parentNode.replaceChild(nscript, script);
    });
    return node;
};

lord.createStylesheetLink = function(href, prefix) {
    var link = lord.node("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = (prefix ? ("/" + lord.models.base.site.pathPrefix + "css/") : "") + href;
    lord.queryOne("head").appendChild(link);
};

lord.compareRegisteredUserLevels = function(l1, l2) {
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

lord.escaped = function(text) {
    return $("<div />").text(text).html();
};

lord.model = function(modelName, mustMerge) {
    if (Array.isArray(modelName)) {
        var models = modelName.map(function(modelName) {
            return lord.model(modelName);
        });
        if (!mustMerge)
            return models;
        var model = (models.length > 0) ? merge.clone(models[0]) : {};
        models.slice(1).forEach(function(m) {
            model = merge.recursive(model, m);
        })
        return model;
    } else {
        var match = modelName.match(/^board\/(\S+)$/);
        if (match) {
            var boards = lord.models["boards"].boards;
            for (var i = 0; i < boards.length; ++i) {
                if (match[1] == boards[i].name)
                    return { board: boards[i] };
            }
            return lord.models["boards"].boards[match[1]];
        }
        return lord.models[modelName];
    }
};

lord.get = function(what) {
    var xhr = new XMLHttpRequest();
    xhr.open("get", "/" + lord.data("sitePathPrefix", lord.queryOne("head")) + what, false);
    xhr.send(null);
    if (xhr.status === 200)
        return xhr.responseText;
    return null;
};

lord.api = function(entity, parameters, prefix) {
    prefix = prefix || "api";
    var query = "";
    lord.forIn(parameters, function(val, key) {
        if (!Array.isArray(val))
            val = [val];
        val.forEach(function(val) {
            if (query)
                query += "&";
            query += (key + "=" + val);
        });
    });
    query = (query ? "?" : "") + query;
    return new Promise(function(resolve, reject) {
        $.getJSON("/" + lord.data("sitePathPrefix") + prefix + "/" + entity + ".json" + query).then(function(result) {
            if (lord.checkError(result))
                reject(result);
            resolve(result);
        }).catch(function(err) {
            reject(err);
        });
    });
};

lord.post = function(action, formData, progressBarContext, progressBarOptions) {
    var parameters = {
        type: "POST",
        data: formData,
        processData: false,
        contentType: false
    };
    if (typeof progressBarContext == "object") {
        parameters.xhr = function() {
            var xhr = new XMLHttpRequest();
            if (progressBarOptions && progressBarOptions.uploadProgress)
                xhr.upload.onprogress = progressBarOptions.uploadProgress;
            progressBarContext.progressBar = new lord.OverlayProgressBar({ xhr: xhr });
            if (progressBarOptions && progressBarOptions.delay)
                progressBarContext.progressBar.showDelayed(progressBarOptions.delay);
            else
                progressBarContext.progressBar.show();
            return xhr;
        }
    }
    return $.ajax(action, parameters).then(function(result) {
        if (lord.checkError(result))
            return Promise.reject(result);
        return Promise.resolve(result);
    });
};

lord.now = function() {
    return new Date();
};

lord.settings = function() {
    return {
        style: {
            name: lord.getCookie("style", "photon")
        },
        codeStyle: {
            name: lord.getCookie("codeStyle", "default")
        },
        shrinkPosts: (lord.getCookie("shrinkPosts", "true") != "false"),
        markupMode: lord.getCookie("markupMode", "EXTENDED_WAKABA_MARK,BB_CODE"),
        stickyToolbar: (lord.getCookie("stickyToolbar", "true") != "false"),
        time: lord.getCookie("time", "server"),
        timeZoneOffset: lord.getCookie("timeZoneOffset", -lord.now().getTimezoneOffset()),
        captchaEngine: {
            id: lord.getCookie("captchaEngine", "google-recaptcha")
        },
        maxAllowedRating: lord.getCookie("maxAllowedRating", "R-18G"),
        hidePostformRules: (lord.getCookie("hidePostformRules", "false") == "true"),
        minimalisticPostform: (lord.getCookie("minimalisticPostform",
            lord.deviceType("mobile") ? "true" : "false") == "true"),
        hiddenBoards: lord.getCookie("hiddenBoards", "").split("|"),
        autoUpdateThreadsByDefault: lord.getLocalObject("autoUpdateThreadsByDefault", false),
        autoUpdateInterval: lord.getLocalObject("autoUpdateInterval", 15),
        showAutoUpdateDesktopNotifications: lord.getLocalObject("showAutoUpdateDesktopNotifications", true),
        playAutoUpdateSound: lord.getLocalObject("playAutoUpdateSound", false),
        soundNotificationsVolume: lord.getLocalObject("soundNotificationsVolume", 100),
        signOpPostLinks: lord.getLocalObject("signOpPostLinks", true),
        signOwnPostLinks: lord.getLocalObject("signOwnPostLinks", true),
        showLeafButtons: lord.getLocalObject("showLeafButtons", true),
        leafThroughImagesOnly: lord.getLocalObject("leafThroughImagesOnly", false),
        imageZoomSensitivity: lord.getLocalObject("imageZoomSensitivity", 25),
        defaultAudioVideoVolume: lord.getLocalObject("defaultAudioVideoVolume", 100),
        rememberAudioVideoVolume: lord.getLocalObject("rememberAudioVideoVolume", true),
        playAudioVideoImmediately: lord.getLocalObject("playAudioVideoImmediately", true),
        loopAudioVideo: lord.getLocalObject("loopAudioVideo", true),
        quickReplyAction: lord.getLocalObject("quickReplyAction", "goto_thread"),
        moveToPostOnReplyInThread: lord.getLocalObject("moveToPostOnReplyInThread", false),
        checkFileExistence: lord.getLocalObject("checkFileExistence", true),
        showAttachedFilePreview: lord.getLocalObject("showAttachedFilePreview", true),
        addToFavoritesOnReply: lord.getLocalObject("addToFavoritesOnReply", false),
        stripExifFromJpeg: lord.getLocalObject("stripExifFromJpeg", true),
        hideTripcodes: lord.getLocalObject("hideTripcodes", false),
        hideUserNames: lord.getLocalObject("hideUserNames", false),
        strikeOutHiddenPostLinks: lord.getLocalObject("strikeOutHiddenPostLinks", true),
        spellsEnabled: lord.getLocalObject("spellsEnabled", true),
        showNewPosts: lord.getLocalObject("showNewPosts", true),
        hotkeysEnabled: lord.getLocalObject("hotkeysEnabled", true),
        userCssEnabled: lord.getLocalObject("userCssEnabled", true),
        userJavaScriptEnabled: lord.getLocalObject("userJavaScriptEnabled", true),
        sourceHighlightingEnabled: lord.getLocalObject("sourceHighlightingEnabled", false),
        chatEnabled: lord.getLocalObject("chatEnabled", true),
        closeFilesByClickingOnly: lord.getLocalObject("closeFilesByClickingOnly", false)
    };
};

lord.setSettings = function(model) {
    if (!model)
        return;
    lord.forIn(model, function(val, key) {
        if (lord.SettingsStoredInCookies.indexOf(key) >= 0) {
            if ("hiddenBoards" == key)
                val = val.join("|");
            lord.setCookie(key, val, {
                "expires": lord.Billion,
                "path": "/"
            });
        } else {
            lord.setLocalObject(key, val);
        }
    });
};

lord.checkError = function(result) {
    return (["object", "number", "boolean"].indexOf(typeof result) < 0)
        || (result && (result.errorMessage || result.ban));
};

lord.handleError = function(error) {
    console.log(error);
    if (lord.unloading)
        return;
    var text;
    if (error) {
        if (error.errorMessage) {
            text = error.errorMessage;
            if (error.errorDescription)
                text += ": " + error.errorDescription;
        } else if (error.ban) {
            var model = lord.model("base");
            var settings = lord.settings();
            var locale = model.site.locale;
            var timeOffset = ("local" == settings.time) ? +settings.timeZoneOffset : model.site.timeOffset;
            var dateFormat = model.site.dateFormat;
            var formattedDate = function(date) {
                return moment(date).utcOffset(timeOffset).locale(locale).format(dateFormat);
            };
            text = lord.text("bannedText") + ".";
            if (error.ban.reason)
                text += " " + lord.text("banReasonLabelText") + " " + error.ban.reason + ".";
            text += " " + lord.text("banExpiresLabelText") + " ";
            if (error.ban.expiresAt)
                text += formattedDate(error.ban.expiresAt);
            else
                text += lord.text("banExpiresNeverText");
        } else if (error.hasOwnProperty("readyState")) {
            //TODO: error status
            switch (error.status) {
            case 400:
                break;
            case 404:
                break;
            case 408:
                break;
            case 413:
                break;
            case 429:
                //DDOS
                break;
            case 500:
                text = "Temporarily banned or internal server error"; //Move to 429
                break;
            case 502:
                break;
            case 503:
                break;
            case 504:
                break;
            case 523:
                //CF
                break;
            default:
                if (0 == error.readyState)
                    text = "No connection with server";
                break;
            }
        } else {
            text = error;
        }
    } else {
        text = "Unknown error";
    }
    lord.showPopup(text, {type: "critical"});
};

lord.toMap = function(arr, keyGenerator) {
    var map = {};
    arr.forEach(function(item) {
        map[keyGenerator(item)] = item;
    });
    return map;
};

lord.readAs = function(blob, method) {
    switch (method) {
    case "ArrayBuffer":
    case "BinaryString":
    case "DataURL":
    case "Text":
        break;
    default:
        method = "ArrayBuffer";
        break;
    }
    var binaryReader = new FileReader();
    return new Promise(function(resolve, reject) {
        binaryReader.onload = function(e) {
            resolve(e.target.result);
        };
        binaryReader.onerror = function(e) {
            reject(e.getMessage());
        };
        binaryReader["readAs" + method](blob);
    });
};
