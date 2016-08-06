import express from 'express';

import * as MiscModel from '../models/misc';

let router = express.Router();

router.get('/misc/base.json', (req, res) => {
  res.json(MiscModel.base());
});

router.get('/misc/boards.json', (req, res) => {
  res.json(MiscModel.boards());
});

router.get('/misc/board/:board.json', (req, res) => {
  res.json(MiscModel.board(req.params.board));
});

router.get('/misc/tr.json', (req, res) => {
  res.json(MiscModel.translations());
});

module.exports = router;
