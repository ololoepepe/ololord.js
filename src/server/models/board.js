import _ from 'underscore';
import Cluster from 'cluster';

var FS = require("q-io/fs");
var merge = require("merge");
var mkpath = require("mkpath");
var moment = require("moment");
var promisify = require("promisify-node");
var Util = require("util");
var XML2JS = require("xml2js");

var Board = require("../boards/board");
var Cache = require("../helpers/cache");
var config = require("../helpers/config");
var Database = require("../helpers/database");
var Tools = require("../helpers/tools");

import * as MiscModel from './misc';
import * as PostsModel from './posts';
import * as ThreadsModel from './threads';
import * as Renderer from '../core/renderer';
import client from '../storage/client-factory';
import Hash from '../storage/hash';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';

let PostCounters = new Hash(client(), 'postCounters', {
  parse: number => +number,
  stringify: number => number.toString()
});
let Threads = new Hash(client(), 'threads');

let pageCounts = new Map();

function postSubject(post, maxLength) {
  let subject = '';
  if (post.subject) {
    subject = post.subject;
  } else if (post.text) {
    subject = Tools.plainText(post.text);
  }
  subject = subject.replace(/\r*\n+/gi, '');
  maxLength = Tools.option(maxLength, 'number', 0, { test: (l) => { return l > 0; } });
  if (maxLength > 1 && subject.length > maxLength) {
    subject = subject.substr(0, maxLength - 1) + '…';
  }
  return subject;
}

//TODO: Use DoT.js
module.exports.generateRSS = function(currentProcess) {
    var site = {
        protocol: config("site.protocol", "http"),
        domain: config("site.domain", "localhost:8080"),
        pathPrefix: config("site.pathPrefix", ""),
        locale: config("site.locale", "en")
    };
    var rssPostCount = config("server.rss.postCount", 500);
    var postNumbers = {};
    Board.boardNames().forEach(function(boardName) {
        postNumbers[boardName] = [];
    });
    var feedTranslated = Tools.translate("Feed", "channelTitle");
    return Database.db.hkeys("posts").then(function(keys) {
        keys.forEach(function(key) {
            var list = postNumbers[key.split(":").shift()];
            if (!list)
                return;
            list.push(+key.split(":").pop());
        });
        return Tools.series(Board.boardNames(), function(boardName) {
            var board = Board.board(boardName);
            var title = feedTranslated + " " + site.domain + "/" + site.pathPrefix + boardName;
            var link = site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName;
            var description = Tools.translate("Last posts from board", "channelDescription") + " /" + boardName + "/";
            var atomLink = site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName + "/rss.xml";
            var doc = {
                $: {
                    version: "2.0",
                    "xmlns:dc": "http://purl.org/dc/elements/1.1/",
                    "xmlns:atom": "http://www.w3.org/2005/Atom"
                },
                channel: {
                    title: title,
                    link: link,
                    description: description,
                    language: site.locale,
                    pubDate: moment(Tools.now()).utc().locale("en").format("ddd, DD MMM YYYY HH:mm:ss +0000"),
                    ttl: ("" + config("server.rss.ttl", 60)),
                    "atom:link": {
                        $: {
                            href: atomLink,
                            rel: "self",
                            type: "application/rss+xml"
                        }
                    }
                }
            };
            var posts = [];
            return Tools.series(postNumbers[boardName].sort(function(pn1, pn2) {
                if (pn1 < pn2)
                    return 1;
                else if (pn1 > pn2)
                    return -1;
                else
                    return 0;
            }).slice(0, rssPostCount).reverse(), function(postNumber) {
                return PostsModel.getPost(boardName, postNumber, { withFileInfos: true }).then(function(post) {
                    posts.push(post);
                    return Promise.resolve();
                });
            }).then(function() {
                doc.channel.item = posts.map(function(post) {
                    var title;
                    var isOp = post.number == post.threadNumber;
                    if (isOp)
                        title = "[" + Tools.translate("New thread", "itemTitle") + "]";
                    else
                        title = Tools.translate("Reply to thread", "itemTitle");
                    title += " ";
                    if (!isOp)
                        title += "\"";
                    title += postSubject(post, 150) || post.number;
                    if (!isOp)
                        title += "\"";
                    var link = site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName + "/res/"
                        + post.threadNumber + ".html";
                    var description = "\n" + post.fileInfos.map(function(fileInfo) {
                        if (!fileInfo)
                            return ""; //NOTE: Normally that should not happen
                        return "<img src=\"" + site.protocol + "://" + site.domain + "/" + site.pathPrefix + boardName
                            + "/thumb/" + fileInfo.thumb.name + "\"><br />";
                    }).join("\n") + (post.text || "") + "\n";
                    return {
                        title: title,
                        link: link,
                        description: description,
                        pubDate: moment(post.createdAt).utc().locale("en").format("ddd, DD MMM YYYY HH:mm:ss +0000"),
                        guid: {
                            _: link + "#" + post.number,
                            $: { isPermalink: true }
                        },
                        "dc:creator": (post.name || board.defaultUserName)
                    };
                });
            }).then(function() {
                var builder = new XML2JS.Builder({
                    rootName: "rss",
                    renderOpts: {
                        pretty: true,
                        indent: "    ",
                        newline: "\n"
                    },
                    allowSurrogateChars: true,
                    cdata: true
                });
                return Cache.writeFile(`${board.name}/rss.xml`, builder.buildObject(doc));
            });
        });
    }).catch(function(err) {
        Logger.error(err.stack || err);
    });
};

function addDataToThread(thread, board) {
  thread.bumpLimit = board.bumpLimit;
  thread.postLimit = board.postLimit;
  thread.bumpLimitReached = (thread.postCount >= board.bumpLimit);
  thread.postLimitReached = (thread.postCount >= board.postLimit);
  thread.postingEnabled = (board.postingEnabled && !thread.closed);
}

export async function getThread(boardName, threadNumber, archived) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let thread = await ThreadsModel.getThread(boardName, threadNumber);
  let posts = await ThreadsModel.getThreadPosts(boardName, threadNumber, {
    withExtraData: true,
    withFileInfos: true,
    withReferences: true
  });
  thread.postCount = posts.length;
  thread.opPost = posts.splice(0, 1)[0];
  thread.lastPosts = posts;
  thread.title = postSubject(thread.opPost, 50) || null;
  thread.archived = !!archived;
  addDataToThread(thread, board);
  return thread;
}

export async function getPage(boardName, pageNumber) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  pageNumber = Tools.option(pageNumber, 'number', -1, { test: (n) => { return n >= 0; } });
  let pageCount = pageCounts.get(boardName);
  if (pageNumber < 0 || pageNumber >= pageCount) {
    return Promise.reject(new Error(Tools.translate('Invalid page number')));
  }
  let threadNumbers = await ThreadsModel.getThreadNumbers(boardName);
  //TODO: get threads, sort them, then slice
  let start = pageNumber * board.threadsPerPage;
  threadNumbers = threadNumbers.slice(start, start + board.threadsPerPage);
  let threads = await ThreadsModel.getThreads(boardName, threadNumbers, { withPostNumbers: true });
  await Tools.series(threads, async function(thread) {
    thread.opPost = await PostsModel.getPost(boardName, thread.number, {
      withExtraData: true,
      withFileInfos: true,
      withReferences: true
    });
    let lastPosts = await ThreadsModel.getThreadPosts(boardName, thread.number, {
      limit: board.maxLastPosts,
      reverse: true,
      notOP: true,
      withExtraData: true,
      withFileInfos: true,
      withReferences: true
    });
    thread.lastPosts = lastPosts.reverse();
    thread.postCount = thread.postNumbers.length;
    delete thread.postNumbers;
    addDataToThread(thread, board);
    if (thread.postCount > (board.maxLastPosts + 1)) {
      thread.omittedPosts = thread.postCount - board.maxLastPosts - 1;
    } else {
      thread.omittedPosts = 0;
    }
  });
  let lastPostNumber = await getLastPostNumber(boardName);
  return {
    threads: threads.sort(Board.sortThreadsByDate),
    pageCount: pageCount,
    currentPage: pageNumber,
    lastPostNumber: lastPostNumber,
    postingSpeed: Tools.postingSpeedString(board.launchDate, lastPostNumber)
  };
}

export async function getCatalog(boardName, sortMode) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let threadNumbers = await ThreadsModel.getThreadNumbers(boardName);
  let threads = await ThreadsModel.getThreads(boardName, threadNumbers, { withPostNumbers: true });
  await Tools.series(threads, async function(thread) {
    thread.opPost = await PostsModel.getPost(boardName, thread.number, {
      withFileInfos: true,
      withReferences: true
    });
    thread.postCount = thread.postNumbers.length;
    delete thread.postNumbers;
    addDataToThread(thread, board);
  });
  let sortFunction = Board.sortThreadsByCreationDate;
  switch ((sortMode || 'date').toLowerCase()) {
  case 'recent':
    sortFunction = Board.sortThreadsByDate;
    break;
  case 'bumps':
    sortFunction = Board.sortThreadsByPostCount;
    break;
  default:
    break;
  }
  let lastPostNumber = await getLastPostNumber(boardName);
  return {
    threads: threads.sort(sortFunction),
    lastPostNumber: lastPostNumber,
    postingSpeed: Tools.postingSpeedString(board.launchDate, lastPostNumber)
  };
}

export async function getArchive(boardName) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let path = `${__dirname}/../public/${boardName}/arch`;
  let exists = await FS.exists(path);
  if (exists) {
    var fileNames = await FS.list(path);
  } else {
    var fileNames = [];
  }
  fileNames = fileNames.filter((fileName) => { return fileName.split('.').pop() === 'json'; });
  let threads = await Tools.series(fileNames, async function(fileName) {
    let stats = await FS.stat(`${path}/${fileName}`);
    return {
      boardName: boardName,
      number: +fileName.split('.').shift(),
      birthtime: stats.node.birthtime.valueOf()
    };
  }, true);
  let lastPostNumber = await getLastPostNumber(boardName);
  return {
    threads: threads.sort((t1, t2) => { return t2 - t1; }), //NOTE: The order is correct (t2 - t1).
    lastPostNumber: lastPostNumber,
    postingSpeed: Tools.postingSpeedString(board.launchDate, lastPostNumber)
  };
}

export async function getLastPostNumber(boardName) {
  if (!Board.board(boardName)) {
    return Promise.reject(new Error(Tools.translate('Invalid boardName')));
  }
  return await PostCounters.getOne(boardName);
}

export async function getLastPostNumbers(boardNames) {
  if (!_(boardNames).isArray()) {
    boardNames = [boardNames];
  }
  if (boardNames.some(boardName => !Board.board(boardName))) {
    return Promise.reject(new Error(Tools.translate('Invalid boardName')));
  }
  return await PostCounters.getSome(boardNames);
}

export async function getPageCount(boardName) {
  let board = Board.board(boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  let threadCount = await Threads.count(boardName);
  let pageCount = Math.ceil(threadCount / board.threadsPerPage) || 1;
  pageCounts.set(boardName, pageCount);
  return pageCount;
}

export async function initialize() {
  await Tools.series(Board.boardNames(), async function(boardName) {
    await getPageCount(boardName);
  });
  await ThreadsModel.clearDeletedThreads();
}
