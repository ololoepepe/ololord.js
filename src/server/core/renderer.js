import _ from 'underscore';
import merge from 'merge';

import * as Misc from '../models/misc';
import * as Tools from '../helpers/tools';
var Global = require("../helpers/global");

const TEMPLATES_PATH = `${__dirname}/../views`;

let templates = {};

export function render(templateName, model) {
  let template = templates[templateName];
  if (!template) {
    Global.error(Tools.translate('Invalid template: $[1]', '', templateName));
    return '';
  }
  let baseModel = controller.baseModel();
  baseModel.templateName = templateName;
  let o = Misc.boards();
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
  baseModel.isImageType = Tools.isImageType;
  baseModel.isAudioType = Tools.isAudioType;
  baseModel.isVideoType = Tools.isVideoType;
  baseModel.escaped = Tools.escaped;
  baseModel.escapedSelector = Tools.escapedSelector;
  baseModel.translate = Tools.translate;
  let timeOffset = config('site.timeOffset');
  let locale = config('site.locale');
  let format = config('site.dateFormat');
  baseModel.formattedDate = (date) => {
    return moment(date).utcOffset(timeOffset).locale(locale).format(format);
  };
  return template(merge.recursive(baseModel, model || {}));
}

export async function reloadTemplates() {
  try {
    let fileNames = FS.listTree(TEMPLATES_PATH, (_1, stat) => stat.isFile());
    templates = fileNames.filter((fileName) => {
      return fileName.split('.').pop() === 'js' && fileName.split('/').pop() !== 'index.js';
    }).map((fileName) => {
      return fileName.substr(__dirname.length).split('.').slice(0, -1).join('.');
    }).reduce((acc, templateName) => {
      let id = `../views/${templateName}.js`;
      if (require.cache.hasOwnProperty(id)) {
        delete require.cache[require.resolve(id)];
      }
      acc[templateName] = require(id);
      return acc;
    }, {});
  } catch (err) {
    Global.error(err.stack || err);
  }
}
