import FS from 'q-io/fs';

import * as Files from '../core/files';

const ROOT_PATH = `${__dirname}/../../public`;

export async function readFile(fileName) {
  return await FS.read(`${ROOT_PATH}/${fileName}`);
}

export async function writeFile(fileName, data) {
  return await Files.writeFile(`${ROOT_PATH}/${fileName}`, data);
}

export async function removeFile(fileName) {
  return await FS.remove(`${ROOT_PATH}/${fileName}`);
}
