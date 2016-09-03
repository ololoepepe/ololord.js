import ProcessingContext from './processing-context';

const TAGS = {
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
  options.type = ProcessingContext.NO_SKIP;
  let tag = TAGS[matchs[0]];
  if (!tag) {
    return '';
  }
  options.op = tag.op;
  options.cl = tag.cl;
  return text;
}

export default [{
  priority: 2500,
  markupModes: ['EXTENDED_WAKABA_MARK'],
  convert: convertTags,
  op: '---',
  cl: null
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
