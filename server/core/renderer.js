'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.reloadTemplates = exports.compileTemplates = exports.generateCustomCSSFiles = exports.generateCustomJavaScriptFile = exports.generateTemplatingJavaScriptFile = exports.renderThread = exports.rerender = exports.getRouterPaths = undefined;

var getRouterPaths = exports.getRouterPaths = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(description) {
    var controllers, paths;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            controllers = Tools.requireWrapper(require('../controllers'));
            _context2.next = 3;
            return Tools.series(controllers.routers, function () {
              var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee(router) {
                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        if (!(typeof router.paths !== 'function')) {
                          _context.next = 2;
                          break;
                        }

                        return _context.abrupt('return', []);

                      case 2:
                        _context.next = 4;
                        return router.paths(description);

                      case 4:
                        return _context.abrupt('return', _context.sent);

                      case 5:
                      case 'end':
                        return _context.stop();
                    }
                  }
                }, _callee, this);
              }));

              return function (_x2) {
                return _ref2.apply(this, arguments);
              };
            }(), true);

          case 3:
            paths = _context2.sent;
            return _context2.abrupt('return', (0, _underscore2.default)(paths).flatten().filter(function (path) {
              return !!path;
            }));

          case 5:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function getRouterPaths(_x) {
    return _ref.apply(this, arguments);
  };
}();

var rerender = exports.rerender = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7(what) {
    var controllers, routers;
    return regeneratorRuntime.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            controllers = Tools.requireWrapper(require('../controllers'));
            _context7.next = 3;
            return Tools.series(controllers.routers, function () {
              var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(router) {
                var paths;
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        if (!(typeof router.paths !== 'function' || typeof router.render !== 'function')) {
                          _context3.next = 2;
                          break;
                        }

                        return _context3.abrupt('return');

                      case 2:
                        _context3.next = 4;
                        return router.paths();

                      case 4:
                        paths = _context3.sent;

                        paths = (0, _micromatch2.default)(paths, what || '**');

                        if (!(paths.length <= 0)) {
                          _context3.next = 8;
                          break;
                        }

                        return _context3.abrupt('return');

                      case 8:
                        return _context3.abrupt('return', {
                          router: router,
                          paths: paths
                        });

                      case 9:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, this);
              }));

              return function (_x4) {
                return _ref4.apply(this, arguments);
              };
            }(), true);

          case 3:
            routers = _context7.sent;
            _context7.next = 6;
            return Tools.series(routers.filter(function (router) {
              return !!router;
            }), function () {
              var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(router) {
                return regeneratorRuntime.wrap(function _callee6$(_context6) {
                  while (1) {
                    switch (_context6.prev = _context6.next) {
                      case 0:
                        _context6.next = 2;
                        return Tools.series(router.paths, function () {
                          var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(path) {
                            var result;
                            return regeneratorRuntime.wrap(function _callee5$(_context5) {
                              while (1) {
                                switch (_context5.prev = _context5.next) {
                                  case 0:
                                    console.log(Tools.translate('Rendering $[1]…', '', path));
                                    _context5.next = 3;
                                    return router.router.render(path);

                                  case 3:
                                    result = _context5.sent;
                                    _context5.next = 6;
                                    return Tools.series(result, function () {
                                      var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(data, id) {
                                        return regeneratorRuntime.wrap(function _callee4$(_context4) {
                                          while (1) {
                                            switch (_context4.prev = _context4.next) {
                                              case 0:
                                                _context4.next = 2;
                                                return Cache.writeFile(id, data);

                                              case 2:
                                                return _context4.abrupt('return', _context4.sent);

                                              case 3:
                                              case 'end':
                                                return _context4.stop();
                                            }
                                          }
                                        }, _callee4, this);
                                      }));

                                      return function (_x7, _x8) {
                                        return _ref7.apply(this, arguments);
                                      };
                                    }());

                                  case 6:
                                    return _context5.abrupt('return', _context5.sent);

                                  case 7:
                                  case 'end':
                                    return _context5.stop();
                                }
                              }
                            }, _callee5, this);
                          }));

                          return function (_x6) {
                            return _ref6.apply(this, arguments);
                          };
                        }());

                      case 2:
                      case 'end':
                        return _context6.stop();
                    }
                  }
                }, _callee6, this);
              }));

              return function (_x5) {
                return _ref5.apply(this, arguments);
              };
            }());

          case 6:
            return _context7.abrupt('return', _context7.sent);

          case 7:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, this);
  }));

  return function rerender(_x3) {
    return _ref3.apply(this, arguments);
  };
}();

var renderThread = exports.renderThread = function () {
  var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(thread) {
    var board;
    return regeneratorRuntime.wrap(function _callee9$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            board = _board2.default.board(thread.boardName);

            if (board) {
              _context9.next = 3;
              break;
            }

            throw new Error(Tools.translate('Invalid board'));

          case 3:
            _context9.next = 5;
            return Files.renderPostFileInfos(thread.opPost);

          case 5:
            _context9.next = 7;
            return board.renderPost(thread.opPost);

          case 7:
            if (thread.lastPosts) {
              _context9.next = 9;
              break;
            }

            return _context9.abrupt('return');

          case 9:
            _context9.next = 11;
            return Tools.series(thread.lastPosts, function () {
              var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(post) {
                return regeneratorRuntime.wrap(function _callee8$(_context8) {
                  while (1) {
                    switch (_context8.prev = _context8.next) {
                      case 0:
                        _context8.next = 2;
                        return Files.renderPostFileInfos(post);

                      case 2:
                        _context8.next = 4;
                        return board.renderPost(post);

                      case 4:
                      case 'end':
                        return _context8.stop();
                    }
                  }
                }, _callee8, this);
              }));

              return function (_x10) {
                return _ref9.apply(this, arguments);
              };
            }());

          case 11:
          case 'end':
            return _context9.stop();
        }
      }
    }, _callee9, this);
  }));

  return function renderThread(_x9) {
    return _ref8.apply(this, arguments);
  };
}();

var generateTemplatingJavaScriptFile = exports.generateTemplatingJavaScriptFile = function () {
  var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10() {
    var models, fileNames, templateNames, template, string, stream;
    return regeneratorRuntime.wrap(function _callee10$(_context10) {
      while (1) {
        switch (_context10.prev = _context10.next) {
          case 0:
            console.log(Tools.translate('Generating templating JavaScript file…'));
            models = JSON.stringify({
              base: MiscModel.base(),
              boards: MiscModel.boards(),
              notFoundImageFileNames: MiscModel.notFoundImageFileNames(),
              tr: MiscModel.translations()
            });
            _context10.next = 4;
            return _fs2.default.listTree(TEMPLATES_PATH, function (_, stat) {
              return stat.isFile();
            });

          case 4:
            fileNames = _context10.sent;
            templateNames = fileNames.filter(function (fileName) {
              return fileName.split('.').pop() === 'js' && 'index.js' !== fileName;
            }).map(function (fileName) {
              return fileName.substr(TEMPLATES_PATH.length + 1);
            });
            _context10.next = 8;
            return _fs2.default.read(TEMPLATES_INDEX_PATH + '.template');

          case 8:
            template = _context10.sent;
            _context10.next = 11;
            return _fs2.default.write(TEMPLATES_INDEX_PATH, template.replace('{{models}}', models));

          case 11:
            string = '';
            stream = (0, _browserify2.default)({
              entries: TEMPLATES_INDEX_PATH,
              debug: false
            });

            templateNames.forEach(function (lib) {
              return stream.require('./views/' + lib);
            });
            stream = stream.bundle();
            stream.on('data', function (data) {
              string += data;
            });
            _context10.next = 18;
            return new Promise(function (resolve, reject) {
              stream.on('end', resolve);
              stream.on('error', reject);
            });

          case 18:
            string = string.split(APP_PATH).join('.');
            _context10.next = 21;
            return _fs2.default.write(__dirname + '/../../public/js/templating.js', string);

          case 21:
          case 'end':
            return _context10.stop();
        }
      }
    }, _callee10, this);
  }));

  return function generateTemplatingJavaScriptFile() {
    return _ref10.apply(this, arguments);
  };
}();

var generateCustomJavaScriptFile = exports.generateCustomJavaScriptFile = function () {
  var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11() {
    var exists;
    return regeneratorRuntime.wrap(function _callee11$(_context11) {
      while (1) {
        switch (_context11.prev = _context11.next) {
          case 0:
            console.log(Tools.translate('Checking custom JavaScript file existence…'));
            _context11.next = 3;
            return _fs2.default.exists(__dirname + '/../../public/js/custom.js');

          case 3:
            exists = _context11.sent;

            if (exists) {
              _context11.next = 9;
              break;
            }

            console.log(Tools.translate('Creating dummy custom JavaScript file…'));
            _context11.next = 8;
            return Cache.writeFile('js/custom.js', '');

          case 8:
            return _context11.abrupt('return', _context11.sent);

          case 9:
          case 'end':
            return _context11.stop();
        }
      }
    }, _callee11, this);
  }));

  return function generateCustomJavaScriptFile() {
    return _ref11.apply(this, arguments);
  };
}();

var generateCustomCSSFiles = exports.generateCustomCSSFiles = function () {
  var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14() {
    var list, types;
    return regeneratorRuntime.wrap(function _callee14$(_context14) {
      while (1) {
        switch (_context14.prev = _context14.next) {
          case 0:
            console.log(Tools.translate('Checking custom CSS files existence…'));
            _context14.next = 3;
            return Tools.series(['combined', 'desktop', 'mobile'], function () {
              var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(type) {
                var exists;
                return regeneratorRuntime.wrap(function _callee12$(_context12) {
                  while (1) {
                    switch (_context12.prev = _context12.next) {
                      case 0:
                        _context12.next = 2;
                        return _fs2.default.exists(__dirname + '/../../public/css/custom-base-' + type + '.css');

                      case 2:
                        exists = _context12.sent;
                        return _context12.abrupt('return', {
                          type: type,
                          exists: exists
                        });

                      case 4:
                      case 'end':
                        return _context12.stop();
                    }
                  }
                }, _callee12, this);
              }));

              return function (_x11) {
                return _ref13.apply(this, arguments);
              };
            }(), true);

          case 3:
            list = _context14.sent;
            types = list.filter(function (item) {
              return !item.exists;
            }).map(function (item) {
              return item.type;
            });

            if (!(types.length > 0)) {
              _context14.next = 9;
              break;
            }

            console.log(Tools.translate('Creating dummy custom CSS file(s)…'));
            _context14.next = 9;
            return Tools.series(types, function () {
              var _ref14 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13(type) {
                return regeneratorRuntime.wrap(function _callee13$(_context13) {
                  while (1) {
                    switch (_context13.prev = _context13.next) {
                      case 0:
                        _context13.next = 2;
                        return Cache.writeFile('css/custom-base-' + type + '.css', '');

                      case 2:
                      case 'end':
                        return _context13.stop();
                    }
                  }
                }, _callee13, this);
              }));

              return function (_x12) {
                return _ref14.apply(this, arguments);
              };
            }());

          case 9:
          case 'end':
            return _context14.stop();
        }
      }
    }, _callee14, this);
  }));

  return function generateCustomCSSFiles() {
    return _ref12.apply(this, arguments);
  };
}();

var compileTemplates = exports.compileTemplates = function () {
  var _ref15 = _asyncToGenerator(regeneratorRuntime.mark(function _callee18() {
    var list, fileNames, includes;
    return regeneratorRuntime.wrap(function _callee18$(_context18) {
      while (1) {
        switch (_context18.prev = _context18.next) {
          case 0:
            console.log(Tools.translate('Compiling templates…'));
            _context18.next = 3;
            return _fs2.default.list(TEMPLATES_PATH);

          case 3:
            list = _context18.sent;
            _context18.next = 6;
            return Tools.series(list.filter(function (entry) {
              return !EXCLUDED_SOURCE_TEMPLATE_FILES.has(entry);
            }), function () {
              var _ref16 = _asyncToGenerator(regeneratorRuntime.mark(function _callee15(entry) {
                return regeneratorRuntime.wrap(function _callee15$(_context15) {
                  while (1) {
                    switch (_context15.prev = _context15.next) {
                      case 0:
                        _context15.next = 2;
                        return _fs2.default.removeTree(TEMPLATES_PATH + '/' + entry);

                      case 2:
                        return _context15.abrupt('return', _context15.sent);

                      case 3:
                      case 'end':
                        return _context15.stop();
                    }
                  }
                }, _callee15, this);
              }));

              return function (_x13) {
                return _ref16.apply(this, arguments);
              };
            }());

          case 6:
            _context18.next = 8;
            return _fs2.default.listTree(TEMPLATES_SOURCE_PATH, function (_, stat) {
              return stat.isFile();
            });

          case 8:
            fileNames = _context18.sent;

            fileNames = fileNames.map(function (fileName) {
              return fileName.substr(TEMPLATES_SOURCE_PATH.length + 1);
            });
            _context18.next = 12;
            return Tools.series(fileNames, function () {
              var _ref17 = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(fileName) {
                var content;
                return regeneratorRuntime.wrap(function _callee16$(_context16) {
                  while (1) {
                    switch (_context16.prev = _context16.next) {
                      case 0:
                        if (/\.def(\.dot|\.jst)?$/.test(fileName)) {
                          _context16.next = 2;
                          break;
                        }

                        return _context16.abrupt('return');

                      case 2:
                        _context16.next = 4;
                        return _fs2.default.read(TEMPLATES_SOURCE_PATH + '/' + fileName);

                      case 4:
                        content = _context16.sent;
                        return _context16.abrupt('return', {
                          name: fileName.split('.').slice(0, -1).join('.'),
                          content: content
                        });

                      case 6:
                      case 'end':
                        return _context16.stop();
                    }
                  }
                }, _callee16, this);
              }));

              return function (_x14) {
                return _ref17.apply(this, arguments);
              };
            }(), true);

          case 12:
            includes = _context18.sent;

            includes = includes.filter(function (item) {
              return !!item;
            }).reduce(function (acc, item) {
              acc[item.name] = item.content;
              return acc;
            }, {});
            _context18.next = 16;
            return Tools.series(fileNames, function () {
              var _ref18 = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(fileName) {
                var compiled, string, moduleName;
                return regeneratorRuntime.wrap(function _callee17$(_context17) {
                  while (1) {
                    switch (_context17.prev = _context17.next) {
                      case 0:
                        if (/\.jst(\.dot|\.def)?$/.test(fileName)) {
                          _context17.next = 2;
                          break;
                        }

                        return _context17.abrupt('return');

                      case 2:
                        compiled = '(function(){';
                        _context17.next = 5;
                        return _fs2.default.read(TEMPLATES_SOURCE_PATH + '/' + fileName);

                      case 5:
                        string = _context17.sent;
                        moduleName = fileName.split('.').shift().replace(ILLEGAL_CHARACTERS_REGEXP, '_');

                        compiled += _dot2.default.template(string, DOT_SETTINGS, includes).toString().replace('anonymous', moduleName);
                        compiled += 'var itself=' + moduleName + ', _encodeHTML=(' + ENCODE_HTML_SOURCE + '());';
                        compiled += 'module.exports=itself;})()';

                        if (!(fileName.split('/').length > 1)) {
                          _context17.next = 13;
                          break;
                        }

                        _context17.next = 13;
                        return _fs2.default.makeTree(TEMPLATES_PATH + '/' + fileName.split('/').slice(0, -1).join('/'));

                      case 13:
                        _context17.next = 15;
                        return _fs2.default.write(TEMPLATES_PATH + '/' + fileName.split('.').slice(0, -1).join('.') + '.js', compiled);

                      case 15:
                      case 'end':
                        return _context17.stop();
                    }
                  }
                }, _callee17, this);
              }));

              return function (_x15) {
                return _ref18.apply(this, arguments);
              };
            }());

          case 16:
          case 'end':
            return _context18.stop();
        }
      }
    }, _callee18, this);
  }));

  return function compileTemplates() {
    return _ref15.apply(this, arguments);
  };
}();

var reloadTemplates = exports.reloadTemplates = function () {
  var _ref19 = _asyncToGenerator(regeneratorRuntime.mark(function _callee19() {
    var fileNames;
    return regeneratorRuntime.wrap(function _callee19$(_context19) {
      while (1) {
        switch (_context19.prev = _context19.next) {
          case 0:
            _context19.prev = 0;
            _context19.next = 3;
            return _fs2.default.listTree(TEMPLATES_PATH, function (_1, stat) {
              return stat.isFile();
            });

          case 3:
            fileNames = _context19.sent;

            templates = fileNames.filter(function (fileName) {
              return fileName.split('.').pop() === 'js' && fileName.split('/').pop() !== 'index.js';
            }).map(function (fileName) {
              return fileName.substr(TEMPLATES_PATH.length + 1).split('.').slice(0, -1).join('.');
            }).reduce(function (acc, templateName) {
              var id = require.resolve('../../views/' + templateName + '.js');
              if (require.cache.hasOwnProperty(id)) {
                delete require.cache[id];
              }
              acc[templateName] = require(id);
              return acc;
            }, {});
            _context19.next = 10;
            break;

          case 7:
            _context19.prev = 7;
            _context19.t0 = _context19['catch'](0);

            _logger2.default.error(_context19.t0.stack || _context19.t0);

          case 10:
          case 'end':
            return _context19.stop();
        }
      }
    }, _callee19, this, [[0, 7]]);
  }));

  return function reloadTemplates() {
    return _ref19.apply(this, arguments);
  };
}();

exports.render = render;
exports.targetsFromString = targetsFromString;
exports.postingSpeedString = postingSpeedString;
exports.plainText = plainText;
exports.toHTML = toHTML;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _browserify = require('browserify');

var _browserify2 = _interopRequireDefault(_browserify);

var _dot = require('dot');

var _dot2 = _interopRequireDefault(_dot);

var _escapeHtml = require('escape-html');

var _escapeHtml2 = _interopRequireDefault(_escapeHtml);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _htmlToText = require('html-to-text');

var _htmlToText2 = _interopRequireDefault(_htmlToText);

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _micromatch = require('micromatch');

var _micromatch2 = _interopRequireDefault(_micromatch);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _files = require('./files');

var Files = _interopRequireWildcard(_files);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _misc = require('../models/misc');

var MiscModel = _interopRequireWildcard(_misc);

var _cache = require('../helpers/cache');

var Cache = _interopRequireWildcard(_cache);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var TEMPLATES_SOURCE_PATH = _path2.default.resolve(__dirname + '/../../src/views');
var TEMPLATES_PATH = _path2.default.resolve(__dirname + '/../../views');
var TEMPLATES_INDEX_PATH = TEMPLATES_PATH + '/index.js';
var APP_PATH = __dirname.split('/').slice(0, -2).join('/');
var DOT_SETTINGS = {
  evaluate: /\{\{([\s\S]+?)\}\}/g,
  interpolate: /\{\{=([\s\S]+?)\}\}/g,
  encode: /\{\{!([\s\S]+?)\}\}/g,
  use: /\{\{#([\s\S]+?)\}\}/g,
  define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
  conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
  iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
  varname: 'it',
  strip: false,
  append: true,
  selfcontained: false
};
var EXCLUDED_SOURCE_TEMPLATE_FILES = new Set(['index.js.template', '.gitignore']);
var ENCODE_HTML_SOURCE = _dot2.default.encodeHTMLSource.toString();
var ILLEGAL_CHARACTERS_REGEXP = /[^a-zA-Z\$_]/gi;

var templates = {};

function escapedSelector(string) {
  if (typeof string !== 'string') {
    return string;
  }
  return string.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '-');
}

function render(templateName, model) {
  var template = templates[templateName];
  if (!template) {
    _logger2.default.error(Tools.translate('Invalid template: $[1]', '', templateName));
    return '';
  }
  var baseModel = MiscModel.base();
  baseModel.templateName = templateName;
  var o = MiscModel.boards();
  baseModel.boards = o.boards;
  baseModel.boardGroups = o.boardGroups;
  baseModel.banner = (0, _underscore2.default)((0, _underscore2.default)(baseModel.boards.filter(function (board) {
    return board.bannerFileNames.length > 0;
  }).map(function (board) {
    return board.bannerFileNames.map(function (fileName) {
      return {
        boardName: board.name,
        boardTitle: board.title,
        fileName: fileName
      };
    });
  })).flatten()).sample();
  baseModel._ = _underscore2.default;
  baseModel.compareRegisteredUserLevels = Tools.compareRegisteredUserLevels;
  baseModel.isImageType = Files.isImageType;
  baseModel.isAudioType = Files.isAudioType;
  baseModel.isVideoType = Files.isVideoType;
  baseModel.escaped = _escapeHtml2.default;
  baseModel.escapedSelector = escapedSelector;
  baseModel.translate = Tools.translate;
  var timeOffset = (0, _config2.default)('site.timeOffset');
  var locale = (0, _config2.default)('site.locale');
  var format = (0, _config2.default)('site.dateFormat');
  baseModel.formattedDate = function (date) {
    return (0, _moment2.default)(date).utcOffset(timeOffset).locale(locale).format(format);
  };
  try {
    return template(_merge2.default.recursive(baseModel, model || {}));
  } catch (err) {
    _logger2.default.error(err.stack || err);
    return '';
  }
}

function targetsFromString(string) {
  if (!string || typeof string !== 'string') {
    return {};
  }
  return string.split(/\s+/).reduce(function (acc, part) {
    var _part$split = part.split(':'),
        _part$split2 = _toArray(_part$split),
        boardName = _part$split2[0],
        postNumbers = _part$split2.slice(1);

    if (boardName) {
      if (postNumbers.length > 0) {
        acc[boardName] = postNumbers.map(function (postNumber) {
          return Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
        }).filter(function (postNumber) {
          return !!postNumber;
        });
      } else {
        acc[boardName] = '*';
      }
    }
    return acc;
  }, {});
}

function postingSpeedString(launchDate, lastPostNumber) {
  launchDate = +launchDate;
  if (isNaN(launchDate)) {
    return '-';
  }
  function zeroSpeedString(nonZero) {
    if (lastPostNumber && launchDate) {
      return '1 ' + nonZero;
    } else {
      return '0 ' + Tools.translate('post(s) per hour.');
    }
  }
  function speedString(duptime) {
    var ss = '' + (lastPostNumber / duptime).toFixed(1);
    return ss.split('.').pop() !== '0' ? ss : ss.split('.').shift();
  }
  var uptimeMsecs = _underscore2.default.now() - launchDate;
  var duptime = uptimeMsecs / Tools.HOUR;
  var uptime = Math.floor(duptime);
  var shour = Tools.translate('post(s) per hour.');
  if (!uptime) {
    return zeroSpeedString(shour);
  } else if (Math.floor(lastPostNumber / uptime) > 0) {
    return speedString(duptime) + ' ' + shour;
  }
  duptime /= 24;
  uptime = Math.floor(duptime);
  var sday = Tools.translate('post(s) per day.');
  if (!uptime) {
    return zeroSpeedString(sday);
  } else if (Math.floor(lastPostNumber / uptime) > 0) {
    return speedString(duptime) + ' ' + sday;
  }
  duptime /= 365 / 12;
  uptime = Math.floor(duptime);
  var smonth = Tools.translate('post(s) per month.');
  if (!uptime) {
    return zeroSpeedString(smonth);
  } else if (Math.floor(lastPostNumber / uptime) > 0) {
    return speedString(duptime) + ' ' + smonth;
  }
  duptime /= 12.0;
  uptime = Math.floor(duptime);
  var syear = Tools.translate('post(s) per year.');
  if (!uptime) {
    return zeroSpeedString(syear);
  } else if (Math.floor(lastPostNumber / uptime) > 0) {
    return speedString(duptime) + ' ' + syear;
  }
  return '0 ' + syear;
}

function plainText(text) {
  var _ref20 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      brToNewline = _ref20.brToNewline;

  if (!text) {
    return '';
  }
  text = '' + text;
  var id = _uuid2.default.v4();
  if (brToNewline) {
    text = text.replace(/<br \/>/g, id);
  } else {
    text = text.replace(/<br \/>/g, ' ');
  }
  text = _htmlToText2.default.fromString(text, {
    wordwrap: null,
    linkHrefBaseUrl: (0, _config2.default)('site.protocol') + '://' + (0, _config2.default)('site.domain'),
    hideLinkHrefIfSameAsText: true,
    ignoreImages: true
  });
  if (brToNewline) {
    text = text.split(id).join('\n');
  }
  return text;
}

function toHTML(text, replaceSpaces) {
  text = (0, _escapeHtml2.default)(text).split('\n').join('<br />');
  if (replaceSpaces) {
    text = text.split(' ').join('&nbsp;');
  }
  return text;
}
//# sourceMappingURL=renderer.js.map
