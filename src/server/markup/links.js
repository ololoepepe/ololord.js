import XRegExp from 'xregexp';

import Board from '../boards/board';
import Renderer from '../core/renderer';
import config from '../helpers/config';
import Logger from '../helpers/logger';

const RX_VK_POST_LINK_PATTERN = '<div id\\="vk_post_\\-?\\d+_\\d+"><\\/div><script type="text\\/javascript">  '
  + '\\(function\\(d\\, s\\, id\\) \\{ var js\\, fjs \\= d\\.getElementsByTagName\\(s\\)\\[0\\]; '
  + 'if \\(d\\.getElementById\\(id\\)\\) return; js \\= d\\.createElement\\(s\\); js\\.id \\= id; js\\.src \\= '
  + '"\\/\\/vk\\.com\\/js\\/api\\/openapi\\.js\\?121"; fjs\\.parentNode\\.insertBefore\\(js\\, fjs\\); '
  + '\\}\\(document\\, \'script\'\\, \'vk_openapi_js\'\\)\\);  \\(function\\(\\) \\{    if \\(\\!window\\.VK \\|\\|'
  + ' \\!VK\\.Widgets \\|\\| \\!VK\\.Widgets\\.Post \\|\\| \\!VK\\.Widgets\\.Post\\("vk_post_\\-?\\d+_\\d+"\\, '
  + '(\\-?\\d+)\, (\\d+)\, \'([a-zA-Z0-9_\-]+)\'\\, \\{width\\: 500\\}\\)\\) '
  + 'setTimeout\\(arguments\\.callee\\, 50\\);  \\}\\(\\)\\);<\\/script>';
const RX_VK_POST_LINK = new RegExp(RX_VK_POST_LINK_PATTERN, 'g');

function matchTwitterLink(href) {
  return config('site.twitter.integrationEnabled')
    && href.match(/^https?\:\/\/twitter\.com\/[^\/]+\/status\/\d+\/?$/);
}

function matchYoutubeLink(href) {
  return href.match(/^https?\:\/\/(m\.|www\.)?youtube\.com\/.*v\=[^\/]+.*$/)
    || href.match(/^https?\:\/\/youtu\.be\/[^\/]+.*$/);
}

function matchCoubLink(href) {
  return href.match(/^https?:\/\/coub\.com\/view\/[^\/\?]+.*$/);
}

function matchVocarooLink(href) {
  return href.match(/^https?:\/\/vocaroo\.com\/i\/[a-zA-Z0-9]+$/);
}

var getTwitterEmbeddedHtml = function(href, defaultHTML) {
    return HTTP.request({
        method: "GET",
        url: `https://api.twitter.com/1/statuses/oembed.json?url=${href}`,
        timeout: Tools.MINUTE //TODO: magic numbers
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject(new Error(Tools.translate("Failed to get Twitter embedded HTML")));
        return response.body.read();
    }).then(function(data) {
        try {
            return Promise.resolve(JSON.parse(data.toString()).html);
        } catch (err) {
            return Promise.reject(err);
        }
    }).catch(function(err) {
        Logger.error(err.stack || err);
        return Promise.resolve(defaultHTML);
    }).then(function(html) {
        return Promise.resolve(html);
    });
};

var youtubeVideoStartTime = function(href) {
    if (!href)
        return null;
    var t = URL.parse(href, true).query.t;
    if (!t)
        return null;
    var match = t.match(/((\d+)h)?((\d+)m)?((\d+)s)?/);
    if (!match)
        return null;
    var start = 0;
    if (match[2])
        start += +match[2] * 3600;
    if (match[4])
        start += +match[4] * 60;
    if (match[6])
        start += +match[6];
    if (isNaN(start) || start <= 0)
        return null;
    return start;
};

var getYoutubeEmbeddedHtml = function(href, defaultHTML) {
    var match = href.match(/^https?\:\/\/.*youtube\.com\/.*v\=([^\/#\?&]+).*$/);
    var videoId = match ? match[1] : null;
    if (!videoId) {
        match = href.match(/^https?\:\/\/youtu\.be\/([^\/#\?]+).*$/);
        videoId = match ? match[1] : null;
    }
    var apiKey = config("server.youtubeApiKey", "");
    if (!videoId || !apiKey)
        return Promise.resolve(defaultHTML);
    return HTTP.request({
        method: "GET",
        url: `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`,
        timeout: Tools.MINUTE //TODO: magic numbers
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject(new Error(Tools.translate("Failed to get YouTube embedded HTML")));
        return response.body.read();
    }).then(function(data) {
        try {
            var response = JSON.parse(data.toString());
            if (!response.items || response.items.length < 1)
                return Promise.reject(new Error(Tools.translate("Failed to get YouTube video info")));
            var info = response.items[0].snippet;
            info.id = videoId;
            info.href = href;
            info.start = youtubeVideoStartTime(href);
            let html = Renderer.render('markup/youtubeVideoLink', { info: info });
            if (!html)
                return Promise.reject(new Error(Tools.translate("Failed to create YouTube video link")));
            return Promise.resolve(html);
        } catch (err) {
            return Promise.reject(err);
        }
    }).catch(function(err) {
        Logger.error(err.stack || err);
        return Promise.resolve(defaultHTML);
    }).then(function(html) {
        return Promise.resolve(html);
    });
};

var getCoubEmbeddedHtml = function(href, defaultHTML) {
    var match = href.match(/^https?:\/\/coub\.com\/view\/([^\/\?#]+).*$/);
    var videoId = match ? match[1] : null;
    if (!videoId)
        return Promise.resolve(defaultHTML);
    return HTTP.request({
        method: "GET",
        url: `https://coub.com/api/oembed.json?url=http://coub.com/view/${videoId}`,
        timeout: Tools.MINUTE //TODO: magic numbers
    }).then(function(response) {
        if (response.status != 200)
            return Promise.reject(new Error(Tools.translate("Failed to get Coub embedded HTML")));
        return response.body.read();
    }).then(function(data) {
        try {
            var response = JSON.parse(data.toString());
            if (!response)
                return Promise.reject(new Error(Tools.translate("Failed to get Coub video info")));
            var info = {
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
            if (!html)
                return Promise.reject(new Error(Tools.translate("Failed to create Coub video link")));
            return Promise.resolve(html);
        } catch (err) {
            return Promise.reject(err);
        }
    }).catch(function(err) {
        Logger.error(err.stack || err);
        return Promise.resolve(defaultHTML);
    }).then(function(html) {
        return Promise.resolve(html);
    });
};

function getVocarooEmbeddedHtml(href, defaultHTML) {
  let match = href.match(/^https?:\/\/vocaroo\.com\/i\/([a-zA-Z0-9]+)$/);
  let audioId = match ? match[1] : null;
  if (!audioId) {
    return defaultHTML;
  }
  try {
    return Renderer.render('markup/vocarooAudioLink', { info: { id: audioId } });
  } catch (err) {
    Logger.log(Tools.translate('Failed to create Vocaroo audio embedded container'), err.stack || err);
    return defaultHTML;
  }
}

function convertVkontaktePost(_1, _2, matchs, _3, options) {
  options.type = 'HTML_SKIP';
  return `<div class='overflow-x-container'>${matchs[0]}</div>`;
}

function convertLinkCommon(hrefIsText, info, text, matchs, _1, options) {
  if (!text) {
    return '';
  }
  options.type = 'HTML_SKIP';
  if (info.isIn(matchs.index, matchs[0].length, 'HTML_SKIP')) {
    return text;
  }
  let href = hrefIsText ? text : matchs[0];
  if (href.lastIndexOf('http', 0) && href.lastIndexOf('ftp', 0)) {
    href = `http://${href}`;
  }
  let defaultHTML = `<a href='${href}'>${Renderer.toHTML(text)}</a>`;
  if (matchTwitterLink(href)) {
    return getTwitterEmbeddedHtml(href, defaultHTML);
  }
  if (matchYoutubeLink(href)) {
    return getYoutubeEmbeddedHtml(href, defaultHTML);
  }
  if (matchCoubLink(href)) {
    return getCoubEmbeddedHtml(href, defaultHTML);
  }
  if (matchVocarooLink(href)) {
    return getVocarooEmbeddedHtml(href, defaultHTML);
  }
  return defaultHTML;
}

function convertProtocol(_1, _2, matchs, _3, options) {
  options.type = 'HTML_SKIP';
  return `<a href='${matchs[0]}'>${Renderer.toHTML(matchs[2])}</a>`;
}

async function convertPostLink(info, _1, matchs, _2, options) {
    options.type = HTML_SKIP;
    var boardName = (matchs.length > 2) ? matchs[1] : info.boardName;
    var postNumber = +matchs[(matchs.length > 2) ? 2 : 1];
    var escaped = matchs[0].split(">").join("&gt;");
    if (postNumber && (postNumber != info.deletedPost)) {
        return PostsModel.getPost(boardName, postNumber).then(function(post) {
            if (!post)
                return escaped;
            post = JSON.parse(post);
            if (info.referencedPosts) {
                var key = boardName + ":" + postNumber;
                if (!info.referencedPosts[key]) {
                    info.referencedPosts[key] = {
                        boardName: boardName,
                        postNumber: postNumber,
                        threadNumber: post.threadNumber,
                        createdAt: Tools.now()
                    };
                }
            }
            var href = "href=\"/" + config("site.pathPrefix", "") + boardName + "/res/" + post.threadNumber + ".html";
            if (postNumber != post.threadNumber)
                href += "#" + postNumber;
            href += "\"";
            var result = "<a " + href;
            if (postNumber === post.threadNumber) {
              result += ' class="op-post-link"';
            }
            result += " data-board-name=\"" + boardName + "\" data-post-number=\"" + postNumber
                + "\" data-thread-number=\"" + post.threadNumber + "\">" + escaped + "</a>";
            return result;
        });
    } else {
        return Promise.resolve(escaped);
    }
}

export default [{
  priority: 1500,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertVkontaktePost,
  op: RX_VK_POST_LINK,
  cl: null
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
  cl: null
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
