import _ from 'underscore';

import * as IPC from '../helpers/ipc';
import * as Tools from '../helpers/tools';
import * as PostsModel from './posts';
import Hash from '../storage/hash';
import redisClient from '../storage/redis-client-factory';
import sqlClient from '../storage/sql-client-factory';

let ArchivedReferringPosts = new Hash(sqlClient(), 'archivedReferringPosts');
let ArchivedReferencedPosts = new Hash(sqlClient(), 'archivedReferencedPosts');
let ReferringPosts = new Hash(redisClient(), 'referringPosts');
let ReferencedPosts = new Hash(redisClient(), 'referencedPosts');

function sortedReferences(references) {
  return _(references).toArray().sort((a, b) => {
    return (a.createdAt && b.createdAt && a.createdAt.localeCompare(b.createdAt))
      || a.boardName.localeCompare(b.boardName) || (a.postNumber - b.postNumber);
  }).map((reference) => {
    delete reference.createdAt;
    return reference;
  });
}

export async function addReferencesToPost(post) {
  let key = `${post.boardName}:${post.number}`;
  let referringSource = post.archived ? ArchivedReferringPosts : ReferringPosts;
  let referencedSource = post.archived ? ArchivedReferencedPosts : ReferencedPosts;
  let referringPosts = await referringSource.getAll(key);
  let referencedPosts = await referencedSource.getAll(key);
  post.referringPosts = sortedReferences(referringPosts);
  post.referencedPosts = sortedReferences(referencedPosts);
}

export async function addReferencedPosts(post, referencedPosts, { nogenerate, archived } = {}) {
  let key = `${post.boardName}:${post.number}`;
  let referringSource = post.archived ? ArchivedReferringPosts : ReferringPosts;
  let referencedSource = post.archived ? ArchivedReferencedPosts : ReferencedPosts;
  //TODO: Optimise (hmset)
  await Tools.series(referencedPosts, async function(ref, refKey) {
    await referencedSource.setOne(refKey, ref, key);
    await referringSource.setOne(key, {
      boardName: post.boardName,
      postNumber: post.number,
      threadNumber: post.threadNumber,
      createdAt: refKey.createdAt
    }, refKey);
  });
  if (!nogenerate) {
    _(referencedPosts).each((ref, refKey) => {
      if (ref.boardName !== post.boardName || ref.threadNumber !== post.threadNumber) {
        IPC.render(ref.boardName, ref.threadNumber, ref.postNumber, 'edit');
      }
    });
  }
}

export async function removeReferences({ boardName, number, threadNumber, archived }, { nogenerate } = {}) {
  let key = `${boardName}:${number}`;
  let referencedSource = archived ? ArchivedReferencedPosts : ReferencedPosts;
  let referencedPosts = await referencedSource.getAll(key);
  await Tools.series(referencedPosts, async function(ref, refKey) {
    await ReferringPosts.deleteOne(key, refKey);
    await ArchivedReferringPosts.deleteOne(key, refKey);
  });
  if (!nogenerate) {
    _(referencedPosts).filter((ref) => {
      return (ref.boardName !== boardName) || (ref.threadNumber !== threadNumber);
    }).forEach((ref) => {
      IPC.render(ref.boardName, ref.threadNumber, ref.postNumber, 'edit');
    });
  }
  referencedSource.delete(key);
}

export async function rerenderReferringPosts({ boardName, number, threadNumber, archived }, { removingThread } = {}) {
  let referringSource = archived ? ArchivedReferringPosts : ReferringPosts;
  let referringPosts = await referringSource.getAll(`${boardName}:${number}`);
  referringPosts = _(referringPosts).filter((ref) => {
    return !removingThread || ref.boardName !== boardName || ref.threadNumber !== threadNumber;
  });
  await Tools.series(referringPosts, async function(ref) {
    return await PostsModel.rerenderPost(ref.boardName, ref.postNumber);
  });
}

export function replacePostLinks(text, sourceBoardName, referencedPosts, postNumberMap) {
  if (!text) {
    return text;
  }
  referencedPosts.filter((ref) => { return ref.boardName === sourceBoardName; }).forEach((ref) => {
    let newPostNumber = postNumberMap[ref.postNumber];
    let replacement = newPostNumber ? `>>${newPostNumber}` : `>>/${sourceBoardName}/${ref.postNumber}`;
    text = text.replace(new RegExp(`>>${ref.postNumber}`, 'g'), replacement);
  });
  return text;
}

export function replaceRelatedPostLinks({ text, sourceBoardName, targetBoardName, postBoardName, referencedPosts,
  postNumberMap }) {
  if (!text) {
    return text;
  }
  referencedPosts.filter(ref => postNumberMap.hasOwnProperty(ref.postNumber)).forEach((ref) => {
    let replacement = `>>/${targetBoardName}/${postNumberMap[ref.postNumber]}`;
    if (postBoardName === sourceBoardName) {
      text = text.replace(new RegExp(`>>${ref.postNumber}`, 'g'), replacement);
    }
    text = text.replace(new RegExp(`>>/${sourceBoardName}/${ref.postNumber}`, 'g'), replacement);
  });
  return text;
}

export function replacePostReferences(references, source, target, postNumberMap, related) {
  let sourceBoardName = source.boardName;
  let sourceThreadNumber = source.threadNumber;
  let targetBoardName = target.boardName;
  let targetThreadNumber = target.threadNumber;
  return references.map((ref) => {
    if (ref.boardName === sourceBoardName && ref.threadNumber === sourceThreadNumber) {
      return {
        boardName: targetBoardName,
        threadNumber: targetThreadNumber,
        postNumber: postNumberMap[ref.postNumber]
      };
    } else {
      related.push(ref);
      return ref;
    }
  });
}

export function replaceRelatedPostReferences(references, source, target, postNumberMap) {
  let sourceBoardName = source.boardName;
  let sourceThreadNumber = source.threadNumber;
  let targetBoardName = target.boardName;
  let targetThreadNumber = target.threadNumber;
  return references.map((ref) => {
    if (ref.boardName === sourceBoardName && ref.threadNumber === sourceThreadNumber) {
      return {
        boardName: targetBoardName,
        threadNumber: targetThreadNumber,
        postNumber: postNumberMap[ref.postNumber]
      };
    } else {
      return ref;
    }
  });
}

export async function storeReferencedPosts(boardName, postNumber, referencedPosts, { archived } = {}) {
  let source = archived ? ArchivedReferencedPosts : ReferencedPosts;
  await Tools.series(referencedPosts, async function(ref) {
    await source.setOne(`${ref.boardName}:${ref.postNumber}`, ref, `${boardName}:${postNumber}`);
  });
}

export async function storeReferringPosts(boardName, postNumber, referringPosts, { archived } = {}) {
  let source = archived ? ArchivedReferringPosts : ReferringPosts;
  await Tools.series(referringPosts, async function(ref) {
    source.setOne(`${ref.boardName}:${ref.postNumber}`, ref, `${boardName}:${postNumber}`);
  });
}

export async function removeReferencedPosts(boardName, postNumber, { archived } = {}) {
  let source = archived ? ArchivedReferencedPosts : ReferencedPosts;
  source.delete(`${boardName}:${postNumber}`);
}

export async function removeReferringPosts(boardName, postNumber, { archived } = {}) {
  let source = archived ? ArchivedReferringPosts : ReferringPosts;
  source.delete(`${boardName}:${postNumber}`);
}
