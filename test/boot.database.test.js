"use strict";

var s = require('./support');
var t = s.t;
var bootDefinitions = require('../lib/boot/definitions');
var bootDatabase = require('../lib/boot/database');


describe('boot/database', function () {

    var app;
    beforeEach(function () {
        app = s.mockApplication();
        bootDefinitions('test/fixtures/base-app/models').call(app);
    });

    it('should connect database and build schemas', function () {
        bootDatabase().call(app);
        t.lengthOf(app.schemas, 1);
        t.lengthOf(Object.keys(app.models), 2);
        var Car = app.models['Car'];
        t.isTrue(Car.setupCar);
    });

});