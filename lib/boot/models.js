"use strict";

var assert = require('assert');
var resolve = require('resolve');
var path = require('path');
var fs = require('fs');
var i8n = require('inflection');

module.exports = function (mod) {
    assert(mod, '`module` must not be null');
    var dir = path.resolve(mod);
    if (!fs.existsSync(dir) || !fs.lstatSync(dir).isDirectory()) {
        dir = path.dirname(resolve.sync(mod));
    }

    var phases = [];
    loadDefinitionsFromDir(dir, phases);
    loadDefinitionsFromConfig(dir, phases);
    return phases;
};

function loadDefinitionsFromConfig(dir, phases) {
    var mod = path.join(dir, 'models');
    if (fs.existsSync(mod + '.js') || fs.existsSync(mod + '.json')) {
        phases.push(loadDefinitions(require(mod)));
    }

    function loadDefinitions(defs) {
        return function () {
            var regsitry = this.registry;
            for (var name in defs) {
                regsitry.define(i8n.camelize(name), defs[name]);
            }
        }
    }
}

function loadDefinitionsFromDir(dir, phases) {
    var modelsPath = path.join(dir, 'models');
    if (fs.existsSync(modelsPath)) {
        phases.push(require('./definitions')(modelsPath));
    }
    modelsPath = path.join(dir, 'common', 'models');
    if (fs.existsSync(modelsPath)) {
        phases.push(require('./definitions')(modelsPath));
    }

}