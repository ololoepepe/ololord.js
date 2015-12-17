var Database = require("../helpers/database");
var Global = require("../helpers/global");

module.exports = function(req, res, next) {
    Database.registeredUser(req.hashpass).then(function(user) {
        if (user) {
            req.level = user.level;
            req.boards = user.boards;
        }
        next();
    }).catch(function(err) {
        Global.error(err.stack || err);
        next();
    });
};
