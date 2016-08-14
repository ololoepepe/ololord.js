'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ipAddress = require('ip-address');

var _ipAddress2 = _interopRequireDefault(_ipAddress);

var _promisify = require('promisify');

var _promisify2 = _interopRequireDefault(_promisify);

var _sqlite = require('sqlite3');

var _sqlite2 = _interopRequireDefault(_sqlite);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

try {
  var db = new _sqlite2.default.Database(__dirname + '/../geolocation/ip2location.sqlite');
} catch (err) {
  _logger2.default.error(err.stack || err);
  _logger2.default.error(new Error(Tools.translate('No geolocation database found. Geolocation will be disabled.')));
  var db = null;
}

exports.default = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(ip) {
    var info, address, ipv4, query, statement, result, ipFrom;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            info = {
              cityName: null,
              countryCode: null,
              countryName: null
            };

            if (!(!db || !ip)) {
              _context.next = 3;
              break;
            }

            return _context.abrupt('return', info);

          case 3:
            address = Tools.correctAddress(ip);

            if (address) {
              _context.next = 6;
              break;
            }

            return _context.abrupt('return', info);

          case 6:
            ipv4 = Tools.preferIPv4(ip);
            query = 'SELECT ipFrom, countryCode, countryName, cityName FROM ip2location WHERE ipTo >= ? LIMIT 1';
            statement = db.prepare(query);

            statement.pget = (0, _promisify2.default)(statement.get);
            if (ipv4) {
              address = bigInt(new _ipAddress2.default.Address4(ipv4).bigInteger().toString());
            } else {
              address = bigInt(new _ipAddress2.default.Address6(address).bigInteger().toString());
            }
            _context.next = 13;
            return statement.pget(address.toString());

          case 13:
            result = _context.sent;

            statement.finalize();

            if (result) {
              _context.next = 17;
              break;
            }

            return _context.abrupt('return', info);

          case 17:
            ipFrom = void 0;
            _context.prev = 18;

            ipFrom = bigInt(result.ipFrom);
            _context.next = 26;
            break;

          case 22:
            _context.prev = 22;
            _context.t0 = _context['catch'](18);

            _logger2.default.error(_context.t0.stack || _context.t0);
            return _context.abrupt('return', info);

          case 26:
            if (!ipFrom.greater(address)) {
              _context.next = 28;
              break;
            }

            return _context.abrupt('return', info);

          case 28:
            info.cityName = result.cityName;
            info.countryCode = result.countryCode;
            info.countryName = result.countryName;
            return _context.abrupt('return', info);

          case 32:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[18, 22]]);
  }));

  function geolocation(_x) {
    return ref.apply(this, arguments);
  }

  return geolocation;
}();
//# sourceMappingURL=geolocation.js.map
