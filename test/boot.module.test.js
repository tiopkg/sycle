"use strict";

var s = require('./support');
var t = s.t;
var bootModule = require('../lib/boot/module');


describe('boot/module', function () {

    var app;
    beforeEach(function () {
        app = s.mockApplication();
    });

    it('should return 1 phases', function () {
        var phases = bootModule('./test/fixtures/base-app');
        t.lengthOf(phases, 2);
    });

});