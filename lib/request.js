"use strict";

var _ = require('lodash');

module.exports = Request;

function Request(uri, params, payload) {
    if (!(this instanceof Request)) return new Request(uri, payload);

    this.uri = uri;
    this.params = params || {};
    this.payload = payload || {};
}

Request.create = function (uri, params, payload) {
    return new Request(uri, params, payload);
};

Request.prototype.param = function (name, defaultValue) {
    var payload = this.payload || {};
    var query = this.query || {};
    var params = this.params || {};
    if (undefined != params[name]) return params[name];
    if (undefined != query[name]) return query[name];
    if (undefined != payload[name]) return payload[name];
    return defaultValue;
};
