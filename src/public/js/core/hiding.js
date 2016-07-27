import _ from 'underscore';
import $ from 'jquery';
import bigInt from 'big-integer';

import * as DOM from '../helpers/dom';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as Worker from '../worker';
import * as PostProcessors from '../handlers/post-processors';
import * as Widgets from '../widgets';

const HIDDEN_POST_LIST_MIN_WIDTH = 400;
const HIDDEN_POST_LIST_MIN_HEIGHT = 400;

let spellsRoot = null;

export function resetHiddenPostsCSS() {
  let posts = _(Storage.hiddenPosts()).map((value, key) => {
    return {
      boardName: key.split('/').shift(),
      number: +key.split('/').pop(),
      hidden: value.hidden
    };
  }).filter(post => post.hidden);
  if (posts.length < 1) {
    $('#stylesheet-hidden-posts').remove();
    return;
  }
  let selectorsPosts = posts.map((post) => {
    let nameNumberSelector = `[data-board-name='${post.boardName}'][data-number='${post.number}']`;
    let postSelector = `.post:not(.temporary-post):not(:hover)${nameNumberSelector}`;
    return `${postSelector} .post-body, ${postSelector} ~ .thread-info, ${postSelector} ~ .thread-posts`;
  }).join(',\n');
  let selectorsLinks = posts.map((post) => {
    let nameNumberSelector = `[data-board-name='${post.boardName}'][data-post-number='${post.number}']`;
    return `:root.strike-out-hidden-post-links :not(.post-number):not(.hidden-post-link)${nameNumberSelector}`;
  }).join(',\n');
  let css = `${selectorsPosts} { display: none; }\n${selectorsLinks} { text-decoration: line-through; }`;
  DOM.createStylesheet(css, {
    id: 'stylesheet-hidden-posts',
    replace: '#stylesheet-hidden-posts'
  });
}

Storage.hiddenPosts.subscribe(resetHiddenPostsCSS);

export function addPostToHidden(boardName, postNumber, threadNumber, { hiddenPosts, reason } = {}) {
  boardName = Tools.option(boardName, 'string', '');
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !postNumber || !threadNumber) {
    return;
  }
  let key = `${boardName}/${postNumber}`;
  let saveHiddenPosts = !hiddenPosts;
  if (!hiddenPosts) {
    hiddenPosts = Storage.hiddenPosts();
  }
  if (hiddenPosts.hasOwnProperty(key)) {
    return;
  }
  hiddenPosts[key] = {
    boardName: boardName,
    postNumber: postNumber,
    threadNumber: threadNumber,
    hidden: true,
    reason: reason || null
  };
  if (saveHiddenPosts) {
    Storage.hiddenPosts(Tools.cloned(hiddenPosts));
  }
}

export function hideSimilarPosts(boardName, postNumber, threadNumber, plainText) {
  boardName = Tools.option(boardName, 'string', '');
  postNumber = Tools.option(postNumber, 'number', 0, { test: (pn) => { return pn > 0; } });
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: (tn) => { return tn > 0; } });
  plainText = Tools.option(plainText, 'string', '');
  if (!boardName || !postNumber || !threadNumber || !plainText) {
    return;
  }
  let post = DOM.id(`post-${postNumber}`);
  if (!post) {
    return;
  }
  if ($(post).hasClass('hidden-post')) {
    return;
  }
  let similarText = Storage.similarText();
  let key = `${boardName}/${postNumber}`;
  if (similarText.hasOwnProperty(key)) {
    return;
  }
  similarText[key] = Tools.getWords(text);
  Storage.similarText(similarText);
  $(post).addClass('hidden-post');
  $('.hiding-eason', post).empty();
  $(`#thread-${postNumber}`).addClass('hidden-thread');
  let reason = `similar to >>/${boardName}/${postNumber}`;
  addPostToHidden(boardName, postNumber, threadNumber, { reason: reason });
  applySpells(DOM.queryAll('.post')).catch(DOM.handleError);
}

export function setPostHidden(boardName, postNumber, threadNumber) {
  boardName = Tools.option(boardName, 'string', '');
  postNumber = Tools.option(postNumber, 'number', 0, { test: (pn) => { return pn > 0; } });
  threadNumber = Tools.option(threadNumber, 'number', 0, { test: (tn) => { return tn > 0; } });
  if (!boardName || !postNumber || !threadNumber) {
    return;
  }
  let hiddenPosts = Storage.hiddenPosts();
  let key = `${boardName}/${postNumber}`;
  let info = hiddenPosts[key];
  if (!info) {
    addPostToHidden(boardName, postNumber, threadNumber);
  } else {
    info.hidden = !info.hidden;
    Storage.hiddenPosts(Tools.cloned(hiddenPosts));
    let similarText = Storage.similarText();
    if (similarText.hasOwnProperty(key)) {
      delete similarText[key];
      Storage.similarText(similarText);
    }
  }
}

function getPostData(post, hiddenPosts) {
  if (!post) {
    return null;
  }
  let boardName = DOM.data('boardName', post);
  let postNumber = +DOM.data('number', post);
  let blockquote = DOM.queryOne('blockquote', post);
  let trip = DOM.queryOne('.js-tripcode', post);
  let files = DOM.queryAll('.post-file', post).map((file) => {
    return {
      href: DOM.data('href', file),
      mimeType: DOM.data('mimeType', file),
      ihash: DOM.data('ihash', file) || null,
      size: +DOM.data('sizeKB', file),
      sizeText: DOM.data('sizeText', file),
      width: +DOM.data('width', file),
      height: +DOM.data('height', file)
    };
  });
  let videos = DOM.queryAll('[data-video-id]', blockquote).map((span) => {
    return {
      title: DOM.data('videoTitle', span),
      author: DOM.data('videoAuthor', span)
    };
  });
  return {
    boardName: boardName,
    threadNumber: +DOM.data('threadNumber', post),
    postNumber: postNumber,
    hidden: (hiddenPosts || Storage.hiddenPosts()).hasOwnProperty(`${boardName}/${postNumber}`),
    innerHTML: post.innerHTML,
    text: DOM.data('plainText', post) || '',
    textHTML: blockquote.innerHTML,
    sage: !!DOM.queryOne('.js-sage', post),
    tripcode: (trip ? trip.textContent : null),
    userName: DOM.queryOne('.js-post-name', post).textContent,
    isDefaultUserName: !!DOM.queryOne('.js-post-name-default', post),
    subject: DOM.queryOne('.js-post-subject', post).textContent,
    isDefaultSubject: !!DOM.queryOne('.js-post-subject-default', post),
    files: ((files.length > 0) ? files : null),
    videos: ((videos.length > 0) ? videos : null)
  };
}

function processPost(hiddenPosts, post, data) {
  if (!post) {
    return;
  }
  let postNumber = Tools.option(+DOM.data('number', post), 'number', 0, { test: Tools.testPostNumber });
  if (!postNumber) {
    return;
  }
  if (data) {
    if (data.replacements && data.replacements.length > 0) {
      _(data.replacements).each((value) => {
        if (typeof value.innerHTML === 'string') {
          post.innerHTML = value.innerHTML;
        }
      });
    }
    if (data.hidden) {
      addPostToHidden(data.boardName, data.postNumber, data.threadNumber, {
        reason: data.hidden,
        hiddenPosts: hiddenPosts
      });
    }
  }
  hiddenPosts = hiddenPosts || Storage.hiddenPosts();
  let info = hiddenPosts[`${Tools.boardName()}/${postNumber}`];
  if (info && info.reason) { //TODO: Leave reason of manually unhidden posts?
    $('.hiding-reason', post).text(info.reason);
  }
}

function process(hiddenPosts, list, map) {
  list.forEach((post) => {
    processPost(hiddenPosts, post, map ? map[+DOM.data('number', post)] : undefined);
  });
  Storage.hiddenPosts(Tools.cloned(hiddenPosts));
}

Settings.spellsEnabled.subscribe((value) => {
  if (value) {
    applySpells(DOM.queryAll('.post'));
  }
});

Storage.spells.subscribe(() => {
  if (Settings.spellsEnabled()) {
    applySpells(DOM.queryAll('.post'), true);
  }
});

export async function applySpells(posts, force) {
  if (!_(posts).isArray()) {
    posts = [posts];
  }
  posts = posts.filter(post => !!post);
  if (posts.length < 1) {
    return;
  }
  try {
    if (force) {
      spellsRoot = null;
    }
    if (!spellsRoot) {
      let result = await Worker.doWork('parseSpells', Storage.spells());
      spellsRoot = (result && result.root && result.root.spells) || null;
    }
    let hiddenPosts = Storage.hiddenPosts();
    if (spellsRoot) {
      let promises = Tools.chunk(posts, 100).map((chunk) => {
        try {
          var similarText = window.localStorage.getItem('similarText') || '';
        } catch (ex) {
          var similarText = '';
        }
        Worker.doWork('processPosts', {
          posts: chunk.map(getPostData),
          spells: spellsRoot,
          options: {
            ihashDistance: Settings.ihashDistance(),
            similarText: similarText
          }
        }).then((result) => {
          let map = (result && result.posts) ? result.posts.reduce((acc, data) => {
            acc[data.postNumber] = data;
            return acc;
          }, {}) : {};
          process(hiddenPosts, chunk, map);
        });
      });
      await Promise.all(promises);
    } else {
      process(hiddenPosts, posts);
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

export async function processPosts(parent) {
  parent = parent || window.document.body;
  let posts = ($(parent).hasClass('post') || $(parent).hasClass('opPost')) ? [parent]
    : DOM.queryAll('.post', parent);
  try {
    await PostProcessors.applyPreprocessors(posts);
    if (Settings.spellsEnabled()) {
      applySpells(posts).catch(DOM.handleError);
    } else {
      posts.forEach(process.bind(null, Storage.hiddenPosts()));
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

export function hideByImage({ hash, size, width, height } = {}) {
  let spells = Storage.spells();
  if (spells && _(spells).last() !== '\n') {
    spells += '\n';
  }
  if (hash) {
    spells += `#ihash(${hash})`;
  } else {
    spells += `#img(=${size}@${width}x${height})`;
  }
  Storage.spells(spells);
  if (Settings.spellsEnabled()) {
    applySpells(DOM.queryAll('.post'), true).catch(DOM.handleError);
  }
}

export async function showHiddenPostList() {
  let options = {
    id: 'hiddenPostList',
    type: 'hiddenPostList',
    title: Tools.translate('Hidden posts/threads'),
    rememberGeometry: true
  };
  if (Tools.deviceType('desktop')) {
    options.minSize = {
      width: HIDDEN_POST_LIST_MIN_WIDTH,
      height: HIDDEN_POST_LIST_MIN_HEIGHT
    };
  } else {
    options.maximized = true;
  }
  return await Widgets.showWidget(null, options).promise;
}

export function removeHidden(boardName, postNumber) {
  boardName = Tools.option(boardName, 'string', '');
  postNumber = Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber });
  if (!boardName || !postNumber) {
    return;
  }
  let hiddenPosts = Storage.hiddenPosts();
  let key = `${boardName}/${postNumber}`;
  let info = hiddenPosts[key];
  if (!info) {
    return;
  }
  if (info.hidden) {
    info.hidden = false;
  } else {
    delete hiddenPosts[key];
    $(`#post-${postNumber}[data-board-name='${boardName}'] .hiding-reason`).empty();
  }
  Storage.hiddenPosts(Tools.cloned(hiddenPosts));
  let similarText = Storage.similarText();
  if (similarText.hasOwnProperty(key)) {
    delete similarText[key];
    Storage.similarText(similarText);
  }
};
