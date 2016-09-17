import _ from 'underscore';
import KO from 'knockout';

import * as Constants from './constants';
import * as Tools from './tools';

const DEFAULT_SPELLS = '#wipe(samelines,samewords,longwords,symbols,capslock,numbers,whitespace)';
const DEFAULT_LAST_CODE_LANG = '-';
const SCRIPT_VERSION = '2.0.0';

export const DEFAULT_HOTKEYS = _({
  previousPageImage: 'ctrl+left',
  nextPageImage: 'ctrl+right',
  previousThreadPost: 'ctrl+up',
  nextThreadPost: 'ctrl+down',
  previousPost: 'ctrl+shift+up',
  nextPost: 'ctrl+shift+down',
  hidePost: 'h',
  goToThread: 'v',
  expandThread: 'e',
  expandImage: 'i',
  quickReply: 'r',
  submitReply: 'alt+enter',
  showFavorites: 'alt+f',
  showSettings: 'alt+t',
  updateThread: 'u',
  markupBold: 'alt+b',
  markupItalics: 'alt+i',
  markupStrikedOut: 'alt+s',
  markupUnderlined: 'alt+u',
  markupSpoiler: 'alt+p',
  markupQuotation: 'alt+q',
  markupCode: 'alt+c'
}).map((shortcut, action) => {
  return {
    action: action,
    shortcut: shortcut
  };
});

let storageHandlers = new Map();

export function storageHandler(e) {
  let handler = storageHandlers.get(e.key);
  if (typeof handler !== 'object') {
    return;
  }
  try {
    var newValue = (null !== e.newValue) ? JSON.parse(e.newValue) : Tools.cloned(handler.defValue);
    var oldValue = (null !== e.oldValue) ? JSON.parse(e.oldValue) : Tools.cloned(handler.defValue);
  } catch (err) {
    console.log(err);
    var newValue = Tools.cloned(handler.defValue);
    var oldValue = Tools.cloned(handler.defValue);
  }
  handler.handler(newValue, oldValue);
}

export function on(key, handler, defValue) {
  if (typeof key !== 'string' || !key || typeof handler !== 'function') {
    return;
  }
  storageHandlers.set(key, {
    handler: handler,
    defValue: defValue
  });
}

export function off(key, handler) {
  if (typeof key !== 'string' || !key || typeof handler !== 'function' || !storageHandlers.has(key)) {
    return;
  }
  storageHandlers.delete(key);
}

export let getCookie = function(name, defValue) {
  var pattern = '(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)';
  var matches = window.document.cookie.match(new RegExp(pattern));
  return matches ? decodeURIComponent(matches[1]) : Tools.cloned(defValue);
};

export function setCookie(name, value, options) {
  options = options || {};
  var expires = options.expires;
  if (typeof expires === 'number' && expires) {
    var d = new Date();
    d.setTime(d.getTime() + expires * 1000);
    expires = options.expires = d;
  }
  if (expires && expires.toUTCString) {
    options.expires = expires.toUTCString();
  }
  value = encodeURIComponent(value);
  var updatedCookie = name + '=' + value;
  for (var propName in options) {
    updatedCookie += '; ' + propName;
    var propValue = options[propName];
    if (propValue !== true) {
      updatedCookie += '=' + propValue;
    }
  }
  window.document.cookie = updatedCookie;
}

export function deleteCookie(name, path) {
  setCookie(name, '', {
    expires: -1,
    path: path
  });
}

function getObject(storage, key, defValue) {
  if (!key || typeof key !== 'string') {
    return null;
  }
  try {
    let val = storage.getItem(key);
    return (null !== val) ? JSON.parse(val) : Tools.cloned(defValue);
  } catch (err) {
    console.log(err);
    return Tools.cloned(defValue);
  }
}

function setObject(storage, key, value) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  try {
    if (null !== value && typeof value !== 'undefined') {
      storage.setItem(key, JSON.stringify(value));
    } else {
      storage.setItem(key, null);
    }
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

function removeObject(storage, key) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  try {
    return storage.removeItem(key);
  } catch (err) {
    console.log(err);
    return false;
  }
}

export let getLocalObject = getObject.bind(null, window.localStorage);
export let setLocalObject = setObject.bind(null, window.localStorage);
export let removeLocalObject = removeObject.bind(null, window.localStorage);

export let getSessionObject = getObject.bind(null, window.sessionStorage);
export let setSessionObject = setObject.bind(null, window.sessionStorage);
export let removeSessionObject = removeObject.bind(null, window.sessionStorage);

function createDataFunction(key, def, { readonly, convertSet, convertGet, storage, correct } = {}) {
  if (typeof storage === 'undefined') {
    storage = window.localStorage;
  }
  let get = getObject.bind(null, storage);
  let set = setObject.bind(null, storage);
  return (data) => {
    if (!readonly && typeof data !== 'undefined') {
      if (typeof convertSet === 'function') {
        data = convertSet(data);
        if (typeof data === 'undefined') {
          return false;
        }
      }
      return set(key, data);
    } else {
      data = get(key, def);
      if (typeof convertGet === 'function') {
        data = convertGet(data);
        if (typeof correct !== 'boolean' || correct) {
          set(key, data);
        }
      }
      return data;
    }
  };
}

function createObservable(storageKey, defValue) {
  let o = KO.observable(getLocalObject(storageKey, defValue));
  let prevent = false;
  o.subscribe((value) => {
    if (prevent) {
      return;
    }
    setLocalObject(storageKey, value);
  });
  on(storageKey, (newValue) => {
    prevent = true;
    o(newValue);
    prevent = false;
  });
  return o;
}

function convertDate(date) {
  if (_(date).isDate()) {
    return date.toISOString();
  } else if (typeof date !== 'string') {
    return null;
  } else {
    return date;
  }
}

function convertObject(o) {
  return (typeof o === 'object') ? o : {};
}

function convertArray(arr) {
  return _(arr).isArray() ? arr : [];
}

function convertBoolean(b) {
  return !!b;
}

function convertString(s) {
  return '' + s;
}

function convertNumber(data) {
  data = +data;
  if (isNaN(data) || data < 0) {
    return;
  }
  return data;
}

export let sidebarVisible = createDataFunction('sidebarVisible', true, { convertSet: convertBoolean });
export let playerPlaying = createDataFunction('playerPlaying', false, {
  convertSet: convertBoolean,
  storage: window.sessionStorage
});
export let playerMustReorder = createDataFunction('playerMustReorder', false, {
  convertSet: (r) => {
    return Tools.testUUID(r) || (typeof r === 'boolean' && !r);
  }
});
export let sageEnabled = createDataFunction('sageEnabled', false, { convertSet: convertBoolean });
export let showTripcode = createDataFunction('showTripcode', false, { convertSet: convertBoolean });
export let postFormFloating = createDataFunction('postFormFloating', false, { convertSet: convertBoolean });
export let postFormFixed = createDataFunction('postFormFixed', true, { convertSet: convertBoolean });

export let lastChatCheckDate = createDataFunction('lastChatCheckDate', null, { convertSet: convertDate });

export let lastCodeLang = createDataFunction('lastCodeLang', DEFAULT_LAST_CODE_LANG, { convertSet: convertString });

export let frequentlyUsedFiles = createDataFunction('frequentlyUsedFiles', {}, { convertSet: convertObject });
export let similarText = createDataFunction('similarText', {}, { convertSet: convertObject });
export let playerLastTrack = createDataFunction('playerLastTrack', {}, { convertSet: convertObject });
export let lastPostNumbers = createDataFunction('lastPostNumbers', {}, { convertSet: convertObject });

export let playerTracks = createDataFunction('playerTracks', [], { convertSet: convertArray });

export let playerCurrentTime = createDataFunction('playerCurrentTime', 0, {
  convertSet: convertNumber,
  storage: window.sessionStorage
});

if (typeof getLocalObject('password') !== 'string') {
  setLocalObject('password', Tools.generatePassword());
}
export let password = createObservable('password', '');
export let hotkeys = createObservable('hotkeys', DEFAULT_HOTKEYS);
export let chats = createObservable('chats', {});
export let spells = createObservable('spells', DEFAULT_SPELLS);
export let userCSS = createObservable('userCSS', '');
export let userJavaScript = createObservable('userJavaScript', '');
export let synchronizeSettings = createObservable('synchronization/settings', true);
export let synchronizeCSSAndJS = createObservable('synchronization/cssAndJS', true);
export let synchronizePassword = createObservable('synchronization/password', true);
export let favoriteThreads = createObservable('favoriteThreads', {});
export let hiddenPosts = createObservable('hiddenPosts', {});
export let ownPosts = createObservable('ownPosts', {});
export let draftsVisible = createObservable('draftsVisible', false);
export let drafts = createObservable('drafts', {});

export function hashpass(hp, expires) {
  if (-1 === expires) {
    deleteCookie('hashpass', '/');
  }
  else if (typeof hp !== 'undefined') {
    if (!Tools.testHashpass(hp)) {
      hp = Tools.sha1(hp);
    }
    return setCookie('hashpass', hp, {
      expires: expires || Constants.BILLION,
      path: '/'
    });
  } else {
    return getCookie('hashpass', '');
  }
}

export function autoUpdateEnabled(boardName, threadNumber, enabled) {
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !threadNumber) {
    return;
  }
  let key = `${boardName}/${threadNumber}`;
  if (typeof enabled !== 'undefined') {
    let o = getLocalObject('autoUpdate', {});
    if (enabled) {
      o[key] = 1;
    } else if (o.hasOwnProperty(key)) {
      delete o[key];
    }
    return setLocalObject('autoUpdate', o);
  } else {
    return !!getLocalObject('autoUpdate', {})[key];
  }
}

export function lastWidgetGeometry(id, geometry) {
  if (!id) {
    return;
  }
  if (typeof geometry !== 'undefined') {
    let o = getLocalObject('lastWidgetGeometry', {});
    o[id] = geometry;
    return setLocalObject('lastWidgetGeometry', o);
  } else {
    return getLocalObject('lastWidgetGeometry', {})[id];
  }
}

export function vkAuth(expires) {
  if (typeof expires !== 'undefined') {
    return setCookie('vkAuth', (expires > 0) ? 'true' : '', {
      expires: expires,
      path: '/'
    });
  } else {
    return getCookie('vkAuth', 'false') === 'true';
  }
}

export const V1_TO_V2_SETTINGS = {
  deviceType: true,
  time: true,
  timeZoneOffset: true,
  shrinkPosts: true,
  useWebSockets: true,
  markupMode: true,
  hidePostFormMarkup: true,
  hidePostFormRules: true,
  hiddenBoards: true,
  maxAllowedRating: true,
  autoUpdateThreadsByDefault: true,
  autoUpdateInterval: true,
  showAutoUpdateDesktopNotifications: true,
  playAutoUpdateSound: true,
  soundNotificationsVolume: true,
  addExpander: true,
  signOpPostLinks: 'signOPPostLinks',
  signOwnPostLinks: true,
  showLeafButtons: true,
  leafThroughImagesOnly: true,
  imageZoomSensitivity: true,
  defaultAudioVideoVolume: true,
  rememberAudioVideoVolume: true,
  playAudioVideoImmediately: true,
  loopAudioVideo: true,
  quickReplyAction: true,
  moveToPostOnReplyInThread: true,
  checkFileExistence: true,
  showAttachedFilePreview: true,
  addToFavoritesOnReply: true,
  stripExifFromJpeg: true,
  hideTripcodes: true,
  hideUserNames: true,
  strikeOutHiddenPostLinks: true,
  spellsEnabled: true,
  ihashDistance: true,
  showNewPosts: true,
  hotkeysEnabled: true,
  userCssEnabled: 'userCSSEnabled',
  userJavaScriptEnabled: true,
  sourceHighlightingEnabled: true,
  chatEnabled: true,
  backgroundDrawable: 'drawingBackgroundDrawable',
  drawingBackgroundColor: true,
  drawingBackgroundWidth: true,
  drawingBackgroundHeight: true,
  resetFileScaleOnOpening: true,
  closeFilesByClickingOnly: true,
  viewPostPreviewDelay: true,
  hidePostPreviewDelay: true,
  infiniteScroll: true,
  bannersMode: 'bannerMode',
  captchaEngine: true,
  style: true,
  codeStyle: true,
  mumWatching: true
};

export const V1_TO_V2_OTHER = {
  audioVideoVolume: true,
  chats: true,
  draftsVisible: true,
  frequentlyUsedFiles: true,
  lastPostNumbers: true,
  levels: true,
  ownPosts: true,
  password: true,
  spells: true,
  userCss: 'userCSS',
  userJavaScript: true
};

function v1ToV2() {
  let settings = _(V1_TO_V2_SETTINGS).reduce((acc, newKey, key) => {
    if (typeof newKey !== 'string') {
      newKey = key;
    }
    let value = getLocalObject(key);
    if (typeof value !== 'undefined') {
      acc[newKey] = value;
    }
    return acc;
  }, {});
  setLocalObject('settings', settings);
  _(V1_TO_V2_SETTINGS).each((newKey, key) => {
    if (typeof newKey !== 'string') {
      newKey = key;
    }
    let value = getLocalObject(key);
    if (typeof value !== 'undefined') {
      setLocalObject(newKey, value);
    }
  });
  localStorage.clear();
}

export function initialize() {
  let version = getLocalObject('scriptVersion');
  if (!version) {
    v1ToV2();
  }
  setLocalObject('scriptVersion', SCRIPT_VERSION);
}
