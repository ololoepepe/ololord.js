var Database = require("../helpers/database");

module.exports = function(req, res, next) {
    Database.registeredUser(req.hashpass).then(function(user) {
        if (user) {
            req.level = user.level;
            req.boards = user.boards;
        }
        next();
    }).catch(function(err) {
        console.log(err.stack || err);
        next();
    });
};
