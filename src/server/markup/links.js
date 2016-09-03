import HTTP from 'q-io/http';
import URL from 'url';
import XRegExp from 'xregexp';

import ProcessingContext from './processing-context';
import Board from '../boards/board';
import Renderer from '../core/renderer';
import config from '../helpers/config';
import FSWatcher from '../helpers/fs-watcher';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import * as PostsModel from '../models/posts';

const RX_VK_POST_LINK_PATTERN = '<div id\\="vk_post_\\-?\\d+_\\d+"><\\/div><script type="text\\/javascript">  '
  + '\\(function\\(d\\, s\\, id\\) \\{ var js\\, fjs \\= d\\.getElementsByTagName\\(s\\)\\[0\\]; '
  + 'if \\(d\\.getElementById\\(id\\)\\) return; js \\= d\\.createElement\\(s\\); js\\.id \\= id; js\\.src \\= '
  + '"\\/\\/vk\\.com\\/js\\/api\\/openapi\\.js\\?121"; fjs\\.parentNode\\.insertBefore\\(js\\, fjs\\); '
  + '\\}\\(document\\, \'script\'\\, \'vk_openapi_js\'\\)\\);  \\(function\\(\\) \\{    if \\(\\!window\\.VK \\|\\|'
  + ' \\!VK\\.Widgets \\|\\| \\!VK\\.Widgets\\.Post \\|\\| \\!VK\\.Widgets\\.Post\\("vk_post_\\-?\\d+_\\d+"\\, '
  + '(\\-?\\d+)\, (\\d+)\, \'([a-zA-Z0-9_\-]+)\'\\, \\{width\\: 500\\}\\)\\) '
  + 'setTimeout\\(arguments\\.callee\\, 50\\);  \\}\\(\\)\\);<\\/script>';
const RX_VK_POST_LINK = new RegExp(RX_VK_POST_LINK_PATTERN, 'g');
const RX_TWITTER_POST_LINK = /^https?\:\/\/twitter\.com\/[^\/]+\/status\/\d+\/?$/;
const RX_YOUTUBE_VIDEO_LINK_1 = /^https?\:\/\/(m\.|www\.)?youtube\.com\/.*v\=([^\/#\?&]+).*$/;
const RX_YOUTUBE_VIDEO_LINK_2 = /^https?\:\/\/youtu\.be\/([^\/#\?]+).*$/;
const RX_COUB_VIDEO_LINK = /^https?:\/\/coub\.com\/view\/([^\/\?#]+).*$/;
const RX_VOCAROO_AUDIO_LINK = /^https?:\/\/vocaroo\.com\/i\/([a-zA-Z0-9]+)$/;

function transformRootZones(zones) {
  return zones.reduce((acc, zone) => {
    acc[zone] = true;
    return acc;
  }, {});
}

let rootZones = FSWatcher.createWatchedResource(`${__dirname}/../../misc/root-zones.json`, (path) => {
  return transformRootZones(require(path));
}, async function(path) {
  return transformRootZones(require(path));
}) || {};

function youtubeVideoStartTime(href) {
  if (!href) {
    return null;
  }
  let time = URL.parse(href, true).query.t;
  if (!time) {
    return null;
  }
  let match = time.match(/((\d+)h)?((\d+)m)?((\d+)s)?/);
  if (!match) {
    return null;
  }
  let start = 0;
  if (match[2]) {
    start += +match[2] * 3600; //NOTE: Hours
  }
  if (match[4]) {
    start += +match[4] * 60; //NOTE: Minutes
  }
  if (match[6]) {
    start += +match[6]; //NOTE: Seconds
  }
  return Tools.option(start, 'number', null, { test: (s) => { return s > 0; } });
}

async function getTwitterEmbeddedHtml(href, defaultHTML) {
  try {
    let response = await HTTP.request({
      method: 'GET',
      url: `https://api.twitter.com/1/statuses/oembed.json?url=${href}`,
      timeout: config('system.httpRequestTimeout')
    });
    if (response.status !== 200) {
      throw new Error(Tools.translate('Failed to get Twitter embedded HTML'));
    }
    let data = await response.body.read();
    return JSON.parse(data.toString()).html;
  } catch (err) {
    Logger.error(err.stack || err);
    return defaultHTML;
  }
}

async function getYoutubeEmbeddedHtml(href, defaultHTML) {
  let match = href.match(RX_YOUTUBE_VIDEO_LINK_1);
  let videoId = match ? match[1] : null;
  if (!videoId) {
    match = href.match(RX_YOUTUBE_VIDEO_LINK_2);
    videoId = match ? match[1] : null;
  }
  let apiKey = config('server.youtubeApiKey');
  if (!videoId || !apiKey) {
    return defaultHTML;
  }
  try {
    let response = await HTTP.request({
      method: 'GET',
      url: `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`,
      timeout: config('system.httpRequestTimeout')
    });
    if (response.status !== 200) {
      throw new Error(Tools.translate('Failed to get YouTube embedded HTML'));
    }
    let data = await response.body.read();
    response = JSON.parse(data.toString());
    if (!response.items || response.items.length < 1) {
      throw new new Error(Tools.translate('Failed to get YouTube video info'));
    }
    let info = response.items[0].snippet;
    info.id = videoId;
    info.href = href;
    info.start = youtubeVideoStartTime(href);
    let html = Renderer.render('markup/youtubeVideoLink', { info: info });
    if (!html) {
      throw new Error(Tools.translate('Failed to create YouTube video link'));
    }
    return html;
  } catch (err) {
    Logger.error(err.stack || err);
    return defaultHTML;
  }
}

async function getCoubEmbeddedHtml(href, defaultHTML) {
  let match = href.match(RX_COUB_VIDEO_LINK);
  let videoId = match ? match[1] : null;
  if (!videoId) {
    return defaultHTML;
  }
  try {
    let response = await HTTP.request({
      method: 'GET',
      url: `https://coub.com/api/oembed.json?url=http://coub.com/view/${videoId}`,
      timeout: config('system.httpRequestTimeout')
    });
    if (response.status !== 200) {
      throw new new Error(Tools.translate('Failed to get Coub embedded HTML'));
    }
    let data = await response.body.read();
    response = JSON.parse(data.toString());
    if (!response) {
      throw new Error(Tools.translate('Failed to get Coub video info'));
    }
    let info = {
      href: href,
      videoTitle: response.title,
      authorName: response.author_name,
      thumbnail: response.thumbnail_url ? {
        url: response.thumbnail_url,
        width: response.thumbnail_width,
        height: response.thumbnail_height
      } : null,
      id: videoId
    };
    let html = Renderer.render('markup/coubVideoLink', { info: info });
    if (!html) {
      throw new Error(Tools.translate('Failed to create Coub video link'));
    }
    return html;
  } catch (err) {
    Logger.error(err.stack || err);
    return defaultHTML;
  }
}

function getVocarooEmbeddedHtml(href, defaultHTML) {
  let match = href.match(RX_VOCAROO_AUDIO_LINK);
  let audioId = match ? match[1] : null;
  if (!audioId) {
    return defaultHTML;
  }
  try {
    let html = Renderer.render('markup/vocarooAudioLink', { info: { id: audioId } });
    if (!html) {
      throw new Error(Tools.translate('Failed to create Vocaroo audio embedded container'));
    }
  } catch (err) {
    Logger.log(err.stack || err);
    return defaultHTML;
  }
}

function convertVkontaktePost(_1, _2, matchs, _3, options) {
  options.type = ProcessingContext.HTML_SKIP;
  return `<div class='overflow-x-container'>${matchs[0]}</div>`;
}

async function convertLinkCommon(hrefIsText, info, text, matchs, _1, options) {
  if (!text) {
    return '';
  }
  options.type = ProcessingContext.HTML_SKIP;
  if (info.isIn(matchs.index, matchs[0].length, ProcessingContext.HTML_SKIP)) {
    return text;
  }
  let href = hrefIsText ? text : matchs[0];
  if (href.lastIndexOf('http', 0) && href.lastIndexOf('ftp', 0)) {
    href = `http://${href}`;
  }
  let defaultHTML = `<a href='${href}'>${Renderer.toHTML(text)}</a>`;
  if (config('site.twitter.integrationEnabled') && RX_TWITTER_POST_LINK.test(href)) {
    return await getTwitterEmbeddedHtml(href, defaultHTML);
  }
  if (RX_YOUTUBE_VIDEO_LINK_1.test(href) || RX_YOUTUBE_VIDEO_LINK_2.test(href)) {
    return await getYoutubeEmbeddedHtml(href, defaultHTML);
  }
  if (RX_COUB_VIDEO_LINK.test(href)) {
    return await getCoubEmbeddedHtml(href, defaultHTML);
  }
  if (RX_VOCAROO_AUDIO_LINK.test(href)) {
    return getVocarooEmbeddedHtml(href, defaultHTML);
  }
  return defaultHTML;
}

function convertProtocol(_1, _2, matchs, _3, options) {
  options.type = ProcessingContext.HTML_SKIP;
  return `<a href='${matchs[0]}'>${Renderer.toHTML(matchs[2])}</a>`;
}

async function convertPostLink(info, _1, matchs, _2, options) {
  options.type = ProcessingContext.HTML_SKIP;
  let boardName = (matchs.length > 2) ? matchs[1] : info.boardName;
  let postNumber = Tools.option(matchs[(matchs.length > 2) ? 2 : 1], 'number', 0, { test: Tools.testPostNumber });
  let escaped = matchs[0].split('>').join('&gt;');
  if (!postNumber || postNumber === info.deletedPost) {
    return escaped;
  }
  let post = await PostsModel.getPost(boardName, postNumber);
  if (!post) {
    return escaped;
  }
  if (info.referencedPosts) {
    let key = `${boardName}:${postNumber}`;
    if (!info.referencedPosts[key]) {
      info.referencedPosts[key] = {
        boardName: boardName,
        postNumber: postNumber,
        threadNumber: post.threadNumber,
        createdAt: Tools.now()
      };
    }
  }
  let result = `<a href='/${config('site.pathPrefix')}${boardName}/res/${post.threadNumber}.html`;
  if (postNumber !== post.threadNumber) {
    result += `#${postNumber}`;
  }
  result += "' class='js-post-link";
  if (postNumber === post.threadNumber) {
    result += " op-post-link";
  }
  result += `' data-board-name='${boardName}' data-post-number='${postNumber}'`;
  result += ` data-thread-number='${post.threadNumber}'>${escaped}</a>`;
  return result;
}

function checkExternalLink(info, matchs) {
  if (matchs.index > 0 && ['@', '#'].indexOf(info.text[matchs.index - 1]) >= 0) {
    return false;
  }
  return /^\d+\.\d+\.\d+\.\d+$/.test(matchs[2]) || rootZones.hasOwnProperty(matchs[4]);
}

export default [{
  priority: 1500,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertVkontaktePost,
  op: RX_VK_POST_LINK,
  cl: null,
  enabled: () => { return config('site.vkontakte.integrationEnabled'); }
}, {
  priority: 1600,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertLinkCommon.bind(null, true),
  op: "[url]",
  cl: "[/url]"
}, {
  priority: 1700,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertLinkCommon.bind(null, false),
  op: new XRegExp(Tools.EXTERNAL_LINK_REGEXP_PATTERN, "gi"),
  cl: null,
  check: checkExternalLink
}, {
  priority: 1800,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertProtocol,
  op: /(mailto|irc|news)\:(\S+)/gi,
  cl: null
}, {
  priority: 2200,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertPostLink,
  op: />>([1-9][0-9]*)/gi,
  cl: null
}, {
  priority: 2300,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertPostLink,
  op: new RegExp(`>>/(${Board.boardNames().join('|')})/([1-9][0-9]*)`, 'gi'),
  cl: null
}];
