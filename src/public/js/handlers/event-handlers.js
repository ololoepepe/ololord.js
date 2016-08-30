import _ from 'underscore';
import $ from 'jquery';
import merge from 'merge';
import VK from 'vk-openapi';

import * as AJAX from '../helpers/ajax';
import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Navigation from '../helpers/navigation';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as Chat from '../core/chat';
import * as Drafts from '../core/drafts';
import * as Files from '../core/files';
import * as Hotkeys from '../core/hotkeys';
import * as Management from '../core/management';
import * as Player from '../core/player';
import * as Posts from '../core/posts';
import * as Threads from '../core/threads';
import * as WebSocket from '../core/websocket';
import * as Widgets from '../widgets';
import * as PageProcessors from './page-processors';
import * as PostProcessors from './post-processors';
import * as ResizeHandlers from './resize-handlers';

let handlers = {};

export let registerHandler = Tools.createRegisterFunction(handlers, 'handler');

export function hashChangeHandler() {
  var target = $(':target');
  if (!target || !target[0]) {
    return;
  }
  var offset = target.offset();
  var scrollto = offset.top - $('.toolbar.sticky').height() - 4;
  $('html, body').animate({ scrollTop: scrollto }, 0);
}

const TOOLTIP_COUNT_BOARD_SELECT = 5;

registerHandler('load', () => {
  hashChangeHandler(DOM.hash());
  WebSocket.initialize();
  PageProcessors.applyProcessors().catch(Widgets.handleError);
  Threads.checkFavoriteThreads();
  if (Settings.showNewPosts()) {
    Threads.showNewPosts();
  }
  if (Settings.chatEnabled()) {
    Chat.checkChats();
  }
  if (Settings.showAutoUpdateDesktopNotifications()) {
    DOM.checkNotificationQueue();
  }
  let sidebarSwitch = $('#sidebar-switch');
  DOM.detectSwipe(window.document.body, (e) => {
    if (!Tools.deviceType('mobile')) {
      return;
    }
    let visible = sidebarSwitch.prop('checked');
    let dx = Math.abs(e.distanceX);
    let dy = Math.abs(e.distanceY);
    if (dy >= Constants.SWIPE_MAX_DISTANCE_Y || dx < Constants.SWIPE_MIN_DISTANCE_X) {
      return;
    }
    if ((_(e.types).contains('swiperight') && !visible) || (_(e.types).contains('swipeleft') && visible)) {
      sidebarSwitch.prop('checked', !visible);
    }
  });
  if (Tools.deviceType('mobile')) {
    DOM.queryAll('.js-with-tooltip').forEach(DOM.setTooltip);
    var boardSelect = Storage.getLocalObject('tooltips/boardSelect', 0);
    if (boardSelect < TOOLTIP_COUNT_BOARD_SELECT) {
      Storage.setLocalObject('tooltips/boardSelect', boardSelect + 1);
      DOM.setTooltip(DOM.queryOne('.boardSelectContainer > select'), {
        position: 'fixed',
        show: true
      });
    }
  }
}, {
  priority: 0,
  test: () => { return !/^\/login.html$/.test(Tools.locationPathname()); }
});

Settings.deviceType.subscribe(() => {
  if (Tools.deviceType('desktop')) {
    DOM.queryAll('.js-with-tooltip').forEach(DOM.removeTooltip);
  } else {
    DOM.queryAll('.js-with-tooltip').forEach(DOM.setTooltip);
  }
});

registerHandler('load', () => {
  let w = $(window);
  let loading = false;
  let infiniteScrollPage;
  w.scroll(async function() {
    if (!Settings.infiniteScroll() || loading) {
      return;
    }
    let pageCount = Tools.pageCount();
    if (isNaN(infiniteScrollPage)) {
      infiniteScrollPage = Tools.pageNumber();
    }
    if (infiniteScrollPage >= pageCount - 1) {
      return;
    }
    if ($(document).height() - w.height() !== w.scrollTop()) {
      return;
    }
    loading = true;
    ++infiniteScrollPage;
    $('#infinite-scroll-loading-message').show();
    try {
      let pageModel = await AJAX.api(infiniteScrollPage, {}, { prefix: Tools.boardName() });
      let threads = pageModel.threads.filter(thread => !DOM.id(`thread-${thread.opPost.number}`));
      let threadsHTML = threads.map((thread) => {
        return `<hr />${Templating.template('board/thread', { thread: thread }, {
          boardName: Tools.boardName(),
          noparse: true
        })}`;
      }).join('');
      let html = `<hr /><div class='infinite-scroll-page-separator'>${Tools.translate('Page', 'pageText')} `;
      html += `${infiniteScrollPage}</div>${threadsHTML}`;
      $('#infinite-scroll-loading-message').hide();
      $('#threads').append(html);
      await Tools.series(threads.map((thread) => {
        return DOM.id(`thread-${thread.opPost.number}`);
      }), async function(thread) {
        let posts = DOM.queryAll('.js-post', thread);
        await PostProcessors.applyPreprocessors(posts);
        await PostProcessors.applyPostprocessors(posts);
      });
      Files.initializeFiles();
      loading = false;
    } catch(err) {
      DOM.handleError(err);
      $('#infinite-scroll-loading-message').hide();
      loading = false;
    }
  });
}, {
  priority: 10,
  test: Tools.isBoardPage
});

registerHandler('load', async function() {
  try {
    Drafts.initializeDrafts();
    let posts = DOM.queryAll('#content .js-post');
    await PostProcessors.applyPreprocessors(posts);
    await PostProcessors.applyPostprocessors(posts);
    Files.initializeFiles();
    DOM.scrollHandler();
  } catch (err) {
    DOM.handleError(err);
  }
}, {
  priority: 20,
  test: () => {
    return Tools.isBoardPage() || Tools.isThreadPage()
  }
});

registerHandler('load', () => {
  var enabled = Storage.autoUpdateEnabled(Tools.boardName(), Tools.threadNumber());
  if (true === enabled || (false !== enabled && Settings.autoUpdateThreadsByDefault())) {
    Threads.setAutoUpdateEnabled(true);
  }
}, {
  priority: 30,
  test: Tools.isThreadPage
});

registerHandler('load', () => {
  let vkButton = DOM.id('vkontakte-login-button');
  if (!vkButton) {
    return;
  }
  VK.UI.button('vkontakte-login-button');
  vkButton.style.width = '';
}, {
  priority: 0,
  test: /^\/login.html$/
});

registerHandler('load', Management.initializeManagement, {
  priority: 10,
  test: /^\/manage.html$/
});

registerHandler('beforeunload', DOM.setUnloading);

let w = $(window);
let lastWindowSize = {
  width: w.width(),
  height: w.height()
};

registerHandler('visibilitychange', Threads.visibilityChangeHandler);

registerHandler('resize', () => {
  let width = w.width();
  let height = w.height();
  ResizeHandlers.applyHandlers(width != lastWindowSize.width, height != lastWindowSize.height, width, height);
  lastWindowSize = {
    width: width,
    height: height
  };
});

registerHandler('scroll', DOM.scrollHandler);

registerHandler('click', Posts.globalClickHandler, { priority: 0 });

registerHandler('click', async function(e) {
  if (!Settings.ajaxNavigation()) {
    return;
  }
  if (e.button) {
    return;
  }
  let t = e.target;
  if (!t || 'A' !== t.tagName || !t.href) {
    return;
  }
  if (!Navigation.testSameDomain(t.href)) {
    return;
  }
  e.preventDefault();
  await Navigation.setPage(t.href);
}, { priority: 10 });

registerHandler('popstate', async function(e) {
  let state = e.state;
  if (!state) {
    return;
  }
  await Navigation.setPage(state.href, {
    title: state.title,
    fromHistory: true
  });
});

registerHandler('mouseover', Posts.globalMouseoverHandler);

registerHandler('mouseout', Posts.globalMouseoutHandler);

registerHandler('storage', Storage.storageHandler);

export function installHandlers() {
  _(handlers).each((list, eventType) => {
    list.filter(Tools.testFilter).sort(Tools.priorityPredicate).forEach((h) => {
      window.addEventListener(eventType, h.handler, false);
    });
  });
}
