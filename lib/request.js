"use strict";

var _ = require('lodash');

module.exports = Agent;


function Req(uri, params, payload) {
    if (!(this instanceof Req)) return new Req(uri, payload);

    this.uri = uri;
    this.params = params || {};
    this.payload = payload || {};
}

Req.prototype.param = function (name, defaultValue) {
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

function Agent(sapp, uri, params, payload) {
    if (!(this instanceof Agent)) return new Agent(sapp, uri, params, payload);
    this.sapp = sapp;
    this.req = new Req(uri, params, payload);
}

Agent.prototype.props =
    Agent.prototype.prop = function (name, value) {
        mergeProps(this.req, name, value);
        return this;
    };

Agent.prototype.params =
    Agent.prototype.param = function (name, value) {
        mergeProps(this.req.params, name, value);
        return this;
    };

Agent.prototype.payload =
    Agent.prototype.body = function (payload) {
        this.req.payload = payload;
        return this;
    };

Agent.prototype.send =
    Agent.prototype.end = function (payload, cb) {
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
