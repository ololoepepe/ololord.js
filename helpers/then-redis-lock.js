var uuid = require("uuid");

var Key = "_thenRedisLocks";
var InternalKey = "_thenRedisInternalLocks";

var InternalLock = function(db, key) {
    this.db = db;
    this.key = key;
    this.id = uuid.v1();
};

InternalLock.prototype.lock = function() {
    var _this = this;
    var f = function() {
        return _this.db.hsetnx(InternalKey, _this.key, _this.id).then(function(status) {
            if (status != 1) {
                return new Promise(function(resolve, reject) {
                    setTimeout(function() {
                        resolve(f());
                    }, 500);
                });
            }
            return Promise.resolve(true);
        });
    };
    return f();
};

InternalLock.prototype.unlock = function() {
        var _this = this;
        var f = function() {
            return _this.db.hget(InternalKey, _this.key).then(function(id) {
                if (!id)
                    return Promise.reject("Unable to find lock");
                if (id != _this.id)
                    return Promise.reject("Lock is not acquired");
                return _this.db.hdel(InternalKey, _this.key);
            }).then(function() {
                return Promise.resolve(true);
            });
        };
        return f();
    };

module.exports = function(db) {
    //NOTE: This is a very rough check
    if (!db || !db.__proto__ || !db.__proto__.constructor || db.__proto__.constructor.name != "Client")
        return null;
    var Lock = function(key, options) {
        this.db = db;
        this.acquired = false;
        this.locking = false;
        this.unlocking = false;
        this.key = key;
        this.id = uuid.v1();
        this.retryDelay = (options && !isNaN(+options.retryDelay) && +options.retryDelay > 0) ? options.retryDelay : 10;
    };
    Lock.drop = function() {
        return db.del(Key).then(function() {
            return db.del(InternalKey);
        });
    };
    Lock.prototype.lock = function() {
        var _this = this;
        if (_this.locking)
            return Promise.reject("Already locking");
        if (_this.acquired)
            return Promise.reject("Lock already acquired");
        _this.locking = true;
        var f = function() {
            var ilock = new InternalLock(_this.db, _this.key);
            return ilock.lock().then(function() {
                return _this.db.hsetnx(Key, _this.key, JSON.stringify({
                    locked: false,
                    queue: [_this.id],
                    current: null
                })).then(function() {
                    return _this.db.hget(Key, _this.key);
                }).then(function(lock) {
                    lock = JSON.parse(lock);
                    if (lock.locked || lock.queue[0] != _this.id) {
                        var p;
                        if (lock.queue.indexOf(_this.id) < 0) {
                            if (lock.queue.indexOf(_this.id) < 0)
                                lock.queue.push(_this.id);
                            p = _this.db.hset(Key, _this.key, JSON.stringify(lock));
                        } else {
                            p = Promise.resolve();
                        }
                        return p.then(function() {
                            return ilock.unlock();
                        }).then(function() {
                            return new Promise(function(resolve, reject) {
                                setTimeout(function() {
                                    resolve(f());
                                }, _this.retryDelay);
                            });
                        });
                    }
                    lock.queue.splice(0, 1);
                    lock.locked = true;
                    lock.current = _this.id;
                    _this.locking = false;
                    _this.acquired = true;
                    return _this.db.hset(Key, _this.key, JSON.stringify(lock)).then(function() {
                        return ilock.unlock();
                    }).then(function() {
                        return Promise.resolve(true);
                    });
                });
            });
        };
        return f();
    };
    Lock.prototype.unlock = function() {
        var _this = this;
        if (_this.locking)
            return Promise.reject("Already locking");
        if (_this.unlocking)
            return Promise.reject("Already unlocking");
        _this.unlocking = true;
        var f = function() {
            var ilock = new InternalLock(_this.db, _this.key);
            return ilock.lock().then(function() {
                return _this.db.hget(Key, _this.key).then(function(lock) {
                    if (!lock)
                        return Promise.reject("Unable to find lock");
                    lock = JSON.parse(lock);
                    if (lock.current != _this.id || !lock.locked)
                        return Promise.reject("Lock is not acquired");
                    lock.locked = false;
                    lock.current = null;
                    _this.unlocking = false;
                    _this.acquired = false;
                    var p;
                    if (lock.queue.length > 0)
                        p = _this.db.hset(Key, _this.key, JSON.stringify(lock));
                    else
                        p = _this.db.hdel(Key, _this.key);
                    return p.then(function() {
                        return ilock.unlock();
                    }).then(function() {
                        return Promise.resolve(true);
                    });
                });
            });
        };
        return f();
    };
    return Lock;
};
