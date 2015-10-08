var dot = require("dot");
var FS = require("q-io/fs");
var Localize = require("localize");
var merge = require("merge");
var Promise = require("promise");
var promisify = require("promisify-node");

var Board = require("../boards/board");
var Cache = require("./cache");
var config = require("./config");
var Tools = require("./tools");

var loc = new Localize(__dirname);
loc.setLocale(config("site.locale", "en"));
var partials = {};

var controller = function(req, templateName, modelData) {
    var baseModelData = {
        site: {
            protocol: config("site.protocol", "http"),
            domain: config("site.domain", "localhost:8080"),
            pathPrefix: config("site.pathPrefix", "")
        },
        user: {
            ip: req.ip,
            level: req.level
        },
        cookies: {
            mode: req.mode
        },
        deviceType: ((req.device.type == "desktop") ? "desktop" : "mobile")
    };
    if (!modelData)
        modelData = {};
    var template = Cache.get("template/" + templateName, "");
    if (template)
        return Promise.resolve(template(merge.recursive(baseModelData, modelData)));
    return FS.read(__dirname + "/../views/" + templateName + ".jst").then(function(data) {
        return Promise.resolve(dot.template(data, null, partials));
    }).then(function(template) {
        Cache.set("template/" + templateName, template);
        return Promise.resolve(template(merge.recursive(baseModelData, modelData)));
    });
};

controller.translationsModel = function() {
    return {
        toPlaylistPageText: loc.translate("Playlist"),
        toMarkupPageText: loc.translate("Markup"),
        toHomePageText: loc.translate("Home"),
        framedVersionText: loc.translate("Framed version"),
        toFaqPageText: loc.translate("F.A.Q."),
        toManagePageText: loc.translate("User management"),
        kbps: loc.translate("kbps"),
        unknownAlbum: loc.translate("Unknown album"),
        unknownArtist: loc.translate("Unknown artist"),
        unknownTitle: loc.translate("Unknown title")
    };
};

controller.headModel = function(board, req) {
    return {
        title: board.title,
        style: {
            name: "photon",
            title: "Photon"
        },
        mode: {
            name: "normal",
            title: "Normal"
        }
    };
};

controller.navbarModel = function() {
    return {
        boards: Board.boardInfos()
    };
};

controller.initialize = function() {
    var promises = ["boardScripts", "head", "navbar", "post", "postFile", "postReference"].map(function(partial) {
        FS.read(__dirname + "/../views/partials/" + partial + ".jst").then(function(data) {
            partials[partial] = data;
            return Promise.resolve();
        });
    });
    return Promise.all(promises);
};

module.exports = controller;
