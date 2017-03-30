import _ from 'underscore';

import * as Settings from '../helpers/settings';
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
  if (Settings.spellsEnabled()) {
    await require('../core/hiding').applySpells(posts);
  }
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
