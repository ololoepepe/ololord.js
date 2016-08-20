'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('q-io/fs');

var _fs2 = _interopRequireDefault(_fs);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PostCreationTransaction = function () {
  function PostCreationTransaction(boardName) {
    _classCallCheck(this, PostCreationTransaction);

    this.boardName = boardName;
    this.files = [];
  }

  _createClass(PostCreationTransaction, [{
    key: 'addFile',
    value: function addFile(path) {
      this.files.push(path);
    }
  }, {
    key: 'setThreadNumber',
    value: function setThreadNumber(threadNumber) {
      this.threadNumber = threadNumber;
    }
  }, {
    key: 'setPostNumber',
    value: function setPostNumber(postNumber) {
      this.postNumber = postNumber;
    }
  }, {
    key: 'rollback',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.prev = 0;
                _context.next = 3;
                return this._rollbackFiles();

              case 3:
                if (!(this.threadNumber > 0)) {
                  _context.next = 6;
                  break;
                }

                _context.next = 6;
                return this._rollbackThread();

              case 6:
                if (!(this.postNumber > 0)) {
                  _context.next = 9;
                  break;
                }

                _context.next = 9;
                return this._rollbackPost();

              case 9:
                _context.next = 14;
                break;

              case 11:
                _context.prev = 11;
                _context.t0 = _context['catch'](0);

                _logger2.default.error(_context.t0.stack || _context.t0);

              case 14:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this, [[0, 11]]);
      }));

      function rollback() {
        return ref.apply(this, arguments);
      }

      return rollback;
    }()
  }, {
    key: '_rollbackFiles',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.next = 2;
                return Tools.series(this.files, function () {
                  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(path) {
                    var exists;
                    return regeneratorRuntime.wrap(function _callee2$(_context2) {
                      while (1) {
                        switch (_context2.prev = _context2.next) {
                          case 0:
                            _context2.prev = 0;
                            _context2.next = 3;
                            return _fs2.default.exists(path);

                          case 3:
                            exists = _context2.sent;

                            if (!exists) {
                              _context2.next = 7;
                              break;
                            }

                            _context2.next = 7;
                            return _fs2.default.remove(path);

                          case 7:
                            _context2.next = 12;
                            break;

                          case 9:
                            _context2.prev = 9;
                            _context2.t0 = _context2['catch'](0);

                            _logger2.default.error(_context2.t0.stack || _context2.t0);

                          case 12:
                          case 'end':
                            return _context2.stop();
                        }
                      }
                    }, _callee2, this, [[0, 9]]);
                  }));

                  return function (_x) {
                    return ref.apply(this, arguments);
                  };
                }());

              case 2:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function _rollbackFiles() {
        return ref.apply(this, arguments);
      }

      return _rollbackFiles;
    }()
  }, {
    key: '_rollbackThread',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4() {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                try {
                  /*
                  return removeThread(_this.board.name, _this.threadNumber).catch(function(err) {
                      Logger.error(err.stack || err);
                  });
                  */
                } catch (err) {
                  _logger2.default.error(err.stack || err);
                }

              case 1:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function _rollbackThread() {
        return ref.apply(this, arguments);
      }

      return _rollbackThread;
    }()
  }, {
    key: '_rollbackPost',
    value: function () {
      var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5() {
        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                try {
                  /*
                  return removePost(_this.board.name, _this.postNumber).catch(function(err) {
                      Logger.error(err.stack || err);
                  });
                  */
                } catch (err) {
                  _logger2.default.error(err.stack || err);
                }

              case 1:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function _rollbackPost() {
        return ref.apply(this, arguments);
      }

      return _rollbackPost;
    }()
  }]);

  return PostCreationTransaction;
}();

exports.default = PostCreationTransaction;
//# sourceMappingURL=post-creation-transaction.js.map
