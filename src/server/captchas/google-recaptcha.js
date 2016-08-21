import _ from 'underscore';
import HTTP from 'q-io/http';

import Captcha from './captcha';
import * as Tools from '../helpers/tools';

const ERROR_CODE_TRANSLATIONS = {
  'missing-input-secret': Tools.translate.noop('The secret captcha parameter is missing'),
  'invalid-input-secret': Tools.translate.noop('The secret captcha parameter is invalid or malformed'),
  'missing-input-response': Tools.translate.noop('The captcha response parameter is missing'),
  'invalid-input-response': Tools.translate.noop('The captcha response parameter is invalid or malformed')
};

export default class GoogleRecaptcha extends Captcha {
  constructor() {
    super('google-recaptcha', Tools.translate.noop('Google reCAPTCHA'));
    this.defineSetting('timeout', 15 * Tools.SECOND);
  }

  async checkCaptcha(ip, fields) {
    let captcha = fields['g-recaptcha-response'];
    if (!captcha) {
      throw new Error(Tools.translate('Captcha is empty'));
    }
    let query = `secret=${this.privateKey}&response=${captcha}&remoteip=${ip}`;
    let reply = await HTTP.request({
      url: `https://www.google.com/recaptcha/api/siteverify?${query}`,
      timeout: this.timeout
    });
    if (200 !== reply.status) {
      throw new Error(Tools.translate('Failed to check captcha'));
    }
    let data = await reply.body.read('utf8');
    let result = JSON.parse(data.toString());
    if (!result.success) {
      _(ERROR_CODE_TRANSLATIONS).each((translation, errorCode) => {
        if (errorCodes.indexOf(errorCode) >= 0) {
          throw new Error(Tools.translate(translation));
        }
      });
      throw new Error(Tools.translate('Invalid captcha'));
    }
  }
}
