"use strict";

var sycle = require('../../../../');

module.exports = function (Dealership) {

    Dealership.baseMethod = function () {};

    Dealership.echo = function (data, cb) {
        cb(null, data);
    };

    Dealership.expose('echo', {
        accepts: { name: 'data', source: 'payload' },
        returns: { root: true }
    });
};