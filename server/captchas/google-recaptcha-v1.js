'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _http = require('q-io/http');

var _http2 = _interopRequireDefault(_http);

var _captcha = require('./captcha');

var _captcha2 = _interopRequireDefault(_captcha);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var GoogleRecaptchaV1 = function (_Captcha) {
  _inherits(GoogleRecaptchaV1, _Captcha);

  function GoogleRecaptchaV1() {
    _classCallCheck(this, GoogleRecaptchaV1);

    var _this = _possibleConstructorReturn(this, (GoogleRecaptchaV1.__proto__ || Object.getPrototypeOf(GoogleRecaptchaV1)).call(this, 'google-recaptcha-v1', Tools.translate.noop('Google reCAPTCHA v1')));

    _this.defineSetting('timeout', 15 * Tools.SECOND);
    return _this;
  }

  _createClass(GoogleRecaptchaV1, [{
    key: 'checkCaptcha',
    value: function () {
      var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(_ref2, _ref3) {
        var ip = _ref2.ip;
        var recaptcha_challenge_field = _ref3.recaptcha_challenge_field,
            recaptcha_response_field = _ref3.recaptcha_response_field;
        var challenge, response, query, reply, data, result;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                challenge = recaptcha_challenge_field;
                response = recaptcha_response_field;

                if (challenge) {
                  _context.next = 4;
                  break;
                }

                throw new Error(Tools.translate('Captcha challenge is empty'));

              case 4:
                if (response) {
                  _context.next = 6;
                  break;
                }

                throw new Error(Tools.translate('Captcha is empty'));

              case 6:
                query = 'privatekey=' + this.privateKey + '&remoteip=' + ip + '&challenge=' + encodeURIComponent(challenge) + ('&response=' + encodeURIComponent(response));
                _context.next = 9;
                return _http2.default.request({
                  url: 'https://www.google.com/recaptcha/api/verify?' + query,
                  timeout: this.timeout
                });

              case 9:
                reply = _context.sent;

                if (!(200 !== reply.status)) {
                  _context.next = 12;
                  break;
                }

                throw new Error(Tools.translate('Failed to check captcha'));

              case 12:
                _context.next = 14;
                return reply.body.read('utf8');

              case 14:
                data = _context.sent;
                result = data.toString();

                if (!(result.indexOf('true') < 0)) {
                  _context.next = 18;
                  break;
                }

                throw new Error(Tools.translate('Invalid captcha'));

              case 18:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function checkCaptcha(_x, _x2) {
        return _ref.apply(this, arguments);
      }

      return checkCaptcha;
    }()
  }]);

  return GoogleRecaptchaV1;
}(_captcha2.default);

exports.default = GoogleRecaptchaV1;
//# sourceMappingURL=google-recaptcha-v1.js.map
