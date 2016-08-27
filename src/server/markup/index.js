import _ from 'underscore';
import Highlight from 'highlight.js';
import HTTP from 'q-io/http';
import MathJax from 'mathjax-node/lib/mj-single.js';
import URL from 'url';
import XRegExp from 'xregexp';

import Board from '../boards/board';
import * as Renderer from '../core/renderer';
import config from '../helpers/config';
import FSWatcher from '../helpers/fs-watcher';
import Logger from '../helpers/logger';
import * as Permissions from '../helpers/permissions';
import * as Tools from '../helpers/tools';
import * as MiscModel from '../models/misc';
import * as PostsModel from '../models/posts';

MathJax.config({ MathJax: {} });
MathJax.start();

function reloadElements() {
  return Tools.loadPlugins([__dirname, `${__dirname}/custom`], (fileName, _1, _2, path) => {
    return ('index.js' !== fileName) || (path.split('/') === 'custom');
  }).sort((p1, p2) => { return p1.priority < p2.priority; });
}

function transformRootZones(zones) {
  return zones.reduce((acc, zone) => {
    acc[zone] = true;
    return acc;
  }, {});
}

let rootZones = FSWatcher.createWatchedResource(`${__dirname}/../misc/root-zones.json`, (path) => {
  return transformRootZones(require(path));
}, async function(path) {
  return transformRootZones(require(path));
}) || {};
let elements = reloadElements();

const EXTENDED_WAKABA_MARK = 'EXTENDED_WAKABA_MARK';
const BB_CODE = 'BB_CODE';
const MARKUP_MODES = [EXTENDED_WAKABA_MARK, BB_CODE];
const NO_SKIP = 'NO_SKIP';
const HTML_SKIP = 'HTML_SKIP';
const CODE_SKIP = 'CODE_SKIP';

var MarkupTags = {
    "---": {
        op: "<s>",
        cl: "</s>"
    },
    "***": {
        op: "<u>",
        cl: "</u>"
    },
    "**": {
        op: "<strong>",
        cl: "</strong>"
    },
    "*": {
        op: "<em>",
        cl: "</em>"
    },
    "___": {
        op: "<u>",
        cl: "</u>"
    },
    "__": {
        op: "<strong>",
        cl: "</strong>"
    },
    "_": {
        op: "<em>",
        cl: "</em>"
    },
    "///": {
        op: "<em>",
        cl: "</em>"
    },
    "%%": {
        op: "<span class=\"spoiler\">",
        cl: "</span>"
    },
    "[b]": {
        op: "<strong>",
        cl: "</strong>"
    },
    "[i]": {
        op: "<em>",
        cl: "</em>"
    },
    "[s]": {
        op: "<s>",
        cl: "</s>"
    },
    "[u]": {
        op: "<u>",
        cl: "</u>"
    },
    "[sub]": {
        op: "<sub>",
        cl: "</sub>"
    },
    "[sup]": {
        op: "<sup>",
        cl: "</sup>"
    },
    "[spoiler]": {
        op: "<span class=\"spoiler\">",
        cl: "</span>"
    },
};

var ListTypes = {
    d: "disc",
    c: "circle",
    s: "square"
};

async function markupLaTeX(text, inline) {
  return await new Promise(function(resolve, reject) {
    MathJax.typeset({
      math: text,
      format: inline ? 'inline-TeX' : 'TeX',
      svg: true
    }, (data) => {
      if (data.errors) {
        return reject(data.errors[0] || data.errors);
      }
      let tagName = inline ? 'span' : 'div';
      resolve(`<${tagName} class='latex-${inline ? 'inline' : 'block'}'>${data.svg}</${tagName}>`);
    });
  });
}

var isEscaped = function(s, pos) {
    if (pos <= 0 || pos >= s.length)
        return false;
    var n = 0;
    var i = pos - 1;
    while (i >= 0 && s[i] == "\\") {
        ++n;
        --i;
    }
    return (n % 2);
};

var withoutEscaped = function(text) {
    var rx = /``|''/gi;
    var ind = text.lastIndexOf(rx);
    while (ind >= 0) {
        if (isEscaped(text, ind)) {
            text.remove(ind - 1, 1);
            ind = text.lastIndexOf(rx, ind - text.length - 3);
            continue;
        }
        ind = text.lastIndexOf(rx, ind - text.length - 2);
    }
    return text;
};

var matchTwitterLink = function(href) {
    return config("site.twitter.integrationEnabled", true)
        && href.match(/^https?\:\/\/twitter\.com\/[^\/]+\/status\/\d+\/?$/);
};

var matchYoutubeLink = function(href) {
    return href.match(/^https?\:\/\/(m\.|www\.)?youtube\.com\/.*v\=[^\/]+.*$/)
        || href.match(/^https?\:\/\/youtu\.be\/[^\/]+.*$/);
};

var matchCoubLink = function(href) {
    return href.match(/^https?:\/\/coub\.com\/view\/[^\/\?]+.*$/);
};

var matchVocarooLink = function(href) {
    return href.match(/^https?:\/\/vocaroo\.com\/i\/[a-zA-Z0-9]+$/);
};

var getTwitterEmbeddedHtml = function(href, defaultHtml) {
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
        return Promise.resolve(defaultHtml);
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

var getYoutubeEmbeddedHtml = function(href, defaultHtml) {
    var match = href.match(/^https?\:\/\/.*youtube\.com\/.*v\=([^\/#\?&]+).*$/);
    var videoId = match ? match[1] : null;
    if (!videoId) {
        match = href.match(/^https?\:\/\/youtu\.be\/([^\/#\?]+).*$/);
        videoId = match ? match[1] : null;
    }
    var apiKey = config("server.youtubeApiKey", "");
    if (!videoId || !apiKey)
        return Promise.resolve(defaultHtml);
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
        return Promise.resolve(defaultHtml);
    }).then(function(html) {
        return Promise.resolve(html);
    });
};

var getCoubEmbeddedHtml = function(href, defaultHtml) {
    var match = href.match(/^https?:\/\/coub\.com\/view\/([^\/\?#]+).*$/);
    var videoId = match ? match[1] : null;
    if (!videoId)
        return Promise.resolve(defaultHtml);
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
        return Promise.resolve(defaultHtml);
    }).then(function(html) {
        return Promise.resolve(html);
    });
};

var getVocarooEmbeddedHtml = function(href, defaultHtml) {
    var match = href.match(/^https?:\/\/vocaroo\.com\/i\/([a-zA-Z0-9]+)$/);
    var audioId = match ? match[1] : null;
    if (!audioId)
        return Promise.resolve(defaultHtml);
    let html = Renderer.render('markup/vocarooAudioLink', { info: { id: audioId } });
    if (!html)
        return Promise.reject(new Error(Tools.translate("Failed to create Vocaroo audio embedded container")));
    return Promise.resolve(html);
};

class ProcessingContext {
  constructor(text, boardName, referencedPosts, deletedPost) {
    this.boardName = boardName;
    this.deletedPost = deletedPost;
    this.referencedPosts = referencedPosts;
    this.text = text;
    this.skipList = [];
  }

  find(rx, start, escapable) {
    start = Tools.option(start, 'number', 0, { test: (s) => { return s > 0; } });
    if (typeof rx === 'string') {
      let ind = this.text.indexOf(rx, start);
      while (ind >= 0) {
        let isIn = this.skipList.some((inf) => {
          if (ind >= inf.start && ind < (inf.start + inf.length)) {
            ind = this.text.indexOf(rx, inf.start + inf.length);
            return true;
          }
        });
        if (!isIn) {
          if (escapable && isEscaped(this.text, ind)) {
            ind = this.text.indexOf(rx, ind + 1);
          } else {
            return {
              0: rx,
              index: ind
            };
          }
        }
      }
    } else {
      rx.lastIndex = start;
      let match = rx.exec(this.text);
      while (match) {
        let isIn = this.skipList.some((inf) => {
          if (match && match.index >= inf.start && match.index < (inf.start + inf.length)) {
            rx.lastIndex = inf.start + inf.length;
            match = rx.exec(this.text);
            return true;
          }
        });
        if (!isIn && match) {
          if (escapable && isEscaped(this.text, match.index)) {
            rx.lastIndex = match.index + 1;
            match = rx.exec(this.text);
          } else {
            return match;
          }
        }
      }
    }
    return null;
  }

  isIn(start, length, type) {
    if (start < 0 || length <= 0 || (start + length) > this.text.length || NO_SKIP === type) {
      return false;
    }
    type = type || CODE_SKIP;
    for (var i = 0; i < this.skipList.length; ++i) {
      let inf = this.skipList[i];
      if (inf.type !== type) {
        continue;
      }
      let x = start;
      while (x < start + length) {
        if (x >= inf.start && x <= (inf.start + inf.length)) {
          return true;
        }
        ++x;
      }
    }
    return false;
  }

  insert(start, txt, type) {
    if (start < 0 || txt.length <= 0 || start > this.text.length) {
      return;
    }
    type = type || HTML_SKIP;
    let info = {
      start: start,
      length: txt.length,
      type: type
    };
    let found = false;
    for (var i = this.skipList.length - 1; i >= 0; --i) {
      let inf = this.skipList[i];
      if (start > inf.start) {
        if (NO_SKIP !== type) {
          this.skipList.splice(i + 1, 0, info);
        }
        found = true;
        break;
      }
      inf.start += txt.length;
    }
    if (!found && NO_SKIP !== type) {
      this.skipList.unshift(info);
    }
    this.text = this.text.substr(0, start) + txt + this.text.substr(start);
  }

  replace(start, length, txt, correction, type) {
    if (start < 0 || length <= 0 || (txt.length < 1) || (length + start) > this.text.length) {
      return;
    }
    type = type || HTML_SKIP;
    let info = {
      start: start,
      length: txt.length,
      type: type
    };
    let dlength = txt.length - length;
    let found = false;
    for (var i = this.skipList.length - 1; i >= 0; --i) {
      let inf = this.skipList[i];
      if (start >= inf.start) {
        if (NO_SKIP !== type) {
          this.skipList.splice(i + 1, 0, info);
        }
        found = true;
        break;
      }
      if (inf.start < (start + length)) {
        inf.start -= correction;
      } else {
        inf.start += dlength;
      }
    }
    if (!found && NO_SKIP !== type) {
      this.skipList.unshift(info);
    }
    this.text = this.text.substr(0, start) + txt + this.text.substr(start + length);
  }

  toHtml() {
    let s = '';
    let last = 0;
    this.skipList.forEach((inf) => {
      s += Renderer.toHTML(withoutEscaped(this.text.substr(last, inf.start - last)));
      s += this.text.substr(inf.start, inf.length);
      last = inf.start + inf.length;
    });
    s += Renderer.toHTML(this.text.substr(last));
    //TODO: Use markup element option
    s = s.replace(/<\/li>(\s|&nbsp;|<br \/>)+<li/g, '</li><li');
    s = s.replace(/<\/li>(\s|&nbsp;|<br \/>)+<\/ul/g, '</li></ul');
    s = s.replace(/<\/li>(\s|&nbsp;|<br \/>)+<\/ol/g, '</li></ol');
    s = s.replace(/<ol>(\s|&nbsp;|<br \/>)+<li/g, '<ol><li');
    let rx = /<ul type\="(disc|circle|square)">(\s|&nbsp;|<br \/>)+<li/g;
    let match = rx.exec(s);
    while (match) {
      let ns = `<ul type='${match[1]}'><li`;
      s = s.substr(0, match.index) + ns + s.substr(match.index + match[0].length);
      rx.lastIndex = ns.length;
      match = rx.exec(s);
    }
    return s;
  }
}

var getIndE = function(info, rxOp, matchs, rxCl, inds, nestable, escapable, nested) {
    nested.nested = false;
    if (!nestable)
        return (inds >= 0) ? info.find(rxCl, inds + matchs[0].length, escapable) : -1;
    if (inds >= 0) {
        var matchst = info.find(rxOp, inds + matchs[0].length, escapable);
        var matchet = info.find(rxCl, inds + matchs[0].length, escapable);
        var depth = 1;
        while (matchst || matchet) {
            var tmp = (matchst && (!matchet || matchst.index < matchet.index)) ? matchst : matchet;
            var offs = (matchst && (!matchet || matchst.index < matchet.index)) ? matchst[0].length : matchet[0].length;
            depth += (tmp.index == (matchst ? matchst.index : -1)) ? 1 : -1;
            if (depth > 1)
                nested.nested = true;
            if (!depth)
                return tmp;
            matchst = info.find(rxOp, tmp.index + offs, escapable);
            matchet = info.find(rxCl, tmp.index + offs, escapable);
        }
    }
    return null;
};

function preReady(text) {
  return text.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split("\"").join("&quot;");
}

var process = async function(info, conversionFunction, regexps, options) {
    var rxOp = regexps.op;
    var rxCl = regexps.hasOwnProperty("cl") ? regexps.cl : rxOp;
    var nestable = options && options.nestable;
    var escapable = options && options.escapable;
    var pre = options && options.pre;
    var checkFunction = options ? options.check : undefined;
    var nested = {
        nested: false
    };
    var matchs = info.find(rxOp, 0, escapable);
    var matche = rxCl ? getIndE(info, rxOp, matchs, rxCl, matchs ? matchs.index : -1, nestable, escapable, nested)
        : null;
    var rerun = false;
    var f = function() {
        if (!matchs || (rxCl && (!matche || matche.index <= matchs.index)))
            return Promise.resolve();
        if (checkFunction && !checkFunction(info, matchs, matche)) {
            if (rxCl && matche)
                matchs = info.find(rxOp, matche.index + matche[0].length, escapable);
            else
                matchs = info.find(rxOp, matchs.index + matchs[0].length, escapable);
            matche = rxCl ? getIndE(info, rxOp, matchs, rxCl, matchs ? matchs.index : -1, nestable, escapable, nested)
                : null;
            return f();
        }
        var options = {
            op: "",
            cl: "",
            type: NO_SKIP
        };
        var start = matche ? (matchs.index + matchs[0].length) : matchs.index;
        var end = matche ? (matche.index - matchs.index - matchs[0].length) : (matchs.index + matchs[0].length);
        var txt = info.text.substr(start, end);
        return conversionFunction(info, txt, matchs, matche, options).then(function(ntxt) {
            txt = escapable ? withoutEscaped(ntxt) : txt;
            if (pre) {
              txt = preReady(txt);
            }
            if (txt) {
                if (options.cl)
                    info.insert(rxCl ? (matche.index + matche[0].length) : matchs.index + matchs[0].length, options.cl);
                if (rxCl) {
                    info.replace(matchs.index, matche.index - matchs.index + matche[0].length, txt, matchs[0].length,
                        options.type);
                } else {
                    info.replace(matchs.index, matchs[0].length, txt, matchs[0].length, options.type);
                }
                if (options.op)
                    info.insert(matchs.index, options.op);
                matchs = info.find(rxOp, matchs.index + txt.length + options.op.length + options.cl.length, escapable);
            } else {
                if (rxCl) {
                    matchs = info.find(rxOp, matche ? (matche.index + matche[0].length)
                        : (matchs.index + matchs[0].length), escapable);
                } else {
                    matchs = info.find(rxOp, matchs.index + matchs[0].index, escapable);
                }
            }
            if (nestable && nested.nested)
                rerun = true;
            matche = rxCl ? getIndE(info, rxOp, matchs, rxCl, matchs ? matchs.index : -1, nestable, escapable, nested)
                : null;
            return f();
        });
    };
    return f().then(function() {
        if (rerun)
            return process(info, conversionFunction, {
                op: rxOp,
                cl: rxCl
            }, {
                nestable: nestable,
                escapable: escapable,
                checkFunction: checkFunction
            });
        return Promise.resolve();
    })
};

var processStrikedOutShitty = function(info) {
    var rx = /(\^H)+/gi;
    var match = info.find(rx);
    while (match) {
        var s = match.index - (match[0].length / 2);
        if (s < 0) {
            match = info.find(rx, match.index + match[0].length);
            continue;
        }
        info.replace(match.index, match[0].length, "</s>", 0);
        info.insert(s, "<s>");
        match = info.find(rx, match.index + 7);
    }
    return Promise.resolve();
};

var processStrikedOutShittyWord = function(info) {
    var rx = /(\^W)+/gi;
    var match = info.find(rx);
    var txt = info.text;
    while (match) {
        var count = match[0].length / 2;
        var pcount = count;
        var s = match.index - 1;
        while (count > 0) {
            while (s >= 0 && /\s/.test(txt[s]))
                --s;
            while (s >= 0 && !/\s/.test(txt[s]))
                --s;
            --count;
        }
        info.replace(match.index, match[0].length, "</s>", 0);
        info.insert(s + 1, "<s>");
        match = info.find(rx, match.index + (7 * pcount));
    }
    return Promise.resolve();
};

var checkLangsMatch = function(info, matchs, matche) {
    return matchs && matche && matchs[1] && matchs[1] == matche[1];
};

var checkExternalLink = function(info, matchs) {
    if (matchs.index > 0 && ["@", "#"].indexOf(info.text[matchs.index - 1]) >= 0)
        return false;
    return /^\d+\.\d+\.\d+\.\d+$/.test(matchs[2]) || rootZones.hasOwnProperty(matchs[4]);
};

var checkQuotationNotInterrupted = function(info, matchs, matche) {
    if (info.isIn(matchs.index, matche.index - matchs.index))
        return false;
    if (0 == matchs.index)
        return true;
    if ("\n" == info.text.substr(matchs.index - 1, 1))
        return true;
    return (info.isIn(matchs.index - 6, 6, HTML_SKIP) && info.text.substr(matchs.index - 6, 6) == "<br />");
};

var convertMonospace = function(_, text, __, ___, options) {
    options.op = "<font face=\"monospace\">";
    options.cl = "</font>";
    options.type = CODE_SKIP;
    return Promise.resolve(Renderer.toHTML(text));
};

var convertNomarkup = function(_, text, __, ___, options) {
    options.type = CODE_SKIP;
    return Promise.resolve(Renderer.toHTML(text));
};

var convertPre = function(_, text, __, ___, options) {
    options.op = "<pre>";
    options.cl = "</pre>";
    options.type = CODE_SKIP;
    text = withoutEscaped(text).split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");
    text = text.split("\"").join("&quot;");
    return Promise.resolve(text);
};

function markupCode(text, lang) {
  if (lang) {
    lang = lang.replace('++', 'pp').replace('#', 's'); //TODO: You know, this is not OK.
  }
  Highlight.configure({
    tabReplace: '    ',
    useBR: true
  });
  let result = lang ? Highlight.highlight(lang, text, true) : Highlight.highlightAuto(text);
  text = result.value;
  lang = result.language || lang;
  let langClass = lang ? ` ${lang}` : '';
  let langNames = MiscModel.codeLangNames();
  let langName = langNames.hasOwnProperty(lang) ? langNames[lang] : lang;
  return {
    op: `<div class="code-block${langClass} hljs js-with-tooltip" title="${langName || ''}">`,
    cl: '</div>',
    text: Highlight.fixMarkup(text)
  };
}

var convertCode = function(_, text, matchs, __, options) {
  options.type = CODE_SKIP;
  let result = markupCode(text, matchs[1]);
  options.op = result.op;
  options.cl = result.cl;
  return Promise.resolve(result.text);
};

var convertVkontaktePost = function(_, __, matchs, ___, options) {
    options.type = HTML_SKIP;
    return Promise.resolve("<div class=\"overflow-x-container\">" + matchs[0] + "</div>");
};

var convertExternalLink = function(info, text, matchs, __, options) {
    if (!text)
        return Promise.resolve("");
    options.type = HTML_SKIP;
    if (info.isIn(matchs.index, matchs[0].length, HTML_SKIP))
        return Promise.resolve(text);
    var href = matchs[0];
    if (href.lastIndexOf("http", 0) && href.lastIndexOf("ftp", 0))
        href = "http://" + href;
    var def = "<a href=\"" + href + "\">" + Renderer.toHTML(matchs[0]) + "</a>";
    if (matchTwitterLink(href))
        return getTwitterEmbeddedHtml(href, def);
    if (matchYoutubeLink(href))
        return getYoutubeEmbeddedHtml(href, def);
    if (matchCoubLink(href))
        return getCoubEmbeddedHtml(href, def);
    if (matchVocarooLink(href))
        return getVocarooEmbeddedHtml(href, def);
    return Promise.resolve(def);
};

var convertProtocol = function(_, __, matchs, ___, options) {
    options.type = HTML_SKIP;
    return Promise.resolve("<a href=\"" + matchs[0] + "\">" + Renderer.toHTML(matchs[2]) + "</a>");
};

var convertTooltipShitty = function(_, __, matchs, ___, options) {
    options.type = NO_SKIP;
    var tooltip = matchs[2];
    options.op = "<span class=\"tooltip js-with-tooltip\" title=\"" + tooltip + "\">";
    options.cl = "</span>";
    return Promise.resolve(matchs[1]);
};

var convertPostLink = function(info, _, matchs, __, options) {
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
};

var convertHtml = function(_, text, __, ___, options) {
    options.type = HTML_SKIP;
    return Promise.resolve(text);
};

var convertMarkup = function(_, text, matchs, __, options) {
    options.type = NO_SKIP;
    if ("----" == matchs[0])
        return Promise.resolve("\u2014");
    else if ("--" == matchs[0])
        return Promise.resolve("\u2013");
    var tag = MarkupTags[matchs[0]];
    if (!tag)
        return Promise.resolve("");
    options.op = tag.op;
    options.cl = tag.cl;
    return Promise.resolve(text);
};

var convertLatex = function(inline, _, text, matchs, __, options) {
    options.type = HTML_SKIP;
    return markupLaTeX(text, inline);
};

var convertUrl = function(info, text, matchs, matche, options) {
    if (!text)
        return Promise.resolve("");
    options.type = HTML_SKIP;
    if (info.isIn(matchs.index, matchs[0].length, HTML_SKIP))
        return Promise.resolve(text);
    var href = text;
    if (href.lastIndexOf("http", 0) && href.lastIndexOf("ftp", 0))
        href = "http://" + href;
    var def = "<a href=\"" + href + "\">" + Renderer.toHTML(text) + "</a>"
    if (matchTwitterLink(href))
        return getTwitterEmbeddedHtml(href, def);
    if (matchYoutubeLink(href))
        return getYoutubeEmbeddedHtml(href, def);
    if (matchCoubLink(href))
        return getCoubEmbeddedHtml(href, def);
    if (matchVocarooLink(href))
        return getVocarooEmbeddedHtml(href, def);
    return Promise.resolve(def);
};

var convertCSpoiler = function(_, text, matchs, __, options) {
    var title = matchs[1];
    if (!title)
        title = "Spoiler";
    options.type = NO_SKIP;
    options.op = "<span class=\"collapsible-spoiler\"><span class=\"collapsible-spoiler-title\" title=\"Spoiler\" "
        + "onclick=\"lord.expandCollapseSpoiler(this);\">" + title
        + "</span><span class=\"collapsible-spoiler-body\" style=\"display: none;\">";
    options.cl = "</span></span>";
    return Promise.resolve(text);
};

var convertTooltip = function(_, text, matchs, __, options) {
    var tooltip = matchs[1];
    options.type = NO_SKIP;
    options.op = "<span class=\"tooltip js-with-tooltip\" title=\"" + tooltip + "\">";
    options.cl = "</span>";
    return Promise.resolve(text);
};

var convertUnorderedList = function(_, text, matchs, __, options) {
    var t = matchs[2];
    if (!t)
        t = "disc";
    else if (t.length == 1)
        t = ListTypes[t];
    if (!t)
        return Promise.resolve("");
    options.type = NO_SKIP;
    options.op = `<ul type="${t}">`;
    options.cl = "</ul>";
    return Promise.resolve(text);
};

var convertOrderedList = function(_, text, matchs, __, options) {
    var t = matchs[2];
    if (!t)
        t = "1";
    options.type = NO_SKIP;
    options.op = `<ol type="${t}">`;
    options.cl = "</ol>";
    return Promise.resolve(text);
};

var convertListItem = function(_, text, matchs, __, options) {
    options.type = NO_SKIP;
    options.op = "<li";
    if (matchs[2])
        op += " value=\"" + matchs[2] + "\"";
    options.op += ">";
    options.cl = "</li>";
    return Promise.resolve(text);
};

var convertCitation = function(_, text, matchs, matche, options) {
    options.type = NO_SKIP;
    if (matchs[1] == "\n")
        options.op = "<br />";
    options.op += "<span class=\"quotation\">&gt;";
    options.cl = "</span>";
    if (matche[0] == "\n")
        options.cl += "<br />";
    return Promise.resolve(text);
};

async function markup(boardName, text, { deletedPost, markupModes, accessLevel, referencedPosts, } = {}) {
  if (!text || typeof text !== 'string') {
    return null;
  }
  deletedPost = Tools.option(deletedPost, 'number', 0, { test: Tools.testPostNumber });
  if (_(markupModes).isArray()) {
    markupModes = markupModes.filter((mode) => { return MARKUP_MODES.indexOf(mode) >= 0; });
  } else {
    markupModes = MARKUP_MODES;
  }
  if (!accessLevel || (Tools.REGISTERED_USER_LEVELS.indexOf(accessLevel) < 0)) {
    accessLevel = null;
  }
  text = text.replace(/\r+\n/g, '\n').replace(/\r/g, '\n');
  let info = new ProcessingContext(text, boardName, referencedPosts, deletedPost);
  await Tools.series(elements, async function(element) {
    if (element.markupModes && !element.markupModes.some((mode) => { return markupModes.indexOf(mode) >= 0; })) {
      return;
    }
    if (element.accessLevel && Tools.compareRegisteredUserLevels(accessLevel, element.accessLevel) < 0) {
      return;
    }
    if (element.permission && Tools.compareRegisteredUserLevels(accessLevel, Permissions[element.permission]())) < 0) {
      return;
    }
    if (typeof element.process === 'function') {
      await element.process(info);
    } else if (typeof element.convert === 'function') {
      await process(info, element.convert, {
        op: element.op,
        cl: element.cl
      }, {
        nestable: !!element.nestable,
        escapable: !!element.escapable,
        check: element.check,
        pre: !!element.pre
      });
    }
  });
  return info.toHtml();
}

var processPostText = function(boardName, text, options) {
    if (!text)
        return Promise.resolve(null);
    var deletedPost = (options && +(options.deletedPost) > 0) ? options.deletedPost : 0;
    var markupModes = (options && options.markupModes) ? options.markupModes : [
        MarkupModes.ExtendedWakabaMark,
        MarkupModes.BBCode
    ];
    var accessLevel = (options && options.accessLevel) || null;
    var c = {};
    var langs = [];
    Highlight.listLanguages().forEach(function(lang) {
        langs.push(lang);
        var aliases = Highlight.getLanguage(lang).aliases;
        if (aliases) {
            aliases.forEach(function(alias) {
                langs.push(alias);
            });
        }
    });
    langs.splice(langs.indexOf("cpp") + 1, 0, "c++");
    langs.splice(langs.indexOf("cs") + 1, 0, "c#");
    langs.splice(langs.indexOf("fsharp") + 1, 0, "f#");
    langs = langs.join("|").split("+").join("\\+").split("-").join("\\-").split(".").join("\\.");
    text = text.replace(/\r+\n/g, "\n").replace(/\r/g, "\n");
    var info = new ProcessingContext(text, boardName, options ? options.referencedPosts : null, deletedPost);
    var p = Promise.resolve();
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0) {
        p = p.then(function() {
            return process(info, convertMonospace, { op: "``" }, { escapable: true });
        }).then(function() {
            return process(info, convertNomarkup, { op: "''" }, { escapable: true });
        }).then(function() {
            return process(info, convertPre, {
                op: /\/\\-\\-pre\s+/g,
                cl: /\s+\\\\\\-\\-/g
            });
        }).then(function() {
            return process(info, convertCode, {
                op: new RegExp("/\\-\\-code\\s+(" + langs + ")\\s+", "gi"),
                cl: /\s+\\\\\\-\\-/g
            });
        }).then(function() {
            return process(info, convertLatex.bind(null, false), { op: "$$$" });
        }).then(function() {
            return process(info, convertLatex.bind(null, true), { op: "$$" });
        });
    }
    if (markupModes.indexOf(MarkupModes.BBCode) >= 0) {
        if (Tools.compareRegisteredUserLevels(accessLevel, Permissions.useRawHTMLMarkup()) >= 0) {
            p = p.then(function() {
                return process(info, convertHtml, {
                    op: "[raw-html]",
                    cl: "[/raw-html]"
                });
            });
        }
        p = p.then(function() {
            return process(info, convertPre, {
                op: "[pre]",
                cl:"[/pre]"
            });
        }).then(function() {
            return process(info, convertCode, {
                op: "[code]",
                cl: "[/code]"
            });
        }).then(function() {
            return process(info, convertCode, {
                op: new RegExp("\\[code\\s+lang\\=\"?(" + langs + ")\"?\\s*\\]", "gi"),
                cl: "[/code]"
            });
        }).then(function() {
            return process(info, convertCode, {
                op: new RegExp("\\[(" + langs + ")\\]", "gi"),
                cl: new RegExp("\\[/(" + langs + ")\\]", "gi")
            }, { checkFunction: checkLangsMatch });
        }).then(function() {
            return process(info, convertMonospace, {
                op: "[m]",
                cl: "[/m]"
            });
        }).then(function() {
            return process(info, convertNomarkup, {
                op: "[n]",
                cl: "[/n]"
            });
        }).then(function() {
            return process(info, convertLatex.bind(null, false), {
                op: "[latex]",
                cl: "[/latex]"
            });
        }).then(function() {
            return process(info, convertLatex.bind(null, true), {
                op: "[l]",
                cl: "[/l]"
            });
        });
    }
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0 || markupModes.indexOf(MarkupModes.BBCode) >= 0) {
        p = p.then(function() {
            if (!config("site.vkontakte.integrationEnabled", false))
                return Promise.resolve();
            return process(info, convertVkontaktePost, {
                op: /<div id\="vk_post_\-?\d+_\d+"><\/div><script type="text\/javascript">  \(function\(d\, s\, id\) \{ var js\, fjs \= d\.getElementsByTagName\(s\)\[0\]; if \(d\.getElementById\(id\)\) return; js \= d\.createElement\(s\); js\.id \= id; js\.src \= "\/\/vk\.com\/js\/api\/openapi\.js\?121"; fjs\.parentNode\.insertBefore\(js\, fjs\); \}\(document\, 'script'\, 'vk_openapi_js'\)\);  \(function\(\) \{    if \(\!window\.VK \|\| \!VK\.Widgets \|\| \!VK\.Widgets\.Post \|\| \!VK\.Widgets\.Post\("vk_post_\-?\d+_\d+"\, (\-?\d+)\, (\d+)\, '([a-zA-Z0-9_\-]+)'\, \{width\: 500\}\)\) setTimeout\(arguments\.callee\, 50\);  \}\(\)\);<\/script>/g,
                cl: null
            });
        }).then(function() {
            return process(info, convertUrl, {
                op: "[url]",
                cl: "[/url]"
            });
        }).then(function() {
            return process(info, convertExternalLink, {
                op: new XRegExp(Tools.EXTERNAL_LINK_REGEXP_PATTERN, "gi"),
                cl: null
            }, { checkFunction: checkExternalLink });
        }).then(function() {
            return process(info, convertProtocol, {
                op: /(mailto|irc|news)\:(\S+)/gi,
                cl: null
            });
        }).then(function() {
            return processStrikedOutShitty(info);
        }).then(function() {
            return processStrikedOutShittyWord(info);
        }).then(function() {
            return process(info, convertTooltipShitty, {
                op: /([^\?\s]+)\?{3}"([^"]+)"/gi,
                cl: null
            });
        }).then(function() {
            return process(info, convertPostLink, {
                op: />>([1-9][0-9]*)/gi,
                cl: null
            });
        }).then(function() {
            var boards = Board.boardNames().join("|");
            return process(info, convertPostLink, {
                op: new RegExp(">>/(" + boards + ")/([1-9][0-9]*)", "gi"),
                cl: null
            });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "----",
                cl: null
            });
        });
    }
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0) {
        p = p.then(function() {
            return process(info, convertMarkup, { op: "---" });
        });
    }
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0 || markupModes.indexOf(MarkupModes.BBCode) >= 0) {
        p = p.then(function() {
            return process(info, convertMarkup, {
                op: "--",
                cl: null
            });
        });
    }
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0) {
        p = p.then(function() {
            return process(info, convertMarkup, { op: "***" });
        }).then(function() {
            return process(info, convertMarkup, { op: "**" });
        }).then(function() {
            return process(info, convertMarkup, { op: "*" });
        }).then(function() {
            return process(info, convertMarkup, { op: "___" });
        }).then(function() {
            return process(info, convertMarkup, { op: "__" });
        }).then(function() {
            return process(info, convertMarkup, { op: "_" });
        }).then(function() {
            return process(info, convertMarkup, { op: "///" });
        }).then(function() {
            return process(info, convertCSpoiler, { op: "%%%" });
        }).then(function() {
            return process(info, convertMarkup, { op: "%%" });
        });
    }
    if (markupModes.indexOf(MarkupModes.BBCode) >= 0) {
        p = p.then(function() {
            return process(info, convertMarkup, {
                op: "[b]",
                cl: "[/b]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[i]",
                cl: "[/i]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[s]",
                cl: "[/s]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[u]",
                cl: "[/u]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[sub]",
                cl: "[/sub]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[sup]",
                cl: "[/sup]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertMarkup, {
                op: "[spoiler]",
                cl: "[/spoiler]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertCSpoiler, {
                op: "[cspoiler]",
                cl: "[/cspoiler]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertCSpoiler, {
                op: /\[cspoiler\s+title\="([^"]*)"\s*\]/gi,
                cl: "[/cspoiler]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertTooltip, {
                op: /\[tooltip\s+value\="([^"]*)"\s*\]/gi,
                cl: "[/tooltip]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertUnorderedList, {
                op: /\[ul(\s+type\="?(disc|circle|square|d|c|s)"?)?\s*\]/gi,
                cl: "[/ul]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertOrderedList, {
                op: /\[ol(\s+type\="?(A|a|I|i|1)"?)?\s*\]/gi,
                cl: "[/ol]"
            }, { nestable: true });
        }).then(function() {
            return process(info, convertListItem, {
                op: /\[li(\s+value\="?(\d+)"?\s*)?\]/gi,
                cl: "[/li]"
            }, { nestable: true });
        });
    }
    if (markupModes.indexOf(MarkupModes.ExtendedWakabaMark) >= 0 || markupModes.indexOf(MarkupModes.BBCode) >= 0) {
        p = p.then(function() {
            return process(info, convertCitation, {
                op: ">",
                cl: /\n|$/gi
            }, { checkFunction: checkQuotationNotInterrupted });
        });
    }
    return p.then(function() {
        return info.toHtml();
    });
};

Object.defineProperty(processPostText, 'EXTENDED_WAKABA_MARK', { value: EXTENDED_WAKABA_MARK });
Object.defineProperty(processPostText, 'BB_CODE', { value: BB_CODE });
Object.defineProperty(processPostText, 'MARKUP_MODES', { value: MARKUP_MODES });
Object.defineProperty(processPostText, "markupCode", { value: markupCode });

processPostText.markupModes = function(string) {
  if (typeof string !== 'string') {
    string = '';
  }
  return MARKUP_MODES.filter((mode) => { return string.indexOf(mode) >= 0; });
};

processPostText.latex = markupLaTeX;

module.exports = processPostText;
