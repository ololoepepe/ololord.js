import _ from 'underscore';
import $ from 'jquery';
import URI from 'urijs';

import * as AJAX from './ajax';
import * as DOM from './dom';
import * as Settings from './settings';
import * as Storage from './storage';
import * as Templating from './templating';
import * as Tools from './tools';
import * as Drafts from '../core/drafts';
import * as Files from '../core/files';
import * as Management from '../core/management';
import * as Posts from '../core/posts';
import * as Threads from '../core/threads';
import * as WebSocket from '../core/websocket';
import * as Widgets from '../widgets';
import * as PageProcessors from '../handlers/page-processors';
import * as PostProcessors from '../handlers/post-processors';

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
  let pathname = URI(href).pathname();
  if (!ajax || /\/login.html$/.test(pathname) || /^\/login.html$/.test(window.location.pathname)) {
    window.location.href = href;
    return;
  }
  try {
    Posts.setPostPreviewsEnabled(false);
    $('#ajax-loading-overlay').show();
    if (Tools.isThreadPage() && Storage.autoUpdateEnabled(Tools.boardName(), Tools.threadNumber())) {
      await Threads.setAutoUpdateEnabled(0);
      Storage.autoUpdateEnabled(Tools.boardName(), Tools.threadNumber(), 0);
    }
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
    if (!fromHistory) {
      window.history.pushState({
        href: href,
        title: title
      }, '', href);
    }
    $('#content').replaceWith(content);
    window.document.title = title;
    $(window.document.body).scrollTop(0);
    PageProcessors.applyProcessors(content).catch(Widgets.handleError);
    if (Settings.showNewPosts()) {
      Threads.showNewPosts();
    }
    if (Tools.isBoardPage() || Tools.isThreadPage()) {
      Drafts.initializeDrafts();
      let posts = DOM.queryAll('.js-post', content[0]);
      await PostProcessors.applyPreprocessors(posts);
      await PostProcessors.applyPostprocessors(posts);
      Files.initializeFiles();
      if (Tools.isThreadPage()) {
        var enabled = Storage.autoUpdateEnabled(Tools.boardName(), Tools.threadNumber());
        if (true === enabled || (false !== enabled && Settings.autoUpdateThreadsByDefault())) {
          Threads.setAutoUpdateEnabled(true);
        }
      }
    }
    if (/^\/manage.html$/.test(pathname)) {
      Management.initializeManagement();
    }
    if (Tools.deviceType('mobile') && 'toolbar' !== Settings.navbarMode() && $('#sidebar-switch').prop('checked')) {
      $('#sidebar-switch').click();
    }
    $('#ajax-loading-overlay').hide();
    Posts.setPostPreviewsEnabled(true);
    window.lord.emit('contentLoad');
  } catch (err) {
    DOM.handleError(err);
    $('#ajax-loading-overlay').hide();
    Posts.setPostPreviewsEnabled(true);
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
