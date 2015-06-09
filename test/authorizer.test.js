"use strict";

var sycle = require('../');
var s = require('./support');
var authorizer = require('../lib/authorizer');

describe('authorizer', function () {

    var sapp;
    beforeEach(function (done) {
        sapp = s.mockApplicationWithDB();
        sapp.phase(authorizer);
        sapp.boot(done);
    });

//    it('should allow create user', function () {
//    });

});