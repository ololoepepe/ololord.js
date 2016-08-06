"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _logger = require("../helpers/logger");

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var captcha = require("node-captcha");
var FS = require("q-io/fs");
var UUID = require("uuid");

var Captcha = require("./captcha");
var config = require("../helpers/config");
var Tools = require("../helpers/tools");

var nodeCaptcha = new Captcha("node-captcha-noscript", Tools.translate.noop("Node captcha (no script)"));

nodeCaptcha.challenges = {};

nodeCaptcha.checkCaptcha = function (req, fields) {
  var challenge = nodeCaptcha.challenges[req.ip];
  if (!challenge) {
    return Promise.reject(Tools.translate("No captcha for this IP"));
  }
  var response = fields.nodeCaptchaResponse;
  if (!response) {
    return Promise.reject(Tools.translate("Captcha is empty"));
  }
  clearTimeout(challenge.timer);
  FS.remove(__dirname + "/../tmp/node-captcha-noscript/" + challenge.fileName).catch(function (err) {
    _logger2.default.error(err);
  });
  delete nodeCaptcha.challenges[req.ip];
  if (response !== challenge.response) {
    return Promise.reject(Tools.translate("Captcha is solved incorrectly"));
  }
  return Promise.resolve();
};

nodeCaptcha.apiRoutes = function () {
  return [{
    method: "get",
    path: "/nodeCaptchaImage.png",
    handler: function handler(req, res) {
      var challenge = nodeCaptcha.challenges[req.ip];
      if (challenge) {
        res.sendFile(challenge.fileName, { root: __dirname + "/../tmp/node-captcha-noscript" });
      } else {
        var size = config("captcha.node-captcha.size", 6);
        var height = config("captcha.node-captcha.height", 60);
        var color = config("captcha.node-captcha.color", "rgb(0,0,0)");
        captcha({
          fileMode: 2,
          size: size,
          height: height,
          width: config("captcha.node-captcha.width", Math.round(height * size / 1.8)),
          color: color,
          background: config("captcha.node-captcha.background", "rgb(255,255,255)"),
          lineWidth: config("captcha.node-captcha.lineWidth", 4),
          noise: config("captcha.node-captcha.noise", true),
          noiseColor: config("captcha.node-captcha.noiseColor", color),
          complexity: config("captcha.node-captcha.complexity", 1),
          spacing: config("captcha.node-captcha.spacing", 4)
        }, function (response, data) {
          var fileName = +Tools.now() + ".png";
          FS.write(__dirname + "/../tmp/node-captcha-noscript/" + fileName, data).then(function () {
            nodeCaptcha.challenges[req.ip] = {
              challenge: challenge,
              fileName: fileName,
              response: response,
              timer: setTimeout(function () {
                FS.remove(__dirname + "/../tmp/node-captcha-noscript/" + fileName).catch(function (err) {
                  _logger2.default.error(err);
                });
                delete nodeCaptcha.challenges[challenge];
              }, config("captcha.node-captcha.ttl", 5 * Tools.Minute))
            };
            res.end(data);
          });
        });
      }
    }
  }];
};

nodeCaptcha.removeOldCaptchImages = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
  var PATH, fileNames;
  return regeneratorRuntime.wrap(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          PATH = __dirname + "/../tmp/node-captcha-noscript";
          _context2.next = 4;
          return FS.list(PATH);

        case 4:
          fileNames = _context2.sent;
          _context2.next = 7;
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
                      return FS.remove(path + "/" + fileName);

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

        case 7:
          _context2.next = 12;
          break;

        case 9:
          _context2.prev = 9;
          _context2.t0 = _context2["catch"](0);

          _logger2.default.error(_context2.t0.stack || _context2.t0);

        case 12:
        case "end":
          return _context2.stop();
      }
    }
  }, _callee2, this, [[0, 9]]);
}));

module.exports = nodeCaptcha;
//# sourceMappingURL=node-captcha-noscript.js.map
