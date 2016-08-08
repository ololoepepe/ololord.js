var FSSync = require("fs");
var HTTP = require("q-io/http");
var Util = require("util");

var Tools = require("../helpers/tools");

module.exports = function(accessToken) {
    return function(method, params) {
        if (!method)
            return Promise.reject(new Error(Tools.translate("Invalid method")));
        var extra = "";
        if (params) {
            Tools.forIn(params, function(value, key) {
                if (!Util.isArray(value))
                    value = [value];
                extra = `${key}=${value}&`;
            });
        }
        var url = `https://api.vk.com/method/${method}?${extra}access_token=${accessToken}`;
        return HTTP.request({
            url: url,
            method: "POST",
            timeout: Tools.Minute
        }).then(function(response) {
            if (response.status != 200)
                return Promise.reject(new Error(Tools.translate("Failed to call method")));
            return response.body.read();
        }).then(function(data) {
            try {
                return Promise.resolve(JSON.parse(data.toString()));
            } catch (err) {
                return Promise.reject(err);
            }
        });
    };
};
