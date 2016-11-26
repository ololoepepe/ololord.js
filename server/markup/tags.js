'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _processingContext = require('./processing-context');

var _processingContext2 = _interopRequireDefault(_processingContext);

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getCSpoilerOP() {
  var title = Renderer.toHTML(Tools.translate('Spoiler'));
  return "<span class='collapsible-spoiler'><span class='collapsible-spoiler-title' " + ('title=\'' + Tools.translate('Spoiler') + '\' onclick=\'lord.expandCollapseSpoiler(this);\'>' + title) + "</span><span class='collapsible-spoiler-body' style='display: none;'>";
}

var TAGS = {
  '---': {
    op: '<s>',
    cl: '</s>'
  },
  '***': {
    op: '<u>',
    cl: '</u>'
  },
  '**': {
    op: '<strong>',
    cl: '</strong>'
  },
  '*': {
    op: '<em>',
    cl: '</em>'
  },
  '___': {
    op: '<u>',
    cl: '</u>'
  },
  '__': {
    op: '<strong>',
    cl: '</strong>'
  },
  '_': {
    op: '<em>',
    cl: '</em>'
  },
  '///': {
    op: '<em>',
    cl: '</em>'
  },
  '%%%': {
    op: getCSpoilerOP,
    cl: '</span></span>'
  },
  '%%': {
    op: "<span class='spoiler'>",
    cl: '</span>'
  },
  '[b]': {
    op: '<strong>',
    cl: '</strong>'
  },
  '[i]': {
    op: '<em>',
    cl: '</em>'
  },
  '[s]': {
    op: '<s>',
    cl: '</s>'
  },
  '[u]': {
    op: '<u>',
    cl: '</u>'
  },
  '[sub]': {
    op: '<sub>',
    cl: '</sub>'
  },
  '[sup]': {
    op: '<sup>',
    cl: '</sup>'
  },
  '[spoiler]': {
    op: "<span class='spoiler'>",
    cl: '</span>'
  }
};

function convertTags(_1, text, matchs, _2, options) {
  options.type = _processingContext2.default.NO_SKIP;
  var tag = TAGS[matchs[0]];
  if (!tag) {
    return '';
  }
  if (typeof tag.op === 'function') {
    options.op = tag.op();
  } else {
    options.op = tag.op;
  }
  options.cl = tag.cl;
  return text;
}

exports.default = [{
  priority: 2500,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertTags,
  op: '---'
}, {
  priority: 2700,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertTags,
  op: '***'
}, {
  priority: 2800,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertTags,
  op: '**'
}, {
  priority: 2900,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertTags,
  op: '*'
}, {
  priority: 3000,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertTags,
  op: '___'
}, {
  priority: 3100,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertTags,
  op: '__'
}, {
  priority: 3200,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertTags,
  op: '_'
}, {
  priority: 3300,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertTags,
  op: '///'
}, {
  priority: 3400,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertTags,
  op: '%%%'
}, {
  priority: 3500,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertTags,
  op: '%%'
}, {
  priority: 3600,
  markupModes: ['BB_CODE'],
  convert: convertTags,
  op: '[b]',
  cl: '[/b]',
  nestable: true
}, {
  priority: 3700,
  markupModes: ['BB_CODE'],
  convert: convertTags,
  op: '[i]',
  cl: '[/i]',
  nestable: true
}, {
  priority: 3800,
  markupModes: ['BB_CODE'],
  convert: convertTags,
  op: '[s]',
  cl: '[/s]',
  nestable: true
}, {
  priority: 3900,
  markupModes: ['BB_CODE'],
  convert: convertTags,
  op: "[u]",
  cl: "[/u]",
  nestable: true
}, {
  priority: 4000,
  markupModes: ['BB_CODE'],
  convert: convertTags,
  op: '[sub]',
  cl: '[/sub]',
  nestable: true
}, {
  priority: 4100,
  markupModes: ['BB_CODE'],
  convert: convertTags,
  op: '[sup]',
  cl: '[/sup]',
  nestable: true
}, {
  priority: 4200,
  markupModes: ['BB_CODE'],
  convert: convertTags,
  op: '[spoiler]',
  cl: '[/spoiler]',
  nestable: true
}];
//# sourceMappingURL=tags.js.map
