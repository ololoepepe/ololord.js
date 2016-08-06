var express = require("express");

var Board = require('../boards/board');
var BoardModel = require("../models/board");

import * as Tools from '../helpers/tools';

var router = express.Router();

router.generateJSON = function() {
    return BoardModel.generateJSON();
};

router.paths = async function() {
  //TODO
};

router.render = async function(paths) {
  //TODO
  return await Tools.series(paths, async function(path) {
    //= /^\/[^\/]+\/(archive|arch\/\d+)\.(html|json)$/
    if (ARCHIVE_PATHS_REGEXP.test(path)) {
      //
    } else {
      //
    }
  });
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
};

module.exports = router;
