#!/usr/bin/env node

var express = require("express");

var commands = require("./helpers/commands");
var config = require("./helpers/config");

var app = express();
var rl = commands();

app.use(express.static(__dirname + "/public"));
app.use(require("./controllers"));

app.listen(config("server.port", 8080), function() {
    console.log("Listening on port " + config("server.port", 8080) + "...");
});
