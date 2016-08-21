import _ from 'underscore';
import ffmpeg from 'fluent-ffmpeg';
import FS from 'q-io/fs';
import FSSync from 'fs';
import promisify from 'promisify-node';

import * as Files from '../helpers/files';
import * as Tools from '../helpers/tools';

const ImageMagick = promisify('imagemagick');
const musicMetadata = promisify('musicmetadata');

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

defineMimeTypeSuffixes('application/ogg', 'ogg', 'png');
defineMimeTypeSuffixes('audio/mpeg', ['mpeg', 'mp1', 'm1a', 'mp3', 'm2a', 'mpa', 'mpg'], 'png');
defineMimeTypeSuffixes('audio/ogg', 'ogg', 'png');
defineMimeTypeSuffixes('audio/wav', 'wav', 'png');

export const AUDIO_TAGS = ['album', 'artist', 'title', 'year'];

export function match(mimeType) {
  return Files.isAudioType(mimeType);
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
  let duration = metadata.format.duration;
  let bitrate = +metadata.format.bit_rate;
  let extraData = {
    duration: (+duration ? durationToString(duration) : duration),
    bitrate: (bitrate ? Math.floor(bitrate / 1024) : 0)
  };
  try {
    metadata = await musicMetadata(FSSync.createReadStream(path));
  } catch (err) {
    Logger.error(err.stack || err);
    metadata = {};
  }
  extraData.album = metadata.album || '';
  extraData.artist = (metadata.artist && metadata.artist.length > 0) ? metadata.artist[0] : '';
  extraData.title = metadata.title || '';
  extraData.year = metadata.year || '';
  if (metadata.picture && metadata.picture.length > 0) {
    await FS.write(thumbPath, metadata.picture[0].data);
  } else {
    await Files.generateRandomImage(file.hash, file.mimeType, thumbPath);
  }
  let thumbInfo = await ImageMagick.identify(thumbPath);
  if (thumbInfo.width > 200 && thumbInfo.height > 200) {
    await ImageMagick.convert([
      thumbPath,
      '-resize',
      '200x200',
      thumbPath
    ]);
    await ImageMagick.identify(thumbPath);
  }
  return {
    extraData: extraData,
    thumbDimensions: {
      width: thumbInfo.width,
      height: thumbInfo.height
    }
  };
}

export async function rerenderPostFileInfo(fileInfo) {
  let { duration, bitrate, album, artist, title, year } = fileInfo.extraData || {};
  if (duration) {
    fileInfo.sizeText += `, ${duration}`;
  }
  if (bitrate) {
    fileInfo.sizeText += `, ${bitrate} ${Tools.translate('kbps')}`;
  }
  fileInfo.sizeTooltip = artist ? artist : Tools.translate('Unknown artist');
  fileInfo.sizeTooltip += ' - ';
  fileInfo.sizeTooltip += title ? title : Tools.translate('Unknown title');
  fileInfo.sizeTooltip += ' [';
  fileInfo.sizeTooltip += album ? album : Tools.translate('Unknown album');
  fileInfo.sizeTooltip += ']';
  if (year) {
    fileInfo.sizeTooltip += ` (${year})`;
  }
}
