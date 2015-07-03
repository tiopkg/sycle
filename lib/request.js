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
    var body = this.body || {};
    var query = this.query || {};
    var params = this.params || {};

    if (null != params[name] && params.hasOwnProperty(name)) return params[name];
    if (null != body[name]) return body[name];
    if (null != query[name]) return query[name];
    if (null != payload[name]) return payload[name];

    return defaultValue;
};
