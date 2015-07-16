"use strict";

var path = require('path');

var s = require('./support');
var t = s.t;

var sycle = require('../');

describe('integration', function () {

    describe('boot.models', function () {
        it('should load local module resources', function (done) {
            var app = new sycle.Application();
            app.phase(sycle.boot.models('./test/fixtures/base-app'));
            app.phase(sycle.boot.database());
            app.boot(function (err) {
                if (err) return done(err);
                var Dealership = app.model('Dealership');
                t(Dealership);
                t.isFunction(Dealership.baseMethod);
                done();
            })
        });

        it('should extend app', function (done) {
            var app = sycle({loadBuiltinModels: true});
            app.phase(sycle.boot.models('./test/fixtures/base-app'));
            app.phase(sycle.boot.models('./test/fixtures/extended-app'));
            app.phase(sycle.boot.database());
            app.boot(function (err) {
                if (err) return done(err);
                var Dealership = app.model('Dealership');
                t(Dealership);
                t(Dealership.properties['phone']);
                t.isFunction(Dealership.baseMethod);
                t.isFunction(Dealership.extendedMethod);

                var Employee = app.model('Employee');
                t(Employee);
                t(Employee.properties['foo']);
                t(Employee.properties['email']);
                done();
            })
        });
    });

    describe('programmatic', function () {
        it('should boot programmatically', function (done) {
            var app = sycle();

            app.registry.define('Color', {
                properties: {
                    name: String
                }
            });

            app.phase(sycle.boot.database());
            app.boot(function () {
                var Color = app.models.Color;
                Color.create({name: 'red'});
                Color.create({name: 'green'});
                Color.create({name: 'blue'});

                Color.all(function (err, colors) {
                    t.lengthOf(colors, 3);
                    done();
                });
            });

        });
    });

    describe('classic', function () {

        var app;
        var root = './test/fixtures/base-app';
        var database = {
            main: {
                driver: 'memory'
            }
        };
        var schemap = {
            main: '*'
        };

        beforeEach(function (done) {
            app = new sycle.Application();
            // initialization phases
            app.phase(sycle.boot.definitions(path.join(root, 'models')));
            app.phase(sycle.boot.database(database, schemap));

            app.boot(function (err) {
                if (err) return done(err);
                t.deepEqual(Object.keys(app.models), ['Car', 'Dealership']);
                done();
            });
        });

        it('should handle a request with handler', function (done) {
            app.ask('dealership.echo')
                .payload({msg: 'hello'})
                .send(function (err, result) {
                    if (err) return done(err);
                    t.deepEqual(result, {msg: 'hello'});
                    done();
                });
        });

        it('should handle a request for model function', function (done) {
            var dealership = {
                name: 'Sycle',
                zip: 101010,
                address: 'Guangzhou China'
            };
            app.ask('dealership.upsert')
                .payload(dealership)
                .send(function (err, result) {
                    if (err) return done(err);
                    t.includeProperties(result, dealership);
                    done();
                });
        });

    });

    describe('cancelable', function () {

        var sapp;

        beforeEach(function (done) {
            sapp = new sycle.Application();
            sapp.phase(sycle.boot.models('./test/fixtures/base-app'));
            sapp.phase(sycle.boot.database());
            sapp.boot(done);
        });

        it('should resolve with canceled when cancel the future', function (done) {
            var future = sapp.ask('car.order')
                .send(function () {
                    throw new Error('Should have been cancelled');
                });

            future.canceled(function (err) {
                t.ok(err);
                done();
            });

            future.cancel();
        });
    });
});