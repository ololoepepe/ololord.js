'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var process = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(info, conversionFunction, regexps) {
    var f = function () {
      var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
        var options, start, end, txt, ntxt;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(!matchs || rxCl && (!matche || matche.index <= matchs.index))) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt('return');

              case 2:
                if (!(typeof check === 'function' && !check(info, matchs, matche))) {
                  _context.next = 8;
                  break;
                }

                if (rxCl && matche) {
                  matchs = info.find(rxOp, matche.index + matche[0].length, escapable);
                } else {
                  matchs = info.find(rxOp, matchs.index + matchs[0].length, escapable);
                }
                matche = rxCl ? getIndE({
                  info: info,
                  rxOp: rxOp,
                  matchs: matchs,
                  rxCl: rxCl,
                  inds: matchs ? matchs.index : -1,
                  nestable: nestable,
                  escapable: escapable,
                  nested: nested
                }) : null;
                _context.next = 7;
                return f();

              case 7:
                return _context.abrupt('return', _context.sent);

              case 8:
                options = {
                  op: '',
                  cl: '',
                  type: _processingContext2.default.NO_SKIP
                };
                start = matche ? matchs.index + matchs[0].length : matchs.index;
                end = matche ? matche.index - matchs.index - matchs[0].length : matchs.index + matchs[0].length;
                txt = info.text.substr(start, end);
                _context.next = 14;
                return conversionFunction(info, txt, matchs, matche, options);

              case 14:
                ntxt = _context.sent;

                txt = escapable ? _processingContext2.default.withoutEscaped(ntxt, escapableSequencesRegExp) : ntxt;
                if (pre) {
                  txt = preReady(txt);
                }
                if (txt) {
                  if (options.cl) {
                    info.insert(rxCl ? matche.index + matche[0].length : matchs.index + matchs[0].length, options.cl);
                  }
                  if (rxCl) {
                    info.replace(matchs.index, matche.index - matchs.index + matche[0].length, txt, matchs[0].length, options.type);
                  } else {
                    info.replace(matchs.index, matchs[0].length, txt, matchs[0].length, options.type);
                  }
                  if (options.op) {
                    info.insert(matchs.index, options.op);
                  }
                  matchs = info.find(rxOp, matchs.index + txt.length + options.op.length + options.cl.length, escapable);
                } else {
                  if (rxCl) {
                    matchs = info.find(rxOp, matche ? matche.index + matche[0].length : matchs.index + matchs[0].length, escapable);
                  } else {
                    matchs = info.find(rxOp, matchs.index + matchs[0].index, escapable);
                  }
                }
                if (nestable && nested.nested) {
                  rerun = true;
                }
                matche = rxCl ? getIndE({
                  info: info,
                  rxOp: rxOp,
                  matchs: matchs,
                  rxCl: rxCl,
                  inds: matchs ? matchs.index : -1,
                  nestable: nestable,
                  escapable: escapable,
                  nested: nested
                }) : null;
                _context.next = 22;
                return f();

              case 22:
                return _context.abrupt('return', _context.sent);

              case 23:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      return function f() {
        return _ref4.apply(this, arguments);
      };
    }();

    var _ref3 = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {},
        nestable = _ref3.nestable,
        escapable = _ref3.escapable,
        pre = _ref3.pre,
        check = _ref3.check;

    var rxOp, rxCl, nested, matchs, matche, rerun;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            rxOp = regexps.op;
            rxCl = regexps.cl;

            if (typeof rxCl === 'undefined') {
              rxCl = rxOp;
            }
            nested = { nested: false };
            matchs = info.find(rxOp, 0, escapable);
            matche = rxCl ? getIndE({
              info: info,
              rxOp: rxOp,
              matchs: matchs,
              rxCl: rxCl,
              inds: matchs ? matchs.index : -1,
              nestable: nestable,
              escapable: escapable,
              nested: nested
            }) : null;
            rerun = false;
            _context2.next = 9;
            return f();

          case 9:
            if (!rerun) {
              _context2.next = 13;
              break;
            }

            _context2.next = 12;
            return process(info, conversionFunction, {
              op: rxOp,
              cl: rxCl
            }, {
              nestable: nestable,
              escapable: escapable,
              check: check
            });

          case 12:
            return _context2.abrupt('return', _context2.sent);

          case 13:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function process(_x, _x2, _x3) {
    return _ref2.apply(this, arguments);
  };
}();

var markup = function () {
  var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, text) {
    var _ref6 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
        deletedPost = _ref6.deletedPost,
        markupModes = _ref6.markupModes,
        accessLevel = _ref6.accessLevel,
        referencedPosts = _ref6.referencedPosts;

    var info;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            if (!(!text || typeof text !== 'string')) {
              _context4.next = 2;
              break;
            }

            return _context4.abrupt('return', null);

          case 2:
            deletedPost = Tools.option(deletedPost, 'number', 0, { test: Tools.testPostNumber });
            if ((0, _underscore2.default)(markupModes).isArray()) {
              markupModes = markupModes.filter(function (mode) {
                return MARKUP_MODES.indexOf(mode) >= 0;
              });
            } else {
              markupModes = MARKUP_MODES;
            }
            if (!accessLevel || Tools.REGISTERED_USER_LEVELS.indexOf(accessLevel) < 0) {
              accessLevel = null;
            }
            text = text.replace(/\r+\n/g, '\n').replace(/\r/g, '\n');
            info = new _processingContext2.default(text, boardName, referencedPosts, deletedPost);
            _context4.next = 9;
            return Tools.series(elements, function () {
              var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(element) {
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        if (!(element.markupModes && !element.markupModes.some(function (mode) {
                          return markupModes.indexOf(mode) >= 0;
                        }))) {
                          _context3.next = 2;
                          break;
                        }

                        return _context3.abrupt('return');

                      case 2:
                        if (!(element.accessLevel && Tools.compareRegisteredUserLevels(accessLevel, element.accessLevel) < 0)) {
                          _context3.next = 4;
                          break;
                        }

                        return _context3.abrupt('return');

                      case 4:
                        if (!(element.permission && Tools.compareRegisteredUserLevels(accessLevel, Permissions[element.permission]()) < 0)) {
                          _context3.next = 6;
                          break;
                        }

                        return _context3.abrupt('return');

                      case 6:
                        if (!(typeof element.process === 'function')) {
                          _context3.next = 11;
                          break;
                        }

                        _context3.next = 9;
                        return element.process(info);

                      case 9:
                        _context3.next = 14;
                        break;

                      case 11:
                        if (!(typeof element.convert === 'function')) {
                          _context3.next = 14;
                          break;
                        }

                        _context3.next = 14;
                        return process(info, element.convert, {
                          op: element.op,
                          cl: element.cl
                        }, {
                          nestable: !!element.nestable,
                          escapable: !!element.escapable,
                          check: element.check,
                          pre: !!element.pre
                        });

                      case 14:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, this);
              }));

              return function (_x8) {
                return _ref7.apply(this, arguments);
              };
            }());

          case 9:
            return _context4.abrupt('return', info.toHTML(escapableSequencesRegExp, postProcessors));

          case 10:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function markup(_x5, _x6) {
    return _ref5.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _code = require('./code');

var _code2 = _interopRequireDefault(_code);

var _processingContext = require('./processing-context');

var _processingContext2 = _interopRequireDefault(_processingContext);

var _permissions = require('../helpers/permissions');

var Permissions = _interopRequireWildcard(_permissions);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var EXTENDED_WAKABA_MARK = 'EXTENDED_WAKABA_MARK';
var BB_CODE = 'BB_CODE';
var MARKUP_MODES = [EXTENDED_WAKABA_MARK, BB_CODE];

var elements = [];
var escapableSequencesRegExp = null;
var postProcessors = [];

function reloadElements() {
  elements = Tools.loadPlugins([__dirname, __dirname + '/custom'], function (fileName, _1, _2, path) {
    return 'index.js' !== fileName && 'processing-context.js' !== fileName || path.split('/') === 'custom';
  }, true).sort(function (p1, p2) {
    return p1.priority - p2.priority;
  });
  var escapableSequences = elements.filter(function (plugin) {
    return plugin.escapable;
  }).map(function (plugin) {
    return [plugin.op, plugin.cl];
  }).filter(function (sequence) {
    return sequence && typeof sequence === 'string';
  });
  escapableSequences = (0, _underscore2.default)(escapableSequences).flatten();
  escapableSequences = (0, _underscore2.default)(escapableSequences).uniq().map(function (sequence) {
    return Tools.escapeRegExp(sequence);
  });
  if (escapableSequences.length > 0) {
    escapableSequencesRegExp = new RegExp(escapableSequences.join('|'), 'g');
  } else {
    escapableSequencesRegExp = null;
  }
  postProcessors = elements.filter(function (plugin) {
    return typeof plugin.postProcessor === 'function';
  }).map(function (plugin) {
    return plugin.postProcessor;
  });
}

reloadElements();

function getIndE(_ref) {
  var info = _ref.info,
      rxOp = _ref.rxOp,
      matchs = _ref.matchs,
      rxCl = _ref.rxCl,
      inds = _ref.inds,
      nestable = _ref.nestable,
      escapable = _ref.escapable,
      nested = _ref.nested;

  nested.nested = false;
  if (!nestable) {
    return inds >= 0 ? info.find(rxCl, inds + matchs[0].length, escapable) : -1;
  }
  if (inds >= 0) {
    var matchst = info.find(rxOp, inds + matchs[0].length, escapable);
    var matchet = info.find(rxCl, inds + matchs[0].length, escapable);
    var depth = 1;
    while (matchst || matchet) {
      var tmp = matchst && (!matchet || matchst.index < matchet.index) ? matchst : matchet;
      var offs = matchst && (!matchet || matchst.index < matchet.index) ? matchst[0].length : matchet[0].length;
      depth += tmp.index == (matchst ? matchst.index : -1) ? 1 : -1;
      if (depth > 1) {
        nested.nested = true;
      }
      if (!depth) {
        return tmp;
      }
      matchst = info.find(rxOp, tmp.index + offs, escapable);
      matchet = info.find(rxCl, tmp.index + offs, escapable);
    }
  }
  return null;
}

function preReady(text) {
  return text.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split("\"").join("&quot;");
}

function markupModes(string) {
  if (typeof string !== 'string') {
    string = '';
  }
  return MARKUP_MODES.filter(function (mode) {
    return string.indexOf(mode) >= 0;
  });
}

Object.defineProperty(markup, 'EXTENDED_WAKABA_MARK', { value: EXTENDED_WAKABA_MARK });
Object.defineProperty(markup, 'BB_CODE', { value: BB_CODE });
Object.defineProperty(markup, 'MARKUP_MODES', { value: MARKUP_MODES });
Object.defineProperty(markup, "markupCode", { value: _code2.default.markupCode });
Object.defineProperty(markup, 'markupLaTeX', { value: _code2.default.markupLaTeX });
Object.defineProperty(markup, 'markupModes', { value: markupModes });

exports.default = markup;
//# sourceMappingURL=index.js.map
