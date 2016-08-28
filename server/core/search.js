'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findPosts = exports.removePostIndex = exports.updatePostIndex = exports.getPostIndex = exports.indexPost = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var indexPost = exports.indexPost = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(_ref) {
    var boardName = _ref.boardName;
    var postNumber = _ref.postNumber;
    var threadNumber = _ref.threadNumber;
    var plainText = _ref.plainText;
    var subject = _ref.subject;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return es.index({
              index: INDEX_NAME,
              type: 'posts',
              id: boardName + ':' + postNumber,
              body: {
                plainText: plainText,
                subject: subject,
                boardName: boardName,
                threadNumber: threadNumber
              }
            });

          case 3:
            _context.next = 8;
            break;

          case 5:
            _context.prev = 5;
            _context.t0 = _context['catch'](0);

            _logger2.default.error(_context.t0.stack || _context.t0);

          case 8:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 5]]);
  }));

  return function indexPost(_x) {
    return ref.apply(this, arguments);
  };
}();

var getPostIndex = exports.getPostIndex = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(boardName, postNumber) {
    var data;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return es.get({
              index: INDEX_NAME,
              type: 'posts',
              id: boardName + ':' + postNumber
            });

          case 3:
            data = _context2.sent;
            return _context2.abrupt('return', data._source);

          case 7:
            _context2.prev = 7;
            _context2.t0 = _context2['catch'](0);

            _logger2.default.error(_context2.t0.stack || _context2.t0);
            return _context2.abrupt('return', { _source: {} });

          case 11:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[0, 7]]);
  }));

  return function getPostIndex(_x2, _x3) {
    return ref.apply(this, arguments);
  };
}();

var updatePostIndex = exports.updatePostIndex = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName, postNumber, transformer) {
    var body;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (!(typeof transformer !== 'function')) {
              _context3.next = 2;
              break;
            }

            return _context3.abrupt('return');

          case 2:
            _context3.prev = 2;
            _context3.next = 5;
            return getPostIndex(boardName, postNumber);

          case 5:
            body = _context3.sent;
            _context3.next = 8;
            return transformer(body);

          case 8:
            body = _context3.sent;
            _context3.next = 11;
            return es.index({
              index: INDEX_NAME,
              type: 'posts',
              id: boardName + ':' + postNumber,
              body: body
            });

          case 11:
            _context3.next = 16;
            break;

          case 13:
            _context3.prev = 13;
            _context3.t0 = _context3['catch'](2);

            _logger2.default.error(_context3.t0.stack || _context3.t0);

          case 16:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[2, 13]]);
  }));

  return function updatePostIndex(_x4, _x5, _x6) {
    return ref.apply(this, arguments);
  };
}();

var removePostIndex = exports.removePostIndex = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(boardName, postNumber) {
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.prev = 0;
            _context4.next = 3;
            return es.delete({
              index: INDEX_NAME,
              type: 'posts',
              id: boardName + ':' + postNumber
            });

          case 3:
            _context4.next = 8;
            break;

          case 5:
            _context4.prev = 5;
            _context4.t0 = _context4['catch'](0);

            _logger2.default.error(_context4.t0.stack || _context4.t0);

          case 8:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[0, 5]]);
  }));

  return function removePostIndex(_x7, _x8) {
    return ref.apply(this, arguments);
  };
}();

var findPosts = exports.findPosts = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(_ref2, _ref3) {
    var requiredPhrases = _ref2.requiredPhrases;
    var excludedPhrases = _ref2.excludedPhrases;
    var possiblePhrases = _ref2.possiblePhrases;
    var boardName = _ref3.boardName;
    var page = _ref3.page;
    var limit, startFrom, query, result;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            page = Tools.option(page, 'number', 0, { test: function test(p) {
                return p >= 0;
              } });
            limit = (0, _config2.default)('system.search.maxResultCount');
            startFrom = page * limit;
            query = { bool: {} };

            if ((0, _underscore2.default)(requiredPhrases).isArray() && requiredPhrases.length > 0) {
              query.bool.must = requiredPhrases.map(mapPhrase);
            }
            if (boardName && typeof boardName === 'string') {
              query.bool.must = (query.bool.must || []).concat({ match_phrase: { boardName: boardName } });
            }
            if ((0, _underscore2.default)(excludedPhrases).isArray() && excludedPhrases.length > 0) {
              query.bool.must_not = excludedPhrases.map(mapPhrase);
            }
            if ((0, _underscore2.default)(possiblePhrases).isArray() && possiblePhrases.length > 0) {
              if ((0, _underscore2.default)(requiredPhrases).isArray() && requiredPhrases.length > 0) {
                query.bool.should = possiblePhrases.map(mapPhrase);
              } else {
                query.bool.must = (query.bool.must || []).concat({ bool: { should: possiblePhrases.map(mapPhrase) } });
              }
            }
            _context5.next = 10;
            return es.search({
              index: INDEX_NAME,
              type: 'posts',
              from: startFrom,
              size: limit,
              body: { query: query }
            });

          case 10:
            result = _context5.sent;
            return _context5.abrupt('return', {
              posts: result.hits.hits.map(function (hit) {
                var _hit$_id$split = hit._id.split(':');

                var _hit$_id$split2 = _slicedToArray(_hit$_id$split, 2);

                var boardName = _hit$_id$split2[0];
                var postNumber = _hit$_id$split2[1];
                var _hit$_source = hit._source;
                var threadNumber = _hit$_source.threadNumber;
                var plainText = _hit$_source.plainText;
                var subject = _hit$_source.subject;
                var archived = _hit$_source.archived;

                return {
                  boardName: boardName,
                  number: +postNumber,
                  threadNumber: +threadNumber,
                  plainText: plainText,
                  subject: subject,
                  archived: !!archived
                };
              }),
              total: result.hits.total,
              max: limit
            });

          case 12:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function findPosts(_x9, _x10) {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _elasticsearch = require('elasticsearch');

var _elasticsearch2 = _interopRequireDefault(_elasticsearch);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

try {
  var es = new _elasticsearch2.default.Client({ host: (0, _config2.default)('system.elasticsearch.host') });
} catch (err) {
  var es = null;
}

var INDEX_NAME = 'ololord.js';

function mapPhrase(phrase) {
  return {
    bool: {
      should: [{ match_phrase: { plainText: phrase } }, { match_phrase: { subject: phrase } }]
    }
  };
}
//# sourceMappingURL=search.js.map
