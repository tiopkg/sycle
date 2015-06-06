"use strict";

var s = require('./support');
var t = s.t;
var bootDefinitions = require('../lib/boot/definitions');

describe('boot/models', function () {

    describe('simple', function () {
        var app;
        beforeEach(function () {
            app = s.mockApplication();
            bootDefinitions('test/fixtures/base-app/models').call(app);
        });

        it('should load models from dir', function () {
            var defCar = app.registry.definitions['Car'];
            t.ok(defCar);
        });

    });


});