'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var captchas = {};

var Captcha = function () {
  _createClass(Captcha, null, [{
    key: 'captcha',
    value: function captcha(id) {
      return captchas[id];
    }
  }, {
    key: 'addCaptcha',
    value: function addCaptcha(captcha) {
      captchas[captcha.id] = captcha;
    }
  }, {
    key: 'captchaIDs',
    value: function captchaIDs() {
      return (0, _underscore2.default)(captchas).toArray().sort(function (c1, c2) {
        return c1.id.localeCompare(c2.id);
      }).map(function (captcha) {
        return captcha.id;
      });
    }
  }, {
    key: 'checkCaptcha',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(ip) {
        var fields = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var boardName, captchaEngine, board, quota, supportedCaptchaEngines, ceid, captcha;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                boardName = fields.boardName;
                captchaEngine = fields.captchaEngine;
                board = _board2.default.board(boardName);

                if (board) {
                  _context.next = 5;
                  break;
                }

                throw new Error(Tools.translate('Invalid board'));

              case 5:
                if (board.captchaEnabled) {
                  _context.next = 7;
                  break;
                }

                return _context.abrupt('return');

              case 7:
                _context.next = 9;
                return UsersModel.getUserCaptchaQuota(boardName, ip);

              case 9:
                quota = _context.sent;

                if (!(board.captchaQuota > 0 && +quota > 0)) {
                  _context.next = 14;
                  break;
                }

                _context.next = 13;
                return UsersModel.useCaptcha(boardName, ip);

              case 13:
                return _context.abrupt('return', _context.sent);

              case 14:
                supportedCaptchaEngines = board.supportedCaptchaEngines;

                if (!(supportedCaptchaEngines.length < 1)) {
                  _context.next = 17;
                  break;
                }

                throw new Error(Tools.translate('Internal error: no captcha engine'));

              case 17:
                ceid = captchaEngine || null;

                if (!ceid || !(0, _underscore2.default)(supportedCaptchaEngines).contains(ceid)) {
                  if ((0, _underscore2.default)(supportedCaptchaEngines).contains(Tools.NODE_CAPTCHA_ID)) {
                    ceid = Tools.NODE_CAPTCHA_ID;
                  } else {
                    ceid = supportedCaptchaEngines[0].id;
                  }
                }
                captcha = Captcha.captcha(ceid);

                if (captcha) {
                  _context.next = 22;
                  break;
                }

                throw new Error(Tools.translate('Invalid captcha engine'));

              case 22:
                _context.next = 24;
                return captcha.checkCaptcha(ip, fields);

              case 24:
                _context.next = 26;
                return UsersModel.setUserCaptchaQuota(boardName, ip, board.captchaQuota);

              case 26:
                return _context.abrupt('return', _context.sent);

              case 27:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function checkCaptcha(_x, _x2) {
        return ref.apply(this, arguments);
      }

      return checkCaptcha;
    }()
  }, {
    key: 'initialize',
    value: function initialize() {
      captchas = {};
      Tools.loadPlugins([__dirname, __dirname + '/custom'], function (fileName, _1, _2, path) {
        return 'captcha.js' !== fileName || path.split('/') === 'custom';
      }).map(function (plugin) {
        return typeof plugin === 'function' ? new plugin() : plugin;
      }).forEach(function (captcha) {
        Captcha.addCaptcha(captcha);
      });
    }
  }]);

  function Captcha(id, title) {
    _classCallCheck(this, Captcha);

    this.defineProperty('id', id);
    this.defineProperty('title', function () {
      return Tools.translate(title);
    });
    this.defineSetting('privateKey');
    this.defineSetting('publicKey');
  }

  _createClass(Captcha, [{
    key: 'defineSetting',
    value: function defineSetting(name, def) {
      var _this = this;

      Object.defineProperty(this, name, {
        get: function get() {
          return (0, _config2.default)('captcha.' + _this.id + '.' + name, typeof def === 'function' ? def() : def);
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
        id: this.id,
        title: this.title,
        publicKey: this.publicKey
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
    key: 'apiRoutes',
    value: function apiRoutes() {
      return [];
    }
  }, {
    key: 'actionRoutes',
    value: function actionRoutes() {
      return [];
    }
  }]);

  return Captcha;
}();

exports.default = Captcha;
//# sourceMappingURL=captcha.js.map
