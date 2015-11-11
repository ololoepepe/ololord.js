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
        lord.getModel("misc/tr").then(function(model) {
            lord.removeChildren(_this.cancelButton);
            _this.cancelButton.appendChild(lord.node("text", model.tr.cancelButtonText));
        });
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
    }
};

/*public*/ lord.OverlayProgressBar.prototype.progress = function(value) {
    value = +value;
    if (isNaN(value) || value < 0 || value > this.max)
        return;
    this.value = value;
    this.progressBar.value = value;
    if (value == this.max)
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

/*public*/ lord.OverlayProgressBar.prototype.hide = function() {
    if (!this.visible)
        return;
    this.visible = false;
    if (this.cancelButton)
        document.body.removeChild(this.cancelButton);
    document.body.removeChild(this.progressBar);
    document.body.removeChild(this.mask);
};

/*Constants*/

lord.Second = 1000;
lord.Minute = 60 * lord.Second;
lord.Hour = 60 * lord.Minute;
lord.Day = 24 * lord.Hour;
lord.Year = 365 * lord.Day;
lord.Billion = 2 * 1000 * 1000 * 1000;
lord.SettingsStoredInCookies = ["mode", "style", "codeStyle", "stickyToolbar", "shrinkPosts", "markupMode",
                                "time", "timeZoneOffset", "captchaEngine", "maxAllowedRating",
                                "draftsByDefault", "hidePostformRules", "minimalisticPostform", "hiddenBoards"];

/*Variables*/

lord.popups = [];
lord.unloading = false;
lord.leftChain = [];
lord.rightChain = [];
lord._ajaxRequestQueue = [];
lord._ajaxRequestActive = 0;
lord.models = {};
lord.partials = null;
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
                for (var i = ind; i < Math.min(ind + n, arr.length); ++i)
                    f(arr[i], i);
                ind += n;
                setTimeout(g, delay);
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
                for (var i = ind; i < Math.min(ind + n, arr.length); ++i)
                    f(arr[i].value, arr[i].key);
                ind += n;
                setTimeout(g, delay);
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

lord.text = function(id) {
    var input = lord.id(id);
    return input ? input.value : "";
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
        var notification = new Notification(title, {
            "body": body,
            "icon": icon
        });
    });
};

lord.showDialog = function(title, label, body, afterShow) {
    return lord.getModel("misc/tr").then(function(model) {
        var root = lord.node("div");
        title = model.tr[title];
        label = model.tr[label];
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
            cancel.appendChild(lord.node("text", model.tr.cancelButtonText));
            div2.appendChild(cancel);
            var ok = lord.node("button");
            ok.onclick = function() {
                resolve(true);
                dialog.close();
            };
            ok.appendChild(lord.node("text", model.tr.confirmButtonText));
            div2.appendChild(ok);
            root.appendChild(div2);
            dialog = picoModal({
                "content": root,
                "modalStyles": function (styles) {
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
    });
};

lord.ajaxRequest = function(method, params, id, callback, errorCallback) {
    var req = {
        "method": method,
        "params": params,
        "id": id,
        "callback": callback,
        "errorCallback": errorCallback
    };
    var f = function() {
        if (lord._ajaxRequestQueue.length < 1)
            return;
        ++lord._ajaxRequestActive;
        var req = lord._ajaxRequestQueue.shift();
        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        var prefix = lord.text("sitePathPrefix");
        xhr.open("post", "/" + prefix + "api");
        xhr.setRequestHeader("Content-Type", "application/json");
        var request = {
            "method": req.method,
            "params": req.params,
            "id": req.id
        };
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    var response = JSON.parse(xhr.responseText);
                    var err = response.error;
                    if (!!err) {
                        var show = true;
                        for (var i = 0; i < lord.popups.length; ++i) {
                            if (lord.popups[i].text == err) {
                                show = false;
                                break;
                            }
                        }
                        if (show)
                            lord.showPopup(err, {type: "critical"});
                        --lord._ajaxRequestActive;
                        f();
                        if (typeof req.errorCallback == "function")
                            req.errorCallback(err);
                        return;
                    }
                    --lord._ajaxRequestActive;
                    f();
                    if (typeof req.callback == "function")
                        req.callback(response.result);
                } else {
                    if (!lord.unloading) {
                        var text = lord.text("ajaxErrorText") + " " + xhr.status;
                        switch (+xhr.status) {
                        case 413:
                            text = lord.text("error" + xhr.status + "Text");
                            break;
                        default:
                            break;
                        }
                        var show = true;
                        for (var i = 0; i < lord.popups.length; ++i) {
                            if (lord.popups[i].text == text) {
                                show = false;
                                break;
                            }
                        }
                        if (show)
                            lord.showPopup(text, {type: "critical"});
                        --lord._ajaxRequestActive;
                        f();
                        if (typeof req.errorCallback == "function")
                            req.errorCallback(text);
                    }
                }
            }
        };
        xhr.send(JSON.stringify(request));
    };
    lord._ajaxRequestQueue.push(req);
    var ms = lord.getLocalObject("maxSimultaneousAjax", 2);
    if (isNaN(ms) || ms <= 0)
        ms = 2;
    if (lord._ajaxRequestActive < ms)
        f();
    if (lord._ajaxRequestActive < ms)
        f();
};

lord.isHashpass = function(s) {
    return !!s.match(/([0-9a-fA-F]{8}\-){4}[0-9a-fA-F]{8}/g);
};

lord.toHashpass = function(s) {
    if (!s)
        return "";
    var hash = CryptoJS.SHA1(s).toString(CryptoJS.enc.Hex);
    var parts = hash.match(/.{1,8}/g);
    return parts.join("-");
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

lord.getImageBase64Data = function(img) {
    if (!img)
        return null;
    var canvas = lord.node("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    var dataURL = canvas.toDataURL("image/png");
    return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
};

lord.base64ToArrayBuffer = function(base64) {
    var binaryString = atob(base64);
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++)
        bytes[i] = binaryString.charCodeAt(i);
    return bytes.buffer;
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
    return lord.getLocalObject("showAutoUpdateDesktopNotifications", false);
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

lord.getTemplate = function(templateName) {
    var prefix = lord.data("sitePathPrefix");
    return new Promise(function(resolve, reject) {
        if (lord.templates.hasOwnProperty(templateName))
            return resolve(lord.templates[templateName]);
        var f = function() {
            $.ajax("/" + prefix + "templates/" + templateName + ".jst").then(function(result) {
                var template = doT.template(result, {
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
                lord.templates[templateName] = template;
                resolve(template);
            });
        };
        if (lord.partials) {
            f();
        } else {
            $.ajax("/" + prefix + "misc/partials.json").then(function(list) {
                var promises = list.map(function(partialName) {
                    return $.ajax("/" + prefix + "templates/partials/" + partialName + ".jst").then(function(result) {
                        return {
                            data: result,
                            name: partialName
                        };
                    });
                });
                return Promise.all(promises);
            }).then(function(partials) {
                lord.partials = {};
                partials.forEach(function(partial) {
                    lord.partials[partial.name] = partial.data;
                });
                f();
            }).catch(function(err) {
                reject(err);
            });
        }
    });
};

lord.getModel = function(modelName, query) {
    if (Array.isArray(modelName)) {
        var promises = modelName.map(function(modelName) {
            if (typeof modelName == "string")
                return lord.getModel(modelName);
            else
                return lord.getModel(modelName.name, modelName.query);
        });
        return Promise.all(promises).then(function(models) {
            if (query) {
                var model = (models.length > 0) ? merge.clone(models[0]) : {};
                for (var i = 1; i < models.length; ++i)
                    model = merge.recursive(model, models[i]);
                return Promise.resolve(model);
            } else {
                return Promise.resolve(models);
            }
        });
    } else {
        var cache = !query || (typeof query != "boolean" && typeof query != "string");
        query = (query && typeof query == "string") ? ("?" + query) : "";
        return new Promise(function(resolve, reject) {
            if (!query && lord.models.hasOwnProperty(modelName)) {
                resolve(lord.models[modelName]);
            } else {
                $.ajax("/" + lord.data("sitePathPrefix") + modelName + ".json" + query).then(function(result) {
                    if (cache)
                        lord.models[modelName] = result;
                    resolve(result);
                }).catch(function(err) {
                    reject(err);
                });
            }
        });
    }
};

lord.now = function() {
    return new Date();
};

lord.settings = function() {
    return {
        mode: {
            name: lord.getCookie("mode", "normal")
        },
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
        draftsByDefault: (lord.getCookie("draftsByDefault", "false") == "true"),
        hidePostformRules: (lord.getCookie("hidePostformRules", "false") == "true"),
        minimalisticPostform: (lord.getCookie("minimalisticPostform", "false") == "true"),
        hiddenBoards: lord.getCookie("hiddenBoards", "").split("|"),
        autoUpdateThreadsByDefault: lord.getLocalObject("autoUpdateThreadsByDefault", false),
        autoUpdateInterval: lord.getLocalObject("autoUpdateInterval", 15),
        showAutoUpdateTimer: lord.getLocalObject("showAutoUpdateTimer", true),
        showAutoUpdateDesktopNotifications: lord.getLocalObject("showAutoUpdateDesktopNotifications", true),
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
        hidePostformMarkup: lord.getLocalObject("hidePostformMarkup", false),
        stripExifFromJpeg: lord.getLocalObject("stripExifFromJpeg", true),
        hideTripcodes: lord.getLocalObject("hideTripcodes", false),
        hideUserNames: lord.getLocalObject("hideUserNames", false),
        strikeOutHiddenPostLinks: lord.getLocalObject("strikeOutHiddenPostLinks", true),
        spellsEnabled: lord.getLocalObject("spellsEnabled", true),
        maxSimultaneousAjax: lord.getLocalObject("maxSimultaneousAjax", 2),
        showNewPosts: lord.getLocalObject("showNewPosts", true),
        showYoutubeVideosTitles: lord.getLocalObject("showYoutubeVideosTitles", true),
        hotkeysEnabled: lord.getLocalObject("hotkeysEnabled", true),
        userCssEnabled: lord.getLocalObject("userCssEnabled", true)
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
