var SockJS = require("sockjs");

var config = require("./config");
var Global = require("./global");
var Tools = require("./tools");

module.exports = function(server) {
    this.server = server;
    var sockJSURL = config("site.protocol", "http") + "://" + config("site.domain", "localhost:8080") + "/"
        + config("site.pathPrefix", "") + "js/3rdparty/sockjs-1.1.0.min.js";
    this.wsserver = SockJS.createServer({
        sockjs_url: sockJSURL,
        log: function(severity, message) {
            switch (severity) {
            case "error":
                Global.error(message);
                break;
            case "debug":
            case "info":
            default:
                break;
            }
        }
    });
    this.wsserver.on("connection", function(conn) {
        var trueIp = Tools.correctAddress(conn.remoteAddress);
        if (!trueIp)
            return conn.end();
        if (config("system.detectRealIp", true)) {
            var ip = conn.headers["x-forwarded-for"];
            if (!ip)
                ip = conn.headers["x-client-ip"];
            if (ip) {
                var address = Tools.correctAddress(ip);
                if (!address)
                    return conn.end();
                trueIp = address;
            }
        }
        if (config("system.useXRealIp", false)) {
            var ip = conn.headers["x-real-ip"];
            var address = Tools.correctAddress(ip);
            if (!address)
                return conn.end();
            trueIp = address;
        }
        console.log("conn", trueIp, conn.protocol);
        Object.defineProperty(conn, "ip", { value: trueIp });
        conn.on("data", function(message) {
            try {
                message = JSON.parse(message);
            } catch (ex) {
                message = {};
            }
            console.log("message", message);
            switch (message.type) {
            case "ping":
            case "init": //TODO
                setTimeout(function() {
                    conn.write("pong");
                }, 100);
                break;
            default:
                break;
            }
        });
        conn.on("close", function() {});
    });
    this.wsserver.installHandlers(this.server, { prefix: "/ws" });
};
