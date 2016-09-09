import _ from 'underscore';
import $ from 'jquery';
import KO from 'knockout';

import * as AJAX from '../helpers/ajax';
import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as FileInputs from './file-inputs';
import * as Widgets from '../widgets';
import MovablePlayer from '../widgets/movable-player';
import OverlayProgressBar from '../widgets/overlay-progress-bar';

const DEFAULT_FILE_WIDTH = 300;
const DEFAULT_FILE_HEIGHT = 300;
const ADD_FILES_MIN_WIDTH = 400;
const ADD_FILES_MIN_HEIGHT = 300;
const EDIT_RATING_MIN_WIDTH = 350;
const EDIT_RATING_MIN_HEIGHT = 180;

let files = null;
let players = {};

export async function addFiles(boardName, postNumber, fileCount) {
  postNumber = Tools.option(postNumber, 'number', 0, { test: (pn) => { return pn > 0; } });
  fileCount = Tools.option(fileCount, 'number', -1);
  if (!boardName || !postNumber || fileCount < 0) {
    return false;
  }
  let post = DOM.id(`post-${postNumber}`);
  if (!post) {
    return false;
  }
  let div = Templating.template('widgets/addFilesWidget', { fileCount: fileCount });
  let password = KO.observable((typeof value !== 'undefined') ? value : Storage.password());
  let passwordVisible = KO.observable(false);
  KO.applyBindings({
    password: password,
    passwordVisible: passwordVisible,
    togglePasswordVisibility: (_, e) => {
      passwordVisible(!passwordVisible());
    },
  }, div);
  $(div).find('.js-file-inputs').append(FileInputs.createFileInput());
  try {
    let options = {
      id: `addFiles/${boardName}/${postNumber}`,
      title: Tools.translate('Add files'),
      buttons: ['cancel', 'ok']
    };
    if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: ADD_FILES_MIN_WIDTH,
        height: ADD_FILES_MIN_HEIGHT
      }
    } else {
      options.maximized = true;
    }
    let result = await Widgets.showWidget(div, options).promise;
    if (!result) {
      return false;
    }
    let formData = Tools.createFormData(div, {
      boardName: boardName,
      postNumber: postNumber,
      fileHashes: $(div).find('.js-file-hashes').val(),
      password: password()
    });
    await AJAX.post(`/${Tools.sitePathPrefix()}action/addFiles`, formData, new OverlayProgressBar());
    return true;
  } catch (err) {
    return Promise.reject(err);
  }
};

export async function deleteFile(fileName) {
  if (!fileName) {
    return false;
  }
  try {
    let { accepted, password } = await Widgets.requestPassword({ id: `deleteFile/${fileName}` });
    if (!accepted) {
      return false;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/deleteFile`, Tools.createFormData({
      fileName: fileName,
      password: password
    }), new OverlayProgressBar());
    return true;
  } catch (err) {
    return Promise.reject(err);
  }
};

export async function editFileRating(fileName, rating) {
  if (!fileName || !rating) {
    return false;
  }
  let div = Templating.template('widgets/editFileRatingWidget', { rating: true });
  rating = KO.observable(rating);
  let password = KO.observable((typeof value !== 'undefined') ? value : Storage.password());
  let passwordVisible = KO.observable(false);
  KO.applyBindings({
    rating: rating,
    password: password,
    passwordVisible: passwordVisible,
    togglePasswordVisibility: (_, e) => {
      passwordVisible(!passwordVisible());
    },
  }, div);
  try {
    let options = {
      id: `editFileRating/${fileName}`,
      title: Tools.translate('Edit file rating'),
      buttons: ['cancel', 'ok']
    };
    if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: EDIT_RATING_MIN_WIDTH,
        height: EDIT_RATING_MIN_HEIGHT
      }
    } else {
      options.maximized = true;
    }
    let result = await Widgets.showWidget(div, options).promise;
    if (!result) {
      return false;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/editFileRating`, Tools.createFormData({
      fileName: fileName,
      rating: rating(),
      password: password()
    }), new OverlayProgressBar());
    return true;
  } catch (err) {
    return Promise.reject(err);
  }
}

export let hideImage = function() {
  let currentPlayer = MovablePlayer.currentPlayer();
  if (!currentPlayer) {
    return;
  }
  currentPlayer.hide();
  MovablePlayer.currentPlayer(null);
  $('.js-leaf-button').hide();
};

export function showImage(href, mimeType, width, height) {
  hideImage();
  if (!Tools.isSupportedByPlayer(mimeType)) {
    let w = window.open(href, '_blank').focus();
    if (w) {
      w.focus();
    }
    return;
  }
  width = Tools.option(width, 'number', DEFAULT_FILE_WIDTH, { test: (w) => { return w > 0; } });
  height = Tools.option(height, 'number', DEFAULT_FILE_HEIGHT, { test: (h) => { return h > 0; } });
  let currentPlayer = players[href] || MovablePlayer.createPlayer(relativeHref(href), mimeType, width, height, {
    loop: Settings.loopAudioVideo(),
    play: Settings.playAudioVideoImmediately() && Constants.AUTO_PLAY_DELAY
  });
  if (players.hasOwnProperty(href)) {
    if (Settings.resetFileScaleOnOpening()) {
      currentPlayer.reset(Settings.playAudioVideoImmediately() && Constants.AUTO_PLAY_DELAY);
    }
  } else {
    currentPlayer.on('requestClose', (e) => {
      hideImage();
    });
  }
  players[href] = currentPlayer;
  MovablePlayer.currentPlayer(currentPlayer);
  currentPlayer.show();
  currentPlayer.showScalePopup();
  $('.js-leaf-button').show();
}

function relativeHref(href) {
  return href ? href.replace(/^https?\:\/\/[^\/]+/, '') : '';
}

export function nextOrPreviousFile(next) {
  let currentPlayer = MovablePlayer.currentPlayer();
  if (!currentPlayer || !files) {
    return null;
  }
  let leafThroughImagesOnly = Settings.leafThroughImagesOnly();
  let tmpFiles = files.filter((file) => {
    let mimeType = file.mimeType;
    if (Tools.isImageType(mimeType)) {
      return true;
    }
    if (leafThroughImagesOnly) {
      return false;
    }
    return ('application/pdf' !== mimeType && Tools.isMediaTypeSupported(mimeType));
  });
  if (tmpFiles.length < 1) {
    return;
  }
  let href = currentPlayer.fileInfo.href;
  if (!href) {
    return null;
  }
  let ind = _(tmpFiles).findIndex((file) => {
    return (href === file.href);
  });
  if (ind < 0) {
    return null;
  }
  if (next) {
    return tmpFiles[(ind < tmpFiles.length - 1) ? (ind + 1) : 0];
  } else {
    return tmpFiles[(ind > 0) ? (ind - 1) : (tmpFiles.length - 1)];
  }
}

export function initializeFiles() {
  files = DOM.queryAll('.js-post-file').map((node) => {
    return {
      href: relativeHref(DOM.data('href', node)),
      mimeType: DOM.data('mimeType', node),
      width: +DOM.data('width', node) || DEFAULT_FILE_WIDTH,
      height: +DOM.data('height', node) || DEFAULT_FILE_HEIGHT
    };
  });
}
