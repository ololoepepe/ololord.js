'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _http = require('q-io/http');

var _http2 = _interopRequireDefault(_http);

var _captcha = require('./captcha');

var _captcha2 = _interopRequireDefault(_captcha);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ERROR_CODE_TRANSLATIONS = {
  'missing-input-secret': Tools.translate.noop('The secret captcha parameter is missing'),
  'invalid-input-secret': Tools.translate.noop('The secret captcha parameter is invalid or malformed'),
  'missing-input-response': Tools.translate.noop('The captcha response parameter is missing'),
  'invalid-input-response': Tools.translate.noop('The captcha response parameter is invalid or malformed')
};

var GoogleRecaptcha = function (_Captcha) {
  _inherits(GoogleRecaptcha, _Captcha);

  function GoogleRecaptcha() {
    _classCallCheck(this, GoogleRecaptcha);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(GoogleRecaptcha).call(this, 'google-recaptcha', Tools.translate.noop('Google reCAPTCHA')));

    _this.defineSetting('timeout', 15 * Tools.SECOND);
    return _this;
  }

  _createClass(GoogleRecaptcha, [{
    key: 'checkCaptcha',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(_ref, fields) {
        var ip = _ref.ip;
        var captcha, query, reply, data, result;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                captcha = fields['g-recaptcha-response'];

                if (captcha) {
                  _context.next = 3;
                  break;
                }

                throw new Error(Tools.translate('Captcha is empty'));

              case 3:
                query = 'secret=' + this.privateKey + '&response=' + captcha + '&remoteip=' + ip;
                _context.next = 6;
                return _http2.default.request({
                  url: 'https://www.google.com/recaptcha/api/siteverify?' + query,
                  timeout: this.timeout
                });

              case 6:
                reply = _context.sent;

                if (!(200 !== reply.status)) {
                  _context.next = 9;
                  break;
                }

                throw new Error(Tools.translate('Failed to check captcha'));

              case 9:
                _context.next = 11;
                return reply.body.read('utf8');

              case 11:
                data = _context.sent;
                result = JSON.parse(data.toString());

                if (result.success) {
                  _context.next = 16;
                  break;
                }

                (0, _underscore2.default)(ERROR_CODE_TRANSLATIONS).each(function (translation, errorCode) {
                  if (errorCodes.indexOf(errorCode) >= 0) {
                    throw new Error(Tools.translate(translation));
                  }
                });
                throw new Error(Tools.translate('Invalid captcha'));

              case 16:
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
  }]);

  return GoogleRecaptcha;
}(_captcha2.default);

exports.default = GoogleRecaptcha;
//# sourceMappingURL=google-recaptcha.js.map
