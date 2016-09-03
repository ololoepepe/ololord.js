import _ from 'underscore';
import $ from 'jquery';
import KO from 'knockout';
import UUID from 'uuid';
import VK from 'vk-openapi';

import * as AJAX from '../helpers/ajax';
import * as DOM from '../helpers/dom';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Tools from '../helpers/tools';
import * as Templating from '../helpers/templating';
import * as Auth from './auth';
import * as Drawing from './drawing';
import * as Widgets from '../widgets';
import * as PopupMessage from '../widgets/popup-message';

const TEXTAREA_DELTA_WIDTH = 6;
const MAX_FILE_NAME_LENGTH = 30;
export const TEXTAREA_MIN_WIDTH = 400;
const SELECT_VK_TRACK_MIN_WIDTH = 400;
const SELECT_VK_TRACK_MIN_HEIGHT = 500;

function getFileHashes(div) {
  let parent = $(div).parent();
  let hashes = parent.find('.js-file-hashes');
  while (parent[0] && !hashes[0]) {
    parent = $(parent).parent();
    hashes = parent.find('.js-file-hashes');
  }
  return hashes[0];
}

function removeFileHash(div) {
  if (!div || !div.fileHash) {
    return;
  }
  let fileHashes = getFileHashes(div);
  if (!fileHashes) {
    return;
  }
  let list = fileHashes.value.split(',');
  let ind = list.indexOf(div.fileHash);
  if (ind >= 0) {
    list.splice(ind, 1);
  }
  fileHashes.value = list.join(',');
  delete div.fileHash;
}

export function clearFileInput(div) {
  if (!div) {
    return;
  }
  $(div).find('.js-file-input-preview').empty().addClass('icon-32 icon-file-open');
  $(div).find('.js-file-input-label-text').empty().attr('title', '');
  removeFileHash(div);
  ['fileInput', 'file', 'fileBackup', 'fileUrl'].forEach((name) => {
    if (div.hasOwnProperty(name)) {
      delete div[name];
    }
  });
}

async function getFileDescription(div) {
  if (div.file) {
    let fileSize = +div.file.size;
    let maxFileSize = Tools.maxFileSize(Tools.boardName());
    if (fileSize > maxFileSize) {
      let txt = Tools.translate('Selected file is too large', 'fileTooLargeWarningText')
        + ` (>${Tools.readableSize(maxFileSize)})`;
      PopupMessage.showPopup(txt, { type: 'warning' });
    }
    return `(${Tools.readableSize(fileSize)})`;
  } else if (/^vk\:\/\//.test(div.fileUrl)) {
    return '[VK]';
  } else {
    try {
      let headers = await AJAX.api('fileHeaders', { url: encodeURIComponent(div.fileUrl) });
      let size = Tools.option(+headers['content-length'], 'number', 0, { test: (sz) => { return sz > 0; } });
      return size ? `(${Tools.readableSize(size)}) [URL]` : '[URL]';
    } catch (err) {
      DOM.handleError(err);
      return '[URL]';
    }
  }
}

function setFileName(div, id) {
  div.fileName = `file_${div.fileUrl ? 'url_' : ''}${id}`;
  $(div).find('.js-rating-select').attr('name', `file_${id}_rating`);
}

async function checkFileExistence(div) {
  try {
    let data = await Tools.readAs(div.file);
    div.fileHash = Tools.sha1(new Buffer(data));
    let exists = await AJAX.api('fileExistence', { fileHash: div.fileHash });
    if (!exists) {
      return;
    }
    setFileName(div, div.fileHash);
    $(div).find('.js-sign-file-exists-on-server').show();
    let fileHashes = getFileHashes(div);
    if (fileHashes.value.indexOf(div.fileHash) < 0) {
      fileHashes.value = `${fileHashes.value}${fileHashes.value.length > 0 ? ',' : ''}${div.fileHash}`;
    }
    if (div.hasOwnProperty('fileInput')) {
      delete div.fileInput;
    }
    if (div.hasOwnProperty('file')) {
      div.fileBackup = div.file;
      delete div.file;
    }
  } catch (err) {
    DOM.handleError(err);
  }
}

async function previewImage(div) {
  if (!div.file) {
    return;
  }
  try {
    let url = await Tools.readAs(div.file, 'DataURL');
    let img = $(`<img src='${url}' class='invert' />`); //NOTE: Double inversion --> not inverted
    $(div).find('.js-file-input-preview').removeClass('icon-32').removeClassWild('icon-file-*').append(img);
  } catch (err) {
    DOM.handleError(err);
  }
}

const FILE_TYPE_REGEXPS = [{
  type: 'picture',
  regexp: /\.(jpe?g|png|gif)$/i
}, {
  type: 'audio',
  regexp: /\.(mpeg|mp1|m1a|m2a|mpa|mp3|mpg|ogg|wav)$/i
}, {
  type: 'video',
  regexp: /\.(mp4|ogv|webm)$/i
}, {
  type: 'pdf',
  regexp: /\.(pdf)$/i
}];

function previewFileType(div, fileName) {
  let fileType = _(FILE_TYPE_REGEXPS).find(o => fileName.match(o.regexp));
  fileType = fileType ? fileType.type : 'open';
  $(div).find('.js-file-input-preview').removeClassWild('icon-file-*').addClass(`icon-32 icon-file-${fileType}`);
}

async function stripEXIF(div) {
  try {
    let data = await Tools.readAs(div.file);
    let file = Tools.stripEXIFData(data, div.file.name);
    if (file) {
      div.file = file;
    }
    if (Settings.showAttachedFilePreview()) {
      previewImage(div);
    }
  } catch (err) {
    DOM.handleError(err);
  }
}

function isEmpty(div) {
  return !div.fileHash && !div.file && !div.fileUrl;
}

export async function fileAddedCommon(div) {
  if (!div || (!div.file && !div.fileUrl)) {
    return;
  }
  let fileName = (div.file ? div.file.name : div.fileUrl.split('/').pop()) || '';
  let fullFileName = fileName;
  if (fileName.length > MAX_FILE_NAME_LENGTH) {
    fileName = fileName.substr(0, MAX_FILE_NAME_LENGTH - 1) + '…';
  }
  try {
    let txt = await getFileDescription(div);
    $(div).find('.js-file-input-label-text').text(`${fileName} ${txt}`).attr('title', fullFileName);
  } catch (err) {
    DOM.handleError(err);
  }
  let uuid = UUID.v4();
  setFileName(div, uuid);
  removeFileHash(div);
  if (div.file && Settings.checkFileExistence()) {
    checkFileExistence(div);
  }
  if (div.file && fullFileName.match(/\.(jpe?g|png|gif)$/i) && Settings.showAttachedFilePreview()) {
    if (!fileName.match(/\.(jpe?g)$/i) || !Settings.stripExifFromJpeg()) {
      previewImage(div);
    }
  } else {
    previewFileType(div, fullFileName);
  }
  if (div.file && fullFileName.match(/\.(jpe?g)$/i) && Settings.stripExifFromJpeg()) {
    stripEXIF(div);
  }
  if (div.hasOwnProperty('fileInput')) {
    delete div.fileInput;
  }
  let maxCount = Tools.maxFileCount(Tools.boardName());
  maxCount -= +DOM.data('fileCount', div, true) || 0;
  if (maxCount <= 0) {
    return;
  }
  let parent = div.parentNode;
  if (parent.children.length >= maxCount) {
    return;
  }
  if (_(parent.children).some(isEmpty)) {
    return;
  }
  $(parent).append(createFileInput());
}

function fileDrop(div, dataTransfer) {
  FileInputs.clearFileInput(div);
  if (_(dataTransfer.types).contains('text/uri-list')) {
    div.fileUrl = dataTransfer.getData('text/uri-list');
    fileAddedCommon(div);
  } else if (dataTransfer.files) {
    div.file = dataTransfer.files[0];
    fileAddedCommon(div);
  }
}

function browseFile(div) {
  if (!div) {
    return;
  }
  div.fileInput = $(`<input type='file' accept='${Tools.supportedFileTypes(Tools.boardName()).join(',')}'>`)[0];
  $(div.fileInput).change(() => {
    if (!div.fileInput.value) {
      return removeFile(div);
    }
    let file = div.fileInput.files[0];
    clearFileInput(div);
    div.file = file;
    fileAddedCommon(div);
  });
  div.fileInput.click();
}

async function attachFileByLink(div) {
  if (!div) {
    return;
  }
  try {
    let result = await Widgets.prompt({
      title: Tools.translate('URL:', 'linkLabelText'),
      value: div.fileUrl
    });
    if (!result.accepted || !result.value) {
      return;
    }
    clearFileInput(div);
    div.fileUrl = result.value;
    fileAddedCommon(div);
  } catch (err) {
    DOM.handleError(err);
  }
}

function getVKLoginStatus() {
  Auth.initializeVK();
  return new Promise((resolve, reject) => {
    VK.Auth.getLoginStatus((response) => {
      if (!response || !response.session || !response.session.mid) {
        return reject(Tools.translate('Vkontakte login failed'));
      }
      resolve(response.session.mid);
    });
  });
}

function vkAPICall(method, parameters) {
  Auth.initializeVK();
  return new Promise((resolve, reject) => {
    VK.Api.call(method, parameters, (response) => {
      if (!response || !response.response) {
        return reject(Tools.translate('Vkontakte API call failed'));
      }
      resolve(response.response);
    });
  });
}

async function attachFileByVk(div) {
  if (!div) {
    return;
  }
  try {
    let uid = await getVKLoginStatus();
    let response = await vkAPICall('audio.get', { owner_id: uid });
    let content = Templating.template('postForm/vkAudioList', { tracks: response.slice(1) });
    let options = {
      id: `selectVKTrack`,
      title: Tools.translate('Select a track', 'selectTrackTitle'),
      buttons: ['cancel', 'ok']
    };
    if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: SELECT_VK_TRACK_MIN_WIDTH,
        height: SELECT_VK_TRACK_MIN_HEIGHT
      }
    } else {
      options.maximized = true;
    }
    let result = await Widgets.showWidget(content, options).promise;
    if (!result) {
      return;
    }
    let trackID = +DOM.queryOne('input[name="track"]:checked', content).value;
    if (!trackID) {
      return;
    }
    let title = (_(response).find((track) => { return track.aid === trackID; }) || { title: 'unknown' }).title;
    clearFileInput(div);
    div.fileUrl = `vk://${uid}_${trackID}/${title}`;
    fileAddedCommon(div);
  } catch (err) {
    DOM.handleError(err);
  }
}

export function removeFile(div) {
  if (!div) {
    return;
  }
  let parent = div.parentNode;
  removeFileHash(div);
  $(div).remove();
  if (_(parent.children).some(isEmpty)) {
    return;
  }
  $(parent).append(createFileInput());
}

export function createFileInput() {
  let fileInput = Templating.template('postForm/fileInput');
  KO.applyBindings({
    browseFile: browseFile.bind(null, fileInput),
    attachFileByLink: (_, e) => {
      e.stopPropagation();
      attachFileByLink(fileInput);
    },
    attachFileByDrawing: (_, e) => {
      e.stopPropagation();
      Drawing.attachFileByDrawing(fileInput);
    },
    attachFileByVk: (_, e) => {
      e.stopPropagation();
      attachFileByVk(fileInput);
    },
    removeFile: (_, e) => {
      e.stopPropagation();
      removeFile(fileInput);
    },
    dragOver: (_, e) => {
      e.preventDefault();
      $(fileInput).addClass('drag');
    },
    dragLeave: (_, e) => {
      e.preventDefault();
      $(fileInput).removeClass('drag');
    },
    fileDrop: (_, e) => {
      e.preventDefault();
      $(fileInput).removeClass('drag');
      fileDrop(fileInput, e.dataTransfer);
    }
  }, fileInput);
  return fileInput;
}
