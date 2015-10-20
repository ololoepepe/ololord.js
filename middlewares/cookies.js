var Captcha = require("../captchas");
var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    var modes = {
        normal: Tools.translate("Normal"),
        ascetic: Tools.translate("Ascetic")
    };
    var styles = {
        photon: "Photon",
        neutron: "Neutron",
        burichan: "Burichan",
        futaba: "Futaba"
    };
    var mode = (req.cookies.mode || "normal");
    if (!modes[mode])
        mode = "normal";
    var style = (req.cookies.style || "photon");
    if (!styles[style])
        style = "photon";
    req.hashpass = Tools.hashpass(req);
    var captchaEngine = Captcha.captcha(req.cookies.captchaEngine);
    req.settings = {
        mode: {
            name: mode,
            title: modes[mode]
        },
        style: {
            name: style,
            title: styles[style]
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
