import _ from 'underscore';
import $ from 'jquery';
import { EventEmitter } from 'events';

import * as Constants from '../helpers/constants';
import * as Tools from '../helpers/tools';

const POPUP_TYPES = new Set(['text', 'html', 'node']);
const POPUP_CLASSES = new Set(['critical', 'warning']);
const DEFAULT_HIDE_TIMEOUT = 10 * Constants.SECOND;
const POPUP_SPACING = 5;

let popups = [];

function resetContent(content, { classNames, type, click } = {}) {
  if (this.click) {
    this.msg.removeEventListener('click', this.click);
    this.click = null;
  }
  this.content = content;
  this.classNames = Tools.option(classNames, 'string', '');
  let typeClassName = Tools.option(type, 'string', '', {
    strict: true,
    test: (t) => t && POPUP_CLASSES.has(t.toLowerCase())
  }).toLowerCase();
  this.classNames += (typeClassName ? ' ' : '') + typeClassName;
  this.type = Tools.option(type, 'string', 'text', {
    test: (t) => t && POPUP_TYPES.has(t.toLowerCase())
  }).toLowerCase();
  $(this.msg).addClass('popup');
  $(this.msg).addClass(this.classNames);
  switch (this.type) {
  case 'html':
    this.msg.innerHTML = content;
    break;
  case 'node':
    this.msg.appendChild(content);
    break;
  case 'text':
  default:
    this.msg.appendChild(window.document.createTextNode(content));
    break;
  }
  if (typeof click === 'function') {
    this.click = click;
  } else if (click || typeof click === 'undefined') {
    this.click = this.hide.bind(this);
  }
  if (this.click) {
    this.msg.addEventListener('click', this.click);
  }
}

function moveSubjacent(from, deltaHeight) {
  popups.slice(from).forEach((popup) => {
    let top = +popup.msg.style.top.replace(/px$/, '') + deltaHeight;
    popup.msg.style.top = `${top}px`;
  });
}

export default class PopupMessage extends EventEmitter {
  constructor(content, { timeout, classNames, type, click } = {}) {
    super();
    this.hideTimer = null;
    this.timeout = Tools.option(timeout, 'number', DEFAULT_HIDE_TIMEOUT);
    this.msg = window.document.createElement('div');
    resetContent.call(this, content, {
      classNames: classNames,
      type: type,
      click: click
    });
    if (popups.length > 0) {
      var prev = _(popups).last();
      this.msg.style.top = `${prev.msg.offsetTop + prev.msg.offsetHeight + POPUP_SPACING}px`;
    }
  }

  show() {
    if (this.hideTimer) {
      return;
    }
    window.document.body.appendChild(this.msg);
    popups.push(this);
    this.hideTimer = setTimeout(this.hide.bind(this), this.timeout);
    this.emit('show');
  }

  hide() {
    if (!this.hideTimer) {
      return;
    }
    clearTimeout(this.hideTimer);
    this.hideTimer = null;
    var deltaHeight = this.msg.offsetHeight + POPUP_SPACING;
    window.document.body.removeChild(this.msg);
    var ind = popups.indexOf(this);
    popups.splice(ind, 1);
    moveSubjacent(ind, -deltaHeight);
    this.emit('hide');
  }

  resetTimeout(timeout) {
    if (!this.hideTimer) {
      return;
    }
    clearTimeout(this.hideTimer);
    this.timeout = Tools.option(timeout, 'number', DEFAULT_HIDE_TIMEOUT);
    this.hideTimer = setTimeout(this.hide.bind(this), this.timeout);
  };

  resetContent(content, { classNames, type, click } = {}) {
    var offsetHeight = this.msg.offsetHeight;
    $(this.msg).empty();
    this.msg.className = '';
    resetContent.call(this, content, {
      classNames: classNames,
      type: type,
      click
    });
    if (!this.hideTimer) {
      return;
    }
    moveSubjacent(popups.indexOf(this) + 1, this.msg.offsetHeight - offsetHeight);
  }

  static showPopup(content, options) {
    var popup = new PopupMessage(content, options);
    popup.show();
    return popup;
  };
}
