import _ from 'underscore';
import Canvas from 'canvas';
import ChildProcess from 'child_process';
import du from 'du';
import FS from 'q-io/fs';
import FSSync from 'fs';
import gm from 'gm';
import HTTP from 'q-io/http';
import Jdenticon from 'jdenticon';
import merge from 'merge';
import mkpathSync from 'mkpath';
import Multiparty from 'multiparty';
import Path from 'path';
import promisify from 'promisify-node';
import UUID from 'uuid';

import * as FilesModel from '../models/files';
import config from '../helpers/config';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';
import vk from '../helpers/vk';

const mkpath = promisify('mkpath');

const FILE_RATINGS = new Set(['SFW', 'R-15', 'R-18', 'R-18G']);

mkpathSync.sync(config('system.tmpPath') + '/form');

let fileTypePlugins = Tools.loadPlugins([`${__dirname}/../file-types`, `${__dirname}/../file-types/custom`]);

function setFileRating(file, id, fields) {
  let rating = fields[`file_${id}_rating`];
  if (FILE_RATINGS.has(rating)) {
    file.rating = rating;
  } else {
    file.rating = 'SFW';
  }
}

async function downloadFile(url, formFieldName, fields) {
  let path = `${__dirname}/../../tmp/upload_${UUID.v4()}`;
  let proxy = config.proxy();
  let options = { timeout: config('system.httpRequestTimeout') };
  if (/^vk\:\/\//.test(url)) {
    let result = await vk('audio.getById', { audios: url.split('/')[2] });
    options.url = result[0].url;
  } else if (proxy) {
    options = merge.recursive(options, {
      host: proxy.host,
      port: proxy.port,
      headers: { 'Proxy-Authorization': proxy.auth },
      path: url,
    });
  } else {
    options.url = url;
  }
  let response = await HTTP.request(options);
  if (200 !== response.status) {
    throw new Error(Tools.translate('Failed to download file'));
  }
  let data = await response.body.read();
  if (data.length < 1) {
    throw new Error(Tools.translate('File is empty'));
  }
  await writeFile(path, data);
  let file = {
    name: url.split('/').pop(),
    size: data.length,
    path: path
  };
  setFileRating(file, formFieldName.substr(9), fields);
  let mimeType = await getMimeType(path);
  file.mimeType = mimeType;
  return file;
}

export async function getFiles(fields, files) {
  files = await Tools.series(files.filter((file) => {
    if (file.size < 1) {
      FS.remove(file.path).catch((err) => { Logger.error(req, err.stack || err); });
      return false;
    }
    return true;
  }), async function(file) {
    setFileRating(file, file.fieldName.substr(5), fields);
    let mimeType = await getMimeType(file.path);
    file.mimeType = mimeType;
    return file;
  }, true);
  let downloadedFiles = await Tools.series(_(fields).pick((_1, key) => {
    return /^file_url_\S+$/.test(key);
  }), async function(url, formFieldName) {
    return await downloadFile(url, formFieldName, fields);
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
        throw new Error(Tools.translate('Failed to copy file'));
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
  let canonicalSuffix = suffix ? suffix.toLowerCase() : '';
  if (!suffix || !plugin.suffixMatchesMimeType(canonicalSuffix, file.mimeType)) {
    suffix = plugin.defaultSuffixForMimeType(file.mimeType);
  }
  let thumbSuffix = suffix;
  if (typeof plugin.thumbnailSuffixForMimeType === 'function') {
    thumbSuffix = plugin.thumbnailSuffixForMimeType(file.mimeType) || canonicalSuffix;
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
  return _(fileTypePlugins).find(plugin => plugin.match(mimeType));
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
      let err = new Error(Tools.translate('Unsupported file type: $[1]', '', fileInfo.mimeType));
      Logger.error(err.stack || err);
      return;
    }
    if (typeof plugin.renderPostFileInfo !== 'function') {
      return;
    }
    await plugin.renderPostFileInfo(fileInfo);
  });
}

export function parseForm(req = {}) {
  let { formFields, formFiles } = req;
  if (formFields) {
    return {
      fields: formFields,
      files: formFiles || []
    };
  }
  let form = new Multiparty.Form();
  form.uploadDir = config('system.tmpPath') + '/form';
  form.autoFields = true;
  form.autoFiles = true;
  form.maxFieldsSize = config('system.maxFormFieldsSize');
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err);
      }
      resolve({
        fields: _(fields).mapObject((value, key) => { return (1 === value.length) ? value[0] : value; }),
        files: _(_(files).toArray()).flatten().map((file) => {
          file.name = file.originalFilename;
          return file;
        })
      });
    });
  });
}

async function processFile(boardName, file, transaction) {
  let plugin = selectThumbnailingPlugin(file.mimeType);
  if (!plugin) {
    throw new Error(Tools.translate('Unsupported file type: $[1]', '', file.mimeType));
  }
  let fn = await generateFileName(file, plugin);
  let targetFilePath = `${__dirname}/../../public/${boardName}/src/${fn.name}`;
  let targetThumbPath = `${__dirname}/../../public/${boardName}/thumb/${fn.thumbName}`;
  transaction.addFile(targetFilePath);
  transaction.addFile(targetThumbPath);
  if (file.copy) {
    let sourceFilePath = `${__dirname}/../../public/${file.boardName}/src/${file.name}`;
    let sourceThumbPath = `${__dirname}/../../public/${file.boardName}/thumb/${file.thumbName}`;
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
  let path = `${__dirname}/../../public/${boardName}`;
  await mkpath(`${path}/src`);
  await mkpath(`${path}/thumb`);
  return await Tools.series(files, (file) => {
    return processFile(boardName, file, transaction);
  }, true);
}

export async function diskUsage(path) {
  return await new Promise((resolve, reject) => {
    du(path, (err, size) => {
      if (err) {
        return reject(err);
      }
      resolve(size);
    });
  });
}

export async function writeFile(filePath, data) {
  let tmpFilePath = `${filePath}.tmp`;
  let path = filePath.split('/').slice(0, -1).join('/');
  let exists = await FS.exists(path);
  if (!exists) {
    await FS.makeTree(path);
  }
  await FS.write(tmpFilePath, data);
  await FS.rename(tmpFilePath, filePath);
}

export async function createFile(dir, fileName, { file, isDir } = {}) {
  if (dir.slice(-1)[0] !== '/') {
    dir += '/';
  }
  let path = `${__dirname}/../../${dir}${fileName}`;
  if (isDir) {
    await FS.makeDirectory(path);
  }
  if (file) {
    await FS.move(file.path, path);
  } else {
    await writeFile(path, '');
  }
}

export async function editFile(fileName, content) {
  await writeFile(`${__dirname}/../../${fileName}`, content);
}

export async function renameFile(oldFileName, fileName) {
  let oldPath = `${__dirname}/../../${oldFileName}`;
  await FS.rename(oldPath, oldPath.split('/').slice(0, -1).join('/') + '/' + fileName);
}

export async function deleteFile(fileName) {
  await FS.removeTree(`${__dirname}/../../${fileName}`);
}

export async function generateRandomImage(hash, mimeType, thumbPath) {
  let canvas = new Canvas(200, 200);
  let ctx = canvas.getContext('2d');
  Jdenticon.drawIcon(ctx, hash, 200);
  let data = await FS.read(`${__dirname}/../../misc/thumbs/${mimeType}.png`, 'b');
  let img = new Canvas.Image();
  img.src = data;
  ctx.drawImage(img, 0, 0, 200, 200);
  return await new Promise((resolve, reject) => {
    canvas.pngStream().pipe(FSSync.createWriteStream(thumbPath).on('error', reject).on('finish', resolve));
  });
}

export async function getMimeType(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return null;
  }
  try {
    return await new Promise((resolve, reject) => {
      ChildProcess.exec(`file --brief --mime-type ${fileName}`, {
        timeout: config('system.mimeTypeRetrievingTimeout'),
        encoding: 'utf8',
        stdio: [0, 'pipe', null]
      }, (err, out) => {
        if (err) {
          return reject(err);
        }
        resolve(out ? out.replace(/\r*\n+/g, '') : null);
      });
    });
  } catch (err) {
    Logger.error(err.stack || err);
    return null;
  }
}

export function isAudioType(mimeType) {
  return 'application/ogg' === mimeType || /^audio\//.test(mimeType);
}

export function isVideoType(mimeType) {
  return /^video\//.test(mimeType);
}

export function isPdfType(mimeType) {
  return 'application/pdf' === mimeType;
}

export function isImageType(mimeType) {
  return /^image\//.test(mimeType);
}

export async function getImageSize(fileName) {
  return new Promise((resolve, reject) => {
    gm(fileName).size((err, value) => {
      if (err) {
        return reject(err);
      }
      resolve(value);
    });
  });
}

export async function resizeImage(fileName, width, height, options) {
  return new Promise((resolve, reject) => {
    gm(fileName).resize(width, height, options).quality(100).write(fileName, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}
