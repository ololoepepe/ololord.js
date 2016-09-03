import config from '../helpers/config';

let users = new Map();
let quota = config('system.onlineCounter.quota');
let interval = config('system.onlineCounter.interval');

setInterval(() => {
  users.forEach((q, ip) => {
    q -= interval;
    if (q > 0) {
      users.set(ip, q);
    } else {
      users.delete(ip);
    }
  });
}, interval);

export function alive(ip) {
  users.set(ip, quota);
}

export function unique() {
  let o = {};
  for (let ip of users.keys()) {
    o[ip] = 1;
  }
  return o;
}

export function clear() {
  users.clear();
}
