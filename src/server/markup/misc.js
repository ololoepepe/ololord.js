function convertHtml(_1, text, _2, _3, options) {
  options.type = 'HTML_SKIP';
  return text;
}

function convertEmDash(_1, _2, _3, _4, options) {
  options.type = 'NO_SKIP';
  return '\u2014';
}

function convertEnDash(_1, _2, _3, _4, options) {
  options.type = 'NO_SKIP';
  return '\u2013';
}

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

var checkCitationNotInterrupted = function(info, matchs, matche) {
    if (info.isIn(matchs.index, matche.index - matchs.index))
        return false;
    if (0 == matchs.index)
        return true;
    if ("\n" == info.text.substr(matchs.index - 1, 1))
        return true;
    return (info.isIn(matchs.index - 6, 6, HTML_SKIP) && info.text.substr(matchs.index - 6, 6) == "<br />");
};

export default [{
  priority: 600,
  markupModes: ['BB_CODE'],
  convert: convertHtml,
  op: '[raw-html]',
  cl: '[/raw-html]'
  permission: 'useRawHTMLMarkup'
}, {
  priority: 2400,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertEmDash,
  op: '----',
  cl: null
}, {
  priority: 2600,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertEnDash,
  op: '--',
  cl: null
}, {
  priority: 4300,
  markupModes: ['BB_CODE'],
  convert: convertCSpoiler,
  op: "[cspoiler]",
  cl: "[/cspoiler]"
  nestable: true
}, {
  priority: 4400,
  markupModes: ['BB_CODE'],
  convert: convertCSpoiler,
  op: /\[cspoiler\s+title\="([^"]*)"\s*\]/gi,
  cl: "[/cspoiler]"
  nestable: true
}, {
  priority: 4500,
  markupModes: ['BB_CODE'],
  convert: convertTooltip,
  op: /\[tooltip\s+value\="([^"]*)"\s*\]/gi,
  cl: "[/tooltip]"
  nestable: true
}, {
  priority: 4600,
  markupModes: ['EXTENDED_WAKABA_MARK', 'BB_CODE'],
  convert: convertCitation,
  op: ">",
  cl: /\n|$/gi,
  check: checkCitationNotInterrupted
}];
