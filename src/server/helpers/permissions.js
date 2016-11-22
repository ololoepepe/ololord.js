import _ from 'underscore';

import Board from '../boards/board';
import config from './config';

export const PERMISSIONS = {
  addFilesToPost: 'MODER',
  deleteFile: null,
  deletePost: null,
  editAudioTags: null,
  editFileRating: null,
  editPost: 'MODER',
  moveThread: 'MODER',
  setThreadClosed: 'MODER',
  setThreadFixed: 'MODER',
  setThreadUnbumpable: 'MODER',
  useRawHTMLMarkup: 'MODER'
};

_(PERMISSIONS).each((defaultLevel, key) => {
  module.exports[key] = (board) => {
    if (typeof board === 'string') {
      board = Board.board(board);
    }
    if (!board) {
      return config(`permissions.${key}`, defaultLevel);
    }
    return config(`board.${board.name}.permissions.${key}`, config(`permissions.${key}`, defaultLevel));
  };
});
