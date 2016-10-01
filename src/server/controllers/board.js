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

const mkpath = promisify('mkpath');

const RSS_DATE_TIME_FORMAT = 'ddd, DD MMM YYYY HH:mm:ss +0000';

let router = express.Router();

function pickPostsToRerender(oldPosts, posts) {
  return _(posts).pick((post, postNumber) => {
    let oldPost = oldPosts[postNumber];
    if (!oldPost || oldPost.updatedAt < post.updatedAt || oldPost.bannedFor !== post.bannedFor
      || oldPost.text !== post.text) {
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

async function renderThreadHTML(thread, { prerendered, targetPath } = {}) {
  let board = Board.board(thread.boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
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
  if (targetPath) {
    await FS.write(targetPath, data);
  } else {
    await Cache.writeFile(`${thread.boardName}/res/${thread.number}.html`, data);
  }
}

async function renderThread(boardName, threadNumber) {
  let thread = await BoardsModel.getThread(boardName, threadNumber);
  await Renderer.renderThread(thread);
  await Cache.writeFile(`${boardName}/res/${threadNumber}.json`, JSON.stringify({ thread: thread }));
  await renderThreadHTML(thread);
}

async function renderArchivedThread(boardName, threadNumber) {
  let thread = await BoardsModel.getThread(boardName, threadNumber);
  if (!thread || !thread.archived) {
    throw new Error(Tools.translate('No such thread: >>/$[1]/$[2]', '', boardName, threadNumber));
  }
  let archPath = `${__dirname}/../../public/${boardName}/arch`;
  await mkpath(archPath);
  await Renderer.renderThread(thread);
  await FS.write(`${archPath}/${threadNumber}.json`, JSON.stringify({ thread: thread }));
  await renderThreadHTML(thread, { targetPath: `${archPath}/${threadNumber}.html` });
}

async function renderPage(boardName, pageNumber) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let page = await BoardsModel.getPage(boardName, pageNumber);
  await Tools.series(page.threads, async function(thread) {
    return await Renderer.renderThread(thread);
  });
  await Cache.writeFile(`${boardName}/${pageNumber}.json`, JSON.stringify(page));
  page.title = board.title;
  page.board = MiscModel.board(board).board;
  let pageID = (pageNumber > 0) ? pageNumber : 'index';
  await Cache.writeFile(`${boardName}/${pageID}.html`, Renderer.render('pages/board', page));
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
      path: '/<board name>/res/<thread number>',
      description: Tools.translate('A thread')
    }, {
      path: '/<board name>/arch/<thread number>',
      description: Tools.translate('An archived thread')
    }, {
      path: '/rss',
      description: Tools.translate('RSS feed (for all boards)')
    }];
  }
  let arrays = await Tools.series(Board.boardNames(), async function(boardName) {
    let threadNumbers = await ThreadsModel.getThreadNumbers(boardName);
    let archivedThreadNumbers = await ThreadsModel.getThreadNumbers(boardName, { archived: true });
    let paths = [`/${boardName}`, `/${boardName}/archive`, `/${boardName}/catalog`];
    paths = paths.concat(threadNumbers.map(threadNumber => `/${boardName}/res/${threadNumber}`));
    return paths.concat(archivedThreadNumbers.map(threadNumber => `/${boardName}/arch/${threadNumber}`));
  }, true);
  return _(arrays).flatten().concat('/rss');
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
    return Promise.reject(new Error(Tools.translate('Invalid board')));
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
    let posts = await ThreadsModel.getThreadPosts(data.boardName, data.threadNumber, {
      withExtraData: true,
      withFileInfos: true,
      withReferences: true
    });
    posts = posts.slice(1).reduce((acc, post) => {
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
    await Tools.series(postsToRerender, async function(post, postNumber) {
      await Files.renderPostFileInfos(post);
      let renderedPost = await board.renderPost(post);
      lastPosts[postNumber] = renderedPost;
    });
    thread.lastPosts = _(lastPosts).toArray();
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
    return Promise.reject(new Error(Tools.translate('Invalid action')));
  }
  }
}

router.renderPages = async function(boardName) {
  let pageCount = await BoardsModel.getPageCount(boardName);
  return await Tools.series(_.range(pageCount), async function(pageNumber) {
    return await renderPage(boardName, pageNumber);
  });
};

router.renderCatalog = async function(boardName) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
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
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let archive = await BoardsModel.getArchive(boardName);
  await Cache.writeFile(`${boardName}/archive.json`, JSON.stringify(archive));
  archive.title = board.title;
  archive.board = MiscModel.board(board).board;
  await Cache.writeFile(`${boardName}/archive.html`, Renderer.render('pages/archive', archive));
};

router.renderRSS = async function() {
  try {
    let rssPostCount = config('server.rss.postCount');
    let keys = await PostsModel.getPostKeys();
    let postNumbers = keys.reduce((acc, key) => {
      let [boardName, postNumber] = key.split(':');
      postNumber = +postNumber;
      if (!postNumber) {
        return acc;
      }
      if (!acc.hasOwnProperty(boardName)) {
        acc[boardName] = [];
      }
      acc[boardName].push(postNumber);
      return acc;
    }, {});
    await Tools.series(Board.boardNames(), async function(boardName) {
      let numbers = postNumbers[boardName];
      if (!numbers || numbers.length <= 0) {
        return;
      }
      let board = Board.board(boardName);
      if (!board) {
        return;
      }
      numbers = numbers.sort((pn1, pn2) => { return pn2 - pn1; }).slice(0, rssPostCount).reverse();
      let posts = await PostsModel.getPosts(boardName, numbers, { withFileInfos: true });
      posts.forEach((post) => {
        post.subject = BoardsModel.postSubject(post, 150) || post.number;
      });
      let rss = {
        date: Tools.now(),
        ttl: config('server.rss.ttl'),
        board: MiscModel.board(board).board,
        posts: posts,
        formattedDate: (date) => {
          return moment().utc().locale('en').format(RSS_DATE_TIME_FORMAT);
        }
      };
      return await Cache.writeFile(`${boardName}/rss.xml`, Renderer.render('pages/rss', rss));
    });
  } catch (err) {
    Logger.error(err.stack || err);
  }
};

router.render = async function(path) {
  let match = path.match(/^\/rss$/);
  if (match) {
    return await router.renderRSS();
  }
  match = path.match(/^\/([^\/]+)$/);
  if (match) {
    return await router.renderPages(match[1]);
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
  match = path.match(/^\/([^\/]+)\/arch\/(\d+)$/);
  if (match) {
    return await renderArchivedThread(match[1], +match[2]);
  }
};

router.renderThreadHTML = renderThreadHTML;

export default router;
