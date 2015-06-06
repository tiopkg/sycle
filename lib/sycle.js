"use strict";

var Application = require('./application');

var sycle = module.exports = function () {
    return new Application();
};

sycle.Application = Application;
sycle.Request = require('./request');

sycle.rekuest = require('./rekuest');

/**
 * Framework version.
 */
require('pkginfo')(module, 'version');

/**
 * Boot Phases
 */
sycle.boot = {};
sycle.boot.initializers = require('bootable').initializers;
sycle.boot.database = require('./boot/database');
sycle.boot.definitions = require('./boot/definitions');
sycle.boot.module = require('./boot/module');