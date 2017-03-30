import _ from 'underscore';
import $ from 'jquery';

import * as DOM from '../helpers/dom';
import * as Tools from '../helpers/tools';

const VIDEO_THUMB_OFFSET_X = 30;
const VIDEO_THUMB_OFFSET_Y = -10;

let actions = [];

let register = Tools.createRegisterFunction(actions, 'action', 'object');

export let registerAction = (name, value) => {
  if (_(name).isArray()) {
    name.forEach(register);
  } else {
    register({
      name: name,
      value: value
    });
  }
};

registerAction('showVideoThumb', (e, a) => {
  if (a.img) {
    window.document.body.appendChild(a.img);
    return;
  }
  let data = DOM.data(['thumbUrl', 'thumbWidth', 'thumbHeight'], a, true);
  if (!data.thumbUrl) {
    return;
  }
  a.img = $(`<img width='${data.thumbWidth}' height='${data.thumbHeight}' src='${data.thumbUrl}' />`)[0];
  $(a.img).addClass('video-thumb').css({
    left: `${e.clientX + VIDEO_THUMB_OFFSET_X}px`,
    top: `${e.clientY + VIDEO_THUMB_OFFSET_Y}px`
  });
  window.document.body.appendChild(a.img);
});

registerAction('moveVideoThumb', (e, a) => {
  if (!a.img) {
    return;
  }
  $(a.img).css({
    left: `${e.clientX + VIDEO_THUMB_OFFSET_X}px`,
    top: `${e.clientY + VIDEO_THUMB_OFFSET_Y}px`
  });
});

registerAction('hideVideoThumb', (e, a) => {
  if (!a.img) {
    return;
  }
  window.document.body.removeChild(a.img);
});

function expandCollapseVideo(createIframe, a) {
  let videoId = DOM.data('videoId', a, true);
  if (!videoId) {
    return;
  }
  let postText = $(a).closest('.js-post-text');
  if (a.lordExpanded) {
    a.parentNode.removeChild(a.nextSibling);
    a.parentNode.removeChild(a.nextSibling);
    a.replaceChild(DOM.node('text', `[${Tools.translate('Expand video')}]`), a.childNodes[0]);
    if (postText[0]) {
      --postText[0]._expand;
      if (postText[0]._expand <= 0) {
        postText.removeClass('expand');
      }
    }
  } else {
    if (postText[0]) {
      if (!postText[0]._expand) {
        postText[0]._expand = 1;
      } else {
        ++postText[0]._expand;
      }
      postText.addClass('expand');
    }
    let iframe = createIframe(videoId, a);
    let parent = a.parentNode;
    let el = a.nextSibling;
    if (el) {
      parent.insertBefore(DOM.node('br'), el);
      parent.insertBefore(iframe, el);
    } else {
      parent.appendChild(DOM.node('br'));
      parent.appendChild(iframe);
    }
    a.replaceChild(DOM.node('text', `[${Tools.translate('Collapse video')}]`), a.childNodes[0]);
  }
  a.lordExpanded = !a.lordExpanded;
}

registerAction('expandCollapseYoutubeVideo', expandCollapseVideo.bind(null, (videoId, a) => {
  let iframe = DOM.node('iframe');
  let start = Tools.option(+DOM.data('start', a, true), 'number', 0, { test: (s) => { return s > 0; } });
  iframe.src = `//youtube.com/embed/${videoId}?autoplay=1&start=${start}`;
  iframe.allowfullscreen = true;
  iframe.frameborder = '0px';
  iframe.height = '360';
  iframe.width = '640';
  iframe.display = 'block';
  return iframe;
}));

registerAction('expandCollapseCoubVideo', expandCollapseVideo.bind(null, (videoId, a) => {
  let iframe = DOM.node('iframe');
  const OPTIONS = 'muted=false&autostart=false&originalSize=false&hideTopBar=false&startWithHD=false';
  iframe.src = `//coub.com/embed/${videoId}?${OPTIONS}`;
  iframe.allowfullscreen = true;
  iframe.frameborder = '0px';
  iframe.height = '360';
  iframe.width = '480';
  iframe.display = 'block';
  return iframe;
}));

registerAction('expandCollapseSpoiler', function(titleSpan) {
  if (!titleSpan) {
    return;
  }
  let span = titleSpan.parentNode;
  if (!span) {
    return;
  }
  let bodySpan = DOM.queryOne('.collapsible-spoiler-body', span);
  if (!bodySpan) {
    return;
  }
  let expanded = (bodySpan.style.display !== 'none');
  bodySpan.style.display = expanded ? 'none' : '';
  let postText = $(span).closest('.js-post-text');
  if (postText[0]) {
    if (expanded) {
      --postText[0]._expand;
      if (postText[0]._expand <= 0) {
        postText.removeClass('expand');
      }
    } else {
      if (!postText[0]._expand) {
        postText[0]._expand = 1;
      } else {
        ++postText[0]._expand;
      }
      postText.addClass('expand');
    }
  }
});

export function exportActions() {
  window.lord = window.lord || {};
  actions.filter(Tools.testFilter).sort(Tools.priorityPredicate).forEach((a) => {
    let action = a.action;
    window.lord[action.name] = action.value;
  });
}
