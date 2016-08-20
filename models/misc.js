'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.base = base;
exports.boards = boards;
exports.board = board;
exports.translations = translations;
exports.notFoundImageFileNames = notFoundImageFileNames;
exports.codeLangNames = codeLangNames;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _fs3 = require('fs');

var _fs4 = _interopRequireDefault(_fs3);

var _highlight = require('highlight.js');

var _highlight2 = _interopRequireDefault(_highlight);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _markup = require('../core/markup');

var _markup2 = _interopRequireDefault(_markup);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _fsWatcher = require('../helpers/fs-watcher');

var _fsWatcher2 = _interopRequireDefault(_fsWatcher);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var langNames = Tools.createWatchedResource(__dirname + '/misc/lang-names.json', function (path) {
  return require(path);
}, function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(path) {
    var data;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return _fs2.default.read(path);

          case 2:
            data = _context.sent;

            langNames = JSON.parse(data);

          case 4:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function (_x) {
    return ref.apply(this, arguments);
  };
}()) || {};

function filterNotFoundImageFileNames(fileName) {
  return '.gitignore' !== fileName;
}

var notFoundImageFileNames = Tools.createWatchedResource(__dirname + '/../public/img/404', function (path) {
  return _fs4.default.readdirSync(path).filter(filterNotFoundImageFileNames);
}, function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(path) {
    var fileNames;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return _fs2.default.list(path);

          case 2:
            fileNames = _context2.sent;
            return _context2.abrupt('return', fileNames.filter(filterNotFoundImageFileNames));

          case 4:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function (_x2) {
    return ref.apply(this, arguments);
  };
}()) || [];

function base() {
  var Captcha = Tools.requireWrapper(require('../captchas/captcha'));
  return {
    site: {
      protocol: (0, _config2.default)('site.protocol'),
      domain: (0, _config2.default)('site.domain'),
      pathPrefix: (0, _config2.default)('site.pathPrefix'),
      locale: (0, _config2.default)('site.locale'),
      dateFormat: (0, _config2.default)('site.dateFormat'),
      timeOffset: (0, _config2.default)('site.timeOffset'),
      twitter: { integrationEnabled: !!(0, _config2.default)('site.twitter.integrationEnabled') },
      vkontakte: {
        integrationEnabled: !!(0, _config2.default)('site.vkontakte.integrationEnabled'),
        appId: (0, _config2.default)('site.vkontakte.appId')
      },
      ws: { transports: (0, _config2.default)('site.ws.transports') }
    },
    styles: Tools.STYLES,
    codeStyles: Tools.CODE_STYLES,
    availableCodeLangs: _highlight2.default.listLanguages().map(function (lang) {
      return {
        id: lang,
        name: langNames[lang] || lang
      };
    }),
    maxSearchQueryLength: (0, _config2.default)('site.maxSearchQueryLength'),
    markupModes: [{
      name: 'NONE',
      title: Tools.translate('No markup', 'markupMode')
    }, {
      name: _markup2.default.MarkupModes.ExtendedWakabaMark,
      title: Tools.translate('Extended WakabaMark only', 'markupMode')
    }, {
      name: _markup2.default.MarkupModes.BBCode,
      title: Tools.translate('bbCode only', 'markupMode')
    }, {
      name: _markup2.default.MarkupModes.ExtendedWakabaMark + ',' + _markup2.default.MarkupModes.BBCode,
      title: Tools.translate('Extended WakabaMark and bbCode', 'markupMode')
    }],
    supportedCaptchaEngines: Captcha.captchaIds().filter(function (id) {
      return 'node-captcha-noscript' !== id;
    }).map(function (id) {
      return Captcha.captcha(id).info();
    })
  };
}

function sort(x1, x2) {
  if (!x1.priority && !x2.priority) {
    return x1.name.localeCompare(x2.name);
  }
  return (x1.priority || 0) - (x2.priority || 0);
}

function boards() {
  var boards = _board2.default.boardNames().map(function (boardName) {
    return _board2.default.board(boardName).info();
  });
  var addDefault = false;
  var boardGroups = (0, _underscore2.default)((0, _config2.default)('boardGroups', {})).map(function (group, name) {
    group.name = name;
    group.boards = boards.reduce(function (acc, board) {
      if (!board.groupName) {
        addDefault = true;
      } else if (name === board.groupName) {
        acc.push(board);
      }
      return acc;
    }, []);
    return group;
  });
  if (addDefault || boardGroups.length < 1) {
    (function () {
      var noGroups = boardGroups.length < 1;
      boardGroups.push({
        name: '',
        boards: boards.filter(function (board) {
          return noGroups || !board.hidden && !board.groupName;
        })
      });
    })();
  }
  boardGroups = boardGroups.filter(function (group) {
    return group.boards.length > 0;
  });
  boardGroups.sort(sort);
  boardGroups.forEach(function (group) {
    group.boards.sort(sort);
  });
  return {
    boards: boards,
    boardGroups: boardGroups
  };
}

function board(brd) {
  if (typeof brd === 'string') {
    brd = _board2.default.board(brd);
  }
  return brd ? { board: brd.info() } : null;
}

function translations() {
  return { tr: Tools.translate.translations };
}

function notFoundImageFileNames() {
  return notFoundImageFileNames;
}

function codeLangNames() {
  return langNames;
}
//# sourceMappingURL=misc.js.map
