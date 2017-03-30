import _ from 'underscore';
import $ from 'jquery';
import merge from 'merge';

import * as Constants from './constants';
import * as DOM from './dom';
import * as Settings from './settings';
import * as Storage from './storage';
import * as Tools from './tools';

let _requireTemplate = () => null;
let _requireModel = () => null;

export function initialize({ requireModel, requireTemplate } = {}) {
  _requireModel = requireModel;
  _requireTemplate = requireTemplate;
  let hashpass = Storage.getCookie('hashpass');
  let levels = hashpass ? Storage.getLocalObject('levels', {}) : {};
  let base = _requireModel('base');
  base.user = {
    levels: levels,
    hashpass: hashpass,
    loggedIn: !!hashpass
  };
}

export let scriptWorkaround = function(parent) {
  parent = parent || document;
  DOM.queryAll('script', parent).forEach(function(script) {
    var nscript = DOM.node('script');
    nscript.type = script.type;
    if (script.src) {
      nscript.src = script.src;
    } else if (script.innerHTML) {
      nscript.innerHTML = script.innerHTML;
    }
    script.parentNode.replaceChild(nscript, script);
  });
};

export let boards = function() {
  return _requireModel('boards').boards;
};

export let board = function(boardName) {
  return boards().find(b => boardName === b.name) || null;
};

export function notFoundImageFileNames() {
  return _requireModel('notFoundImageFileNames') || [];
}

export let createUser = function() {
  let user = merge.recursive(true, _requireModel('base').user || {});
  let maxLevel = _(user.levels).toArray().sort().shift() || null;
  let test = function(level, boardName, strict) {
    if (boardName && typeof boardName !== 'boolean') {
      if (boardName.name) {
        boardName = boardName.name;
      }
      var lvl = user.levels[boardName];
    } else {
      var lvl = maxLevel;
      strict = boardName;
    }
    if (strict) {
      return !Tools.compareRegisteredUserLevels(lvl, level);
    } else {
      return Tools.compareRegisteredUserLevels(lvl, level) >= 0;
    }
  };
  user.vkAuth = Storage.vkAuth();
  user.level = (boardName) => {
    if (!boardName) {
      return maxLevel;
    }
    return user.levels[boardName] || null;
  };
  _(Constants.LEVEL_MAP).each((lvl, key) => {
    user[`is${key}`] = test.bind(user, lvl);
  });
  user.hasPermission = (brd, permission) => {
    if (!permission || !brd) {
      return false;
    }
    if (typeof brd === 'string') {
      brd = board(brd);
    }
    if (!brd || !brd.hasOwnProperty('permissions') || !brd.permissions.hasOwnProperty(permission)) {
      return false;
    }
    return Tools.compareRegisteredUserLevels(user.levels[brd.name], brd.permissions[permission]) >= 0;
  };
  return user;
};

export function template(templateName, modelData, { noparse, boardName } = {}) {
  let tmpl = _requireTemplate(templateName);
  if (!tmpl) {
    return null;
  }
  let baseModelData = merge.recursive(true, _requireModel('base'));
  baseModelData.templateName = templateName;
  baseModelData.boards = _requireModel('boards').boards;
  baseModelData.boardGroups = _requireModel('boards').boardGroups;
  if (typeof boardName === 'string' && boardName) {
    baseModelData.board = board(boardName);
  }
  baseModelData.settings = Settings.getAll();
  baseModelData._ = _;
  baseModelData.isAudioType = Tools.isAudioType;
  baseModelData.isImageType = Tools.isImageType;
  baseModelData.isVideoType = Tools.isVideoType;
  baseModelData.isMediaTypeSupported = Tools.isMediaTypeSupported;
  baseModelData.isSupportedByPlayer = Tools.isSupportedByPlayer;
  baseModelData.compareRegisteredUserLevels = Tools.compareRegisteredUserLevels;
  baseModelData.hasOwnProperties = Tools.hasOwnProperties;
  baseModelData.escaped = Tools.escaped;
  baseModelData.escapedSelector = Tools.escapedSelector;
  baseModelData.formattedDate = Tools.formattedDate;
  baseModelData.translate = Tools.translate;
  baseModelData.deviceType = Tools.deviceType;
  baseModelData.user = createUser();
  baseModelData.password = Storage.password();
  modelData = merge.recursive(baseModelData, modelData || {});
  let html = tmpl(modelData);
  if (noparse) {
    return html;
  }
  let node = _($.parseHTML(html, window.document, true)).find((n) => {
    return window.Node.ELEMENT_NODE === n.nodeType;
  });
  if (!node) {
    return null;
  }
  scriptWorkaround(node);
  return node;
}
