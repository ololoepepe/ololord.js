var Crypto = require("crypto");

var Database = require("./database");
var config = require("./config");
var Tools = require("./tools");

var createHash = function(data) {
    var sha256 = Crypto.createHash("sha256");
    sha256.update(data);
    return sha256.digest("hex");
};

var messages = {};

module.exports.sendMessage = function(req, text, boardName, postNumber, hash) {
    if (!text)
        return Promise.reject("Message is empty");
    if (!boardName && !hash)
        return Promise.reject("No post or hash specified");
    var senderHash = createHash(req.ip + (req.hashpass || ""));
    var p;
    if (boardName) {
        postNumber = +postNumber;
        if (isNaN(postNumber) || postNumber <= 0)
            return Promise.reject("Invalid post number");
        p = Database.getPost(boardName, +postNumber).then(function(post) {
            if (!post)
                return Promise.reject("No such post");
            return createHash(post.user.ip + (post.user.hashpass || ""));
        });
    } else {
        if (!/^[0-9a-z]{64}$/i.test(hash))
            return Promise.reject("Invalid hash");
        p = Promise.resolve(hash);
    }
    return p.then(function(receiverHash) {
        if (!messages.hasOwnProperty(receiverHash))
            messages[receiverHash] = {};
        var m = messages[receiverHash];
        if (!m.hasOwnProperty(senderHash))
            m[senderHash] = [];
        var list = m[senderHash];
        var date = Tools.now().toISOString();
        list.push({
            text: text,
            date: date
        });
        return Promise.resolve({
            receiver: receiverHash,
            text: text,
            date: date
        });
    });
};

module.exports.getMessages = function(req, lastRequestDate) {
    var hash = createHash(req.ip + (req.hashpass || ""));
    var m = messages[hash];
    var result = {
        date: Tools.now().toISOString(),
        messages: {}
    };
    if (!m)
        return Promise.resolve(result);
    Tools.forIn(m, function(list, senderHash) {
        var l = [];
        list.forEach(function(msg) {
            if (lastRequestDate && msg.date > lastRequestDate)
                l.push(msg);
        });
        if (l.length < 1)
            return;
        result.messages[senderHash] = l;
    });
    return Promise.resolve(result);
};

module.exports.deleteMessages = function(req, hash) {
    if (!/^[0-9a-z]{64}$/i.test(hash))
        return Promise.reject("Invalid hash");
    var receiverHash = createHash(req.ip + (req.hashpass || ""));
    var m = messages[receiverHash];
    if (!m)
        return Promise.resolve({});
    delete m[hash];
    return Promise.resolve({});
};
