import _ from 'underscore';
import $ from 'jquery';
import KO from 'knockout';

import MovableWidget from './movable-widget';
import * as Settings from '../helpers/settings';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as Threads from '../core/threads';

const MAX_TEXT_LENGTH = 40;

export default class FavoritesWidget extends MovableWidget {
  constructor(options) {
    if (typeof options !== 'object') {
      options = {};
    }
    options.buttons = ['close'];
    let content = Templating.template('widgets/favoritesWidget');
    KO.applyBindings({
      settings: Settings,
      favoriteThreads: KO.computed(() => {
        let o = Storage.favoriteThreads();
        return _(o).toArray();
      }),
      markAsVisited: function() {
        let favorites = Storage.favoriteThreads();
        let thread = favorites[`${this.boardName}/${this.threadNumber}`];
        thread.newPostCount = 0;
        Storage.favoriteThreads(Tools.cloned(favorites));
      },
      removeFromFavorites: function() {
        Threads.removeThreadFromFavorites(this.boardName, this.threadNumber);
      },
      truncatedText: function() {
        let text = `[${this.boardName}/${this.threadNumber}] ${this.subject}`;
        if (text.length > MAX_TEXT_LENGTH) {
          text = text.substr(0, MAX_TEXT_LENGTH - 1) + '…';
        }
        return text;
      }
    }, content);
    super(content, options);
  }
}
