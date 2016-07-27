import $ from 'jquery';
import { EventEmitter } from 'events';

import * as Constants from '../helpers/constants';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';

const POSITIONS = ['Top', 'Bottom'];

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
      POSITIONS.forEach((position) => {
        $(`#autoUpdate${position}`).trigger('configure', { max: this.intervalSeconds });
        $(`#autoUpdate${position}`).val(this.intervalSeconds).trigger('change');
      });
      this.update();
    }, Constants.SECOND); //TODO: magic numbers
  }

  update() {
    if (this.secondsLeft <= 0) {
      return;
    }
    POSITIONS.forEach((position) => {
      if (this.useWebSockets) {
        let color = (this.secondsLeft % 2) ? '#5E5E5E' : '#2F2F2F'; //TODO: magic numbers
        $(`#autoUpdate${position}`).trigger('configure', { fgColor: color });
      } else {
        $(`#autoUpdate${position}`).val(this.secondsLeft).trigger('change');
      }
    });
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
    }, this.intervalSeconds * Constants.Second); //TODO: magic numbers
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
}
