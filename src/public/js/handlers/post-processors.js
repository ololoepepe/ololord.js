import _ from 'underscore';
import $ from 'jquery';

import * as DOM from '../helpers/dom';
import * as Storage from '../helpers/storage';
import * as Tools from '../helpers/tools';

let preprocessors = [];
let postprocessors = [];

export let registerPreprocessor = Tools.createRegisterFunction(preprocessors);
export let registerPostprocessor = Tools.createRegisterFunction(postprocessors);

export async function applyPreprocessors(posts) {
  if (!_(posts).isArray()) {
    posts = [posts];
  }
  await Tools.series(posts.filter(post => !!post), (post) => {
    let list = preprocessors.filter((p) => { return Tools.testFilter(p, post); }).sort(Tools.priorityPredicate);
    return Tools.series(list, (p) => {
      return p.processor(post);
    });
  });
  await require('../core/hiding').applySpells(posts);
}

export function applyPostprocessors(posts) {
  if (!_(posts).isArray()) {
    posts = [posts];
  }
  return Tools.series(posts.filter(post => !!post), (post) => {
    let list = postprocessors.filter((p) => { return Tools.testFilter(p, post); }).sort(Tools.priorityPredicate);
    return Tools.series(list, (p) => {
      return p.processor(post);
    });
  });
}
