import _ from 'underscore';
import $ from 'jquery';
import KO from 'knockout';
import { saveAs } from 'node-safe-filesaver';

import * as AJAX from '../helpers/ajax';
import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as Widgets from '../widgets';
import OverlayProgressBar from '../widgets/overlay-progress-bar';

const DEFAULT_BAN_TIME = 30 * Constants.MINUTE;
const BAN_DATE_FORMAT = 'yy/mm/dd';
const BAN_TIME_FORMAT = 'HH:mm';
const BAN_DATE_TIME_FORMAT = 'YYYY/MM/DD HH:mm';
export const BAN_DATE_TIME_INPUT_MASK = '9999/99/99 99:99';
const USER_INIT_COUNT = 5;
const USER_INIT_DELAY = 10;
const TEXT_FORMATS = new Set(['txt', 'js', 'json', 'jst', 'def', 'html', 'xml', 'css', 'md', 'example', 'gitignore',
  'log']);
const MAX_SHOWN_FREQUENTLY_USED_FILES = 10;
const RELOADABLE_CONTENT = new Set(['boards', 'templates']);
const ADD_FILE_MIN_WIDTH = 350;
const ADD_FILE_MIN_HEIGHT = 150;
const RERENDER_POSTS_MIN_WIDTH = 300;
const RERENDER_POSTS_MIN_HEIGHT = 500;

let loadedTabContent = {};
let bannedUsers = KO.observableArray([]);
let registeredUsers = KO.observableArray([]);
let jstreeRoot = null;

export async function showUserInfo(boardName, postNumber) {
  postNumber = Tools.option(postNumber, 'number', 0, { test: (pn) => { return pn > 0; } });
  if (!boardName || !postNumber) {
    return;
  }
  try {
    let result = await AJAX.api('userIp', {
      boardName: boardName,
      postNumber: postNumber
    }, { indicator: new OverlayProgressBar() });
    await Widgets.prompt({
      title: 'IP:',
      value: result.ipv4 || result.ip,
      readOnly: true
    });
  } catch (err) {
    DOM.handleError(err);
  }
}

export async function removeRegisteredUser(users, index) {
  try {
    let accepted = await Widgets.confirm({
      id: `removeRegisteredUser/${users()[index()].hashpass()}`,
      title: Tools.translate('Removing registered user')
    });
    if (!accepted) {
      return;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/unregisterUser`,
      Tools.createFormData({ hashpass: users()[index()].hashpass() }), new OverlayProgressBar());
    users.splice(index(), 1);
  } catch (err) {
    return Promise.reject(err);
  }
}

export function registeredUserToViewModel(user) {
  let inputHashpass = !user;
  user = user || {
    hashpass: '',
    levels: {},
    ips: []
  };
  user.ips = (user.ips || []).map((ip) => { return ip.ipv4 || ip.ip; }).join(' ');
  let levels = user.levels || {};
  Templating.boards().forEach((board) => {
    if (!levels[board.name]) {
      levels[board.name] = 'NONE';
    }
  });
  levels = _(levels).reduce((acc, level, boardName) => {
    acc[boardName] = KO.observable(level || 'NONE');
    return acc;
  }, {});
  let level = KO.observable('NONE');
  level.subscribe((value) => {
    _(levels).each((lvl) => {
      lvl(level());
    });
  });
  return {
    title: (inputHashpass ? Tools.translate('New user…') : user.hashpass),
    inputHashpass: inputHashpass,
    hashpass: KO.observable(user.hashpass),
    levels: levels,
    ips: KO.observable(user.ips),
    level: level
  };
}

function registeredUserFromViewModel(model) {
  if (typeof model !== 'object') {
    return model;
  }
  let levels = _(model.levels).reduce((acc, level, boardName) => {
    acc[boardName] = level();
    return acc;
  }, {});
  return {
    hashpass: model.hashpass(),
    levels: levels,
    ips: model.ips()
  };
}

export function createRegisteredUserFormData(data) {
  let o = {
    password: data.hashpass,
    ips: data.ips
  };
  _(data.levels).each((level, boardName) => {
    o[`accessLevelBoard_${boardName}`] = level;
  });
  return Tools.createFormData(o);
}

async function registerUser(users, data, index, update) {
  try {
    let action = `/${Tools.sitePathPrefix()}action/${update ? 'updateRegisteredUser' : 'registerUser'}`;
    let formData = createRegisteredUserFormData(data);
    let { hashpass } = await AJAX.post(action, formData, new OverlayProgressBar());
    let registeredUser = await AJAX.api('registeredUser', { hashpass: hashpass || data.hashpass },
      { indicator: new OverlayProgressBar() });
    users.splice(index(), update ? 1 : 0, registeredUserToViewModel(registeredUser));
  } catch (err) {
    DOM.handleError(err);
  }
}

export function createRegisteredUsersSection(users) {
  let content = Templating.template('manage/registeredUsers', {
    accessLevels: [{
      level: 'NONE',
      description: Tools.translate('No level', 'accessLevelNoneDescription')
    }, {
      level: 'USER',
      description: Tools.translate('User', 'accessLevelUserDescription')
    }, {
      level: 'MODER',
      description: Tools.translate('Moderator', 'accessLevelModerDescription')
    }, {
      level: 'ADMIN',
      description: Tools.translate('Administrator', 'accessLevelAdminDescription')
    }]
  });
  KO.applyBindings({
    registeredUsers: users,
    submit: async function(index, update) {
      await registerUser(users, registeredUserFromViewModel(this), index, !!update);
    },
    removeRegisteredUser: removeRegisteredUser.bind(null, users)
  }, content);
  return content;
}

async function renameFile(id, type) {
  if (!id || !type) {
    return;
  }
  try {
    let { accepted, value } = await Widgets.prompt({
      id: `ranameFile/${id}`,
      title: (('folder' === type) ? Tools.translate('Renaming directory') : Tools.translate('Renaming file')),
      type: 'input',
      value: id.split('/').pop(),
      select: true
    })
    if (!accepted) {
      return;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/superuserRenameFile`, Tools.createFormData({
      oldFileName: id,
      fileName: value
    }), new OverlayProgressBar());
    $('#content-file-tree').jstree(true).refresh();
  } catch (err) {
    DOM.handleError(err);
  }
}

async function deleteFile(id, type) {
  if (!id || !type) {
    return;
  }
  try {
    let accepted = await Widgets.confirm({
      id: `deleteFile/${id}`,
      title: (('folder' === type) ? Tools.translate('Deleting directory') : Tools.translate('Deleting file'))
    });
    if (!accepted) {
      return;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/superuserDeleteFile`, Tools.createFormData({ fileName: id }));
    $('#content-file-tree').jstree(true).refresh();
  } catch (err) {
    DOM.handleError(err);
  }
}

async function editFile(id) {
  if (!id) {
    return;
  }
  let files = Storage.frequentlyUsedFiles();
  if (files.hasOwnProperty(id)) {
    files[id] += 1;
  } else {
    files[id] = 1;
  }
  Storage.frequentlyUsedFiles(files);
  let modes = {
    js: 'javascript',
    json: {
      name: 'javascript',
      json: true
    },
    css: 'css',
    html: 'htmlmixed',
    jst: 'htmlmixed'
  };
  try {
    let result = await AJAX.api('fileContent', { fileName: id }, { indicator: new OverlayProgressBar() });
    let { accepted, value } = await Widgets.editCode(modes[id.split('.').pop()] || '', {
      name: id,
      value: result.content
    });
    if (!accepted) {
      return;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/superuserEditFile`, Tools.createFormData({
      fileName: id,
      content: value
    }), new OverlayProgressBar());
  } catch (err) {
    DOM.handleError(err);
  }
}

async function downloadFile(id) {
  if (!id) {
    return;
  }
  try {
    let result = await AJAX.api('fileContent', { fileName: id }, { indicator: new OverlayProgressBar() });
    if ('Buffer' === result.content.type) {
      var blob = new Blob([new Uint8Array(result.content.data)], { type: 'application/octet-binary' });
    } else {
      var blob = new Blob([result.content], {type: 'text/plain;charset=utf-8'});
    }
    saveAs(blob, id.split('/').pop());
  } catch (err) {
    DOM.handleError(err);
  }
}

async function addFile(sourceId, isDir) {
  let content = Templating.template('manage/addFileWidget');
  let fileName = KO.observable('');
  let file = KO.observable(null);
  KO.applyBindings({
    isDir: isDir,
    fileName: fileName,
    file: file
  }, content);
  try {
    let options = {
      id: `addFile/${sourceId}`,
      buttons: ['cancel', 'ok']
    };
    options.title = isDir ? Tools.translate('Add directory') : Tools.translate('Add file');
    if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: ADD_FILE_MIN_WIDTH,
        height: ADD_FILE_MIN_HEIGHT
      }
    } else {
      options.maximized = true;
    }
    let accepted = await Widgets.showWidget(content, options).promise;
    if (!accepted) {
      return;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/superuserAddFile`, Tools.createFormData({
      dir: sourceId,
      fileName: fileName() || (file() && file().name),
      file: file(),
      isDir: (isDir ? 'true' : '')
    }), new OverlayProgressBar());
    $('#content-file-tree').jstree(true).refresh();
  } catch (err) {
    DOM.handleError(err);
  }
}

async function rerenderCache(archived) {
  let txt = Tools.translate('Connection with the server will be lost, '
    + 'and the server will become unavailable for some time.'
    + ' You will have to reload the page manually.');
  try {
    let result = await Widgets.prompt({
      id: `rerender`,
      title: Tools.translate('Rerendering'),
      label: txt
    });
    if (!result.accepted) {
      return;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/superuserRerender`, Tools.createFormData({
      targets: result.value,
      archive: (archive ? 'true' : '')
    }), new OverlayProgressBar());
  } catch (err) {
    DOM.handleError(err);
  }
}

async function rerenderPosts() {
  /*let content = Templating.template('manage/rerenderPostsWidget');
  let boards = KO.observable([]);
  KO.applyBindings({ boards: boards }, content);*/
  try {
    /*let options = {
      id: `rerenderPosts`,
      buttons: ['cancel', 'ok']
    };
    options.title = Tools.translate('Rerendering posts');*/
    /*if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: RERENDER_POSTS_MIN_WIDTH,
        height: RERENDER_POSTS_MIN_HEIGHT
      }
    } else {
      options.maximized = true;
    }*/
    let result = await Widgets.prompt({
      id: `rerenderPosts`,
      title: Tools.translate('Rerendering posts')//,
      //label: txt
    });
    if (!result.accepted) {
      return;
    }
    /*let accepted = await Widgets.showWidget(content, options).promise;
    if (!accepted) {
      return;
    }*/
    /*let formData = Tools.createFormData(boards().reduce((acc, boardName) => {
      acc[`board_${boardName}`] = boardName;
      return acc;
    }, {}));*/
    await AJAX.post(`/${Tools.sitePathPrefix()}action/superuserRerenderPosts`, /*formData*/Tools.createFormData({
      targets: result.value
    }), new OverlayProgressBar());
  } catch (err) {
    DOM.handleError(err);
  }
}

async function rebuildSearchIndex() {
  try {
    let accepted = await Widgets.confirm({
      id: `rebuildSearchIndex`,
      title: Tools.translate('Rebuilding search index')
    });
    if (!accepted) {
      return;
    }
    await AJAX.post(`${Tools.sitePathPrefix()}action/superuserRebuildSearchIndex`, Tools.createFormData(),
      new OverlayProgressBar());
  } catch (err) {
    DOM.handleError(err);
  }
}

async function reload(what) {
  if (!_(what).isArray()) {
    what = [what];
  }
  let data = what.filter(content => RELOADABLE_CONTENT.has(content)).reduce((acc, content) => {
    acc[content] = 'true';
    return acc;
  }, {});
  let txt = Tools.translate('Connection with the server will be lost, '
    + 'and the server will become unavailable for some time. '
    + 'You will have to reload the page manually.');
  let div = $(`<div>${txt}</div>`)[0];
  try {
    let accepted = await Widgets.confirm({
      id: `reloading`,
      title: Tools.translate('Reloading'),
      label: txt
    });
    if (!accepted) {
      return;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/superuserReload`, Tools.createFormData(data),
      new OverlayProgressBar());
  } catch (err) {
    DOM.handleError(err);
  }
}

async function initializeRegiteredUsers() {
  try {
    let users = await AJAX.api('registeredUsers');
    registeredUsers(users.concat(null).map(registeredUserToViewModel));
    let content = createRegisteredUsersSection(registeredUsers);
    $(content).accordion({
      collapsible: true,
      heightStyle: 'content',
      icons: false,
      header: '.js-registered-user-header',
      active: false
    });
    $('#users').empty().removeClass('loading-message').append(content);
    registeredUsers.subscribe(() => {
      $(content).accordion('refresh');
    });
  } catch (err) {
    DOM.handleError(err);
  }
}

function initializeFileContent() {
  $('#content-file-tree').empty().jstree({
    core: {
      error: DOM.handleError,
      animation: false,
      multiple: false,
      worker: false,
      force_text: true,
      data: {
        url: `/${Tools.sitePathPrefix()}api/fileTree.json`,
        data: (node) => { return { dir: node.id }; }
      }
    },
    plugins: ['contextmenu', 'types'],
    contextmenu: {
      items: (node, callback) => {
        let items = {};
        if ('./' !== node.id) {
          items.rename = {
            label: Tools.translate('Rename…', 'renameMenuItemText'),
            action: renameFile.bind(null, node.id, node.type)
          };
          items.delete = {
            label: Tools.translate('Delete', 'deleteMenuItemText'),
            action: deleteFile.bind(null, node.id, node.type),
            separator_after: true
          };
        }
        if ('file' === node.type) {
          items.edit = {
            label: Tools.translate('Edit…', 'editMenuItemText'),
            _disabled: !TEXT_FORMATS.has(node.id.split('.').pop()),
            action: editFile.bind(null, node.id)
          };
          items.download = {
            label: Tools.translate('Download', 'downloadMenuItemText'),
            action: downloadFile.bind(null, node.id)
          };
        } else if ('folder' === node.type) {
          items.addFile = {
            label: Tools.translate('Add file…', 'addFileMenuItemText'),
            action: addFile.bind(null, node.id, false)
          };
          items.addDirectory = {
            label: Tools.translate('Add directory…', 'addDirectoryMenuItemText'),
            action: addFile.bind(null, node.id, true)
          };
        }
        callback(items);
      }
    },
    types: {
      file: { icon: 'icon icon-file' },
      folder: { icon: 'icon icon-folder' }
    }
  });
}

function showFrequentlyUsedFilesMenu(__, e) {
  $(DOM.data('menuSelector', e.target)).remove();
  let files = _(Storage.frequentlyUsedFiles()).map((count, id) => {
    return {
      count: count,
      id: id
    };
  }).sort(function(file1, file2) {
    if (file1.count < file2.count) {
      return 1;
    } else if (file1.count > file2.count) {
      return -1;
    } else {
      return 0;
    }
  }).slice(0, MAX_SHOWN_FREQUENTLY_USED_FILES);
  let menu = Templating.template('manage/frequentlyUsedFilesMenu', { files: files });
  KO.applyBindings({
    editFile: (id) => {
      editFile(id);
    }
  }, menu);
  $(window.document.body).append(menu);
  return Widgets.showMenu(e);
}

function loadTabContent(tab) {
  if (loadedTabContent[tab]) {
    return;
  }
  switch (tab) {
  case 'users':
    initializeRegiteredUsers();
    break;
  case 'content':
    initializeFileContent();
    break;
  default:
    break;
  }
  loadedTabContent[tab] = {};
}

export function bannedUserToViewModel(user) {
  let inputIP = !user;
  user = user || {
    ip: '',
    ipv4: '',
    bans: {}
  };
  if (!user.bans) {
    user.bans = {};
  }
  let bans = user.bans || {};
  let u = Templating.createUser();
  Templating.boards().filter((board) => { return u.isModer(board); }).forEach((board) => {
    if (!bans[board.name]) {
      bans[board.name] = {
        boardName: board.name,
        expiresAt: '',
        level: 'NONE',
        reason: ''
      };
    }
  });
  bans = _(bans).reduce((acc, ban, boardName) => {
    acc[boardName] = {
      boardName: boardName,
      expiresAt: KO.observable(ban.expiresAt ? Tools.formattedDate(ban.expiresAt, BAN_DATE_TIME_FORMAT) : ''),
      initialLevel: ban.level || 'NONE',
      level: KO.observable(ban.level || 'NONE'),
      reason: KO.observable(ban.reason || ''),
      postNumber: ban.postNumber,
      createdAt: ban.createdAt
    };
    return acc;
  }, {});
  let level = KO.observable();
  level.subscribe((value) => {
    _(bans).each((ban) => {
      ban.level(level());
    });
  });
  let expiresAt = KO.observable('');
  expiresAt.subscribe((value) => {
    _(bans).each((ban) => {
      ban.expiresAt(expiresAt());
    });
  });
  let reason = KO.observable('');
  reason.subscribe((value) => {
    _(bans).each((ban) => {
      ban.reason(reason());
    });
  });
  return {
    title: (inputIP ? Tools.translate('New ban…') : (user.ipv4 || user.ip)),
    inputIP: inputIP,
    ip: KO.observable(user.ip || ''),
    ipv4: KO.observable(user.ipv4 || ''),
    bans: bans,
    level: level,
    expiresAt: expiresAt,
    reason: reason,
    delall: KO.observable(false),
    delallBoards: KO.observable([])
  };
}

function bannedUserFromViewModel(model) {
  if (typeof model !== 'object') {
    return model;
  }
  let bans = _(model.bans).reduce((acc, ban, boardName) => {
    acc[boardName] = {
      boardName: boardName,
      expiresAt: ban.expiresAt(),
      level: ban.level(),
      reason: ban.reason(),
      postNumber: ban.postNumber
    };
    return acc;
  }, {});
  return {
    ip: model.ip(),
    bans: bans,
    delall: model.delall(),
    delallBoards: model.delallBoards()
  };
}

export function initializeBannedUser(node) {
  let now = Tools.now();
  now.setTime(now.getTime() + (DEFAULT_BAN_TIME));
  $(node).find('.js-expires-at').each(function() {
    let input = $(this);
    input.datetimepicker({
      //showOn: 'button',
      dateFormat: BAN_DATE_FORMAT,
      timeFormat: BAN_TIME_FORMAT,
      defaultDate: $(input).val(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      minDate: now,
      onSelect: function(dateText) {
        this.boundData(dateText);
      }
    });
  });
}

export function createBannedUserFormData(data) {
  let o = { userIp: data.ip };
  _(data.bans).each((ban, boardName) => {
    o[`banBoard_${boardName}`] = boardName;
    o[`banLevel_${boardName}`] = ban.level;
    if (ban.expiresAt) {
      o[`banExpires_${boardName}`] = ban.expiresAt;
    }
    if (ban.reason) {
      o[`banReason_${boardName}`] = ban.reason;
    }
    if (ban.postNumber) {
      o[`banPostNumber_${boardName}`] = ban.postNumber;
    }
  });
  return Tools.createFormData(o);
}

export function createDelallData(data) {
  let o = { userIp: data.ip };
  if (data.delall) {
    data.delallBoards.forEach((boardName) => {
      o[`board_${boardName}`] = boardName;
    });
  }
  return Tools.createFormData(o);
}

async function banUser(users, data, index, update) {
  try {
    let formData = createBannedUserFormData(data);
    formData.append('timeOffset', Tools.dateTimeData().timeOffset);
    await AJAX.post(`/${Tools.sitePathPrefix()}action/banUser`, formData, new OverlayProgressBar());
    if (data.delall) {
      await AJAX.post(`/${Tools.sitePathPrefix()}action/delall`, createDelallData(data), new OverlayProgressBar());
    }
    let bannedUser = await AJAX.api('bannedUser', { ip: data.ip }, { indicator: new OverlayProgressBar() });
    users.splice(index(), update ? 1 : 0, bannedUserToViewModel(bannedUser));
  } catch (err) {
    DOM.handleError(err);
  }
}

export function createBannedUsersSection(users, { showHideButton, banUserCallback } = {}) {
  let content = Templating.template('manage/bannedUsers', {
    banLevels: [{
      level: 'NONE',
      description: Tools.translate('Not banned'),
      icon: 'checkmark'
    }, {
      level: 'READ_ONLY',
      description: Tools.translate('Posting prohibited'),
      icon: 'eye'
    },
    {
      level: 'NO_ACCESS',
      description: Tools.translate('Posting and reading prohibited'),
      icon: 'blocked'
    }]
  });
  KO.applyBindings({
    _: _,
    bannedUsers: users,
    showHideButton: showHideButton,
    clearDate: function() {
      this.expiresAt('');
    },
    check: function(__, e) {
      this.level($(e.target).prev().val());
    },
    submit: async function(index, update) {
      await banUser(users, bannedUserFromViewModel(this), index, update);
      if (typeof banUserCallback === 'function') {
        banUserCallback();
      }
    },
    removeBannedUser: (index) => {
      users.splice(index(), 1);
    }
  }, content);
  return content;
}

export async function initializeManagement() {
  KO.applyBindings({
    activateTab: (index, tab) => {
      DOM.activateTab('#management', index);
      if (tab) {
        loadTabContent(tab);
      }
    },
    showFrequentlyUsedFilesMenu: showFrequentlyUsedFilesMenu,
    showServerActionsMenu: (_, e) => {
      return Widgets.showMenu(e);
    },
    rerenderCache: rerenderCache,
    rerenderCacheWithArchived: rerenderCache.bind(null, true),
    rerenderPosts: rerenderPosts,
    rebuildSearchIndex: rebuildSearchIndex,
    reloadBoards: reload.bind(null, 'boards'),
    reloadConfig: reload.bind(null, 'config'),
    reloadTemplates: reload.bind(null, 'templates'),
    reloadAll: reload.bind(null, ['board', 'config', 'templates'])
  }, DOM.id('management'));
  try {
    let users = await AJAX.api('bannedUsers');
    bannedUsers(users.concat(null).map(bannedUserToViewModel));
    let content = createBannedUsersSection(bannedUsers, { showHideButton: true });
    $(content).accordion({
      collapsible: true,
      heightStyle: 'content',
      icons: false,
      header: '.js-banned-user-header',
      active: false,
      beforeActivate: function(e, ui) {
        var node = ui.newPanel[0];
        if (!node || node.processed) {
          return;
        }
        initializeBannedUser(node);
        node.processed = true;
      }
    });
    $('#bans').empty().removeClass('loading-message').append(content);
    bannedUsers.subscribe(() => {
      $(content).accordion('refresh');
    });
  } catch (err) {
    DOM.handleError(err);
  }
}
