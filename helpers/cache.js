var cache = {};

var get = function(key, def) {
    return cache.hasOwnProperty(key) ? cache[key].data : def;
};

var set = function(key, value, group) {
    var prev = get(key);
    cache[key] = {
        "data": value,
        "group": ((typeof group != "undefined") ? group : "*")
    };
    return prev;
};

module.exports = {
    "set": set,
    "get": get
};
