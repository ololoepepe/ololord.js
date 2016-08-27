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

export default [{
  priority: 4600,
  markupModes: ['BB_CODE'],
  convert: convertUnorderedList,
  op: /\[ul(\s+type\="?(disc|circle|square|d|c|s)"?)?\s*\]/gi,
  cl: "[/ul]"
  nestable: true
}, {
  priority: 4700,
  markupModes: ['BB_CODE'],
  convert: convertOrderedList,
  op: /\[ol(\s+type\="?(A|a|I|i|1)"?)?\s*\]/gi,
  cl: "[/ol]"
  nestable: true
}, {
  priority: 4800,
  markupModes: ['BB_CODE'],
  convert: convertListItem,
  op: /\[li(\s+value\="?(\d+)"?\s*)?\]/gi,
  cl: "[/li]"
  nestable: true
}];
