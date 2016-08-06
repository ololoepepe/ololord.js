'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.generateStatistics = undefined;

var gatherBoardStatistics = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(board) {
    var BOARD_PUBLIC_PATH, statistics, lastPostNumber, fileNames;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            BOARD_PUBLIC_PATH = __dirname + '/../public/' + board.name;
            statistics = { diskUsage: 0 };
            _context2.prev = 2;
            _context2.next = 5;
            return BoardsModel.getLastPostNumber(board.name);

          case 5:
            lastPostNumber = _context2.sent;

            statistics.postCount = lastPostNumber;
            statistics.postingSpeed = Tools.postingSpeedString(board.launchDate, lastPostNumber);
            _context2.next = 13;
            break;

          case 10:
            _context2.prev = 10;
            _context2.t0 = _context2['catch'](2);

            _logger2.default.error(_context2.t0.stack || _context2.t0);

          case 13:
            _context2.prev = 13;
            _context2.next = 16;
            return _fs2.default.list(BOARD_PUBLIC_PATH + '/src');

          case 16:
            fileNames = _context2.sent;

            statistics.fileCount = fileNames.length;
            _context2.next = 23;
            break;

          case 20:
            _context2.prev = 20;
            _context2.t1 = _context2['catch'](13);

            if ('ENOENT' !== _context2.t1.code) {
              _logger2.default.error(_context2.t1.stack || _context2.t1);
            }

          case 23:
            _context2.next = 25;
            return Tools.series(['src', 'thumb', 'arch'], function () {
              var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(subpath) {
                var size;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _context.prev = 0;
                        _context.next = 3;
                        return Tools.du(BOARD_PUBLIC_PATH + '/' + subpath);

                      case 3:
                        size = _context.sent;

                        statistics.diskUsage += size;
                        _context.next = 10;
                        break;

                      case 7:
                        _context.prev = 7;
                        _context.t0 = _context['catch'](0);

                        if ('ENOENT' !== _context.t0.code) {
                          _logger2.default.error(_context.t0.stack || _context.t0);
                        }

                      case 10:
                      case 'end':
                        return _context.stop();
                    }
                  }
                }, _callee, this, [[0, 7]]);
              }));

              return function (_x2) {
                return ref.apply(this, arguments);
              };
            }());

          case 25:
            return _context2.abrupt('return', statistics);

          case 26:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[2, 10], [13, 20]]);
  }));

  return function gatherBoardStatistics(_x) {
    return ref.apply(this, arguments);
  };
}();

//Must be called from the master process only.


var generateStatistics = exports.generateStatistics = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
    var _this = this;

    var statistics, launchDate;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            if (_cluster2.default.isMaster) {
              _context5.next = 3;
              break;
            }

            _logger2.default.error(Tools.translate('Error: generateStatistics() called from worker process.'));
            return _context5.abrupt('return');

          case 3:
            console.log(Tools.translate('Generating statistics...'));
            statistics = {
              boards: [],
              total: {
                postCount: 0,
                fileCount: 0,
                diskUsage: 0
              }
            };
            launchDate = _underscore2.default.now();
            _context5.prev = 6;
            return _context5.delegateYield(regeneratorRuntime.mark(function _callee4() {
              var keys, uniqueUsers, data;
              return regeneratorRuntime.wrap(function _callee4$(_context4) {
                while (1) {
                  switch (_context4.prev = _context4.next) {
                    case 0:
                      _context4.next = 2;
                      return UsersModel.getUserPostNumbers();

                    case 2:
                      keys = _context4.sent;
                      uniqueUsers = _board3.default.boardNames().reduce(function (acc, boardName) {
                        acc[boardName] = 0;
                        return acc;
                      }, {});

                      statistics.total.uniqueIPCount = keys.map(function (key) {
                        return {
                          ip: key.split(':').slice(1, -1).join(':'),
                          boardName: key.split(':').pop()
                        };
                      }).filter(function (userPostInfo) {
                        return uniqueUsers.hasOwnProperty(userPostInfo.boardName);
                      }).reduce(function (acc, userPostInfo) {
                        ++uniqueUsers[userPostInfo.boardName];
                        acc.add(userPostInfo.ip);
                        return acc;
                      }, new Set()).size;
                      _context4.next = 7;
                      return Tools.series(_board3.default.boardNames(), function () {
                        var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(boardName) {
                          var board, boardLaunchDate, boardStatistics;
                          return regeneratorRuntime.wrap(function _callee3$(_context3) {
                            while (1) {
                              switch (_context3.prev = _context3.next) {
                                case 0:
                                  board = _board3.default.board(boardName);

                                  if (board) {
                                    _context3.next = 3;
                                    break;
                                  }

                                  return _context3.abrupt('return');

                                case 3:
                                  boardLaunchDate = board.launchDate.valueOf();

                                  if (boardLaunchDate < statistics.launchDate) {
                                    launchDate = boardLaunchDate;
                                  }
                                  _context3.next = 7;
                                  return gatherBoardStatistics(board);

                                case 7:
                                  boardStatistics = _context3.sent;

                                  boardStatistics.name = board.name;
                                  boardStatistics.title = board.title;
                                  boardStatistics.hidden = board.hidden;
                                  boardStatistics.uniqueIPCount = uniqueUsers[board.name];
                                  statistics.total.postCount += boardStatistics.postCount;
                                  statistics.total.fileCount += boardStatistics.fileCount;
                                  statistics.total.diskUsage += boardStatistics.diskUsage;
                                  statistics.boards.push(boardStatistics);

                                case 16:
                                case 'end':
                                  return _context3.stop();
                              }
                            }
                          }, _callee3, this);
                        }));

                        return function (_x3) {
                          return ref.apply(this, arguments);
                        };
                      }());

                    case 7:
                      statistics.total.postingSpeed = Tools.postingSpeedString(launchDate, statistics.total.postCount);
                      _context4.next = 10;
                      return IPC.send('getConnectionIPs');

                    case 10:
                      data = _context4.sent;

                      statistics.online = data.reduce(function (acc, ips) {
                        (0, _underscore2.default)(ips).each(function (_1, ip) {
                          acc.add(ip);
                        });
                        return acc;
                      }, new Set()).size;
                      statistics.uptime = process.uptime();
                      _context4.next = 15;
                      return Cache.writeFile('misc/statistics.json', JSON.stringify(statistics));

                    case 15:
                    case 'end':
                      return _context4.stop();
                  }
                }
              }, _callee4, _this);
            })(), 't0', 8);

          case 8:
            _context5.next = 13;
            break;

          case 10:
            _context5.prev = 10;
            _context5.t1 = _context5['catch'](6);

            _logger2.default.error(_context5.t1.stack || _context5.t1);

          case 13:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this, [[6, 10]]);
  }));

  return function generateStatistics() {
    return ref.apply(this, arguments);
  };
}();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _cluster = require('cluster');

var _cluster2 = _interopRequireDefault(_cluster);

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _board = require('./board');

var BoardsModel = _interopRequireWildcard(_board);

var _users = require('./users');

var UsersModel = _interopRequireWildcard(_users);

var _board2 = require('../boards/board');

var _board3 = _interopRequireDefault(_board2);

var _cache = require('../helpers/cache');

var Cache = _interopRequireWildcard(_cache);

var _ipc = require('../helpers/ipc');

var IPC = _interopRequireWildcard(_ipc);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; } //TODO: board -> boards
//# sourceMappingURL=statistics.js.map
