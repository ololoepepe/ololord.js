import _ from 'underscore';
import ffmpeg from 'fluent-ffmpeg';
import promisify from 'promisify-node';

import * as Files from '../helpers/files';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

const ImageMagick = promisify('imagemagick');

const MIME_TYPES_FOR_SUFFIXES = new Map();
const DEFAULT_SUFFIXES_FOR_MIME_TYPES = new Map();
const THUMB_SUFFIXES_FOR_MIME_TYPE = new Map();

function defineMimeTypeSuffixes(mimeType, extensions, thumbSuffix) {
  if (!_(extensions).isArray()) {
    extensions = [extensions];
  }
  extensions.forEach((extension) => { MIME_TYPES_FOR_SUFFIXES.set(extension, mimeType); });
  DEFAULT_SUFFIXES_FOR_MIME_TYPES.set(mimeType, extensions[0]);
  THUMB_SUFFIXES_FOR_MIME_TYPE.set(mimeType, thumbSuffix);
}

defineMimeTypeSuffixes('video/mp4', 'mp4', 'png');
defineMimeTypeSuffixes('video/webm', 'webm', 'png');

export function match(mimeType) {
  return Files.isVideoType(mimeType);
}

export function suffixMatchesMimeType(suffix, mimeType) {
  return MIME_TYPES_FOR_SUFFIXES.get(suffix) === mimeType;
}

export function defaultSuffixForMimeType(mimeType) {
  return DEFAULT_SUFFIXES_FOR_MIME_TYPES.get(mimeType) || null;
}

export function thumbnailSuffixForMimeType(mimeType) {
  return THUMB_SUFFIXES_FOR_MIME_TYPE.get(mimeType);
}

export async function createThumbnail(file, thumbPath, path) {
  let metadata = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(path, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      resolve(metadata);
    });
  });
  let width = Tools.option(metadata.streams[0].width, 'number', 0, { test: (w) => { return w > 0; } });
  let height = Tools.option(metadata.streams[0].height, 'number', 0, { test: (h) => { return h > 0; } });
  let result = {};
  if (width && height) {
    result.dimensions = {
      width: width,
      height: height
    };
  }
  let duration = metadata.format.duration;
  let bitrate = +metadata.format.bit_rate;
  let extraData = {
    duration: (+duration ? durationToString(duration) : duration),
    bitrate: (bitrate ? Math.floor(bitrate / 1024) : 0)
  };
  try {
    let pngThumbPath = filePath + '.png';
    await new Promise((resolve, reject) => {
      ffmpeg(path).frames(1).on('error', reject).on('end', resolve).save(pngThumbPath);
    });
    file.thumbPath = pngThumbPath;
  } catch (err) {
    Logger.error(err.stack || err);
  }
  if (thumbPath === file.thumbPath) {
    await Files.generateRandomImage(file.hash, file.mimeType, thumbPath);
    result.dimensions = result.dimensions || {
      width: 200,
      height: 200
    };
  } else {
    if (!result.dimensions) {
      let thumbInfo = await ImageMagick.identify(thumbPath);
      result.dimensions = {
        width: thumbInfo.width,
        height: thumbInfo.height
      };
    }
    if (result.dimensions.width > 200 || result.dimensions.height > 200) {
      await ImageMagick.convert([
        thumbPath,
        '-resize',
        '200x200',
        thumbPath
      ]);
      let thumbInfo = await ImageMagick.identify(thumbPath);
      result.dimensions = {
        width: thumbInfo.width,
        height: thumbInfo.height
      };
    }
  }
  return result;
}

export async function rerenderPostFileInfo(fileInfo) {
  if (fileInfo.dimensions) {
    fileInfo.sizeText += `, ${fileInfo.dimensions.width}x${fileInfo.dimensions.height}`;
  }
  let { duration, bitrate } = fileInfo.extraData || {};
  if (duration) {
    fileInfo.sizeText += `, ${duration}`;
  }
  if (bitrate) {
    fileInfo.sizeTooltip = `${bitrate} ${Tools.translate('kbps')}`;
  }
}
