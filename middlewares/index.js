module.exports = function(app) {
    app.use([require("./cookies")]);
    app.use([require("./registered-user")]);
};
