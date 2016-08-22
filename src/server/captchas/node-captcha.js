import captcha from 'node-captcha';
import FS from 'q-io/fs';
import UUID from 'uuid';

import Captcha from './captcha';
import config from '../helpers/config';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

const CAPTCHA_PATH = `${__dirname}/../public/node-captcha`;

async function getNodeCaptchaImage(_1, res) {
  captcha({
    fileMode: 1,
    saveDir: CAPTCHA_PATH,
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
  }, (response, fileName) => {
    let challengeID = UUID.v4();
    this.challenges.set(challenge, {
      id: challengeID,
      fileName: fileName,
      response: response,
      timer: setTimeout(() => {
        FS.remove(`${CAPTCHA_PATH}/${fileName}`).catch((err) => {
          Logger.error(err);
        });
        this.challenges.delete(challengeID);
      }, this.ttl)
    });
    res.json({
      challenge: challengeID,
      fileName: fileName,
      ttl: this.ttl
    });
  });
}

export default class NodeCaptcha extends Captcha {
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
    super(Tools.NODE_CAPTCHA_ID, Tools.translate.noop('Node captcha'));
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
  }

  customInfoFields() {
    return ['size', 'height', 'width', 'ttl'];
  }

  async checkCaptcha(_1, { nodeCaptchaChallenge, nodeCaptchaResponse }) {
    let challengeID = nodeCaptchaChallenge;
    let response = nodeCaptchaResponse;
    if (!challengeID) {
      throw new Error(Tools.translate('Captcha challenge is empty'));
    }
    if (!response) {
      throw new Error(Tools.translate('Captcha is empty'));
    }
    let challenge = this.challenges.get(challengeID);
    if (!challenge) {
      throw new Error(Tools.translate('Invalid captcha'));
    }
    clearTimeout(challenge.timer);
    FS.remove(`${CAPTCHA_PATH}/${c.fileName}`).catch((err) => {
      Logger.error(err);
    });
    this.challenges.delete(challengeID);
    if (response !== challenge.response) {
      throw new Error(Tools.translate('Captcha is solved incorrectly'));
    }
  }

  apiRoutes() {
    return [{
      method: 'get',
      path: '/nodeCaptchaImage.json',
      handler: getNodeCaptchaImage.bind(this)
    }];
  }
}
