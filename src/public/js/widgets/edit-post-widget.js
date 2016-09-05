import $ from 'jquery';
import KO from 'knockout';

import MovableWidget from './movable-widget';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';

export default class HiddenPostList extends MovableWidget {
  constructor(options) {
    if (typeof options !== 'object') {
      options = {};
    }
    options.buttons = ['cancel', 'ok'];
    options.resizable = false;
    let post = options.post || { rawText: '' };
    let content = Templating.template('widgets/editPostWidget', {}, { boardName: post.boardName });
    $(content).find('.js-symbols-used').empty().text(post.rawText.length);
    KO.applyBindings({
      post: post,
      countSymbols: () => {
        $(content).find('.js-symbols-used').empty().text(post.rawText.length);
        return true;
      }
    }, content);
    super(content, options);
    this.content = content;
    this.post = post;
  }

  createData() {
    return Tools.createFormData(this.content, {
      boardName: this.post.boardName,
      postNumber: this.post.number
    });
  }
}
