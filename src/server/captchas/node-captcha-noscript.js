import _ from 'underscore';
import captcha from 'node-captcha';
import FS from 'q-io/fs';

import Captcha from './captcha';
import config from '../helpers/config';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

const CAPTCHA_PATH = `${__dirname}/../../tmp/node-captcha-noscript`;

async function getNodeCaptchaImage(req, res, next) {
  let challenge = this.challenges[req.ip];
  if (challenge) {
    res.sendFile(challenge.fileName, { root: CAPTCHA_PATH });
    return;
  }
  let self = this;
  captcha({
    fileMode: 2,
    size: this.size,
    height: this.height,
    width: this.width,
    color: this.color,
    background: this.background,
    lineWidth: this.lineWidth,
    noise: this.noise,
    noiseColor: this.noiseColor,
    complexity: this.complexity,
    spacing: this.spacing
  }, async function(response, data) {
    try {
      let fileName = `${_.now()}.png`;
      await FS.write(`${CAPTCHA_PATH}/${fileName}`, data);
      self.challenges.set(req.ip, {
        ip: req.ip,
        fileName: fileName,
        response: response,
        timer: setTimeout(() => {
          FS.remove(`${CAPTCHA_PATH}/${fileName}`).catch((err) => {
            Logger.error(err);
          });
          self.challenges.delete(challenge);
        }, self.ttl)
      });
      res.end(data);
    } catch (err) {
      next(err);
    }
  });
}

export default class NodeCaptchaNoscript extends Captcha {
  static async removeOldCaptchImages() {
    try {
      let fileNames = await FS.list(CAPTCHA_PATH);
      await Tools.series(fileNames.filter((fileName) => {
        let [name, suffix] = fileName.split('.');
        return 'png' === suffix && /^[0-9]+$/.test(name);
      }), async function(fileName) {
        return await FS.remove(`${CAPTCHA_PATH}/${fileName}`);
      });
    } catch (err) {
      Logger.error(err.stack || err);
    }
  }

  constructor() {
    super('node-captcha-noscript', Tools.translate.noop('Node captcha (no script)'));
    this.challenges = new Map();
    this.defineSetting('size', 6);
    this.defineSetting('height', 60);
    this.defineSetting('color', 'rgb(0,0,0)');
    this.defineSetting('background', 'rgb(255,255,255)');
    this.defineSetting('lineWidth', 4);
    this.defineSetting('noise', true);
    this.defineSetting('complexity', 1);
    this.defineSetting('spacing', 4);
    this.defineProperty('width', () => {
      return config('captcha.node-captcha.width', Math.round((this.size * this.height) / 1.8));
    });
    this.defineProperty('noiseColor', () => {
      return config('captcha.node-captcha.noiseColor', this.color);
    });
    this.defineSetting('ttl', 5 * Tools.MINUTE);
  }

  async checkCaptcha({ ip }, { nodeCaptchaResponse }) {
    let challenge = this.challenges.get(ip);
    let response = nodeCaptchaResponse;
    if (!challenge) {
      return Tools.translate('No captcha for this IP');
    }
    if (!response) {
      throw new Error(Tools.translate('Captcha is empty'));
    }
    clearTimeout(challenge.timer);
    FS.remove(`${CAPTCHA_PATH}/${challenge.fileName}`).catch((err) => {
      Logger.error(err);
    });
    this.challenges.delete(ip);
    if (response !== challenge.response) {
      throw new Error(Tools.translate('Captcha is solved incorrectly'));
    }
  }

  apiRoutes() {
    return [{
      method: 'get',
      path: '/nodeCaptchaImage.png',
      handler: getNodeCaptchaImage.bind(this)
    }];
  }
}
