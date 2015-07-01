"use strict";

var assert = require('assert');

module.exports = function (Application) {

    Application.hook('beforeCreate', function (data) {
        data.created = data.modified = new Date();
        data.duid = generateKey('duid', 'md5');
        data.clientKey = generateKey('client');
        data.javaScriptKey = generateKey('javaScript');
        data.restApiKey = generateKey('restApi');
        data.windowsKey = generateKey('windows');
        data.masterKey = generateKey('master');
    });


    /**
     * Register a new application
     * @param {String} owner Owner's user ID.
     * @param {String} name  Name of the application
     * @param {Object|Function} options  Other options
     * @param {Function} cb  Callback function (err, application)
     */
    Application.register = function (owner, name, options, cb) {
        assert(owner, 'owner is required');
        assert(name, 'name is required');

        if (typeof options === 'function' && !cb) {
            cb = options;
            options = {};
        }
        var props = {owner: owner, name: name};
        for (var p in options) {
            if (!(p in props)) {
                props[p] = options[p];
            }
        }
        this.create(props, cb);
    };

    /**
     * Reset keys for the application instance
     * @callback {Function} cb (err, application)
     */
    Application.prototype.resetKeys = function (cb) {
        this.clientKey = generateKey('client');
        this.javaScriptKey = generateKey('javaScript');
        this.restApiKey = generateKey('restApi');
        this.windowsKey = generateKey('windows');
        this.masterKey = generateKey('master');
        this.modified = new Date();
        this.save(cb);
    };

    /**
     * Reset keys for a given application by the appId
     * @param {*} appId
     * @param {Function} cb (err, application)
     */
    Application.resetKeys = function (appId, cb) {
        this.findById(appId, function (err, app) {
            if (err) {
                cb && cb(err, app);
                return;
            }
            app.resetKeys(cb);
        });
    };

    /**
     * Authenticate the application id and key.
     *
     * `matched` parameter is one of:
     * - clientKey
     * - javaScriptKey
     * - restApiKey
     * - windowsKey
     * - masterKey
     *
     * @param {*} appId
     * @param {String} key
     * @param {Function} cb (err, matched)
     */
    Application.authenticate = function (appId, key, cb) {
        this.findById(appId, function (err, app) {
            if (err || !app) {
                cb && cb(err, null);
                return;
            }
            var result = null;
            var keyNames = ['clientKey', 'javaScriptKey', 'restApiKey', 'windowsKey', 'masterKey'];
            for (var i = 0; i < keyNames.length; i++) {
                if (app[keyNames[i]] === key) {
                    result = {
                        application: app,
                        keyType: keyNames[i]
                    };
                    break;
                }
            }
            cb && cb(null, result);
        });
    };
};

var crypto = require('crypto');

function generateKey(hmacKey, algorithm, encoding) {
    hmacKey = hmacKey || 'sycle';
    algorithm = algorithm || 'sha1';
    encoding = encoding || 'hex';
    var hmac = crypto.createHmac(algorithm, hmacKey);
    var buf = crypto.randomBytes(32);
    hmac.update(buf);
    return hmac.digest(encoding);
}
