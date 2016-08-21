import promisify from 'promisify-node';

import * as Files from '../helpers/files';
import * as Tools from '../helpers/tools';

const ImageMagick = promisify('imagemagick');

export function match(mimeType) {
  return Files.isPdfType(mimeType);
}

export function suffixMatchesMimeType(suffix, mimeType) {
  return 'pdf' === suffix && 'application/pdf' === mimeType;
}

export function defaultSuffixForMimeType(mimeType) {
  return ('application/pdf' === mimeType) ? 'pdf' : null;
}

export function thumbnailSuffixForMimeType(mimeType) {
  return ('application/pdf' === mimeType) ? 'png' : null;
}

export async function createThumbnail(file, thumbPath, path) {
  await ImageMagick.convert([
    '-density',
    '300',
    `${path}[0]`,
    '-quality',
    '100',
    '+adjoin',
    '-resize',
    '200x200',
    `png:${thumbPath}`
  ]);
  let info = await ImageMagick.identify(thumbPath);
  return {
    thumbDimensions: {
      width: info.width,
      height: info.height
    }
  };
}
