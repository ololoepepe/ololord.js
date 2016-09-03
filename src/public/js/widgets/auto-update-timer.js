import $ from 'jquery';
import { EventEmitter } from 'events';

import * as Constants from '../helpers/constants';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';

const COLOR_1 = '#2F2F2F';
const COLOR_2 = '#5E5E5E';
const COUNTDOWN_INTERVAL = Constants.SECOND;

export default class AutoUpdateTimer extends EventEmitter {
  constructor(intervalSeconds) {
    super();
    this.useWebSockets = Settings.useWebSockets();
    this.intervalSeconds = intervalSeconds;
    this.updateTimer = null;
    this.countdownTimer = null;
    this.secondsLeft = 0;
  }

  createCountdownTimer() {
    this.secondsLeft = this.intervalSeconds;
    this.countdownTimer = setInterval(() => {
      this.secondsLeft -= 1;
      if (this.secondsLeft <= 0) {
        this.secondsLeft = this.intervalSeconds;
      }
      $('.js-auto-update-thread').trigger('configure', { max: this.intervalSeconds });
      $('.js-auto-update-thread').val(this.intervalSeconds).trigger('change');
      this.update();
    }, COUNTDOWN_INTERVAL);
  }

  update() {
    let secondsLeft = (this.secondsLeft > 0) ? this.secondsLeft : this.intervalSeconds;
    if (this.useWebSockets) {
      let color = (secondsLeft % 2) ? COLOR_1 : COLOR_2;
      $('.js-auto-update-thread').trigger('configure', { fgColor: color });
    } else {
      $('.js-auto-update-thread').val(secondsLeft).trigger('change');
    }
  }

  start() {
    if (this.updateTimer) {
      return;
    }
    this.updateTimer = setInterval(() => {
      this.emit('tick');
      if (this.countdownTimer) {
        clearInterval(this.countdownTimer);
        this.createCountdownTimer();
      }
      this.update();
    }, this.intervalSeconds * COUNTDOWN_INTERVAL);
    this.createCountdownTimer();
    this.update();
  }

  stop() {
    if (!this.updateTimer) {
      return;
    }
    clearInterval(this.updateTimer);
    this.updateTimer = null;
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.secondsLeft = 0;
    this.update();
  }

  static get COLOR_1() {
    return COLOR_1;
  }

  static get COLOR_2() {
    return COLOR_2;
  }
}
