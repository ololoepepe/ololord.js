var express = require("express");

//var cache = require("../helpers/cache");
var config = require("../helpers/config");
var controller = require("../helpers/controller");
var promisify = require("../helpers/promisify.js");
var homepage = require("../models/homepage");

var router = express.Router();

/*router.post('/', auth, function(req, res) {
  user = req.user.id
  text = req.body.text

  Comment.create(user, text, function (err, comment) {
    res.redirect('/')
  })
})*/

var modelData = {
    "siteProtocol": config("site.protocol", ""),
    "siteDomain": config("site.domain", ""),
    "sitePathPrefix": config("site.pathPrefix", "")
};

var modelDataNavbar = JSON.parse(JSON.stringify(modelData));
modelDataNavbar.boards = [{
        name: "b",
        title: "Бред"
    }, {
        name: "d",
        title: "Дискуссии о борде"
    }
];
modelDataNavbar.mode = {
    name: "normal"
};
modelDataNavbar.toPlaylistPageText = "";
modelDataNavbar.toMarkupPageText = "";
modelDataNavbar.toHomePageText = "";
modelDataNavbar.path = "/";
modelDataNavbar.framedVersionText = "";
modelDataNavbar.toFaqPageText = "";
modelDataNavbar.moder = 1;
modelDataNavbar.toManagePageText = "";
modelDataNavbar.customLinks = [];

router.get("/", function(req, res) {
    console.time("homepage"); //TODO: test
    var x = "";
    controller("homepage/main", modelData).then(function(result) {
        x += result;
        return controller("navbar", modelDataNavbar);
    }).then(function(result) {
        x = x.replace("<!--NAVBAR-->", result);
        res.send(x);
        console.timeEnd("homepage"); //TODO: test
    });
});

module.exports = router;
