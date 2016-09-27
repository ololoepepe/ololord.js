import $ from 'jquery';
import { EventEmitter } from 'events';
import KO from 'knockout';

import * as Constants from '../helpers/constants';
import * as DOM from '../helpers/dom';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import PopupMessage from './popup-message';

const MINIMUM_FILE_WIDTH = 200;
const MINIMUM_FILE_HEIGHT = 100;
const MINIMUM_IMAGE_WIDTH = 50;
const MINIMUM_IMAGE_HEIGHT = 50;
const BASE_SCALE_FACTOR = 10 * 1000 * 1000 * 1000;
const BORDER_WIDTH = 5;
const CONTROLS_HIDE_TIMEOUT = Constants.SECOND;
const SCALE_POPUP_TIMEOUT = Constants.SECOND;

let currentPlayer = null;
let activePlayers = 0;

class MovablePlayerViewModel {
  constructor(player, isImage) {
    this.player = player;
    this.lastVolume = 0;
    this.playing = KO.observable(false);
    this.volume = KO.observable(1);
    this.duration = KO.observable(0);
    this.currentTime = KO.observable(0);
    this.controlsVisible = KO.observable(false);
    this.trackInfoText = KO.computed(function() {
      let s = Tools.formatTime(this.currentTime());
      if (this.duration()) {
        s += ` / ${this.duration()}`;
      }
      return s;
    }, this);
    if (!isImage) {
      this.volume(this.player.content.volume);
      this.player.content.addEventListener('volumechange', () => {
        this.volume(this.player.content.volume);
      });
      this.player.content.addEventListener('durationchange', () => {
        this.duration(this.player.content.duration);
      });
      this.player.content.addEventListener('timeupdate', () => {
        this.currentTime(this.player.content.currentTime);
      });
      this.player.content.addEventListener('play', () => {
        this.playing(true);
      });
      this.player.content.addEventListener('pause', () => {
        this.playing(false);
      });
      this.player.content.addEventListener('ended', () => {
        this.playing(false);
      });
    }
  }

  playPause() {
    this.player.content[this.player.content.paused ? 'play' : 'pause']();
  }

  toggleMute() {
    if (this.volume()) {
      this.lastVolume = this.volume();
      var volume = 0;
    } else {
      var volume = this.lastVolume;
    }
    this.player.content.volume = volume;
  }
}

export default class MovablePlayer extends EventEmitter {
  constructor(fileInfo, { minimumContentWidth, minimumContentHeight, playlistMode, loop, play } = {}) {
    super();
    let isImage = Tools.isImageType(fileInfo.mimeType);
    this.minimumContentWidth = Tools.option(minimumContentWidth, 'number',
      isImage ? MINIMUM_IMAGE_WIDTH : MINIMUM_FILE_WIDTH, { test: (w) => { return w > 0; } });
    this.minimumContentHeight = Tools.option(minimumContentHeight, 'number',
      isImage ? MINIMUM_IMAGE_HEIGHT : MINIMUM_FILE_HEIGHT, { test: (h) => { return h > 0; } });
    this.playlistMode = !!playlistMode;
    this.scaleFactor = BASE_SCALE_FACTOR * 100;
    this.scaleFactorModifier = 1;
    this.fileInfo = fileInfo;
    this.node = Templating.template('widgets/movablePlayer', {
      fileInfo: this.fileInfo,
      isAudioType: Tools.isAudioType,
      isVideoType: Tools.isVideoType,
      isImageType: Tools.isImageType
    });
    this.contentContainer = DOM.queryOne('.js-movable-player-content', this.node);
    this.contentImage = this.contentContainer.firstElementChild;
    this.content = this.contentContainer.lastElementChild;
    this.contentImage.addEventListener('mousedown', this.mousedownHandler.bind(this), false);
    this.contentImage.addEventListener('mouseup', this.mouseupHandler.bind(this), false);
    this.contentImage.addEventListener('mousemove', this.mousemoveHandler.bind(this), false);
    this.contentImage.addEventListener('mousewheel', this.mousewheelHandler.bind(this), false);
    this.contentImage.addEventListener('DOMMouseScroll', this.mousewheelHandler.bind(this), false); //NOTE: Firefox
    this.controls = DOM.queryOne('.js-movable-player-controls', this.node);
    $(this.controls).click((e) => { e.stopPropagation(); });
    $(this.contentImage).click((e) => { e.stopPropagation(); });
    let defVol = Settings.defaultAudioVideoVolume() / 100;
    let remember = Settings.rememberAudioVideoVolume();
    let volume = remember ? Storage.getLocalObject('audioVideoVolume', defVol) : defVol;
    if (!volume) {
      this.lastVolume = 0.01;
    }
    if (!isImage && !this.playlistMode) {
      this.content.volume = volume;
    }
    this.viewModel = new MovablePlayerViewModel(this, isImage);
    KO.applyBindings(this.viewModel, this.node);
    if (!isImage) {
      this.durationSlider = DOM.queryOne('.js-movable-player-duration-slider', this.controls);
      this.volumeSlider = DOM.queryOne('.js-movable-player-volume-slider', this.controls);
      this.content.addEventListener('volumechange', () => {
        if (+$(this.volumeSlider).slider('value') === this.content.volume) {
          return;
        }
        $(this.volumeSlider).slider('value', this.content.volume);
      });
      if (loop) {
        this.content.loop = true;
      }
      this.controls.addEventListener('mouseover', () => {
        this.preventHideControls = true;
        if (this.controlsHideTimer) {
          clearInterval(this.controlsHideTimer);
          this.controlsHideTimer = null;
        }
      });
      this.controls.addEventListener('mouseleave', () => {
        this.preventHideControls = false;
        this.controlsHideTimer = setTimeout(this.hideControls.bind(this), CONTROLS_HIDE_TIMEOUT);
      });
      this.content.addEventListener('timeupdate', () => {
        if (this.userSliding) {
          return;
        }
        try {
          //NOTE: Required to prevent calling the .slider method after the player node is deleted
          $(this.durationSlider).slider('value', this.content.currentTime);
        } catch (err) {
          //NOTE: Do nothing
        }
      });
      this.content.addEventListener('durationchange', () => {
        $(this.durationSlider).slider('destroy');
        $(this.durationSlider).slider({
          min: 0,
          max: this.content.duration,
          step: 1,
          value: 0,
          start: () => {
            this.userSliding = true;
          },
          stop: () => {
            this.userSliding = false;
            this.content.currentTime = +$(this.durationSlider).slider('value');
          }
        });
      });
      $(this.durationSlider).slider({
        min: 0,
        max: 0,
        step: 0,
        value: 0,
        disabled: true
      });
      $(this.volumeSlider).slider({
        min: 0,
        max: 1,
        step: 0.01,
        value: volume,
        slide: (e, ui) => {
          let volume = ui.value;
          this.content.volume = volume;
        }
      });
      if (play && (Tools.isAudioType(this.fileInfo.mimeType) || Tools.isVideoType(this.fileInfo.mimeType))) {
        if (+play > 0) {
          setTimeout(() => {
            this.content.play();
          }, +play);
        } else {
          this.content.play();
        }
      }
    } else {
      DOM.queryOne('.js-movable-player-sliders', this.controls).style.display = 'none';
    }
    this.visible = false;
    this.isInitialized = false;
  }

  scaled(n, factor) {
    factor = +factor || this.scaleFactor;
    return Math.round((+n || 0) * (factor / BASE_SCALE_FACTOR / 100));
  }

  hideControls() {
    this.viewModel.controlsVisible(false);
    this.controlsHideTimer = null;
  }

  mousedownHandler(e) {
    if (e.button) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.isMoving = true;
    this.mouseStartPosition = {
      x: e.clientX,
      y: e.clientY
    };
    this.mousePositon = Tools.cloned(this.mouseStartPosition);
  }

  mouseupHandler(e) {
    if (e.button) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (!this.isMoving) {
      return;
    }
    this.isMoving = false;
    if (this.mouseStartPosition.x === e.clientX && this.mouseStartPosition.y === e.clientY) {
      this.emit('requestClose');
    }
  }

  mousemoveHandler(e) {
    if (!Tools.isImageType(this.fileInfo.mimeType)) {
      if ('none' === this.controls.style.display) {
        this.viewModel.controlsVisible(true);
        if (!this.preventHideControls) {
          this.controlsHideTimer = setTimeout(this.hideControls.bind(this), CONTROLS_HIDE_TIMEOUT);
        }
      } else if (this.controlsHideTimer) {
        clearInterval(this.controlsHideTimer);
        this.controlsHideTimer = null;
        if (!this.preventHideControls) {
          this.controlsHideTimer = setTimeout(this.hideControls.bind(this), CONTROLS_HIDE_TIMEOUT);
        }
      }
    }
    if (!this.isMoving) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    let dx = e.clientX - this.mousePositon.x;
    let dy = e.clientY - this.mousePositon.y;
    this.mousePositon.x = e.clientX;
    this.mousePositon.y = e.clientY;
    let node = $(this.node);
    let pos = node.position();
    node.css({
      top: `${pos.top + dy}px`,
      left: `${pos.left + dx}px`
    });
  }

  resetScale() {
    let container = $(this.contentContainer);
    let previousContainerWidth = container.width();
    let previousContainerHeight = container.height();
    let width = this.scaled(this.fileInfo.width);
    let height = this.scaled(this.fileInfo.height);
    container.width(width);
    container.height(height);
    let dx = (container.width() - previousContainerWidth) / 2;
    let dy = (container.height() - previousContainerHeight) / 2;
    let node = $(this.node);
    let pos = node.position();
    node.css({
      top: `${pos.top - dy}px`,
      left: `${pos.left - dx}px`
    });
    this.showScalePopup();
  }

  mousewheelHandler(e) {
    e.preventDefault();
    let imageZoomSensitivity = Settings.imageZoomSensitivity();
    if ((e.wheelDelta || -e.detail) < 0) {
      imageZoomSensitivity *= -1;
    }
    let previousScaleFactor = this.scaleFactor;
    let previousScaleFactorModifier = this.scaleFactorModifier;
    if (imageZoomSensitivity < 0) {
      while ((this.scaleFactor + imageZoomSensitivity * BASE_SCALE_FACTOR / this.scaleFactorModifier) <= 0) {
        this.scaleFactorModifier *= 10;
      }
    } else {
      let changed = false;
      while (this.scaleFactorModifier >= 1
        && (this.scaleFactor * this.scaleFactorModifier - imageZoomSensitivity * BASE_SCALE_FACTOR) >= 0) {
        this.scaleFactorModifier /= 10;
        changed = true;
      }
      if (changed) {
        this.scaleFactorModifier *= 10;
      }
    }
    this.scaleFactor += (imageZoomSensitivity * BASE_SCALE_FACTOR / this.scaleFactorModifier);
    if ((imageZoomSensitivity < 0) && ((this.scaled(this.fileInfo.width) < this.minimumContentWidth)
      || (this.scaled(this.fileInfo.height) < this.minimumContentHeight))) {
      this.scaleFactor = previousScaleFactor;
      this.scaleFactorModifier = previousScaleFactorModifier;
    }
    this.resetScale();
  }

  show() {
    if (this.visible) {
      return;
    }
    ++activePlayers;
    if (!this.wasInDOM) {
      window.document.body.appendChild(this.node);
      this.wasInDOM = true;
    } else {
      $(this.node).show();
    }
    this.visible = true;
    if (!this.isInitialized) {
      this.reset();
      this.isInitialized = true;
    }
  }

  hide(removeFromDOM) {
    if (!this.visible) {
      return;
    }
    if (!removeFromDOM) {
      $(this.node).hide();
    }
    --activePlayers;
    if (!Tools.isImageType(this.fileInfo.mimeType)) {
      if (!this.playlistMode) {
        Storage.setLocalObject('audioVideoVolume', +this.content.volume);
      }
      this.content.pause();
    }
    if (removeFromDOM) {
      window.document.body.removeChild(this.node);
    }
    this.visible = false;
  }

  reset(play) {
    let width = this.fileInfo.width;
    let height = this.fileInfo.height;
    let w = $(window);
    let windowWidth = w.width();
    let windowHeight = w.height();
    let borderWidth = 2 * BORDER_WIDTH;
    this.scaleFactor = BASE_SCALE_FACTOR * 100;
    this.scaleFactorModifier = 1;
    if (width > (windowWidth - borderWidth) || height > (windowHeight - borderWidth)) {
      while (this.scaled(this.fileInfo.width) >= (windowWidth - borderWidth)) {
        if ((this.scaleFactor - Settings.imageZoomSensitivity() * BASE_SCALE_FACTOR / this.scaleFactorModifier) > 0) {
          this.scaleFactor -= (Settings.imageZoomSensitivity() * BASE_SCALE_FACTOR / this.scaleFactorModifier);
        } else {
          this.scaleFactorModifier *= 10;
        }
      }
      while (this.scaled(this.fileInfo.height) >= (windowHeight - borderWidth)) {
        if ((this.scaleFactor - Settings.imageZoomSensitivity() * BASE_SCALE_FACTOR / this.scaleFactorModifier) > 0) {
          this.scaleFactor -= (Settings.imageZoomSensitivity() * BASE_SCALE_FACTOR / this.scaleFactorModifier);
        } else {
          this.scaleFactorModifier *= 10;
        }
      }
    }
    this.resetScale();
    width = this.scaled(width);
    height = this.scaled(height);
    let node = $(this.node);
    let containerWidth = width + borderWidth;
    let containerHeight = height + borderWidth;
    node.css({
      top: `${(windowHeight - containerHeight) / 2}px`,
      left: `${(windowWidth - containerWidth) / 2}px`,
    });
    if (Tools.isAudioType(this.fileInfo.mimeType) || Tools.isVideoType(this.fileInfo.mimeType)) {
      this.content.currentTime = 0;
      if (!this.playlistMode) {
        let defVol = Settings.defaultAudioVideoVolume() / 100;
        let remember = Settings.rememberAudioVideoVolume();
        this.content.volume = remember ? Storage.getLocalObject('audioVideoVolume', defVol) : defVol;
      }
    }
    if (play) {
      if (+play > 0) {
        setTimeout(() => {
          this.content.play();
        }, +play);
      } else {
        this.content.play();
      }
    }
  }

  showScalePopup() {
    let width = this.scaled(this.fileInfo.width);
    let height = this.scaled(this.fileInfo.height);
    let text = `${width}x${height} (${this.scaleFactor / BASE_SCALE_FACTOR}%)`;
    if (this.scalePopup) {
      this.scalePopup.resetContent(text);
      this.scalePopup.resetTimeout(SCALE_POPUP_TIMEOUT);
      clearTimeout(this.scalePopupTimer);
    } else {
      this.scalePopup = PopupMessage.showPopup(text, { 'timeout': SCALE_POPUP_TIMEOUT });
    }
    this.scalePopupTimer = setTimeout(() => {
      this.scalePopup = null;
      this.scalePopupTimer = null;
    }, SCALE_POPUP_TIMEOUT);
  }

  static createPlayer(href, mimeType, width, height, { loop, play } = {}) {
    loop = Tools.option(loop, 'boolean', Settings.loopAudioVideo());
    play = Tools.option(play, ['boolean', 'number'], Settings.playAudioVideoImmediately()
      && Constants.AUTO_PLAY_DELAY, {
      test: (p) => {
        if (typeof p === 'number') {
          return p > 0;
        } else {
          return true;
        }
      },
      strict: true
    });
    let isImage = Tools.isImageType(mimeType);
    return new MovablePlayer({
      href: href,
      mimeType: mimeType,
      width: width,
      height: height
    }, {
      minimumContentWidth: isImage ? MINIMUM_IMAGE_WIDTH : MINIMUM_FILE_WIDTH,
      minimumContentHeight: isImage ? MINIMUM_IMAGE_HEIGHT : MINIMUM_FILE_HEIGHT,
      loop: loop,
      play: play
    });
  }

  static hasActivePlayers() {
    return activePlayers > 0;
  }

  static currentPlayer(player) {
    if (typeof player !== 'undefined') {
      currentPlayer = player;
    } else {
      return currentPlayer;
    }
  }
}
