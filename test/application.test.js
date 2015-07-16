"use strict";

var s = require('./support');
var t = s.t;

var sycle = require('../');

describe('app', function () {
    describe('when an error occurs', function() {

        it('should handle middleware errors', function (done) {
            var app = sycle();

            app.use(function (c) {
                // triggers this.socket.writable == false
                c.throw('boom');
            });

            app.ask().send(function (err) {
                t.equal(err.message, 'boom');
                done();
            });
        });

        it('should throw error for ctx.throw()', function () {
            var app = sycle();

            app.use(function (c) {
                c.throw('boom');
            });

            t.throws(function () { sycle.ask().send(app); });

        });

        it('should throw error for new Error() ', function () {
            var app = sycle();

            app.use(function () {
                throw new Error('boom');
            });

            t.throws(function () { sycle.ask().send(app); });
        });

        it('should be catchable', function(done){
            var app = sycle();

            app.use(function (c, next){
                next(function (err, c) {
                    c.result = err ? 'Got error' : 'Hello'
                });
            });

            app.use(function (c){
                c.result = 'Oh no';
                throw new Error('boom!');
            });

            app.ask().send(function (err, result) {
                t.equal(result, 'Got error');
                done();
            });
        })
    });

});

describe('app.use(fn)', function () {
    it('should compose middleware', function (done) {
        var app = sycle();
        var calls = [];

        app.use(function (c, next) {
            calls.push(1);
            next(function () {
                calls.push(6);
            });
        });

        app.use(function (c, next) {
            calls.push(2);
            next(function () {
                calls.push(5);
            });
        });

        app.use(function (c, next) {
            calls.push(3);
            next(function () {
                calls.push(4);
            });
        });

        app.ask().send(function (err) {
            if (err) return done(err);
            t.deepEqual(calls, [1, 2, 3, 4, 5, 6]);
            done();
        });
    });
});

describe('app.respond', function () {

    describe('when .result is an String', function() {
        it('should respond', function (done) {
            var app = sycle();

            app.use(function (c) {
                c.result = 'Hello';
            });

            app.ask().send(function (err, result) {
                t.equal(result, 'Hello');
                done();
            });
        });
    });

    describe('when .result is an Object', function(){
        it('should respond with json', function(done){
            var result = { hello: 'world' };
            var app = sycle();

            app.use(function (c){
                c.result = result;
            });

            app.ask().send(function (err, result) {
                t.equal(result, result);
                done();
            });
        })
    })
});


describe('app.context', function(){
    var app1 = sycle();
    app1.context.message = 'hello';
    var app2 = sycle();

    it('should merge properties', function(done){
        app1.use(function (c){
            t.equal(c.message, 'hello');
            c.result = 'tao'
        });

        app1.ask().send(function (err, result) {
            t.equal(result, 'tao');
            done();
        });
    });

    it('should not affect the original prototype', function(done){
        app2.use(function (c){
            t.equal(c.message, undefined);
            c.result = 'tao';
        });

        app2.ask().send(function (err, result) {
            t.equal(result, 'tao');
            done();
        });
    });
});

