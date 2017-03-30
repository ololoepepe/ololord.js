import $ from 'jquery';
import { EventEmitter } from 'events';

import * as Constants from '../helpers/constants';
import * as Tools from '../helpers/tools';

const DEFAULT_SHOW_DELAY = Constants.SECOND / 2;
const DEFAULT_HIDE_DELAY = Constants.SECOND / 2;

export default class OverlayProgressBar extends EventEmitter {
  constructor({ showDelay, hideDelay, labelText } = {}) {
    super();
    let testDelay = (d) => { return d >= 0; };
    showDelay = Tools.option(showDelay, 'number', DEFAULT_SHOW_DELAY, { test: testDelay });
    this.hideDelay = Tools.option(hideDelay, 'number', DEFAULT_HIDE_DELAY, { test: testDelay });
    switch (typeof labelText) {
    case 'string':
      this.labelText = () => labelText;
      break;
    case 'function':
      this.labelText = labelText;
      break;
    default:
      this.labelText = (loaded, total, uploading) => {
        if (typeof loaded !== 'number' || typeof total !== 'number') {
          return Tools.translate('Performing request…', 'performingRequestText');
        }
        let statusText = uploading ? Tools.translate('Uploading…', 'uploadingText') :
          Tools.translate('Downloading…', 'downloadingText');
        return `${statusText} ${Math.round((100 * loaded) / total)}%`;
      };
      break;
    }
    this.visible = false;
    this.finished = false;
    this.node = $('<div class="overlay-progress-bar"></div>');
    this.progressBar = $('<div class="progress-bar"></div>');
    this.label = $('<div class="progress-bar-label"></div>');
    this.text = $(`<span name='text'></span>`).text(this.labelText(undefined, undefined, true));
    this.label.append(this.text);
    this.button = $(`<button class='button'></button>`).text(Tools.translate('Cancel', 'cancelButtonText'));
    this.label.append(this.button);
    this.node.append(this.progressBar);
    this.progressBar.append(this.label);
    this.progressBar.progressbar({ value: false });
    let show = () => {
      if (this.finished) {
        return;
      }
      this.visible = true;
      this.showTime = Tools.now();
      window.document.body.appendChild(this.node[0]);
      this.button.one('click', this.abort.bind(this));
    };
    if (showDelay > 0) {
      setTimeout(show, showDelay);
    } else {
      show();
    }
  }

  onprogress(e) {
    if (this.finished) {
      return;
    }
    this.text.empty();
    if (typeof e.lengthComputable === 'boolean' && !e.lengthComputable) {
      this.progressBar.progressbar({ value: false });
      this.text.text(this.labelText() + ' ');
      return;
    }
    this.progressBar.progressbar({
      value: e.loaded,
      max: e.total
    });
    this.text.text(this.labelText(e.loaded, e.total) + ' ');
  }

  onloadend() {
    this.finish();
  }

  uploadOnprogress(e) {
    if (this.finished) {
      return;
    }
    this.text.empty();
    if (typeof e.lengthComputable === 'boolean' && !e.lengthComputable) {
      this.progressBar.progressbar({ value: false });
      this.text.text(this.labelText(undefined, undefined, true) + ' ');
      return;
    }
    this.progressBar.progressbar({
      value: e.loaded,
      max: e.total
    });
    this.text.text(this.labelText(e.loaded, e.total, true) + ' ');
  }

  uploadOnload() {
    if (this.finished) {
      return;
    }
    this.progressBar.progressbar({ value: false });
    this.text.empty().text(this.labelText() + ' ');
  }

  abort() {
    if (this.finished) {
      return;
    }
    this.emit('abort');
    this.finish();
  }

  finish() {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.button.remove();
    if (!this.visible) {
      return;
    }
    let hide = () => {
      this.visible = false;
      window.document.body.removeChild(this.node[0]);
    };
    let visibleTime = Tools.now() - this.showTime;
    if (this.hideDelay > 0 && visibleTime < this.hideDelay) {
      setTimeout(hide, this.hideDelay - visibleTime);
    } else {
      hide();
    }
  }
}
