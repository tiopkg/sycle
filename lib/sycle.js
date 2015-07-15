"use strict";
var deprecate = require('depd')('sycle');
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
    var sapp = new Application();
    sapp.sycle = sycle;

    if (options.loadBuiltinModels) {
        sapp.phase(require('./boot/builtin-models')());
    }

    return sapp;

}

sycle.Application = Application;
sycle.Request = require('./request');

sycle.rekuest = require('./rekuest');

/**
 * Framework version.
 */
require('pkginfo')(module, 'version');

sycle.security = require('./security');
sycle.authorizer = deprecate.function(require('./authorizer'), 'authorizer');

/**
 * Boot Phases
 */
sycle.boot = {};
sycle.boot.initializers = require('bootable').initializers;
sycle.boot.database = require('./boot/database');
sycle.boot.definitions = require('./boot/definitions');
sycle.boot.models = require('./boot/models');
sycle.boot.module = deprecate.function(sycle.boot.models, 'boot.module');