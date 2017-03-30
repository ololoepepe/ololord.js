'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _renderer = require('../core/renderer');

var Renderer = _interopRequireWildcard(_renderer);

var _tools = require('../helpers/tools');

var Tools = _interopRequireWildcard(_tools);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ProcessingContext = function () {
  _createClass(ProcessingContext, null, [{
    key: 'isEscaped',
    value: function isEscaped(s, pos) {
      if (pos <= 0 || pos >= s.length) {
        return false;
      }
      var n = 0;
      var i = pos - 1;
      while (i >= 0 && s[i] === '\\') {
        ++n;
        --i;
      }
      return n % 2;
    }
  }, {
    key: 'withoutEscaped',
    value: function withoutEscaped(text, escapableSequencesRegExp) {
      if (!escapableSequencesRegExp) {
        return text;
      }
      var ind = text.lastIndexOf(escapableSequencesRegExp);
      while (ind >= 0) {
        if (ProcessingContext.isEscaped(text, ind)) {
          text.remove(ind - 1, 1);
          ind = text.lastIndexOf(escapableSequencesRegExp, ind - text.length - 3);
          continue;
        }
        ind = text.lastIndexOf(escapableSequencesRegExp, ind - text.length - 2);
      }
      return text;
    }
  }, {
    key: 'NO_SKIP',
    get: function get() {
      return 'NO_SKIP';
    }
  }, {
    key: 'HTML_SKIP',
    get: function get() {
      return 'HTML_SKIP';
    }
  }, {
    key: 'CODE_SKIP',
    get: function get() {
      return 'CODE_SKIP';
    }
  }]);

  function ProcessingContext(text, boardName, referencedPosts, deletedPost) {
    _classCallCheck(this, ProcessingContext);

    this.boardName = boardName;
    this.deletedPost = deletedPost;
    this.referencedPosts = referencedPosts;
    this.text = text;
    this.skipList = [];
  }

  _createClass(ProcessingContext, [{
    key: 'find',
    value: function find(rx, start, escapable) {
      var _this = this;

      start = Tools.option(start, 'number', 0, { test: function test(s) {
          return s > 0;
        } });
      if (typeof rx === 'string') {
        var _ret = function () {
          var ind = _this.text.indexOf(rx, start);
          while (ind >= 0) {
            var isIn = _this.skipList.some(function (inf) {
              if (ind >= inf.start && ind < inf.start + inf.length) {
                ind = _this.text.indexOf(rx, inf.start + inf.length);
                return true;
              }
            });
            if (!isIn) {
              if (escapable && ProcessingContext.isEscaped(_this.text, ind)) {
                ind = _this.text.indexOf(rx, ind + 1);
              } else {
                return {
                  v: {
                    0: rx,
                    index: ind
                  }
                };
              }
            }
          }
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
      } else {
        var _ret2 = function () {
          rx.lastIndex = start;
          var match = rx.exec(_this.text);
          while (match) {
            var isIn = _this.skipList.some(function (inf) {
              if (match && match.index >= inf.start && match.index < inf.start + inf.length) {
                rx.lastIndex = inf.start + inf.length;
                match = rx.exec(_this.text);
                return true;
              }
            });
            if (!isIn && match) {
              if (escapable && ProcessingContext.isEscaped(_this.text, match.index)) {
                rx.lastIndex = match.index + 1;
                match = rx.exec(_this.text);
              } else {
                return {
                  v: match
                };
              }
            }
          }
        }();

        if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
      }
      return null;
    }
  }, {
    key: 'isIn',
    value: function isIn(start, length, type) {
      if (start < 0 || length <= 0 || start + length > this.text.length || ProcessingContext.NO_SKIP === type) {
        return false;
      }
      type = type || ProcessingContext.CODE_SKIP;
      for (var i = 0; i < this.skipList.length; ++i) {
        var inf = this.skipList[i];
        if (inf.type !== type) {
          continue;
        }
        var x = start;
        while (x < start + length) {
          if (x >= inf.start && x <= inf.start + inf.length) {
            return true;
          }
          ++x;
        }
      }
      return false;
    }
  }, {
    key: 'insert',
    value: function insert(start, txt, type) {
      if (start < 0 || txt.length <= 0 || start > this.text.length) {
        return;
      }
      type = type || ProcessingContext.HTML_SKIP;
      var info = {
        start: start,
        length: txt.length,
        type: type
      };
      var found = false;
      for (var i = this.skipList.length - 1; i >= 0; --i) {
        var inf = this.skipList[i];
        if (start > inf.start) {
          if (ProcessingContext.NO_SKIP !== type) {
            this.skipList.splice(i + 1, 0, info);
          }
          found = true;
          break;
        }
        inf.start += txt.length;
      }
      if (!found && ProcessingContext.NO_SKIP !== type) {
        this.skipList.unshift(info);
      }
      this.text = this.text.substr(0, start) + txt + this.text.substr(start);
    }
  }, {
    key: 'replace',
    value: function replace(start, length, txt, correction, type) {
      if (start < 0 || length <= 0 || txt.length < 1 || length + start > this.text.length) {
        return;
      }
      type = type || ProcessingContext.HTML_SKIP;
      var info = {
        start: start,
        length: txt.length,
        type: type
      };
      var dlength = txt.length - length;
      var found = false;
      for (var i = this.skipList.length - 1; i >= 0; --i) {
        var inf = this.skipList[i];
        if (start >= inf.start) {
          if (ProcessingContext.NO_SKIP !== type) {
            this.skipList.splice(i + 1, 0, info);
          }
          found = true;
          break;
        }
        if (inf.start < start + length) {
          inf.start -= correction;
        } else {
          inf.start += dlength;
        }
      }
      if (!found && ProcessingContext.NO_SKIP !== type) {
        this.skipList.unshift(info);
      }
      this.text = this.text.substr(0, start) + txt + this.text.substr(start + length);
    }
  }, {
    key: 'toHTML',
    value: function toHTML(escapableSequencesRegExp, postProcessors) {
      var _this2 = this;

      var s = '';
      var last = 0;
      this.skipList.forEach(function (inf) {
        var txt = ProcessingContext.withoutEscaped(_this2.text.substr(last, inf.start - last), escapableSequencesRegExp);
        s += Renderer.toHTML(txt);
        s += _this2.text.substr(inf.start, inf.length);
        last = inf.start + inf.length;
      });
      s += Renderer.toHTML(this.text.substr(last));
      return postProcessors.reduce(function (acc, processor) {
        return processor(acc);
      }, s);
    }
  }]);

  return ProcessingContext;
}();

exports.default = ProcessingContext;
//# sourceMappingURL=processing-context.js.map
