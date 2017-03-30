import * as DOM from '../helpers/dom';

const ID = 'google-recaptcha-v1';
const WIDGET_TEMPLATE = 'captcha/googleRecaptchaV1Widget';
const SCRIPT_URL = '//www.google.com/recaptcha/api/js/recaptcha_ajax.js';
const THEME_NAME = 'clean';

export default {
  id: ID,
  widgetTemplate: WIDGET_TEMPLATE,
  reload: () => {
    if (!window.Recaptcha) {
      return;
    }
    window.Recaptcha.reload();
  },
  initialize: (data) => {
    DOM.createScript(SCRIPT_URL, {
      id: 'google-recaptcha-v1-script',
      replace: '#google-recaptcha-v1-script',
      onload: () => {
        window.Recaptcha.create(data.publicKey, 'captcha', { theme: THEME_NAME });
      }
    });
    let css = '#recaptcha_image_cell, #recaptcha_response_field { background-color: inherit !important; }';
    DOM.createStylesheet(css, {
      id: 'google-recaptcha-v1-style-fix',
      replace: '#google-recaptcha-v1-style-fix'
    });
  }
};
