"use strict";

var chai = require('chai');
chai.config.includeStack = true;
var Schema = require('jugglingdb').Schema;
var sycle = require('../');

var t = exports.t = chai.assert;

t.includeProperties = function (obj, properties, msg) {
    if (!obj) return t.notOk(properties, msg);
    if (!properties) return t.notOk(obj, msg);
    for (var prop in properties) {
        t.deepPropertyVal(obj, prop, properties[prop], msg);
    }
};

exports.mockApplication = function () {
    return sycle();
};

exports.schema = function () {
    return new Schema('memory');
};

exports.request = function (uri, payload) {
    return { uri: name, payload: payload };
};
