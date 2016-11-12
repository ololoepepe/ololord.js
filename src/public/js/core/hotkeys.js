import _ from 'underscore';
import $ from 'jquery';
import KO from 'knockout';
import Mousetrap from 'mousetrap';

import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Navigation from '../helpers/navigation';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as Files from './files';
import * as Hiding from './hiding';
import * as Markup from './markup';
import * as PostForm from './post-form';
import * as Threads from './threads';
import * as Widgets from '../widgets';

let actionMap = {};

const SKIPPED_TAGS = new Set(['INPUT', 'TEXTAREA']);
const ARROW_KEYS = ['left', 'right', 'up', 'down'];

Mousetrap.prototype.stopCallback = (e, element, combo) => {
  if (!Settings.hotkeysEnabled()) {
    return true;
  }
  let action = actionMap[combo];
  if (action && typeof action.test === 'function') {
    let result = action.test(e, element, combo);
    if (!result) {
      return true;
    }
    e.preventDefault();
    return false;
  }
  if (SKIPPED_TAGS.has(element.tagName)) {
    return true;
  }
  e.preventDefault();
  return false;
}

function previousNextPageImage(next) {
  if (Widgets.MovablePayer.hasActivePlayers()) {
    Files.previousFile();
    return false;
  }
  let pageNumber = Tools.pageNumber();
  if (isNaN(pageNumber) || pageNumber < 0) {
    return;
  }
  if (next) {
    if (pageNumber >= Tools.pageCount() - 1) {
      return;
    }
    ++pageNumber;
  } else {
    if (!pageNumber) {
      return;
    }
  }
  let href = `/${Tools.sitePathPrefix()}${Tools.boardName()}`;
  if (pageNumber > 0) {
    href += `/${pageNumber}.html`;
  }
  Navigation.setPage(href);
}

function previousNextThreadPost(next, post) {
  let iterationLoop = (container, el) => {
    for (let i = 0; i < container.length; ++i) {
      let curr = container[i];
      if (curr == el) {
        if (next && (i + 1) < container.length) {
          return container[i + 1];
        } else if (!next && i > 0) {
          return container[i - 1];
        }
        return el;
      }
    }
    return el;
  };
  if (post) {
    let el = iterationLoop($('.js-post'), currentPost(next));
    if (el) {
      DOM.hash(el.id);
    }
  } else {
    let el = iterationLoop($('.js-thread'), currentThread(next));
    if (el) {
      DOM.hash(el.id.replace('thread', 'post'));
    }
  }
  return false;
}

function currentPost(selectLast) {
  let hash = DOM.hash();
  let post;
  if (hash && !isNaN(+hash.replace('post-', ''))) {
    post = $(`#${hash}:in-viewport`);
  }
  if (post && post[0]) {
    return post[0];
  }
  post = $('.js-post:in-viewport');
  if (post[0]) {
    return selectLast ? post.last()[0] : post[0];
  }
  return null;
}

function currentThread(selectLast) {
  if (Tools.isThreadPage()) {
    return null;
  }
  let post = currentPost(selectLast);
  if (!post) {
    return null;
  }
  let thread = $(post).closest('.js-thread');
  return thread[0] || null;
}

function markupCommon(tag) {
  Markup.markup(tag);
}

function testAccepted(_1, element, combo) {
  if (!combo || !element) {
    return;
  }
  if (!SKIPPED_TAGS.has(element.tagName)) {
    return true;
  }
  let keys = combo.split('+');
  if (keys.length < 2) {
    return;
  }
  if (SKIPPED_TAGS.has(element.tagName) && ARROW_KEYS.some((key) => { return keys.indexOf(key) >= 0; })) {
    return;
  }
  return (keys.length > 2) || ('shift' !== keys[0]);
}

export const ACTIONS = {
  showFavorites: {
    title: () => { return Tools.translate('Show favorites'); },
    handler: Widgets.showFavorites,
    test: testAccepted
  },
  showSettings: {
    title: () => { return Tools.translate('Show settings'); },
    handler: Widgets.showSettings,
    test: testAccepted
  },
  previousPageImage: {
    title: () => { return Tools.translate('Previous page/image'); },
    handler: previousNextPageImage.bind(null, false)
  },
  nextPageImage: {
    title: () => { return Tools.translate('Next page/image'); },
    handler: previousNextPageImage.bind(null, true)
  },
  previousThreadPost: {
    title: () => { return Tools.translate('Previous thread/post'); },
    handler: () => {
      return previousNextThreadPost(false, Tools.isThreadPage());
    }
  },
  nextThreadPost: {
    title: () => { return Tools.translate('Next thread/post'); },
    handler: () => {
      return previousNextThreadPost(true, Tools.isThreadPage());
    }
  },
  previousPost: {
    title: () => { return Tools.translate('Previous post'); },
    handler: previousNextThreadPost.bind(null, false, true)
  },
  nextPost: {
    title: () => { return Tools.translate('Next post'); },
    handler: previousNextThreadPost.bind(null, true, true)
  },
  hidePost: {
    title: () => { return Tools.translate('Hide post'); },
    handler: () => {
      let post = currentPost();
      if (!post) {
        return;
      }
      Hiding.setPostHidden(post);
      return false;
    }
  },
  goToThread: {
    title: () => { return Tools.translate('Go to thread'); },
    handler: () => {
      let thread = currentThread();
      if (!thread) {
        return;
      }
      let a = DOM.queryOne('.js-reply-to-thread-button-container a', thread);
      let w = window.open(a.href, '_blank');
      if (w) {
        w.focus();
      }
    }
  },
  expandThread: {
    title: () => { return Tools.translate('Expand thread'); },
    handler: () => {
      let thread = currentThread();
      if (!thread) {
        return;
      }
      Threads.expandThread(thread);
    }
  },
  expandImage: {
    title: () => { return Tools.translate('Expand image'); },
    handler: () => {
      let post = currentPost();
      if (!post) {
        return;
      }
      let file = DOM.queryAll('.postFile', post)[0];
      if (!file || Widgets.MovablePayer.hasActivePlayers()) {
        Files.hideImage();
        return;
      }
      let href = DOM.data('href', file);
      let mimeType = DOM.data('mimeType', file);
      let width = +DOM.data('width', file);
      let height = +DOM.data('height', file);
      Files.showImage(href, mimeType, width, height);
    }
  },
  quickReply: {
    title: () => { return Tools.translate('Quick reply'); },
    handler: () => {
      let post = currentPost();
      if (!post) {
        return;
      }
      PostForm.quickReply(post);
    }
  },
  submitReply: {
    title: () => { return Tools.translate('Submit reply'); },
    handler: PostForm.submit,
    test: testAccepted
  },
  updateThread: {
    title: () => { return Tools.translate('Update thread'); },
    handler: () => {
      let threadNumber = Tools.threadNumber();
      if (threadNumber <= 0) {
        return;
      }
      Threads.updateThread();
    }
  },
  markupBold: {
    title: () => { return Tools.translate('Markup: bold'); },
    handler: markupCommon.bind(null, 'b'),
    test: testAccepted
  },
  markupItalics: {
    title: () => { return Tools.translate('Markup: italics'); },
    handler: markupCommon.bind(null, 'i'),
    test: testAccepted
  },
  markupStrikedOut: {
    title: () => { return Tools.translate('Markup: striked out'); },
    handler: markupCommon.bind(null, 's'),
    test: testAccepted
  },
  markupUnderlined: {
    title: () => { return Tools.translate('Markup: underlined'); },
    handler: markupCommon.bind(null, 'u'),
    test: testAccepted
  },
  markupSpoiler: {
    title: () => { return Tools.translate('Markup: spoiler'); },
    handler: markupCommon.bind(null, 'spoiler'),
    test: testAccepted
  },
  markupQuotation: {
    title: () => { return Tools.translate('Markup: quotation'); },
    handler: markupCommon.bind(null, '>'),
    test: testAccepted
  },
  markupCode: {
    title: () => { return Tools.translate('Markup: code'); },
    handler: markupCommon.bind(null, 'code'),
    test: testAccepted
  }
};

export function shortcut(action) {
  return (_(Storage.hotkeys()).findWhere({ action: action }) || {}).shortcut || '';
}

export function shortcutSuffix(action, noSpace) {
  if (!Settings.hotkeysEnabled() || !Tools.deviceType('desktop')) {
    return '';
  }
  let s = shortcut(action);
  return s ? `${!noSpace ? ' ' : ''}(${s})` : '';
}

const SKIPPED_NODES = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON']);

function rebind() {
  Mousetrap.reset();
  actionMap = {};
  Mousetrap.bind(Storage.hotkeys().reduce((acc, hotkey) => {
    let action = ACTIONS[hotkey.action];
    let handler = action;
    if (typeof action === 'object') {
      handler = action.handler;
    }
    if (typeof handler !== 'function') {
      return acc;
    }
    actionMap[hotkey.shortcut] = action;
    acc[hotkey.shortcut] = handler;
    return acc;
  }, {}), 'keyup');
}

Storage.hotkeys.subscribe(rebind);

export async function editHotkeys() {
  let div = Templating.template('widgets/hotkeysWidget');
  let recording = {};
  KO.applyBindings({
    actions: _(ACTIONS).map((action, name) => {
      if (typeof action === 'function') {
        return {
          name: name,
          title: name
        };
      }
      return {
        name: name,
        title: ((typeof action.title === 'function') ? action.title() : action.title) || name
      };
    }),
    hotkeys: Storage.hotkeys,
    removeHotkey: (index) => {
      index = index();
      let hotkeys = Storage.hotkeys();
      if (index < 0) {
        return;
      }
      hotkeys.splice(index, 1);
      Storage.hotkeys(Tools.cloned(hotkeys));
    },
    recordHotkey: (index, data, e) => {
      index = index();
      recording[index] = {
        data: data,
        e: e,
        previous: data.shortcut
      };
      $(e.target).val('');
      Mousetrap.record((s) => {
        if (!recording.hasOwnProperty(index)) {
          return;
        }
        delete recording[index];
        s = s && s.join(' ');
        if (!s) {
          return;
        }
        data.shortcut = s;
        $(e.target).val(s).prev().focus();
        Storage.hotkeys(Tools.cloned(Storage.hotkeys()));
      });
    },
    stopRecordHotkey: (index, data, e) => {
      index = index();
      if (recording.hasOwnProperty(index)) {
        let rec = recording[index];
        $(rec.e.target).val(rec.previous);
        delete recording[index];
      }
    },
    updateHotkeys: () => {
      Storage.hotkeys(Tools.cloned(Storage.hotkeys()));
    }
  }, div);
  try {
    let options = {
      id: 'hotkeysWidget',
      title: Tools.translate('Hotkeys', 'hotkeysWidgetTitle'),
      buttons: [
        {
          title: Tools.translate('Add', 'addButtonText'),
          action: () => {
            let hotkeys = Storage.hotkeys();
            hotkeys.push({
              action: Object.keys(ACTIONS)[0],
              shortcut: ''
            });
            Storage.hotkeys(Tools.cloned(hotkeys));
          }
        },
        {
          title: Tools.translate('Restore defaults'),
          action: () => {
            Storage.hotkeys(Tools.cloned(Storage.DEFAULT_HOTKEYS));
          }
        },
        'close'
      ],
      rememberGeometry: true
    };
    if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: 450,
        height: 650
      };
    } else {
      options.maximized = true;
    }
    return await Widgets.showWidget(div, options);
  } catch (err) {
    DOM.handleError(err);
  }
}

export function initialize() {
  rebind();
}
