import 'babel-polyfill';
import _ from 'underscore';
import $ from 'jquery';
import { EventEmitter } from 'events';
import KO from 'knockout';
import Mousetrap from 'mousetrap';

import * as Constants from './helpers/constants';
import * as DOM from './helpers/dom';
import * as Navigation from './helpers/navigation';
import * as Settings from './helpers/settings';
import * as Storage from './helpers/storage';
import * as Templating from './helpers/templating';
import * as Tools from './helpers/tools';
import * as Actions from './core/actions';
import * as Auth from './core/auth';
import * as Captcha from './captcha';
import * as Chat from './core/chat';
import * as Drafts from './core/drafts';
import * as Files from './core/files';
import * as Hiding from './core/hiding';
import * as Hotkeys from './core/hotkeys';
import * as Posts from './core/posts';
import * as Threads from './core/threads';
import * as WebSocket from './core/websocket';
import * as Worker from './worker';
import * as EventHandlers from './handlers/event-handlers';
import * as PreloadProcessors from './handlers/preload-processors';
import * as Widgets from './widgets';

import './core/auth';
import './core/chat';
import './core/drafts';
import './core/file-inputs';
import './core/files';
import './core/hiding';
import './core/hotkeys';
import './core/management';
import './core/markup';
import './core/player';
import './core/post-form';
import './core/posts';
import './core/threads';
import './handlers/post-processors';
import './helpers/ajax';
import './widgets/movable-widget';
import './widgets/overlay-progress-bar';
import './widgets/popup-message';
import './worker/spells';

const CODEMIRROR_ADDONS = ['mode/simple'];
const CODEMIRROR_MODES = ['javascript', 'css', 'xml', 'htmlmixed'];
const JQUERY_PLUGINS = ['is-in-viewport', 'jquery-knob', '@claviska/jquery-minicolors', 'jquery-ui/jquery-ui',
  'jquery-ui-timepicker-addon', 'jquitelight', 'jstree'];
const MOUSETRAP_PLUGINS = ['bind-dictionary', 'global-bind', 'pause', 'record'];
const MODULE_SHORTCUTS = new Map([
  ['minicolors', '@claviska/jquery-minicolors'],
  ['moment', 'moment/min/moment-with-locales'],
  ['filesaver', 'node-safe-filesaver'],
  ['save-as', 'node-safe-filesaver']
]);

window.jQuery = $; //NOTE: Workaround for the is-in-viewport plugin
KO.options.useOnlyNativeEvents = true; //NOT: Use native events, NOT jQuery events

//NOTE: Prevents bindings for child nodes
KO.bindingHandlers.stopBindings = {
  init: function() {
    return { controlsDescendantBindings: true };
  }
};

//NOTE: Binds boundData to the element
KO.bindingHandlers.boundData = {
  init: function(element, __, allBindings) {
    element.boundData = allBindings.get('boundData');
  }
};

//NOTE: Binds a file upload
KO.bindingHandlers.fileUpload = {
  init: function(element, valueAccessor) {
    $(element).change(function() {
      valueAccessor()(element.files[0]);
    });
  },
  update: function(element, valueAccessor) {
    if (KO.unwrap(valueAccessor()) === null) {
      $(element).wrap('<form>').closest('form').get(0).reset();
      $(element).unwrap();
    }
  }
};

CODEMIRROR_ADDONS.map((name) => { require(`codemirror/addon/${name}`); } );
CODEMIRROR_MODES.map((name) => { require(`codemirror/mode/${name}/${name}`); } );

JQUERY_PLUGINS.forEach((name) => {
  let plugin = require(name);
  if (typeof plugin === 'function') {
    plugin($);
  }
});

MOUSETRAP_PLUGINS.forEach((name) => { require(`mousetrap/plugins/${name}/mousetrap-${name}`); });

let tmpPosition = $.fn.position;

//NOTE: jQuery UI .position method is broken in jQuery 3.0, so here is a hack
$.fn.position = function(pos) {
  if (arguments.length < 1) {
    return tmpPosition.call(this);
  }
  if (typeof pos !== 'object') {
    return tmpPosition.call(this, {
      of: '#jQueryUIpositionFix', //NOTE: This element has position: fixed, and 100% width/heigh,
      within: '#jQueryUIpositionFix' //so it is actually the same as window in context of positioning
    });
  }
  pos = Tools.cloned(pos);
  let left = +pos.left;
  let top = +pos.top;
  if (!isNaN(left) && !isNaN(top)) {
    pos.my = `left+${left} top+${top}`;
    pos.at = 'left top';
  }
  ['of', 'within'].forEach((prop) => {
    if (!pos[prop] || pos[prop] == window || pos[prop] == window.document) {
      pos[prop] = '#jQueryUIpositionFix';
    };
  });
  return tmpPosition.call(this, pos);
};

//NOTE: Removing classes with a wildcard
$.fn.removeClassWild = function(mask) {
  return this.removeClass((index, cls) => {
    let re = mask.replace(/\*/g, '\\S+');
    return (cls.match(new RegExp(`\\b${re}`, 'g')) || []).join(' ');
  });
};

//NOTE: Same as .load, but always keeps <script> tags
$.fn.loadWithScripts = function(url, params, callback) {
  let selector;
  let type;
  let response;
	let off = url.indexOf(' ');
	if (off >= 0) {
	  selector = $.trim(url.slice(off));
		url = url.slice(0, off);
	}
	if (typeof params === 'function') {
		callback = params;
		params = undefined;
	} else if (params && typeof params === 'object') {
		type = 'POST';
	}
  if (this.length <= 0) {
    return this;
  }
  $.ajax({
    url: url,
    type: type || 'GET',
    dataType: 'html',
    data: params
  }).done((responseText) => {
    response = arguments;
    if (selector) {
      let node = $('<div>').append($.parseHTML(responseText, window.document, true)).find(selector);
      Templating.scriptWorkaround(node);
      this.html(node);
    } else {
      this.html(responseText);
    }
  }).always(callback && (function(jqXHR, status) {
    this.each(function() {
      callback.apply(this, response || [jqXHR.responseText, status, jqXHR]);
    });
  }).bind(this));
	return this;
};

window.lord = window.lord || new EventEmitter();

window.lord.require = (moduleName) => {
  if (!moduleName) {
    return module.exports;
  }
  return require(MODULE_SHORTCUTS.get(moduleName) || moduleName);
};

function loginMessageText(user) {
  user = user || Templating.createUser();
  if (!user.loggedIn) {
    return '';
  }
  if (user.isSuperuser()) {
    return Tools.translate('logged in as superuser', 'loginMessageSuperuserText');
  } else if (user.isAdmin()) {
    return Tools.translate('logged in as administrator', 'loginMessageAdminText');
  } else if (user.isModer()) {
    return Tools.translate('logged in as moderator', 'loginMessageModerText');
  } else if (user.isUser()) {
    return Tools.translate('logged in as user', 'loginMessageUserText');
  } else {
    return Tools.translate('not registered', 'loginMessageNoneText');
  }
}

function initializeNavbar(navbar) {
  let user = Templating.createUser();
  KO.applyBindings({
    loggedIn: user.loggedIn,
    settings: Settings,
    shortcutSuffix: Hotkeys.shortcutSuffix,
    loginButtonTitle: () => {
      if (user.loggedIn) {
        let txt = loginMessageText(user);
        if (txt) {
          txt = `[${txt}]`;
        }
        return `${Tools.translate('Log out', 'logoutText')} ${txt}`;
      } else {
        return Tools.translate('Log in', 'loginText');
      }
    },
    loginOrLogout: () => {
      if (user.loggedIn) {
        Auth.logout();
      } else {
        Navigation.setPage(`/${Tools.sitePathPrefix()}login.html?source=${window.location.pathname}`, false);
      }
    },
    unreadChatMessageCount: KO.computed(() => {
      let chats = Storage.chats();
      return _(chats).reduce((acc, messages) => {
        return acc + (messages.some(message => message.unread) ? 1 : 0);
      }, 0);
    }),
    favoriteThreadNewPostCount: KO.computed(() => {
      let favoriteThreads = Storage.favoriteThreads();
      return _(favoriteThreads).reduce((acc, thread) => {
        return acc + ((thread.newPostCount > 0) ? 1 : 0);
      }, 0);
    }),
    showChat: Chat.showChat,
    showHiddenPostList: Hiding.showHiddenPostList,
    editSpells: Widgets.editCode.bind(null, 'spells', { name: 'spells' }),
    showSettings: Widgets.showSettings,
    showSearch: Widgets.showSearch,
    showFavorites: Threads.showFavorites,
    toggleMumWatching: () => {
      Settings.mumWatching(!Settings.mumWatching());
    },
    selectBoard: (_, e) => {
      let value = $(e.target).val();
      if (value) {
        Navigation.setPage(value);
      }
    },
    toggleBoardGroupVisibility: (_, e) => {
      let boardName = $(e.target).closest('.js-navbar-group').attr('name');
      let groups = Settings.hiddenBoardGroups();
      let index = groups.indexOf(boardName);
      if (index < 0) {
        groups.push(boardName);
      } else {
        groups.splice(index, 1);
      }
      Settings.hiddenBoardGroups(groups);
    }
  }, $(navbar)[0]);
}

function initializeDragAndDrop(selector) {
  let dropAreaSelector = ('#sidebar' === selector) ? '#toolbar-drop-area' : '#sidebar-drop-area';
  $(selector).on('dragstart', function(e) {
    e.originalEvent.dataTransfer.setData('text', 'lord/navbar');
    $(this).addClass('dragging');
    $(dropAreaSelector).show();
  }).on('dragend', function() {
    $(dropAreaSelector).hide();
    $(this).removeClass('dragging');
  }).attr('draggable', true);
  $(`${selector}-drop-area`).on('dragover', function(e) {
    e.preventDefault();
    $(this).addClass('drag-over');
  }).on('dragleave', function(e) {
    e.preventDefault();
    $(this).removeClass('drag-over');
  }).on('drop', function(e) {
    e.preventDefault();
    $(this).removeClass('drag-over');
    if (e.originalEvent.dataTransfer.getData('text') !== 'lord/navbar') {
      return;
    }
    let previousNavbarMode = Settings.navbarMode();
    let navbarMode = ('#sidebar' === selector) ? 'sidebar' : 'toolbar';
    if (previousNavbarMode === navbarMode) {
      return;
    }
    Settings.navbarMode(navbarMode);
    let sidebar = $('#sidebar');
    let sidebarSwitch = $('#sidebar-switch');
    let toolbar = $('#toolbar');
    if ('sidebar' === navbarMode) {
      toolbar.hide();
      toolbar.next('.toolbar-placeholder').hide();
      Storage.sidebarVisible(true);
      sidebarSwitch.prop('checked', true);
      sidebarSwitch.prop('disabled', false);
      sidebarSwitch.next('label').show();
    } else {
      Storage.sidebarVisible(false);
      sidebarSwitch.prop('disabled', true);
      sidebarSwitch.prop('checked', false);
      sidebarSwitch.next('label').hide();
      toolbar.show();
      toolbar.next('.toolbar-placeholder').show();
    }
  });
}

function reloadUserCSS(value) {
  if (value) {
    DOM.createStylesheet(Storage.userCSS(), {
      id: 'stylesheet-user',
      replace: '#stylesheet-user'
    });
  } else {
    $('#stylesheet-user').remove();
  }
}

export function initializeHead() {
  Storage.initialize();
  Settings.initialize();
  Storage.userCSS.subscribe(reloadUserCSS);
  Settings.userCSSEnabled.subscribe(reloadUserCSS);
  Settings.bannerMode.subscribe(resetBanner);
  Captcha.initialize();
  Hiding.initialize();
  Posts.initialize();
  Threads.initialize();
  WebSocket.initialize();
  EventHandlers.initialize();
  Navigation.initialize();
  Hotkeys.initialize();
  KO.applyBindings({
    classes: KO.computed(() => {
      let list = ['js-on'];
      if (Settings.mumWatching()) {
        list.push('mum-watching');
      }
      let rating = Settings.maxAllowedRating();
      if (Tools.compareRatings(rating, 'R-18G') < 0) {
        list.push(`rating-${rating.toLowerCase()}`);
      }
      if (Settings.hideTripcodes()) {
        list.push('hide-tripcodes');
      }
      if (Settings.hideUserNames()) {
        list.push('hide-user-names');
      }
      if (Settings.strikeOutHiddenPostLinks()) {
        list.push('strike-out-hidden-post-links');
      }
      if (!Settings.shrinkPosts()) {
        list.push('no-shrink-posts');
      }
      if (Settings.addExpander()) {
        list.push('add-expander');
      }
      if (!Settings.signOPPostLinks()) {
        list.push('no-sign-op-post-links');
      }
      if (Settings.signOwnPostLinks()) {
        list.push('sign-own-post-links');
      }
      if (!Settings.showLeafButtons()) {
        list.push('no-show-leaf-buttons');
      }
      let user = Templating.createUser();
      if (user.loggedIn) {
        list.push('user-logged-in');
        _(Constants.LEVEL_MAP).each((lvl, key) => {
          if (user[`is${key}`]()) {
            list.push(`user-level-${lvl.toLowerCase()}`);
          }
        });
        if (Tools.isBoardRelatedPage()) {
          const BOARD_NAME = Tools.boardName();
          _(Templating.board(BOARD_NAME).permissions).each((_, permission) => {
            if (user.hasPermission(BOARD_NAME, permission)) {
              list.push(`user-permission-${Tools.toSlugCase(permission)}`);
            }
          });
        }
        if (user.vkAuth) {
          list.push('user-vk-auth');
        }
      }
      return list.join(' ');
    })
  }, $(':root')[0]);
  let root = $(':root');
  DOM.resetDeviceType();
  KO.applyBindings({ settings: Settings }, $('#stylesheet-theme')[0]);
  KO.applyBindings({ settings: Settings }, $('#stylesheet-code-theme')[0]);
  if (Settings.userCSSEnabled()) {
    DOM.createStylesheet(Storage.userCSS(), { id: 'stylesheet-user' });
  }
  if (Settings.userJavaScriptEnabled()) {
    try {
      eval(Storage.userJavaScript());
    } catch (err) {
      console.log(err);
    }
  }
  Worker.initialize();
  Posts.resetOwnPostLinksCSS();
  Hiding.resetHiddenPostsCSS();
  PreloadProcessors.executeProcessors();
  EventHandlers.installHandlers();
  Actions.exportActions();
}

export function initializeSidebar() {
  let sidebar = $('#sidebar');
  let sidebarSwitch = $('#sidebar-switch');
  if ('sidebar' !== Settings.navbarMode()) {
    Storage.sidebarVisible(false);
    sidebarSwitch.prop('checked', false);
    sidebarSwitch.prop('disabled', true);
    sidebarSwitch.next('label').hide();
  }
  initializeDragAndDrop('#sidebar');
  let resetTitle = (visible) => {
    sidebarSwitch.next('label').attr('title', visible ? Tools.translate('Hide sidebar', 'hideSidebarButtonText')
      : Tools.translate('Show sidebar', 'showSidebarButtonText'));
  };
  let visible = Storage.sidebarVisible();
  if (!visible || Tools.deviceType('mobile')) {
    sidebarSwitch.prop('checked', false);
  }
  resetTitle(visible);
  sidebarSwitch.click(() => {
    let visible = sidebarSwitch.prop('checked');
    Storage.sidebarVisible(visible);
    resetTitle(visible);
  });
  initializeNavbar(sidebar);
}

export function initializeToolbar() {
  let toolbar = $('#toolbar');
  if ('toolbar' !== Settings.navbarMode()) {
    toolbar.hide();
    toolbar.next('.toolbar-placeholder').hide();
  }
  initializeDragAndDrop('#toolbar');
  initializeNavbar(toolbar);
}

export function resetBanner() {
  let banner = $('#banner');
  let banners = _(Templating.boards().filter((board) => { return board.bannerFileNames.length > 0; }).map((board) => {
    return board.bannerFileNames.map((fileName) => {
      return {
        boardName: board.name,
        boardTitle: board.title,
        fileName: fileName
      };
    });
  })).flatten();
  const BANNER_MODE = Settings.bannerMode();
  const BOARD_NAME = Tools.boardName();
  switch (BANNER_MODE) {
  case 'random':
    banners = banners.filter((banner) => { return BOARD_NAME !== banner.boardName; });
    break;
  case 'same':
    if (Tools.isBoardRelatedPage()) {
      banners = banners.filter((banner) => { return BOARD_NAME === banner.boardName; });
    } else {
      banners = [];
    }
    break;
  default:
    banners = [];
    break;
  }
  banner.empty();
  if (banners.length < 1) {
    return;
  }
  let {
    boardName,
    boardTitle,
    fileName
  } = _(banners).sample();
  let img = $(`<img src='/${Tools.sitePathPrefix()}img/banners/${boardName}/${fileName}' />`);
  if ('same' === BANNER_MODE) {
    banner.append(img);
  } else {
    let a = $(`<a href='/${Tools.sitePathPrefix()}${boardName}' title='${boardTitle}'></a>`);
    a.append(img);
    banner.append(a);
  }
}

export function initializeBanner() {
  resetBanner();
}

export function initializeLeafButton(target) {
  KO.applyBindings({
    switchFile: () => {
      let file = Files.nextOrPreviousFile('next' === target);
      if (!file) {
        return;
      }
      Files.showImage(file.href, file.mimeType, file.width, file.height);
    },
    shortcutSuffix: Hotkeys.shortcutSuffix
  }, $(`.js-leaf-button-${target}`)[0]);
}

export function initializeLogin() {
  KO.applyBindings({
    login: () => {
      Auth.login(DOM.id('input-hashpass').value, false);
    },
    loginWithVK: () => {
      Auth.login(DOM.id('input-hashpass').value, true);
    },
    inputKeyPress: (_, e) => {
      if (13 !== e.keyCode) {
        return true;
      }
      Auth.login(DOM.id('input-hashpass').value, false);
    },
    generateHashpass: async function() {
      let hashpass = DOM.id('input-hashpass').value;
      if (!Tools.testHashpass(hashpass)) {
        hashpass = Tools.sha1(hashpass);
      }
      try {
        await Widgets.prompt({
          title: Tools.translate('Hashpass:', 'hashpassLabelText'),
          value: hashpass,
          readOnly: true
        });
      } catch (err) {
        DOM.handleError(err);
      }
    }
  }, DOM.id('login-section'));
}

export function initializeNotFound() {
  let img = DOM.id('not-found-image');
  if (!img) {
    return;
  }
  let fileNames = Templating.notFoundImageFileNames();
  if (fileNames.length < 2) {
    return;
  }
  let fileName = fileNames[Math.floor(Math.random() * fileNames.length)];
  img.src = `/${Tools.sitePathPrefix()}img/404/${fileName}`;
}
