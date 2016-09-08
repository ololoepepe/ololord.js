import _ from 'underscore';
import $ from 'jquery';
import JSZip from 'jszip';
import JSZipUtils from 'jszip-utils';
import KO from 'knockout';
import { saveAs } from 'node-safe-filesaver';

import * as AJAX from '../helpers/ajax';
import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Navigation from '../helpers/navigation';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as Files from './files';
import * as Hotkeys from './hotkeys';
import * as Posts from './posts';
import * as WebSocket from './websocket';
import * as PostProcessors from '../handlers/post-processors';
import * as Widgets from '../widgets';
import AutoUpdateTimer from '../widgets/auto-update-timer';
import OverlayProgressBar from '../widgets/overlay-progress-bar';
import PopupMessage from '../widgets/popup-message';

const FAVICON_BLINK_INTERVAL = Constants.SECOND / 2;
const CHECK_FAVORITE_THREADS_INTERVAL = 15 * Constants.SECOND;
const SHOW_NEW_POSTS_INTERVAL = 15 * Constants.SECOND;
const SHOW_NEW_POSTS_FAIL_INTERVAL = 30 * Constants.SECOND;
const MAX_FAVORITE_THREAD_TEXT_LENGTH = 150;
const MOVE_THREAD_MIN_WIDTH = 300;
const MOVE_THREAD_MIN_HEIGHT = 200;
const FAVORITES_MIN_WIDTH = 500;
const FAVORITES_MIN_HEIGHT = 400;

let pageVisible = true;
let blinkTimer = null;
let autoUpdateTimer = null;

class AutoUpdateViewModel {
  constructor() {
    this.shortcutSuffix = Hotkeys.shortcutSuffix;
  }

  toggleAutoUpdate() {
    setAutoUpdateEnabled(!Storage.autoUpdateEnabled(Tools.boardName(), Tools.threadNumber()));
  }

  updateThread() {
    updateThread();
  }
}

class BlinkTimer {
  constructor(blinkInterval) {
    this.blinkInterval = blinkInterval || FAVICON_BLINK_INTERVAL;
    this.timer = null;
  }

  start() {
    if (this.timer) {
      return;
    }
    window.document.title =  `* ${window.document.title}`;
    this.newmessageFavicon = false;
    this.timer = setInterval(() => {
      this.newmessageFavicon;
      let link = DOM.id('favicon');
      link.href.replace(/\/[\/]+$/, `/favicon${this.newmessageFavicon ? '' : '_newmessage'}.ico`);
      this.newmessageFavicon = !this.newmessageFavicon;
    }, this.blinkInterval);
  }

  stop() {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
    let link = DOM.id('favicon');
    link.href = link.href.replace(/\/[\/]+$/, '/favicon.ico');
    window.document.title = window.document.title.substr(2);
  }
}

function showLoadingPostsPopup(text) {
  text = text || Tools.translate('Loading posts…', 'loadingPostsMessage');
  return PopupMessage.showPopup($(`<span><span class='icon-24 icon-spinner'></span><span>${text}</span></span>`)[0], {
    type: 'node',
    timeout: Constants.BILLION
  });
}

export let updateThread = async function(silent) {
  let boardName = Tools.boardName();
  let threadNumber = Tools.threadNumber();
  let posts = DOM.queryAll('.js-post:not(.temporary)');
  if (posts.length < 1) {
    return;
  }
  let lastPostNumber = +DOM.data('number', _(posts).last());
  if (!silent) {
    var popup = showLoadingPostsPopup();
  }
  try {
    let result = await AJAX.api('threadLastPostNumber', {
      boardName: boardName,
      threadNumber: threadNumber
    }, { indicator: new OverlayProgressBar() });
    if (!result.lastPostNumber) {
      throw new Error(Tools.translate('The thread was deleted', 'threadDeletedErrorText'));
    }
    let newLastPostNumber = result.lastPostNumber;
    if (newLastPostNumber <= lastPostNumber) {
      var model = { thread: { lastPosts: [] } };
    } else {
      var model = await AJAX.api(threadNumber, {}, { prefix: `${boardName}/res` });
    }
    let posts = model.thread.lastPosts.filter((post) => { return post.number > lastPostNumber; });
    if (typeof popup !== 'undefined') {
      let txt = (posts.length >= 1) ? Tools.translate('New posts:', 'newPostsText')
        : Tools.translate('No new posts', 'noNewPostsText');
      if (posts.length >= 1) {
        txt += ` ${posts.length}`;
      }
      popup.resetContent(txt);
      popup.resetTimeout();
    }
    if (posts.length < 1) {
      return;
    }
    let threadInfo = await AJAX.api('threadInfo', {
      boardName: boardName,
      threadNumber: threadNumber
    }, { indicator: new OverlayProgressBar() });
    let sequenceNumber = _(posts).last().sequenceNumber;
    posts = await Tools.series(posts, async function(post) {
      return await Posts.createPostNode(post, true, threadInfo);
    }, true);
    await Tools.series(posts, async function(post) {
      if (DOM.id(post.id)) {
        return;
      }
      $(post).addClass('new-post').one('mouseover', () => { $(post).removeClass('new-post'); });
      $('.js-thread-posts').append(post);
      return await PostProcessors.applyPostprocessors(post);
    });
    Files.initializeFiles();
    let board = Templating.board(boardName);
    if (sequenceNumber >= board.postLimit) {
      $('.js-message-post-limit-reached').show();
      $('.js-message-bump-limit-reached, .js-hr-post-limit-not-reached, .js-create-action').remove();
    } else if (sequenceNumber >= board.bumpLimit) {
      $('.js-message-bump-limit-reached').show();
    }
    if (!pageVisible) {
      if (!blinkTimer) {
        blinkTimer = new BlinkTimer();
        blinkTimer.start();
      }
      if (Settings.showAutoUpdateDesktopNotifications()) {
        let subject = DOM.queryOne('.page-title').textContent;
        let title = `[${subject}] ${Tools.translate('New posts:', 'newPostsText')} ${posts.length}`;
        let icon = `/${Tools.sitePathPrefix()}favicon.ico`;
        let post = posts[0];
        if (post.fileInfos.length > 0) {
          icon = `/${Tools.sitePathPrefix()}${boardName}/thumb/${post.fileInfos[0].thumb.name}`;
        }
        let text = post.rawText || `${boardName}/${post.number}`;
        DOM.showNotification(title, text.substr(0, Constants.MAX_THREAD_TEXT_LENGTH), icon);
      }
      if (Settings.playAutoUpdateSound()) {
        DOM.playSound();
      }
    }
  } catch (err) {
    if (typeof popup !== 'undefined') {
      popup.hide();
    }
    DOM.handleError(err);
  }
};

export async function downloadThreadFiles(boardName, threadNumber, archived) {
  boardName = Tools.option(boardName, 'string', '');
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !threadNumber) {
    return;
  }
  let suffix = archived ? 'arch' : 'res';
  try {
    if (Tools.isThreadPage()) {
      var fileNames = DOM.queryAll('.js-post-file[data-file-name]').map(div => DOM.data('fileName', div));
      var title = window.document.title;
    } else {
      let thread = await AJAX.api(threadNumber, {}, { prefix: `${boardName}/${suffix}` });
      thread = thread.thread;
      var fileNames = [thread.opPost].concat(thread.lastPosts).reduce((acc, post) => {
        return acc.concat(post.fileInfos.map(fileInfo => fileInfo.name));
      }, []);
      var title = thread.title || `${boardName} — ${thread.opPost.number}`;
    }
    let total = fileNames.length;
    if (total < 1) {
      return;
    }
    let cancel = false;
    let zip = new JSZip();
    let progressBar = new OverlayProgressBar({
      showDelay: 0,
      labelText: (loaded, total) => {
        return `${Tools.translate('Downloading files:')} ${loaded}/${total}…`;
      }
    });
    progressBar.on('abort', () => {
      cancel = true;
    });
    let last = 0;
    let prefix = `/${Tools.sitePathPrefix()}${boardName}/src`;
    let loaded = 0;
    let append = (i) => {
      if (cancel) {
        return;
      }
      let fileName = fileNames[i];
      JSZipUtils.getBinaryContent(`${prefix}/${fileName}`, (err, data) => {
        if (!err) {
          zip.file(fileName, data, { binary: true });
        }
        ++loaded;
        progressBar.onprogress({
          loaded: loaded,
          total: total
        });
        if (loaded >= total) {
          progressBar.onloadend();
          zip.generateAsync({ type: 'blob' }).then((blob) => {
            saveAs(blob, `${title}.zip`);
          });
        }
        if (last < total - 1) {
          append(++last);
        }
      });
    };
    append(last);
    if (total > 1) {
      append(++last);
    }
  } catch (err) {
    DOM.handleError(err);
  }
}

export let removeThreadFromFavorites = function(boardName, threadNumber) {
  boardName = Tools.option(boardName, 'string', '');
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !threadNumber) {
    return;
  }
  let favoriteThreads = Storage.favoriteThreads();
  let key = `${boardName}/${threadNumber}`;
  if (favoriteThreads.hasOwnProperty(key)) {
    delete favoriteThreads[key];
  }
  Storage.favoriteThreads(Tools.cloned(favoriteThreads));
};

async function addThreadToFavorites(boardName, threadNumber) {
  boardName = Tools.option(boardName, 'string', '');
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !threadNumber) {
    return;
  }
  try {
    let opPost = await AJAX.api('post', {
      boardName: boardName,
      postNumber: threadNumber
    }, { indicator: new OverlayProgressBar() });
    let result = await AJAX.api('threadLastPostNumber', {
      boardName: boardName,
      threadNumber: threadNumber
    }, { indicator: new OverlayProgressBar() });
    if (!result.lastPostNumber) {
      throw new Error(Tools.translate('The thread was deleted'));
    }
    let key = `${boardName}/${threadNumber}`;
    let favoriteThreads = Storage.favoriteThreads();
    if (favoriteThreads.hasOwnProperty(key)) {
      throw new Error(Tools.translate('The thread is already in favorites'));
    }
    let txt = opPost.subject || opPost.rawText || key;
    favoriteThreads[key] = {
      boardName: boardName,
      threadNumber: threadNumber,
      lastPostNumber: result.lastPostNumber,
      subject: txt.substring(0, MAX_FAVORITE_THREAD_TEXT_LENGTH),
      newPostCount: 0
    };
    Storage.favoriteThreads(Tools.cloned(favoriteThreads));
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function checkFavoriteThreads() {
  let favoriteThreads = Storage.favoriteThreads();
  let parameters = _(favoriteThreads).map((thread) => {
   return `${thread.boardName}:${thread.threadNumber}:${thread.lastPostNumber}`;
  });
  if (parameters.length <= 0) {
    setTimeout(checkFavoriteThreads, CHECK_FAVORITE_THREADS_INTERVAL);
    return;
  }
  try {
    let infos = await AJAX.api('threadInfos', { threads: parameters });
    favoriteThreads = Storage.favoriteThreads();
    let notifications = [];
    _(favoriteThreads).toArray().forEach((thread, i) => {
      let info = infos[i];
      if (!info) {
        thread.subject = `[404] ${thread.subject}`;
      }
      thread.lastPostNumber = info.lastPostNumber;
      if (info.newPostCount > 0) {
        thread.newPostCount += info.newPostCount;
        notifications.push({
          key: `${thread.boardName}/${thread.threadNumber}`,
          boardName: thread.boardName,
          postNumber: thread.lastPostNumber,
          threadNumber: thread.threadNumber,
          newPostCount: info.newPostCount
        });
      }
    });
    if (notifications.length > 0) {
      Storage.favoriteThreads(Tools.cloned(favoriteThreads));
      notifications = notifications.filter((notification) => {
        return (Tools.boardName() !== notification.boardName) && (Tools.threadNumber() !== notification.threadNumber);
      });
      if (notifications.length > 0) {
        if (Settings.showAutoUpdateDesktopNotifications()) {
          DOM.pushNotification(notifications);
        }
        if (Settings.playAutoUpdateSound()) {
          DOM.playSound();
        }
      }
      showFavorites();
    }
    setTimeout(checkFavoriteThreads, CHECK_FAVORITE_THREADS_INTERVAL);
  } catch (err) {
    DOM.handleError(err);
  }
}

function createGetNewPostCountFunction(lastPostNumbers, newLastPostNumbers, boardName) {
  return (boardName) => {
    if (!boardName || Tools.boardName() === boardName || !lastPostNumbers.hasOwnProperty(boardName)) {
      return 0;
    }
    let lastPostNumber = newLastPostNumbers[boardName];
    if (!lastPostNumber) {
      return 0;
    }
    let newPostCount = lastPostNumbers[boardName] - lastPostNumber;
    return (newPostCount > 0) ? newPostCount : 0;
  };
}

let showNewPostsTimer = null;

export async function showNewPosts() {
  if (showNewPostsTimer) {
    clearTimeout(showNewPostsTimer);
    showNewPostsTimer = null;
  }
  let newLastPostNumbers = Storage.lastPostNumbers();
  try {
    let result = await AJAX.api('lastPostNumbers');
    let getNewPostCount = createGetNewPostCountFunction(result, newLastPostNumbers);
    let selector = '.js-navbar .js-navbar-item-board a';
    if (Tools.deviceType('mobile')) {
      selector += ', .board-select option';
    }
    DOM.queryAll(selector).forEach((a) => {
      let boardName = DOM.data('boardName', a);
      if (!boardName) {
        return;
      }
      let isSelect = 'OPTION' === a.tagName;
      let span = isSelect ? $(a).find('.new-post-count') : $(a).parent().find('.new-post-count');
      span.remove();
      let newPostCount = getNewPostCount(boardName);
      if (!newPostCount) {
        return;
      }
      $(`<span class='new-post-count'>+${newPostCount} </span>`).insertBefore(isSelect ? $(a).children().first() : a);
    });
    if (typeof window.lord.emit === 'function') {
      window.lord.emit('lastPostNumbersReceived', getNewPostCount);
    }
    _(result).each((lastPostNumber, boardName) => {
      if (!newLastPostNumbers.hasOwnProperty(boardName)) {
        newLastPostNumbers[boardName] = lastPostNumber;
      }
    });
    if (typeof result[Tools.boardName()] === 'number') {
      newLastPostNumbers[Tools.boardName()] = result[Tools.boardName()];
    }
    let lastPostNumbers = Storage.lastPostNumbers();
    _(newLastPostNumbers).each((lastPostNumber, boardName) => {
      if (!lastPostNumbers.hasOwnProperty(boardName) || lastPostNumbers[boardName] < lastPostNumber) {
        lastPostNumbers[boardName] = lastPostNumber;
      }
    });
    Storage.lastPostNumbers(lastPostNumbers);
    showNewPostsTimer = setTimeout(showNewPosts, SHOW_NEW_POSTS_INTERVAL);
  } catch (err) {
    DOM.handleError(err);
    showNewPostsTimer = setTimeout(showNewPosts, SHOW_NEW_POSTS_FAIL_INTERVAL);
  }
}

export async function setThreadFixed(boardName, threadNumber, fixed) {
  boardName = Tools.option(boardName, 'string', '');
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !threadNumber) {
    return;
  }
  try {
    await AJAX.post(`/${Tools.sitePathPrefix()}action/setThreadFixed`, Tools.createFormData({
      boardName: boardName,
      threadNumber: threadNumber,
      fixed: !!fixed
    }), new OverlayProgressBar());
    Navigation.reloadPage();
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function setThreadClosed(boardName, threadNumber, closed) {
  boardName = Tools.option(boardName, 'string', '');
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !threadNumber) {
    return;
  }
  try {
    await AJAX.post(`/${Tools.sitePathPrefix()}action/setThreadClosed`, Tools.createFormData({
      boardName: boardName,
      threadNumber: threadNumber,
      closed: !!closed
    }), new OverlayProgressBar());
    await Posts.updatePost(threadNumber);
    let thread = $(`#thread-${threadNumber}`);
    if (closed) {
      thread.attr('data-closed', true);
    } else {
      thread.removeAttr('data-closed');
    }
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function setThreadUnbumpable(boardName, threadNumber, unbumpable) {
  boardName = Tools.option(boardName, 'string', '');
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !threadNumber) {
    return;
  }
  try {
    await AJAX.post(`/${Tools.sitePathPrefix()}action/setThreadUnbumpable`, Tools.createFormData({
      boardName: boardName,
      threadNumber: threadNumber,
      unbumpable: !!unbumpable
    }), new OverlayProgressBar());
    await Posts.updatePost(threadNumber);
    let thread = $(`#thread-${threadNumber}`);
    if (unbumpable) {
      thread.attr('data-unbumpable', true);
    } else {
      thread.removeAttr('data-unbumpable');
    }
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function moveThread(boardName, threadNumber) {
  boardName = Tools.option(boardName, 'string', '');
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !threadNumber) {
    return;
  }
  let div = Templating.template('widgets/moveThreadWidget', { boardName: boardName });
  let targetBoardName = KO.observable('');
  let password = KO.observable(Storage.password());
  let passwordVisible = KO.observable(false);
  KO.applyBindings({
    password: password,
    passwordVisible: passwordVisible,
    targetBoardName: targetBoardName,
    togglePasswordVisibility: (_, e) => {
      passwordVisible(!passwordVisible());
    },
  }, div);
  try {
    let options = {
      id: `mobeThread/${boardName}/${threadNumber}`,
      title: Tools.translate('Move thread'),
      buttons: ['cancel', 'ok']
    };
    if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: MOVE_THREAD_MIN_WIDTH,
        height: MOVE_THREAD_MIN_HEIGHT
      };
    } else {
      options.maximized = true;
    }
    let result = await Widgets.showWidget(div, options).promise;
    if (!result || !targetBoardName()) {
      return;
    }
    result = await AJAX.post(`/${Tools.sitePathPrefix()}action/moveThread`, Tools.createFormData({
      boardName: boardName,
      threadNumber: threadNumber,
      targetBoardName: targetBoardName(),
      password: password()
    }), new OverlayProgressBar());
    await Navigation.setPage(`/${Tools.sitePathPrefix()}${result.boardName}/res/${result.threadNumber}.html`);
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function expandThread(threadNumber) {
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!threadNumber) {
    return;
  }
  let thread = DOM.id(`thread-${threadNumber}`);
  if (!thread) {
    return;
  }
  $(thread).append(DOM.createLoadingMessage(Tools.translate('Loading posts…', 'loadingPostsMessage')));
  try {
    let t = await AJAX.api(threadNumber, {}, {
      prefix: `${Tools.boardName()}/res`,
      indicator: new OverlayProgressBar()
    });
    let model = { thread: t.thread };
    model.thread.expanded = !DOM.data('expanded', thread);
    if (!model.thread.expanded) {
      let board = Templating.board(Tools.boardName());
      model.thread.omittedPosts = model.thread.lastPosts.length - board.maxLastPosts;
      let offset = model.thread.lastPosts.length - board.maxLastPosts;
      model.thread.lastPosts = model.thread.lastPosts.slice(offset);
    }
    let nthread = await DOM.createDocumentFragment(Templating.template('board/thread', model, {
      noparse: true,
      boardName: Tools.boardName()
    }));
    let posts = DOM.queryAll('.js-post', nthread);
    await PostProcessors.applyPreprocessors(posts);
    $(thread).replaceWith(nthread);
    await PostProcessors.applyPostprocessors(posts);
    Files.initializeFiles();
  } catch (err) {
    DOM.handleError(err);
  }
}

export function addToOrRemoveFromFavorites(boardName, threadNumber) {
  boardName = Tools.option(boardName, 'string', '');
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !threadNumber) {
    return;
  }
  let favoriteThreads = Storage.favoriteThreads();
  if (favoriteThreads.hasOwnProperty(`${boardName}/${threadNumber}`)) {
    removeThreadFromFavorites(boardName, threadNumber);
  } else {
    addThreadToFavorites(boardName, threadNumber);
  }
}

export async function setAutoUpdateEnabled(enabled) {
  Storage.autoUpdateEnabled(Tools.boardName(), Tools.threadNumber(), enabled);
  if (Settings.useWebSockets()) {
    try {
      await WebSocket.sendMessage((enabled ? 'subscribeToThreadUpdates' : 'unsubscribeFromThreadUpdates'), {
        boardName: Tools.boardName(),
        threadNumber: Tools.threadNumber(),
      });
      updateThread(true);
    } catch (err) {
      DOM.handleError(err);
    }
  }
  if (enabled) {
    autoUpdateTimer = new AutoUpdateTimer(Settings.autoUpdateInterval());
    if (!Settings.useWebSockets()) {
      autoUpdateTimer.on('tick', updateThread.bind(null, true));
    }
    autoUpdateTimer.start();
  } else if (autoUpdateTimer) {
    autoUpdateTimer.stop();
    autoUpdateTimer = null;
  }
}

export function visibilityChangeHandler() {
  if (window.document.hidden === undefined) {
    return;
  }
  pageVisible = !window.document.hidden;
  if (!pageVisible || !blinkTimer) {
    return;
  }
  blinkTimer.stop();
  blinkTimer = null;
}

export async function updateLastPostNumbers() {
  try {
    let result = await AJAX.api('lastPostNumber', { boardName: Tools.boardName() });
    let lastPostNumbers = Storage.lastPostNumbers();
    lastPostNumbers[Tools.boardName()] = result.lastPostNumber;
    Storage.lastPostNumbers(lastPostNumbers);
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function showFavorites() {
  let options = {
    id: 'favoritesWidget',
    type: 'favoritesWidget',
    title: Tools.translate('Favorite threads'),
    rememberGeometry: true
  };
  if (Tools.deviceType('desktop')) {
    options.minSize = {
      width: FAVORITES_MIN_WIDTH,
      height: FAVORITES_MIN_HEIGHT
    };
  } else {
    options.maximized = true;
  }
  try {
    await Widgets.showWidget(null, options).promise;
  } catch (err) {
    DOM.handleError(err);
  }
}

export function initializeThreadActions(position) {
  //TODO: magic numbers
  let autoUpdateButton = $(`#thread-actions-${position} .js-auto-update-thread`);
  autoUpdateButton.knob({
    readOnly: true,
    thickness: 0.5,
    displayInput: false,
    max: 1,
    height: 22,
    width: 22,
    fgColor: AutoUpdateTimer.COLOR_1
  });
  autoUpdateButton.val(1).trigger('change'); //TODO: magic numbers
  let parent = autoUpdateButton.parent();
  parent.addClass('button-icon').attr('title', Tools.translate('Auto update', 'autoUpdateText'));
  parent.find('canvas').css({ marginBottom: -5 }); //TODO: magic numbers
  KO.applyBindings(new AutoUpdateViewModel(), DOM.id(`thread-actions-${position}`));
}

WebSocket.registerHandler('newPost', updateThread.bind(null, true), {
  priority: 0,
  test: Tools.isThreadPage
});

export function initialize() {
  Settings.useWebSockets.subscribe(async function() {
    if (!autoUpdateTimer) {
      return;
    }
    await setAutoUpdateEnabled(false);
    await setAutoUpdateEnabled(true);
  });
}
