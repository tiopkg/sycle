"use strict";

var path = require('path');
var needs = require('needs');
var _ = require('lodash');
var i8n = require('inflection');


/**
 * Models initialization phase.
 *
 * @examples
 *
 * sycle.phase(sycle.boot.models('models');
 *
 * @param dir models directory.
 * @returns {Function}
 */

module.exports = function (dir) {
    dir = dir || 'models';

    return function definitions() {
        var registry = this.registry;

        var defs = needs(path.resolve(dir), { patterns: '**/*.def.js' });
        _.forEach(defs, function (def, name) {
            var modelName = def.name || i8n.camelize(name.substr(0, name.length - 4));
            registry.define(modelName, def);
        });

        var setups = needs(path.resolve(dir), { patterns: '**/*.js', excludes: '**/*.def.js' });
        _.forEach(setups, function (setup, name) {
            registry.setup(name, setup);
        });
    }
};