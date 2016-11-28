import _ from 'underscore';
import $ from 'jquery';

import * as AJAX from '../helpers/ajax';
import * as DOM from '../helpers/dom';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as NodeCaptcha from './node-captcha';

let engines = {};
let selectedEngine = null;
export let registerEngine = Tools.createRegisterFunction(engines, 'engine', 'object');

let MODULES = [
  require('./google-recaptcha').default,
  require('./google-recaptcha-v1').default,
  require('./node-captcha').default
];

MODULES.forEach((m) => { registerEngine(m.id, m); });

function selectCaptchaEngine() {
  let supportedCaptchaEngines = Tools.supportedCaptchaEngines(Tools.boardName());
  let ceid = Settings.captchaEngine() || null;
  if (!ceid || !_(supportedCaptchaEngines).contains(ceid)) {
    if (_(supportedCaptchaEngines).contains(NodeCaptcha.id)) {
      ceid = NodeCaptcha.id;
    } else {
      ceid = supportedCaptchaEngines[0].id;
    }
  }
  let engine = engines[ceid];
  return (engine && engine[0] && engine[0].engine) || null;
}

async function getQuota() {
  let result = await AJAX.api('captchaQuota', { boardName: Tools.boardName() });
  return (result && result.quota) || 0;
}

export async function createCaptcha() {
  selectedEngine = selectCaptchaEngine();
  let container = $('#captcha-container');
  if (selectedEngine) {
    $('#post-form [name="captchaEngine"]').val(selectedEngine.id);
    let data = Tools.captchaEngine(selectedEngine.id);
    if (selectedEngine.widgetHtml) {
      container.html(selectedEngine.widgetHtml);
    } else if (selectedEngine.widgetTemplate) {
      container.html(Templating.template(selectedEngine.widgetTemplate, data, true));
    }
    if (typeof selectedEngine.initialize === 'function') {
      selectedEngine.initialize(data);
    }
  }
  try {
    let quota = await getQuota();
    if (quota > 0) {
      $('#no-captcha').show();
      $('#captcha-quota').text(quota);
      container.hide();
    }
    if (typeof window.lord.emit === 'function') {
      window.lord.emit('captchaReset', quota);
    }
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function resetCaptcha() {
  let container = $('#captcha-container');
  try {
    let quota = await getQuota();
    if (quota > 0) {
      $('#no-captcha').show();
      $('#captcha-quota').text(quota);
      container.hide();
    } else {
      $('#no-captcha').hide();
      container.show();
      if (selectedEngine && typeof selectedEngine.reload === 'function') {
        selectedEngine.reload(Tools.captchaEngine(selectedEngine.id));
      }
    }
    if (typeof window.lord.emit === 'function') {
      window.lord.emit('captchaReset', quota);
    }
  } catch (err) {
    DOM.handleError(err);
  }
}

export function initialize() {
  Settings.captchaEngine.subscribe(createCaptcha);
}
