"use strict";

var Request = require('./request');

module.exports = Rekuest;

function Rekuest(sapp, uri, params, payload) {
    if (!(this instanceof Rekuest)) return new Rekuest(sapp, uri, params, payload);
    this.sapp = sapp;
    this.req = new Request(uri, params, payload);
}

Rekuest.prototype.props =
    Rekuest.prototype.prop = function (name, value) {
        assign(this.req, name, value);
        return this;
    };

Rekuest.prototype.params =
    Rekuest.prototype.param = function (name, value) {
        assign(this.req.params, name, value);
        return this;
    };

Rekuest.prototype.payload =
    Rekuest.prototype.body = function (payload) {
        this.req.payload = payload;
        return this;
    };

Rekuest.prototype.send =
    Rekuest.prototype.end = function (payload, cb) {
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

function assign(target, name, value) {
    if (typeof name === 'string') {
        return target[name] = value;
    }
    var source = name || {};
    for (var i in source) {
        if (i[0] === '_') continue;
        target[i] = source[i];
    }
}