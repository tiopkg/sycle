"use strict";

var _ = require('lodash');
var Remotes = require('strong-remoting');
var SharedClass = Remotes.SharedClass;

module.exports = function (/*registry*/) {

    return {
        define: function (Model, name, properties, settings) {
            buildSharedCtor(Model);

            Model.sharedClass = new SharedClass(name, Model, settings['remoting']);

            Model.expose = function (name, options) {
                options = options || {};
                if (options.isStatic === undefined) {
                    options.isStatic = true;
                }
                standartize(options);
                this.sharedClass.defineMethod(name, options);
            };

            Model.exposeCrud = function (methods) {
                exposeCrud(Model, methods);
            };

            // setup a remoting type converter for this model
            Remotes.convert(name, function (val) {
                return val ? new Model(val) : val;
            });

            if (settings['crud']) {
                Model.exposeCrud(settings['crud']);
            }
        }
    }
};

function buildSharedCtor(Model) {

    // support remoting prototype methods
    Model.sharedCtor = function (data, id, fn) {
        var Model = this;

        if(typeof data === 'function') {
            fn = data;
            data = null;
            id = null;
        } else if (typeof id === 'function') {
            fn = id;

            if(typeof data !== 'object') {
                id = data;
                data = null;
            } else {
                id = null;
            }
        }

        if(id && data) {
            var model = new Model(data);
            model.id = id;
            fn(null, model);
        } else if(data) {
            fn(null, new Model(data));
        } else if(id) {
            Model.findById(id, function (err, model) {
                if(err) {
                    fn(err);
                } else if(model) {
                    fn(null, model);
                } else {
                    err = new Error('could not find a model with id ' + id);
                    err.statusCode = 404;

                    fn(err);
                }
            });
        } else {
            fn(new Error('must specify an id or data'));
        }
    };

    // before remote hook
    Model.beforeRemote = function (name, fn) {
        if (Model.sapp) {
            var remotes = Model.sapp.remotes;
            var className = Model.modelName;
            remotes.before(className + '.' + name, function (ctx, next) {
                fn(ctx, ctx.result, next);
            });
        } else {
            throw new Error('No sapp attach to model ' + Model.modelName);
        }
    };

    // after remote hook
    Model.afterRemote = function (name, fn) {
        if (Model.sapp) {
            var remotes = Model.sapp.remotes;
            var className = Model.modelName;
            remotes.after(className + '.' + name, function (ctx, next) {
                fn(ctx, ctx.result, next);
            });
        } else {
            throw new Error('No sapp attach to model ' + Model.modelName);
        }
    };

    var idDesc = Model.modelName + ' id';
    Model.sharedCtor.accepts = [
        {arg: 'id', type: 'any', required: true, http: {source: 'path'},
            description: idDesc}
        // {arg: 'instance', type: 'object', http: {source: 'body'}}
    ];

    Model.sharedCtor.http = [
        {path: '/:id'}
    ];

    Model.sharedCtor.returns = {root: true};
}

function standartize(options) {
    var accepts = options.accepts;

    if (accepts) {
        // for explorer generating gui
        if (Array.isArray(accepts)) {
            accepts.forEach(function (accept) {
                httperize(accept);
            })
        } else {
            httperize(accepts);
        }
    }

    return options;

}

function httperize(accept) {
    if (!accept || !accept.source) return;
    if (!accept.http && typeof accept.source === 'function') {
        accept.http = accept.source;
    } else {
        accept.http = accept.http || {};
        accept.http.source = accept.source === 'payload' ? 'body' : accept.source;
    }
}

function exposeCrud(Model, methods) {
    if (methods === false || methods === 'false') {
        return;
    }

    if (!methods || methods === true || methods === 'true' || methods === 'all') {
        methods = true
    } else if (!Array.isArray(methods)) {
        methods = [methods];
    }

    var modelType = Model.modelName;

    function expose(scope, name, options) {
        var names = Array.isArray(name) ? name : [name];
        var fn;
        names.forEach(function (name) {
            fn = scope[name];
            fn._delegate = true;
            options.isStatic = scope === Model;
            Model.expose(name, options);
        });
    }

    function enabled(method) {
        return methods === true || _.contains(methods, method);
    }

    /*!
     * Convert null callbacks to 404 error objects.
     * @param  {HttpContext} ctx
     * @param  {Function} cb
     */

    function convertNullToNotFoundError(ctx, cb) {
        if (ctx.result !== null) return cb();
        notFoundError(ctx, cb);
    }

    function notFoundError(ctx, cb) {
        var modelName = ctx.method.sharedClass.name;
        var id = reqparam(ctx.req, 'id');
        var msg = 'Unknown "' + modelName + '" id "' + id + '".';
        var error = new Error(msg);
        error.statusCode = error.status = 404;
        cb(error);
    }

    function reqparam(req, name, defaultValue) {
        var params = req.params || {};
        var body = req.body || {};
        var query = req.query || {};

        if (null != params[name] && params.hasOwnProperty(name)) return params[name];
        if (null != body[name]) return body[name];
        if (null != query[name]) return query[name];

        return defaultValue;
    }

    enabled('create') && expose(Model, 'create', {
        description: 'Create a new instance of the model and persist it into the data source',
        accepts: {arg: 'data', type: 'object', source: 'body', description: 'Model instance data'},
        returns: {arg: 'data', type: modelType, root: true},
        http: {verb: 'post', path: '/'}
    });

    // update ~ remoting attributes
    enabled('updateById') && expose(Model, 'updateById', {
        description: 'Update attributes for a model instance and persist it into the database',
        accepts: [
            {arg: 'id', type: 'any', required: true, description: 'Model id'},
            {arg: 'data', type: 'object', source: 'body', description: 'An object of model property name/value pairs'}
        ],
        returns: {arg: 'data', type: modelType, root: true},
        http: {verb: 'put', path: '/:id'}
    });

    // upsert ~ remoting attributes
    (enabled('upsert') || enabled('updateOrCreate')) && expose(Model, ['upsert', 'updateOrCreate'], {
        description: 'Update an existing model instance or insert a new one into the data source',
        accepts: {arg: 'data', type: 'object', source: 'body', description: 'Model instance data'},
        returns: {arg: 'data', type: modelType, root: true},
        http: {verb: 'put', path: '/'}
    });

    // exists ~ remoting attributes
    enabled('exists') && expose(Model, 'exists', {
        description: 'Check whether a model instance exists in the data source',
        accepts: {arg: 'id', type: 'any', required: true, description: 'Model id'},
        returns: {arg: 'exists', type: 'boolean'},
        http: [
            {verb: 'get', path: '/:id/exists'},
            {verb: 'head', path: '/:id'}
        ],
        rest: { after: function (ctx, cb) { // After hook to map exists to 200/404 for HEAD
            if (ctx.result.exists) return cb();
            notFoundError(ctx, cb);
        } }
    });

    // find ~ remoting attributes
    enabled('findById') && expose(Model, 'findById', {
        description: 'Find a model instance by id from the data source',
        accepts: {arg: 'id', type: 'any', required: true, description: 'Model id'},
        returns: {arg: 'data', type: modelType, root: true},
        http: {verb: 'get', path: '/:id'},
        rest: {after: convertNullToNotFoundError}
    });

    // all ~ remoting attributes
    enabled('all') && expose(Model, 'all', {
        description: 'Find all instances of the model matched by filter from the data source',
        accepts: {arg: 'filter', type: 'object', description: 'Filter defining fields, where, orderBy, offset, and limit'},
        returns: {arg: 'data', type: [modelType], root: true},
        http: {verb: 'get', path: '/'}
    });

    enabled('one') && expose(Model, 'one', {
        description: 'Find first instance of the model matched by filter from the data source',
        accepts: {arg: 'filter', type: 'object', description: 'Filter defining fields, where, orderBy, offset, and limit'},
        returns: {arg: 'data', type: 'object', root: true},
        http: {verb: 'get', path: '/one'},
        rest: {after: convertNullToNotFoundError}
    });

    // deleteById ~ remoting attributes
    if (enabled('deleteById') || enabled('removeById') || enabled('destroyById')) {
        expose(Model, ['deleteById', 'removeById', 'destroyById'], {
            description: 'Delete a model instance by id from the data source',
            accepts: {arg: 'id', type: 'any', required: true, description: 'Model id'},
            http: {verb: 'del', path: '/:id'}
        });
    }

    // count ~ remoting attributes
    enabled('count') && expose(Model, 'count', {
        description: 'Count instances of the model matched by where from the data source',
        accepts: {arg: 'where', type: 'object', description: 'Criteria to match model instances'},
        returns: {arg: 'count', type: 'number'},
        http: {verb: 'get', path: '/count'}
    });
}