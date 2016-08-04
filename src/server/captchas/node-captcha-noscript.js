var captcha = require("node-captcha");
var FS = require("q-io/fs");
var UUID = require("uuid");

var Captcha = require("./captcha");
var config = require("../helpers/config");
var Global = require("../helpers/global");
var Tools = require("../helpers/tools");

var nodeCaptcha = new Captcha("node-captcha-noscript", Tools.translate.noop("Node captcha (no script)"));

nodeCaptcha.challenges = {};

nodeCaptcha.checkCaptcha = function(req, fields) {
  var challenge = nodeCaptcha.challenges[req.ip];
  if (!challenge) {
    return Promise.reject(Tools.translate("No captcha for this IP"));
  }
  var response = fields.nodeCaptchaResponse;
  if (!response) {
    return Promise.reject(Tools.translate("Captcha is empty"));
  }
  clearTimeout(challenge.timer);
  FS.remove(__dirname + "/../tmp/node-captcha-noscript/" + challenge.fileName).catch(function(err) {
    Global.error(err);
  });
  delete nodeCaptcha.challenges[req.ip];
  if (response !== challenge.response) {
    return Promise.reject(Tools.translate("Captcha is solved incorrectly"));
  }
  return Promise.resolve();
};

nodeCaptcha.apiRoutes = function() {
  return [{
    method: "get",
    path: "/nodeCaptchaImage.png",
    handler: function(req, res) {
      let challenge = nodeCaptcha.challenges[req.ip];
      if (challenge) {
        res.sendFile(challenge.fileName, { root: __dirname + "/../tmp/node-captcha-noscript" });
      } else {
        var size = config("captcha.node-captcha.size", 6);
        var height = config("captcha.node-captcha.height", 60);
        var color = config("captcha.node-captcha.color", "rgb(0,0,0)");
        captcha({
          fileMode: 2,
          size: size,
          height: height,
          width: config("captcha.node-captcha.width", Math.round((height * size) / 1.8)),
          color: color,
          background: config("captcha.node-captcha.background", "rgb(255,255,255)"),
          lineWidth: config("captcha.node-captcha.lineWidth", 4),
          noise: config("captcha.node-captcha.noise", true),
          noiseColor: config("captcha.node-captcha.noiseColor", color),
          complexity: config("captcha.node-captcha.complexity", 1),
          spacing: config("captcha.node-captcha.spacing", 4)
        }, function(response, data) {
          let fileName = `${+Tools.now()}.png`;
          FS.write(__dirname + "/../tmp/node-captcha-noscript/" + fileName, data).then(function() {
            nodeCaptcha.challenges[req.ip] = {
              challenge: challenge,
              fileName: fileName,
              response: response,
              timer: setTimeout(function() {
                FS.remove(__dirname + "/../tmp/node-captcha-noscript/" + fileName).catch(function(err) {
                  Global.error(err);
                });
                delete nodeCaptcha.challenges[challenge];
              }, config("captcha.node-captcha.ttl", 5 * Tools.Minute))
            };
            res.end(data);
          });
        });
      }
    }
  }];
};

module.exports = nodeCaptcha;
