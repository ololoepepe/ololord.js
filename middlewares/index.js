var cookieParser = require("cookie-parser");
var DDoS = require("ddos");
var device = require("express-device");
var express = require("express");

var burst = 6;
var limit = burst * 6;
var ddos = new DDoS({
    maxcount: (limit * 1.5),
    burst: burst,
    limit: limit,
    maxexpiry: 60,
    checkinterval: 1,
    silentStart: true,
    errormessage: "<html><head></head><body><img src='http://i3.kym-cdn.com/photos/images/masonry/000/112/322/130221984383.png' /></body></html>"
});

module.exports = [
    require("./ip-fix"),
    express.static(__dirname + "/../public"),
    /*function(req, res, next) {
        console.log(req.path);
        next();
    },*/
    ddos.express,
    cookieParser(),
    device.capture(),
    require("./cookies"),
    require("./registered-user")
];
