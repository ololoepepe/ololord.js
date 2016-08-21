import HTTP from 'q-io/http';

import Captcha from './captcha';
import config from '../helpers/config';
import * as Tools from '../helpers/tools';

export default class GoogleRecaptchaV1 extends Captcha {
  constructor() {
    super('google-recaptcha-v1', Tools.translate.noop('Google reCAPTCHA v1'));
    this.defineSetting('timeout', 15 * Tools.SECOND);
  }

  async checkCaptcha(ip, { recaptcha_challenge_field, recaptcha_response_field }) {
    let challenge = recaptcha_challenge_field;
    let response = recaptcha_response_field;
    if (!challenge) {
      throw new Error(Tools.translate('Captcha challenge is empty'));
    }
    if (!response) {
      throw new Error(Tools.translate('Captcha is empty'));
    }
    let query = `privatekey=${this.privateKey}&remoteip=${ip}&challenge=${encodeURIComponent(challenge)}`
      + `&response=${encodeURIComponent(response)}`;
    let reply = await HTTP.request({
      url: `https://www.google.com/recaptcha/api/verify?${query}`,
      timeout: this.timeout
    });
    if (200 !== reply.status) {
      throw new Error(Tools.translate('Failed to check captcha'));
    }
    let data = await reply.body.read('utf8');
    let result = data.toString();
    if (result.indexOf('true') < 0) {
      throw new Error(Tools.translate('Invalid captcha'));
    }
  }
}
