var Captcha = require("../captchas");
var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    var modes = {
        normal: {},
        ascetic: {}
    };
    var styles = {
        photon: {},
        neutron: {},
        burichan: {},
        futaba: {}
    };
    var codeStyles = Tools.codeStyles().reduce(function(acc, style) {
        acc[style.name] = {};
        return acc;
    }, {});
    var mode = (req.cookies.mode || "normal");
    if (!modes[mode])
        mode = "normal";
    var style = (req.cookies.style || "photon");
    if (!styles[style])
        style = "photon";
    var codeStyle = (req.cookies.codeStyle || "agate");
    if (!codeStyles[codeStyle])
        codeStyle = "agate";
    req.hashpass = Tools.hashpass(req);
    var captchaEngine = Captcha.captcha(req.cookies.captchaEngine);
    req.settings = {
        mode: {
            name: mode
        },
        style: {
            name: style
        },
        codeStyle: {
            name: codeStyle
        },
        shrinkPosts: (req.cookies.shrinkPosts != "false"),
        stickyToolbar: (req.cookies.stickyToolbar != "false"),
        captchaEngine: {
            id: (req.cookies.captchaEngine || "google-recaptcha")
        },
        maxAllowedRating: (req.cookies.maxAllowedRating || "R-18G"),
        hiddenBoards: (req.cookies.hiddenBoards ? req.cookies.hiddenBoards.split("|") : []),
        captchaEngine: (captchaEngine || Captcha.captcha("google-recaptcha"))
    };
    next();
};
