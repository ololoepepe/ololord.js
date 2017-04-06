'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var getNodeCaptchaImage = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(req, res, next) {
    var challenge, self;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            challenge = this.challenges[req.ip];

            if (!challenge) {
              _context2.next = 4;
              break;
            }

            res.sendFile(challenge.fileName, { root: CAPTCHA_PATH });
            return _context2.abrupt('return');

          case 4:
            self = this;

            (0, _nodeCaptcha2.default)({
              fileMode: 2,
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
            }, function () {
              var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(response, data) {
                var fileName;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _context.prev = 0;
                        fileName = _underscore2.default.now() + '.png';
                        _context.next = 4;
                        return _fs2.default.write(CAPTCHA_PATH + '/' + fileName, data);

                      case 4:
                        self.challenges.set(req.ip, {
                          ip: req.ip,
                          fileName: fileName,
                          response: response,
                          timer: setTimeout(function () {
                            _fs2.default.remove(CAPTCHA_PATH + '/' + fileName).catch(function (err) {
                              _logger2.default.error(err);
                            });
                            self.challenges.delete(challenge);
                          }, self.ttl)
                        });
                        res.end(data);
                        _context.next = 11;
                        break;

                      case 8:
                        _context.prev = 8;
                        _context.t0 = _context['catch'](0);

                        next(_context.t0);

                      case 11:
                      case 'end':
                        return _context.stop();
                    }
                  }
                }, _callee, this, [[0, 8]]);
              }));

              return function (_x4, _x5) {
                return _ref2.apply(this, arguments);
              };
            }());

          case 6:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getNodeCaptchaImage(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _nodeCaptcha = require('node-captcha');

var _nodeCaptcha2 = _interopRequireDefault(_nodeCaptcha);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

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

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var CAPTCHA_PATH = __dirname + '/../../tmp/node-captcha-noscript';

var NodeCaptchaNoscript = function (_Captcha) {
  _inherits(NodeCaptchaNoscript, _Captcha);

  _createClass(NodeCaptchaNoscript, null, [{
    key: 'removeOldCaptchImages',
    value: function () {
      var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
        var fileNames;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.prev = 0;
                _context4.next = 3;
                return _fs2.default.list(CAPTCHA_PATH);

              case 3:
                fileNames = _context4.sent;
                _context4.next = 6;
                return Tools.series(fileNames.filter(function (fileName) {
                  var _fileName$split = fileName.split('.'),
                      _fileName$split2 = _slicedToArray(_fileName$split, 2),
                      name = _fileName$split2[0],
                      suffix = _fileName$split2[1];

                  return 'png' === suffix && /^[0-9]+$/.test(name);
                }), function () {
                  var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(fileName) {
                    return regeneratorRuntime.wrap(function _callee3$(_context3) {
                      while (1) {
                        switch (_context3.prev = _context3.next) {
                          case 0:
                            _context3.next = 2;
                            return _fs2.default.remove(CAPTCHA_PATH + '/' + fileName);

                          case 2:
                            return _context3.abrupt('return', _context3.sent);

                          case 3:
                          case 'end':
                            return _context3.stop();
                        }
                      }
                    }, _callee3, this);
                  }));

                  return function (_x6) {
                    return _ref4.apply(this, arguments);
                  };
                }());

              case 6:
                _context4.next = 11;
                break;

              case 8:
                _context4.prev = 8;
                _context4.t0 = _context4['catch'](0);

                _logger2.default.error(_context4.t0.stack || _context4.t0);

              case 11:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this, [[0, 8]]);
      }));

      function removeOldCaptchImages() {
        return _ref3.apply(this, arguments);
      }

      return removeOldCaptchImages;
    }()
  }]);

  function NodeCaptchaNoscript() {
    _classCallCheck(this, NodeCaptchaNoscript);

    var _this = _possibleConstructorReturn(this, (NodeCaptchaNoscript.__proto__ || Object.getPrototypeOf(NodeCaptchaNoscript)).call(this, 'node-captcha-noscript', Tools.translate.noop('Node captcha (no script)')));

    _this.challenges = new Map();
    _this.defineSetting('size', 6);
    _this.defineSetting('height', 60);
    _this.defineSetting('color', 'rgb(0,0,0)');
    _this.defineSetting('background', 'rgb(255,255,255)');
    _this.defineSetting('lineWidth', 4);
    _this.defineSetting('noise', true);
    _this.defineSetting('complexity', 1);
    _this.defineSetting('spacing', 4);
    _this.defineProperty('width', function () {
      return (0, _config2.default)('captcha.node-captcha.width', Math.round(_this.size * _this.height / 1.8));
    });
    _this.defineProperty('noiseColor', function () {
      return (0, _config2.default)('captcha.node-captcha.noiseColor', _this.color);
    });
    _this.defineSetting('ttl', 5 * Tools.MINUTE);
    return _this;
  }

  _createClass(NodeCaptchaNoscript, [{
    key: 'checkCaptcha',
    value: function () {
      var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(_ref6, _ref7) {
        var ip = _ref6.ip;
        var nodeCaptchaResponse = _ref7.nodeCaptchaResponse;
        var challenge, response;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                challenge = this.challenges.get(ip);
                response = nodeCaptchaResponse;

                if (challenge) {
                  _context5.next = 4;
                  break;
                }

                throw new Error(Tools.translate('No captcha for this IP'));

              case 4:
                if (response) {
                  _context5.next = 6;
                  break;
                }

                throw new Error(Tools.translate('Captcha is empty'));

              case 6:
                clearTimeout(challenge.timer);
                _fs2.default.remove(CAPTCHA_PATH + '/' + challenge.fileName).catch(function (err) {
                  _logger2.default.error(err);
                });
                this.challenges.delete(ip);

                if (!(response !== challenge.response)) {
                  _context5.next = 11;
                  break;
                }

                throw new Error(Tools.translate('Captcha is solved incorrectly'));

              case 11:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function checkCaptcha(_x7, _x8) {
        return _ref5.apply(this, arguments);
      }

      return checkCaptcha;
    }()
  }, {
    key: 'apiRoutes',
    value: function apiRoutes() {
      return [{
        method: 'get',
        path: '/nodeCaptchaImage.png',
        handler: getNodeCaptchaImage.bind(this)
      }];
    }
  }]);

  return NodeCaptchaNoscript;
}(_captcha2.default);

exports.default = NodeCaptchaNoscript;
//# sourceMappingURL=node-captcha-noscript.js.map
