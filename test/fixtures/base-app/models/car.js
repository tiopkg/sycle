"use strict";

var sycle = require('../../../../');

module.exports = function (Car) {
    Car.setupCar = true;

    Car.echo = function (data, cb) {
        cb(null, data);
    };

    Car.order = function (d, cb) {
        var h;
        d.canceled(function cancel() {
            h && clearTimeout(h);
        });

        h = setTimeout(function () {
            cb(null, true);
        }, 500);
    };

    Car.expose('echo', {
        accepts: { name: 'data', source: 'payload' },
        returns: { root: true }
    });

    Car.expose('order', {
        accepts: { name: 'd', source: 'd' },
        returns: { root: true }
    });
};