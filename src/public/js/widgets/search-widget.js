import _ from 'underscore';
import $ from 'jquery';
import KO from 'knockout';

import MovableWidget from './movable-widget';
import OverlayProgressBar from './overlay-progress-bar';
import * as AJAX from '../helpers/ajax';
import * as DOM from '../helpers/dom';
import * as Templating from '../helpers/templating';
import * as Tools from '../helpers/tools';

async function search(page) {
  page = Tools.option(page, 'number', 0, { test: (p) => { return p > 0; } });
  $(this.content).find('.js-search-query').focus();
  try {
    let result = await AJAX.post(`/${Tools.sitePathPrefix()}action/search`, Tools.createFormData({
      query: this.query(),
      boardName: this.boardName(),
      page: page
    }), new OverlayProgressBar());
    this.haveNotSearched(false);
    this.phrases = result.phrases;
    this.page(page);
    this.total(result.total);
    this.max(result.max);
    this.results(result.searchResults);
  } catch (err) {
    DOM.handleError(err);
  }
}

export default class SearchWidget extends MovableWidget {
  constructor(options) {
    let content = Templating.template('widgets/searchWidget');
    let query = KO.observable('');
    let boardName = KO.observable('*');
    boardName.subscribe(() => {
      $(content).find('.js-search-query').focus();
    });
    let results = KO.observable([]);
    let page = KO.observable(0);
    let total = KO.observable(0);
    let max = KO.observable(0);
    let haveNotSearched = KO.observable(true);
    KO.applyBindings({
      _: _,
      query: query,
      boardName: boardName,
      results: results,
      page: page,
      total: total,
      max: max,
      haveNotSearched: haveNotSearched,
      inputKeyPress: (_, e) => {
        if (13 !== e.which) {
          return true;
        }
        search.call(this);
      },
      search: (page) => {
        search.call(this, page);
      },
      highlight: (nodes) => {
        $(nodes).find('.js-search-result-link, .js-search-result-text').mark(this.phrases, {
          markData: { class: 'search-result-highlighted' },
          ignoreCase: true
        });
      }
    }, content);
    super(content, options);
    this.contentWrapper.css('overflow', 'visible');
    this.content = content;
    this.query = query;
    this.boardName = boardName;
    this.results = results;
    this.page = page;
    this.total = total;
    this.max = max;
    this.phrases = [];
    this.haveNotSearched = haveNotSearched;
    this.on('show', () => {
      $(this.content).find('.js-search-query').focus();
    });
  }
}
