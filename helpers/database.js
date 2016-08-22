"use strict";

var _underscore = require("underscore");

var _underscore2 = _interopRequireDefault(_underscore);

var _board = require("../boards/board");

var _board2 = _interopRequireDefault(_board);

var _boards = require("../models/boards");

var BoardsModel = _interopRequireWildcard(_boards);

var _posts = require("../models/posts");

var PostsModel = _interopRequireWildcard(_posts);

var _users = require("../models/users");

var UsersModel = _interopRequireWildcard(_users);

var _ipc = require("../helpers/ipc");

var IPC = _interopRequireWildcard(_ipc);

var _logger = require("../helpers/logger");

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Address4 = require("ip-address").Address4;
var Address6 = require("ip-address").Address6;
var bigInt = require("big-integer");
var cluster = require("cluster");
var Crypto = require("crypto");
var Elasticsearch = require("elasticsearch");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Path = require("path");
var promisify = require("promisify-node");
var Redis = require("ioredis");
var SQLite3 = require("sqlite3");
var Util = require("util");

var mkpath = promisify("mkpath");

var Cache = require("./cache");
var Captcha = require("../captchas/captcha");
var config = require("./config");
var Permissions = require("./permissions");
var Tools = require("./tools");

var hasNewPosts = new Set();

if (!cluster.isMaster) {
    setInterval(function () {
        var o = {};
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = hasNewPosts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var key = _step.value;

                o[key] = 1;
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }

        hasNewPosts.clear();
        if ((0, _underscore2.default)(o).isEmpty()) return;
        return IPC.send('notifyAboutNewPosts', o).then(function () {
            //Do nothing
        }).catch(function (err) {
            _logger2.default.error(err.stack || err);
        });
    }, Tools.SECOND);
}
//# sourceMappingURL=database.js.map
