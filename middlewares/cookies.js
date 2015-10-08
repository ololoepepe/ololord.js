var Tools = require("../helpers/tools");

module.exports = function(req, res, next) {
    req.hashpass = Tools.hashpass(req);
    req.mode = req.cookies.mode || "normal";
    req.maxAllowedRating = req.cookies.maxAllowedRating || "R-18G";
    next();
};
