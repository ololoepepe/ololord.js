'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var getTwitterEmbeddedHtml = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(href, defaultHTML) {
    var response, data;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.prev = 0;
            _context2.next = 3;
            return _http2.default.request({
              method: 'GET',
              url: 'https://api.twitter.com/1/statuses/oembed.json?url=' + href,
              timeout: (0, _config2.default)('system.httpRequestTimeout')
            });

          case 3:
            response = _context2.sent;

            if (!(response.status !== 200)) {
              _context2.next = 6;
              break;
            }

            throw new Error(Tools.translate('Failed to get Twitter embedded HTML'));

          case 6:
            _context2.next = 8;
            return response.body.read();

          case 8:
            data = _context2.sent;
            return _context2.abrupt('return', JSON.parse(data.toString()).html);

          case 12:
            _context2.prev = 12;
            _context2.t0 = _context2['catch'](0);

            _logger2.default.error(_context2.t0.stack || _context2.t0);
            return _context2.abrupt('return', defaultHTML);

          case 16:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[0, 12]]);
  }));

  return function getTwitterEmbeddedHtml(_x2, _x3) {
    return ref.apply(this, arguments);
  };
}();

var getYoutubeEmbeddedHtml = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(href, defaultHTML) {
    var match, videoId, apiKey, response, data, info, html;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            match = href.match(RX_YOUTUBE_VIDEO_LINK_1);
            videoId = match ? match[1] : null;

            if (!videoId) {
              match = href.match(RX_YOUTUBE_VIDEO_LINK_2);
              videoId = match ? match[1] : null;
            }
            apiKey = (0, _config2.default)('server.youtubeApiKey');

            if (!(!videoId || !apiKey)) {
              _context3.next = 6;
              break;
            }

            return _context3.abrupt('return', defaultHTML);

          case 6:
            _context3.prev = 6;
            _context3.next = 9;
            return _http2.default.request({
              method: 'GET',
              url: 'https://www.googleapis.com/youtube/v3/videos?id=' + videoId + '&key=' + apiKey + '&part=snippet',
              timeout: (0, _config2.default)('system.httpRequestTimeout')
            });

          case 9:
            response = _context3.sent;

            if (!(response.status !== 200)) {
              _context3.next = 12;
              break;
            }

            throw new Error(Tools.translate('Failed to get YouTube embedded HTML'));

          case 12:
            _context3.next = 14;
            return response.body.read();

          case 14:
            data = _context3.sent;

            response = JSON.parse(data.toString());

            if (!(!response.items || response.items.length < 1)) {
              _context3.next = 18;
              break;
            }

            throw new new Error(Tools.translate('Failed to get YouTube video info'))();

          case 18:
            info = response.items[0].snippet;

            info.id = videoId;
            info.href = href;
            info.start = youtubeVideoStartTime(href);
            html = _renderer2.default.render('markup/youtubeVideoLink', { info: info });

            if (html) {
              _context3.next = 25;
              break;
            }

            throw new Error(Tools.translate('Failed to create YouTube video link'));

          case 25:
            return _context3.abrupt('return', html);

          case 28:
            _context3.prev = 28;
            _context3.t0 = _context3['catch'](6);

            _logger2.default.error(_context3.t0.stack || _context3.t0);
            return _context3.abrupt('return', defaultHTML);

          case 32:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[6, 28]]);
  }));

  return function getYoutubeEmbeddedHtml(_x4, _x5) {
    return ref.apply(this, arguments);
  };
}();

var getCoubEmbeddedHtml = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(href, defaultHTML) {
    var match, videoId, response, data, info, html;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            match = href.match(RX_COUB_VIDEO_LINK);
            videoId = match ? match[1] : null;

            if (videoId) {
              _context4.next = 4;
              break;
            }

            return _context4.abrupt('return', defaultHTML);

          case 4:
            _context4.prev = 4;
            _context4.next = 7;
            return _http2.default.request({
              method: 'GET',
              url: 'https://coub.com/api/oembed.json?url=http://coub.com/view/' + videoId,
              timeout: (0, _config2.default)('system.httpRequestTimeout')
            });

          case 7:
            response = _context4.sent;

            if (!(response.status !== 200)) {
              _context4.next = 10;
              break;
            }

            throw new new Error(Tools.translate('Failed to get Coub embedded HTML'))();

          case 10:
            _context4.next = 12;
            return response.body.read();

          case 12:
            data = _context4.sent;

            response = JSON.parse(data.toString());

            if (response) {
              _context4.next = 16;
              break;
            }

            throw new Error(Tools.translate('Failed to get Coub video info'));

          case 16:
            info = {
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
            html = _renderer2.default.render('markup/coubVideoLink', { info: info });

            if (html) {
              _context4.next = 20;
              break;
            }

            throw new Error(Tools.translate('Failed to create Coub video link'));

          case 20:
            return _context4.abrupt('return', html);

          case 23:
            _context4.prev = 23;
            _context4.t0 = _context4['catch'](4);

            _logger2.default.error(_context4.t0.stack || _context4.t0);
            return _context4.abrupt('return', defaultHTML);

          case 27:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[4, 23]]);
  }));

  return function getCoubEmbeddedHtml(_x6, _x7) {
    return ref.apply(this, arguments);
  };
}();

var convertLinkCommon = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(hrefIsText, info, text, matchs, _1, options) {
    var href, defaultHTML;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            if (text) {
              _context5.next = 2;
              break;
            }

            return _context5.abrupt('return', '');

          case 2:
            options.type = _processingContext2.default.HTML_SKIP;

            if (!info.isIn(matchs.index, matchs[0].length, _processingContext2.default.HTML_SKIP)) {
              _context5.next = 5;
              break;
            }

            return _context5.abrupt('return', text);

          case 5:
            href = hrefIsText ? text : matchs[0];

            if (href.lastIndexOf('http', 0) && href.lastIndexOf('ftp', 0)) {
              href = 'http://' + href;
            }
            defaultHTML = '<a href=\'' + href + '\'>' + _renderer2.default.toHTML(text) + '</a>';

            if (!((0, _config2.default)('site.twitter.integrationEnabled') && RX_TWITTER_POST_LINK.test(href))) {
              _context5.next = 12;
              break;
            }

            _context5.next = 11;
            return getTwitterEmbeddedHtml(href, defaultHTML);

          case 11:
            return _context5.abrupt('return', _context5.sent);

          case 12:
            if (!(RX_YOUTUBE_VIDEO_LINK_1.test(href) || RX_YOUTUBE_VIDEO_LINK_2.test(href))) {
              _context5.next = 16;
              break;
            }

            _context5.next = 15;
            return getYoutubeEmbeddedHtml(href, defaultHTML);

          case 15:
            return _context5.abrupt('return', _context5.sent);

          case 16:
            if (!RX_COUB_VIDEO_LINK.test(href)) {
              _context5.next = 20;
              break;
            }

            _context5.next = 19;
            return getCoubEmbeddedHtml(href, defaultHTML);

          case 19:
            return _context5.abrupt('return', _context5.sent);

          case 20:
            if (!RX_VOCAROO_AUDIO_LINK.test(href)) {
              _context5.next = 22;
              break;
            }

            return _context5.abrupt('return', getVocarooEmbeddedHtml(href, defaultHTML));

          case 22:
            return _context5.abrupt('return', defaultHTML);

          case 23:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this);
  }));

  return function convertLinkCommon(_x8, _x9, _x10, _x11, _x12, _x13) {
    return ref.apply(this, arguments);
  };
}();

var convertPostLink = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(info, _1, matchs, _2, options) {
    var boardName, postNumber, escaped, post, key, result;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            options.type = _processingContext2.default.HTML_SKIP;
            boardName = matchs.length > 2 ? matchs[1] : info.boardName;
            postNumber = Tools.option(matchs[matchs.length > 2 ? 2 : 1], 'number', 0, { test: Tools.testPostNumber });
            escaped = matchs[0].split('>').join('&gt;');

            if (!(!postNumber || postNumber === info.deletedPost)) {
              _context6.next = 6;
              break;
            }

            return _context6.abrupt('return', escaped);

          case 6:
            _context6.next = 8;
            return PostsModel.getPost(boardName, postNumber);

          case 8:
            post = _context6.sent;

            if (post) {
              _context6.next = 11;
              break;
            }

            return _context6.abrupt('return', escaped);

          case 11:
            if (info.referencedPosts) {
              key = boardName + ':' + postNumber;

              if (!info.referencedPosts[key]) {
                info.referencedPosts[key] = {
                  boardName: boardName,
                  postNumber: postNumber,
                  threadNumber: post.threadNumber,
                  createdAt: Tools.now()
                };
              }
            }
            result = '<a href=\'/' + (0, _config2.default)('site.pathPrefix') + boardName + '/res/' + post.threadNumber + '.html';

            if (postNumber !== post.threadNumber) {
              result += '#' + postNumber;
            }
            result += "' class='js-post-link";
            if (postNumber === post.threadNumber) {
              result += " op-post-link";
            }
            result += '\' data-board-name=\'' + boardName + '\' data-post-number=\'' + postNumber + '\'';
            result += ' data-thread-number=\'' + post.threadNumber + '\'>' + escaped + '</a>';
            return _context6.abrupt('return', result);

          case 19:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this);
  }));

  return function convertPostLink(_x14, _x15, _x16, _x17, _x18) {
    return ref.apply(this, arguments);
  };
}();

var _http = require('q-io/http');

var _http2 = _interopRequireDefault(_http);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _xregexp = require('xregexp');

var _xregexp2 = _interopRequireDefault(_xregexp);

var _processingContext = require('./processing-context');

var _processingContext2 = _interopRequireDefault(_processingContext);

var _board = require('../boards/board');

var _board2 = _interopRequireDefault(_board);

var _renderer = require('../core/renderer');

var _renderer2 = _interopRequireDefault(_renderer);

var _config = require('../helpers/config');

var _config2 = _interopRequireDefault(_config);

var _fsWatcher = require('../helpers/fs-watcher');

var _fsWatcher2 = _interopRequireDefault(_fsWatcher);

var _logger = require('../helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

var _posts = require('../models/posts');

var PostsModel = _interopRequireWildcard(_posts);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var RX_VK_POST_LINK_PATTERN = '<div id\\="vk_post_\\-?\\d+_\\d+"><\\/div><script type="text\\/javascript">  ' + '\\(function\\(d\\, s\\, id\\) \\{ var js\\, fjs \\= d\\.getElementsByTagName\\(s\\)\\[0\\]; ' + 'if \\(d\\.getElementById\\(id\\)\\) return; js \\= d\\.createElement\\(s\\); js\\.id \\= id; js\\.src \\= ' + '"\\/\\/vk\\.com\\/js\\/api\\/openapi\\.js\\?121"; fjs\\.parentNode\\.insertBefore\\(js\\, fjs\\); ' + '\\}\\(document\\, \'script\'\\, \'vk_openapi_js\'\\)\\);  \\(function\\(\\) \\{    if \\(\\!window\\.VK \\|\\|' + ' \\!VK\\.Widgets \\|\\| \\!VK\\.Widgets\\.Post \\|\\| \\!VK\\.Widgets\\.Post\\("vk_post_\\-?\\d+_\\d+"\\, ' + '(\\-?\\d+)\, (\\d+)\, \'([a-zA-Z0-9_\-]+)\'\\, \\{width\\: 500\\}\\)\\) ' + 'setTimeout\\(arguments\\.callee\\, 50\\);  \\}\\(\\)\\);<\\/script>';
var RX_VK_POST_LINK = new RegExp(RX_VK_POST_LINK_PATTERN, 'g');
var RX_TWITTER_POST_LINK = /^https?\:\/\/twitter\.com\/[^\/]+\/status\/\d+\/?$/;
var RX_YOUTUBE_VIDEO_LINK_1 = /^https?\:\/\/(m\.|www\.)?youtube\.com\/.*v\=([^\/#\?&]+).*$/;
var RX_YOUTUBE_VIDEO_LINK_2 = /^https?\:\/\/youtu\.be\/([^\/#\?]+).*$/;
var RX_COUB_VIDEO_LINK = /^https?:\/\/coub\.com\/view\/([^\/\?#]+).*$/;
var RX_VOCAROO_AUDIO_LINK = /^https?:\/\/vocaroo\.com\/i\/([a-zA-Z0-9]+)$/;

function transformRootZones(zones) {
  return zones.reduce(function (acc, zone) {
    acc[zone] = true;
    return acc;
  }, {});
}

var rootZones = _fsWatcher2.default.createWatchedResource(__dirname + '/../../misc/root-zones.json', function (path) {
  return transformRootZones(require(path));
}, function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(path) {
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            return _context.abrupt('return', transformRootZones(require(path)));

          case 1:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function (_x) {
    return ref.apply(this, arguments);
  };
}()) || {};

function youtubeVideoStartTime(href) {
  if (!href) {
    return null;
  }
  var time = _url2.default.parse(href, true).query.t;
  if (!time) {
    return null;
  }
  var match = time.match(/((\d+)h)?((\d+)m)?((\d+)s)?/);
  if (!match) {
    return null;
  }
  var start = 0;
  if (match[2]) {
    start += +match[2] * 3600; //NOTE: Hours
  }
  if (match[4]) {
    start += +match[4] * 60; //NOTE: Minutes
  }
  if (match[6]) {
    start += +match[6]; //NOTE: Seconds
  }
  return Tools.option(start, 'number', null, { test: function test(s) {
      return s > 0;
    } });
}

function getVocarooEmbeddedHtml(href, defaultHTML) {
  var match = href.match(RX_VOCAROO_AUDIO_LINK);
  var audioId = match ? match[1] : null;
  if (!audioId) {
    return defaultHTML;
  }
  try {
    var html = _renderer2.default.render('markup/vocarooAudioLink', { info: { id: audioId } });
    if (!html) {
      throw new Error(Tools.translate('Failed to create Vocaroo audio embedded container'));
    }
  } catch (err) {
    _logger2.default.log(err.stack || err);
    return defaultHTML;
  }
}

function convertVkontaktePost(_1, _2, matchs, _3, options) {
  options.type = _processingContext2.default.HTML_SKIP;
  return '<div class=\'overflow-x-container\'>' + matchs[0] + '</div>';
}

function convertProtocol(_1, _2, matchs, _3, options) {
  options.type = _processingContext2.default.HTML_SKIP;
  return '<a href=\'' + matchs[0] + '\'>' + _renderer2.default.toHTML(matchs[2]) + '</a>';
}

function checkExternalLink(info, matchs) {
  if (matchs.index > 0 && ['@', '#'].indexOf(info.text[matchs.index - 1]) >= 0) {
    return false;
  }
  return (/^\d+\.\d+\.\d+\.\d+$/.test(matchs[2]) || rootZones.hasOwnProperty(matchs[4])
  );
}

exports.default = [{
  priority: 1500,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertVkontaktePost,
  op: RX_VK_POST_LINK,
  cl: null,
  enabled: function enabled() {
    return (0, _config2.default)('site.vkontakte.integrationEnabled');
  }
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
  op: new _xregexp2.default(Tools.EXTERNAL_LINK_REGEXP_PATTERN, "gi"),
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
  op: new RegExp('>>/(' + _board2.default.boardNames().join('|') + ')/([1-9][0-9]*)', 'gi'),
  cl: null
}];
//# sourceMappingURL=links.js.map
