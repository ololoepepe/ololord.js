import * as Tools from '../helpers/tools';

export default function(req, res, next) {
  let { hashpass } = req.cookies || {};
  if (Tools.mayBeHashpass(hashpass)) {
    req.hashpass = hashpass;
  }
  next();
}
