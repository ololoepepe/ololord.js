//var BodyParser = require("body-parser");
//var Crypto = require("crypto");
var express = require("express");
var Util = require("util");

var Board = require("../boards");
var boardModel = require("../models/board");
var controller = require("../helpers/controller");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

//router.use(BodyParser.json());

var postIdentifiers = function(req, single) {
    if (req.query.posts) {
        var posts = req.query.posts;
        if (!posts)
            return [];
        if (Util.isString(posts))
            posts = [posts];
        return posts.map(function(post) {
            return {
                boardName: post.split(":").shift(),
                postNumber: +post.split(":").pop()
            };
        });
    } else if (req.query.post) {
        return [ {
            boardName: req.query.boardName,
            postNumber: +req.query.postNumber
        } ];
    } else {
        return [];
    }
};

var renderPost = function(req, post) {
    if (!post)
        return post;
    var board = Board.board(post.boardName);
    if (board)
        board.renderPost(post, req);
    return post;
};

router.get("/posts.json", function(req, res) {
    var posts = postIdentifiers(req);
    boardModel.getPosts(posts, req.hashpass).then(function(posts) {
        res.send(posts.map(renderPost.bind(null, req)));
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

router.get("/post.json", function(req, res) {
    boardModel.getPosts(postIdentifiers(req), req.hashpass).then(function(posts) {
        res.send(renderPost(req, posts[0]));
    }).catch(function(err) {
        controller.error(req, res, err, true);
    });
});

module.exports = router;
