var SockJS = require("sockjs");
var Util = require("util");

var config = require("./config");
var Global = require("./global");
var OnlineCounter = require("./online-counter");
var Tools = require("./tools");

var sendMessage = function(type, data) {
    if (!this)
        return;
    this.write(JSON.stringify({
        type: type,
        data: data
    }));
};

module.exports = function(server) {
    var ddosProtection = config("server.ddosProtection.enabled", true);
    var connectionLimit = config("server.ddosProtection.ws.connectionLimit", 10);
    var maxMessageLength = config("server.ddosProtection.ws.maxMessageLength", 20480);
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
    var connectionCount = {};
    var connectionsIP = {};
    var connectionsHashpass = {};
    this.connectionsIP = connectionsIP;
    this.connectionsHashpass = connectionsHashpass;
    var handlers = {};
    this.handlers = handlers;
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
        Object.defineProperty(conn, "ip", { value: trueIp });
        OnlineCounter.alive(conn.ip);
        if (ddosProtection) {
            var count = (connectionCount[conn.ip] || 0) + 1;
            if (count > connectionLimit) {
                Global.error("DDoS detected (WebSocket/connection):",
                    Tools.preferIPv4(conn.ip), count, connectionLimit);
                return conn.end();
            }
            connectionCount[conn.ip] = count;
        }
        Object.defineProperty(conn, "ws", { value: this });
        conn.sendMessage = sendMessage;
        conn.on("data", function(message) {
            OnlineCounter.alive(conn.ip);
            if (ddosProtection && message.length > maxMessageLength) {
                Global.error("DDoS detected (WebSocket/message):",
                    Tools.preferIPv4(conn.ip), message.length, maxMessageLength);
                return conn.end();
            }
            try {
                message = JSON.parse(message);
            } catch (ex) {
                message = {};
            }
            switch (message.type) {
            case "init":
                if (connectionsIP.hasOwnProperty(conn.ip))
                    connectionsIP[conn.ip].push(conn);
                else
                    connectionsIP[conn.ip] = [conn];
                if (message.data && message.data.hashpass) {
                    Object.defineProperty(conn, "hashpass", { value: message.data.hashpass });
                    if (connectionsHashpass.hasOwnProperty(conn.hashpass))
                        connectionsHashpass[conn.hashpass].push(conn);
                    else
                        connectionsHashpass[conn.hashpass] = [conn];
                }
                conn.sendMessage(message.type);
                break;
            default:
                var handler = handlers[message.type];
                if (!handler) {
                    Global.error("Unknown WebSocket message type:", Tools.preferIPv4(conn.ip), message.type);
                    break;
                }
                var replyData = function(data) {
                    conn.write(JSON.stringify({
                        id: message.id,
                        type: message.type,
                        data: data
                    }));
                };
                var replyErr = function(err) {
                    conn.write(JSON.stringify({
                        id: message.id,
                        type: message.type,
                        error: error
                    }));
                };
                try {
                    var p = handler(message, conn);
                    if (p && typeof p.then == "function" && typeof p.catch == "function") {
                        p.then(function(data) {
                            try {
                                replyData(data);
                            } catch (ex) {
                                //Do nothing
                            }
                        }).catch(function(err) {
                            Global.error("WebSocket:", Tools.preferIPv4(conn.ip), message.type, err.stack || err);
                            try {
                                replyErr(err);
                            } catch (ex) {
                                //Do nothing
                            }
                        });
                    } else {
                        try {
                            replyData(p);
                        } catch (ex) {
                            //Do nothing
                        }
                    }
                } catch (ex) {
                    Global.error("WebSocket:", Tools.preferIPv4(conn.ip), message.type, ex.stack || ex);
                    try {
                        replyErr(err);
                    } catch (ex) {
                        //Do nothing
                    }
                }
                break;
            }
        });
        conn.on("close", function() {
            if (ddosProtection)
                --connectionCount[conn.ip];
            if (connectionsIP.hasOwnProperty(conn.ip)) {
                var list = connectionsIP[conn.ip];
                list.some(function(c, i) {
                    if (c == conn)
                        list.splice(i, 1);
                    if (list.length < 1)
                        delete connectionsIP[conn.ip];
                });
            }
            if (conn.hashpass && connectionsHashpass.hasOwnProperty(conn.hashpass)) {
                var list = connectionsHashpass[conn.hashpass];
                list.some(function(c, i) {
                    if (c == conn)
                        list.splice(i, 1);
                    if (list.length < 1)
                        delete connectionsHashpass[conn.ip];
                });
            }
        });
    });
    this.wsserver.installHandlers(this.server, { prefix: "/ws" });
};

module.exports.prototype.installHandler = function(type, handler) {
    this.handlers[type] = handler;
};

module.exports.prototype.sendMessage = function(type, data, ips, hashpasses) {
    if (!type)
        return;
    if (!Util.isArray(ips))
        ips = [ips];
    if (!Util.isArray(hashpasses))
        hashpasses = [hashpasses];
    var message = JSON.stringify({
        type: type,
        data: data
    });
    var connectionsIP = this.connectionsIP;
    ips.forEach(function(ip) {
        if (!ip)
            return;
        var list = connectionsIP[ip];
        if (!list)
            return;
        list.forEach(function(conn) {
            conn.write(message);
        });
    });
    var connectionsHashpass = this.connectionsHashpass;
    hashpasses.forEach(function(hashpass) {
        if (!hashpass)
            return;
        var list = connectionsHashpass[hashpass];
        if (!list)
            return;
        list.forEach(function(conn) {
            conn.write(message);
        });
    });
};
