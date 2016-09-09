import _ from 'underscore';
import KO from 'knockout';

import * as Storage from './storage';
import * as Tools from './tools';

export const DEFAULT_DRAWING_BACKGROUND_COLOR = 'rgba(255, 255, 255, 1)';

let prevent = false;

export const DEFAULT_SETTINGS = {
  deviceType: 'auto',
  time: 'server',
  timeZoneOffset: -(new Date()).getTimezoneOffset(),
  shrinkPosts: true,
  useWebSockets: true,
  markupMode: 'EXTENDED_WAKABA_MARK,BB_CODE',
  navbarMode: 'sidebar',
  stickyToolbar: true,
  maxAllowedRating: 'R-18G',
  hidePostFormMarkup: false,
  hidePostFormRules: false,
  hiddenBoards: [],
  hiddenBoardGroups: [],
  autoUpdateThreadsByDefault: false,
  autoUpdateInterval: 15,
  showAutoUpdateDesktopNotifications: true,
  playAutoUpdateSound: false,
  soundNotificationsVolume: 100,
  addExpander: true,
  signOPPostLinks: true,
  signOwnPostLinks: true,
  showLeafButtons: true,
  leafThroughImagesOnly: false,
  imageZoomSensitivity: 25,
  defaultAudioVideoVolume: 100,
  rememberAudioVideoVolume: true,
  playAudioVideoImmediately: true,
  loopAudioVideo: true,
  quickReplyAction: 'append_post',
  moveToPostOnReplyInThread: false,
  checkFileExistence: true,
  showAttachedFilePreview: true,
  addToFavoritesOnReply: false,
  stripExifFromJpeg: true,
  hideTripcodes: false,
  hideUserNames: false,
  strikeOutHiddenPostLinks: true,
  spellsEnabled: true,
  ihashDistance: 15,
  showNewPosts: true,
  hotkeysEnabled: true,
  userCSSEnabled: true,
  userJavaScriptEnabled: true,
  sourceHighlightingEnabled: false,
  chatEnabled: true,
  drawingBackgroundDrawable: true,
  drawingBackgroundColor: DEFAULT_DRAWING_BACKGROUND_COLOR,
  drawingBackgroundWidth: 0,
  drawingBackgroundHeight: 0,
  resetFileScaleOnOpening: true,
  closeFilesByClickingOnly: false,
  viewPostPreviewDelay: 200,
  hidePostPreviewDelay: 1000,
  infiniteScroll: () => { return Tools.deviceType('mobile'); },
  bannerMode: 'random',
  captchaEngine: 'node-captcha',
  style: 'photon',
  codeStyle: 'default',
  mumWatching: false,
  ajaxNavigation: false
};

function getDefaultValue(key) {
  let val = DEFAULT_SETTINGS[key];
  return (typeof val === 'function') ? val() : val;
}

export function initialize() {
  let settings = Storage.getLocalObject('settings', {});
  _(DEFAULT_SETTINGS).each((_, key) => {
    let value = settings[key];
    let o = KO.observable((typeof value !== 'undefined') ? value : getDefaultValue(key));
    o.subscribe((value) => {
      if (prevent) {
        return;
      }
      let settings = Storage.getLocalObject('settings', {});
      settings[key] = value;
      Storage.setLocalObject('settings', settings);
    });
    module.exports[key] = o;
  });
}

export function getAll() {
  return _(DEFAULT_SETTINGS).reduce((acc, _, key) => {
    acc[key] = module.exports[key]();
    return acc;
  }, {});
}

export function setAll(o) {
  return _(DEFAULT_SETTINGS).each((_, key) => {
    if (!o.hasOwnProperty(key)) {
      return;
    }
    module.exports[key](o[key]);
  });
}

export const SYNCHRONIZABLE_DATA = {
  userCss: {
    custom: true,
    get: ''
  },
  userJavaScript: {
    custom: true,
    get: ''
  },
  password: { password: true },
  favoriteThreads: { set: true },
  ownPosts: { set: true },
  spells: { get: '' },
  hotkeys: { get: {} },
  hiddenPosts: { get: {} },
  similarText: { get: {} },
  lastCodeLang: { get: '' },
  chats: {
    set: (src, key, value) => {
      if (!src.hasOwnProperty(key)) {
        return src[key] = value;
      }
      var newMessages = [];
      src[key].forEach((message) => {
        value.some((msg) => {
          if (message.type === msg.type && message.date === msg.date && message.text === msg.text) {
            return true;
          }
          newMessages.push(msg);
        })
      });
      src[key] = src[key].concat(newMessages).sort(function(m1, m2) {
        if (m1.date < m2.date) {
          return -1;
        } else if (m1.date > m2.date) {
          return 1;
        } else {
          return 0;
        }
      });
    }
  },
  drafts: { set: true },
  playerTracks: { get: [] },
  lastChatCheckDate: { get: null },
  audioVideoVolume: { get: 1 },
  lastPostNumbers: {},
  showTripcode: {}
};

export function localData({ includeSettings, includeCustom, includePassword } = {}) {
  let o = {};
  if (includeSettings) {
    o.settings = getAll();
  }
  var f = function(key, def) {
    if (typeof def === 'undefined') {
      def = {};
    }
    o[key] = Storage.getLocalObject(key, def);
  };
  _(SYNCHRONIZABLE_DATA).each((options, key) => {
    if (options.custom && !includeCustom) {
      return;
    }
    if (options.password && !includePassword) {
      return;
    }
    f(key, options.get);
  });
  return o;
}

export function setLocalData(o, { includeSettings, includeCustom, includePassword } = {}) {
  if (includeSettings && o.settings) {
    setAll(o.settings);
  }
  var f = function(key, doMerge) {
    var val = o[key];
    if (typeof val === 'undefined')
      return;
    if (!doMerge)
      return Storage.setLocalObject(key, val);
    var src = Storage.getLocalObject(key, {});
    _(val).each(function(v, k) {
      if (typeof doMerge === 'function')
        doMerge(src, k, v);
      else
        src[k] = v;
    });
    Storage.setLocalObject(key, src);
  };
  _(SYNCHRONIZABLE_DATA).each((options, key) => {
    if (options.custom && !includeCustom) {
      return;
    }
    if (options.password && !includePassword) {
      return;
    }
    f(key, options.set);
  });
}

Storage.on('settings', (settings) => {
  prevent = true;
  _(DEFAULT_SETTINGS).each((defValue, key) => {
    let value = settings[key];
    value = (typeof value !== 'undefined') ? value : ((typeof defValue === 'function') ? defValue() : defValue);
    module.exports[key](value);
  });
  prevent = false;
});
