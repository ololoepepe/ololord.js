var UUID = require("uuid");

var Tools = require("./tools");

var tasks = {};
var handlers = {};

var handleMessage = function(cluster, message, pid) {
    var task = tasks[message.id];
    if (task) {
        delete tasks[message.id];
        if (!message.error)
            task.resolve(message.data);
        else
            task.reject(message.error);
    } else {
        var handler = handlers[message.type];
        var proc = pid ? cluster.workers[pid] : process;
        if (!handler) {
            if (!proc)
                return;
            proc.send({
                id: message.id,
                type: message.type,
                error: "Method not found: " + message.type
            });
        }
        var p = handler(message.data);
        if (!p || !p.then)
            p = Promise.resolve(p);
        p.then(function(data) {
            if (!proc)
                return;
            proc.send({
                id: message.id,
                type: message.type,
                data: data || null
            });
        }).catch(function(err) {
            if (!proc)
                return;
            proc.send({
                id: message.id,
                type: message.type,
                error: err
            });
        });
    }
};

var sendMessage = function(proc, type, data, nowait) {
    return new Promise(function(resolve, reject) {
        var id = UUID.v1();
        tasks[id] = {
            resolve: resolve,
            reject: reject
        };
        proc.send({
            id: id,
            type: type,
            data: data || null
        }, function(err) {
            if (err) {
                delete tasks[id];
                reject(err);
            }
            if (nowait) {
                delete tasks[id];
                resolve();
            }
        });
    });
};

module.exports = function(cluster) {
    var ipc = {};
    if (cluster.isMaster) {
        cluster.on("online", function(worker) {
            worker.process.on("message", function(message) {
                handleMessage(cluster, message, worker.id);
            });
        });
    } else {
        process.on("message", function(message) {
            handleMessage(cluster, message);
        });
    }
    ipc.send = function(type, data, nowait, workerId) {
        if (cluster.isMaster) {
            if (workerId) {
                var worker = cluster.workers[workerId];
                if (!worker)
                    return Promise.reject(Tools.translate("Invalid worker ID"));
                return sendMessage(worker.process, type, data, nowait);
            } else {
                var promises = Tools.mapIn(cluster.workers, function(worker) {
                    return sendMessage(worker.process, type, data, nowait);
                });
                return Promise.all(promises);
            }
        } else {
            return sendMessage(process, type, data, nowait);
        }
    };
    ipc.installHandler = function(type, handler) {
        handlers[type] = handler;
    };
    return ipc;
};
