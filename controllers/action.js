'use strict';

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _http = require('q-io/http');

var _http2 = _interopRequireDefault(_http);

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _posts = require('../models/posts');

var PostsModel = _interopRequireWildcard(_posts);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

var _postCreationTransaction = require('../storage/post-creation-transaction');

var _postCreationTransaction2 = _interopRequireDefault(_postCreationTransaction);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _files = require('../storage/files');

var Files = _interopRequireWildcard(_files);

var _geolocation = require('../storage/geolocation');

var _geolocation2 = _interopRequireDefault(_geolocation);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var moment = require("moment");


var Board = require("../boards/board");
var Captcha = require("../captchas");
var Chat = require("../helpers/chat");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var markup = require("../helpers/markup");

var router = _express2.default.Router();

function transformGeoBans(bans) {
    return (0, _underscore2.default)(bans).reduce(function (acc, value, key) {
        acc.set(key.toUpperCase(), !!value);
        return acc;
    }, new Map());
}

var geoBans = Tools.createWatchedResource(__dirname + '/../misc/geo-bans.json', function (path) {
    return transformGeoBans(require(path));
}, function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(path) {
        var data;
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return _fs2.default.read(path);

                    case 2:
                        data = _context.sent;

                        geoBans = transformGeoBans(JSON.parse(data));

                    case 4:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function (_x) {
        return ref.apply(this, arguments);
    };
}()) || {};

function checkGeoBan(geolocationInfo) {
    var def = geoBans.get('*');
    if (def) {
        geolocationInfo = geolocationInfo || {};
    } else if (!geolocationInfo || !geolocationInfo.countryCode) {
        return;
    }
    var countryCode = geolocationInfo.countryCode;
    if (typeof countryCode !== 'string') {
        countryCode = '';
    }
    var user = geoBans.get(countryCode.toUpperCase());
    if (def) {
        var banned = !user && typeof user === 'boolean';
    } else {
        var banned = user;
    }
    if (banned) {
        return Promise.reject(new Error(Tools.translate('Posting is disabled for this country')));
    }
}

router.post('/action/markupText', function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(req, res, next) {
        var _ref, _ref$fields, boardName, text, markupMode, signAsOp, tripcode, _board, rawText, markupModes, data;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        _context2.prev = 0;
                        _context2.next = 3;
                        return Tools.parseForm(req);

                    case 3:
                        _ref = _context2.sent;
                        _ref$fields = _ref.fields;
                        boardName = _ref$fields.boardName;
                        text = _ref$fields.text;
                        markupMode = _ref$fields.markupMode;
                        signAsOp = _ref$fields.signAsOp;
                        tripcode = _ref$fields.tripcode;
                        _board = Board.board(boardName);

                        if (_board) {
                            _context2.next = 13;
                            break;
                        }

                        throw new Error(Tools.translate('Invalid board'));

                    case 13:
                        _context2.next = 15;
                        return UsersModel.checkUserBan(req.ip, boardName, { write: true });

                    case 15:
                        //TODO: Should it really be "write"?
                        rawText = text || '';

                        if (!(text.length > _board.maxTextFieldLength)) {
                            _context2.next = 18;
                            break;
                        }

                        throw new Error(Tools.translate('Comment is too long'));

                    case 18:
                        markupMode = markupMode || '';
                        markupModes = Tools.markupModes(markupMode);
                        _context2.next = 22;
                        return markup(boardName, text, {
                            markupModes: markupModes,
                            accessLevel: req.level(boardName)
                        });

                    case 22:
                        text = _context2.sent;
                        data = {
                            boardName: boardName,
                            text: text || null,
                            rawText: rawText || null,
                            options: {
                                signAsOp: 'true' === signAsOp,
                                showTripcode: !!(req.hashpass && 'true' === tripcode)
                            },
                            createdAt: Tools.now().toISOString()
                        };

                        if (req.hashpass && tripcode) {
                            data.tripcode = Tools.generateTripcode(req.hashpass);
                        }
                        res.json(data);
                        _context2.next = 31;
                        break;

                    case 28:
                        _context2.prev = 28;
                        _context2.t0 = _context2['catch'](0);

                        next(_context2.t0);

                    case 31:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this, [[0, 28]]);
    }));

    return function (_x2, _x3, _x4) {
        return ref.apply(this, arguments);
    };
}());

router.post('/action/createPost', function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(req, res, next) {
        var transaction, _ref2, fields, files, boardName, threadNumber, captchaEngine, _board2, post, hash, path;

        return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        transaction = void 0;
                        _context3.prev = 1;
                        _context3.next = 4;
                        return Tools.parseForm(req);

                    case 4:
                        _ref2 = _context3.sent;
                        fields = _ref2.fields;
                        files = _ref2.files;
                        boardName = fields.boardName;
                        threadNumber = fields.threadNumber;
                        captchaEngine = fields.captchaEngine;
                        _board2 = Board.board(boardName);

                        if (_board2) {
                            _context3.next = 13;
                            break;
                        }

                        throw new Error(Tools.translate('Invalid board'));

                    case 13:
                        threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });

                        if (threadNumber) {
                            _context3.next = 16;
                            break;
                        }

                        throw new Error(Tools.translate('Invalid thread'));

                    case 16:
                        _context3.next = 18;
                        return UsersModel.checkUserBan(req.ip, boardName, { write: true });

                    case 18:
                        _context3.next = 20;
                        return (0, _geolocation2.default)(req.ip);

                    case 20:
                        req.geolocation = _context3.sent;
                        _context3.next = 23;
                        return checkGeoBan(req.geolocation);

                    case 23:
                        _context3.next = 25;
                        return Captch.checkCaptcha(req.ip, fields);

                    case 25:
                        transaction = new _postCreationTransaction2.default(boardName);
                        _context3.next = 28;
                        return Files.getFiles(fields, files);

                    case 28:
                        files = _context3.sent;
                        _context3.next = 31;
                        return _board2.testParameters(req, fields, files);

                    case 31:
                        _context3.next = 33;
                        return Files.processFiles(boardName, files, transaction);

                    case 33:
                        files = _context3.sent;
                        _context3.next = 36;
                        return PostsModel.createPost(req, fields, files, transaction);

                    case 36:
                        post = _context3.sent;
                        _context3.next = 39;
                        return IPC.render(post.boardName, post.threadNumber, post.number, 'create');

                    case 39:
                        //hasNewPosts.add(c.post.boardName + "/" + c.post.threadNumber); //TODO: pass to main process immediately
                        if ('node-captcha-noscript' !== captchaEngine) {
                            res.send({
                                boardName: post.boardName,
                                postNumber: post.number
                            });
                        } else {
                            hash = 'post-' + post.number;
                            path = '/' + config('site.pathPrefix') + post.boardName + '/res/' + post.threadNumber + '.html#' + hash;

                            res.redirect(303, path);
                        }
                        _context3.next = 46;
                        break;

                    case 42:
                        _context3.prev = 42;
                        _context3.t0 = _context3['catch'](1);

                        if (transaction) {
                            transaction.rollback();
                        }
                        next(_context3.t0);

                    case 46:
                    case 'end':
                        return _context3.stop();
                }
            }
        }, _callee3, this, [[1, 42]]);
    }));

    return function (_x5, _x6, _x7) {
        return ref.apply(this, arguments);
    };
}());

router.post('/action/createThread', function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(req, res, next) {
        var transaction, _ref3, fields, files, boardName, captchaEngine, _board3, thread, post;

        return regeneratorRuntime.wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        transaction = void 0;
                        _context4.prev = 1;
                        _context4.next = 4;
                        return Tools.parseForm(req);

                    case 4:
                        _ref3 = _context4.sent;
                        fields = _ref3.fields;
                        files = _ref3.files;
                        boardName = fields.boardName;
                        captchaEngine = fields.captchaEngine;
                        _board3 = Board.board(boardName);

                        if (_board3) {
                            _context4.next = 12;
                            break;
                        }

                        throw new Error(Tools.translate('Invalid board'));

                    case 12:
                        _context4.next = 14;
                        return UsersModel.checkUserBan(req.ip, boardName, { write: true });

                    case 14:
                        _context4.next = 16;
                        return (0, _geolocation2.default)(req.ip);

                    case 16:
                        req.geolocation = _context4.sent;
                        _context4.next = 19;
                        return checkGeoBan(req.geolocation);

                    case 19:
                        _context4.next = 21;
                        return Captch.checkCaptcha(req.ip, fields);

                    case 21:
                        transaction = new _postCreationTransaction2.default(boardName);
                        _context4.next = 24;
                        return Files.getFiles(fields, files);

                    case 24:
                        files = _context4.sent;
                        _context4.next = 27;
                        return _board3.testParameters(req, fields, files, true);

                    case 27:
                        _context4.next = 29;
                        return ThreadsModel.createThread(req, fields, transaction);

                    case 29:
                        thread = _context4.sent;
                        _context4.next = 32;
                        return Files.processFiles(boardName, files, transaction);

                    case 32:
                        files = _context4.sent;
                        _context4.next = 35;
                        return PostsModel.createPost(req, fields, files, transaction, {
                            postNumber: thread.number,
                            date: new Date(thread.createdAt)
                        });

                    case 35:
                        post = _context4.sent;
                        _context4.next = 38;
                        return IPC.render(post.boardName, post.threadNumber, post.number, 'create');

                    case 38:
                        if ('node-captcha-noscript' !== captchaEngine) {
                            res.send({
                                boardName: thread.boardName,
                                threadNumber: thread.number
                            });
                        } else {
                            res.redirect(303, '/' + config('site.pathPrefix') + thread.boardName + '/res/' + thread.number + '.html');
                        }
                        _context4.next = 45;
                        break;

                    case 41:
                        _context4.prev = 41;
                        _context4.t0 = _context4['catch'](1);

                        if (transaction) {
                            transaction.rollback();
                        }
                        next(_context4.t0);

                    case 45:
                    case 'end':
                        return _context4.stop();
                }
            }
        }, _callee4, this, [[1, 41]]);
    }));

    return function (_x8, _x9, _x10) {
        return ref.apply(this, arguments);
    };
}());

router.post("/action/editPost", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.postNumber = +result.fields.postNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function () {
        return Database.editPost(req, c.fields);
    }).then(function (result) {
        res.send({
            boardName: c.boardName,
            postNumber: c.postNumber
        });
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/addFiles", function (req, res, next) {
    var c = {};
    var transaction = new Database.Transaction();
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        c.files = result.files;
        c.board = Board.board(c.fields.boardName);
        if (!board) return Promise.reject(Tools.translate("Invalid board"));
        transaction.board = board;
        return UsersModel.checkUserBan(req.ip, c.board.name, { write: true });
    }).then(function () {
        return getFiles(c.fields, c.files, transaction);
    }).then(function (files) {
        c.files = files;
        var fileCount = c.files.length;
        if (fileCount < 1) return Promise.reject(Tools.translate("No file specified"));
        var maxFileSize = c.board.maxFileSize;
        var maxFileCount = c.board.maxFileCount;
        if (fileCount > maxFileCount) {
            return Promise.reject(Tools.translate("Too many files"));
        } else {
            var err = c.files.reduce(function (err, file) {
                if (err) return err;
                if (file.size > maxFileSize) return Tools.translate("File is too big");
                if (c.board.supportedFileTypes.indexOf(file.mimeType) < 0) return Tools.translate("File type is not supported");
            }, "");
            if (err) return Promise.reject(err);
        }
        return Database.addFiles(req, c.fields, c.files, transaction);
    }).then(function (result) {
        res.send({
            boardName: result.boardName,
            postNumber: result.postNumber,
            threadNumber: result.threadNumber
        });
    }).catch(function (err) {
        transaction.rollback();
        next(err);
    });
});

router.post("/action/deletePost", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        return UsersModel.checkUserBan(req.ip, c.fields.boardName, { write: true });
    }).then(function () {
        return Database.deletePost(req, res, c.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/deleteFile", function (req, res, next) {
    Tools.parseForm(req).then(function (result) {
        return Database.deleteFile(req, res, result.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/editFileRating", function (req, res, next) {
    Tools.parseForm(req).then(function (result) {
        return Database.editFileRating(req, res, result.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/moveThread", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        return UsersModel.checkUserBan(req.ip, c.fields.boardName, { write: true });
    }).then(function () {
        return UsersModel.checkUserBan(req.ip, c.fields.targetBoardName, { write: true });
    }).then(function () {
        return Database.moveThread(req, c.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/editAudioTags", function (req, res, next) {
    Tools.parseForm(req).then(function (result) {
        return Database.editAudioTags(req, res, result.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/banUser", function (req, res, next) {
    if (!req.isModer()) return next(Tools.translate("Not enough rights"));
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.bans = [];
        c.fields = result.fields;
        c.userIp = result.fields.userIp;
        Tools.forIn(result.fields, function (value, name) {
            if (!/^banBoard_\S+$/.test(name)) return;
            var level = result.fields["banLevel_" + value];
            if ("NONE" == level) return;
            var expiresAt = result.fields["banExpires_" + value];
            if (expiresAt) {
                var timeOffset = +c.fields.timeOffset;
                if (isNaN(timeOffset) || timeOffset < -720 || timeOffset > 840) timeOffset = config("site.timeOffset", 0);
                var hours = Math.floor(timeOffset / 60);
                var minutes = Math.abs(timeOffset) % 60;
                var tz = (timeOffset > 0 ? "+" : "") + (Math.abs(hours) < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
                expiresAt = moment(expiresAt + " " + tz, "YYYY/MM/DD HH:mm ZZ");
                if (+expiresAt < +Tools.now() + Tools.Second) expiresAt = null;
            } else {
                expiresAt = null;
            }
            c.bans.push({
                boardName: value,
                expiresAt: +expiresAt ? expiresAt : null,
                level: level,
                reason: result.fields["banReason_" + value],
                postNumber: +result.fields["banPostNumber_" + value] || null
            });
        });
        return Database.banUser(req, c.fields.userIp, c.bans);
    }).then(function (result) {
        res.send({});
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/delall", function (req, res, next) {
    if (!req.isModer()) return next(Tools.translate("Not enough rights"));
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        c.boardNames = Tools.toArray(Tools.filterIn(c.fields, function (boardName, key) {
            return (/^board_\S+$/.test(key)
            );
        }));
        if (c.boardNames.length < 1) return Promise.reject(Tools.translate("No board specified"));
        return UsersModel.checkUserBan(req.ip, c.boardNames, { write: true });
    }).then(function () {
        return Database.delall(req, c.fields.userIp, c.boardNames);
    }).then(function (result) {
        res.send({});
    }).catch(function (err) {
        next(err);
    });
});

var getRegisteredUserData = function getRegisteredUserData(fields) {
    var levels = {};
    var password = fields.password;
    var ips = Tools.ipList(fields.ips);
    if (typeof ips == "string") return Promise.reject(ips);
    Tools.forIn(fields, function (value, name) {
        if (!/^accessLevelBoard_\S+$/.test(name)) return;
        if ("NONE" == value) return;
        levels[name.match(/^accessLevelBoard_(\S+)$/)[1]] = value;
    });
    return Promise.resolve({
        password: password,
        levels: levels,
        ips: ips
    });
};

router.post("/action/registerUser", function (req, res, next) {
    if (!req.isSuperuser()) return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function (result) {
        return getRegisteredUserData(result.fields);
    }).then(function (result) {
        return Database.registerUser(result.password, result.levels, result.ips);
    }).then(function (hashpass) {
        res.json({ hashpass: hashpass });
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/unregisterUser", function (req, res, next) {
    if (!req.isSuperuser()) return next(Tools.translate("Not enough rights"));
    var c = {};
    Tools.parseForm(req).then(function (result) {
        return Database.unregisterUser(result.fields.hashpass);
    }).then(function (result) {
        res.send({});
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/updateRegisteredUser", function (req, res, next) {
    if (!req.isSuperuser()) return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function (result) {
        return getRegisteredUserData(result.fields);
    }).then(function (result) {
        return Database.updateRegisteredUser(result.password, result.levels, result.ips);
    }).then(function () {
        res.json({});
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/setThreadFixed", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function () {
        return Database.setThreadFixed(req, c.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/setThreadClosed", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function () {
        return Database.setThreadClosed(req, c.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/setThreadUnbumpable", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.fields = result.fields;
        c.boardName = result.fields.boardName;
        c.threadNumber = +result.fields.threadNumber;
        return UsersModel.checkUserBan(req.ip, c.boardName, { write: true });
    }).then(function () {
        return Database.setThreadUnbumpable(req, c.fields);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/sendChatMessage", function (req, res, next) {
    Tools.parseForm(req).then(function (result) {
        var fields = result.fields;
        return Chat.sendMessage({
            ip: req.ip,
            hashpass: req.hashpass
        }, fields.boardName, +fields.postNumber, fields.text);
    }).then(function (result) {
        res.send({});
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/deleteChatMessages", function (req, res, next) {
    Tools.parseForm(req).then(function (result) {
        var fields = result.fields;
        return Chat.deleteMessages({
            ip: req.ip,
            hashpass: req.hashpass
        }, fields.boardName, fields.postNumber);
    }).then(function (result) {
        res.send(result);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/synchronize", function (req, res, next) {
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.key = result.fields.key;
        if (!c.key) return Promise.reject(Tools.translate("No key specified"));
        var data = result.fields.data;
        try {
            data = JSON.parse(data);
        } catch (err) {
            return Promise.reject(err);
        }
        return Database.db.set("synchronizationData:" + c.key, JSON.stringify(data));
    }).then(function () {
        return Database.db.expire("synchronizationData:" + c.key, 300); //NOTE: 5 minutes
    }).then(function () {
        res.send({});
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/search", function (req, res, next) {
    var c = { model: {} };
    Tools.parseForm(req).then(function (result) {
        var fields = result.fields;
        c.query = fields.query || "";
        if (!c.query) return Promise.reject(Tools.translate("Search query is empty"));
        if (c.query.length > config("site.maxSearchQueryLength", 50)) return Promise.reject(Tools.translate("Search query is too long"));
        var boardName = fields.boardName || "";
        if ("*" == boardName) boardName = "";
        var page = fields.page || 0;
        c.model.searchQuery = c.query;
        c.model.searchBoard = boardName;
        c.phrases = Tools.splitCommand(c.query);
        if (!c.phrases || !c.phrases.command) return Promise.reject(Tools.translate("Invalid search query"));
        c.phrases = [c.phrases.command].concat(c.phrases.arguments);
        c.query = {
            requiredPhrases: [],
            excludedPhrases: [],
            possiblePhrases: []
        };
        c.phrases.forEach(function (phrase) {
            if (phrase.substr(0, 1) == "+") c.query.requiredPhrases.push(phrase.substr(1).toLowerCase());else if (phrase.substr(0, 1) == "-") c.query.excludedPhrases.push(phrase.substr(1).toLowerCase());else c.query.possiblePhrases.push(phrase.toLowerCase());
        });
        c.model.phrases = c.query.requiredPhrases.concat(c.query.excludedPhrases).concat(c.query.possiblePhrases);
        c.model.phrases = Tools.withoutDuplicates(c.model.phrases);
        return Database.findPosts(c.query, boardName, page);
    }).then(function (result) {
        var posts = result.posts;
        c.model.searchResults = posts.map(function (post) {
            var text = post.plainText || "";
            text = text.replace(/\r*\n+/g, " ");
            if (text.length > 300) text = text.substr(0, 297) + "...";
            var subject = post.subject || text;
            if (subject.length > 100) subject = subject.substr(0, 97) + "...";
            return {
                boardName: post.boardName,
                postNumber: post.number,
                threadNumber: post.threadNumber,
                archived: post.archived,
                subject: subject,
                text: text
            };
        });
        c.model.total = result.total;
        c.model.max = result.max;
        res.send(c.model);
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/superuserAddFile", function (req, res, next) {
    if (!req.isSuperuser()) return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function (result) {
        var dir = result.fields.dir;
        if (dir.slice(-1)[0] != "/") dir += "/";
        var path = __dirname + "/../" + dir + result.fields.fileName;
        var files = Tools.toArray(result.files);
        if ("true" == result.fields.isDir) return _fs2.default.makeDirectory(path);else if (files.length < 1) return Tools.writeFile(path, "");else return _fs2.default.move(files[0].path, path);
    }).then(function () {
        res.json({});
    }).catch(function (err) {
        if ("ENOENT" == err.code) err.status = 404;else if ("ENOTDIR" == err.code) err = Tools.translate("Not a directory");
        next(err);
    });
});

router.post("/action/superuserEditFile", function (req, res, next) {
    if (!req.isSuperuser()) return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function (result) {
        var path = __dirname + "/../" + result.fields.fileName;
        return Tools.writeFile(path, result.fields.content);
    }).then(function () {
        res.json({});
    }).catch(function (err) {
        if ("ENOENT" == err.code) err.status = 404;else if ("EISDIR" == err.code) err = Tools.translate("Not a file");
        next(err);
    });
});

router.post("/action/superuserRenameFile", function (req, res, next) {
    if (!req.isSuperuser()) return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function (result) {
        var oldPath = __dirname + "/../" + result.fields.oldFileName;
        var newPath = oldPath.split("/").slice(0, -1).join("/") + "/" + result.fields.fileName;
        return _fs2.default.rename(oldPath, newPath);
    }).then(function () {
        res.json({});
    }).catch(function (err) {
        if ("ENOENT" == err.code) err.status = 404;
        next(err);
    });
});

router.post("/action/superuserDeleteFile", function (req, res, next) {
    if (!req.isSuperuser()) return next(Tools.translate("Not enough rights"));
    Tools.parseForm(req).then(function (result) {
        var path = __dirname + "/../" + result.fields.fileName;
        return _fs2.default.removeTree(path);
    }).then(function () {
        res.json({});
    }).catch(function (err) {
        if ("ENOENT" == err.code) err.status = 404;
        next(err);
    });
});

router.post("/action/superuserRerenderCache", function (req, res, next) {
    if (!req.isSuperuser()) return next(Tools.translate("Not enough rights"));
    var c = {};
    Tools.parseForm(req).then(function (result) {
        c.rerenderArchive = "true" == result.fields.rerenderArchive;
        return IPC.send('stop');
    }).then(function () {
        return IPC.send('rerenderCache', c.rerenderArchive);
    }).then(function () {
        return IPC.send('start');
    }).then(function () {
        res.json({});
    }).catch(function (err) {
        next(err);
    });;
});

router.post("/action/superuserRerenderPosts", function (req, res, next) {
    if (!req.isSuperuser()) return next(Tools.translate("Not enough rights"));
    var c = { boardNames: [] };
    Tools.parseForm(req).then(function (result) {
        Tools.forIn(result.fields, function (value, name) {
            if (!/^board_\S+$/.test(name)) return;
            c.boardNames.push(value);
        });
        if (c.boardNames.length < 1) c.boardNames = Board.boardNames();
        return IPC.send('stop');
    }).then(function () {
        return Database.rerenderPosts(c.boardNames);
    }).then(function () {
        return IPC.send('start');
    }).then(function () {
        res.json({});
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/superuserRebuildSearchIndex", function (req, res, next) {
    if (!req.isSuperuser()) return next(Tools.translate("Not enough rights"));
    IPC.send('stop').then(function () {
        return Database.rebuildSearchIndex();
    }).then(function () {
        return IPC.send('start');
    }).then(function () {
        res.json({});
    }).catch(function (err) {
        next(err);
    });
});

router.post("/action/superuserReload", function (req, res, next) {
    if (!req.isSuperuser()) return next(Tools.translate("Not enough rights"));
    var c = { list: [] };
    Tools.parseForm(req).then(function (result) {
        if ("true" == result.fields.boards) c.list.push("boards");
        if ("true" == result.fields.config) c.list.push("config");
        if ("true" == result.fields.templates) c.list.push("templates");
        if (c.list.length < 1) return Promise.resolve();
        return IPC.send('stop');
    }).then(function () {
        return Tools.series(c.list, function (action) {
            switch (action) {
                case "boards":
                    return IPC.send('reloadBoards');
                case "config":
                    return IPC.send('reloadConfig');
                case "templates":
                    return IPC.send('reloadTemplates');
                default:
                    return Promise.resolve();
            }
        });
    }).then(function () {
        if (c.list.length < 1) return Promise.resolve();
        return IPC.send('start');
    }).then(function () {
        res.json({});
    }).catch(function (err) {
        next(err);
    });
});

Captcha.captchaIds().forEach(function (id) {
    Captcha.captcha(id).actionRoutes().forEach(function (route) {
        router[route.method]("/action" + route.path, route.handler);
    });
});

Board.boardNames().forEach(function (name) {
    Board.board(name).actionRoutes().forEach(function (route) {
        router[route.method]("/action" + route.path, route.handler);
    });
});

module.exports = router;
//# sourceMappingURL=action.js.map
