import * as Tools from '../helpers/tools';

export default function(req, res, next) {
  req.hashpass = Tools.hashpass(req);
  next();
}
