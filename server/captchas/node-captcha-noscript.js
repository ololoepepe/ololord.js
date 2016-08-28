'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var getNodeCaptchaImage = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(req, res, next) {
    var challenge, self;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            challenge = this.challenges[req.ip];

            if (!challenge) {
              _context3.next = 4;
              break;
            }

            res.sendFile(challenge.fileName, { root: CAPTCHA_PATH });
            return _context3.abrupt('return');

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
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(response, data) {
                var _this = this;

                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                  while (1) {
                    switch (_context2.prev = _context2.next) {
                      case 0:
                        _context2.prev = 0;
                        return _context2.delegateYield(regeneratorRuntime.mark(function _callee() {
                          var fileName;
                          return regeneratorRuntime.wrap(function _callee$(_context) {
                            while (1) {
                              switch (_context.prev = _context.next) {
                                case 0:
                                  fileName = _underscore2.default.now() + '.png';
                                  _context.next = 3;
                                  return _fs2.default.write(CAPTCHA_PATH + '/' + fileName, data);

                                case 3:
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

                                case 5:
                                case 'end':
                                  return _context.stop();
                              }
                            }
                          }, _callee, _this);
                        })(), 't0', 2);

                      case 2:
                        _context2.next = 7;
                        break;

                      case 4:
                        _context2.prev = 4;
                        _context2.t1 = _context2['catch'](0);

                        next(_context2.t1);

                      case 7:
                      case 'end':
                        return _context2.stop();
                    }
                  }
                }, _callee2, this, [[0, 4]]);
              }));

              return function (_x4, _x5) {
                return ref.apply(this, arguments);
              };
            }());

          case 6:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function getNodeCaptchaImage(_x, _x2, _x3) {
    return ref.apply(this, arguments);
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

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var CAPTCHA_PATH = __dirname + '/../../tmp/node-captcha-noscript';

var NodeCaptchaNoscript = function (_Captcha) {
  _inherits(NodeCaptchaNoscript, _Captcha);

  _createClass(NodeCaptchaNoscript, null, [{
    key: 'removeOldCaptchImages',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
        var fileNames;
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                _context5.prev = 0;
                _context5.next = 3;
                return _fs2.default.list(CAPTCHA_PATH);

              case 3:
                fileNames = _context5.sent;
                _context5.next = 6;
                return Tools.series(fileNames.filter(function (fileName) {
                  var _fileName$split = fileName.split('.');

                  var _fileName$split2 = _slicedToArray(_fileName$split, 2);

                  var name = _fileName$split2[0];
                  var suffix = _fileName$split2[1];

                  return 'png' === suffix && /^[0-9]+$/.test(name);
                }), function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(fileName) {
                    return regeneratorRuntime.wrap(function _callee4$(_context4) {
                      while (1) {
                        switch (_context4.prev = _context4.next) {
                          case 0:
                            _context4.next = 2;
                            return _fs2.default.remove(CAPTCHA_PATH + '/' + fileName);

                          case 2:
                            return _context4.abrupt('return', _context4.sent);

                          case 3:
                          case 'end':
                            return _context4.stop();
                        }
                      }
                    }, _callee4, this);
                  }));

                  return function (_x6) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 6:
                _context5.next = 11;
                break;

              case 8:
                _context5.prev = 8;
                _context5.t0 = _context5['catch'](0);

                _logger2.default.error(_context5.t0.stack || _context5.t0);

              case 11:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this, [[0, 8]]);
      }));

      function removeOldCaptchImages() {
        return ref.apply(this, arguments);
      }

      return removeOldCaptchImages;
    }()
  }]);

  function NodeCaptchaNoscript() {
    _classCallCheck(this, NodeCaptchaNoscript);

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(NodeCaptchaNoscript).call(this, 'node-captcha-noscript', Tools.translate.noop('Node captcha (no script)')));

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

  _createClass(NodeCaptchaNoscript, [{
    key: 'checkCaptcha',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(ip, _ref) {
        var nodeCaptchaResponse = _ref.nodeCaptchaResponse;
        var challenge, response;
        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                challenge = this.challenges.get(ip);
                response = nodeCaptchaResponse;

                if (challenge) {
                  _context6.next = 4;
                  break;
                }

                throw new Error(Tools.translate('No captcha for this IP'));

              case 4:
                if (response) {
                  _context6.next = 6;
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
                  _context6.next = 11;
                  break;
                }

                throw new Error(Tools.translate('Captcha is solved incorrectly'));

              case 11:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));

      function checkCaptcha(_x7, _x8) {
        return ref.apply(this, arguments);
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
