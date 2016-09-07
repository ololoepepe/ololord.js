import _ from 'underscore';
import $ from 'jquery';
import KO from 'knockout';
import merge from 'merge';

import * as AJAX from '../helpers/ajax';
import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Navigation from '../helpers/navigation';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as PostProcessors from '../handlers/post-processors';
import * as Chat from './chat';
import * as Drawing from './drawing';
import * as Files from './files';
import * as Hiding from './hiding';
import * as Hotkeys from './hotkeys';
import * as Management from './management';
import * as Player from './player';
import * as Threads from './threads';
import * as PostForm from './post-form';
import * as Widgets from '../widgets';
import MovablePlayer from '../widgets/movable-player';
import OverlayProgressBar from '../widgets/overlay-progress-bar';

let lastPostPreview = null;
let lastPostPreviewTimer = null;
let postPreviewMask = null;

const TRACK_DATA = ['boardName', 'fileName', 'mimeType', 'width', 'height', 'extraData'];
const SOURCE_TEXT_MIN_WIDTH = 360;
const SOURCE_TEXT_MIN_HEIGHT = 420;
const BAN_USER_MIN_WIDTH = 700;
const BAN_USER_MIN_HEIGHT = 600;
const MOUSEOUT_CANCEL_DELAY = 0.5 * Constants.SECOND;

class PostViewModel {
  constructor() {
    this.shortcutSuffix = Hotkeys.shortcutSuffix;
  }

  addToPlaylist(fileName) {
    let data = DOM.data(TRACK_DATA, DOM.id(`file-${Tools.escapedSelector(fileName)}`), true);
    try {
      _(JSON.parse(data.extraData)).each((value, key) => {
        data[key] = value;
      });
    } catch (err) {
      console.log(err);
    }
    Player.addToPlaylist(data);
  }

  insertPostNumber(postNumber) {
    PostForm.insertPostNumber(postNumber);
  }

  quickReply(postNumber, threadNumber) {
    PostForm.quickReply(postNumber, threadNumber);
  }

  showPostActionsMenu(postNumber, _, e) {
    showPostActionsMenu(e, postNumber);
  }

  showImageSearchMenu(fileName, _, e) {
    showImageSearchMenu(e, fileName);
  }

  showImageHidingMenu(_, e) {
    Widgets.showMenu(e);
  }

  drawOnImage(fileName) {
    Drawing.drawOnImage($(`#file-${Tools.escapedSelector(fileName)}`)[0]);
  }

  hideByImage(fileName) {
    let file = DOM.id(`file-${Tools.escapedSelector(fileName)}`);
    if (!file) {
      return;
    }
    if (!/^image\//.test(DOM.data('mimeType', file))) {
      return;
    }
    Hiding.hideByImage({
      size: +DOM.data('sizeKB', file),
      width: +DOM.data('width', file),
      height: +DOM.data('height', file)
    });
  }

  hideByImageHash(fileName) {
    let file = DOM.id(`file-${fileName}`);
    if (!file) {
      return;
    }
    if (!/^image\//.test(DOM.data('mimeType', file))) {
      return;
    }
    Hiding.hideByImage({ hash: DOM.data('ihash', file) });
  }

  showImage(fileName, _, e) {
    e.stopPropagation();
    let file = DOM.id(`file-${Tools.escapedSelector(fileName)}`);
    let {
      boardName,
      mimeType,
      width,
      height
    } = DOM.data(['boardName', 'mimeType', 'width', 'height'], file, true);
    let loc = window.location;
    let href = `${loc.protocol}//${loc.host}/${Tools.sitePathPrefix()}${boardName}/src/${fileName}`;
    Files.showImage(href, mimeType, +width, +height);
  }

  async deleteFile(fileName) {
    try {
      let result = await Files.deleteFile(fileName);
      if (!result) {
        return;
      }
      let post = $(`#file-${Tools.escapedSelector(fileName)}`).closest('.js-post')[0];
      await updatePost(+DOM.data('number', post));
    } catch (err) {
      DOM.handleError(err);
    }
  }

  async editFileRating(fileName) {
    try {
      let file = $(`#file-${Tools.escapedSelector(fileName)}`);
      let post = file.closest('.js-post')[0];
      let result = await Files.editFileRating(fileName, DOM.data('rating', file[0]));
      if (!result) {
        return;
      }
      await updatePost(+DOM.data('number', post));
    } catch (err) {
      DOM.handleError(err);
    }
  }

  async editAudioTags(fileName, _, e) {
    e.stopPropagation();
    try {
      let result = await Player.editAudioTags(fileName);
      if (!result) {
        return;
      }
      let post = $(`#file-${Tools.escapedSelector(fileName)}`).closest('.js-post');
      if (post[0]) {
        await updatePost(+DOM.data('number', post[0]));
      }
    } catch (err) {
      DOM.handleError(err);
    }
  }
}

export let checkExpander = function(post) {
  let wrapper = $(post).find('.js-post-text-wrapper');
  let text = wrapper.find('.js-post-text');
  //NOTE: innerHeight() needs to be rounded
  if (Math.round(text.prop('scrollHeight')) <= Math.round(text.innerHeight())) {
    return;
  }
  let txt = Tools.translate('Show full text', 'expandPostTextText');
  let div = $(`<div class='post-text-expander js-post-text-expander'><a href='javascript:void(0);'>${txt}</a></div>`);
  let a = div.find('a');
  let expanded = false;
  a.click(() => {
    expanded = !expanded;
    text.css('maxHeight', expanded ? 'none' : '');
    a.empty().text(expanded ? Tools.translate('Collapse text', 'collapsePostTextText')
      : Tools.translate('Show full text', 'expandPostTextText'));
    wrapper[expanded ? 'prepend' : 'append'](div);
  });
  wrapper.append(div);
}

export function resetOwnPostLinksCSS() {
  let posts = _(Storage.ownPosts()).map((_, key) => {
    return {
      boardName: key.split('/').shift(),
      number: +key.split('/').pop()
    };
  });
  if (posts.length < 1) {
    $('#stylesheet-own-post-links').remove();
    return;
  }
  let selectorsNotOP = posts.map((post) => {
    return `:root.sign-own-post-links [data-board-name="${post.boardName}"][data-post-number="${post.number}"]::after`;
  }).join(',\n ');
  let selectorsOP = posts.map((post) => {
    return ':root.sign-own-post-links:not(.no-sign-op-post-links) '
      + `.op-post-link[data-board-name="${post.boardName}"][data-post-number="${post.number}"]::after`;
  }).join(',\n ');
  DOM.createStylesheet(`${selectorsNotOP} { content: " (You)"; }\n${selectorsOP} { content: " (You) (OP)"; }`, {
    id: 'stylesheet-own-post-links',
    replace: '#stylesheet-own-post-links'
  });
}

async function banUser(boardName, postNumber) {
  try {
    let ip = await AJAX.api('userIp', {
      boardName: Tools.boardName(),
      postNumber: postNumber
    }, { indicator: new OverlayProgressBar() });
    if (!ip) {
      throw Tools.translate('No such post');
    }
    let user = await AJAX.api('bannedUser', { ip: ip.ip }, { indicator: new OverlayProgressBar() });
    let users = KO.observableArray([Management.bannedUserToViewModel(user)]);
    users()[0].bans[boardName].postNumber = postNumber;
    let content = Management.createBannedUsersSection(users, {
      banUserCallback: () => {
        updatePost(postNumber).catch(DOM.handleError);
      }
    });
    Management.initializeBannedUser(content);
    let options = {
      id: `banUser/${boardName}/${postNumber}`,
      title: `${Tools.translate('Ban', 'banUserText')}: ${user.ipv4 || user.ip}`
    };
    if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: BAN_USER_MIN_WIDTH,
        height: BAN_USER_MIN_HEIGHT
      };
    } else {
      options.maximized = true;
    }
    await Widgets.showWidget(content, options);
  } catch (err) {
    return DOM.handleError(err);
  }
}

export function showPostActionsMenu(e, postNumber) {
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    return;
  }
  $(DOM.data('menuSelector', e.target)).remove();
  let post = DOM.id(`post-${postNumber}`);
  if (!post) {
    return;
  }
  let threadNumber = +DOM.data('threadNumber', post);
  let threadOptions = DOM.data(['fixed', 'closed', 'unbumpable', 'expanded'], $(post).closest('.js-thread')[0]);
  threadOptions.isInFavorites = Storage.favoriteThreads().hasOwnProperty(`${Tools.boardName()}/${threadNumber}`);
  let hidden = Storage.hiddenPosts()[`${Tools.boardName()}/${postNumber}`];
  let model = {
    post: {
      number: postNumber,
      rawText: DOM.queryOne('.js-post-text', post).textContent,
      fileInfos: DOM.queryAll('.js-post-file', post),
      isOp: $(post).hasClass('op-post'),
      hidden: hidden && hidden.hidden
    },
    thread: threadOptions,
    isThreadPage: Tools.isThreadPage(),
    archived: Tools.isArchivedThreadPage()
  };
  let menu = Templating.template('post/actionsMenu', model, { boardName: Tools.boardName() });
  KO.applyBindings({
    shortcutSuffix: Hotkeys.shortcutSuffix,
    showPostSourceText: showPostSourceText.bind(null, Tools.boardName(), postNumber),
    editPost: editPost.bind(null, Tools.boardName(), postNumber),
    addFiles: async function() {
      try {
        let result = await Files.addFiles(Tools.boardName(), postNumber, +DOM.data('fileCount', post));
        if (!result) {
          return;
        }
        await updatePost(postNumber);
      } catch (err) {
        DOM.handleError(err);
      }
    },
    setPostHidden: Hiding.setPostHidden.bind(null, Tools.boardName(), postNumber, threadNumber),
    hideSimilarPosts: Hiding.hideSimilarPosts.bind(null, Tools.boardName(), postNumber, threadNumber,
      DOM.data('plainText', post)),
    deletePost: deletePost.bind(null, Tools.boardName(), postNumber, Tools.isArchivedThreadPage()),
    addToOrRemoveFromFavorites: Threads.addToOrRemoveFromFavorites.bind(null, Tools.boardName(), threadNumber),
    downloadThreadFiles: Threads.downloadThreadFiles.bind(null, Tools.boardName(), threadNumber, model.archived),
    expandCollapseThread: Threads.expandThread.bind(null, threadNumber),
    setThreadFixed: Threads.setThreadFixed.bind(null, Tools.boardName(), threadNumber, !model.thread.fixed),
    setThreadClosed: Threads.setThreadClosed.bind(null, Tools.boardName(), threadNumber, !model.thread.closed),
    setThreadUnbumpable: Threads.setThreadUnbumpable.bind(null, Tools.boardName(), threadNumber,
      !model.thread.unbumpable),
    moveThread: Threads.moveThread.bind(null, Tools.boardName(), threadNumber),
    chatWithUser: Chat.chatWithUser.bind(null, Tools.boardName(), postNumber),
    showUserInfo: Management.showUserInfo.bind(null, Tools.boardName(), postNumber),
    banUser: banUser.bind(null, Tools.boardName(), postNumber)
  }, menu);
  post.appendChild(menu);
  return Widgets.showMenu(e);
}

export function showImageSearchMenu(e, fileName) {
  $(DOM.data('menuSelector', e.target)).remove();
  let file = DOM.id(`file-${Tools.escapedSelector(fileName)}`);
  if (!file) {
    return;
  }
  file.appendChild(Templating.template('file/imageSearchMenu', {
    fileInfo: { name: fileName },
    siteProtocol: window.location.protocol,
    siteDomain: window.location.host
  }, { boardName: Tools.boardName() }));
  return Widgets.showMenu(e);
}

async function showPostSourceText(boardName, postNumber) {
  boardName = Tools.option(boardName, 'string', '');
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !postNumber) {
    return;
  }
  try {
    let post = await AJAX.api('post', {
      boardName: boardName,
      postNumber: postNumber
    }, { indicator: new OverlayProgressBar() });
    Widgets.prompt({
      id: `postSourceText/${boardName}/${postNumber}`,
      title: Tools.translate('Source text', 'postSourceText'),
      minSize: {
        width: SOURCE_TEXT_MIN_WIDTH,
        height: SOURCE_TEXT_MIN_HEIGHT
      },
      type: 'textarea',
      value: post.rawText,
      readOnly: true
    });
  } catch (err) {
    DOM.handleError(err);
  }
}

async function deletePost(boardName, postNumber, archived) {
  boardName = Tools.option(boardName, 'string', '');
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !postNumber) {
    return;
  }
  try {
    let { accepted, password } = await Widgets.requestPassword({ id: `deletePost/${boardName}/${postNumber}` });
    if (!accepted) {
      return;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/deletePost`, Tools.createFormData({
      boardName: boardName,
      postNumber: postNumber,
      password: password,
      archived: archived
    }), new OverlayProgressBar());
    let ownPosts = Storage.ownPosts();
    let key = `${boardName}/${postNumber}`;
    if (ownPosts.hasOwnProperty(key)) {
      delete ownPosts[key];
    }
    Storage.ownPosts(Tools.cloned(ownPosts));
    let post = DOM.id(`post-${postNumber}`);
    if (!post) {
      throw new Error(Tools.translate('No such post', 'noSuchPostErrorText'));
    }
    if (DOM.data('isOp', post)) {
      if (Tools.isThreadPage()) {
        await Navigation.setPage(`/${Tools.sitePathPrefix()}${boardName}${archived ? '/archive.html' : ''}`);
      } else {
        Navigation.reloadPage();
      }
      return;
    } else {
      $(post).remove();
    }
    removeReferences(postNumber);
  } catch (err) {
    DOM.handleError(err);
  }
}

async function editPost(boardName, postNumber) {
  boardName = Tools.option(boardName, 'string', '');
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !postNumber) {
    return;
  }
  try {
    let post = await AJAX.api('post', {
      boardName: boardName,
      postNumber: postNumber
    }, { indicator: new OverlayProgressBar() });
    let options = {
      id: `editPostWidget/${boardName}/${postNumber}`,
      type: 'editPostWidget',
      title: Tools.translate('Edit', 'editPostText'),
      buttons: ['cancel', 'ok'],
      post: post
    };
    if (Tools.deviceType('mobile')) {
      options.maximized = true;
    }
    let widget = Widgets.showWidget(null, options);
    let accepted = await widget.promise;
    if (!accepted) {
      return;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/editPost`, widget.createData(), new OverlayProgressBar());
    removeReferences(postNumber, true);
    await updatePost(postNumber);
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function updatePost(postNumber) {
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    return;
  }
  let post = DOM.id(`post-${postNumber}`);
  if (!post) {
    return Promise.reject(Tools.translate('No such post', 'noSuchPostErrorText'));
  }
  try {
    let model = await AJAX.api('post', {
      boardName: Tools.boardName(),
      postNumber: postNumber
    }, { indicator: new OverlayProgressBar() });
    let newPost = await createPostNode(model, true);
    $(post).replaceWith(newPost);
    await PostProcessors.applyPostprocessors(newPost);
  } catch (err) {
    return Promise.reject(err);
  }
}

async function viewPost(a, boardName, postNumber, hiddenPost) {
  boardName = Tools.option(boardName, 'string', '');
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !postNumber) {
    return;
  }
  let previousPostPreview = lastPostPreview;
  if (Tools.boardName() === boardName) {
    var post = DOM.id(postNumber);
  }
  try {
    if (post) {
      post = post.cloneNode(true);
    } else {
      post = await AJAX.api('post', {
        boardName: boardName,
        postNumber: postNumber
      }, { indicator: new OverlayProgressBar() });
      post = await createPostNode(post, false);
    }
    $(post).removeClass('op-post').addClass('reply-post temporary-post').find('.js-hiding-reason, '
     + '.js-post-actions-button-container, .js-quick-reply-container, .js-reply-to-thread-button-container').remove();
    if (Tools.deviceType('desktop')) {
      post.addEventListener('mouseout', (e) => {
        let next = post;
        while (next) {
          let list = DOM.traverseChildren(next);
          let target = e.toElement || e.relatedTarget;
          if (list.indexOf(target) >= 0) {
            return;
          }
          next = next.nextPostPreview;
        }
        post.hideTimer = setTimeout(() => {
          if (post.parentNode) {
            $(post).remove();
          }
          if (post.previousPostPreview) {
            post.previousPostPreview.dispatchEvent(e);
          }
        }, Settings.hidePostPreviewDelay());
      });
      post.addEventListener('mouseover', (e) => {
        post.mustHide = false;
        if (post.hideTimer) {
          clearTimeout(post.hideTimer);
          delete post.hideTimer;
        }
      });
    }
    post.previousPostPreview = lastPostPreview;
    if (lastPostPreview) {
      lastPostPreview.nextPostPreview = post;
    }
    lastPostPreview = post;
    post.mustHide = true;
    if (lastPostPreviewTimer) {
      clearTimeout(lastPostPreviewTimer);
      lastPostPreviewTimer = null;
    }
    window.document.body.appendChild(post);
    if (Tools.deviceType('desktop')) {
      let doPosition = () => {
        $(post).position({
          my: 'left top',
          at: 'center bottom+2',
          of: a,
          collision: 'flipfit flip'
        });
      };
      //NOTE: Yep, positioning is don in three steps.
      //This may look like a hack, but it is more like how browsers render.
      doPosition();
      setTimeout(() => {
        doPosition();
        setTimeout(doPosition);
      });
    } else {
      //NOTE: Yep, positioning is done in two steps.
      //This may look like a hack, but it is more like how browsers render.
      $(post).addClass('cursor-pointer').position({});
      setTimeout(() => {
        $(post).position({});
      });
      if (!postPreviewMask) {
        postPreviewMask = $('<div class="temporary-post-overlay-mask cursor-pointer"></div>');
        $(window.document.body).append(postPreviewMask);
      }
    }
  } catch (err) {
    DOM.handleError(err);
  }
}

export let removeReferences = function(postNumber, referencedOnly) {
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    return;
  }
  DOM.queryAll(`a[data-board-name='${Tools.boardName()}'][data-post-number='${postNumber}']`).forEach((a) => {
    let parent = a.parentNode;
    if ($(parent).hasClass('.js-referring-posts')) {
      parent.removeChild(a);
      if (parent.children.length <= 1) {
        $(parent).empty();
      }
    } else if (!referencedOnly) {
      parent.replaceChild(DOM.node('text', a.textContent), a);
    }
  });
};

export function globalClickHandler(e) {
  if (e.button) {
    return;
  }
  if (!e.target || !$(e.target).hasClass('ui-widget-header')) {
    Widgets.hideMenu();
  }
  let t = e.target;
  if ('A' === t.tagName) {
    if (Tools.deviceType('mobile')) {
      let boardName = Tools.option(DOM.data('boardName', t), 'string', '');
      let postNumber = Tools.option(+DOM.data('postNumber', t), 'number', 0, { test: Tools.testPostNumber });
      if (boardName && postNumber && $(t).hasClass('js-post-link')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        viewPost(t, boardName, postNumber);
      }
    }
    return;
  }
  if (Tools.deviceType('mobile')) {
    let post = lastPostPreview;
    if (post && post.parentNode) {
      $(post).remove();
      lastPostPreview = post.previousPostPreview || null;
      if (!lastPostPreview && postPreviewMask) {
        postPreviewMask.remove();
        postPreviewMask = null;
      }
      return;
    }
  }
  if (MovablePlayer.hasActivePlayers() && !Settings.closeFilesByClickingOnly()) {
    Files.hideImage();
  }
}

export function globalMouseoverHandler(e) {
  if (!Tools.deviceType('desktop')) {
    return;
  }
  let a = e.target;
  if ('A' !== a.tagName) {
    return;
  }
  let boardName = DOM.data('boardName', a);
  let postNumber = Tools.option(+DOM.data('postNumber', a), 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !postNumber || !$(a).hasClass('js-post-link')) {
    return;
  }
  a.viewPostTimer = setTimeout(() => {
    delete a.viewPostTimer;
    viewPost(a, boardName, postNumber, DOM.data('hiddenPost', a) === 'true');
  }, Settings.viewPostPreviewDelay());
}

export function globalMouseoutHandler(e) {
  if (!Tools.deviceType('desktop')) {
    return;
  }
  let a = e.target;
  if ('A' !== a.tagName) {
    return;
  }
  let boardName = DOM.data('boardName', a);
  let postNumber = Tools.option(+DOM.data('postNumber', a), 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !postNumber || !$(a).hasClass('js-post-link')) {
    return;
  }
  if (a.viewPostTimer) {
    clearTimeout(a.viewPostTimer);
    delete a.viewPostTimer;
  } else {
    lastPostPreviewTimer = setTimeout(function() {
      if (!lastPostPreview) {
        return;
      }
      if (lastPostPreview.mustHide && lastPostPreview.parentNode)
        lastPostPreview.parentNode.removeChild(lastPostPreview);
    }, MOUSEOUT_CANCEL_DELAY);
  }
}

function procerssReferencedPosts(post) {
  post.referencedPosts.filter((reference) => {
    return (reference.boardName === Tools.boardName()) && DOM.id(`post-${reference.postNumber}`);
  }).forEach((reference) => {
    let targetPost = DOM.id(`post-${reference.postNumber}`);
    let referencedBy = DOM.queryOne('.js-referring-posts', targetPost);
    let any = DOM.queryAll('a', referencedBy).some((ref) => {
      return (DOM.data('boardName', ref) === post.boardName) && (+DOM.data('postNumber', ref) === post.number);
    });
    if (any) {
      return;
    }
    if (!DOM.queryOne('a', referencedBy)) {
      $(referencedBy).text(Tools.translate('Replies:', 'referencedByText'));
    }
    let a = Templating.template('post/reference', {
      reference: {
        boardName: post.boardName,
        postNumber: post.number,
        threadNumber: post.threadNumber,
        user: post.user
      }
    }, { boardName: Tools.boardName() });
    referencedBy.appendChild(DOM.node('text', ' '));
    referencedBy.appendChild(a);
  });
}

export let createPostNode = async function(post, permanent, threadInfo) {
  if (typeof permanent === 'undefined') {
    permanent = true;
  }
  try {
    if (!threadInfo) {
      threadInfo = await AJAX.api('threadInfo', {
        boardName: post.boardName,
        threadNumber: post.threadNumber
      }, { indicator: new OverlayProgressBar() });
    }
    let node = Templating.template('post/post', {
      thread: threadInfo,
      post: post,
      isThreadPage: Tools.isThreadPage(),
      archived: Tools.isArchivedThreadPage()
    }, { boardName: post.boardName });
    if (Tools.deviceType('mobile')) {
      DOM.queryAll('.js-with-tooltip', node).forEach((n) => { DOM.setTooltip(n); });
    }
    if (permanent) {
      let lastPostNumbers = Storage.lastPostNumbers();
      let lastPostNumber = lastPostNumbers[post.boardName];
      if (isNaN(lastPostNumber) || post.number > lastPostNumber) {
        lastPostNumbers[post.boardName] = post.number;
        Storage.lastPostNumbers(lastPostNumbers);
      }
    }
    try {
      await PostProcessors.applyPreprocessors(node);
    } catch (err) {
      DOM.handleError(err);
    }
    if (permanent && post.referencedPosts && post.referencedPosts.length > 0) {
      procerssReferencedPosts(post);
    }
    return node;
  } catch (err) {
    return Promise.reject(err);
  }
};

PostProcessors.registerPreprocessor(DOM.processFormattedDate, { priority: 0 });

PostProcessors.registerPreprocessor((post) => {
  KO.applyBindings(new PostViewModel(), post);
}, { priority: 10 });

PostProcessors.registerPostprocessor(checkExpander, {
  priority: 0,
  test: function() {
    return Settings.addExpander();
  }
});

export function initialize() {
  Storage.ownPosts.subscribe(resetOwnPostLinksCSS);
  Settings.addExpander.subscribe((value) => {
    if (value) {
      $('.js-post-text').scrollTop(0);
      DOM.queryAll('.js-post').forEach(checkExpander);
    } else {
      $('.js-post-text-expander').remove();
      $('.js-post-text').css('max-height', '');
    }
  });
}
