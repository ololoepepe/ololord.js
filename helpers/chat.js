var Crypto = require("crypto");

var Database = require("./database");
var config = require("./config");
var Tools = require("./tools");

var createHash = function(user) {
    var sha256 = Crypto.createHash("sha256");
    sha256.update(user.hashpass || user.ip);
    return sha256.digest("hex");
};

module.exports.sendMessage = function(req, text, boardName, postNumber, hash) {
    if (!text)
        return Promise.reject("Message is empty");
    if (!boardName && !hash)
        return Promise.reject("No post or hash specified");
    var senderHash = createHash(req);
    var p;
    if (boardName) {
        postNumber = +postNumber;
        if (isNaN(postNumber) || postNumber <= 0)
            return Promise.reject("Invalid post number");
        p = Database.getPost(boardName, +postNumber).then(function(post) {
            if (!post)
                return Promise.reject("No such post");
            return createHash(post.user);
        });
    } else {
        if (!/^[0-9a-z]{64}$/i.test(hash))
            return Promise.reject("Invalid hash");
        p = Promise.resolve(hash);
    }
    var c = {};
    var date = Tools.now().toISOString();
    return p.then(function(receiverHash) {
        c.receiverHash = receiverHash;
        return Database.db.sadd("chatMap:" + senderHash, c.receiverHash);
    }).then(function() {
        return Database.db.sadd("chat:" + senderHash + ":" + c.receiverHash, JSON.stringify({
            type: "out",
            text: text,
            date: date
        }));
    }).then(function() {
        return Database.db.sadd("chatMap:" + c.receiverHash, senderHash);
    }).then(function() {
        return Database.db.sadd("chat:" + c.receiverHash + ":" + senderHash, JSON.stringify({
            type: "in",
            text: text,
            date: date
        }));
    }).then(function() {
        return Promise.resolve({ receiver: c.receiverHash });
    });
};

module.exports.getMessages = function(req, lastRequestDate) {
    var hash = createHash(req);
    return Database.db.smembers("chatMap:" + hash).then(function(senderHashes) {
        if (!senderHashes)
            return Promise.resolve([]);
        var promises = senderHashes.map(function(senderHash) {
            return Database.db.smembers("chat:" + hash + ":" + senderHash).then(function(list) {
                if (!list)
                    return Promise.resolve();
                var l = [];
                list.forEach(function(msg) {
                    msg = JSON.parse(msg);
                    if (lastRequestDate && msg.date > lastRequestDate)
                        l.push(msg);
                });
                if (l.length < 1)
                    return Promise.resolve();
                return Promise.resolve(l);
            }).then(function(messages) {
                if (!messages)
                    return Promise.resolve();
                return Promise.resolve({
                    senderHash: senderHash,
                    messages: messages
                });
            });
        });
        return Promise.all(promises);
    }).then(function(messages) {
        var result = {
            date: Tools.now().toISOString(),
            messages: {}
        };
        messages.forEach(function(message) {
            if (!message)
                return;
            result.messages[message.senderHash] = message.messages;
        });
        return Promise.resolve(result);
    });
};

module.exports.deleteMessages = function(req, hash) {
    if (!/^[0-9a-z]{64}$/i.test(hash))
        return Promise.reject("Invalid hash");
    var receiverHash = createHash(req);
    return Database.db.del("chat:" + receiverHash + ":" + hash).then(function() {
        return Database.db.del("chatMap:" + receiverHash);
    }).then(function() {
        return Promise.resolve({});
    });
};
