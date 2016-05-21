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

var lord = lord || _.noConflict();

/*Constants*/

lord.Second = 1000;
lord.Minute = 60 * lord.Second;
lord.Hour = 60 * lord.Minute;
lord.Day = 24 * lord.Hour;
lord.Year = 365 * lord.Day;
lord.Billion = 2 * 1000 * 1000 * 1000;
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
lord.models = {};
lord.templates = {};
lord.dialogs = [];

/*Classes*/

/*constructor*/ lord.PopupMessage = function(text, options) {
    this.hideTimer = null;
    this.text = text;
    this.timeout = (options && !isNaN(+options.timeout)) ? +options.timeout : 5 * 1000;
    this.classNames = (options && typeof options.classNames == "string") ? options.classNames : "";
    if (options && typeof options.type == "string" && lord.contains(["critical", "warning"],
        options.type.toLowerCase())) {
        this.classNames += options.type.toLowerCase() + (("" != this.classNames) ? " " : "");
    }
    this.html = (options && typeof options.type == "string" && options.type.toLowerCase() == "html");
    this.node = (options && typeof options.type == "string" && options.type.toLowerCase() == "node");
    this.msg = lord.node("div");
    $(this.msg).addClass("popup");
    $(this.msg).addClass(this.classNames);
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
    if (options && typeof options.type == "string" && lord.contains(["critical", "warning"],
        options.type.toLowerCase())) {
        this.classNames += options.type.toLowerCase() + (("" != this.classNames) ? " " : "");
    }
    this.html = (options && typeof options.type == "string" && options.type.toLowerCase() == "html");
    this.node = (options && typeof options.type == "string" && options.type.toLowerCase() == "node");
    this.msg.className = "";
    $(this.msg).addClass("popup");
    $(this.msg).addClass(this.classNames);
    $(this.msg).empty();
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
    $(this.mask).addClass("overlayMask");
    this.progressBar = lord.node("progress");
    this.progressBar.max = this.max;
    this.progressBar.value = this.value;
    $(this.progressBar).addClass("overlayProgressBar");
    var _this = this;
    var createCancelButton = function(callback) {
        _this.cancelButton = lord.node("button");
        $(_this.cancelButton).addClass("button overlayProgressBarCancelButton");
        _this.cancelButton.onclick = function() {
            _this.cancelButton.disabled = true;
            callback();
        };
        _this.cancelButton.appendChild(lord.node("text", "Cancel"));
        $(_this.cancelButton).empty();
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
    } else {
        this.finishOnMaxValue = true;
    }
};

/*public*/ lord.OverlayProgressBar.prototype.progress = function(value) {
    value = +value;
    if (isNaN(value) || value < 0 || value > this.max)
        return;
    this.value = value;
    this.progressBar.value = this.value;
    if (this.finishOnMaxValue && this.value == this.max)
        this.finishCallback();
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

/*Functions*/

lord.isAudioType = function(type) {
    return type in {"application/ogg": true, "audio/mpeg": true, "audio/ogg": true, "audio/wav": true};
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
        return false;
    try {
        return localStorage.removeItem(key);
    } catch (ex) {
        return false;
    }
};

lord.getSessionObject = function(key, defValue) {
    if (!key || typeof key != "string")
        return null;
    try {
        var val = sessionStorage.getItem(key);
        return (null != val) ? JSON.parse(val) : defValue;
    } catch (ex) {
        return null;
    }
};

lord.setSessionObject = function(key, value) {
    if (!key || typeof key != "string")
        return false;
    try {
        if (null != value && typeof value != "undefined")
            sessionStorage.setItem(key, JSON.stringify(value));
        else
            sessionStorage.setItem(key, null);
        return true;
    } catch (ex) {
        return false;
    }
};

lord.removeSessionObject = function(key) {
    if (!key || typeof key != "string")
        return false;
    try {
        return sessionStorage.removeItem(key);
    } catch (ex) {
        return false;
    }
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

lord.chunk = function(array, size) {
    return array.reduce(function(res, item, index) {
        if (index % size === 0)
            res.push([]);
        res[res.length - 1].push(item);
        return res;
    }, []);
};

lord.gently = function(obj, f, options) {
    if (!obj || typeof f != "function")
        return Promise.reject("invalidArgumentsErrorText");
    var delay = options ? +options.delay : undefined;
    var n = options ? +options.n : undefined;
    var promise = options && options.promise;
    if (isNaN(delay) || delay < 1)
        delay = 1;
    if (isNaN(n) || n < 1)
        n = 1;
    return new Promise(function(resolve, reject) {
        if (lord.isArray(obj)) {
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

lord.queryAll = function(query, parent) {
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

lord.nameAll = function(name, parent) {
    return lord.queryAll("[name='" + name + "']", parent);
};

lord.nameOne = function(name, parent) {
    return lord.queryOne("[name='" + name + "']", parent);
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

lord.showDialog = function(body, options) {
    return new Promise(function(resolve, reject) {
        var buttons = ((options && options.buttons) || ["cancel", "ok"]).map(function(button) {
            if ("ok" == button) {
                return {
                    text: lord.text("confirmButtonText"),
                    click: function() {
                        resolve(true);
                        $(this).dialog("close");
                    }
                };
            } else if ("cancel" == button) {
                return {
                    text: lord.text("cancelButtonText"),
                    click: function() {
                        $(this).dialog("close");
                    }
                };
            } else if ("close" == button) {
                return {
                    text: lord.text("closeButtonText"),
                    click: function() {
                        $(this).dialog("close");
                    }
                };
            } else if (button && button.text && typeof button.action == "function") {
                return {
                    text: lord.text(button.text),
                    click: function() {
                        var result = button.action();
                        if (typeof result != "boolean")
                            return;
                        resolve(result);
                        $(this).dialog("close");
                    }
                };
            } else {
                return null;
            }
        }).filter(function(button) {
            return button;
        });
        var dlg = $(body).dialog({
            title: lord.text(options && options.title),
            modal: true,
            buttons: buttons,
            closeText: lord.text("closeButtonText"),
            width: "auto",
            maxHeight: $(window).height() - 20,
            maxWidth: $(window).width() - 40,
            close: function() {
                lord.dialogs.pop();
                resolve(false);
                $(this).dialog("destroy").remove();
            },
            create: function() {
                $("body").css({ overflow: "hidden" });
                $(".navigationButton").css({ display: "none" });
            },
            open: (options ? options.afterShow : undefined),
            beforeClose: function() {
                if (lord.dialogs.length == 1)
                    $("body").css({ overflow: "inherit" });
                if (lord.scrollHandler)
                    lord.scrollHandler();
            }
        });
        dlg.parent().find(".ui-dialog-titlebar").dblclick(function() {
            this.isMaximized = !this.isMaximized;
            if (this.isMaximized) {
                this.lastHeight = $(body).closest(".ui-dialog").height() + 8;
                this.lastWidth = $(body).closest(".ui-dialog").width() + 16;
                this.lastPosition = $(body).dialog("option", "position");
                $(body).dialog("option", "maxHeight", $(window).height());
                $(body).dialog("option", "maxWidth", $(window).width());
                $(body).dialog("option", "minHeight", $(window).height());
                $(body).dialog("option", "minWidth", $(window).width());
                $(body).dialog("option", "height", $(window).height());
                $(body).dialog("option", "width", $(window).width());
                $(body).dialog("option", "position", {
                    my: "left top",
                    at: "left top",
                    of: window
                });
            } else {
                $(body).dialog("option", "minHeight", 150);
                $(body).dialog("option", "minWidth", 150);
                $(body).dialog("option", "maxHeight", $(window).height() - 20);
                $(body).dialog("option", "maxWidth", $(window).width() - 40);
                $(body).dialog("option", "height", this.lastHeight);
                $(body).dialog("option", "width", this.lastWidth);
                $(body).dialog("option", "position", this.lastPosition);
            }
        });
        lord.dialogs.push(dlg);
    });
};

lord.activateTab = function(a) {
    if (!a)
        return;
    var tabIndex = +lord.data("index", a.parentNode);
    if (isNaN(tabIndex))
        return;
    var tab = a.parentNode;
    var header = tab.parentNode;
    var widget = lord.queryOne("div", header.parentNode);
    var page = lord.queryOne("[data-index='" + tabIndex + "']", widget);
    lord.toArray(widget.childNodes).forEach(function(node) {
        if (node.nodeType != 1) //Element
            return;
        node.style.display = ((node == page) ? "" : "none");
    });
    lord.queryAll("ul > li", header.parentNode).forEach(function(node) {
        $(node).removeClass("activated");
    });
    $(tab).addClass("activated");
};

lord.notificationsEnabled = function() {
    return lord.getLocalObject("showAutoUpdateDesktopNotifications", true);
};

lord.soundEnabled = function() {
    return lord.getLocalObject("playAutoUpdateSound", false);
};

lord.playSound = function(type) {
    type = type || "signal";
    if (["signal", "message"].indexOf(type) < 0)
        return;
    var key = "sound_" + type;
    if (!lord[key]) {
        lord[key] = lord.node("audio");
        var source = lord.node("source");
        source.type = "audio/mp3";
        source.src = "/" + lord.data("sitePathPrefix") + "audio/" + type + ".mp3";
        lord[key].volume = lord.getLocalObject("soundNotificationsVolume", 100) / 100;
        lord[key].appendChild(source);
    }
    lord[key].play();
};

lord.hash = function(hash) {
    if (typeof hash == "undefined")
        return window.location.hash.substr(1, window.location.hash.length - 1);
    hash = "" + hash;
    if (!hash && !lord.hash())
        return;
    window.location.hash = "";
    window.location.hash = hash;
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

lord.scriptWorkaround = function(parent) {
    if (!parent)
        parent = document;
    lord.queryAll("script", parent).forEach(function(script) {
        var nscript = lord.node("script");
        nscript.type = script.type;
        if (script.src)
            nscript.src = script.src;
        else if (script.innerHTML)
            nscript.innerHTML = script.innerHTML;
        script.parentNode.replaceChild(nscript, script);
    });
};

lord.addTemplate = function(name, html) {
    if (!name || !html)
        return false;
    try {
        lord.templates[name] = doT.template(html, {
            evaluate: /\{\{([\s\S]+?)\}\}/g,
            interpolate: /\{\{=([\s\S]+?)\}\}/g,
            encode: /\{\{!([\s\S]+?)\}\}/g,
            use: /\{\{#([\s\S]+?)\}\}/g,
            define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
            conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
            iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
            varname: 'it',
            strip: false,
            append: true,
            selfcontained: false
        }, lord.partials);
    } catch (err) {
        lord.handleError(err);
        return false;
    }
    return true;
};

lord._template = lord.template;

Object.defineProperty(lord, "template", {
    value: function(templateName, model, noparse) {
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
        lord.scriptWorkaround(node);
        return node;
    },
    writable: false,
    enumerable: true,
    configurable: false
}); //NOTE: A hack to prevent Underscore.js from overwriting this property

lord.createDocumentFragment = function(html) {
    var temp = document.createElement("div");
    temp.innerHTML = html;
    if (typeof document.createDocumentFragment != "function")
        return Promise.resolve(temp);
    var frag = document.createDocumentFragment();
    return new Promise(function(resolve) {
        var f = function() {
            if (!temp.firstChild)
                return resolve(frag);
            frag.appendChild(temp.firstChild);
            setTimeout(f, 0);
        };
        f();
    });
};

lord.createStylesheetLink = function(href, prefix) {
    var link = lord.node("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = (prefix ? ("/" + lord.models.base.site.pathPrefix + "css/") : "") + href;
    lord.queryOne("head").appendChild(link);
    return link;
};

lord.createScript = function(src, prefix) {
    var script = lord.node("script");
    script.type = "text/javascript";
    script.src = (prefix ? ("/" + lord.models.base.site.pathPrefix + "js/") : "") + src;
    lord.queryOne("head").appendChild(script);
    return script;
};

lord.userLevels = [
    "USER",
    "MODER",
    "ADMIN",
    "SUPERUSER"
];

lord.compareRegisteredUserLevels = function(l1, l2) {
    l1 = lord.userLevels.indexOf(l1);
    l2 = lord.userLevels.indexOf(l2);
    if (l1 < l2)
        return -1;
    else if (l1 > l2)
        return 1;
    else
        return 0;
};

lord.ratings = [
    "SFW",
    "R-15",
    "R-18",
    "R-18G"
];

lord.compareRatings = function(r1, r2) {
    r1 = lord.ratings.indexOf(r1);
    if (r1 < 0)
        r1 = 0;
    r2 = lord.ratings.indexOf(r2);
    if (r2 < 0)
        r2 = 0;
    if (r1 < r2)
        return -1;
    else if (r1 > r2)
        return 1;
    else
        return 0;
};

lord.model = function(modelName) {
    if (lord.isArray(modelName)) {
        var models = modelName.map(function(modelName) {
            return lord.model(modelName);
        });
        var model = (models.length > 0) ? merge.clone(models[0]) : {};
        models.slice(1).forEach(function(m) {
            model = merge.recursive(model, m);
        });
        return model;
    } else {
        var match = modelName.match(/^board\/(\S+)$/);
        var model;
        if (match) {
            var boards = lord.models["boards"].boards;
            for (var i = 0; i < boards.length; ++i) {
                if (match[1] == boards[i].name)
                    return { board: boards[i] };
            }
            model = lord.models["boards"].boards[match[1]];
        } else {
            model = lord.models[modelName];
        }
        if (!model)
            return model;
        var settings = lord.settings();
        var base = lord.models.base;
        var locale = base.site.locale;
        var dateFormat = base.site.dateFormat;
        var timeOffset = base.site.timeOffset;
        model.settings = settings;
        model.compareRegisteredUserLevels = lord.compareRegisteredUserLevels.bind(lord);
        model.hasOwnProperties = lord.hasOwnProperties.bind(lord);
        model.formattedDate = function(date) {
            return moment(date).utcOffset(timeOffset).locale(locale).format(dateFormat);
        };
        var maxLevel = lord.toArray(lord.models.base.user.levels).sort(function() {
            return -1 * lord.compareRegisteredUserLevels(arguments);
        });
        maxLevel = (maxLevel.length > 0) ? maxLevel[0] : null;
        var test = function(level, boardName, strict) {
            var lvl;
            if (boardName && typeof boardName != "boolean") {
                lvl = lord.models.base.user.levels[boardName];
            } else {
                lvl = maxLevel;
                strict = boardName;
            }
            if (strict)
                return !lord.compareRegisteredUserLevels(lvl, level);
            else
                return lord.compareRegisteredUserLevels(lvl, level) >= 0;
        };
        if (!model.user)
            model.user = {};
        model.user.vkAuth = lord.getCookie("vkAuth", "");
        model.user.level = function(boardName) {
            if (!boardName)
                return maxLevel;
            return lord.models.base.user.levels[boardName] || null;
        };
        model.hasPermission = function(board, permission) {
            if (!permission || !board || !board.permissions.hasOwnProperty(permission))
                return false;
            return lord.compareRegisteredUserLevels(model.user.level(board.name), board.permissions[permission]) >= 0;
        };
        var levelMap = {
            User: "USER",
            Moder: "MODER",
            Admin: "ADMIN",
            Superuser: "SUPERUSER"
        };
        lord.each(levelMap, function(lvl, key) {
            model.user["is" + key] = test.bind(model.user, lvl);
        });
        model.customPostBodyPart = lord.customPostBodyPart;
        model.customPostHeaderPart = lord.customPostHeaderPart;
        model.password = lord.getLocalObject("password", "");
        return model;
    }
};

lord.get = function(what, enableCache) {
    var xhr = new XMLHttpRequest();
    if (!enableCache)
        what += ((what.indexOf("?") >= 0) ? "&" : "?") + "_random_=" + Math.random();
    xhr.open("get", what, false);
    xhr.send(null);
    if (xhr.status === 200)
        return xhr.responseText;
    return null;
};

lord.api = function(entity, parameters, prefix) {
    prefix = prefix || "api";
    var query = "";
    lord.each(parameters, function(val, key) {
        if (!lord.isArray(val))
            val = [val];
        val.forEach(function(val) {
            if (query)
                query += "&";
            query += (key + "=" + val);
        });
    });
    query = (query ? "?" : "") + query;
    return new Promise(function(resolve, reject) {
        $.ajax({
            url: "/" + lord.data("sitePathPrefix") + prefix + "/" + entity + ".json" + query,
            dataType: "json",
            cache: lord.getLocalObject("apiRequestCachingEnabled", false)
        }).then(function(result) {
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

lord._now = lord.now;

Object.defineProperty(lord, "now", {
    value: function() {
        return new Date();
    },
    writable: false,
    enumerable: true,
    configurable: false
}); //NOTE: A hack to prevent Underscore.js from overwriting this property

lord.settings = function() {
    return {
        deviceType: lord.getLocalObject("deviceType", "auto"),
        time: lord.getLocalObject("time", "server"),
        timeZoneOffset: lord.getLocalObject("timeZoneOffset", -lord.now().getTimezoneOffset()),
        captchaEngine: { id: lord.getLocalObject("captchaEngine", "node-captcha") },
        style: { name: lord.getLocalObject("style", "photon") },
        codeStyle: { name: lord.getLocalObject("codeStyle", "default") },
        shrinkPosts: lord.getLocalObject("shrinkPosts", true),
        useWebSockets: lord.getLocalObject("useWebSockets", true),
        markupMode: lord.getLocalObject("markupMode", "EXTENDED_WAKABA_MARK,BB_CODE"),
        stickyToolbar: lord.getLocalObject("stickyToolbar", true),
        maxAllowedRating: lord.getLocalObject("maxAllowedRating", "R-18G"),
        hidePostformRules: lord.getLocalObject("hidePostformRules", false),
        minimalisticPostform: lord.getLocalObject("minimalisticPostform", lord.deviceType("mobile")),
        hiddenBoards: lord.getLocalObject("hiddenBoards", []),
        autoUpdateThreadsByDefault: lord.getLocalObject("autoUpdateThreadsByDefault", false),
        autoUpdateInterval: lord.getLocalObject("autoUpdateInterval", 15),
        showAutoUpdateDesktopNotifications: lord.getLocalObject("showAutoUpdateDesktopNotifications", true),
        playAutoUpdateSound: lord.getLocalObject("playAutoUpdateSound", false),
        soundNotificationsVolume: lord.getLocalObject("soundNotificationsVolume", 100),
        addExpander: lord.getLocalObject("addExpander", true),
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
        ihashDistance: lord.getLocalObject("ihashDistance", 15),
        showNewPosts: lord.getLocalObject("showNewPosts", true),
        hotkeysEnabled: lord.getLocalObject("hotkeysEnabled", true),
        userCssEnabled: lord.getLocalObject("userCssEnabled", true),
        userJavaScriptEnabled: lord.getLocalObject("userJavaScriptEnabled", true),
        sourceHighlightingEnabled: lord.getLocalObject("sourceHighlightingEnabled", false),
        chatEnabled: lord.getLocalObject("chatEnabled", true),
        drawingEnabled: lord.getLocalObject("drawingEnabled", true),
        autoUpdatePlayer: lord.getLocalObject("autoUpdatePlayer", !lord.deviceType("mobile")),
        resetFileScaleOnOpening: lord.getLocalObject("resetFileScaleOnOpening", false),
        closeFilesByClickingOnly: lord.getLocalObject("closeFilesByClickingOnly", false),
        viewPostPreviewDelay: lord.getLocalObject("viewPostPreviewDelay", 200),
        hidePostPreviewDelay: lord.getLocalObject("hidePostPreviewDelay", 1000),
        infiniteScroll: lord.getLocalObject("infiniteScroll", lord.deviceType("mobile")),
        apiRequestCachingEnabled: lord.getLocalObject("apiRequestCachingEnabled", false),
        bannersMode: lord.getLocalObject("bannersMode", "random")
    };
};

lord.setSettings = function(model) {
    if (!model)
        return;
    lord.each(model, function(val, key) {
        lord.setLocalObject(key, val);
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
            switch (error.status) {
            case 400:
            case 404:
            case 408:
            case 413:
            case 429: //DDoS
            case 500:
            case 502:
            case 503:
            case 504:
            case 520: //CloudFlare
            case 521: //CloudFlare
            case 522: //CloudFlare
            case 523: //CloudFlare
            case 524: //CloudFlare
            case 525: //CloudFlare
            case 526: //CloudFlare
            text = lord.text("error" + error.status + "Text") + " (" + error.status + ")";
                break;
            default:
                if (0 == error.readyState)
                    text = lord.text("error0Text");
                break;
            }
        } else {
            text = lord.text(error);
        }
    } else {
        text = lord.text("errorUnknownText");
    }
    lord.showPopup(text, {type: "critical"});
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

lord.series = function(arr, f, container) {
    if (container && typeof container != "object")
        container = [];
    var isArray = lord.isArray(container);
    var isObject = (typeof container == "object");
    var p = Promise.resolve();
    if (lord.isArray(arr)) {
        arr.forEach(function(el) {
            p = p.then(function() {
                return f(el);
            }).then(function(result) {
                if (isArray)
                    container.push(result);
                else if (isObject)
                    container[el] = result;
            });
        });
    } else if (lord.isObject(arr)) {
        lord.each(arr, function(el, key) {
            p = p.then(function() {
                return f(el, key);
            }).then(function(result) {
                if (isArray)
                    container.push(result);
                else if (isObject)
                    container[key] = result;
            });
        });
    }
    if (!container)
        return p;
    return p.then(function() {
        return Promise.resolve(container);
    });
};

lord.prompt = function(options) {
    var div = lord.node("div");
    if (options && options.label) {
        div.appendChild(lord.node("text"), lord.text(options.label));
        div.appendChild(lord.node("br"));
    }
    var inp;
    switch (options && options.type) {
    case "password":
        inp = lord.node("input");
        inp.type = "password";
        break;
    case "textarea":
        inp = lord.node("textarea");
        break;
    case "input":
    default:
        inp = lord.node("input");
        inp.type = "text";
        break;
    }
    if (options && options.readOnly)
        inp.readOnly = true;
    if (options && options.value)
        inp.value = options.value;
    var style = {
        boxSizing: "border-box",
        width: "100%"
    };
    if (options && typeof options.style == "object")
        style = merge(style, options.style);
    $(inp).css(style);
    div.appendChild(inp);
    return lord.showDialog(div, {
        title: options && options.title,
        afterShow: function() {
            if (!options || typeof options.select == "undefined" || options.select)
                inp.select();
        },
        buttons: ((options && options.readOnly) ? ["close"] : ["cancel", "ok"])
    }).then(function(result) {
        if (!result)
            return Promise.resolve({ accepted: false });
        return Promise.resolve({
            accepted: true,
            value: inp.value
        });
    });
};

lord.detectSwipe = function(el, callback) {
    if (typeof callback != "function")
        return;
    (function() {
        var touches = {};
        if (typeof el == "string")
            el = lord.queryOne(el);
        else if (el.selector)
            el = el[0];
        else if (typeof el != "object")
            return;
        el.addEventListener("touchstart", function(e) {
            lord.toArray(e.changedTouches).forEach(function(t) {
                if (!touches[t.identifier]) {
                    touches[t.identifier] = {
                        touchstartX: t.pageX,
                        touchstartY: t.pageY,
                        touchendX: t.pageX,
                        touchendY: t.pageY
                    };
                }
            });
        }, false);
        el.addEventListener("touchend", function(e) {
            lord.toArray(e.changedTouches).forEach(function(t) {
                if (!touches[t.identifier])
                    return;
                var tt = touches[t.identifier];
                tt.touchendX = t.pageX;
                tt.touchendY = t.pageY;
                var types = [];
                if (tt.touchendX < tt.touchstartX)
                    types.push("swipeleft");
                if (tt.touchendX > tt.touchstartX)
                    types.push("swiperight");
                if (tt.touchendY > tt.touchstartY)
                    types.push("swipedown");
                if (tt.touchendY < tt.touchstartY)
                    types.push("swipeup");
                if (tt.touchendX == tt.touchstartX && tt.touchendY == tt.touchstartY)
                    types.push("tap");
                callback({
                    startX: tt.touchstartX,
                    startY: tt.touchstartY,
                    endX: tt.touchendX,
                    endY: tt.touchendY,
                    distanceX: tt.touchendX - tt.touchstartX,
                    distanceY: tt.touchendY - tt.touchstartY,
                    types: types
                });
                delete touches[t.identifier];
            });
        }, false);
    })();
};

lord.getWords = function(text) {
    if (typeof text != "string")
        return [];
    return text.replace(/\s+/g, " ").replace(new XRegExp("[^\\p{L} ]", "gi"), "").trim().substring(0, 800).split(" ");
};
