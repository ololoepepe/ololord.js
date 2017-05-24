'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = commands;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var vorpal = require('vorpal')();

function setupMethods(command) {
  var prompt = command.prompt;

  command.prompt = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(options) {
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt('return', new Promise(function (resolve, reject) {
                var simple = typeof options === 'string';
                if (simple) {
                  options = {
                    message: options,
                    name: 'input'
                  };
                }
                prompt.call(command, options, function (result) {
                  resolve(simple ? result.input : result);
                });
              }));

            case 1:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }();

  command.requestPassword = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
    var result, password;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return command.prompt({
              type: 'password',
              name: 'password',
              message: Tools.translate('Enter password: ')
            });

          case 2:
            result = _context2.sent;
            password = result.password;

            if (password) {
              _context2.next = 6;
              break;
            }

            throw new Error(Tools.translate('Invalid password'));

          case 6:
            if (Tools.mayBeHashpass(password)) {
              _context2.next = 8;
              break;
            }

            return _context2.abrupt('return', {
              password: password,
              notHashpass: true
            });

          case 8:
            _context2.next = 10;
            return command.prompt({
              type: 'confirm',
              name: 'hashpass',
              default: true,
              message: Tools.translate("That is a hashpass, isn't it? ")
            });

          case 10:
            result = _context2.sent;
            return _context2.abrupt('return', {
              password: password,
              notHashpass: !result || !result.hashpass
            });

          case 12:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));
}

vorpal.installHandler = function (command, handler) {
  var _ref3 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
      description = _ref3.description,
      alias = _ref3.alias,
      options = _ref3.options;

  command = vorpal.command(command, description || undefined).action(function () {
    var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(args, callback) {
      var result;
      return regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.prev = 0;

              setupMethods(this);
              _context3.next = 4;
              return handler.call(this, args);

            case 4:
              result = _context3.sent;

              if (result) {
                console.log(result);
              }
              callback();
              _context3.next = 13;
              break;

            case 9:
              _context3.prev = 9;
              _context3.t0 = _context3['catch'](0);

              console.log(_context3.t0.stack || _context3.t0);
              callback();

            case 13:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee3, this, [[0, 9]]);
    }));

    return function (_x3, _x4) {
      return _ref4.apply(this, arguments);
    };
  }()).cancel(function () {
    console.log(Tools.translate('Cancelled'));
  });
  if (alias) {
    if ((0, _underscore2.default)(alias).isArray()) {
      var _command;

      (_command = command).alias.apply(_command, _toConsumableArray(alias));
    } else {
      command.alias(alias);
    }
  }
  if ((0, _underscore2.default)(options).isArray()) {
    options.forEach(function (option) {
      command.option(option.value, option.description || undefined);
    });
  }
};

vorpal.find('exit').remove();

function commands(basicOnly, prompt) {
  var plugins = Tools.loadPlugins([__dirname, __dirname + '/custom'], function (fileName, _1, _2, path) {
    return 'index.js' !== fileName || path.split('/') === 'custom';
  }).filter(function (plugin) {
    return (0, _config2.default)('system.commands.' + plugin.command.split(/\s/)[0], true);
  });
  if (basicOnly) {
    plugins = plugins.filter(function (plugin) {
      return plugin.basic;
    });
  }
  plugins.forEach(function (plugin) {
    vorpal.installHandler(plugin.command, plugin.handler, plugin.options);
  });
  console.log(Tools.translate("Type 'help' for commands"));
  vorpal.delimiter(prompt || 'ololord.js>').show();
  return vorpal;
}
//# sourceMappingURL=index.js.map
