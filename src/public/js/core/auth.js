import URI from 'urijs';
import VK from 'vk-openapi';

import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Navigation from '../helpers/navigation';
import * as Storage from '../helpers/storage';
import * as Tools from '../helpers/tools';

const DEFAULT_VK_LOGIN_TIMEOUT = 5 * Constants.SECOND;
const DEFAULT_VK_LOGOUT_TIMEOUT = 5 * Constants.SECOND;

function vkLogin(timeout) {
  initializeVK();
  timeout = Tools.option(timeout, 'number', DEFAULT_VK_LOGIN_TIMEOUT, { test: (t) => { t > 0; } });
  return new Promise((resolve, reject) => {
    setTimeout(reject.bind(null, Tools.translate('Vkontakte login timeout')), timeout);
    let result = VK.Auth.login((response) => {
      if (!response || !response.session) {
        return reject(Tools.translate('Vkontakte login error'));
      }
      resolve(response.session);
    }, VK.access.AUDIO);
    if (!result) {
      reject(Tools.translate('Vkontakte is not initialized'));
    }
  });
}

function vkLogout(timeout) {
  timeout = Tools.option(timeout, 'number', DEFAULT_VK_LOGOUT_TIMEOUT, { test: (t) => { t > 0; } });
  return new Promise((resolve, reject) => {
    setTimeout(reject.bind(null, Tools.translate('Vkontakte logout timeout')), timeout);
    VK.Auth.logout(resolve);
  });
}

export async function login(hashpass, vk) {
  try {
    let vkSession = null;
    if (vk) {
      vkSession = await vkLogin();
    }
    let realHashpass = !!hashpass;
    if (!hashpass && vkSession) {
      hashpass = vkSession.sid;
    }
    if (!hashpass) {
      return;
    }
    Storage.hashpass(hashpass, (vkSession && !realHashpass) ? vkSession.expire : Constants.BILLION)
    if (vkSession) {
      Storage.vkAuth(vkSession.expire);
    }
    Storage.removeLocalObject('levels');
    Storage.removeLocalObject('lastChatCheckDate');
    let href = `/${Tools.sitePathPrefix()}redirect?source=${URI(window.location.href).search(true).source}`;
    await Navigation.setPage(href, { ajax: false });
  } catch (err) {
    DOM.handleError(err);
  }
};

export async function logout() {
  try {
    if (Storage.vkAuth() === 'true') {
      try {
        await vkLogout();
      } catch (err) {
        DOM.handleError(err);
      }
      Storage.deleteCookie('vkAuth', '/');
    }
    Storage.hashpass('', -1);
    Storage.removeLocalObject('levels');
    Storage.removeLocalObject('lastChatCheckDate');
    await Navigation.setPage(`/${Tools.sitePathPrefix()}redirect?source=${window.location.pathname}`, { ajax: false });
  } catch (err) {
    DOM.handleError(err);
  }
}

let vkInitialized = false;

export function initializeVK() {
  if (vkInitialized) {
    return;
  }
  VK.init({ apiId: Tools.vkAppID() });
  vkInitialized = true;
}
