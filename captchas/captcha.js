'use strict';

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _nodeCaptcha = require('../captchas/node-captcha');

var _nodeCaptcha2 = _interopRequireDefault(_nodeCaptcha);

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

var captchas = {};

var defineSetting = function defineSetting(o, name, def) {
    Object.defineProperty(o, name, {
        get: function (o, name, def) {
            return (0, _config2.default)("captcha." + o.id + "." + name, def);
        }.bind(o, o, name, def)
    });
};

var Captcha = function Captcha(id, title, options) {
    Object.defineProperty(this, "id", { value: id });
    Object.defineProperty(this, "title", {
        get: function get() {
            return Tools.translate(title);
        }
    });
    defineSetting(this, "privateKey");
    defineSetting(this, "publicKey");
};

/*public*/Captcha.prototype.info = function () {
    var info = {
        id: this.id,
        title: this.title,
        publicKey: this.publicKey
    };
    if (this.script) info.script = this.script();
    if (this.scriptSource) info.scriptSource = this.scriptSource();
    if (this.widgetHtml) info.widgetHtml = this.widgetHtml();
    if (this.widgetTemplate) info.widgetTemplate = this.widgetTemplate();
    return info;
};

/*public*/Captcha.prototype.apiRoutes = function () {
    return []; //[ { method, path, handler }, ... ]
};

/*public*/Captcha.prototype.actionRoutes = function () {
    return []; //[ { method, path, handler }, ... ]
};

Captcha.captcha = function (id) {
    return captchas[id];
};

Captcha.addCaptcha = function (captcha) {
    if (!Captcha.prototype.isPrototypeOf(captcha)) return;
    captchas[captcha.id] = captcha;
};

Captcha.captchaIds = function () {
    var list = [];
    Tools.toArray(captchas).sort(function (c1, c2) {
        return c1.id < c2.id ? -1 : 1;
    }).forEach(function (captcha) {
        list.push(captcha.id);
    });
    return list;
};

Captcha.checkCaptcha = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(ip) {
        var fields = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
        var boardName, board, quota, supportedCaptchaEngines, ceid, captcha;
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        boardName = fields.boardName;
                        board = _board2.default.board(boardName);

                        if (board) {
                            _context.next = 4;
                            break;
                        }

                        return _context.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid board'))));

                    case 4:
                        if (board.captchaEnabled) {
                            _context.next = 6;
                            break;
                        }

                        return _context.abrupt('return');

                    case 6:
                        _context.next = 8;
                        return UsersModel.getUserCaptchaQuota(boardName, ip);

                    case 8:
                        quota = _context.sent;

                        if (!(board.captchaQuota > 0 && +quota > 0)) {
                            _context.next = 13;
                            break;
                        }

                        _context.next = 12;
                        return UsersModel.useCaptcha(boardName, ip);

                    case 12:
                        return _context.abrupt('return', _context.sent);

                    case 13:
                        supportedCaptchaEngines = board.supportedCaptchaEngines;

                        if (!(supportedCaptchaEngines.length < 1)) {
                            _context.next = 16;
                            break;
                        }

                        return _context.abrupt('return', Promise.reject(new Error(Tools.translate('Internal error: no captcha engine'))));

                    case 16:
                        ceid = captchaEngine || null;

                        if (!ceid || !(0, _underscore2.default)(supportedCaptchaEngines).contains(ceid)) {
                            if ((0, _underscore2.default)(supportedCaptchaEngines).contains(_nodeCaptcha2.default.id)) {
                                ceid = _nodeCaptcha2.default.id;
                            } else {
                                ceid = supportedCaptchaEngines[0].id;
                            }
                        }
                        captcha = Captcha.captcha(ceid);

                        if (captcha) {
                            _context.next = 21;
                            break;
                        }

                        return _context.abrupt('return', Promise.reject(new Error(Tools.translate('Invalid captcha engine'))));

                    case 21:
                        _context.next = 23;
                        return captcha.checkCaptcha(ip, fields);

                    case 23:
                        _context.next = 25;
                        return UsersModel.setUserCaptchaQuota(boardName, ip, board.captchaQuota);

                    case 25:
                        return _context.abrupt('return', _context.sent);

                    case 26:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function (_x, _x2) {
        return ref.apply(this, arguments);
    };
}();

//NOTE: Must implement the following methods:
//checkCaptcha(ip, fields) -> Promise.resolve() / Promise.reject(err)
//widgetHtml() -> string
//or
//widgetTemplate() -> string
//NOTE: May implement the following methods:
//script() -> string
//scriptSource() -> string

module.exports = Captcha;
//# sourceMappingURL=captcha.js.map
