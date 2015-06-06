"use strict";

var s = require('./support');
var t = s.t;

var Registry = require('../lib/registry');

describe('registry', function () {

    var reg, definitions, models;
    beforeEach(function () {
        reg = new Registry();
        definitions = reg.definitions;
    });

    it('should define model', function () {
        var ModelDef = reg.define('Model');
        t.equal(ModelDef, definitions['Model'])
    });

    it('should apply to schema', function () {
        reg.define('Model');
        var schema = reg.build()[0];
        models = reg.models;
        t.ok(models['Model']);
        t.ok(schema.models['Model']);
        t.equal(models['Model'], schema.models['Model']);
    });

    it('should work with db specified', function () {
        reg.define('A', { db: 'memory' });
        reg.define('B');

        var schemas = reg.build({
            default: 'memory',
            memory: { driver: 'memory' }
        });

        t.lengthOf(schemas, 2);
        t.equal(schemas[0].name, 'memory');
        t.equal(schemas[1].name, 'default');

        t.ok(schemas[0].models['A']);
        t.ok(schemas[1].models['B']);

        t.deepEqual(Object.keys(reg.models), ['A', 'B']);
    });
});