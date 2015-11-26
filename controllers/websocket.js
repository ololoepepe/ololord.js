var Crypto = require("crypto");
var express = require("express");

var config = require("../helpers/config");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

var hashpassMap = {};
var ipMap = {};
var hashMap = {};
var hashMapRev = {};

var send = function(ws, id, type, data) {
    ws.send(JSON.stringify({
        id: id,
        type: type,
        data: data
    }));
};

var chat = function(req, ws, id, data) {
    if (data.hash) {
        var wsTarget = hashMap[data.hash];
        if (!wsTarget)
            return send(ws, id, "error", "User is offline");
        var sha256 = Crypto.createHash("sha256");
        sha256.update(req.ip + (req.hashpass ? req.hashpass : ""));
        send(wsTarget, null, "message", {
            hash: sha256.digest("hex"),
            message: data.message
        });
        send(ws, id, "message", { hash: data.hash });
    } else {
        Database.getPost(data.boardName, data.postNumber).then(function(post) {
            if (!post)
                return Promise.reject("No such post");
            var arr;
            if (post.user.hashpass)
                arr = hashpassMap[post.user.hashpass];
            if (!arr)
                arr = ipMap[post.user.ip];
            if (!arr)
                return Promise.reject("User is offline");
            var sha256 = Crypto.createHash("sha256");
            sha256.update(req.ip + (req.hashpass ? req.hashpass : ""));
            var hash = sha256.digest("hex");
            arr.forEach(function(ws) {
                send(ws, null, "message", {
                    hash: hash,
                    message: data.message
                });
            });
            hashMap[hash] = ws;
            hashMapRev[ws] = hash;
            sha256 = Crypto.createHash("sha256");
            sha256.update(post.user.ip + (post.user.hashpass ? post.user.hashpass : ""));
            send(ws, id, "message", { hash: sha256.digest("hex") });
        }).catch(function(err) {
            send(ws, id, "error", { errorMessage: err });
        });
    }
};

var handle = function(req, ws) {
    if (req.hashpass) {
        if (!hashpassMap.hasOwnProperty(req.hashpass))
            hashpassMap[req.hashpass] = [];
        hashpassMap[req.hashpass].push(ws);
    }
    if (!ipMap.hasOwnProperty(req.ip))
        ipMap[req.ip] = [];
    ipMap[req.ip].push(ws);
    ws.on("message", function(message) {
        try {
            message = JSON.parse(message);
        } catch (err) {
            console.log(err);
            send(ws, null, "error", { errorMessage: err });
            return;
        }
        switch (message.type) {
        case "message":
            chat(req, ws, message.id, message.data);
            break;
        default:
            send(ws, message.id, "error", { errorMessage: "Invalid request type" });
            break;
        }
    });
    ws.on("close", function() {
        var hash = hashMapRev[ws];
        if (hash) {
            delete hashMapRev[ws];
            delete hashMap[hash];
        }
        if (req.hashpass) {
            var arr = hashpassMap[req.hashpass];
            arr.splice(arr.indexOf(ws), 1);
            if (arr.length < 1)
                delete hashpassMap[req.hashpass];
        }
        var arr = ipMap[req.ip];
        arr.splice(arr.indexOf(ws), 1);
        if (arr.length < 1)
            delete ipMap[req.hashpass];
    });
};

router.websocket("/chat", function(info, cb, next) {
    cb(handle.bind(undefined, info.req));
});

module.exports = router;
