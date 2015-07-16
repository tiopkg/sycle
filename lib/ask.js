"use strict";

var _ = require('lodash');

module.exports = Ask;


function Request(uri, params, payload) {
    if (!(this instanceof Request)) return new Request(uri, payload);

    this.uri = uri;
    this.params = params || {};
    this.payload = payload || {};
}

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

function Ask(sapp, uri, params, payload) {
    if (!(this instanceof Ask)) return new Ask(sapp, uri, params, payload);
    this.sapp = sapp;
    this.req = new Request(uri, params, payload);
}

Ask.prototype.props =
    Ask.prototype.prop = function (name, value) {
        mergeProps(this.req, name, value);
        return this;
    };

Ask.prototype.params =
    Ask.prototype.param = function (name, value) {
        mergeProps(this.req.params, name, value);
        return this;
    };

Ask.prototype.payload =
    Ask.prototype.body = function (payload) {
        this.req.payload = payload;
        return this;
    };

Ask.prototype.send =
    Ask.prototype.end = function (payload, cb) {
        if (typeof payload === 'function') {
            cb = payload;
            payload = null;
        }
        if (payload && payload.models) throw new Error('Invalid arguments');
        if (payload) this.payload(payload);
        return this.sapp.handle(this.req, function (err, ctx) {
            if (err && !cb) throw err;
            if (err && cb) return cb(err);
            cb && cb(err, ctx.result);
        });
    };

function mergeProps(target, name, value) {
    if (typeof name === 'string') {
        return target[name] = value;
    }
    var source = name || {};
    for (var key in source) {
        if (source.hasOwnProperty(key)) {
            if (key[0] === '_' || key === 'param') continue;
            target[key] = source[key];
        }
    }
}
