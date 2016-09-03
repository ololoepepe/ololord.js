import * as OnlineCounter from '../helpers/online-counter';

export default function(req, res, next) {
  OnlineCounter.alive(req.ip);
  next();
};
