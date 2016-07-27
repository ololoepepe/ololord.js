import $ from 'jquery';
import KO from 'knockout';

import MovableWidget from './movable-widget';
import * as Templating from '../helpers/templating';

export default class HiddenPostList extends MovableWidget {
  constructor(options) {
    if (typeof options !== 'object') {
      options = {};
    }
    options.buttons = ['cancel', 'ok'];
    options.resizable = false;
    let post = options.post || {};
    post = {
      boardName: post.boardName,
      number: post.number,
      name: KO.observable(post.name),
      subject: KO.observable(post.subject),
      text: KO.observable(post.rawText || '')
    };
    let content = Templating.template('widgets/editPostWidget', {}, { boardName: post.boardName });
    $(content).find('.js-symbols-used').empty().text(post.text().length);
    KO.applyBindings({
      post: post,
      countSymbols: () => {
        $(content).find('.js-symbols-used').empty().text(post.text().length);
        return true;
      }
    }, content);
    super(content, options);
    this.post = post;
  }

  createData() {
    return {
      boardName: this.post.boardName,
      postNumber: this.post.number,
      name: this.post.name(),
      subject: this.post.subject(),
      text: this.post.text()
    };
  }
}
