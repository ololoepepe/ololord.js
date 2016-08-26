import _ from 'underscore';
import browserify from 'browserify';
import DOT from 'dot';
import escapeHTML from 'escape-html';
import FS from 'q-io/fs';
import HTMLToText from 'html-to-text';
import merge from 'merge';
import micromatch from 'micromatch';
import moment from 'moment';
import UUID from 'uuid';

import * as Files from './files';
import Board from '../boards/board';
import * as MiscModel from '../models/misc';
import * as Cache from '../helpers/cache';
import config from '../helpers/config';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

const TEMPLATES_SOURCE_PATH = `${__dirname}/../src/views`;
const TEMPLATES_PATH = `${__dirname}/../views`;
const TEMPLATES_INDEX_PATH = `${TEMPLATES_PATH}/index.js`;
const APP_PATH = __dirname.split('/').slice(0, -1).join('/');
const DOT_SETTINGS = {
  evaluate: /\{\{([\s\S]+?)\}\}/g,
  interpolate: /\{\{=([\s\S]+?)\}\}/g,
  encode: /\{\{!([\s\S]+?)\}\}/g,
  use: /\{\{#([\s\S]+?)\}\}/g,
  define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
  conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
  iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
  varname: 'it',
  strip: false,
  append: true,
  selfcontained: false
};
const EXCLUDED_SOURCE_TEMPLATE_FILES = new Set(['index.js.template', '.gitignore']);
const ENCODE_HTML_SOURCE = DOT.encodeHTMLSource.toString();
const ILLEGAL_CHARACTERS_REGEXP = /[^a-zA-Z\$_]/gi;

let templates = {};

function escapedSelector(string) {
  if (typeof string !== 'string') {
    return string;
  }
  return string.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '-');
}

export function render(templateName, model) {
  let template = templates[templateName];
  if (!template) {
    Logger.error(Tools.translate('Invalid template: $[1]', '', templateName));
    return '';
  }
  let baseModel = MiscModel.base();
  baseModel.templateName = templateName;
  let o = MiscModel.boards();
  baseModel.boards = o.boards;
  baseModel.boardGroups = o.boardGroups;
  baseModel.banner = _(_(baseModel.boards.filter((board) => {
    return board.bannerFileNames.length > 0;
  }).map((board) => {
    return board.bannerFileNames.map((fileName) => {
      return {
        boardName: board.name,
        boardTitle: board.title,
        fileName: fileName
      };
    });
  })).flatten()).sample();
  baseModel._ = _;
  baseModel.compareRegisteredUserLevels = Tools.compareRegisteredUserLevels;
  baseModel.isImageType = Files.isImageType;
  baseModel.isAudioType = Files.isAudioType;
  baseModel.isVideoType = Files.isVideoType;
  baseModel.escaped = escapeHTML;
  baseModel.escapedSelector = escapedSelector;
  baseModel.translate = Tools.translate;
  let timeOffset = config('site.timeOffset');
  let locale = config('site.locale');
  let format = config('site.dateFormat');
  baseModel.formattedDate = (date) => {
    return moment(date).utcOffset(timeOffset).locale(locale).format(format);
  };
  try {
    return template(merge.recursive(baseModel, model || {}));
  } catch (err) {
    Logger.error(err.stack || err);
    return '';
  }
}

export async function getRouterPaths(description) {
  let controllers = Tools.requireWrapper(require('../controllers'));
  let paths = await Tools.series(controllers.routers, async function(router) {
    if (typeof router.paths !== 'function') {
      return [];
    }
    return await router.paths(description);
  }, true);
  return _(paths).flatten().filter(path => !!path);
}

export async function rerender(what) {
  let controllers = Tools.requireWrapper(require('../controllers'));
  let routers = await Tools.series(controllers.routers, async function(router) {
    if (typeof router.paths !== 'function' || typeof router.render !== 'function') {
      return;
    }
    let paths = await router.paths();
    paths = micromatch(paths, what || '**');
    if (paths.length <= 0) {
      return;
    }
    return {
      router: router,
      paths: paths
    };
  }, true);
  return await Tools.series(routers.filter(router => !!router), async function(router) {
    await Tools.series(router.paths, async function(path) {
      console.log(Tools.translate('Rendering $[1]…', '', path));
      let result = await router.router.render(path);
      return await Tools.series(result, async function(data, id) {
        return await Cache.writeFile(id, data);
      });
    });
  });
}

export async function renderThread(thread) {
  let board = Board.board(thread.boardName);
  if (!board) {
    return Promise.reject(new Error(Tools.translate('Invalid board')));
  }
  await Files.renderPostFileInfos(thread.opPost);
  await board.renderPost(thread.opPost);
  if (!thread.lastPosts) {
    return;
  }
  await Tools.series(thread.lastPosts, async function(post) {
    await Files.renderPostFileInfos(post);
    await board.renderPost(post);
  });
}

export async function generateTemplatingJavaScriptFile() {
  console.log('Generating templating JavaScript file…');
  let models = JSON.stringify({
    base: MiscModel.base(),
    boards: MiscModel.boards(),
    notFoundImageFileNames: MiscModel.notFoundImageFileNames(),
    tr: MiscModel.translations()
  });
  let fileNames = await FS.listTree(TEMPLATES_PATH, (_, stat) => stat.isFile());
  let templateNames = fileNames.filter((fileName) => {
    return fileName.split('.').pop() === 'js' && 'index.js' !== fileName;
  }).map(fileName => fileName.substr(__dirname.length + 1));
  let template = await FS.read(`${TEMPLATES_INDEX_PATH}.template`);
  await FS.write(TEMPLATES_INDEX_PATH, template.replace('{{models}}', models));
  let string = '';
  let stream = browserify({
    entries: TEMPLATES_INDEX_PATH,
    debug: false
  });
  templateNames.forEach(lib => stream.require(`./views/${lib}`));
  stream = stream.bundle();
  stream.on('data', (data) => { string += data; });
  await new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  string = string.split(APP_PATH).join('.');
  await FS.write(`${__dirname}/../public/js/templating.js`, string);
}

export async function generateCustomJavaScriptFile() {
  console.log('Checking custom JavaScript file existence…');
  let exists = await FS.exists(`${__dirname}/../public/js/custom.js`);
  if (!exists) {
    console.log('Creating dummy custom JavaScript file…');
    return await Cache.writeFile('js/custom.js', '');
  }
}

export async function generateCustomCSSFiles() {
  console.log('Checking custom CSS files existence…');
  let list = await Tools.series(['combined', 'desktop', 'mobile'], async function(type) {
    let exists = await FS.exists(`${__dirname}/../public/css/custom-base-${type}.css`);
    return {
      type: type,
      exists: exists
    };
  }, true);
  let types = list.filter(item => !item.exists).map(item => item.type);
  if (types.length > 0) {
    console.log('Creating dummy custom CSS file(s)…');
    await Tools.series(types, async function(type) {
      await Cache.writeFile(`css/custom-base-${type}.css`, '');
    });
  }
}

export async function compileTemplates() {
  console.log('Compiling templates…');
  let list = await FS.list(TEMPLATES_PATH);
  await Tools.series(list.filter(entry => !EXCLUDED_SOURCE_TEMPLATE_FILES.has(entry)), async function(entry) {
    return await FS.removeTree(`${TEMPLATES_PATH}/${entry}`);
  });
  let fileNames = await FS.listTree(TEMPLATES_SOURCE_PATH, (_, stat) => stat.isFile());
  fileNames = fileNames.map(fileName => fileName.substr(__dirname.length + 6));
  let includes = await Tools.series(fileNames, async function(fileName) {
    if (!/\.def(\.dot|\.jst)?$/.test(fileName)) {
      return;
    }
    let content = await FS.read(`${TEMPLATES_SOURCE_PATH}/${fileName}`);
    return {
      name: fileName.split('.').slice(0, -1).join('.'),
      content: content
    };
  }, true);
  includes = includes.filter(item => !!item).reduce((acc, item) => {
    acc[item.name] = item.content;
    return acc;
  }, {});
  await Tools.series(fileNames, async function(fileName) {
    if (!/\.jst(\.dot|\.def)?$/.test(fileName)) {
      return;
    }
    let compiled = '(function(){';
    let string = await FS.read(`${TEMPLATES_SOURCE_PATH}/${fileName}`);
    let moduleName = fileName.split('.').shift().replace(ILLEGAL_CHARACTERS_REGEXP, '_');
    compiled += DOT.template(string, DOT_SETTINGS, includes).toString().replace('anonymous', moduleName);
    compiled += `var itself=${moduleName}, _encodeHTML=(${ENCODE_HTML_SOURCE}());`;
    compiled += 'module.exports=itself;})()';
    if (fileName.split('/').length > 1) {
      await FS.makeTree(`${TEMPLATES_PATH}/${fileName.split('/').slice(0, -1).join('/')}`);
    }
    await FS.write(`${TEMPLATES_PATH}/${fileName.split('.').slice(0, -1).join('.')}.js`, compiled);
  });
}

export async function reloadTemplates() {
  try {
    let fileNames = await FS.listTree(TEMPLATES_PATH, (_1, stat) => stat.isFile());
    templates = fileNames.filter((fileName) => {
      return fileName.split('.').pop() === 'js' && fileName.split('/').pop() !== 'index.js';
    }).map((fileName) => {
      return fileName.substr(__dirname.length + 2).split('.').slice(0, -1).join('.');
    }).reduce((acc, templateName) => {
      let id = `../views/${templateName}.js`;
      if (require.cache.hasOwnProperty(id)) {
        delete require.cache[require.resolve(id)];
      }
      acc[templateName] = require(id);
      return acc;
    }, {});
  } catch (err) {
    Logger.error(err.stack || err);
  }
}

export function targetsFromString(string) {
  if (!string || typeof string !== 'string') {
    return {};
  }
  return string.split(/\s+/).reduce((acc, part) => {
    let [boardName, ...postNumbers] = part.split(':');
    if (boardName) {
      if (postNumbers.length > 0) {
        acc[boardName] = postNumbers.map((postNumber) => {
          return Tools.option(postNumber, 'number', 0, { test: Tools.testPostNumber })
        }).filter(postNumber => !!postNumber);
      } else {
        acc[boardName] = '*';
      }
    }
    return acc;
  }, {});
}

export function postingSpeedString(launchDate, lastPostNumber) {
  launchDate = +launchDate;
  if (isNaN(launchDate)) {
    return '-';
  }
  function zeroSpeedString(nonZero) {
    if (lastPostNumber && launchDate) {
      return `1 ${nonZero}`;
    } else {
      return `0 ${Tools.translate('post(s) per hour.')}`;
    }
  }
  function speedString(duptime) {
    let ss = '' + (lastPostNumber / duptime).toFixed(1);
    return (ss.split('.').pop() !== '0') ? ss : ss.split('.').shift();
  }
  let uptimeMsecs = _.now() - launchDate;
  let duptime = uptimeMsecs / Tools.HOUR;
  let uptime = Math.floor(duptime);
  let shour = Tools.translate('post(s) per hour.');
  if (!uptime) {
    return zeroSpeedString(shour);
  } else if (Math.floor(lastPostNumber / uptime) > 0) {
    return `${speedString(duptime)} ${shour}`;
  }
  duptime /= 24;
  uptime = Math.floor(duptime);
  let sday = Tools.translate('post(s) per day.');
  if (!uptime) {
    return zeroSpeedString(sday);
  } else if (Math.floor(lastPostNumber / uptime) > 0) {
    return `${speedString(duptime)} ${sday}`;
  }
  duptime /= (365 / 12);
  uptime = Math.floor(duptime);
  let smonth = Tools.translate('post(s) per month.');
  if (!uptime) {
    return zeroSpeedString(smonth);
  } else if (Math.floor(lastPostNumber / uptime) > 0) {
    return `${speedString(duptime)} ${smonth}`;
  }
  duptime /= 12.0;
  uptime = Math.floor(duptime);
  let syear = Tools.translate('post(s) per year.');
  if (!uptime) {
    return zeroSpeedString(syear);
  } else if (Math.floor(lastPostNumber / uptime) > 0) {
    return `${speedString(duptime)} ${syear}`;
  }
  return `0 ${syear}`;
}

export function plainText(text, { brToNewline } = {}) {
  if (!text) {
    return '';
  }
  text = '' + text;
  let id = UUID.v4();
  if (brToNewline) {
    text = text.replace(/<br \/>/g, id);
  } else {
    text = text.replace(/<br \/>/g, ' ');
  }
  text = HTMLToText.fromString(text, {
    wordwrap: null,
    linkHrefBaseUrl: `${config('site.protocol')}://${config('site.domain')}`,
    hideLinkHrefIfSameAsText: true,
    ignoreImages: true
  });
  if (brToNewline) {
    text = text.split(id).join('\n');
  }
  return text;
}
