'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _permissions = require('../helpers/permissions');

var Permissions = _interopRequireWildcard(_permissions);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RX_EXCEPT = /^#include\s+except(\((\d+(\,\d+)*)\))$/;
var RX_SEVERAL = /^#include\s+(\d+(\,\d+)*)$/;
var DEFAULT_SUPPORTED_FILE_TYPES = ['application/ogg', 'application/pdf', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'image/gif', 'image/jpeg', 'image/png', 'video/mp4', 'video/ogg', 'video/webm'];
var MARKUP_ELEMENTS = ['BOLD', 'ITALICS', 'STRIKED_OUT', 'UNDERLINED', 'SPOILER', 'QUOTATION', 'UNORDERED_LIST', 'ORDERED_LIST', 'LIST_ITEM', 'SUBSCRIPT', 'SUPERSCRIPT', 'URL', 'CODE', 'LATEX', 'INLINE_LATEX'];
var DEFAULT_MARKUP_ELEMENTS = MARKUP_ELEMENTS.slice(0, -3);

var boards = {};
var banners = {};
var postFormRules = {};

function getRules(boardName) {
  var fileName = __dirname + '/../../misc/rules/rules' + (boardName ? '.' + boardName : '') + '.txt';
  try {
    if (!_fs2.default.existsSync(fileName)) {
      return [];
    }
    var data = _fs2.default.readFileSync(fileName, 'utf8');
    if (!data) {
      return [];
    }
    return data.split(/\r*\n+/gi).filter(function (rule) {
      return !!rule;
    });
  } catch (err) {
    _logger2.default.error(err.stack || err);
    return [];
  }
}

function getBoards(includeHidden) {
  includeHidden = includeHidden || typeof includeHidden === 'undefined';
  return (0, _underscore2.default)(boards).toArray().sort(function (b1, b2) {
    return b1.name.localeCompare(b2.name);
  }).filter(function (board) {
    return board.enabled && (includeHidden || board.hidden);
  });
}

function getDefaultBoards() {
  var prBoard = new Board('pr', Tools.translate.noop('/pr/ogramming', 'boardTitle'));
  prBoard.defineSetting('markupElements', MARKUP_ELEMENTS);
  return [new Board('3dpd', Tools.translate.noop('3D pron', 'boardTitle')), new Board('a', Tools.translate.noop('/a/nime', 'boardTitle'), { defaultUserName: Tools.translate.noop('Kamina', 'defaultUserName') }), new Board('b', Tools.translate.noop('/b/rotherhood', 'boardTitle')), new Board('d', Tools.translate.noop('Board /d/iscussion', 'boardTitle')), new Board('h', Tools.translate.noop('/h/entai', 'boardTitle')), prBoard, new Board('rf', Tools.translate.noop('Refuge', 'boardTitle'), { defaultUserName: Tools.translate.noop('Whiner', 'defaultUserName') }), new Board('vg', Tools.translate.noop('Video games', 'boardTitle'), { defaultUserName: Tools.translate.noop('PC Nobleman', 'defaultUserName') })];
}

/** Class representing a board. */

var Board = function () {
  _createClass(Board, null, [{
    key: 'board',
    value: function board(name) {
      return boards[name];
    }
  }, {
    key: 'addBoard',
    value: function addBoard(board) {
      boards[board.name] = board;
    }
  }, {
    key: 'boardInfos',
    value: function boardInfos(includeHidden) {
      return getBoards(includeHidden).map(function (board) {
        return {
          name: board.name,
          title: board.title
        };
      });
    }
  }, {
    key: 'boardNames',
    value: function boardNames(includeHidden) {
      return getBoards(includeHidden).map(function (board) {
        return board.name;
      });
    }
  }, {
    key: 'reloadBanners',
    value: function reloadBanners() {
      banners = Board.boardNames().reduce(function (acc, boardName) {
        var path = __dirname + '/../../public/img/banners/' + boardName;
        if (_fs2.default.existsSync(path)) {
          acc[boardName] = _fs2.default.readdirSync(path).filter(function (fileName) {
            return '.gitignore' !== fileName;
          });
        } else {
          acc[boardName] = [];
        }
        return acc;
      }, {});
    }
  }, {
    key: 'reloadPostFormRules',
    value: function reloadPostFormRules() {
      var common = getRules();
      postFormRules = Board.boardNames().reduce(function (acc, boardName) {
        var specific = getRules(boardName).reverse();
        specific = specific.map(function (rule, i) {
          i = specific.length - i - 1;
          if ('#include all' === rule) {
            return common;
          } else if (RX_EXCEPT.test(rule)) {
            var _ret = function () {
              var excluded = rule.match(RX_EXCEPT)[2].split(',').map(function (n) {
                return +n;
              });
              return {
                v: common.filter(function (_, i) {
                  return excluded.indexOf(i) < 0;
                })
              };
            }();

            if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
          } else if (RX_SEVERAL.test(rule)) {
            return rule.match(RX_SEVERAL)[1].split(',').map(function (n) {
              return +n;
            }).filter(function (n) {
              return n >= 0 && n < common.length;
            }).map(function (n) {
              return common[n];
            });
          }
        });
        specific = (0, _underscore2.default)(specific).flatten();
        acc[boardName] = specific.length > 0 ? specific : common;
        return acc;
      }, {});
    }
  }, {
    key: 'initialize',
    value: function initialize() {
      boards = {};
      if ((0, _config2.default)('board.useDefaultBoards')) {
        getDefaultBoards().forEach(function (board) {
          Board.addBoard(board);
        });
      }
      Tools.loadPlugins([__dirname, __dirname + '/custom'], function (fileName, _1, _2, path) {
        return 'board.js' !== fileName || path.split('/') === 'custom';
      }).map(function (plugin) {
        return typeof plugin === 'function' ? new plugin() : plugin;
      }).forEach(function (board) {
        Board.addBoard(board);
      });
      Board.reloadBanners();
      Board.reloadPostFormRules();
    }
  }]);

  function Board(name, title) {
    var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

    var defaultPriority = _ref.defaultPriority;
    var defaultUserName = _ref.defaultUserName;
    var defaultGroupName = _ref.defaultGroupName;

    _classCallCheck(this, Board);

    defaultPriority = Tools.option(defaultPriority, 'number', 0);
    defaultUserName = defaultUserName ? Tools.translate(defaultUserName) : Tools.translate('Anonymous', 'defaultUserName');
    defaultGroupName = defaultGroupName || '';
    this.defineProperty('name', name);
    this.defineSetting('title', function () {
      return Tools.translate(title);
    });
    this.defineSetting('property', defaultPriority);
    this.defineSetting('defaultUserName', defaultUserName);
    this.defineSetting('groupName', defaultGroupName);
    this.defineProperty('captchaEnabled', function () {
      return (0, _config2.default)('board.captchaEnabled', true) && (0, _config2.default)('board.' + name + '.captchaEnabled', true);
    });
    this.defineProperty('bannerFileNames', function () {
      return banners[name];
    });
    this.defineProperty('postFormRules', function () {
      return postFormRules[name];
    });
    this.defineSetting('skippedGetOrder', 0);
    this.defineSetting('opModeration', false);
    this.defineSetting('captchaQuota', 0);
    this.defineSetting('enabled', true);
    this.defineSetting('hidden', false);
    this.defineSetting('maxNameLength', 50);
    this.defineSetting('maxSubjectLength', 150);
    this.defineSetting('maxTextLength', 15000);
    this.defineSetting('maxPasswordLength', 50);
    this.defineSetting('maxFileCount', 1);
    this.defineSetting('maxFileSize', 10 * 1024 * 1024);
    this.defineSetting('maxLastPosts', 3);
    this.defineSetting('markupElements', DEFAULT_MARKUP_ELEMENTS);
    this.defineSetting('postingEnabled', true);
    this.defineSetting('showWhois', false);
    var Captcha = Tools.requireWrapper(require('../captchas/captcha'));
    this.defineSetting('supportedCaptchaEngines', function () {
      return Captcha.captchaIDs();
    });
    this.defineProperty('permissions', function () {
      return (0, _underscore2.default)(Permissions.PERMISSIONS).mapObject(function (defaultLevel, key) {
        return (0, _config2.default)('board.' + name + '.permissions.' + key, (0, _config2.default)('permissions.' + key, defaultLevel));
      });
    });
    this.defineSetting('supportedFileTypes', DEFAULT_SUPPORTED_FILE_TYPES);
    this.defineSetting('bumpLimit', 500);
    this.defineSetting('postLimit', 1000);
    this.defineSetting('threadLimit', 200);
    this.defineSetting('archiveLimit', 0);
    this.defineSetting('threadsPerPage', 20);
    this.defineProperty('launchDate', function () {
      return new Date((0, _config2.default)('board.' + name + '.launchDate', (0, _config2.default)('board.launchDate', new Date())));
    });
  }

  _createClass(Board, [{
    key: 'defineSetting',
    value: function defineSetting(name, def) {
      var _this = this;

      Object.defineProperty(this, name, {
        get: function get() {
          return (0, _config2.default)('board.' + _this.name + '.' + name, (0, _config2.default)('board.' + name, typeof def === 'function' ? def() : def));
        },
        configurable: true
      });
    }
  }, {
    key: 'defineProperty',
    value: function defineProperty(name, value) {
      if (typeof value === 'function') {
        Object.defineProperty(this, name, {
          get: value,
          configurable: true
        });
      } else {
        Object.defineProperty(this, name, {
          value: value,
          configurable: true
        });
      }
    }
  }, {
    key: 'info',
    value: function info() {
      var _this2 = this;

      var model = {
        name: this.name,
        title: this.title,
        defaultUserName: this.defaultUserName,
        groupName: this.groupName,
        showWhois: this.showWhois,
        hidden: this.hidden,
        postingEnabled: this.postingEnabled,
        captchaEnabled: this.captchaEnabled,
        maxEmailLength: this.maxEmailLength,
        maxNameLength: this.maxNameLength,
        maxSubjectLength: this.maxSubjectLength,
        maxTextLength: this.maxTextLength,
        maxPasswordLength: this.maxPasswordLength,
        maxFileCount: this.maxFileCount,
        maxFileSize: this.maxFileSize,
        maxLastPosts: this.maxLastPosts,
        markupElements: this.markupElements,
        supportedFileTypes: this.supportedFileTypes,
        supportedCaptchaEngines: this.supportedCaptchaEngines,
        bumpLimit: this.bumpLimit,
        postLimit: this.postLimit,
        bannerFileNames: this.bannerFileNames,
        postFormRules: this.postFormRules,
        launchDate: this.launchDate.toISOString(),
        permissions: this.permissions,
        opModeration: this.opModeration
      };
      this.customInfoFields().forEach(function (field) {
        model[field] = _this2[field];
      });
      return model;
    }
  }, {
    key: 'customInfoFields',
    value: function customInfoFields() {
      return [];
    }
  }, {
    key: 'isCaptchaEngineSupported',
    value: function isCaptchaEngineSupported(engineName) {
      return (0, _underscore2.default)(this.supportedCaptchaEngines).contains(engineName);
    }
  }, {
    key: 'isFileTypeSupported',
    value: function isFileTypeSupported(fileType) {
      return (0, _underscore2.default)(this.supportedFileTypes).contains(fileType);
    }
  }, {
    key: 'apiRoutes',
    value: function apiRoutes() {
      return [];
    }
  }, {
    key: 'actionRoutes',
    value: function actionRoutes() {
      return [];
    }
  }, {
    key: 'testParameters',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(_ref2) {
        var _this3 = this;

        var req = _ref2.req;
        var mode = _ref2.mode;
        var fields = _ref2.fields;
        var files = _ref2.files;
        var existingFileCount = _ref2.existingFileCount;
        var name, subject, text, password, err;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                name = fields.name;
                subject = fields.subject;
                text = fields.text;
                password = fields.password;

                name = name || '';
                subject = subject || '';
                text = text || '';
                password = password || '';

                if (!(name.length > this.maxNameLength)) {
                  _context.next = 10;
                  break;
                }

                throw new Error(Tools.translate('Name is too long'));

              case 10:
                if (!(subject.length > this.maxSubjectLength)) {
                  _context.next = 12;
                  break;
                }

                throw new Error(Tools.translate('Subject is too long'));

              case 12:
                if (!(text.length > this.maxTextFieldLength)) {
                  _context.next = 14;
                  break;
                }

                throw new Error(Tools.translate('Comment is too long'));

              case 14:
                if (!(password.length > this.maxPasswordLength)) {
                  _context.next = 16;
                  break;
                }

                throw new Error(Tools.translate('Password is too long'));

              case 16:
                if (!('markupText' === mode || 'editPost' === mode)) {
                  _context.next = 18;
                  break;
                }

                return _context.abrupt('return');

              case 18:
                if (!('createThread' === mode && this.maxFileCount && files.length <= 0)) {
                  _context.next = 20;
                  break;
                }

                throw new Error(Tools.translate('Attempt to create a thread without attaching a file'));

              case 20:
                if ('deleteFile' === mode && existingFileCount > 0) {
                  --existingFileCount;
                }

                if (!(text.length <= 0 && files.length + existingFileCount <= 0)) {
                  _context.next = 23;
                  break;
                }

                throw new Error(Tools.translate('Both file and comment are missing'));

              case 23:
                if (!(files.length + existingFileCount > this.maxFileCount)) {
                  _context.next = 25;
                  break;
                }

                throw new Error(Tools.translate('Too many files'));

              case 25:
                err = files.reduce(function (err, file) {
                  if (err) {
                    return err;
                  }
                  if (file.size > _this3.maxFileSize) {
                    return Tools.translate('File is too big');
                  }
                  if (_this3.supportedFileTypes.indexOf(file.mimeType) < 0) {
                    return Tools.translate('File type is not supported');
                  }
                }, '');

                if (!err) {
                  _context.next = 28;
                  break;
                }

                throw err;

              case 28:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function testParameters(_x2) {
        return ref.apply(this, arguments);
      }

      return testParameters;
    }()
  }, {
    key: 'getPostExtraData',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(req, fields, files) {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                return _context2.abrupt('return', null);

              case 1:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function getPostExtraData(_x3, _x4, _x5) {
        return ref.apply(this, arguments);
      }

      return getPostExtraData;
    }()
  }, {
    key: 'editPostExtraData',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(req, fields, extraData) {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                return _context3.abrupt('return', extraData || null);

              case 1:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function editPostExtraData(_x6, _x7, _x8) {
        return ref.apply(this, arguments);
      }

      return editPostExtraData;
    }()
  }, {
    key: 'transformPostExtraData',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(extraData, sourceBoard) {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                return _context4.abrupt('return', null);

              case 1:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function transformPostExtraData(_x9, _x10) {
        return ref.apply(this, arguments);
      }

      return transformPostExtraData;
    }()
  }, {
    key: 'renderPost',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(post) {
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                post.rawSubject = post.subject;
                post.isOp = post.number === post.threadNumber;
                if (post.options.showTripcode) {
                  post.tripcode = this.generateTripcode(post.user.hashpass);
                }
                delete post.user.ip;
                delete post.user.hashpass;
                delete post.user.password;
                if (post.hasOwnProperty('geolocation')) {
                  if (this.showWhois) {
                    if (!post.geolocation.countryName) {
                      post.geolocation.countryName = 'Unknown country';
                    }
                  } else {
                    delete post.geolocation;
                  }
                }
                return _context5.abrupt('return', post);

              case 8:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function renderPost(_x11) {
        return ref.apply(this, arguments);
      }

      return renderPost;
    }()
  }, {
    key: 'generateTripcode',
    value: function generateTripcode(source) {
      return '!' + Tools.crypto('md5', source + (0, _config2.default)('site.tripcodeSalt'), 'base64').substr(0, 10);
    }
  }]);

  return Board;
}();

exports.default = Board;
//# sourceMappingURL=board.js.map
