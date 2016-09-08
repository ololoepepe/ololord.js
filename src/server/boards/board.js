import _ from 'underscore';
import FSSync from 'fs';

import config from '../helpers/config';
import Logger from '../helpers/logger';
import * as Permissions from '../helpers/permissions';
import * as Tools from '../helpers/tools';

const RX_EXCEPT = /^#include\s+except(\((\d+(\,\d+)*)\))$/;
const RX_SEVERAL = /^#include\s+(\d+(\,\d+)*)$/;
const DEFAULT_SUPPORTED_FILE_TYPES = ['application/ogg', 'application/pdf', 'audio/mpeg', 'audio/ogg', 'audio/wav',
  'image/gif', 'image/jpeg', 'image/png', 'video/mp4', 'video/ogg', 'video/webm'];
const MARKUP_ELEMENTS = ['BOLD', 'ITALICS', 'STRIKED_OUT', 'UNDERLINED', 'SPOILER', 'QUOTATION', 'UNORDERED_LIST',
  'ORDERED_LIST', 'LIST_ITEM', 'SUBSCRIPT', 'SUPERSCRIPT', 'URL', 'CODE', 'LATEX', 'INLINE_LATEX'];
const DEFAULT_MARKUP_ELEMENTS = MARKUP_ELEMENTS.slice(0, -3);

let boards = {};
let banners = {};
let postFormRules = {};

function getRules(boardName) {
  let fileName = `${__dirname}/../../misc/rules/rules${(boardName ? ('.' + boardName) : '')}.txt`;
  try {
    if (!FSSync.existsSync(fileName)) {
      return [];
    }
    var data = FSSync.readFileSync(fileName, 'utf8');
    if (!data) {
      return [];
    }
    return data.split(/\r*\n+/gi).filter(rule => !!rule);
  } catch (err) {
    Logger.error(err.stack || err);
    return [];
  }
}

function getBoards(includeHidden) {
  includeHidden = (includeHidden || (typeof includeHidden === 'undefined'));
  return _(boards).toArray().sort((b1, b2) => { return b1.name.localeCompare(b2); }).filter((board) => {
    return board.enabled && (includeHidden || board.hidden);
  });
}

function getDefaultBoards() {
  let prBoard = new Board('pr', Tools.translate.noop('/pr/ogramming', 'boardTitle'));
  prBoard.defineSetting('markupElements', MARKUP_ELEMENTS);
  return [
    new Board('3dpd', Tools.translate.noop('3D pron', 'boardTitle')),
    new Board('a', Tools.translate.noop('/a/nime', 'boardTitle'),
      { defaultUserName: Tools.translate.noop('Kamina', 'defaultUserName') }),
    new Board('b', Tools.translate.noop('/b/rotherhood', 'boardTitle')),
    new Board('d', Tools.translate.noop('Board /d/iscussion', 'boardTitle')),
    new Board('h', Tools.translate.noop('/h/entai', 'boardTitle')),
    prBoard,
    new Board('rf', Tools.translate.noop('Refuge', 'boardTitle'),
      { defaultUserName: Tools.translate.noop('Whiner', 'defaultUserName') }),
    new Board('vg', Tools.translate.noop('Video games', 'boardTitle'),
      { defaultUserName: Tools.translate.noop('PC Nobleman', 'defaultUserName') })
  ];
}

export default class Board {
  static board(name) {
    return boards[name];
  }

  static addBoard(board) {
    boards[board.name] = board;
  }

  static boardInfos(includeHidden) {
    return getBoards(includeHidden).map((board) => {
      return {
        name: board.name,
        title: board.title
      };
    });
  }

  static boardNames(includeHidden) {
    return getBoards(includeHidden).map(board => board.name);
  }

  static reloadBanners() {
    banners = Board.boardNames().reduce((acc, boardName) => {
      let path = `${__dirname}/../../public/img/banners/${boardName}`;
      if (FSSync.existsSync(path)) {
        acc[boardName] = FSSync.readdirSync(path).filter((fileName) => { return '.gitignore' !== fileName; });
      } else {
        acc[boardName] = [];
      }
      return acc;
    }, {});
  }

  static reloadPostFormRules() {
    let common = getRules();
    postFormRules = Board.boardNames().reduce((acc, boardName) => {
      let specific = getRules(boardName).reverse();
      specific = specific.map((rule, i) => {
        i = specific.length - i - 1;
        if ('#include all' === rule) {
          return common;
        } else if (RX_EXCEPT.test(rule)) {
          let excluded = rule.match(RX_EXCEPT)[2].split(',').map(n => +n);
          return common.filter((_, i) => { return excluded.indexOf(i) < 0; });
        } else if (RX_SEVERAL.test(rule)) {
          return rule.match(RX_SEVERAL)[1].split(',').map(n => +n).filter((n) => {
            return n >= 0 && n < common.length;
          }).map(n => common[n]);
        }
      });
      specific = _(specific).flatten();
      acc[boardName] = (specific.length > 0) ? specific : common;
      return acc;
    }, {});
  }

  static initialize() {
    boards = {};
    if (config('board.useDefaultBoards')) {
      getDefaultBoards().forEach((board) => {
        Board.addBoard(board);
      });
    }
    Tools.loadPlugins([__dirname, `${__dirname}/custom`], (fileName, _1, _2, path) => {
      return ('board.js' !== fileName) || (path.split('/') === 'custom');
    }).map((plugin) => {
      return (typeof plugin === 'function') ? new plugin() : plugin;
    }).forEach((board) => {
      Board.addBoard(board);
    });
    Board.reloadBanners();
    Board.reloadPostFormRules();
  }

  constructor(name, title, { defaultPriority, defaultUserName, defaultGroupName } = {}) {
    defaultPriority = Tools.option(defaultPriority, 'number', 0);
    defaultUserName = defaultUserName ? Tools.translate(defaultUserName)
      : Tools.translate('Anonymous', 'defaultUserName');
    defaultGroupName = defaultGroupName || '';
    this.defineProperty('name', name);
    this.defineSetting('title', () => { return Tools.translate(title); });
    this.defineSetting('property', defaultPriority);
    this.defineSetting('defaultUserName', defaultUserName);
    this.defineSetting('groupName', defaultGroupName);
    this.defineProperty('captchaEnabled', () => {
      return config('board.captchaEnabled', true) && config(`board.${name}.captchaEnabled`, true);
    });
    this.defineProperty('bannerFileNames', () => { return banners[name]; });
    this.defineProperty('postFormRules', () => { return postFormRules[name]; });
    this.defineSetting('skippedGetOrder', 0);
    this.defineSetting('opModeration', false);
    this.defineSetting('captchaQuota', 0);
    this.defineSetting('enabled', true);
    this.defineSetting('hidden', false);
    this.defineSetting('maxNameLength', 50);
    this.defineSetting('maxSubjectLength', 150);
    this.defineSetting('maxTextLength', 15000);
    this.defineSetting('maxPasswordLength', 50);
    this.defineSetting('maxFileCount', 1);
    this.defineSetting('maxFileSize', 10 * 1024 * 1024);
    this.defineSetting('maxLastPosts', 3);
    this.defineSetting('markupElements', DEFAULT_MARKUP_ELEMENTS);
    this.defineSetting('postingEnabled', true);
    this.defineSetting('showWhois', false);
    const Captcha = Tools.requireWrapper(require('../captchas/captcha'));
    this.defineSetting('supportedCaptchaEngines', () => { return Captcha.captchaIDs(); });
    this.defineProperty('permissions', () => {
      return _(Permissions.PERMISSIONS).mapObject((defaultLevel, key) => {
        return config(`board.${name}.permissions.${key}`, config(`permissions.${key}`, defaultLevel));
      });
    });
    this.defineSetting('supportedFileTypes', DEFAULT_SUPPORTED_FILE_TYPES);
    this.defineSetting('bumpLimit', 500);
    this.defineSetting('postLimit', 1000);
    this.defineSetting('threadLimit', 200);
    this.defineSetting('archiveLimit', 0);
    this.defineSetting('threadsPerPage', 20);
    this.defineProperty('launchDate', () => {
      return new Date(config(`board.${name}.launchDate`, config('board.launchDate', new Date())));
    });
  }

  defineSetting(name, def) {
    Object.defineProperty(this, name, {
      get: () => {
        return config(`board.${this.name}.${name}`,
          config(`board.${name}`, (typeof def === 'function') ? def() : def));
      },
      configurable: true
    });
  }

  defineProperty(name, value) {
    if (typeof value === 'function') {
      Object.defineProperty(this, name, {
        get: value,
        configurable: true
      });
    } else {
      Object.defineProperty(this, name, {
        value: value,
        configurable: true
      });
    }
  }

  info() {
    let model = {
      name: this.name,
      title: this.title,
      defaultUserName: this.defaultUserName,
      groupName: this.groupName,
      showWhois: this.showWhois,
      hidden: this.hidden,
      postingEnabled: this.postingEnabled,
      captchaEnabled: this.captchaEnabled,
      maxEmailLength: this.maxEmailLength,
      maxNameLength: this.maxNameLength,
      maxSubjectLength: this.maxSubjectLength,
      maxTextLength: this.maxTextLength,
      maxPasswordLength: this.maxPasswordLength,
      maxFileCount: this.maxFileCount,
      maxFileSize: this.maxFileSize,
      maxLastPosts: this.maxLastPosts,
      markupElements: this.markupElements,
      supportedFileTypes: this.supportedFileTypes,
      supportedCaptchaEngines: this.supportedCaptchaEngines,
      bumpLimit: this.bumpLimit,
      postLimit: this.postLimit,
      bannerFileNames: this.bannerFileNames,
      postFormRules: this.postFormRules,
      launchDate: this.launchDate.toISOString(),
      permissions: this.permissions,
      opModeration: this.opModeration
    };
    this.customInfoFields().forEach((field) => {
      model[field] = this[field];
    });
    return model;
  }

  customInfoFields() {
    return [];
  }

  isCaptchaEngineSupported(engineName) {
    return _(this.supportedCaptchaEngines).contains(engineName);
  }

  isFileTypeSupported(fileType) {
    return _(this.supportedFileTypes).contains(fileType);
  }

  apiRoutes() {
    return [];
  }

  actionRoutes() {
    return [];
  }

  async testParameters({ req, mode, fields, files, existingFileCount }) {
    let { name, subject, text, password } = fields;
    name = name || '';
    subject = subject || '';
    text = text || '';
    password = password || '';
    if (name.length > this.maxNameLength) {
      return Promise.reject(new Error(Tools.translate('Name is too long')));
    }
    if (subject.length > this.maxSubjectLength) {
      return Promise.reject(new Error(Tools.translate('Subject is too long')));
    }
    if (text.length > this.maxTextFieldLength) {
      return Promise.reject(new Error(Tools.translate('Comment is too long')));
    }
    if (password.length > this.maxPasswordLength) {
      return Promise.reject(new Error(Tools.translate('Password is too long')));
    }
    if ('markupText' === mode || 'editPost' === mode) {
      return;
    }
    if ('createThread' === mode && this.maxFileCount && files.length <= 0) {
      return Promise.reject(new Error(Tools.translate('Attempt to create a thread without attaching a file')));
    }
    if ('deleteFile' === mode && (existingFileCount > 0)) {
      --existingFileCount;
    }
    if (text.length <= 0 && (files.length + existingFileCount) <= 0) {
      return Promise.reject(new Error(Tools.translate('Both file and comment are missing')));
    }
    if ((files.length + existingFileCount) > this.maxFileCount) {
      return Promise.reject(new Error(Tools.translate('Too many files')));
    }
    let err = files.reduce((err, file) => {
      if (err) {
        return err;
      }
      if (file.size > this.maxFileSize) {
        return Tools.translate('File is too big');
      }
      if (this.supportedFileTypes.indexOf(file.mimeType) < 0) {
        return Tools.translate('File type is not supported');
      }
    }, '');
    if (err) {
      return Promise.reject(err);
    }
  }

  async postExtraData(req, fields, files, oldPost) {
    return oldPost ? oldPost.extraData : null;
  }

  async storeExtraData(postNumber, extraData) {
    //NOTE: Do nothing by default.
  }

  async loadExtraData(postNumber) {
    //NOTE: Do nothing by default.
  }

  async removeExtraData(postNumber) {
    //NOTE: Do nothing by default.
  }

  async renderPost(post) {
    post.rawSubject = post.subject;
    post.isOp = (post.number === post.threadNumber);
    if (post.options.showTripcode) {
      post.tripcode = this.generateTripcode(post.user.hashpass);
    }
    delete post.user.ip;
    delete post.user.hashpass;
    delete post.user.password;
    if (!post.geolocation.countryName) {
      post.geolocation.countryName = 'Unknown country';
    }
    return post;
  }

  generateTripcode(source) {
    return '!' + Tools.crypto('md5', source + config('site.tripcodeSalt'), 'base64').substr(0, 10);
  }
}
