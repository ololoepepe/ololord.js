var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    var modes = {
        normal: "Normal" //TODO
    };
    var styles = {
        photon: "Photon"
    };
    var mode = (req.cookies.mode || "normal");
    if (!modes[mode])
        mode = "normal";
    var style = (req.cookies.style || "photon");
    if (!styles[style])
        style = "photon";
    req.hashpass = Tools.hashpass(req);
    req.mode = {
        name: mode,
        title: modes[mode]
    };
    req.style = {
        name: style,
        title: styles[style]
    };
    req.maxAllowedRating = req.cookies.maxAllowedRating || "R-18G";
    req.shrinkPosts = (req.cookies.shrinkPosts == "true");
    next();
};
