import _ from 'underscore';

import client from '../storage/client-factory';
import Hash from '../storage/hash';
import UnorderedSet from '../storage/unordered-set';
import * as Tools from '../helpers/tools';

let FileHashes = new UnorderedSet(client(), 'fileHashes');
let FileInfos = new Hash(client(), 'fileInfos');
let PostFileInfoNames = new UnorderedSet(client(), 'postFileInfoNames', {
  parse: false,
  stringify: false
});

async function getFileInfo(name, hash) {
  if (!name && hash) {
    let info = await FileHashes.getOne(hash);
    if (info) {
      name = info.name;
    }
  }
  if (!name) {
    return Promise.reject(new Error(Tools.translate('No such file')));
  }
  let fileInfo = FileInfos.getOne(name);
  if (!fileInfo) {
    return Promise.reject(new Error(Tools.translate('No such file')));
  }
  return fileInfo;
}

export async function getFileInfoByName(name) {
  return await getFileInfo(name);
}

export async function getFileInfoByHash(hash) {
  return await getFileInfo(null, hash);
}

export async function fileInfoExistsByName(name) {
  return await FileInfos.existsOne(name);
}

export async function fileInfoExistsByHash(hash) {
  return await FileHashes.exists(hash);
}

export async function getFileInfosByHashes(hashes) {
  if (!hashes) {
    return [];
  }
  if (!_(hashes).isArray()) {
    hashes = [hashes];
  }
  return await Tools.series(hashes, async function(hash) {
    let fileInfo = await FileHashes.getOne(hash);
    fileInfo.hash = hash;
    return fileInfo;
  }, true);
}

export async function addFileInfo(fileInfo) {
  await FileInfos.setOne(fileInfo.name, fileInfo);
}

export function createFileHash(fileInfo) {
  return {
    name: fileInfo.name,
    thumb: { name: fileInfo.thumb.name },
    size: fileInfo.size,
    boardName: fileInfo.boardName,
    mimeType: fileInfo.mimeType,
    rating: fileInfo.rating
  };
}

export async function addFileHashes(fileInfos) {
  if (!_(fileInfos).isArray()) {
    fileInfos = [fileInfos];
  }
  await Tools.series(fileInfos.filter(fileInfo => !!fileInfo), async function(fileInfo) {
    return await FileHashes.addOne(createFileHash(fileInfo), fileInfo.hash);
  });
}

export async function removeFileHashes(fileInfos) {
  if (!_(fileInfos).isArray()) {
    fileInfos = [fileInfos];
  }
  if (fileInfos.length <= 0) {
    return;
  }
  await Tools.series(fileInfos, async function(fileInfo) {
    await FileHashes.deleteOne(createFileHash(fileInfo), fileInfo.hash);
    let size = await FileHashes.count(fileInfo.hash);
    if (size <= 0) {
      await FileHashes.delete(fileInfo.hash);
    }
  });
}

export async function removeFileInfos(fileInfoNames) {
  if (!_(fileInfoNames).isArray()) {
    fileInfos = [fileInfos];
  }
  if (ids.length <= 0) {
    return 0;
  }
  await FileInfos.deleteSome(fileInfoNames);
}

export async function addFilesToPost(boardName, postNumber, files, transaction) {
  await Tools.series(files, async function(file) {
    file.boardName = boardName;
    file.postNumber = postNumber;
    await addFileInfo(file);
    await PostFileInfoNames.addOne(file.name, `${boardName}:${postNumber}`);
  });
  await addFileHashes(files);
}
