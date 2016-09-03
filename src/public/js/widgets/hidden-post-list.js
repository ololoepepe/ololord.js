import _ from 'underscore';
import KO from 'knockout';

import MovableWidget from './movable-widget';
import * as Storage from '../helpers/storage';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';
import * as Hiding from '../core/hiding';

export default class HiddenPostList extends MovableWidget {
  constructor(options) {
    if (typeof options !== 'object') {
      options = {};
    }
    options.buttons = ['close'];
    let content = Templating.template('widgets/hiddenPostList');
    KO.applyBindings({
      hiddenPosts: KO.computed(() => {
        let o = Storage.hiddenPosts();
        return _(o).toArray();
      }),
      makeHidden: function() {
        let hiddenPosts = Storage.hiddenPosts();
        let hidden = hiddenPosts[`${this.boardName}/${this.postNumber}`];
        hidden.hidden = true;
        Storage.hiddenPosts(Tools.cloned(hiddenPosts));
      },
      removeHidden: function() {
        Hiding.removeHidden(this.boardName, this.postNumber);
      }
    }, content);
    super(content, options);
  }
}
