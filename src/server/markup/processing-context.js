import * as Renderer from '../core/renderer';
import * as Tools from '../helpers/tools';

export default class ProcessingContext {
  static get NO_SKIP() { return 'NO_SKIP'; }
  static get HTML_SKIP() { return 'HTML_SKIP'; }
  static get CODE_SKIP() { return 'CODE_SKIP'; }

  static isEscaped(s, pos) {
    if (pos <= 0 || pos >= s.length) {
      return false;
    }
    let n = 0;
    let i = pos - 1;
    while (i >= 0 && s[i] === '\\') {
      ++n;
      --i;
    }
    return (n % 2);
  }

  static withoutEscaped(text, escapableSequencesRegExp) {
    if (!escapableSequencesRegExp) {
      return text;
    }
    let ind = text.lastIndexOf(escapableSequencesRegExp);
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
          if (escapable && ProcessingContext.isEscaped(this.text, ind)) {
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
          if (escapable && ProcessingContext.isEscaped(this.text, match.index)) {
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
    if (start < 0 || length <= 0 || (start + length) > this.text.length || ProcessingContext.NO_SKIP === type) {
      return false;
    }
    type = type || ProcessingContext.CODE_SKIP;
    for (let i = 0; i < this.skipList.length; ++i) {
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
    type = type || ProcessingContext.HTML_SKIP;
    let info = {
      start: start,
      length: txt.length,
      type: type
    };
    let found = false;
    for (let i = this.skipList.length - 1; i >= 0; --i) {
      let inf = this.skipList[i];
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

  replace(start, length, txt, correction, type) {
    if (start < 0 || length <= 0 || (txt.length < 1) || (length + start) > this.text.length) {
      return;
    }
    type = type || ProcessingContext.HTML_SKIP;
    let info = {
      start: start,
      length: txt.length,
      type: type
    };
    let dlength = txt.length - length;
    let found = false;
    for (let i = this.skipList.length - 1; i >= 0; --i) {
      let inf = this.skipList[i];
      if (start >= inf.start) {
        if (ProcessingContext.NO_SKIP !== type) {
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
    if (!found && ProcessingContext.NO_SKIP !== type) {
      this.skipList.unshift(info);
    }
    this.text = this.text.substr(0, start) + txt + this.text.substr(start + length);
  }

  toHTML(escapableSequencesRegExp, postProcessors) {
    let s = '';
    let last = 0;
    this.skipList.forEach((inf) => {
      let txt = ProcessingContext.withoutEscaped(this.text.substr(last, inf.start - last), escapableSequencesRegExp);
      s += Renderer.toHTML(txt);
      s += this.text.substr(inf.start, inf.length);
      last = inf.start + inf.length;
    });
    s += Renderer.toHTML(this.text.substr(last));
    return postProcessors.reduce((acc, processor) => { return processor(acc); }, s);
  }
}
