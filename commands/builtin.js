'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _posts = require('../models/posts');

var PostsModel = _interopRequireWildcard(_posts);

var _users = require('../models/users');

var UsersModel = _interopRequireWildcard(_users);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function formatDate(seconds) {
  var msecs = Math.floor(seconds * Tools.SECOND);
  var days = Math.floor(msecs / Tools.DAY);
  var hours = Math.floor(msecs % Tools.DAY / Tools.HOUR);
  var minutes = Math.floor(msecs % Tools.HOUR / Tools.MINUTE);
  seconds = Math.floor(msecs % Tools.MINUTE / Tools.SECOND);
  return days + ' days ' + Tools.pad(hours, 2, '0') + ':' + Tools.pad(minutes, 2, '0') + ':' + Tools.pad(seconds, 2, '0');
}

exports.default = [{
  command: 'quit',
  handler: function handler() {
    process.exit(0);
    return 'OK';
  },
  options: {
    description: Tools.translate('Quits the application.'),
    alias: ['exit', 'q']
  }
}, {
  command: 'respawn [exitCode]',
  handler: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
      var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var exitCode = _ref.exitCode;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return IPC.send('exit', Tools.option(exitCode, 'number', 0), true);

            case 2:
              return _context.abrupt('return', 'OK');

            case 3:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    function handler(_x) {
      return ref.apply(this, arguments);
    }

    return handler;
  }(),
  options: { description: Tools.translate('Respawns worker processes with the passed exit code.') }
}, {
  command: 'add-superuser',
  handler: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
      var _ref2, password, notHashpass, _ref3, input, ips, hashpass;

      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return this.requestPassword();

            case 2:
              _ref2 = _context2.sent;
              password = _ref2.password;
              notHashpass = _ref2.notHashpass;
              _context2.next = 7;
              return this.prompt(Tools.translate('Enter superuser IP list (separate by spaces): '));

            case 7:
              _ref3 = _context2.sent;
              input = _ref3.input;
              ips = Tools.ipList(input);

              if (!(typeof ips === 'string')) {
                _context2.next = 12;
                break;
              }

              throw new Error(ips);

            case 12:
              hashpass = Tools.toHashpass(password, notHashpass);
              _context2.next = 15;
              return UsersModel.addSuperuser(hashpass, ips);

            case 15:
              return _context2.abrupt('return', 'OK');

            case 16:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function handler() {
      return ref.apply(this, arguments);
    }

    return handler;
  }(),
  options: { description: Tools.translate('Registers a superuser.') }
}, {
  command: 'remove-superuser',
  handler: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
      var _ref4, password, notHashpass, hashpass;

      return regeneratorRuntime.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.next = 2;
              return this.requestPassword();

            case 2:
              _ref4 = _context3.sent;
              password = _ref4.password;
              notHashpass = _ref4.notHashpass;
              hashpass = Tools.toHashpass(password, notHashpass);
              _context3.next = 8;
              return UsersModel.removeSuperuser(hashpass);

            case 8:
              return _context3.abrupt('return', 'OK');

            case 9:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function handler() {
      return ref.apply(this, arguments);
    }

    return handler;
  }(),
  options: { description: Tools.translate('Unregisters a superuser.') }
}, {
  command: 'rerender-posts [targets...]',
  handler: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
      var _ref5 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var targets = _ref5.targets;
      var result;
      return regeneratorRuntime.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 2;
              return this.prompt({
                type: 'confirm',
                name: 'rerender',
                default: true,
                message: Tools.translate('Are you sure? ')
              });

            case 2:
              result = _context4.sent;

              if (result.rerender) {
                _context4.next = 5;
                break;
              }

              return _context4.abrupt('return');

            case 5:
              _context4.next = 7;
              return PostsModel.rerenderPosts(Renderer.targetsFromString((targets || []).join(' ')));

            case 7:
              return _context4.abrupt('return', 'OK');

            case 8:
            case 'end':
              return _context4.stop();
          }
        }
      }, _callee4, this);
    }));

    function handler(_x3) {
      return ref.apply(this, arguments);
    }

    return handler;
  }(),
  options: {
    description: Tools.translate('Rerenders posts specified as $[1].\n' + 'If $[1] is omitted, rerenders all posts on all boards.\n' + 'Each target is a string in the following form:\n' + '$[2]', '', '[targets...]', '<board name>[:<post number>[:...]]')
  }
}, {
  command: 'stop',
  handler: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
      return regeneratorRuntime.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 2;
              return IPC.send('stop');

            case 2:
              return _context5.abrupt('return', 'OK');

            case 3:
            case 'end':
              return _context5.stop();
          }
        }
      }, _callee5, this);
    }));

    function handler() {
      return ref.apply(this, arguments);
    }

    return handler;
  }(),
  options: { description: Tools.translate('Closes all workers, preventing incoming connections.') }
}, {
  command: 'start',
  handler: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
      return regeneratorRuntime.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              _context6.next = 2;
              return IPC.send('start');

            case 2:
              return _context6.abrupt('return', 'OK');

            case 3:
            case 'end':
              return _context6.stop();
          }
        }
      }, _callee6, this);
    }));

    function handler() {
      return ref.apply(this, arguments);
    }

    return handler;
  }(),
  options: { description: Tools.translate('Opens workers for connections if closed.') }
}, {
  command: 'rerender [what...]',
  handler: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
      var _ref6 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var options = _ref6.options;
      var what = _ref6.what;

      var _ref7, list, archive, paths;

      return regeneratorRuntime.wrap(function _callee7$(_context7) {
        while (1) {
          switch (_context7.prev = _context7.next) {
            case 0:
              _ref7 = options || {};
              list = _ref7.list;
              archive = _ref7.archive;

              if (!list) {
                _context7.next = 10;
                break;
              }

              _context7.next = 6;
              return Renderer.getRouterPaths(true);

            case 6:
              paths = _context7.sent;
              return _context7.abrupt('return', paths.map(function (path) {
                return (typeof path === 'undefined' ? 'undefined' : _typeof(path)) === 'object' ? path.path + ' ' + path.description : path;
              }).join('\n'));

            case 10:
              if (!what) {
                _context7.next = 15;
                break;
              }

              _context7.next = 13;
              return Renderer.rerender(what);

            case 13:
              _context7.next = 22;
              break;

            case 15:
              if (!archive) {
                _context7.next = 20;
                break;
              }

              _context7.next = 18;
              return Renderer.rerender();

            case 18:
              _context7.next = 22;
              break;

            case 20:
              _context7.next = 22;
              return Renderer.rerender(['**', '!/*/arch/*']);

            case 22:
              return _context7.abrupt('return', 'OK');

            case 23:
            case 'end':
              return _context7.stop();
          }
        }
      }, _callee7, this);
    }));

    function handler(_x5) {
      return ref.apply(this, arguments);
    }

    return handler;
  }(),
  options: {
    description: Tools.translate("Rerenders the cache (workers are closed and then opened again)."),
    options: [{
      value: '-a, --archive',
      description: Tools.translate('Rerender archived threads (if no pattern is specified).')
    }, {
      value: '-l, --list',
      description: Tools.translate('Only list available router paths. No rerender.')
    }]
  }
}, {
  command: 'reload-boards',
  handler: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee8() {
      return regeneratorRuntime.wrap(function _callee8$(_context8) {
        while (1) {
          switch (_context8.prev = _context8.next) {
            case 0:
              _board2.default.initialize();
              _context8.next = 3;
              return IPC.send('reloadBoards');

            case 3:
              return _context8.abrupt('return', 'OK');

            case 4:
            case 'end':
              return _context8.stop();
          }
        }
      }, _callee8, this);
    }));

    function handler() {
      return ref.apply(this, arguments);
    }

    return handler;
  }(),
  options: { description: Tools.translate('Reloads the boards.') }
}, {
  command: 'reload-templates',
  handler: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(args) {
      return regeneratorRuntime.wrap(function _callee9$(_context9) {
        while (1) {
          switch (_context9.prev = _context9.next) {
            case 0:
              _context9.next = 2;
              return Renderer.compileTemplates();

            case 2:
              _context9.next = 4;
              return Renderer.reloadTemplates();

            case 4:
              _context9.next = 6;
              return IPC.send('reloadTemplates');

            case 6:
              return _context9.abrupt('return', 'OK');

            case 7:
            case 'end':
              return _context9.stop();
          }
        }
      }, _callee9, this);
    }));

    function handler(_x7) {
      return ref.apply(this, arguments);
    }

    return handler;
  }(),
  options: { description: Tools.translate('Reloads the templates and the partials (including public ones).') }
}, {
  command: 'rebuild-search-index [targets...]',
  handler: function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee10() {
      var _ref8 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var targets = _ref8.targets;
      var result;
      return regeneratorRuntime.wrap(function _callee10$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              _context10.next = 2;
              return this.prompt({
                type: 'confirm',
                name: 'rebuild',
                default: true,
                message: Tools.translate('Are you sure? ')
              });

            case 2:
              result = _context10.sent;

              if (result.rebuild) {
                _context10.next = 5;
                break;
              }

              return _context10.abrupt('return');

            case 5:
              _context10.next = 7;
              return PostsModel.rebuildSearchIndex(Renderer.targetsFromString((targets || []).join(' ')));

            case 7:
              return _context10.abrupt('return', 'OK');

            case 8:
            case 'end':
              return _context10.stop();
          }
        }
      }, _callee10, this);
    }));

    function handler(_x8) {
      return ref.apply(this, arguments);
    }

    return handler;
  }(),
  options: {
    description: Tools.translate('Rebuilds post search index of posts specified as $[1].\n' + 'If $[1] is omitted, rerenders all posts on all boards.\n' + 'Each target is a string in the following form:\n' + '$[2]', '', '[targets...]', '<board name>[:<post number>[:...]]')
  }
}, {
  command: 'uptime',
  handler: function handler() {
    return formatDate(process.uptime());
  },
  options: { description: Tools.translate('Shows server uptime.') }
}];
//# sourceMappingURL=builtin.js.map
