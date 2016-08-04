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
    return Promise.reject(Tools.translate('No such file'));
  }
  let fileInfo = FileInfos.getOne(name);
  if (!fileInfo) {
    return Promise.reject(Tools.translate('No such file'));
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
