var Crypto = require("crypto");

var Database = require("./database");
var config = require("./config");
var Tools = require("./tools");

var createHash = function(user) {
    var sha256 = Crypto.createHash("sha256");
    sha256.update(user.hashpass || user.ip);
    return sha256.digest("hex");
};

module.exports.sendMessage = function(user, boardName, postNumber, text) {
    if (!text)
        return Promise.reject(Tools.translate("Message is empty"));
    if (!boardName)
        return Promise.reject(Tools.translate("Invalid board"));
    postNumber = +postNumber;
    if (!boardName || !postNumber || postNumber < 0)
        return Promise.reject(Tools.translate("Invalid post number"));
    var c = {};
    c.key = boardName + ":" + postNumber;
    c.senderHash = createHash(user);
    c.date = Tools.now();
    c.ttl = config("server.chat.ttl", 10080) * 60; //NOTE: 7 days
    return Database.getPost(boardName, postNumber).then(function(post) {
        if (!post)
            return Promise.reject(Tools.translate("No such post"));
        c.receiverHash = createHash(post.user);
        c.receiver = post.user;
        return Database.db.zrange("chat:" + c.key, 0, 0);
    }).then(function(msg) {
        if (msg && msg.length > 0 && JSON.parse(msg[0]).senderHash != c.senderHash
            && JSON.parse(msg[0]).receiverHash != c.senderHash) {
            return Promise.reject(Tools.translate("Somebody is chatting here already"));
        }
        return Database.db.smembers("chatMembers:" + c.key);
    }).then(function(members) {
        if (!members || members.length < 2) {
            c.members = [
                JSON.stringify({
                    hash: c.senderHash,
                    ip: user.ip,
                    hashpass: user.hashpass
                }),
                JSON.stringify({
                    hash: c.receiverHash,
                    ip: c.receiver.ip,
                    hashpass: c.receiver.hashpass
                })
            ];
            return Database.db.sadd("chatMembers:" + c.key, c.members);
        }
        c.members = members;
        if (c.senderHash == c.receiverHash) {
            c.members.some(function(member) {
                member = JSON.parse(member);
                if (member.hash == c.senderHash)
                    return;
                c.receiverHash = member.hash;
                c.receiver = {
                    ip: member.ip,
                    hashpass: member.hashpass
                };
                return true;
            });
        }
        return Database.db.sadd("chats:" + c.senderHash, c.key);
    }).then(function() {
        return Database.db.sadd("chats:" + c.receiverHash, c.key);
    }).then(function() {
        return Database.db.zadd("chat:" + c.key, +c.date.valueOf(), JSON.stringify({
            text: text,
            date: c.date.toISOString(),
            senderHash: c.senderHash,
            receiverHash: c.receiverHash
        }));
    }).then(function() {
        return Database.db.expire("chats:" + c.senderHash, c.ttl);
    }).then(function() {
        return Database.db.expire("chats:" + c.receiverHash, c.ttl);
    }).then(function() {
        return Database.db.expire("chat:" + c.key, c.ttl);
    }).then(function() {
        return Database.db.expire("chatMembers:" + c.key, c.ttl);
    }).then(function() {
        return Promise.resolve({
            message: {
                text: text,
                date: c.date.toISOString()
            },
            senderHash: c.senderHash,
            receiverHash: c.receiverHash,
            receiver: c.receiver
        });
    });
};

module.exports.getMessages = function(user, lastRequestDate) {
    lastRequestDate = +(new Date(lastRequestDate)).valueOf();
    if (!lastRequestDate)
        lastRequestDate = 0;
    var hash = createHash(user);
    var chats = {};
    var date = Tools.now().toISOString();
    return Database.db.smembers("chats:" + hash).then(function(keys) {
        return Tools.series(keys, function(key) {
            return Database.db.zrangebyscore("chat:" + key, lastRequestDate, Infinity).then(function(list) {
                list = (list || []).map(function(msg) {
                    return JSON.parse(msg);
                }).map(function(msg) {
                    return {
                        text: msg.text,
                        date: msg.date,
                        type: ((hash == msg.senderHash) ? "out" : "in")
                    };
                });
                if (list.length > 0)
                    chats[key] = list;
            });
        });
    }).then(function() {
        return Promise.resolve({
            lastRequestDate: date,
            chats: chats
        });
    });
};

module.exports.deleteMessages = function(user, boardName, postNumber) {
    if (!boardName)
        return Promise.reject(Tools.translate("Invalid board"));
    postNumber = +postNumber;
    if (!boardName || !postNumber || postNumber < 0)
        return Promise.reject(Tools.translate("Invalid post number"));
    var hash = createHash(user);
    return Database.db.del("chats:" + hash).then(function() {
        return Promise.resolve({});
    });
};
