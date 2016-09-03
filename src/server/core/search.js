import _ from 'underscore';
import Elasticsearch from 'elasticsearch';

import config from '../helpers/config';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

try {
  var es = new Elasticsearch.Client({ host: config('system.elasticsearch.host') });
} catch (err) {
  var es = null;
}

const INDEX_NAME = 'ololord.js';

export async function indexPost({ boardName, postNumber, threadNumber, plainText, subject }) {
  try {
    await es.index({
      index: INDEX_NAME,
      type: 'posts',
      id: `${boardName}:${postNumber}`,
      body: {
        plainText: plainText,
        subject: subject,
        boardName: boardName,
        threadNumber: threadNumber
      }
    });
  } catch (err) {
    Logger.error(err.stack || err);
  }
}

export async function getPostIndex(boardName, postNumber) {
  try {
    let data = await es.get({
      index: INDEX_NAME,
      type: 'posts',
      id: `${boardName}:${postNumber}`
    });
    return data._source;
  } catch (err) {
    Logger.error(err.stack || err);
    return { _source: {} };
  }
}

export async function updatePostIndex(boardName, postNumber, transformer) {
  if (typeof transformer !== 'function') {
    return;
  }
  try {
    let body = await getPostIndex(boardName, postNumber);
    body = await transformer(body);
    await es.index({
      index: INDEX_NAME,
      type: 'posts',
      id: `${boardName}:${postNumber}`,
      body: body
    });
  } catch (err) {
    Logger.error(err.stack || err);
  }
}


export async function removePostIndex(boardName, postNumber) {
  try {
    await es.delete({
      index: INDEX_NAME,
      type: 'posts',
      id: `${boardName}:${postNumber}`
    });
  } catch (err) {
    Logger.error(err.stack || err);
  }
}

function mapPhrase(phrase) {
  return {
    bool: {
      should: [
        { match_phrase: { plainText: phrase } },
        { match_phrase: { subject: phrase } }
      ]
    }
  };
}

export async function findPosts({ requiredPhrases, excludedPhrases, possiblePhrases }, { boardName, page }) {
  page = Tools.option(page, 'number', 0, { test: (p) => { return p >= 0; } });
  let limit = config('system.search.maxResultCount');
  let startFrom = page * limit;
  let query = { bool: {} };
  if (_(requiredPhrases).isArray() && requiredPhrases.length > 0) {
    query.bool.must = requiredPhrases.map(mapPhrase);
  }
  if (boardName && typeof boardName === 'string') {
    query.bool.must = (query.bool.must || []).concat({ match_phrase: { boardName: boardName } });
  }
  if (_(excludedPhrases).isArray() && excludedPhrases.length > 0) {
    query.bool.must_not = excludedPhrases.map(mapPhrase);
  }
  if (_(possiblePhrases).isArray() && possiblePhrases.length > 0) {
      if (_(requiredPhrases).isArray() && requiredPhrases.length > 0) {
        query.bool.should = possiblePhrases.map(mapPhrase);
      } else {
        query.bool.must = (query.bool.must || []).concat({ bool: { should: possiblePhrases.map(mapPhrase) } });
      }
  }
  let result = await es.search({
    index: INDEX_NAME,
    type: 'posts',
    from: startFrom,
    size: limit,
    body: { query: query }
  });
  return {
    posts: result.hits.hits.map((hit) => {
      let [boardName, postNumber] = hit._id.split(':');
      let { threadNumber, plainText, subject, archived } = hit._source;
      return {
        boardName: boardName,
        number: +postNumber,
        threadNumber: +threadNumber,
        plainText: plainText,
        subject: subject,
        archived: !!archived
      };
    }),
    total: result.hits.total,
    max: limit
  };
}
