import _ from 'underscore';
import $ from 'jquery';

import * as AJAX from './ajax';
import * as DOM from './dom';
import * as Settings from './settings';
import * as Templating from './templating';
import * as Tools from './tools';

export function testSameDomain(href) {
  if (!href || typeof href !== 'string') {
    return false;
  }
  let sameDomain = `${window.location.protocol}//${window.location.hostname}`;
  return (/^\//.test(href) || href.substr(0, sameDomain.length) === sameDomain);
}

export async function setPage(href, { ajax, title, fromHistory } = {}) {
  if (!href || typeof href !== 'string') {
    return;
  }
  if (typeof ajax === 'undefined' && !testSameDomain(href)) {
    ajax = false;
  }
  ajax = (typeof ajax !== 'undefined') ? !!ajax : Settings.ajaxNavigation();
  if (!ajax) {
    window.location.href = href;
    return;
  }
  try {
    $('#ajax-loading-overlay').show();
    let html = await $.ajax({
      url: href,
      type: 'GET',
      dataType: 'html'
    });
    if (!title || typeof title !== 'string') {
      let start = html.indexOf('<title>');
      let end = html.indexOf('</title>', start);
      title = $(html.substring(start, end + 8)).text();
    }
    let start = html.indexOf("<main id='content'>");
    let end = html.lastIndexOf('</main>');
    html = html.substring(start, end + 7);
    let content = _($.parseHTML(html, window.document, true)).find((n) => {
      return window.Node.ELEMENT_NODE === n.nodeType;
    });
    Templating.scriptWorkaround(content);
    $('#content').replaceWith(content);
    window.document.title = title;
    $(window.document.body).scrollTop(0);
    //TODO: apply processors
    if (!fromHistory) {
      window.history.pushState({
        href: href,
        title: title
      }, '', href);
    }
    if (Tools.deviceType('mobile') && 'toolbar' !== Settings.navbarMode() && $('#sidebar-switch').prop('checked')) {
      $('#sidebar-switch').click();
    }
    $('#ajax-loading-overlay').hide();
  } catch (err) {
    DOM.handleError(err);
    $('#ajax-loading-overlay').hide();
    window.location.href = href;
  }
}

export function reloadPage() {
  window.document.location.reload(true);
}

export function initialize() {
  let href = window.location.href;
  window.history.replaceState({
    href: href,
    title: window.document.title
  }, '', href);
}
