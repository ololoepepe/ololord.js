'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var getNodeCaptchaImage = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(_1, res) {
    var _this = this;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            (0, _nodeCaptcha2.default)({
              fileMode: 1,
              saveDir: CAPTCHA_PATH,
              size: this.size,
              height: this.height,
              width: this.width,
              color: this.color,
              background: this.background,
              lineWidth: this.lineWidth,
              noise: this.noise,
              noiseColor: this.noiseColor,
              complexity: this.complexity,
              spacing: this.spacing
            }, function (response, fileName) {
              var challengeID = _uuid2.default.v4();
              _this.challenges.set(challenge, {
                id: challengeID,
                fileName: fileName,
                response: response,
                timer: setTimeout(function () {
                  _fs2.default.remove(CAPTCHA_PATH + '/' + fileName).catch(function (err) {
                    _logger2.default.error(err);
                  });
                  _this.challenges.delete(challengeID);
                }, _this.ttl)
              });
              res.json({
                challenge: challengeID,
                fileName: fileName,
                ttl: _this.ttl
              });
            });

          case 1:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function getNodeCaptchaImage(_x, _x2) {
    return ref.apply(this, arguments);
  };
}();

var _nodeCaptcha = require('node-captcha');

var _nodeCaptcha2 = _interopRequireDefault(_nodeCaptcha);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _captcha = require('./captcha');

var _captcha2 = _interopRequireDefault(_captcha);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var CAPTCHA_PATH = __dirname + '/../../public/node-captcha';

var NodeCaptcha = function (_Captcha) {
  _inherits(NodeCaptcha, _Captcha);

  _createClass(NodeCaptcha, null, [{
    key: 'removeOldCaptchImages',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
        var fileNames;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.prev = 0;
                _context3.next = 3;
                return _fs2.default.list(CAPTCHA_PATH);

              case 3:
                fileNames = _context3.sent;
                _context3.next = 6;
                return Tools.series(fileNames.filter(function (fileName) {
                  var _fileName$split = fileName.split('.');

                  var _fileName$split2 = _slicedToArray(_fileName$split, 2);

                  var name = _fileName$split2[0];
                  var suffix = _fileName$split2[1];

                  return 'png' === suffix && /^[0-9]+$/.test(name);
                }), function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(fileName) {
                    return regeneratorRuntime.wrap(function _callee2$(_context2) {
                      while (1) {
                        switch (_context2.prev = _context2.next) {
                          case 0:
                            _context2.next = 2;
                            return _fs2.default.remove(CAPTCHA_PATH + '/' + fileName);

                          case 2:
                            return _context2.abrupt('return', _context2.sent);

                          case 3:
                          case 'end':
                            return _context2.stop();
                        }
                      }
                    }, _callee2, this);
                  }));

                  return function (_x3) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 6:
                _context3.next = 11;
                break;

              case 8:
                _context3.prev = 8;
                _context3.t0 = _context3['catch'](0);

                _logger2.default.error(_context3.t0.stack || _context3.t0);

              case 11:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this, [[0, 8]]);
      }));

      function removeOldCaptchImages() {
        return ref.apply(this, arguments);
      }

      return removeOldCaptchImages;
    }()
  }]);

  function NodeCaptcha() {
    _classCallCheck(this, NodeCaptcha);

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(NodeCaptcha).call(this, Tools.NODE_CAPTCHA_ID, Tools.translate.noop('Node captcha')));

    _this2.challenges = new Map();
    _this2.defineSetting('size', 6);
    _this2.defineSetting('height', 60);
    _this2.defineSetting('color', 'rgb(0,0,0)');
    _this2.defineSetting('background', 'rgb(255,255,255)');
    _this2.defineSetting('lineWidth', 4);
    _this2.defineSetting('noise', true);
    _this2.defineSetting('complexity', 1);
    _this2.defineSetting('spacing', 4);
    _this2.defineProperty('width', function () {
      return (0, _config2.default)('captcha.node-captcha.width', Math.round(_this2.size * _this2.height / 1.8));
    });
    _this2.defineProperty('noiseColor', function () {
      return (0, _config2.default)('captcha.node-captcha.noiseColor', _this2.color);
    });
    return _this2;
  }

  _createClass(NodeCaptcha, [{
    key: 'customInfoFields',
    value: function customInfoFields() {
      return ['size', 'height', 'width', 'ttl'];
    }
  }, {
    key: 'checkCaptcha',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(_1, _ref) {
        var nodeCaptchaChallenge = _ref.nodeCaptchaChallenge;
        var nodeCaptchaResponse = _ref.nodeCaptchaResponse;
        var challengeID, response, challenge;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                challengeID = nodeCaptchaChallenge;
                response = nodeCaptchaResponse;

                if (challengeID) {
                  _context4.next = 4;
                  break;
                }

                throw new Error(Tools.translate('Captcha challenge is empty'));

              case 4:
                if (response) {
                  _context4.next = 6;
                  break;
                }

                throw new Error(Tools.translate('Captcha is empty'));

              case 6:
                challenge = this.challenges.get(challengeID);

                if (challenge) {
                  _context4.next = 9;
                  break;
                }

                throw new Error(Tools.translate('Invalid captcha'));

              case 9:
                clearTimeout(challenge.timer);
                _fs2.default.remove(CAPTCHA_PATH + '/' + c.fileName).catch(function (err) {
                  _logger2.default.error(err);
                });
                this.challenges.delete(challengeID);

                if (!(response !== challenge.response)) {
                  _context4.next = 14;
                  break;
                }

                throw new Error(Tools.translate('Captcha is solved incorrectly'));

              case 14:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function checkCaptcha(_x4, _x5) {
        return ref.apply(this, arguments);
      }

      return checkCaptcha;
    }()
  }, {
    key: 'apiRoutes',
    value: function apiRoutes() {
      return [{
        method: 'get',
        path: '/nodeCaptchaImage.json',
        handler: getNodeCaptchaImage.bind(this)
      }];
    }
  }]);

  return NodeCaptcha;
}(_captcha2.default);

exports.default = NodeCaptcha;
//# sourceMappingURL=node-captcha.js.map
