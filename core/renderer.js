'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.reloadTemplates = undefined;

var reloadTemplates = exports.reloadTemplates = function () {
  var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
    var fileNames;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            try {
              fileNames = FS.listTree(TEMPLATES_PATH, function (_1, stat) {
                return stat.isFile();
              });

              templates = fileNames.filter(function (fileName) {
                return fileName.split('.').pop() === 'js' && fileName.split('/').pop() !== 'index.js';
              }).map(function (fileName) {
                return fileName.substr(__dirname.length).split('.').slice(0, -1).join('.');
              }).reduce(function (acc, templateName) {
                var id = '../views/' + templateName + '.js';
                if (require.cache.hasOwnProperty(id)) {
                  delete require.cache[require.resolve(id)];
                }
                acc[templateName] = require(id);
                return acc;
              }, {});
            } catch (err) {
              Global.error(err.stack || err);
            }

          case 1:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function reloadTemplates() {
    return ref.apply(this, arguments);
  };
}();

exports.render = render;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _merge = require('merge');

var _merge2 = _interopRequireDefault(_merge);

var _misc = require('../models/misc');

var Misc = _interopRequireWildcard(_misc);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var Global = require("../helpers/global");

var TEMPLATES_PATH = __dirname + '/../views';

var templates = {};

function render(templateName, model) {
  var template = templates[templateName];
  if (!template) {
    Global.error(Tools.translate('Invalid template: $[1]', '', templateName));
    return '';
  }
  var baseModel = controller.baseModel();
  baseModel.templateName = templateName;
  var o = Misc.boards();
  baseModel.boards = o.boards;
  baseModel.boardGroups = o.boardGroups;
  baseModel.banner = (0, _underscore2.default)((0, _underscore2.default)(baseModel.boards.filter(function (board) {
    return board.bannerFileNames.length > 0;
  }).map(function (board) {
    return board.bannerFileNames.map(function (fileName) {
      return {
        boardName: board.name,
        boardTitle: board.title,
        fileName: fileName
      };
    });
  })).flatten()).sample();
  baseModel._ = _underscore2.default;
  baseModel.compareRegisteredUserLevels = Tools.compareRegisteredUserLevels;
  baseModel.isImageType = Tools.isImageType;
  baseModel.isAudioType = Tools.isAudioType;
  baseModel.isVideoType = Tools.isVideoType;
  baseModel.escaped = Tools.escaped;
  baseModel.escapedSelector = Tools.escapedSelector;
  baseModel.translate = Tools.translate;
  var timeOffset = config('site.timeOffset');
  var locale = config('site.locale');
  var format = config('site.dateFormat');
  baseModel.formattedDate = function (date) {
    return moment(date).utcOffset(timeOffset).locale(locale).format(format);
  };
  return template(_merge2.default.recursive(baseModel, model || {}));
}
//# sourceMappingURL=renderer.js.map
