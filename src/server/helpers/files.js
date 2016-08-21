import _ from 'underscore';
import FS from 'q-io/fs';
import HTTP from 'q-io/http';
import merge from 'merge';
import Path from 'path';
import promisify from 'promisify-node';
import UUID from 'uuid';

import Board from '../boards/board';
import * as FilesModel from '../models/files';
import * as IPC from './ipc';
import * as Tools from './tools';
import vk from './vk';

const mkpath = promisify('mkpath');

const FILE_RATINGS = new Set(['SFW', 'R-15', 'R-18', 'R-18G']);

let thumbCreationPlugins = Tools.loadPlugins(`${__dirname}/../thumbnailing`);

function setFileRating(file, id, fields) {
  let rating = fields[`file_${id}_rating`];
  if (FILE_RATINGS.has(rating)) {
    file.rating = rating;
  } else {
    file.rating = 'SFW';
  }
}

async function downloadFile(url, formFieldName, fields, transaction) {
  let path = `${__dirname}/../tmp/upload_${UUID.v4()}`;
  transaction.addFile(path);
  let proxy = Tools.proxy();
  let options = { timeout: Tools.Minute }; //TODO: magic number
  if (/^vk\:\/\//.test(url)) {
    let result = await vk('audio.getById', { audios: url.split('/')[2] });
    options.url = result.response[0].url;
  } else if (proxy) {
    options = merge.recursive(options, {
      host: proxy.host,
      port: proxy.port,
      headers: { 'Proxy-Authorization': proxy.auth },
      path: url,
    });
  } else {
    optons.url = url;
  }
  let response = await HTTP.request(options);
  if (200 !== response.status) {
    return Promise.reject(new Error(Tools.translate('Failed to download file')));
  }
  let data = await response.body.read();
  if (data.length < 1) {
    return Promise.reject(new Error(Tools.translate('File is empty')));
  }
  await Tools.writeFile(path, data);
  let file = {
    name: url.split('/').pop(),
    size: data.length,
    path: path
  };
  setFileRating(file, formFieldName.substr(9), fields);
  let mimeType = await Tools.mimeType(path);
  file.mimeType = mimeType;
  return file;
}

export async function getFiles(fields, files, transaction) {
  files = await Tools.series(_(files).pick((file) => {
    if (file.size < 1) {
      FS.remove(file.path).catch((err) => { Logger.error(req, err.stack || err); });
      return false;
    }
    return true;
  }), async function(file, fileName) {
    setFileRating(file, file.fieldName.substr(5), fields);
    let mimeType = await Tools.mimeType(file.path);
    file.mimeType = mimeType;
    return file;
  }, true);
  let downloadedFiles = await Tools.series(_(fields).pick((_1, key) => {
    return /^file_url_\S+$/.test(key);
  }), async function(url, formFieldName) {
    return await downloadFile(url, formFieldName, fields, transaction);
  }, true);
  files = files.concat(downloadedFiles);
  let hashes = (typeof fields.fileHashes === 'string') ? fields.fileHashes.split(',').filter(hash => !!hash) : [];
  let fileInfos = await FilesModel.getFileInfosByHashes(hashes);
  let existingFiles = fileInfos.map((fileInfo, index) => {
    let fi = {
      name: fileInfo.name,
      thumbName: fileInfo.thumb.name,
      size: fileInfo.size,
      boardName: fileInfo.boardName,
      mimeType: fileInfo.mimeType,
      rating: fileInfo.rating,
      copy: true
    };
    setFileRating(fi, hashes[index], fields);
    return fi;
  });
  return files.concat(existingFiles);
}

async function waitForFile(filePath, options) { //TODO: That is not okay
  let delay = 50;
  let retry = 4;
  async function f() {
    let exists = await FS.exists(filePath);
    if (!exists) {
      if (!retry) {
        return Promise.reject(new Error(Tools.translate('Failed to copy file')));
      }
      --retry;
      await new Promise((resolve, reject) => {
        setTimeout(resolve, delay);
      });
      await f();
    }
  }
  await f();
}

async function generateFileName(file, plugin) {
  let baseName = await IPC.send('fileName');
  let suffix = Path.extname(file.name);
  if (typeof suffix === 'string') {
    suffix = suffix.substr(1);
  }
  if (!suffix || !plugin.suffixMatchesMimeType(suffix, file.mimeType)) {
    suffix = plugin.defaultSuffixForMimeType(file.mimeType);
  }
  let thumbSuffix = suffix;
  if (typeof plugin.thumbnailSuffixForMimeType === 'function') {
    thumbSuffix = plugin.thumbnailSuffixForMimeType(file.mimeType) || suffix;
  }
  return {
    name: `${baseName}.${suffix}`,
    thumbName: `${baseName}s.${thumbSuffix}`
  };
}

async function createFileThumb(file, plugin) {
  let thumbPath = `${Path.dirname(file.path)}/${UUID.v4()}`;
  file.thumbPath = thumbPath;
  let result = await plugin.createThumbnail(file, thumbPath, file.path) || {};
  file.dimensions = result.dimensions || null;
  file.extraData = result.extraData || null;
  file.thumbDimensions = result.thumbDimensions;
  if (result.ihash) {
    file.ihash = result.ihash;
  }
}

export function selectThumbnailingPlugin(mimeType) {
  //TODO: Cache
  return _(thumbCreationPlugins).find(plugin => plugin.match(mimeType));
}

export async function renderPostFileInfos(post) {
  if (!post) {
    return;
  }
  await Tools.series(post.fileInfos || [], async function(fileInfo) {
    if (!fileInfo) {
      return;
    }
    fileInfo.sizeKB = fileInfo.size / 1024;
    fileInfo.sizeText = fileInfo.sizeKB.toFixed(2) + ' ' + Tools.translate('KB');
    let plugin = selectThumbnailingPlugin(fileInfo.mimeType);
    if (!plugin) {
      let err = new Error(Tools.translate('Unsupported file type'));
      Logger.error(err.stack || err);
      return;
    }
    if (typeof plugin.renderPostFileInfo !== 'function') {
      return;
    }
    await plugin.renderPostFileInfo(fileInfo);
  });
}

async function processFile(boardName, file, transaction) {
  let plugin = selectThumbnailingPlugin(file.mimeType);
  if (!plugin) {
    return Promise.reject(new Error(Tools.translate('Unsupported file type')));
  }
  let fn = await generateFileName(file, plugin);
  let targetFilePath = `${__dirname}/../public/${boardName}/src/${fn.name}`;
  var targetThumbPath = `${__dirname}/../public/${boardName}/thumb/${fn.thumbName}`;
  transaction.addFile(targetFilePath);
  transaction.addFile(targetThumbPath);
  if (file.copy) {
    let sourceFilePath = `${__dirname}/../public/${file.boardName}/src/${file.name}`;
    let sourceThumbPath = `${__dirname}/../public/${file.boardName}/thumb/${file.thumbName}`;
    await FS.copy(sourceFilePath, targetFilePath);
    await FS.copy(sourceThumbPath, targetThumbPath);
    await waitForFile(targetThumbPath); //TODO: Fix
    let fileInfo = await FilesModel.getFileInfoByName(file.name);
    return {
      dimensions: fileInfo.dimensions,
      extraData: fileInfo.extraData,
      hash: fileInfo.hash,
      ihash: fileInfo.ihash || null,
      mimeType: fileInfo.mimeType,
      name: fn.name,
      rating: file.rating,
      size: fileInfo.size,
      thumb: {
        dimensions: fileInfo.thumb.dimensions,
        name: fn.thumbName
      }
    };
  } else {
    let sourceFilePath = file.path;
    if (!file.hash) {
      let data = await FS.read(file.path, 'b');
      file.hash = Tools.sha1(data);
    }
    await createFileThumb(file, plugin);
    await FS.move(sourceFilePath, targetFilePath);
    transaction.addFile(file.thumbPath);
    await FS.move(file.thumbPath, targetThumbPath);
    await waitForFile(targetThumbPath); //TODO: Fix
    return {
      dimensions: file.dimensions,
      extraData: file.extraData,
      hash: file.hash,
      ihash: file.ihash || null,
      mimeType: file.mimeType,
      name: fn.name,
      rating: file.rating,
      size: file.size,
      thumb: {
        dimensions: file.thumbDimensions,
        name: fn.thumbName
      }
    };
  }
}

export async function processFiles(boardName, files, transaction) {
  if (files.length < 1) {
    return [];
  }
  let path = `${__dirname}/../public/${boardName}`;
  await mkpath(`${path}/src`);
  await mkpath(`${path}/thumb`);
  return await Tools.series(files, async function(file) {
    return await processFile(boardName, file, transaction);
  }, true);
}

export async function createFile(dir, fileName, { file, isDir } = {}) {
  if (dir.slice(-1)[0] !== '/') {
    dir += '/';
  }
  let path = `${__dirname}/../${dir}${fileName}`;
  if (isDir) {
    await FS.makeDirectory(path);
  }
  if (file) {
    await FS.move(file.path, path);
  } else {
    await Tools.writeFile(path, '');
  }
}

export async function editFile(fileName, content) {
  await Tools.writeFile(`${__dirname}/../${fileName}`, content);
}

export async function renameFile(oldFileName, fileName) {
  let oldPath = `${__dirname}/../${oldFileName}`;
  await FS.rename(oldPath, oldPath.split('/').slice(0, -1).join('/') + '/' + fileName);
}

export async function deleteFile(fileName) {
  await FS.removeTree(`${__dirname}/../${fileName}`);
}
