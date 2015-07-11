"use strict";

var delegate = require('delegates');
var Dynamic = require('./dynamic');

module.exports = RemoteContext;

function RemoteContext(context, method) {
    if (!(this instanceof RemoteContext)) return new RemoteContext(context, method);
    this._context = context;
    this.method = method;
}

RemoteContext.prototype.invoke = function (scope, method, cb) {
    var args = this.buildArgs(method);
    method.invoke(scope, args, cb);
};

RemoteContext.prototype.buildArgs = function (method, ctx) {
    ctx = ctx || this._context;
    var accepts = method.accepts;

    var args = {};
    for (var i = 0; i < accepts.length; i++) {
        var accept = accepts[i];
        var source = accept.source;
        var name = accept.name || accept.arg;
        var val;

        if (source) {
            switch (typeof source) {
                case 'function':
                    val = source(ctx);
                    break;
                case 'string':
                    switch (source) {
                        case 'body':
                        case 'payload':
                            val = ctx.payload;
                            break;
                        case 'd':
                        case 'deferred':
                            val = ctx.deferred;
                            break;
                        case 'req':
                        case 'request':
                            val = ctx.request;
                            break;
                        case 'ctx':
                        case 'context':
                            val = ctx;
                            break;
                    }
                    break;
            }
        } else {
            val = this.arg(name);
        }

        // cast booleans and numbers
        var dynamic;
        var type = accept.type && accept.type.toLowerCase();

        if (Dynamic.canConvert(type)) {
            dynamic = new Dynamic(val, ctx);
            val = dynamic.to(type);
        }

        // set the argument value
        args[name] = val;
    }

    return args;
};

RemoteContext.prototype.arg = function (name) {
    var req = this._context.request;
    var args = req.param('args');

    if (args) {
        args = JSON.parse(args);
    }

    if (typeof args !== 'object' || !args) {
        args = {};
    }

    var arg = (args && args[name]) || req.param(name);
    // search these in order by name
    // req.params
    // req.body
    // req.query


    // coerce simple types in objects
    if (typeof arg === 'object') {
        arg = coerceAll(arg);
    }

    return arg;
};

delegate(RemoteContext.prototype, '_context')
    .access('result')
    .getter('req')
    .getter('request');

/**
 * Integer test regexp.
 */

var isint = /^[0-9]+$/;

/**
 * Float test regexp.
 */

var isfloat = /^([0-9]+)?\.[0-9]+$/;

function toFloat(str, defaultVal) {
    var val = parseFloat(str);
    return isNaN(val) ? defaultVal : val;
}

function toInt(str, defaultVal) {
    var val = parseInt(str);
    return isNaN(val) ? defaultVal : val;
}

function coerce(str) {
    if(typeof str != 'string') return str;
    if ('null' == str) return null;
    if ('true' == str) return true;
    if ('false' == str) return false;
    if (isfloat.test(str)) return toFloat(str, 10);
    if (isint.test(str)) return toInt(str, 10);
    return str;
}

// coerce every string in the given object / array
function coerceAll(obj) {
    var type = Array.isArray(obj) ? 'array' : typeof obj;

    switch(type) {
        case 'string':
            return coerce(obj);
            break;
        case 'object':
            if(obj) {
                Object.keys(obj).forEach(function (key) {
                    obj[key] = coerceAll(obj[key]);
                });
            }
            break;
        case 'array':
            obj.map(function (o) {
                return coerceAll(o);
            });
            break;
    }

    return obj;
}
