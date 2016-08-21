import _ from 'underscore';
import promisify from 'promisify-node';

import config from '../helpers/config';
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

defineMimeTypeSuffixes('image/gif', 'gif');
defineMimeTypeSuffixes('image/jpeg', ['jpeg', 'jpg']);
defineMimeTypeSuffixes('image/png', 'png');

export function match(mimeType) {
  return Tools.isImageType(mimeType);
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
  let suffix = ('image/gif' === file.mimeType) ? '[0]' : '';
  let info = await ImageMagick.identify(file.path + suffix);
  let args = [file.path + suffix];
  if (info.width > 200 || info.height > 200) {
    args.push('-resize', '200x200');
  }
  let prefix = ('image/gif' === file.mimeType) ? 'png:' : '';
  args.push(prefix + thumbPath);
  await ImageMagick.convert(args);
  let thumbInfo = await ImageMagick.identify(thumbPath);
  let result = {
    dimensions: {
      width: info.width,
      height: info.height
    },
    thumbDimensions: {
      thumbInfo: info.width,
      thumbInfo: info.height
    }
  };
  if (config('system.phash.enabled')) {
    let phash = await Tools.generateImageHash(thumbPath);
    result.ihash = phash;
  }
  return result;
}

export async function rerenderPostFileInfo(fileInfo) {
  if (fileInfo.dimensions) {
    fileInfo.sizeText += `, ${fileInfo.dimensions.width}x${fileInfo.dimensions.height}`;
  }
  return fileInfo;
}
