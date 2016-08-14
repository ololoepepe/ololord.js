import _ from 'underscore';

import client from '../storage/client-factory';
import Hash from '../storage/hash';
import UnorderedSet from '../storage/unordered-set';
import * as Tools from '../helpers/tools';

let FileHashes = new UnorderedSet(client(), 'fileHashes');
let FileInfos = new Hash(client(), 'fileInfos');

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
