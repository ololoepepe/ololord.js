var express = require("express");

var controller = require("../helpers/controller");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

var router = express.Router();

router.get("/search.html", function(req, res) {
    var model = {};
    model.title = Tools.translate("Search", "pageTitle");
    model.resultsMessage = Tools.translate("Search results", "resultsMessage");
    model.nothingFoundMessage = Tools.translate("Nothing found", "nothingFoundMessage");
    var query = req.query.query || "";
    var boardName = req.query.board || "";
    if ("*" == boardName)
        boardName = "";
    model.searchQuery = query;
    model.searchBoard = boardName;
    Promise.resolve().then(function() {
        var phrases = Tools.splitCommand(query);
        if (!phrases)
            return Promise.reject(Tools.translate("Invalid search query", "error"));
        phrases = [phrases.command].concat(phrases.arguments);
        query = {
            requiredPhrases: [],
            excludedPhrases: [],
            possiblePhrases: []
        };
        phrases.forEach(function(phrase) {
            if (phrase.substr(0, 1) == "+")
                query.requiredPhrases.push(phrase.substr(1).toLowerCase());
            else if (phrase.substr(0, 1) == "-")
                query.excludedPhrases.push(phrase.substr(1).toLowerCase());
            else
                query.possiblePhrases.push(phrase.toLowerCase());
        });
        return Database.findPosts(query, boardName);
    }).then(function(posts) {
        model.searchResults = posts.map(function(post) {
            var text = post.rawText;
            text = text.replace(/\r*\n+/g, " ");
            if (text.length > 300)
                text = text.substr(0, 297) + "...";
            var subject = post.subject || text;
            if (subject.length > 100)
                subject = subject.substr(0, 97) + "...";
            query.requiredPhrases.concat(query.possiblePhrases).forEach(function(phrase) {
                var ind = text.toLowerCase().indexOf(phrase);
                while (ind >= 0) {
                    var nphrase = "<b><font color=\"red\">" + phrase + "</font></b>";
                    text = text.substr(0, ind) + nphrase + text.substr(ind + phrase.length);
                    ind = text.toLowerCase().indexOf(phrase, ind + nphrase.length);
                }
            });
            return {
                boardName: post.boardName,
                postNumber: post.number,
                threadNumber: post.threadNumber,
                subject: subject,
                text: text
            };
        });
        return controller(req, "search", model);
    }).then(function(data) {
        res.send(data);
    }).catch(function(err) {
        res.send("Error: " + err);
        console.log(err.stack);
    });
});

module.exports = router;
