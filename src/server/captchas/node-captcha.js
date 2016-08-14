var captcha = require("node-captcha");
var FS = require("q-io/fs");
var UUID = require("uuid");

var Captcha = require("./captcha");
var config = require("../helpers/config");
var Tools = require("../helpers/tools");

import Logger from '../helpers/logger';

var nodeCaptcha = new Captcha("node-captcha", Tools.translate.noop("Node captcha"));

nodeCaptcha.challenges = {};

nodeCaptcha.info = function() {
    var inf = Captcha.prototype.info.call(this);
    inf.size = config("captcha.node-captcha.size", 6);
    inf.height = config("captcha.node-captcha.height", 60);
    inf.width = config("captcha.node-captcha.width", Math.round((inf.size * inf.height) / 1.8));
    inf.ttl = config("captcha.node-captcha.ttl", 5 * Tools.Minute);
    return inf;
};

nodeCaptcha.checkCaptcha = function(_1, fields) {
    var challenge = fields.nodeCaptchaChallenge;
    var response = fields.nodeCaptchaResponse;
    if (!challenge)
        return Promise.reject(Tools.translate("Captcha challenge is empty"));
    if (!response)
        return Promise.reject(Tools.translate("Captcha is empty"));
    var c = nodeCaptcha.challenges[challenge];
    if (!c)
        return Promise.reject(Tools.translate("Invalid captcha"));
    clearTimeout(c.timer);
    FS.remove(__dirname + "/../public/node-captcha/" + c.fileName).catch(function(err) {
        Logger.error(err);
    });
    delete nodeCaptcha.challenges[challenge];
    if (response !== c.response)
        return Promise.reject(Tools.translate("Captcha is solved incorrectly"));
    return Promise.resolve();
};

nodeCaptcha.apiRoutes = function() {
    return [{
        method: "get",
        path: "/nodeCaptchaImage.json",
        handler: function(_1, res) {
            var size = config("captcha.node-captcha.size", 6);
            var height = config("captcha.node-captcha.height", 60);
            var color = config("captcha.node-captcha.color", "rgb(0,0,0)");
            captcha({
                fileMode: 1,
                saveDir: __dirname + "/../public/node-captcha",
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
            }, function(response, fileName) {
                var challenge = UUID.v4();
                nodeCaptcha.challenges[challenge] = {
                    challenge: challenge,
                    fileName: fileName,
                    response: response,
                    timer: setTimeout(function() {
                        FS.remove(__dirname + "/../public/node-captcha/" + fileName).catch(function(err) {
                            Logger.error(err);
                        });
                        delete nodeCaptcha.challenges[challenge];
                    }, config("captcha.node-captcha.ttl", 5 * Tools.Minute))
                };
                res.send({
                    challenge: challenge,
                    fileName: fileName,
                    ttl: config("captcha.node-captcha.ttl", 5 * Tools.Minute)
                });
            });
        }
    }];
};

nodeCaptcha.removeOldCaptchImages = async function() {
  try {
    const PATH = `${__dirname}/../public/node-captcha`;
    let fileNames = await FS.list(PATH);
    await Tools.series(fileNames.filter((fileName) => {
      let [name, suffix] = fileName.split('.');
      return 'png' === suffix && /^[0-9]+$/.test(name);
    }), async function(fileName) {
      return await FS.remove(`${PATH}/${fileName}`);
    });
  } catch (err) {
    Logger.error(err.stack || err);
  }
}

module.exports = nodeCaptcha;
