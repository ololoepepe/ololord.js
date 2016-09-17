import _ from 'underscore';
import $ from 'jquery';
import merge from 'merge';
import moment from 'moment/min/moment-with-locales';

import * as AJAX from './ajax';
import * as Constants from './constants';
import * as Settings from './settings';
import * as Storage from './storage';
import * as Tools from './tools';
import PopupMessage from '../widgets/popup-message';

const NOTIFICATION_QUEUE_CHECK_INTERVAL = 10 * Constants.SECOND;

let dialogs = [];
let sounds = {};
let unloading = false;

export function setUnloading() {
  unloading = true;
}

export let handleError = function(error) {
  console.log(error);
  if (unloading) {
    return;
  }
  var text;
  if (error) {
    if (error.hasOwnProperty('message')) {
      text = `${Tools.translate('Error')}: ${error.message}`;
    } else if (error.hasOwnProperty('ban')) {
      text = `${Tools.translate('You are banned', 'bannedText')}.`;
      if (error.ban.reason) {
        text += ` ${Tools.translate('Reason:', 'banReasonLabelText')} ${error.ban.reason}.`;
      }
      text += ` ${Tools.translate('Expires:', 'banExpiresLabelText')} `;
      if (error.ban.expiresAt) {
        text += Tools.formattedDate(error.ban.expiresAt);
      } else {
        text += Tools.translate('never', 'banExpiresNeverText');
      }
    } else if (error.hasOwnProperty('readyState')) {
      switch (error.status) {
      case 400:
        text = Tools.translate('Bad Request');
        break;
      case 404:
        text = Tools.translate('Not Found');
        break;
      case 408:
        text = Tools.translate('Request Timeout');
        break;
      case 413:
        text = Tools.translate('Request Entity Too Large');
        break;
      case 429:
        text = Tools.translate('Temporarily banned (DDoS detected)');
        break;
      case 500:
        text = Tools.translate('Internal Server Error');
        break;
      case 502:
        text = Tools.translate('Bad Gateway');
        break;
      case 503:
        text = Tools.translate('Service Unavailable');
        break;
      case 504:
        text = Tools.translate('Gateway Timeout');
        break;
      case 520:
        text = Tools.translate('Web server is returning an unknown error (CloudFlare)');
        break;
      case 521:
        text = Tools.translate('Web server is down (CloudFlare)');
        break;
      case 522:
        text = Tools.translate('Connection timed out (CloudFlare)');
        break;
      case 523:
        text = Tools.translate('Origin is unreachable (CloudFlare)');
        break;
      case 524:
        text = Tools.translate('A timeout occured (CloudFlare)');
        break;
      case 525:
        text = Tools.translate('SSL handshake failed (CloudFlare)');
        break;
      case 526:
        text = Tools.translate('Invalid SSL certificate (CloudFlare)');
        break;
      default:
        if (0 === error.readyState)
          text = Tools.translate('No connection with server', 'error0Text');
          break;
        }
    } else {
      text = error;
    }
  } else {
    text = Tools.translate('Unknown error', 'errorUnknownText');
  }
  PopupMessage.showPopup(text, { type: 'critical' });
};

export let node = function(type, text) {
  if (typeof type != 'string') {
      return null;
  }
  type = type.toUpperCase();
  return ('TEXT' == type) ? window.document.createTextNode(text ? text : '') : window.document.createElement(type);
};

export let id = function(id) {
  return (typeof id === 'string' || typeof id === 'number') ? document.getElementById(id) : null;
};

let xxx = 1;

export let queryAll = function(query, parent) {
  if (typeof query !== 'string') {
    return null;
  }
  parent = parent || window.document;
  let elements = parent.querySelectorAll(query);
  let list = [];
  if (!elements) {
    return list;
  }
  for (let el of elements) {
    list.push(el);
  }
  return list;
};

export let queryOne = function(query, parent) {
  if (typeof query !== 'string') {
    return null;
  }
  return (parent || window.document).querySelector(query);
};

export function nameAll(name, parent) {
    return queryAll('[name="' + name + '"]', parent);
}

export function nameOne(name, parent) {
    return queryOne('[name="' + name + '"]', parent);
}

export function hash(h) {
  if (typeof h === 'undefined') {
    return window.location.hash.substr(1, window.location.hash.length - 1);
  }
  h = '' + h;
  if (!h && !hash()) {
    return;
  }
  window.location.hash = '';
  window.location.hash = h;
}

export let data = function(key, el, bubble) {
  if (_(key).isArray()) {
    return key.reduce((acc, k) => {
      acc[k] = data(k, el, bubble);
      return acc;
    }, {});
  } else {
    el = el || window.document.body;
    while (el && el.dataset) {
      if (key in el.dataset) {
        return el.dataset[key];
      }
      el = bubble ? el.parentNode : undefined;
    }
    return undefined;
  }
};

export function createDocumentFragment(html) {
  var temp = window.document.createElement('div');
  temp.innerHTML = html;
  if (typeof window.document.createDocumentFragment !== 'function') {
    return Promise.resolve(temp);
  }
  var frag = window.document.createDocumentFragment();
  return new Promise(function(resolve) {
    var f = function() {
      if (!temp.firstChild) {
        return resolve(frag);
      }
      frag.appendChild(temp.firstChild);
      setTimeout(f, 0);
    };
    f();
  });
}

export function createStylesheetLink(href, { prefix, id, replace } = {}) {
  prefix = prefix ? `/${Tools.sitePathPrefix()}css/` : '';
  if (replace && !id) {
    id = $(replace).attr('id');
  }
  let link = $(`<link ${id ? ('id="' + id + '" ') : ''}rel='stylesheet' type='text/css' href='${prefix}${href}'>`);
  if (replace && $(replace)[0]) {
    $(replace).replaceWith(link);
  } else {
    $(window.document.head).append(link);
  }
  return link[0];
}

export function createStylesheet(css, { id, replace, type } = {}) {
  let style = node('style');
  if (replace && !id) {
    id = $(replace).attr('id');
  }
  if (id) {
    style.id = id;
  }
  style.type = type || 'text/css';
  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(node('text', css));
  }
  if (replace && $(replace)[0]) {
    $(replace).replaceWith(style);
  } else {
    $(window.document.head).append(style);
  }
  return style;
}

export function createScript(src, { prefix, id, replace, onload }) {
  prefix = prefix ? `/${Tools.sitePathPrefix()}js/` : '';
  if (replace && !id) {
    id = $(replace).attr('id');
  }
  let script = node('script');
  if (id) {
    script.id = id;
  }
  script.type = 'text/javascript';
  if (typeof onload === 'function') {
    script.onload = onload;
  }
  if (replace && $(replace)[0]) {
    $(replace).replaceWith(script);
  } else {
    $(window.document.head).append(script);
  }
  script.src = `${prefix}${src}`;
  return script;
}

export let showNotification = function(title, body, icon) {
  if (!('Notification' in window)) {
    return;
  }
  Notification.requestPermission((permission) => {
    if (permission !== 'granted') {
      return;
    }
    new Notification(title, {
      body: body,
      icon: icon
    });
  });
};

export let scrollHandler = function() {
  var content = id('content');
  var k = 1300;
  var top = ((window.innerHeight + window.scrollY + k) >= content.scrollHeight);
  var bottom = (window.scrollY <= k);
  var nbTop = queryOne('.navigation-button-top');
  if (nbTop) {
    nbTop.style.display = bottom ? 'none' : '';
  }
  var nbBottom = queryOne('.navigation-button-bottom');
  if (nbBottom) {
    nbBottom.style.display = top ? 'none' : '';
  }
};

export function detectSwipe(el, callback) {
  if (typeof callback !== 'function') {
    return;
  }
  (function() {
    var touches = {};
    if (typeof el === 'string') {
      el = queryOne(el);
    } else if (el.selector) {
      el = el[0];
    } else if (typeof el !== 'object') {
      return;
    }
    el.addEventListener('touchstart', function(e) {
      _(e.changedTouches).toArray().forEach(function(t) {
        if (!touches[t.identifier]) {
          touches[t.identifier] = {
            touchstartX: t.pageX,
            touchstartY: t.pageY,
            touchendX: t.pageX,
            touchendY: t.pageY
          };
        }
      });
    }, false);
    el.addEventListener('touchend', function(e) {
      _(e.changedTouches).toArray().forEach(function(t) {
        if (!touches[t.identifier]) {
          return;
        }
        var tt = touches[t.identifier];
        tt.touchendX = t.pageX;
        tt.touchendY = t.pageY;
        var types = [];
        if (tt.touchendX < tt.touchstartX) {
          types.push('swipeleft');
        }
        if (tt.touchendX > tt.touchstartX) {
          types.push('swiperight');
        }
        if (tt.touchendY > tt.touchstartY) {
          types.push('swipedown');
        }
        if (tt.touchendY < tt.touchstartY) {
          types.push('swipeup');
        }
        if (tt.touchendX == tt.touchstartX && tt.touchendY == tt.touchstartY) {
          types.push('tap');
        }
        callback({
          startX: tt.touchstartX,
          startY: tt.touchstartY,
          endX: tt.touchendX,
          endY: tt.touchendY,
          distanceX: tt.touchendX - tt.touchstartX,
          distanceY: tt.touchendY - tt.touchstartY,
          types: types
        });
        delete touches[t.identifier];
      });
    }, false);
  })();
}

const SOUND_TYPES = new Set(['signal', 'message']);

export function playSound(type) {
  type = type || 'signal';
  if (!SOUND_TYPES.has(type)) {
    return;
  }
  let sound = sounds[type];
  if (!sound) {
    sound = $(`<audio><source type='audio/mp3' src='/${Tools.sitePathPrefix()}audio/${type}.mp3' /></audio>`)[0];
    sound.volume = Settings.soundNotificationsVolume() / 100;
    sounds[type] = sound;
  }
  sound.play();
}

export function traverseChildren(elem) {
  var children = [];
  var q = [];
  q.push(elem);
  function pushAll(elemArray) {
    for (var i = 0; i < elemArray.length; ++i) {
      q.push(elemArray[i]);
    }
  }
  while (q.length > 0) {
    var elem = q.pop();
    children.push(elem);
    pushAll(elem.children);
  }
  return children;
}

const TOOLTIP_WIDTH = 200;
const TOOLTIP_MARGIN_TOP = 15;
const TOOLTIP_OFFSET_LEFT = 8;
const TOOLTIP_DEFAULT_TIMEOUT = 15 * Constants.SECOND;

export function setTooltip(where, { what, position, show, keep, timeout } = {}) {
  where = $(where);
  keep = keep || !show;
  where.css('cursor', 'pointer');
  if (what) {
    where.prop('title', what);
  }
  if (where.data('tooltipInitialized')) {
    return;
  }
  where.data('tooltipInitialized', true);
  timeout = +timeout;
  if (isNaN(timeout) || timeout <= 0) {
    timeout = TOOLTIP_DEFAULT_TIMEOUT;
  }
  where.tooltip({
    open: function(e, ui) {
      let pos = {
        left: e.pageX,
        top: e.pageY
      };
      let maxLeft = Math.floor(pos.left - (TOOLTIP_WIDTH / 2));
      let left = Math.max(maxLeft, TOOLTIP_OFFSET_LEFT);
      let dx = $(window).width() - (left + TOOLTIP_WIDTH);
      if (dx < 0) {
        left = left + Math.abs(dx);
      }
      let top = Math.floor(pos.top + TOOLTIP_MARGIN_TOP);
      $(ui.tooltip).css({
        position: position || 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${TOOLTIP_WIDTH}px`
      });
      if (!keep) {
        setTimeout(() => {
          if (!where.data('tooltipInitialized')) {
            return;
          }
          where.tooltip('destroy');
          where.data('tooltipInitialized', false);
        }, timeout);
      }
    },
    close: function() {
      if (!keep && where.data('tooltipInitialized')) {
        where.tooltip('destroy');
        where.data('tooltipInitialized', false);
      }
    }
  });
  if (show) {
    where.tooltip('open');
  }
}

export function removeTooltip(where) {
  where = $(where);
  where.css('cursor', '');
  if (!where.data('tooltipInitialized')) {
    return;
  }
  where.tooltip('destroy');
  where.data('tooltipInitialized', false);
}

let notificationQueue = [];

export function pushNotification(notification) {
  if (!_(notification).isArray()) {
    notification = [notification];
  }
  notificationQueue.push(...notification);
}

export async function checkNotificationQueue() {
  let f = () => {
    setTimeout(function() {
      checkNotificationQueue();
    }, NOTIFICATION_QUEUE_CHECK_INTERVAL);
  };
  if (notificationQueue.length <= 0) {
    return f();
  }
  let notification = notificationQueue.shift();
  notification = _(notificationQueue.reverse()).find((ntf) => {
    return notification.key === ntf.key;
  }) || notification;
  notificationQueue = notificationQueue.reverse().filter((ntf) => { return notification.key !== ntf.key; });
  try {
    let post = await AJAX.api('post', {
      boardName: notification.boardName,
      postNumber: notification.postNumber
    });
    let icon = `/${Tools.sitePathPrefix()}`;
    if (post && post.fileInfos && post.fileInfos.length > 0) {
      icon += `${notification.boardName}/thumb/${post.fileInfos[0].thumb.name}`;
    } else {
      icon += 'favicon.ico';
    }
    let text = `[${notification.boardName}/${notification.threadNumber}]`;
    if (post && post.subject || post.rawText) {
      text += ` ${post.subject || post.rawText}`;
    }
    showNotification('Favorite threads', text.substr(0, Constants.MAX_THREAD_TEXT_LENGTH), icon);
    f();
  } catch (err) {
    handleError(err);
    f();
  }
}

export function processFormattedDate(parent, force) {
  parent = parent || window.document.body;
  let query = '.js-date-time';
  if (!force) {
    query += ':not(.js-processed-date-time)';
  }
  queryAll(query, parent).forEach((time) => {
    let date = data('dateTime', time);
    if (!date) {
      return;
    }
    $(time).empty().text(Tools.formattedDate(date)).addClass('js-processed-date-time');
  });
}

export function activateTab(parent, index) {
  index = +index;
  if (!parent || isNaN(index)) {
    return;
  }
  parent = $(parent);
  let header = parent.find('.js-tab-widget-header');
  let body = parent.find('.js-tab-widget-body');
  body.children().hide();
  header.children().removeClass('tab-widget-header-activated');
  header.find(`[data-index='${index}']`).addClass('tab-widget-header-activated');
  body.find(`[data-index='${index}']`).show();
}

let previousDeviceType = '';

export function resetDeviceType() {
  let type = Tools.deviceType();
  if (type === previousDeviceType) {
    return;
  }
  createStylesheetLink(`base-${type}.css`, {
    prefix: true,
    replace: '#stylesheet-base'
  });
  createStylesheetLink(`custom-base-${type}.css`, {
    prefix: true,
    replace: '#stylesheet-custom-base'
  });
  if ('mobile' === type) {
    $(window.document.head).append($('<meta id="meta-scaling" name="viewport" '
      + 'content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />'));
  } else {
    $('#meta-scaling').remove();
  }
  previousDeviceType = type;
}

export function createLoadingMessage(txt) {
  txt = txt || Tools.translate('Loading…');
  let spinnerHTML = '<span class="icon-24 icon-spinner"></span>';
  return $(`<div class='loading-message'>${spinnerHTML}<h1 class='loading-message-text'>${txt}</h1></div>`);
}
