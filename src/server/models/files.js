import _ from 'underscore';
import FS from 'q-io/fs';

import * as Tools from '../helpers/tools';
import Hash from '../storage/hash';
import redisClient from '../storage/redis-client-factory';
import sqlClient from '../storage/sql-client-factory';
import UnorderedSet from '../storage/unordered-set';
import { AUDIO_TAGS } from '../file-types/audio';

let ArchivedFileHashes = new UnorderedSet(sqlClient(), 'archivedFileHashes');
let ArchivedFileInfos = new Hash(sqlClient(), 'archivedFileInfos');
let ArchivedPostFileInfoNames = new UnorderedSet(sqlClient(), 'archivedPostFileInfoNames', {
  parse: false,
  stringify: false
});
let FileHashes = new UnorderedSet(redisClient(), 'fileHashes');
let FileInfos = new Hash(redisClient(), 'fileInfos');
let PostFileInfoNames = new UnorderedSet(redisClient(), 'postFileInfoNames', {
  parse: false,
  stringify: false
});

async function getFileInfo(name, hash) {
  if (!name && hash) {
    let info = await FileHashes.getOne(hash);
    if (!info) {
      info = await ArchivedFileHashes.getOne(hash);
    }
    if (info) {
      name = info.name;
    }
  }
  if (!name) {
    return Promise.reject(new Error(Tools.translate('No such file')));
  }
  let fileInfo = await FileInfos.getOne(name);
  if (!fileInfo) {
    fileInfo = ArchivedFileInfos.getOne(name);
  }
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
  let exists = await FileInfos.existsOne(name);
  if (exists) {
    return true;
  }
  return await ArchivedFileInfos.existsOne(name);
}

export async function fileInfoExistsByHash(hash) {
  let exists = await FileHashes.exists(hash);
  if (exists) {
    return true;
  }
  return await ArchivedFileHashes.exists(hash);
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
    if (!fileInfo) {
      fileInfo = await ArchivedFileHashes.getOne(hash);
    }
    if (fileInfo) {
      fileInfo.hash = hash;
    }
    return fileInfo;
  }, true);
}

export async function addFileInfo(fileInfo, { archived } = {}) {
  let source = archived ? ArchivedFileInfos : FileInfos;
  await source.setOne(fileInfo.name, fileInfo);
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
    let source = fileInfo.archived ? ArchivedFileHashes : FileHashes;
    return await source.addOne(createFileHash(fileInfo), fileInfo.hash);
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
    let source = fileInfo.archived ? ArchivedFileHashes : FileHashes;
    await source.deleteOne(createFileHash(fileInfo), fileInfo.hash);
    let size = await source.count(fileInfo.hash);
    if (size <= 0) {
      await source.delete(fileInfo.hash);
    }
  });
}

export async function removeFileInfos(fileInfoNames, { archived } = {}) {
  if (!_(fileInfoNames).isArray()) {
    fileInfoNames = [fileInfoNames];
  }
  if (fileInfoNames.length <= 0) {
    return 0;
  }
  let source = archived ? ArchivedFileInfos : FileInfos;
  await source.deleteSome(fileInfoNames);
}

export async function addFilesToPost(boardName, postNumber, files, { archived } = {}) {
  let source = archived ? ArchivedPostFileInfoNames : PostFileInfoNames;
  await Tools.series(files, async function(file) {
    file.boardName = boardName;
    file.postNumber = postNumber;
    await addFileInfo(file, { archived: archived });
    await source.addOne(file.name, `${boardName}:${postNumber}`);
  });
  await addFileHashes(files);
}

export async function deleteFile(fileName) {
  let fileInfo = await getFileInfoByName(fileName);
  let { boardName, postNumber, archived } = fileInfo;
  let infosSource = archived ? ArchivedFileInfos : FileInfos;
  let namesSource = archived ? ArchivedPostFileInfoNames : PostFileInfoNames;
  await namesSource.deleteOne(fileName, `${boardName}:${postNumber}`);
  await infosSource.deleteOne(fileName);
  await removeFileHashes(fileInfo);
  let path = `${__dirname}/../../public/${boardName}`;
  Tools.series([`${path}/src/${fileInfo.name}`, `${path}/thumb/${fileInfo.thumb.name}`], async function() {
    try {
      await FS.remove(path);
    } catch (err) {
      Logger.error(err.stack || err);
    }
  });
}

export async function editFileRating(fileName, rating) {
  let fileInfo = await getFileInfoByName(fileName);
  if (Tools.FILE_RATINGS.indexOf(rating) < 0) {
    rating = Tools.FILE_RATINGS[0];
  }
  fileInfo.rating = rating;
  let source = fileInfo.archived ? ArchivedFileInfos : FileInfos;
  await source.setOne(fileName, fileInfo);
}

export async function editAudioTags(fileName, fields) {
  let fileInfo = await getFileInfoByName(fileName);
  AUDIO_TAGS.forEach((tag) => {
    let value = fields[tag];
    if (value && typeof value === 'string') {
      fileInfo.extraData[tag] = value;
    } else if (fileInfo.extraData.hasOwnProperty(tag)) {
      delete fileInfo.extraData[tag];
    }
  });
  let source = fileInfo.archived ? ArchivedFileInfos : FileInfos;
  await source.setOne(fileName, fileInfo);
}

export async function getPostFileCount(boardName, postNumber, { archived } = {}) {
  let source = archived ? ArchivedPostFileInfoNames : PostFileInfoNames;
  return await source.count(`${boardName}:${postNumber}`);
}

export async function getPostFileInfos(boardName, postNumber, { archived } = {}) {
  let namesSource = archived ? ArchivedPostFileInfoNames : PostFileInfoNames;
  let infosSource = archived ? ArchivedFileInfos : FileInfos;
  let fileNames = await namesSource.getAll(`${boardName}:${postNumber}`);
  return await infosSource.getSome(fileNames);
}

export async function removePostFileInfos(boardName, postNumber, { archived } = {}) {
  let key = `${boardName}:${postNumber}`
  let namesSource = archived ? ArchivedPostFileInfoNames : PostFileInfoNames;
  let fileNames = await namesSource.getAll(key);
  let fileInfos = await Tools.series(fileNames, async function(fileName) {
    return await getFileInfoByName(fileName);
  }, true);
  fileInfos = fileInfos.filter(fileInfo => !!fileInfo);
  let paths = fileInfos.map((fileInfo) => {
    return [
      `${__dirname}/../../public/${boardName}/src/${fileInfo.name}`,
      `${__dirname}/../../public/${boardName}/thumb/${fileInfo.thumb.name}`
    ];
  });
  await namesSource.delete(key);
  await removeFileInfos(fileNames, { archived: archived });
  await removeFileHashes(fileInfos);
  Tools.series(_(paths).flatten(), async function(path) {
    try {
      await FS.remove(path);
    } catch (err) {
      Logger.error(err.stack || err);
    }
  });
}

export async function pushPostFileInfosToArchive(boardName, postNumber) {
  let key = `${boardName}:${postNumber}`
  let fileNames = await PostFileInfoNames.getAll(key);
  await ArchivedPostFileInfoNames.addSome(fileNames, key);
  await PostFileInfoNames.delete(key);
  let fileInfos = await Tools.series(fileNames, async function(fileName) {
    return await getFileInfoByName(fileName);
  }, {});
  await ArchivedFileInfos.setSome(fileInfos);
  await FileInfos.deleteSome(fileNames);
  await Tools.series(fileInfos, async function(fileInfo) {
    let fileHash = createFileHash(fileInfo);
    await ArchivedFileHashes.addOne(fileHash, fileInfo.hash);
    await FileHashes.deleteOne(fileHash, fileInfo.hash);
    let size = await FileHashes.count(fileInfo.hash);
    if (size <= 0) {
      await FileHashes.delete(fileInfo.hash);
    }
  });
}
