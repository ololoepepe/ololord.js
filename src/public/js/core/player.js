import _ from 'underscore';
import $ from 'jquery';
import KO from 'knockout';

import * as AJAX from '../helpers/ajax';
import * as DOM from '../helpers/dom';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as Posts from './posts';
import * as Widgets from '../widgets';
import MovablePlayer from '../widgets/movable-player';
import OverlayProgressBar from '../widgets/overlay-progress-bar';
import PopupMessage from '../widgets/popup-message';

const EDIT_TAGS_MIN_WIDTH = 400;
const EDIT_TAGS_MIN_HEIGHT = 300;
const ADD_RADIO_STREAM_MIN_WIDTH = 400;
const ADD_RADIO_STREAM_MIN_HEIGHT = 120;
const TAGS = ['album', 'artist', 'title', 'year'];

let playerElement = null;
let movablePlayer = null;
let playerUserSliding = false;
let lastPlayerVolume = 0;

class TracksViewModel {
  constructor() {
    this.tracks = KO.observableArray(Storage.playerTracks());
    this.currentTime = KO.observable(0);
    this.volume = KO.observable(1);
    this.playing = KO.observable(false);
    this.isAudioType = Tools.isAudioType;
    this.trackTagsText = KO.computed(function() {
      let track = this.currentTrack();
      if (!track) {
        return '';
      }
      let s = track.artist || '';
      s += (track.artist && track.title) ? ' — ' : '';
      s += track.title || '';
      s += ((track.artist || track.title) && track.album) ? ' ' : '';
      s += track.album ? `[${track.album}]` : '';
      s += (s && track.year) ? `(${track.year})` : '';
      s += s ? ' ' : '';
      return s;
    }, this);
    this.trackTagsVisible = KO.computed(function() {
      return !!this.currentTrack();
    }, this);
    this.trackInfoText = KO.computed(function() {
      let track = this.currentTrack();
      if (!track) {
        return '';
      }
      let s = Tools.formatTime(this.currentTime());
      if (track.duration) {
        s += ` / ${track.duration}`;
      }
      return s;
    }, this);
  }

  updateTrack(id, track) {
    let thisTracks = this.tracks();
    thisTracks.some((thisTrack, thisIndex) => {
      if (id !== thisTrack.id) {
        return;
      }
      track = Tools.cloned(track);
      track.isCurrent = thisTrack.isCurrent;
      this.tracks.splice(thisIndex, 1, track);
    });
  }

  updateTracks(tracks) {
    tracks = tracks || Storage.playerTracks();
    let thisTracks = this.tracks();
    tracks.forEach((track, index) => {
      let thisIndex = _(thisTracks).findIndex((thisTrack) => { return track.id === thisTrack.id; });
      if (thisIndex >= 0) {
        if (index !== thisIndex) {
          let lastIndex = Math.max(index, thisIndex);
          let [tmp] = this.tracks.splice(Math.min(index, thisIndex), 1, this.tracks.splice(lastIndex, 1)[0]);
          this.tracks.splice(lastIndex, 0, tmp);
        }
      } else {
        this.tracks.push(track);
      }
    });
    for (let thisIndex = thisTracks.length - 1; thisIndex >= 0; --thisIndex) {
      let thisTrack = thisTracks[thisIndex];
      if (!tracks.some((track) => { return track.id === thisTrack.id; })) {
        this.tracks.splice(thisIndex, 1);
      }
    }
  }

  currentTrack(id, current) {
    if (typeof id === 'undefined') {
      return _(this.tracks()).find(track => track.isCurrent);
    } else {
      current = (typeof current !== 'undefined') ? !!current : true;
      let thisTracks = this.tracks();
      let index = _(thisTracks).findIndex((track) => { return id === track.id; });
      if (index < 0) {
        return;
      }
      if (current) {
        let index = _(thisTracks).findIndex(track => track.isCurrent);
        if (index >= 0) {
          let track = Tools.cloned(thisTracks[index]);
          track.isCurrent = false;
          this.tracks.splice(index, 1, track);
        }
      }
      let track = Tools.cloned(thisTracks[index]);
      track.isCurrent = current;
      this.tracks.splice(index, 1, track);
      return track;
    }
  }

  nextTrack(loop) {
    let ctrack = this.currentTrack();
    if (!ctrack) {
      return;
    }
    let thisTracks = this.tracks();
    let index = _(thisTracks).findIndex((track) => { return ctrack.id === track.id; });
    if (index < 0) {
      return;
    }
    if (index < thisTracks.length - 1) {
      return thisTracks[index + 1];
    } else if (loop) {
      return thisTracks[0];
    }
  }

  previousTrack(loop) {
    let ctrack = this.currentTrack();
    if (!ctrack) {
      return;
    }
    let thisTracks = this.tracks();
    let index = _(thisTracks).findIndex((track) => { return ctrack.id === track.id; });
    if (index < 0) {
      return;
    }
    if (index > 0) {
      return thisTracks[index - 1];
    } else if (loop) {
      return _(thisTracks).last();
    }
  }

  trackInfo(track) {
    if (!track || (!track.artist && !track.title && !track.year)) {
      return '';
    }
    let s = '<br />';
    if (track.artist) {
      s += track.artist;
      if (track.title) {
        s += ' — ';
      }
    }
    if (track.title) {
      s += track.title;
    }
    if (track.year) {
      s += ` (${track.year})`;
    }
    return s;
  }

  trackDrag(track, e) {
    e.dataTransfer.setData('text', track.id);
    return true;
  }

  trackDrop(track, e) {
    e.preventDefault();
    trackDrop(e.dataTransfer.getData('text'), track.id);
  }

  playTrack(track) {
    playTrack(track.id);
  }

  removeFromPlaylist(track, e) {
    e.stopPropagation();
    removeFromPlaylist(track.id);
  }

  async editAudioTags(track, e) {
    e.stopPropagation();
    try {
      let result = await editAudioTags(track.fileName);
      if (!result) {
        return;
      }
      let post = $(`#file-${Tools.escapedSelector(track.fileName)}`).closest('.js-post');
      if (post[0]) {
        await Posts.updatePost(+DOM.data('number', post[0]));
      }
    } catch (err) {
      DOM.handleError(err);
    }
  }

  toggleMute() {
    if (this.volume()) {
      lastPlayerVolume = this.volume();
      var volume = 0;
    } else {
      var volume = lastPlayerVolume;
    }
    this.volume(volume);
    if (playerElement) {
      playerElement.volume = volume;
    } else {
      Storage.setLocalObject('playerVolume', volume);
    }
    $('#player-slider-volume').slider('value', volume);
  }

  playPreviousTrack(_, e) {
    e.stopPropagation();
    if (!this.currentTrack() || (this.tracks().length < 2)) {
      return;
    }
    previousOrNext(false, true);
  }

  playNextTrack(_, e) {
    e.stopPropagation();
    if (!this.currentTrack() || (this.tracks().length < 2)) {
      return;
    }
    previousOrNext(true, true);
  }

  togglePlayerVisibility(_, e) {
    e.stopPropagation();
    $('#player').toggleClass('player-minimized');
  }

  addRadioStream() {
    addRadioStream();
  }

  playPause(_, e) {
    e.stopPropagation();
    if (!this.currentTrack()) {
      return;
    }
    playPause();
  }
}

let tracksViewModel = new TracksViewModel();

let durationSliderInitialized = false;

function updateDurationSlider(duration) {
  let slider = $('#player-slider-duration');
  if (durationSliderInitialized) {
    slider.slider('destroy');
  } else {
    durationSliderInitialized = true;
  }
  let o = {
    min: 0,
    max: duration || 0,
    step: (duration ? 1 : 0),
    value: 0,
  };
  if (duration) {
    o.start = () => {
      playerUserSliding = true;
    };
    o.stop = () => {
      playerUserSliding = false;
      if (playerElement) {
        playerElement.currentTime = +slider.slider('value');
      }
    }
  } else {
    o.disabled = true;
  }
  slider.slider(o);
  return slider;
}

function resetSource(track) {
  if (playerElement) {
    if (!playerElement.paused) {
      playerElement.pause();
    }
    if (movablePlayer) {
      $(movablePlayer.node).remove();
      movablePlayer = null;
    } else {
      $(playerElement).remove();
    }
  }
  let durationSlider = updateDurationSlider();
  if (track.hasOwnProperty('mimeType') && Tools.isVideoType(track.mimeType)) {
    movablePlayer = MovablePlayer.createPlayer(`/${Tools.sitePathPrefix()}${track.boardName}/src/${track.fileName}`,
      track.mimeType, track.width, track.height, {
      loop: false,
      play: false
    });
    movablePlayer.on('requestClose', function(e) {
      playPause();
      movablePlayer.hide();
      movablePlayer = null;
    });
    playerElement = movablePlayer.content;
    movablePlayer.show();
  } else {
    playerElement = DOM.node('audio');
  }
  tracksViewModel.currentTime(0);
  const DEFAULT_VOLUME = Settings.defaultAudioVideoVolume() / 100;
  playerElement.volume = Storage.getLocalObject('playerVolume', DEFAULT_VOLUME);
  if (!movablePlayer) {
    playerElement.style.display = 'none';
  }
  Storage.playerLastTrack(track);
  if (!movablePlayer) {
    let source = DOM.node('source');
    if (track.mimeType) {
      source.type = track.mimeType;
    }
    if (track.href) {
      source.src = track.href;
    } else {
      source.src = `/${Tools.sitePathPrefix()}${track.boardName}/src/${track.fileName}`;
    }
    playerElement.appendChild(source);
  }
  playerElement.addEventListener('play', () => {
    tracksViewModel.playing(true);
    Storage.setSessionObject('playerPlaying', true);
  });
  playerElement.addEventListener('pause', () => {
    tracksViewModel.playing(false);
    Storage.removeSessionObject('playerPlaying');
  });
  playerElement.addEventListener('ended', () => {
    tracksViewModel.playing(false);
    previousOrNext(true);
  });
  playerElement.addEventListener('volumechange', () => {
    let volumeSlider = $('#player-slider-volume');
    if (+volumeSlider.slider('value') !== playerElement.volume) {
      volumeSlider.slider('value', playerElement.volume);
    }
  });
  playerElement.addEventListener('timeupdate', () => {
    tracksViewModel.currentTime(playerElement.currentTime);
    Storage.playerCurrentTime(playerElement.currentTime);
    if (!playerUserSliding) {
      durationSlider.slider('value', playerElement.currentTime);
    }
  });
  if (!track.href) {
    playerElement.addEventListener('durationchange', () => {
      updateDurationSlider(playerElement.duration);
    });
  }
  if (!movablePlayer) {
    window.document.body.appendChild(playerElement);
  }
}

function playPause(time) {
  time = Tools.option(time, 'number', 0, { test: (t) => { return t > 0; } });
  let track = tracksViewModel.currentTrack();
  if (playerElement) {
    playerElement[playerElement.paused ? 'play' : 'pause']();
    if (time && playerElement.paused) {
      playerElement.currentTime = time;
    }
  } else if (track) {
    resetSource(track);
    playerElement.play();
    if (time) {
      playerElement.currentTime = +time;
    }
  } else {
    return;
  }
}

export function initialize() {
  const DEFAULT_VOLUME = Settings.defaultAudioVideoVolume() / 100;
  let currentVolume = Storage.getLocalObject('playerVolume', DEFAULT_VOLUME);
  tracksViewModel.volume(currentVolume);
  $('#player-slider-volume').slider({
    min: 0,
    max: 1,
    step: 0.01,
    value: currentVolume,
    slide: (_, ui) => {
      let volume = ui.value;
      if (playerElement) {
        playerElement.volume = volume;
        tracksViewModel.volume(playerElement.volume);
      } else {
        Storage.setLocalObject('playerVolume', volume);
      }
    },
    change: (_, ui) => {
      let volume = ui.value;
      Storage.setLocalObject('playerVolume', volume);
      tracksViewModel.volume(volume);
    }
  });
  updateDurationSlider();
  KO.applyBindings(tracksViewModel, DOM.id('player'));
  let lastTrack = Storage.playerLastTrack();
  if (lastTrack) {
    tracksViewModel.currentTrack(lastTrack.id);
  }
  if (tracksViewModel.tracks().length > 0 && Storage.playerPlaying()) {
    playPause(Storage.playerCurrentTime());
  }
}

export async function addRadioStream() {
  let div = Templating.template('widgets/addRadioStreamWidget');
  let title = KO.observable('');
  let url = KO.observable('');
  KO.applyBindings({
    title: title,
    url: url
  }, div);
  let options = {
    id: `addRadioStream`,
    title: Tools.translate('Add radio stream'),
    buttons: ['cancel', 'ok']
  };
  if (Tools.deviceType('desktop')) {
    options.minSize = {
      width: ADD_RADIO_STREAM_MIN_WIDTH,
      height: ADD_RADIO_STREAM_MIN_HEIGHT
    }
  } else {
    options.maximized = true;
  }
  let result = await Widgets.showWidget(div, options).promise;
  if (!result || !title() || !url()) {
    return;
  }
  try {
    let tracks = Storage.playerTracks();
    if (tracks.some((track) => { return url() === track.href; })) {
      PopupMessage.showPopup(Tools.translate('A stream with this URL is already in the list'), { type: 'warning' });
      return;
    }
    tracks.push({
      id: `track-${Tools.sha1(url())}`,
      href: url(),
      title: title()
    });
    Storage.playerTracks(tracks);
    tracksViewModel.updateTracks(tracks);
  } catch (err) {
    DOM.handleError(err);
  }
}

function playTrack(id) {
  let track = tracksViewModel.currentTrack();
  if (track && id === track.id) {
    if (playerElement && !playerElement.paused) {
      return;
    }
  } else {
    track = tracksViewModel.currentTrack(id);
  }
  if (!track) {
    return;
  }
  resetSource(track);
  playerElement.play();
}

function previousOrNext(next, loop) {
  let track = tracksViewModel[next ? 'nextTrack' : 'previousTrack'](loop);
  if (!track) {
    return;
  }
  playTrack(track.id);
}

function trackDrop(draggedID, replacedID) {
  if (!draggedID || !replacedID) {
    return;
  }
  let dragged = { id: draggedID };
  let replaced = { id: replacedID };
  let tracks = Storage.playerTracks();
  tracks.some((track, index) => {
    return _([
      [dragged, replaced],
      [replaced, dragged]
    ]).some(([one, two]) => {
      if (track.id === one.id) {
        one.index = index;
        if (two.index >= 0) {
          return true;
        }
      }
    });
  });
  if (typeof dragged.index === 'undefined' || typeof replaced.index === 'undefined'
    || dragged.index < 0 || replaced.index < 0 || dragged.index === replaced.index) {
    return;
  }
  tracks.splice(replaced.index, 0, tracks.splice(dragged.index, 1)[0]);
  Storage.playerTracks(tracks);
  tracksViewModel.updateTracks(tracks);
}

export async function editAudioTags(fileName) {
  try {
    let fileInfo = await AJAX.api('fileInfo', { fileName: fileName }, { indicator: new OverlayProgressBar() });
    let div = Templating.template('widgets/editAudioTagsWidget');
    let tags = TAGS.reduce((acc, name) => {
      acc[name] = KO.observable(fileInfo.extraData[name] || '');
      return acc;
    }, {});
    let password = KO.observable((typeof value !== 'undefined') ? value : Storage.password());
    let passwordVisible = KO.observable(false);
    KO.applyBindings({
      tags: tags,
      password: password,
      passwordVisible: passwordVisible,
      togglePasswordVisibility: (_, e) => {
        passwordVisible(!passwordVisible());
      },
    }, div);
    let options = {
      id: `editAudioFileTags/${fileName}`,
      title: Tools.translate('Edit audio file tags'),
      buttons: ['cancel', 'ok']
    };
    if (Tools.deviceType('desktop')) {
      options.minSize = {
        width: EDIT_TAGS_MIN_WIDTH,
        height: EDIT_TAGS_MIN_HEIGHT
      }
    } else {
      options.maximized = true;
    }
    let result = await Widgets.showWidget(div, options).promise;
    if (!result) {
      return false;
    }
    await AJAX.post(`/${Tools.sitePathPrefix()}action/editAudioTags`, Tools.createFormData({
      fileName: fileName,
      album: tags.album(),
      artist: tags.artist(),
      title: tags.title(),
      year: tags.year(),
      password: password()
    }), new OverlayProgressBar());
    let tracks = Storage.playerTracks();
    let track = _(tracks).find((track) => { return fileName === track.fileName; });
    if (!track) {
      return true;
    }
    TAGS.forEach((name) => {
      track[name] = tags[name]();
    });
    Storage.playerTracks(tracks);
    tracksViewModel.updateTrack(track.id, track);
    return true;
  } catch (err) {
    return Promise.reject(err);
  }
}

function removeFromPlaylist(id) {
  let tracks = Storage.playerTracks();
  let index = _(tracks).findIndex((track) => { return id === track.id; });
  if (index < 0) {
    return;
  }
  tracks.splice(index, 1);
  Storage.playerTracks(tracks);
  tracksViewModel.updateTracks(tracks);
}

export function addToPlaylist(data) {
  if (!data) {
    return;
  }
  let mimeType = data.mimeType;
  if (!Tools.isMediaTypeSupported(mimeType)) {
    PopupMessage.showPopup(Tools.translate('Your browser can not play files of this type', 'unsupportedMediaTypeText'),
      { type: 'critical' });
    return;
  }
  let tracks = Storage.playerTracks();
  if (tracks.some((track) => { return data.fileName === track.fileName; })) {
    PopupMessage.showPopup(Tools.translate('This track is already in the list'), { type: 'warning' });
    return;
  }
  tracks.push({
    id: `track-${data.fileName.replace('.', '-')}`,
    boardName: data.boardName,
    fileName: data.fileName,
    mimeType: data.mimeType,
    bitrate: data.bitrate,
    duration: data.duration,
    album: data.album,
    artist: data.artist,
    title: (Tools.isVideoType(mimeType) ? data.fileName : data.title),
    year: data.year,
    width: +data.width,
    height: +data.height
  });
  Storage.playerTracks(tracks);
  tracksViewModel.updateTracks(tracks);
}

Storage.on('playerTracks', (newValue, oldValue) => {
  tracksViewModel.updateTracks(newValue);
}, []);
