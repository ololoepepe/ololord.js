"use strict";

var _tools = require("../helpers/tools");

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var express = require("express");

var Board = require('../boards/board');
var BoardModel = require("../models/board");

var router = express.Router();

router.generateJSON = function () {
    return BoardModel.generateJSON();
};

router.paths = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
    return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                case "end":
                    return _context.stop();
            }
        }
    }, _callee, this);
}));

//TODO
router.render = function () {
    var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(paths) {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        _context3.next = 2;
                        return Tools.series(paths, function () {
                            var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(path) {
                                return regeneratorRuntime.wrap(function _callee2$(_context2) {
                                    while (1) {
                                        switch (_context2.prev = _context2.next) {
                                            case 0:
                                                //= /^\/[^\/]+\/(archive|arch\/\d+)\.(html|json)$/
                                                if (ARCHIVE_PATHS_REGEXP.test(path)) {
                                                    //
                                                } else {
                                                        //
                                                    }

                                            case 1:
                                            case "end":
                                                return _context2.stop();
                                        }
                                    }
                                }, _callee2, this);
                            }));

                            return function (_x2) {
                                return ref.apply(this, arguments);
                            };
                        }());

                    case 2:
                        return _context3.abrupt("return", _context3.sent);

                    case 3:
                    case "end":
                        return _context3.stop();
                }
            }
        }, _callee3, this);
    }));

    return function (_x) {
        return ref.apply(this, arguments);
    };
}();

/*return Tools.series(Board.boardNames(), function(boardName) {
    var archPath = `${__dirname}/../public/${boardName}/arch`;
    return FS.exists(archPath).then(function(exists) {
        return Tools.promiseIf(exists, function() {
            var board = Board.board(boardName);
            return FS.list(archPath).then(function(fileNames) {
                return Tools.series(fileNames.filter(function(fileName) {
                    return fileName.split(".").pop() == "json";
                }), function(fileName) {
                    var threadNumber = +fileName.split(".").shift();
                    var c = {};
                    return BoardModel.getThread(board, threadNumber, true).then(function(model) {
                        c.model = model;
                        return FS.write(`${archPath}/${threadNumber}.json`, JSON.stringify(c.model));
                    }).then(function() {
                        return BoardModel.generateThreadHTML(board, threadNumber, c.model, true);
                    }).then(function(data) {
                        return FS.write(`${archPath}/${threadNumber}.html`, data);
                    }).catch(function(err) {
                        Logger.error(err.stack || err);
                    }).then(function() {
                        return Promise.resolve();
                    });
                });
            });
        });
    }).catch(function(err) {
        Logger.error(err.stack || err);
    }).then(function() {
        return Promise.resolve();
    });
});*/
module.exports = router;
//# sourceMappingURL=board.js.map
