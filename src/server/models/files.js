import _ from 'underscore';
import FS from 'q-io/fs';
import promisify from 'promisify-node';

import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import mongodbClient from '../storage/mongodb-client-factory';
import { AUDIO_TAGS } from '../file-types/audio';

const mkpath = promisify('mkpath');

let client = mongodbClient();

export async function getFileInfoByName(name) {
  let Post = await client.collection('post');
  let post = await Post.findOne({ 'fileInfos.name': name }, { 'fileInfos.$': 1 });
  if (!post) {
    throw new Error(Tools.translate('No such file'));
  }
  return post.fileInfos[0];
}

export async function getFileInfoByHash(hash) {
  let Post = await client.collection('post');
  let post = await Post.findOne({ 'fileInfos.hash': hash }, { 'fileInfos.$': 1 });
  if (!post) {
    throw new Error(Tools.translate('No such file'));
  }
  return post.fileInfos[0];
}

export async function fileInfoExistsByName(name) {
  let Post = await client.collection('post');
  let count = await Post.count({ 'fileInfos.name': name });
  return (count > 0);
}

export async function fileInfoExistsByHash(hash) {
  let Post = await client.collection('post');
  let count = await Post.count({ 'fileInfos.hash': hash });
  return (count > 0);
}

export async function getFileInfosByHashes(hashes) {
  if (!hashes) {
    return [];
  }
  if (!_(hashes).isArray()) {
    hashes = [hashes];
  }
  if (hashes.length <= 0) {
    return [];
  }
  let Post = await client.collection('post');
  let posts = await Post.find({
    'fileInfos.hash': { $in: hashes }
  }, { 'fileInfos.$': 1 }).toArray();
  let fileInfosAll = _(posts.map(({ fileInfos }) => fileInfos[0]));
  let fileInfos = [];
  return hashes.map((hash) => {
    let fileInfo = fileInfosAll.find((fileInfo) => {
      return hash === fileInfo.hash;
    });
    if (!fileInfo) {
      throw new Error(Tools.translate('No such file'));
    }
    return fileInfo;
  });
}

function createFileInfo(file, boardName, postNumber) {
  file.boardName = boardName;
  file.postNumber = postNumber;
  return file;
}

export function createFileInfos(files, boardName, postNumber) {
  return files.map((file) => { return createFileInfo(file, boardName, postNumber); });
}

export async function addFilesToPost(boardName, postNumber, files) {
  let Post = await client.collection('post');
  let result = await Post.findOneAndUpdate({
    boardName: boardName,
    number: postNumber
  }, {
    $push: {
      fileInfos: { $each: createFileInfos(files, boardName, postNumber) }
    }
  }, {
    projection: { threadNumber: 1 },
    returnOriginal: false
  });
  let post = result.value;
  if (!post) {
    throw new Error(Tools.translate('No such post'));
  }
  await IPC.render(boardName, post.threadNumber, postNumber, 'edit');
}

async function removeFile({ boardName, name, thumb }) {
  let path = `${__dirname}/../../public/${boardName}`;
  try {
    await FS.remove(`${path}/src/${name}`);
  } catch (err) {
    Logger.error(err.stack || err);
  }
  try {
    await FS.remove(`${path}/thumb/${thumb.name}`);
  } catch (err) {
    Logger.error(err.stack || err);
  }
}

export async function removeFiles(fileInfos) {
  await Tools.series(fileInfos, removeFile);
}

export async function moveThreadFilesToArchive(boardName, threadNumber) {
  let archivePath = `${__dirname}/../../public/${boardName}/arch`;
  await mkpath(archivePath);
  let sourceId = `${boardName}/res/${threadNumber}.json`;
  let data = await Cache.readFile(sourceId);
  let model = JSON.parse(data);
  model.thread.archived = true;
  await FS.write(`${archivePath}/${threadNumber}.json`, JSON.stringify(model));
  await BoardController.renderThreadHTML(model.thread, {
    targetPath: `${archivePath}/${threadNumber}.html`,
    archived: true
  });
  await Cache.removeFile(sourceId);
  await Cache.removeFile(`${boardName}/res/${threadNumber}.html`);
}

export async function removeArchivedThreadFiles(boardName, threadNumber) {
  await Tools.series(['json', 'html'], async function(suffix) {
    try {
      await FS.remove(`${__dirname}/../../public/${boardName}/arch/${threadNumber}.${suffix}`);
    } catch (err) {
      Logger.error(err.stack || err);
    }
  });
}

export async function deleteFile(fileName) {
  let Post = await client.collection('post');
  let result = await Post.findOneAndUpdate({ 'fileInfos.name': fileName }, {
    $pull: {
      fileInfos: { name: fileName }
    }
  }, {
    projection: {
      boardName: 1,
      number: 1,
      threadNumber: 1,
      'fileInfos.$': 1
    },
    returnOriginal: true
  });
  let post = result.value;
  if (!post) {
    throw new Error(Tools.translate('No such file'));
  }
  await IPC.render(post.boardName, post.threadNumber, post.number, 'edit');
  removeFile(post.fileInfos[0]);
}

export async function editFileRating(fileName, rating) {
  let Post = await client.collection('post');
  if (Tools.FILE_RATINGS.indexOf(rating) < 0) {
    rating = Tools.FILE_RATINGS[0];
  }
  let result = await Post.findOneAndUpdate({ 'fileInfos.name': fileName }, {
    $set: { 'fileInfos.$.rating': rating }
  }, {
    projection: {
      boardName: 1,
      number: 1,
      threadNumber: 1
    },
    returnOriginal: false
  });
  let post = result.value;
  if (!post) {
    throw new Error(Tools.translate('No such file'));
  }
  await IPC.render(post.boardName, post.threadNumber, post.number, 'edit');
}

export async function editAudioTags(fileName, fields) {
  let Post = await client.collection('post');
  let extraData = AUDIO_TAGS.map((tagName) => {
    return {
      tagName: tagName,
      value: fields[tagName]
    };
  }).filter(({ value }) => {
    return (value && (typeof value === 'string'));
  }).reduce((acc, { tagName, value }) => {
    acc[tagName] = value;
    return acc;
  }, {});
  let result = await Post.findOneAndUpdate({ 'fileInfos.name': fileName }, {
    $set: { 'fileInfos.$.extraData': extraData }
  }, {
    projection: {
      boardName: 1,
      number: 1,
      threadNumber: 1
    },
    returnOriginal: false
  });
  let post = result.value;
  if (!post) {
    throw new Error(Tools.translate('No such file'));
  }
  await IPC.render(post.boardName, post.threadNumber, post.number, 'edit');
}

export async function getPostFileCount(boardName, postNumber, { archived } = {}) {
  let Post = await client.collection('post');
  let post = await Post.findOne({
    boardName: boardName,
    number: postNumber
  }, { fileInfoCount: 1 });
  if (!post) {
    throw new Error(Tools.translate('No such post'));
  }
  return post.fileInfoCount;
}

export async function copyFiles(fileInfos, sourceBoardName, targetBoardName, transaction) {
  let sourcePath = `${__dirname}/../../public/${sourceBoardName}/src`;
  let sourceThumbPath = `${__dirname}/../../public/${sourceBoardName}/thumb`;
  let targetPath = `${__dirname}/../../public/${targetBoardName}/src`;
  let targetThumbPath = `${__dirname}/../../public/${targetBoardName}/thumb`;
  await mkpath(targetPath);
  await mkpath(targetThumbPath);
  return await Tools.series(fileInfos, async function(fileInfo) {
    let oldFileName = fileInfo.name;
    let oldThumbName = fileInfo.thumb.name;
    let baseName = await IPC.send('fileName');
    fileInfo.name = fileInfo.name.replace(/^\d+/, baseName);
    fileInfo.thumb.name = fileInfo.thumb.name.replace(/^\d+/, baseName);
    let newFilePath = `${targetPath}/${fileInfo.name}`;
    let newThumbPath = `${targetThumbPath}/${fileInfo.thumb.name}`;
    transaction.addFile(newFilePath);
    await FS.copy(`${sourcePath}/${oldFileName}`, newFilePath);
    transaction.addFile(newThumbPath);
    await FS.copy(`${sourceThumbPath}/${oldThumbName}`, newThumbPath);
    return fileInfo;
  }, true);
}
