"use strict";

var s = require('./support');
var t = s.t;
var bootModels = require('../lib/boot/models');


describe('boot/module', function () {

    var app;
    beforeEach(function () {
        app = s.mockApplication();
    });

    it('should return 1 phases', function () {
        var phases = bootModels('./test/fixtures/base-app');
        t.lengthOf(phases, 2);
    });

});