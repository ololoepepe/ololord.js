var FS = require("fs");
var pmongo = require("promised-mongo");
var Promise = require("promise");
var promisify = require("promisify-node");

var Board = require("../boards/board");
var Cache = require("./cache");
var Tools = require("./tools");

var Collections = {};
var Models = {};
var RegisteredUserLevels = {};
var MarkupModes = {};

RegisteredUserLevels["Admin"] = "ADMIN";
RegisteredUserLevels["Moder"] = "MODER";
RegisteredUserLevels["User"] = "USER";

MarkupModes["ExtandedWakabaMarkOnly"] = "EWM_ONLY";
MarkupModes["BBCodeOnly"] = "BBC_ONLY";
MarkupModes["ExtandedWakabaMarkAndBBCode"] = "EWM_AND_BBC";
MarkupModes["None"] = "NONE";

var db = pmongo("ololord");
var lastPostNumbers = {};
var userDraftMap = {};

module.exports.db = db;

var _defineModel = function(modelName, f, collectionName) {
    var model = f();
    model.toInstance = function(document) {
        if (Array.isArray(document)) {
            return document.map(function(doc) {
                doc.__proto__ = model;
                return doc;
            });
        }
        document.__proto__ = model;
        return document;
    };
    Object.defineProperty(module.exports, modelName, { value: model });
    Models[modelName] = model;
    collectionName = collectionName || (modelName.substr(0, 1).toLowerCase() + modelName.substr(1) + "s");
    var collection = db.collection(collectionName);
    //promisify(collection);
    Object.defineProperty(module.exports, collectionName, { value: collection });
    Collections[collectionName] = collection;
    model.collection = collection;
    collection.model = model;
};

_defineModel("Thread", function() {
    var model = function() {
        //
    };
    return model;
});

_defineModel("DraftThread", function() {
    var model = function() {
        //
    };
    return model;
});

_defineModel("CaptchaQuota", function() {
    var model = function() {
        //
    };
    return model;
});

_defineModel("RegisteredUser", function() {
    var model = function() {
        //
    };
    return model;
});

_defineModel("BannedUser", function() {
    var model = function() {
        //
    };
    return model;
});

Object.defineProperty(module.exports, "Collections", { value: Collections });
Object.defineProperty(module.exports, "Models", { value: Models });
Object.defineProperty(module.exports, "RegisteredUserLevels", { value: RegisteredUserLevels });
Object.defineProperty(module.exports, "MarkupModes", { value: MarkupModes });

module.exports.initialize = function() {
    return Collections.threads.createIndex({
        "options.draft": 1,
        boardName: 1,
        archived: 1,
        "user.hashpass": 1,
        "user.level": 1
    }).then(function() {
        return Collections.threads.createIndex({
            "options.draft": 1,
            boardName: 1,
            archived: 1,
            number: 1,
            "user.hashpass": 1,
            "user.level": 1
        })
    }).then(function() {
        return Collections.threads.createIndex({
            boardName: 1,
            draft: 1
        });
    }).then(function() {
        return Collections.threads.createIndex({
            updatedAt: 1
        });
    }).then(function() {
        var promises = Board.boardNames().map(function(boardName) {
            var query = { boardName: boardName, draft: false };
            return Collections.threads.find(query).sort({ updatedAt: -1 }).limit(1).then(function(threads) {
                if (!threads || threads.length < 1) {
                    return Promise.resolve({
                        boardName: boardName,
                        lastPostNumber: 0
                    });
                }
                var collectionName = "thread/" + boardName + "/" + threads[0].number;
                return db.collection(collectionName).find({ "options.draft": false }).sort({ number: -1 }).limit(1).then(function(posts) {
                    return Promise.resolve({
                        boardName: boardName,
                        lastPostNumber: ((posts && posts.length > 0) ? posts[0].number : 0)
                    });
                });
            });
        });
        return Promise.all(promises);
    }).then(function(results) {
        Tools.forIn(results, function(result) {
            lastPostNumbers[result.boardName] = result.lastPostNumber;
        });
        return Collections.threads.find({});
    }).then(function(threads) {
        var promises = threads.map(function(thread) {
            if (thread.options.draft)
                userDraftMap[thread.boardName + "/" + thread.user.hashpass] = true;
            var collectionName = "thread/" + thread.boardName + "/" + thread.number;
            return db.collection(collectionName).find({ "options.draft": true });
        });
        return Promise.all(promises);
    }).then(function(results) {
        results.forEach(function(posts) {
            posts.forEach(function(post) {
                userDraftMap[post.boardName + "/" + post.user.hashpass] = true;
            });
        });
        return Promise.resolve();
    });
};

module.exports.getCollectionNames = function(cb, cbp) {
    var promise = db.getCollectionNames();
    if (!cb)
        return promise;
    return promise.then(function(collectionNames) {
        if (cbp)
            return cb(collectionNames);
        cb(collectionNames);
        return Promise.resolve();
    });
};

module.exports.dropDatabase = function() {
    return db.dropDatabase();
};

module.exports.registeredUser = function(reqOrHashpass) {
    if (typeof reqOrHashpass == "object" && reqOrHashpass.cookies)
        reqOrHashpass = Tools.hashpass(reqOrHashpass);
    if (!reqOrHashpass)
        return Promise.resolve(null);
    return Collections.registeredUser.findOne({ hashpass: reqOrHashpass });
};

module.exports.registeredUserLevel = function(reqOrHashpass) {
    return module.exports.registeredUser(reqOrHashpass).then(function(user) {
        return Promise.resolve(user ? user.level : null);
    });
};

module.exports.registeredUserBoards = function(reqOrHashpass) {
    return module.exports.registeredUser(reqOrHashpass).then(function(user) {
        return Promise.resolve(user ? user.boardNames : null);
    });
};

module.exports.moderOnBoard = function(reqOrHashpass, boardName1, boardName2) {
    return module.exports.registeredUser(reqOrHashpass).then(function(user) {
        if (!user)
            return Promise.resolve(false);
        if (user.level < RegisteredUserLevels.Moder)
            return Promise.resolve(false);
        if (user.level >= RegisteredUserLevels.Admin)
            return Promise.resolve(true);
        var boardNames = user.boardNames;
        if (Tools.contains(boardNames, "*"))
            return Promise.resolve(true);
        if (Tools.contains(boardNames, boardName1))
            return Promise.resolve(true);
        if (boardName2 && Tools.contains(boardNames, boardName2))
            return Promise.resolve(true);
        return Promise.resolve(false);
    });
};

module.exports.lastPostNumber = function(boardName) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return null;
    return lastPostNumbers[boardName];
};

module.exports.hasDrafts = function(boardName, hashpass) {
    if (!Tools.contains(Board.boardNames(), boardName))
        return false;
    if (typeof hashpass != "string" || !hashpass.match(/([0-9a-fA-F]){40}/))
        return false;
    return userDraftMap.hasOwnProperty(boardName + "/" + hashpass);
};
