import _ from 'underscore';
import FS from 'q-io/fs';
import FSSync from 'fs';
import Highlight from 'highlight.js';

import Board from '../boards/board';
import markup from '../core/markup';
import config from '../helpers/config';
import FSWatcher from '../helpers/fs-watcher';
import * as Tools from '../helpers/tools';

let langNames = Tools.createWatchedResource(`${__dirname}/misc/lang-names.json`, (path) => {
  return require(path);
}, async function(path) {
  let data = await FS.read(path);
  langNames = JSON.parse(data);
}) || {};

function filterNotFoundImageFileNames(fileName) {
  return '.gitignore' !== fileName;
}

let notFoundImageFileNames = Tools.createWatchedResource(`${__dirname}/../public/img/404`, (path) => {
  return FSSync.readdirSync(path).filter(filterNotFoundImageFileNames);
}, async function(path) {
  let fileNames = await FS.list(path);
  return fileNames.filter(filterNotFoundImageFileNames);
}) || [];

export function base() {
  let Captcha = Tools.requireWrapper(require('../captchas/captcha'));
  return {
    site: {
      protocol: config('site.protocol'),
      domain: config('site.domain'),
      pathPrefix: config('site.pathPrefix'),
      locale: config('site.locale'),
      dateFormat: config('site.dateFormat'),
      timeOffset: config('site.timeOffset'),
      twitter: { integrationEnabled: !!config('site.twitter.integrationEnabled') },
      vkontakte: {
        integrationEnabled: !!config('site.vkontakte.integrationEnabled'),
        appId: config('site.vkontakte.appId')
      },
      ws: { transports: config('site.ws.transports') }
    },
    styles: Tools.STYLES,
    codeStyles: Tools.CODE_STYLES,
    availableCodeLangs: Highlight.listLanguages().map((lang) => {
      return {
        id: lang,
        name: langNames[lang] || lang
      };
    }),
    maxSearchQueryLength: config('site.maxSearchQueryLength'),
    markupModes: [{
      name: 'NONE',
      title: Tools.translate('No markup', 'markupMode')
    }, {
      name: markup.MarkupModes.ExtendedWakabaMark,
      title: Tools.translate('Extended WakabaMark only', 'markupMode')
    }, {
      name: markup.MarkupModes.BBCode,
      title: Tools.translate('bbCode only', 'markupMode')
    }, {
      name: (markup.MarkupModes.ExtendedWakabaMark + ',' + markup.MarkupModes.BBCode),
      title: Tools.translate('Extended WakabaMark and bbCode', 'markupMode')
    }],
    supportedCaptchaEngines: Captcha.captchaIds().filter((id) => {
      return 'node-captcha-noscript' !== id;
    }).map(id => Captcha.captcha(id).info())
  };
}

function sort(x1, x2) {
  if (!x1.priority && !x2.priority) {
    return x1.name.localeCompare(x2.name);
  }
  return (x1.priority || 0) - (x2.priority || 0);
}

export function boards() {
  let boards = Board.boardNames().map(boardName => Board.board(boardName).info());
  let addDefault = false;
  let boardGroups = _(config('boardGroups', {})).map((group, name) => {
    group.name = name;
    group.boards = boards.reduce((acc, board) => {
      if (!board.groupName) {
        addDefault = true;
      } else if (name === board.groupName) {
        acc.push(board);
      }
      return acc;
    }, []);
    return group;
  });
  if (addDefault || boardGroups.length < 1) {
    let noGroups = (boardGroups.length < 1);
    boardGroups.push({
      name: '',
      boards: boards.filter((board) => { return noGroups || (!board.hidden && !board.groupName); })
    });
  }
  boardGroups = boardGroups.filter((group) => { return group.boards.length > 0; });
  boardGroups.sort(sort);
  boardGroups.forEach((group) => { group.boards.sort(sort); });
  return {
    boards: boards,
    boardGroups: boardGroups
  };
}

export function board(brd) {
  if (typeof brd === 'string') {
    brd = Board.board(brd);
  }
  return brd ? { board: brd.info() } : null;
}

export function translations() {
  return { tr: Tools.translate.translations };
}

export function notFoundImageFileNames() {
  return notFoundImageFileNames;
}

export function codeLangNames() {
  return langNames;
}
