import Elasticsearch from 'elasticsearch';

import config from '../helpers/config';
import Logger from '../helpers/logger';

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
    let data = await getPostIndex(boardName, postNumber);
    let body = await transformer(data._source);
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
