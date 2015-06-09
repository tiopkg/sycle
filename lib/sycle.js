"use strict";

var Application = require('./application');

var sycle = module.exports = createApplication;


/**
 * Create an sycle application.
 *
 * @param options
 * @returns {Application}
 * @api public
 */
function createApplication(options) {
    options = options || {};
    var app = new Application();


    if (options.loadBuiltinModels) {
        app.phase(require('./boot/builtin-models')());
    }

    return app;

}

sycle.Application = Application;
sycle.Request = require('./request');

sycle.rekuest = require('./rekuest');

/**
 * Framework version.
 */
require('pkginfo')(module, 'version');

sycle.security = require('./security');
sycle.authorizer = require('./authorizer');

/**
 * Boot Phases
 */
sycle.boot = {};
sycle.boot.initializers = require('bootable').initializers;
sycle.boot.database = require('./boot/database');
sycle.boot.definitions = require('./boot/definitions');
sycle.boot.module = require('./boot/module');