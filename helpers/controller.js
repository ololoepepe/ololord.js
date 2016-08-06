'use strict';

var _fsWatcher = require('./fs-watcher');

var _fsWatcher2 = _interopRequireDefault(_fsWatcher);

var _statistics = require('../models/statistics');

var StatisticsModel = _interopRequireWildcard(_statistics);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _ = require('underscore');
var browserify = require('browserify');
var Crypto = require("crypto");
var dot = require("dot");
var FS = require("q-io/fs");
var FSSync = require("fs");
var Highlight = require("highlight.js");
var merge = require("merge");
var mkpath = require("mkpath");
var moment = require("moment");
var Path = require("path");
var random = require("random-js")();
var Util = require("util");

var Cache = require("./cache");
var config = require("./config");
var Global = require("./global");
var Board = require("../boards/board");

var templates = {};
var notFoundImageFileNames = [];
var langNames = require("../misc/lang-names.json");

var BoardModel = require("../models/board");
var Captcha = require("../captchas");
var config = require("./config");
var Database = require("./database");
var markup = require("./markup");

module.exports = controller;
//# sourceMappingURL=controller.js.map
