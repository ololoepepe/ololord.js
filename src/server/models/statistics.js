import _ from 'underscore';
import Cluster from 'cluster';
import FS from 'q-io/fs';

import * as BoardsModel from './boards';
import * as UsersModel from './users';
import Board from '../boards/board';
import * as Files from '../core/files';
import * as Cache from '../helpers/cache';
import * as IPC from '../helpers/ipc';
import Logger from '../helpers/logger';
import * as Tools from '../helpers/tools';

async function gatherBoardStatistics(board) {
  const BOARD_PUBLIC_PATH = `${__dirname}/../public/${board.name}`;
  let statistics = { diskUsage: 0 };
  try {
    let lastPostNumber = await BoardsModel.getLastPostNumber(board.name);
    statistics.postCount = lastPostNumber;
    statistics.postingSpeed = Tools.postingSpeedString(board.launchDate, lastPostNumber);
  } catch (err) {
    Logger.error(err.stack || err);
  }
  try {
    let fileNames = await FS.list(`${BOARD_PUBLIC_PATH}/src`);
    statistics.fileCount = fileNames.length;
  } catch (err) {
    if ('ENOENT' !== err.code) {
      Logger.error(err.stack || err);
    }
  }
  await Tools.series(['src', 'thumb', 'arch'], async function(subpath) {
    try {
      let size = await Files.diskUsage(`${BOARD_PUBLIC_PATH}/${subpath}`);
      statistics.diskUsage += size;
    } catch (err) {
      if ('ENOENT' !== err.code) {
        Logger.error(err.stack || err);
      }
    }
  });
  return statistics;
}

//Must be called from the master process only.
export async function generateStatistics() {
  if (!Cluster.isMaster) {
    Logger.error(Tools.translate('Error: generateStatistics() called from worker process.'));
    return;
  }
  console.log(Tools.translate('Generating statistics…'));
  let statistics = {
    boards: [],
    total: {
      postCount: 0,
      fileCount: 0,
      diskUsage: 0
    }
  };
  let launchDate = _.now();
  try {
    let keys = await UsersModel.getUserPostNumbers();
    let uniqueUsers = Board.boardNames().reduce((acc, boardName) => {
      acc[boardName] = 0;
      return acc;
    }, {});
    statistics.total.uniqueIPCount = keys.map((key) => {
      return {
        ip: key.split(':').slice(1, -1).join(':'),
        boardName: key.split(':').pop()
      };
    }).filter(userPostInfo => uniqueUsers.hasOwnProperty(userPostInfo.boardName)).reduce((acc, userPostInfo) => {
      ++uniqueUsers[userPostInfo.boardName];
      acc.add(userPostInfo.ip);
      return acc;
    }, new Set()).size;
    await Tools.series(Board.boardNames(), async function(boardName) {
      let board = Board.board(boardName);
      if (!board) {
        return;
      }
      let boardLaunchDate = board.launchDate.valueOf();
      if (boardLaunchDate < statistics.launchDate) {
        launchDate = boardLaunchDate;
      }
      let boardStatistics = await gatherBoardStatistics(board);
      boardStatistics.name = board.name;
      boardStatistics.title = board.title;
      boardStatistics.hidden = board.hidden;
      boardStatistics.uniqueIPCount = uniqueUsers[board.name];
      statistics.total.postCount += boardStatistics.postCount;
      statistics.total.fileCount += boardStatistics.fileCount;
      statistics.total.diskUsage += boardStatistics.diskUsage;
      statistics.boards.push(boardStatistics);
    });
    statistics.total.postingSpeed = Tools.postingSpeedString(launchDate, statistics.total.postCount);
    let data = await IPC.send('getConnectionIPs');
    statistics.online = data.reduce((acc, ips) => {
      _(ips).each((_1, ip) => { acc.add(ip); });
      return acc;
    }, new Set()).size;
    statistics.uptime = process.uptime();
    await Cache.writeFile('misc/statistics.json', JSON.stringify(statistics));
  } catch (err) {
    Logger.error(err.stack || err);
  }
}
