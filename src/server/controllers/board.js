import _ from 'underscore';
import express from 'express';
import FS from 'q-io/fs';
import moment from 'moment';
import promisify from 'promisify-node';

import Board from '../boards/board';
import * as Files from '../core/files';
import * as Renderer from '../core/renderer';
import * as Cache from '../helpers/cache';
import config from '../helpers/config';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import * as BoardsModel from '../models/boards';
import * as MiscModel from '../models/misc';
import * as PostsModel from '../models/posts';
import * as ThreadsModel from '../models/threads';
import mongodbClient from '../storage/mongodb-client-factory';

const mkpath = promisify('mkpath');

const RSS_DATE_TIME_FORMAT = 'ddd, DD MMM YYYY HH:mm:ss +0000';

let client = mongodbClient();
let router = express.Router();

function pickPostsToRerender(oldPosts, posts) {
  return _(posts).pick((post, postNumber) => {
    let oldPost = oldPosts[postNumber];
    if (!oldPost) {
      return true;
    }
    if (oldPost.options.bannedFor !== post.options.bannedFor) {
      return true;
    }
    if (oldPost.sequenceNumber !== post.sequenceNumber) {
      return true;
    }
    if (oldPost.updatedAt < post.updatedAt) {
      return true;
    }
    if (oldPost.text !== post.text) {
      return true;
    }
    let oldRefs = oldPost.referringPosts.reduce((acc, ref) => {
      return `${acc};${ref.boardName}:${ref.postNumber}`;
    }, '');
    let newRefs = post.referringPosts.reduce((acc, ref) => {
      return `${acc};${ref.boardName}:${ref.postNumber}`;
    }, '');
    if (oldRefs !== newRefs) {
      return true;
    }
    let oldFileInfos = oldPost.fileInfos.reduce((acc, fileInfo) => {
      return `${acc};${fileInfo.fileName}:${JSON.stringify(fileInfo.extraData)}`;
    }, '');
    let newFileInfos = post.fileInfos.reduce((acc, fileInfo) => {
      return `${acc};${fileInfo.fileName}:${JSON.stringify(fileInfo.extraData)}`;
    }, '');
    if (oldFileInfos !== newFileInfos) {
      return true;
    }
  });
}

async function renderThreadHTML(thread, { prerendered } = {}) {
  let board = Board.board(thread.boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let model = {
    thread: thread,
    title: thread.title || `${board.title} — ${thread.number}`,
    isThreadPage: true,
    board: MiscModel.board(board).board,
    threadNumber: thread.number,
    prerendered: prerendered
  };
  let data = Renderer.render('pages/thread', model);
  await Cache.writeFile(`${thread.boardName}/res/${thread.number}.html`, data);
}

async function renderThread(boardName, threadNumber) {
  let thread = await BoardsModel.getThread(boardName, threadNumber);
  await Renderer.renderThread(thread);
  await Cache.writeFile(`${boardName}/res/${threadNumber}.json`, JSON.stringify({ thread: thread }));
  await renderThreadHTML(thread);
}

function getPrerenderedPost(html, postNumber) {
  let startIndex = html.indexOf(`<div id='post-${postNumber}'`);
  if (startIndex < 0) {
    return;
  }
  let endPattern = `<!--__ololord_end_post#${postNumber}-->`;
  let endIndex = html.lastIndexOf(endPattern);
  if (endIndex < 0) {
    return;
  }
  return html.substring(startIndex, endIndex + endPattern.length);
}

async function renderPage(boardName, pageNumber, { allowPrerender } = {}) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let page = await BoardsModel.getPage(boardName, pageNumber);
  await Tools.series(page.threads, async function(thread) {
    return await Renderer.renderThread(thread);
  });
  let pageID = (pageNumber > 0) ? pageNumber : 'index';
  if (allowPrerender) {
    let pageJSON = await Cache.readFile(`${boardName}/${pageNumber}.json`);
    pageJSON = JSON.parse(pageJSON);
    let pageHTML = await Cache.readFile(`${boardName}/${pageID}.html`);
    let mustRender = page.threads.some((thread) => { return (allowPrerender === thread.number); });
    let lastPosts = pageJSON.threads.map((thread) => {
      let posts = thread.lastPosts.concat(thread.opPost);
      if (allowPrerender === thread.number) {
        posts.splice(-1, 1);
      }
      return posts;
    });
    lastPosts = _(lastPosts).flatten().reduce((acc, post) => {
      acc[post.number] = post;
      return acc;
    }, {});
    let posts = page.threads.map((thread) => {
      let posts = thread.lastPosts.concat(thread.opPost);
      if (allowPrerender === thread.number) {
        posts.splice(-1, 1);
      }
      return posts;
    });
    posts = _(posts).flatten().reduce((acc, post) => {
      acc[post.number] = post;
      return acc;
    }, {});
    lastPosts = _(lastPosts).pick((_1, postNumber) => posts.hasOwnProperty(postNumber));
    let postsToRerender = pickPostsToRerender(lastPosts, posts);
    if (!mustRender && _(postsToRerender).isEmpty()) {
      return;
    }
    let prerendered = _(lastPosts).pick((_1, postNumber) => !postsToRerender.hasOwnProperty(postNumber));
    prerendered = _(prerendered).mapObject((_1, postNumber) => {
      return getPrerenderedPost(pageHTML, postNumber);
    });
    await Cache.writeFile(`${boardName}/${pageNumber}.json`, JSON.stringify(page));
    page.prerendered = prerendered;
  } else {
    await Cache.writeFile(`${boardName}/${pageNumber}.json`, JSON.stringify(page));
  }
  page.title = board.title;
  page.board = MiscModel.board(board).board;
  await Cache.writeFile(`${boardName}/${pageID}.html`, Renderer.render('pages/board', page));
}

async function renderPages(boardName, { allowPrerender } = {}) {
  let pageCount = await BoardsModel.getPageCount(boardName);
  return await Tools.series(_.range(pageCount), async function(pageNumber) {
    return await renderPage(boardName, pageNumber, { allowPrerender });
  });
};

router.paths = async function(description) {
  if (description) {
    return [{
      path: '/<board name>',
      description: Tools.translate('Board pages (from 0 to N)')
    }, {
      path: '/<board name>/archive',
      description: Tools.translate('Board archive page (WITHOUT the archived threads)')
    }, {
      path: '/<board name>/catalog',
      description: Tools.translate('Board catalog page')
    }, {
      path: '/<board name>/rss',
      description: Tools.translate('Board RSS feed')
    }, {
      path: '/<board name>/res/<thread number>',
      description: Tools.translate('A thread')
    }];
  }
  let arrays = await Tools.series(Board.boardNames(), async function(boardName) {
    let threadNumbers = await ThreadsModel.getThreadNumbers(boardName);
    let archivedThreadNumbers = await ThreadsModel.getThreadNumbers(boardName, { archived: true });
    threadNumbers = threadNumbers.concat(archivedThreadNumbers).sort();
    let paths = [`/${boardName}`, `/${boardName}/archive`, `/${boardName}/catalog`, `/${boardName}/rss`];
    return paths.concat(threadNumbers.map(threadNumber => `/${boardName}/res/${threadNumber}`));
  }, true);
  return _(arrays).flatten();
};

router.renderThread = async function(key, data) {
  if (!_(data).isArray()) {
    data = [data];
  }
  let mustCreate = data.some((d) => { return 'create' === d.action; });
  let mustDelete = data.some((d) => { return 'delete' === d.action; });
  if (mustCreate && mustDelete) {
    return; //NOTE: This should actually never happen
  }
  data = data.reduce((acc, d) => {
    if (!acc) {
      return d;
    }
    if (d.action < acc.action) {
      return d;
    }
    return acc;
  });
  let board = Board.board(data.boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  switch (data.action) {
  case 'create': {
    await renderThread(data.boardName, data.threadNumber);
    break;
  }
  case 'edit': {
    let threadID = `${data.boardName}/res/${data.threadNumber}`;
    let threadData = await Cache.readFile(`${threadID}.json`);
    let model = JSON.parse(threadData);
    let thread = model.thread;
    let lastPosts = thread.lastPosts.reduce((acc, post) => {
      acc[post.number] = post;
      return acc;
    }, {});
    thread = await BoardsModel.getThread(data.boardName, data.threadNumber);
    let posts = thread.lastPosts.reduce((acc, post) => {
      acc[post.number] = post;
      return acc;
    }, {});
    lastPosts = _(lastPosts).pick((_1, postNumber) => posts.hasOwnProperty(postNumber));
    let postsToRerender = pickPostsToRerender(lastPosts, posts);
    let threadHTML = await Cache.readFile(`${threadID}.html`);
    let prerendered = _(lastPosts).pick((_1, postNumber) => !postsToRerender.hasOwnProperty(postNumber));
    prerendered = _(prerendered).mapObject((_1, postNumber) => {
      return getPrerenderedPost(threadHTML, postNumber);
    });
    await Files.renderPostFileInfos(thread.opPost);
    thread.opPost = await board.renderPost(thread.opPost);
    await Tools.series(postsToRerender, async function(post, postNumber) {
      await Files.renderPostFileInfos(post);
      let renderedPost = await board.renderPost(post);
      lastPosts[postNumber] = renderedPost;
    });
    thread.lastPosts = _(lastPosts).toArray();
    model.thread = thread;
    await Cache.writeFile(`${threadID}.json`, JSON.stringify(model));
    await renderThreadHTML(thread, { prerendered: prerendered });
    break;
  }
  case 'delete': {
    await ThreadsModel.setThreadDeleted(`${data.boardName}:${data.threadNumber}`);
    await Cache.removeFile(`${data.boardName}/res/${data.threadNumber}.json`);
    await Cache.removeFile(`${data.boardName}/res/${data.threadNumber}.html`);
    break;
  }
  default: {
    throw new Error(Tools.translate('Invalid action'));
  }
  }
}

router.renderPages = async function(boardName, threadNumber) {
  return await renderPages(boardName, { allowPrerender: threadNumber || true });
};

router.renderCatalog = async function(boardName) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  await Tools.series(['date', 'recent', 'bumps'], async function(sortMode) {
    let catalog = await BoardsModel.getCatalog(boardName, sortMode);
    await Tools.series(catalog.threads, async function(thread) {
      return await Renderer.renderThread(thread);
    });
    let suffix = ('date' !== sortMode) ? `-${sortMode}` : '';
    await Cache.writeFile(`${boardName}/catalog${suffix}.json`, JSON.stringify(catalog));
    catalog.title = board.title;
    catalog.board = MiscModel.board(board).board;
    catalog.sortMode = sortMode;
    return Cache.writeFile(`${boardName}/catalog${suffix}.html`, Renderer.render('pages/catalog', catalog));
  });
};

router.renderArchive = async function(boardName) {
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board'));
  }
  let archive = await BoardsModel.getArchive(boardName);
  await Cache.writeFile(`${boardName}/archive.json`, JSON.stringify(archive));
  archive.title = board.title;
  archive.board = MiscModel.board(board).board;
  await Cache.writeFile(`${boardName}/archive.html`, Renderer.render('pages/archive', archive));
};

router.renderRSS = async function(boardName) {
  if (!boardName) {
    return await Tools.series(Board.boardNames(), router.renderRSS.bind(router));
  }
  let board = Board.board(boardName);
  if (!board) {
    throw new Error(Tools.translate('Invalid board name: $[1]', '', boardName));
  }
  let rssPostCount = config('server.rss.postCount');
  let Post = await client.collection('post');
  let posts = await Post.find({ boardName: boardName }, {
    number: 1,
    threadNumber: 1,
    subject: 1,
    name: 1,
    text: 1,
    fileInfos: 1,
    createdAt: 1
  }).sort({ createdAt: -1 }).limit(rssPostCount).toArray();
  if (posts.length <= 0) {
    return;
  }
  posts.sort((p1, p2) => {
    return +p1.createdAt < +p2.createdAt;
  });
  posts.forEach((post) => {
    post.text = post.text.split('&nbsp', ' '); //NOTE: Required for the RSS to be valid
    post.subject = BoardsModel.postSubject(post, 150) || post.number; //TODO: Magic number
  });
  let rss = {
    date: Tools.now(),
    ttl: config('server.rss.ttl'),
    board: MiscModel.board(board).board,
    posts: posts,
    formattedDate: (date) => {
      return moment(date).utc().locale('en').format(RSS_DATE_TIME_FORMAT);
    }
  };
  return await Cache.writeFile(`${boardName}/rss.xml`, Renderer.render('pages/rss', rss));
};

router.render = async function(path) {
  let match = path.match(/^\/([^\/]+)\/rss$/);
  if (match) {
    return await router.renderRSS(match[1]);
  }
  match = path.match(/^\/([^\/]+)$/);
  if (match) {
    return await renderPages(match[1]);
  }
  match = path.match(/^\/([^\/]+)\/archive$/);
  if (match) {
    return await router.renderArchive(match[1]);
  }
  match = path.match(/^\/([^\/]+)\/catalog$/);
  if (match) {
    return await router.renderCatalog(match[1]);
  }
  match = path.match(/^\/([^\/]+)\/res\/(\d+)$/);
  if (match) {
    return await renderThread(match[1], +match[2]);
  }
};

router.renderThreadHTML = renderThreadHTML;

export default router;
