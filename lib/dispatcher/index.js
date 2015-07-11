"use strict";

var middist = require('middist');
var Router = require('routes');
var RemoteContext = require('./remote-context');

module.exports = Dispatcher;

function Dispatcher(remotes) {
    this.remotes = remotes;
}

Dispatcher.prototype.middleware = function() {
    var self = this;
    var middleware = this.__middleware;
    if (!middleware) {
        middleware = middist();
        middleware.use(function dispatcher(ctx, next) {
            return self._dispatch(ctx, next);
        });
        middleware.use(uriNotFoundHandler());
        this.__middleware = middleware;
    }
    return middleware;
};

Dispatcher.prototype._dispatch = function (ctx, next) {
    var uri = ctx.request.uri;
    if (!uri) return next();

    if (typeof uri === 'string') {
        if (!this.router) this.router = buildRouter(this.remotes);
        var match = this.router.match(ctx.request.uri);
        if (!match) return next();
        match.fn(ctx, done);
    } else if (uri.sharedClass) {
        invokeMethod(this.remotes, ctx, ctx.request.uri, done);
    } else {
        next(new Error('Invalid request for ' + uri));
    }

    function done(err) {
        if (err) return next(err);
        ctx.end();
    }
};

function buildRouter(remotes) {
    var router = new Router();
    var classes = remotes.classes();
    var paths, handler, i;

    classes.forEach(function (sc) {
        var methods = sc.methods();
        methods.forEach(function (method) {
            paths = buildPaths(method);
            handler = method.isStatic ? createStaticMethodHandler(remotes, method) : createPrototypeMethodHandler(remotes, method);
            for (i = 0; i < paths.length; i++) {
                router.addRoute(paths[i], handler);
            }
        });
    });

    return router;
}

function createStaticMethodHandler(remotes, method) {
    return function (ctx, cb) {
        invokeMethod(remotes, ctx, method, cb);
    }
}

function createPrototypeMethodHandler(remotes, method) {
    return function (ctx, cb) {
        cb(new Error('Prototype method is unsupported yet!'));
    }
}

function invokeMethod(remotes, ctx, method, cb) {
    if (!(ctx instanceof RemoteContext)) {
        ctx = new RemoteContext(ctx, method);
    }
    remotes.invokeMethodInContext(ctx, method, cb);
}

function buildPaths(method) {
    var paths = [], sc = method.sharedClass;
    var names = [method.name].concat(method.aliases);
    for (var i = 0; i < names.length; i++) {
        paths.push((sc ? sc.name : '') + (method.isStatic ? '.' : '.prototype.') + names[i]);
        if (sc.ctor.pluralizeModelName) {
            paths.push(sc.ctor.pluralizeModelName + (method.isStatic ? '.' : '.prototype.') + names[i]);
        }

    }
    return paths;
}

function uriNotFoundHandler() {
    return function uriNotFound(ctx, next) {
        var message = 'There is no method to handle ' + ctx.request.uri;
        var error = new Error(message);
        error.status = error.statusCode = 404;
        next(error);
    };
}