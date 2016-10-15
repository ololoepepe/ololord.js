import _ from 'underscore';

import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import * as PostsModel from './posts';
import markup from '../markup';
import mongodbClient from '../storage/mongodb-client-factory';

let client = mongodbClient();

export async function removeReferringPosts(boardName, postNumber) {
  let Post = await client.collection('post');
  return await Post.updateMany({
    referringPosts: {
      $elemMatch: {
        boardName: boardName,
        postNumber: postNumber
      }
    }
  }, {
    $pull: {
      referringPosts: {
        boardName: boardName,
        postNumber: postNumber
      }
    }
  });
}

export async function addReferringPosts(referencedPosts, boardName, postNumber, threadNumber) {
  let Post = await client.collection('post');
  await Tools.series(referencedPosts, (ref) => {
    return Post.updateOne({
      boardName: ref.boardName,
      number: ref.postNumber
    }, {
      $push: {
        referringPosts: {
          boardName: boardName,
          postNumber: postNumber,
          threadNumber: threadNumber,
          createdAt: ref.createdAt
        }
      }
    });
  });
}

function pickPostsToRerender(referencedPosts, boardName, postNumber) {
  return _(referencedPosts).filter((ref) => {
    return (boardName !== ref.boardName) || (postNumber !== ref.postNumber);
  }).reduce((acc, ref) => {
    acc[`${ref.boardName}:${ref.threadNumber}`] = ref;
    return acc;
  }, {});
}

function pickThreadsToRerender(referencedPosts, boardName, threadNumber) {
  return _(referencedPosts).filter((ref) => {
    return (boardName !== ref.boardName) || (threadNumber !== ref.threadNumber);
  }).reduce((acc, ref) => {
    acc[`${ref.boardName}:${ref.threadNumber}`] = ref;
    return acc;
  }, {});
}

async function updatePostMarkup(boardName, postNumber) {
  console.log(Tools.translate('Rendering post text: >>/$[1]/$[2]', '', boardName, postNumber));
  let Post = await client.collection('post');
  let query = {
    boardName: boardName,
    number: postNumber
  };
  let post = await Post.findOne(query, {
    threadNumber: 1,
    rawText: 1,
    markup: 1,
    'user.level': 1,
    referencedPosts: 1
  });
  if (!post) {
    throw new Error(Tools.translate('No such post'));
  }
  let oldReferencedPosts = post.referencedPosts;
  let referencedPosts = {};
  let text = await markup(boardName, post.rawText, {
    markupModes: post.markup,
    referencedPosts: referencedPosts,
    accessLevel: post.user.level
  });
  let { matchedCount } = await Post.updateOne(query, {
    $set: {
      text: text,
      referencedPosts: _(referencedPosts).toArray()
    }
  });
  if (matchedCount <= 0) {
    throw new Error(Tools.translate('No such post'));
  }
  return {
    oldReferencedPosts: oldReferencedPosts,
    newReferencedPosts: referencedPosts
  };
}

export async function updateReferringPosts(referringPosts, boardName, postNumber, threadNumber) {
  let pickNumber = postNumber || threadNumber;
  let pickFunction = postNumber ? pickPostsToRerender : pickThreadsToRerender;
  let refs = pickFunction(referringPosts, boardName, pickNumber);
  refs = await Tools.series(refs, async function(ref) {
    try {
      let { oldReferencedPosts, newReferencedPosts } = await updatePostMarkup(ref.boardName, ref.postNumber);
      oldReferencedPosts = pickFunction(oldReferencedPosts, boardName, pickNumber);
      await removeReferringPosts(ref.boardName, ref.postNumber);
      newReferencedPosts = pickFunction(newReferencedPosts, boardName, pickNumber);
      await addReferringPosts(newReferencedPosts, ref.boardName, ref.postNumber, ref.threadNumber);
      return _.extend(oldReferencedPosts, newReferencedPosts);
    } catch (err) {
      Logger.error(err.stack || err);
      return {};
    }
  }, true);
  return _(_.extend({}, ...refs)).reduce((acc, ref) => {
    acc[`${ref.boardName}:${ref.threadNumber}`] = ref;
    return acc;
  }, {});
}

export async function rerenderReferencedPosts(boardName, threadNumber, newReferencedPosts, oldReferencedPosts) {
  let newRefs = pickThreadsToRerender(newReferencedPosts, boardName, threadNumber);
  let oldRefs = pickThreadsToRerender(oldReferencedPosts, boardName, threadNumber);
  try {
    await Tools.series(_.extend(newRefs, oldRefs), (ref) => {
      return IPC.render(ref.boardName, ref.threadNumber, ref.threadNumber, 'edit');
    });
  } catch (err) {
    Logger.error(err.stack || err);
  }
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

export function replacePostReferences(references, source, target, postNumberMap) {
  let sourceBoardName = source.boardName;
  let sourceThreadNumber = source.threadNumber;
  let targetBoardName = target.boardName;
  let targetThreadNumber = target.threadNumber;
  return references.map((ref) => {
    if (ref.boardName === sourceBoardName && ref.threadNumber === sourceThreadNumber) {
      return {
        boardName: targetBoardName,
        threadNumber: targetThreadNumber,
        postNumber: postNumberMap[ref.postNumber],
        createdAt: ref.createdAt
      };
    } else {
      return ref;
    }
  });
}
