"use strict";

var _ = require('lodash');
var async = require('async');
var chai = require('chai');
chai.config.includeStack = true;
var Schema = require('jugglingdb').Schema;
var sycle = require('../');

var redisOptions = {
    driver: 'redis-hq'
};

var mysqlOptions = {
    driver: 'mysql',
    username: 'root',
    database: 'sycle_test',
    autoupdate: true
    //debug: true
};

var dbOptions = mysqlOptions; // change this to use redis or mysql as test database

var t = exports.t = chai.assert;

t.plan = function (count, done) {
    return function () {
        if (--count === 0) done();
    }
};


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

exports.mockApplicationWithDB = function (options) {
    options = options || {};
    options.db = options.db || dbOptions;

    var sapp = sycle({loadBuiltinModels: true});
    sapp.setAll(options);
    sapp.phase(sycle.boot.database(options.db));
    sapp.phase(sycle.authorizer);
    return sapp;
};

exports.schema = function () {
    return new Schema('memory');
};

exports.request = function (uri, payload) {
    return {uri: name, payload: payload};
};

exports.cleanup = function (sappOrModels, done) {
    var models = sappOrModels;
    if (sappOrModels.models) {
        models = _.values(sappOrModels.models);
    } else if (!(Array.isArray(sappOrModels))) {
        models = [sappOrModels];
    }

    done = done || function () {
        };

    async.eachSeries(models, function (Model, callback) {
        Model.destroyAll(callback);
    }, done);
};