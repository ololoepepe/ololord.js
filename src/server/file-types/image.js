import _ from 'underscore';
import gm from 'gm';
import phash from 'phash-image';

import * as Files from '../core/files';
import config from '../helpers/config';
import * as Tools from '../helpers/tools';

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

defineMimeTypeSuffixes('image/gif', 'gif', 'png');
defineMimeTypeSuffixes('image/jpeg', ['jpeg', 'jpg']);
defineMimeTypeSuffixes('image/png', 'png');

export function match(mimeType) {
  return Files.isImageType(mimeType);
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

export async function createThumbnail(file, thumbPath) {
  let isGIF = ('image/gif' === file.mimeType);
  let suffix = isGIF ? '[0]' : '';
  let info = await Files.getImageSize(file.path + suffix);
  await new Promise((resolve, reject) => {
    let stream = gm(file.path + suffix);
    if (isGIF) {
      stream = stream.setFormat('png');
    }
    stream.resize(200, 200).quality(100).write(thumbPath, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
  let thumbInfo = await Files.getImageSize(thumbPath);
  if (!thumbInfo) {
    throw new Error(Tools.translate('Failed to identify image file: $[1]', '', thumbPath));
  }
  let result = {
    dimensions: {
      width: info.width,
      height: info.height
    },
    thumbDimensions: {
      width: thumbInfo.width,
      height: thumbInfo.height
    }
  };
  if (config('system.phash.enabled')) {
    let hash = await phash(thumbPath, true);
    result.ihash = hash.toString();
  }
  return result;
}

export async function renderPostFileInfo(fileInfo) {
  if (fileInfo.dimensions) {
    fileInfo.sizeText += `, ${fileInfo.dimensions.width}x${fileInfo.dimensions.height}`;
  }
  return fileInfo;
}
