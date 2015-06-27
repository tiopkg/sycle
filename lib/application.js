"use strict";

var debug = require('debug')('sycle:app');
var _ = require('lodash');
var assert = require('assert');
var dotty = require('dotty');
var util = require('util');
var Emitter = require('events').EventEmitter;
var bootable = require('bootable');
var middist = require('middist');
var delegate = require('delegates');

var Rekuest = require('./rekuest');
var Context = require('./context');

var Registry = require('./registry');
var Remotes = require('strong-remoting');
var Dispatcher = require('./dispatcher');

var capable = require('./capable');

module.exports = Application;

function Application() {
    if (!(this instanceof Application)) return new Application();

    Emitter.call(this);

    this.__initializer = new bootable.Initializer();
    this.__middist = middist();

    this.context = {}; // for context extension
    this.settings = {};

    var registry = this.registry = new Registry(this);
    registry.use(require('./model/model'));
    registry.use(require('./model/relations'));
    registry.use(require('./model/hook'));
    registry.use(require('./model/exposable'));

}

util.inherits(Application, Emitter);

Application.prototype.__defineGetter__('remotes', function () {
    if (!this.__remotes) {
        this.__remotes = new Remotes(this.get('remoting') || {});
    }
    return this.__remotes;
});

Application.prototype.__defineGetter__('dispatcher', function () {
    if (!this.__dispatcher) {
        this.__dispatcher = new Dispatcher(this.remotes);
    }
    return this.__dispatcher.middleware();
});

delegate(Application.prototype, 'registry')
    .getter('models')
    .getter('schemas');


/**
 * Assign `setting` to `val`, or return `setting`'s value.
 *
 *    app.set('foo', 'bar');
 *    app.get('foo');
 *    // => "bar"
 *
 * Mounted servers inherit their parent server's settings.
 *
 * @param {String} setting
 * @param {*} [val]
 * @return {Application|*} for chaining
 * @api public
 */

Application.prototype.set = function(setting, val){
    if (arguments.length === 1) {
        return dotty.get(this.settings, setting);
    }

    // set value
    this.settings[setting] = val;

    return this;
};

Application.prototype.setAll = function (options) {
    _.assign(this.settings, options);
};

Application.prototype.get = function (setting) {
    return this.set(setting);
};

/**
 * Check if `setting` is enabled (truthy).
 *
 *    app.enabled('foo')
 *    // => false
 *
 *    app.enable('foo')
 *    app.enabled('foo')
 *    // => true
 *
 * @param {String} setting
 * @return {Boolean}
 * @api public
 */

Application.prototype.enabled = function(setting){
    return !!this.set(setting);
};

/**
 * Check if `setting` is disabled.
 *
 *    app.disabled('foo')
 *    // => true
 *
 *    app.enable('foo')
 *    app.disabled('foo')
 *    // => false
 *
 * @param {String} setting
 * @return {Boolean}
 * @api public
 */

Application.prototype.disabled = function(setting){
    return !this.set(setting);
};

/**
 * Enable `setting`.
 *
 * @param {String} setting
 * @return {Application} for chaining
 * @api public
 */

Application.prototype.enable = function(setting){
    return this.set(setting, true);
};

/**
 * Disable `setting`.
 *
 * @param {String} setting
 * @return {Application} for chaining
 * @api public
 */

Application.prototype.disable = function(setting){
    return this.set(setting, false);
};

/**
 * Register a boot phase.
 *
 * When an application boots, it proceeds through a series of phases, ultimately
 * resulting in a listening server ready to handle requests.
 *
 * A phase can be either synchronous or asynchronous.  Synchronous phases have
 * following function signature
 *
 *     function myPhase() {
 *       // perform initialization
 *     }
 *
 * Asynchronous phases have the following function signature.
 *
 *     function myAsyncPhase(done) {
 *       // perform initialization
 *       done();  // or done(err);
 *     }
 *
 * @param {Function|Function[]} fns
 * @api public
 */
Application.prototype.phase = function (fns) {
    if (!Array.isArray(fns)) fns = [fns];
    for (var i = 0; i < fns.length; i++) {
        this.__initializer.phase(fns[i]);
    }
    return this;
};

Application.prototype.model = function (model, caseSensitive) {
    if (typeof model === 'function') {
        throw new Error('`model` must not be string');
    }
    if (!caseSensitive) {
        model = model.toLowerCase();
    }
    var foundModel;
    for (var i in this.models) {
        if (model === i || !caseSensitive && model === i.toLowerCase()) {
            foundModel = this.models[i];
        }
    }
    return foundModel;
};

/**
 * Use the given middleware `fn`.
 *
 * @param {Function} fn
 * @return {Application} self
 * @api public
 */

Application.prototype.use = function (fn) {
    assert(typeof fn === 'function', 'app.use() requires a function');
    debug('use %s', fn._name || fn.name || '-');
    this.__middist.use(fn);
    return this;
};

/**
 * Only use the given middleware `fn` once.
 *
 * @param {Function} fn
 * @return {Application} self
 * @api public
 */
Application.prototype.usesafely = function (fn) {
    if (!fn) return this;
    var found = _.find(this.__middist['stack'], function (layer) {
        return layer.handle === fn;
    });
    if (!found) this.use(fn);
    return this;
};

Application.prototype.rekuest = function (uri, params, payload) {
    return new Rekuest(this, uri, params, payload);
};

Application.prototype.handle = function (req, cb) {
    var ctx = this.createContext(req);
    this.__middist.handle(ctx, cb);
    return ctx.future;
};

/**
 * Initialize a new context.
 *
 * @api private
 */

Application.prototype.createContext = function (req) {
    var context = new Context(req);
    for (var key in this.context) context[key] = this.context[key]; // mixin app's context
    context.app = req.app = this;
    for (var m in this.models) context[m] = this.models[m];
    return context;
};

Application.prototype.ready = function (cb) {
    if (this.booted) return cb(this);
    this.on('ready', cb);
};

/**
 * Boot `Sycle` application.
 *
 * @param {Function} [cb]
 * @api public
 */
Application.prototype.boot = function (cb) {
    if (this.booting || this.booted) return cb && cb();
    this.booting = true;

    var sapp = this;

    this.emit('before boot', sapp); // for backward
    this.emit('boot:before', sapp);

    this.phase(capable.remotable(sapp.get('model public') || sapp.get('model:public')));
    this.phase(capable.dispatchable());

    this.emit('boot', sapp);
    this.__initializer.run(function (err) {
        if (err) {
            if (!cb) throw err;
            return cb(err);
        }
        sapp.emit('after boot', sapp); // for backward
        sapp.emit('boot:after', sapp);
        sapp.booted = true;
        sapp.emit('ready', sapp);
        cb && cb();
    }, this);
};