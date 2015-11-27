var Captcha = require("../captchas");
var markup = require("../helpers/markup");
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
    req.ascetic = ("ascetic" == mode);
    var style = (req.cookies.style || "photon");
    if (!styles[style])
        style = "photon";
    var codeStyle = (req.cookies.codeStyle || "agate");
    if (!codeStyles[codeStyle])
        codeStyle = "agate";
    req.hashpass = Tools.hashpass(req);
    req.vkAuth = ("true" == req.cookies.vkAuth);
    var captchaEngine = Captcha.captcha(req.cookies.captchaEngine);
    var defMarkupMode = markup.MarkupModes.ExtendedWakabaMark + "," + markup.MarkupModes.BBCode;
    var timeZoneOffset = +req.cookies.timeZoneOffset;
    if (isNaN(timeZoneOffset) || timeZoneOffset < -720 || timeZoneOffset > 840)
        timeZoneOffset = 0;
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
        maxAllowedRating: (req.cookies.maxAllowedRating || "R-18G"),
        hiddenBoards: (req.cookies.hiddenBoards ? req.cookies.hiddenBoards.split("|") : []),
        captchaEngine: (captchaEngine || Captcha.captcha("google-recaptcha")),
        markupMode: (req.cookies.markupMode || defMarkupMode),
        time: (["server", "local"].indexOf(req.cookies.time) >= 0) ? req.cookies.time : "server",
        timeZoneOffset: timeZoneOffset,
        draftsByDefault: (req.cookies.draftsByDefault == "true"),
        hidePostformRules: (req.cookies.hidePostformRules == "true"),
        minimalisticPostform: (req.cookies.minimalisticPostform == "true")
    };
    next();
};
