"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _captcha = require("./captcha");

var _captcha2 = _interopRequireDefault(_captcha);

var _config = require("../helpers/config");

var _config2 = _interopRequireDefault(_config);

var _logger = require("../helpers/logger");

var _logger2 = _interopRequireDefault(_logger);

var _tools = require("../helpers/tools");

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var captcha = require("node-captcha");
var FS = require("q-io/fs");
var UUID = require("uuid");

var nodeCaptcha = new _captcha2.default(Tools.NODE_CAPTCHA_ID, Tools.translate.noop("Node captcha"));

nodeCaptcha.challenges = {};

nodeCaptcha.info = function () {
    var inf = _captcha2.default.prototype.info.call(this);
    inf.size = (0, _config2.default)("captcha.node-captcha.size", 6);
    inf.height = (0, _config2.default)("captcha.node-captcha.height", 60);
    inf.width = (0, _config2.default)("captcha.node-captcha.width", Math.round(inf.size * inf.height / 1.8));
    inf.ttl = (0, _config2.default)("captcha.node-captcha.ttl", 5 * Tools.Minute);
    return inf;
};

nodeCaptcha.checkCaptcha = function (_1, fields) {
    var challenge = fields.nodeCaptchaChallenge;
    var response = fields.nodeCaptchaResponse;
    if (!challenge) return Promise.reject(Tools.translate("Captcha challenge is empty"));
    if (!response) return Promise.reject(Tools.translate("Captcha is empty"));
    var c = nodeCaptcha.challenges[challenge];
    if (!c) return Promise.reject(Tools.translate("Invalid captcha"));
    clearTimeout(c.timer);
    FS.remove(__dirname + "/../public/node-captcha/" + c.fileName).catch(function (err) {
        _logger2.default.error(err);
    });
    delete nodeCaptcha.challenges[challenge];
    if (response !== c.response) return Promise.reject(Tools.translate("Captcha is solved incorrectly"));
    return Promise.resolve();
};

nodeCaptcha.apiRoutes = function () {
    return [{
        method: "get",
        path: "/nodeCaptchaImage.json",
        handler: function handler(_1, res) {
            var size = (0, _config2.default)("captcha.node-captcha.size", 6);
            var height = (0, _config2.default)("captcha.node-captcha.height", 60);
            var color = (0, _config2.default)("captcha.node-captcha.color", "rgb(0,0,0)");
            captcha({
                fileMode: 1,
                saveDir: __dirname + "/../public/node-captcha",
                size: size,
                height: height,
                width: (0, _config2.default)("captcha.node-captcha.width", Math.round(height * size / 1.8)),
                color: color,
                background: (0, _config2.default)("captcha.node-captcha.background", "rgb(255,255,255)"),
                lineWidth: (0, _config2.default)("captcha.node-captcha.lineWidth", 4),
                noise: (0, _config2.default)("captcha.node-captcha.noise", true),
                noiseColor: (0, _config2.default)("captcha.node-captcha.noiseColor", color),
                complexity: (0, _config2.default)("captcha.node-captcha.complexity", 1),
                spacing: (0, _config2.default)("captcha.node-captcha.spacing", 4)
            }, function (response, fileName) {
                var challenge = UUID.v4();
                nodeCaptcha.challenges[challenge] = {
                    challenge: challenge,
                    fileName: fileName,
                    response: response,
                    timer: setTimeout(function () {
                        FS.remove(__dirname + "/../public/node-captcha/" + fileName).catch(function (err) {
                            _logger2.default.error(err);
                        });
                        delete nodeCaptcha.challenges[challenge];
                    }, (0, _config2.default)("captcha.node-captcha.ttl", 5 * Tools.Minute))
                };
                res.send({
                    challenge: challenge,
                    fileName: fileName,
                    ttl: (0, _config2.default)("captcha.node-captcha.ttl", 5 * Tools.Minute)
                });
            });
        }
    }];
};

nodeCaptcha.removeOldCaptchImages = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
    var _this = this;

    return regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
            switch (_context3.prev = _context3.next) {
                case 0:
                    _context3.prev = 0;
                    return _context3.delegateYield(regeneratorRuntime.mark(function _callee2() {
                        var PATH, fileNames;
                        return regeneratorRuntime.wrap(function _callee2$(_context2) {
                            while (1) {
                                switch (_context2.prev = _context2.next) {
                                    case 0:
                                        PATH = __dirname + "/../public/node-captcha";
                                        _context2.next = 3;
                                        return FS.list(PATH);

                                    case 3:
                                        fileNames = _context2.sent;
                                        _context2.next = 6;
                                        return Tools.series(fileNames.filter(function (fileName) {
                                            var _fileName$split = fileName.split('.');

                                            var _fileName$split2 = _slicedToArray(_fileName$split, 2);

                                            var name = _fileName$split2[0];
                                            var suffix = _fileName$split2[1];

                                            return 'png' === suffix && /^[0-9]+$/.test(name);
                                        }), function () {
                                            var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(fileName) {
                                                return regeneratorRuntime.wrap(function _callee$(_context) {
                                                    while (1) {
                                                        switch (_context.prev = _context.next) {
                                                            case 0:
                                                                _context.next = 2;
                                                                return FS.remove(PATH + "/" + fileName);

                                                            case 2:
                                                                return _context.abrupt("return", _context.sent);

                                                            case 3:
                                                            case "end":
                                                                return _context.stop();
                                                        }
                                                    }
                                                }, _callee, this);
                                            }));

                                            return function (_x) {
                                                return ref.apply(this, arguments);
                                            };
                                        }());

                                    case 6:
                                    case "end":
                                        return _context2.stop();
                                }
                            }
                        }, _callee2, _this);
                    })(), "t0", 2);

                case 2:
                    _context3.next = 7;
                    break;

                case 4:
                    _context3.prev = 4;
                    _context3.t1 = _context3["catch"](0);

                    _logger2.default.error(_context3.t1.stack || _context3.t1);

                case 7:
                case "end":
                    return _context3.stop();
            }
        }
    }, _callee3, this, [[0, 4]]);
}));

module.exports = nodeCaptcha;
//# sourceMappingURL=node-captcha.js.map
