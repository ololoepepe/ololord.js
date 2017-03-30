import $ from 'jquery';
import CodeMirror from 'codemirror';
import KO from 'knockout';

import AutoUpdateTimer from './auto-update-timer';
import ChatWidget from './chat-widget';
import DrawingOptionsWidget from './drawing-options-widget';
import DrawingWidget from './drawing-widget';
import EditPostWidget from './edit-post-widget';
import FavoritesWidget from './favorites-widget';
import HiddenPostList from './hidden-post-list';
import MovablePlayer from './movable-player';
import MovableWidget from './movable-widget';
import OverlayProgressBar from './overlay-progress-bar';
import PopupMessage from './popup-message';
import SearchWidget from './search-widget';
import SettingsWidget from './settings-widget';
import * as DOM from '../helpers/dom';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';

export { AutoUpdateTimer, DrawingOptionsWidget, DrawingWidget, EditPostWidget, FavoritesWidget, HiddenPostList,
  MovablePlayer, MovableWidget, OverlayProgressBar, PopupMessage, SearchWidget, SettingsWidget };

const INPUT_MIN_WIDTH = 200;
const INPUT_MIN_HEIGHT = 100;
const TEXTAREA_MIN_WIDTH = 350;
const TEXTAREA_MIN_HEIGHT = 300;
const CODE_MIN_WIDTH = 600;
const CODE_MIN_HEIGHT = 500;
const SETTINGS_MIN_WIDTH = 550;
const SETTINGS_MIN_HEIGHT = 400;
const PASSWORD_MIN_WIDTH = 350;
const PASSWORD_MIN_HEIGHT = 150;
const SEARCH_MIN_WIDTH = 600;
const SEARCH_MIN_HEIGHT = 500;
const CONFIRM_MIN_WIDTH = 300;
const CONFIRM_MIN_HEIGHT = 120;

let dialogs = [];
let currentMenu = null;
let widgets = {};

export function hasActiveDialogs() {
  return dialogs.length > 0;
}

export function hideMenu() {
  if (currentMenu) {
    currentMenu.hide();
    currentMenu = null;
  }
}

export function showWidget(content, options = {}) {
  let id = options && options.id;
  let type = options && options.type;
  let widget = id && widgets[id];
  if (widget) {
    $(window.document.body).append(widget.div);
    return widget;
  }
  let rememberGeometry = options && options.rememberGeometry;
  if (id && rememberGeometry) {
    if (!options) {
      options = {};
    }
    options.geometry = Storage.lastWidgetGeometry(id);
  }
  if (!content && type) {
    switch (type) {
    case 'chatWidget':
      widget = new ChatWidget(options);
      break;
    case 'drawingOptionsWidget':
      widget = new DrawingOptionsWidget(options);
      break;
    case 'drawingWidget':
      widget = new DrawingWidget(options);
      break;
    case 'editPostWidget':
      widget = new EditPostWidget(options);
      break;
    case 'favoritesWidget':
      widget = new FavoritesWidget(options);
      break;
    case 'hiddenPostList':
      widget = new HiddenPostList(options);
      break;
    case 'searchWidget':
      widget = new SearchWidget(options);
      break;
    case 'settingsWidget':
      widget = new SettingsWidget(options);
      break;
    default:
      break;
    }
  }
  if (options.widgetClass) {
    widget = new options.widgetClass(options);
  } else if (options.widget) {
    widget = options.widget;
  }
  if (!widget) {
    widget = new MovableWidget(content, options);
  }
  if (id) {
    widgets[id] = widget;
    if (rememberGeometry) {
      widget.on('move', () => {
        Storage.lastWidgetGeometry(id, widget.geometry);
      }).on('resize', () => {
        Storage.lastWidgetGeometry(id, widget.geometry);
      });
    }
  }
  widget.show().catch(() => {}).then(() => {
    if (id) {
      delete widgets[id];
    }
  });
  return widget;
}

export async function confirm({ id, title, label, minSize } = {}) {
  let div = $('<div></div>');
  div.text(label || Tools.translate('Are you sure?', 'confirmationText'));
  let options = {
    id: id,
    title: title,
    buttons: ['cancel', 'ok']
  };
  if (Tools.deviceType('desktop')) {
    options.minSize = minSize || {
      width: CONFIRM_MIN_WIDTH,
      height: CONFIRM_MIN_HEIGHT
    };
  } else {
    options.maximized = true;
  }
  return await showWidget(div, options).promise;
}

export async function prompt({ id, title, label, type, value, readOnly, select, minSize } = {}) {
  let div = $('<div></div>');
  if (label) {
    let subdiv = $('<div></div>');
    subdiv.text(label);
    div.append(subdiv);
  }
  let subdiv = $('<div></div>');
  switch (type) {
  case 'password':
    var inp = $('<input type="password" class="auto-resizable-input" />');
    break;
  case 'textarea':
    var inp = $('<textarea class="auto-resizable-text-textarea"></textarea>');
    break;
  case 'input':
  default:
    var inp = $('<input type="text" class="auto-resizable-input" />');
    break;
  }
  if (readOnly) {
    inp.prop('readonly', true);
  }
  if (value) {
    inp.val(value);
  }
  subdiv.append(inp);
  div.append(subdiv);
  let options = {
    id: id,
    title: title,
    buttons: (readOnly ? ['close'] : ['cancel', 'ok'])
  };
  if (Tools.deviceType('desktop')) {
    if ('textarea' === type) {
      options.minSize = minSize || {
        width: TEXTAREA_MIN_WIDTH,
        height: TEXTAREA_MIN_HEIGHT
      };
    } else {
      options.minSize = minSize || {
        width: INPUT_MIN_WIDTH,
        height: INPUT_MIN_HEIGHT
      };
    }
  } else {
    options.maximized = true;
  }
  let promise = showWidget(div, options).promise;
  if (typeof select === 'undefined' || select) {
    inp.select();
  }
  let result = await promise;
  if (!result) {
    return { accepted: false };
  }
  return {
    accepted: true,
    value: inp.val()
  };
}

export async function requestPassword({ id, title, value } = {}) {
  let div = Templating.template('widgets/passwordWidget');
  let password = KO.observable((typeof value !== 'undefined') ? value : Storage.password());
  let passwordVisible = KO.observable(false);
  KO.applyBindings({
    password: password,
    passwordVisible: passwordVisible,
    togglePasswordVisibility: (_, e) => {
      passwordVisible(!passwordVisible());
    },
  }, div);
  try {
    let options = {
      id: id,
      title: title || Tools.translate('Enter password'),
      buttons: ['cancel', 'ok']
    };
    if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: PASSWORD_MIN_WIDTH,
        height: PASSWORD_MIN_HEIGHT
      };
    } else {
      options.maximized = true;
    }
    let accepted = await showWidget(div, options).promise;
    if (!accepted) {
      return { accepted: false };
    }
    return {
      accepted: true,
      password: password()
    };
  } catch (err) {
    DOM.handleError(err);
  }
}

function createCodemirrorEditor(parent, mode, value) {
  return CodeMirror(parent, {
    mode: mode,
    indentUnit: 2, //TODO: add an option to settings
    lineNumbers: true,
    autofocus: true,
    value: value
  });
}

export async function editCode(mode, { name, value } = {}) {
  if (typeof value === 'undefined' && typeof name !== 'unedefined' && Storage.hasOwnProperty(name)) {
    value = Storage[name]();
  }
  value = '' + value;
  let div = $('<div class="auto-resizable-div"></div>');
  let editor = createCodemirrorEditor(div[0], mode, value);
  try {
    let options = {
      id: `code/${name}`,
      buttons: ['cancel', 'ok'],
      maximized: true
    };
    switch (name) {
    case 'spells':
      options.title = Tools.translate('Spells');
      break;
    case 'userCSS':
      options.title = Tools.translate('User CSS');
      break;
    case 'userJavaScript':
      options.title = Tools.translate('User JavaScript');
      break;
    default:
      options.title = name;
      break;
    }
    if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: CODE_MIN_WIDTH,
        height: CODE_MIN_HEIGHT
      };
    }
    let promise = showWidget(div, options).promise;
    editor.refresh();
    div.find('.CodeMirror').css('height', '100%');
    let result = await promise;
    if (!result) {
      return { accepted: false };
    }
    value = editor.getValue();
    if (Storage.hasOwnProperty(name)) {
      Storage[name](value);
    }
    return {
      accepted: true,
      value: value
    };
  } catch (err) {
    DOM.handleError(err);
  }
}

export function showMenu(e) {
  e.stopPropagation();
  let selector = DOM.data('menuSelector', e.target);
  if (!selector) {
    return;
  }
  if (currentMenu) {
    let same = (currentMenu.selector === selector);
    hideMenu();
    if (same) {
      return;
    }
  }
  currentMenu = $(selector);
  currentMenu.selector = selector;
  currentMenu.menu({ items: '> :not(.ui-widget-header)' }).toggle().position({
    my: 'left top',
    at: `left bottom+2px`,
    of: $(e.target),
    collision: 'fit flip'
  }).show();
}

export async function showSearch() {
  let options = {
    id: 'searchWidget',
    type: 'searchWidget',
    title: Tools.translate('Search', 'searchWidgetTitle'),
    rememberGeometry: true
  };
  if (Tools.deviceType('desktop')) {
    options.minSize = {
      width: SEARCH_MIN_WIDTH,
      height: SEARCH_MIN_HEIGHT
    };
  } else {
    options.maximized = true;
  }
  return await showWidget(null, options).promise;
}

export async function showSettings() {
  let options = {
    id: 'settingsWidget',
    type: 'settingsWidget',
    title: Tools.translate('Settings', 'settingsDialogTitle'),
    rememberGeometry: true
  };
  if (Tools.deviceType('desktop')) {
    options.minSize = {
      width: SETTINGS_MIN_WIDTH,
      height: SETTINGS_MIN_HEIGHT
    };
  } else {
    options.maximized = true;
  }
  return await showWidget(null, options).promise;
}
