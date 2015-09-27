var Q = require("q");

function promisify(nodeAsyncFn, context) {
    return function() {
        var defer = Q.defer();
        var args = Array.prototype.slice.call(arguments);
        args.push(function(err, val) {
            if (err !== null)
                return defer.reject(err);
            return defer.resolve(val);
        });
        nodeAsyncFn.apply(context || {}, args);
        return defer.promise;
    };
};

promisify.proxy = function(data) {
    return promisify(function(data, callback) {
        callback(null, data);
    })(data);
};

promisify.error = function(err) {
    return promisify(function(err, callback) {
        callback(err);
    })(err);
};

module.exports = promisify;
