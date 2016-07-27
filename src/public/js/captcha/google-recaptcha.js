import * as DOM from '../helpers/dom';

const ID = 'google-recaptcha';
const WIDGET_TEMPLATE = 'captcha/googleRecaptchaWidget';
const SCRIPT_URL = '//www.google.com/recaptcha/api.js';

export default {
  id: ID,
  widgetTemplate: WIDGET_TEMPLATE,
  reload: () => {
    if (!window.grecaptcha) {
      return;
    }
    window.grecaptcha.reset();
  },
  initialize: () => {
    DOM.createScript(SCRIPT_URL, {
      id: 'google-recaptcha-script',
      replace: '#google-recaptcha-script'
    });
  }
};
