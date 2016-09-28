import _ from 'underscore';
import $ from 'jquery';
import { EventEmitter } from 'events';
import KO from 'knockout';
import merge from 'merge';

import * as DOM from '../helpers/dom';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';

const WIDGET_MARGIN = 20;
const BUILTIN_BUTTON_TYPES = new Set(['close', 'confirm', 'accept', 'ok', 'cancel', 'reject']);

let w = $(window);

function builtinButton(button) {
  switch (button) {
  case 'close':
    return {
      title: Tools.translate('Close', 'closeButtonText'),
      action: () => {
        this.hide(false);
      }
    };
  case 'accept':
  case 'confirm':
  case 'ok':
    return {
      title: Tools.translate('Confirm', 'confirmButtonText'),
      action: () => {
        this.hide(true);
      }
    };
  case 'reject':
  case 'cancel':
    return {
      title: Tools.translate('Cancel', 'cancelButtonText'),
      action: () => {
        this.hide(false);
      }
    };
  default:
    break;
  }
}

function addButtons({ buttons, headerButtons }) {
  if (headerButtons) {
    if (!_(headerButtons).isArray()) {
      headerButtons = [headerButtons];
    }
    let el = this.div.find('.js-widget-header-buttons');
    headerButtons.filter((button) => {
      return _(button).isObject() && button.title && button.class;
    }).reverse().forEach((button) => {
      let btn = $(`<span></span>`).attr('title', button.title).addClass(button.class).click(() => {
        if (typeof button.action === 'function') {
          let result = button.action(btn);
          if (typeof result !== 'undefined') {
            this.hide(!!result);
          }
        } else if (typeof button.action !== 'undefined') {
          this.hide(!!button.action);
        }
      });
      el.prepend(btn);
    });
  }
  if (typeof buttons === 'undefined') {
    buttons = 'close';
  }
  if (!_(buttons).isArray()) {
    buttons = [buttons];
  }
  let el = this.div.find('.js-widget-buttons');
  buttons.filter((button) => {
    return (_(button).isObject() && button.title) || BUILTIN_BUTTON_TYPES.has(button);
  }).map((button) => {
    if (typeof button === 'string') {
      return builtinButton.call(this, button);
    } else {
      return button;
    }
  }).forEach((button) => {
    el.append($(`<button class='widget-button'></button>`).text(button.title).click(() => {
      if (typeof button.action === 'function') {
        let result = button.action.call(this);
        if (typeof result !== 'undefined') {
          this.hide(!!result);
        }
      } else if (typeof button.action !== 'undefined') {
        this.hide(!!button.action);
      }
    }));
  });
}

function toggleMaximized() {
  if (this.maximized) {
    this.div.css(this.previousPosition);
    this.wrapper.css(this.wrapper.previousSize);
  } else {
    this.previousPosition = this.div.css(['left', 'top']);
    this.wrapper.previousSize = this.wrapper.css(['width', 'height']);
    this.div.css({
      left: `${WIDGET_MARGIN}px`,
      top: `${WIDGET_MARGIN}px`
    });
    this.wrapper.css({
      width: `${w.width() - (2 * WIDGET_MARGIN)}px`,
      height: `${w.height() - (2 * WIDGET_MARGIN)}px`
    });
  }
  this.size = {
    width: this.wrapper.width(),
    height: this.wrapper.height()
  };
  this.emit('resize', this.size);
  this.emit('resizeStop', this.size);
  this.wrapper.resizable(this.maximized ? 'enable' : 'disable');
  this.div[this.maximized ? 'removeClass' : 'addClass']('widget-not-resizable');
  this.div.find('.js-widget-header').css('cursor', this.maximized ? '' : 'default');
  this.maximized = !this.maximized;
}

function makeDraggable() {
  this.div.css({ position: 'fixed' }).draggable({
    handle: '.js-widget-header',
    drag: (e, ui) => {
      this.position = {
        left: Math.max(ui.position.left, WIDGET_MARGIN),
        top: Math.max(ui.position.top, WIDGET_MARGIN)
      };
      this.position = {
        left: Math.min(this.position.left, w.width() - this.div.width() - WIDGET_MARGIN),
        top: Math.min(this.position.top, w.height() - this.div.height() - WIDGET_MARGIN)
      };
      if (this.position.left < WIDGET_MARGIN) {
        this.position.left = WIDGET_MARGIN;
      }
      if (this.position.top < WIDGET_MARGIN) {
        this.position.top = WIDGET_MARGIN;
      }
      ui.position.left = this.position.left;
      ui.position.top = this.position.top;
      this.div.css({
        width: '',
        height: ''
      });
      this.emit('move', this.position);
    }
  }).css({
    width: '',
    height: ''
  });
}

function makeResizable() {
  this.wrapper.resizable({
    ghost: true,
    resize: (e, ui) => {
      let position = this.div.position();
      this.size = {
        width: Math.min(Math.max(ui.size.width, this.minSize.width), w.width() - position.left - WIDGET_MARGIN),
        height: Math.min(Math.max(ui.size.height, this.minSize.height), w.height() - position.top - WIDGET_MARGIN)
      };
      ui.size.width = this.size.width;
      ui.size.height = this.size.height;
      this.emit('resize', this.size);
    },
    stop: () => {
      this.emit('resizeStop', this.size);
    }
  });
}

export default class MovableWidget extends EventEmitter {
  constructor(content, { title, buttons, headerButtons, position, size, geometry, minSize, maximized, resizable }) {
    super();
    if (geometry) {
      position = position || {
        left: geometry.left,
        top: geometry.top
      };
      size = size || {
        width: geometry.width,
        height: geometry.height
      };
      if (typeof maximized === 'undefined') {
        maximized = geometry.maximized;
      }
    }
    this.position = position;
    this.size = {
      width: ((size && +size.width > 0) ? size.width : 0),
      height: ((size && +size.height > 0) ? size.height : 0)
    };
    this.minSize = {
      width: ((minSize && +minSize.width > 0) ? minSize.width : 0),
      height: ((minSize && +minSize.height > 0) ? minSize.height : 0)
    };
    let w = $(window);
    let maxSize = {
      width: w.width() - (2 * WIDGET_MARGIN),
      height: w.height() - (2 * WIDGET_MARGIN)
    };
    if (this.minSize.width > maxSize.width) {
      this.minSize.width = maxSize.width;
    }
    if (this.minSize.height > maxSize.height) {
      this.minSize.height = maxSize.height;
    }
    this.maximized = !!maximized;
    this.resizable = (typeof resizable !== 'undefined') ? !!resizable : true;
    this.div = $(Templating.template('widgets/widget', { title: title }, { noparse: true }));
    KO.applyBindings({
      close: () => {
        this.hide(false);
      }
    }, this.div[0]);
    addButtons.call(this, {
      buttons: buttons,
      headerButtons: headerButtons,
    });
    this.wrapper = this.div.find('.js-widget-wrapper-outer');
    this.contentWrapper = this.wrapper.find('.js-widget-content-wrapper');
    if (typeof content === 'string') {
      this.contentWrapper.html(content);
    } else if (typeof content === 'object') {
      this.contentWrapper.append(content);
    }
    if (this.resizable) {
      makeResizable.call(this);
    } else {
      this.div.addClass('widget-not-resizable');
    }
    makeDraggable.call(this);
    if (this.resizable) {
      this.div.find('.js-widget-header').dblclick(() => {
        toggleMaximized.call(this);
      });
    }
  }

  show() {
    if (this.promise) {
      return;
    }
    this.promise = new Promise((resolve) => {
      this.resolve = resolve;
      $(window.document.body).append(this.div);
      if (this.size.width > 0 || this.minSize.width > 0) {
        this.wrapper.width(Math.max(this.size.width, this.minSize.width));
      }
      if (this.size.height > 0 || this.minSize.height > 0) {
        this.wrapper.height(Math.max(this.size.height, this.minSize.height));
      }
      this.div.position(this.position);
      if (this.maximized && this.resizable) {
        this.maximized = false;
        toggleMaximized.call(this);
      }
    });
    this.emit('show');
    return this.promise;
  }

  hide(accepted) {
    if (!this.promise) {
      return;
    }
    this.div.remove();
    this.resolve(!!accepted);
    this.emit('hide');
    return this.promise;
  }

  get geometry() {
    return {
      left: (this.position || {}).left,
      top: (this.position || {}).top,
      width: this.size.width,
      height: this.size.height,
      maximized: this.maximized
    };
  }
}
