"use strict";

var _ = require('lodash');
var assert = require('assert');
var request = require('supertest');
var s = require('../support');
var t = s.t;
var sec = require('../../').security;
var veriuser = require('sycle-express-veriuser');
var connectRest = require('sycle-express-rest');

describe('token(options)', function () {
    beforeEach(setupWithTestToken);

    it('should populate req.token from the query string', function (done) {
        createTestAppAndRequest(this.sapp, this.token, done)
            .get('/?access_token=' + this.token.token)
            .expect(200)
            .end(done);
    });

    it('should populate req.token from an authorization header', function (done) {
        createTestAppAndRequest(this.sapp, this.token, done)
            .get('/')
            .set('authorization', this.token.token)
            .expect(200)
            .end(done);
    });

    it('should populate req.token from an X-Access-Token header', function (done) {
        createTestAppAndRequest(this.sapp, this.token, done)
            .get('/')
            .set('X-Access-Token', this.token.token)
            .expect(200)
            .end(done);
    });

    it('should populate req.token from an authorization header with bearer token', function (done) {
        var token = this.token.token;
        token = 'Bearer ' + new Buffer(token).toString('base64');
        createTestAppAndRequest(this.sapp, this.token, done)
            .get('/')
            .set('authorization', token)
            .expect(200)
            .end(done);
    });

    it('should populate req.token from a secure cookie', function (done) {
        var app = createTestApp(this.sapp, this.token, done);

        request(app)
            .get('/token')
            .end(function (err, res) {
                request(app)
                    .get('/')
                    .set('Cookie', res.header['set-cookie'])
                    .end(done);
            });
    });

    it('should populate req.token from a header or a secure cookie', function (done) {
        var app = createTestApp(this.sapp, this.token, done);
        var id = this.token.token;
        request(app)
            .get('/token')
            .end(function (err, res) {
                request(app)
                    .get('/')
                    .set('authorization', id)
                    .set('Cookie', res.header['set-cookie'])
                    .end(done);
            });
    });

    it('should skip when req.token is already present', function (done) {
        var sapp = this.sapp;
        var app = express();
        var tokenStub = { id: 'stub id' };
        app.use(function (req, res, next) {
            req.accessToken = tokenStub;
            next();
        });
        app.use(veriuser(sapp));
        app.get('/', function (req, res, next) {
            res.send(req.accessToken);
        });

        request(app).get('/')
            .set('Authorization', this.token.token)
            .expect(200)
            .end(function (err, res) {
                if (err) return done(err);
                t.deepEqual(res.body, tokenStub);
                done();
            });
    });
});


describe('AccessToken', function () {
    beforeEach(setupWithTestToken);

    it('should auto-generate id', function () {
        assert(this.token.token);
        assert.equal(this.token.token.length, 64);
    });

    it('should auto-generate created date', function () {
        assert(this.token.created);
        assert(Object.prototype.toString.call(this.token.created), '[object Date]');
    });

    it('should be validateable', function (done) {
        this.token.validate(function (err, isValid) {
            assert(isValid);
            done();
        });
    });
});


describe('authorize/direct', function () {
    this.enableTimeouts(false);

    it('prevents call with 401 status on denied ACL', function (done) {
        setupWithTestToken.call(this, function (err) {
            if (err) return done(err);
            this.sapp.rekuest('test.deleteById', {id: 123})
                .prop('accessToken', this.token)
                .send(function (err, result) {
                    t.equal(err.statusCode, 401);
                    done();
                });
        });
    });

    it('prevent call with app setting status on denied ACL', function (done) {
        setupWithTestToken.call(this, {app: {aclErrorStatus: 403}}, function (err) {
            if (err) return done(err);
            this.sapp.rekuest('test.deleteById', {id: 123})
                .prop('accessToken', this.token)
                .send(function (err) {
                    t.equal(err.statusCode, 403);
                    done();
                });
        });
    });

    it('prevent call with model setting status on denied ACL', function (done) {
        setupWithTestToken.call(this, {model: {aclErrorStatus: 404}}, function (err) {
            if (err) return done(err);
            this.sapp.rekuest('test.deleteById', {id: 123})
                .prop('accessToken', this.token)
                .send(function (err) {
                    t.equal(err.statusCode, 404);
                    done();
                });
        });
    });

    it('prevent call if the accessToken is missing and required', function (done) {
        setupWithTestToken.call(this, function (err) {
            if (err) return done(err);
            this.sapp.rekuest('test.deleteById', {id: 123})
                .send(function (err) {
                    t.equal(err.statusCode, 401);
                    done();
                });
        });
    });

});

describe('authorize/rest', function () {
    this.enableTimeouts(false);

    it('prevents remote call with 401 status on denied ACL', function (done) {
        setupWithTestToken.call(this, function () {
            createTestAppAndRequest(this.sapp, this.token, done)
                .del('/test/123')
                .expect(401)
                .set('authorization', this.token.token)
                .end(done);
        });
    });

    it('prevent remote call with app setting status on denied ACL', function (done) {
        setupWithTestToken.call(this, {app: {aclErrorStatus: 403}}, function () {
            createTestAppAndRequest(this.sapp, this.token, done)
                .del('/test/123')
                .expect(403)
                .set('authorization', this.token.token)
                .end(done);
        });
    });

    it('prevent remote call with app setting status on denied ACL', function (done) {
        setupWithTestToken.call(this, {model: {aclErrorStatus: 404}}, function () {
            createTestAppAndRequest(this.sapp, this.token, done)
                .del('/test/123')
                .expect(404)
                .set('authorization', this.token.token)
                .end(done);
        });
    });

    it('prevent remote call if the accessToken is missing and required', function (done) {
        setupWithTestToken.call(this, function () {
            createTestAppAndRequest(this.sapp, null, done)
                .del('/test/123')
                .expect(401)
                .set('authorization', null)
                .end(done);
        });
    });

});


function createTestAppAndRequest(sapp, token, settings, done) {
    var app = createTestApp(sapp, token, settings, done);
    return request(app);
}

var express = require('express');
var cookieParser = require('cookie-parser');


function createTestApp(sapp, token, settings, done) {
    if (typeof settings === 'function') {
        done = settings;
        settings = null;
    }
    settings = settings || {};

    var app = express();

    app.use(cookieParser('secret'));
    app.use(veriuser(sapp));

    app.get('/token', function (req, res) {
        res.cookie('authorization', token.token, {signed: true});
        res.end();
    });
    app.get('/', function (req, res) {
        try {
            assert(req.accessToken, 'req should have accessToken');
            assert(req.accessToken.token === token.token);
        } catch (e) {
            return done(e);
        }
        res.send('ok');
    });
    app.use(connectRest(sapp));

    Object.keys(settings).forEach(function (key) {
        app.set(key, settings[key]);
    });

    return app;
}

function setupWithTestToken(settings, done) {
    if (typeof settings === 'function') {
        done = settings;
        settings = null;
    }
    settings = settings || {};

    var self = this;

    createSapp(settings, function (err, sapp) {
        if (err) return done(err);
        self.sapp = sapp;
        createTestToken(sapp, function (err, accessToken) {
            if (err) return done.call(self, err);
            self.token = accessToken;
            done.call(self);
        });
    });
}

function createTestToken(sapp, cb) {
    sapp.model('AccessToken').create({}, cb);
}

function createSapp(settings, done) {
    if (typeof settings === 'function') {
        done = settings;
        settings = null
    }
    settings = settings || {};

    var sapp = s.mockApplicationWithDB(settings.app || settings.sapp);

    var modelOptions = {
        crud: true,
        acls: [
            {
                principalType: "ROLE",
                principalId: "$everyone",
                accessType: sec.ALL,
                permission: sec.DENY,
                property: 'deleteById'
            }
        ]};
    _.assign(modelOptions, settings.model);

    sapp.registry.define('test', modelOptions);

    sapp.boot(function (err) {
        done(err, sapp);
    });

}
