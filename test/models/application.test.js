"use strict";

var s = require('./../support');
var t = s.t;

describe('Application', function () {
    var registeredApp = null;

    var sapp, Application;

    beforeEach(function (done) {
        sapp = s.mockApplicationWithDB();
        sapp.boot(function (err) {
            Application = sapp.models.Application;
            done(err);
        })
    });

    afterEach(function (done) {
        s.cleanup(sapp, done);
    });

    it('Create a new application', function (done) {
        Application.create({owner: 'rfeng',
            name: 'MyApp1',
            description: 'My first mobile application'}, function (err, result) {
            t.equal(result.owner, 'rfeng');
            t.equal(result.name, 'MyApp1');
            t.equal(result.description, 'My first mobile application');
            t(result.clientKey);
            t(result.javaScriptKey);
            t(result.restApiKey);
            t(result.windowsKey);
            t(result.masterKey);
            t(result.created);
            t(result.modified);
            t.equal(typeof result.duid, 'string');
            done(err, result);
        });
    });


    it('Create a new application with push settings', function (done) {
        Application.create({owner: 'rfeng',
                name: 'MyAppWithPush',
                description: 'My push mobile application',
                pushSettings: {
                    apns: {
                        production: false,
                        certData: 'cert',
                        keyData: 'key',
                        pushOptions: {
                            gateway: 'gateway.sandbox.push.apple.com',
                            port: 2195
                        },
                        feedbackOptions: {
                            gateway: 'feedback.sandbox.push.apple.com',
                            port: 2196,
                            interval: 300,
                            batchFeedback: true
                        }
                    },
                    gcm: {
                        serverApiKey: 'serverKey'
                    }
                }},
            function (err, result) {
                t.deepEqual(result.pushSettings, {
                    apns: {
                        production: false,
                        certData: 'cert',
                        keyData: 'key',
                        pushOptions: {
                            gateway: 'gateway.sandbox.push.apple.com',
                            port: 2195
                        },
                        feedbackOptions: {
                            gateway: 'feedback.sandbox.push.apple.com',
                            port: 2196,
                            interval: 300,
                            batchFeedback: true
                        }
                    },
                    gcm: {
                        serverApiKey: 'serverKey'
                    }
                });
                done(err, result);
            });
    });

    beforeEach(function (done) {
        Application.register('rfeng', 'MyApp2',
            {description: 'My second mobile application'}, function (err, result) {
                var app = result;
                t.equal(app.owner, 'rfeng');
                t.equal(app.name, 'MyApp2');
                t.equal(app.description, 'My second mobile application');
                t(app.clientKey);
                t(app.javaScriptKey);
                t(app.restApiKey);
                t(app.windowsKey);
                t(app.masterKey);
                t(app.created);
                t(app.modified);
                registeredApp = app;
                done(err, result);
            });
    });

    it('Reset keys', function (done) {
        Application.resetKeys(registeredApp.id, function (err, result) {
            var app = result;
            t.equal(app.owner, 'rfeng');
            t.equal(app.name, 'MyApp2');
            t.equal(app.description, 'My second mobile application');
            t(app.clientKey);
            t(app.javaScriptKey);
            t(app.restApiKey);
            t(app.windowsKey);
            t(app.masterKey);

            t(app.clientKey !== registeredApp.clientKey);
            t(app.javaScriptKey !== registeredApp.javaScriptKey);
            t(app.restApiKey !== registeredApp.restApiKey);
            t(app.windowsKey !== registeredApp.windowsKey);
            t(app.masterKey !== registeredApp.masterKey);

            t(app.created);
            t(app.modified);
            registeredApp = app;
            done(err, result);
        });
    });


    it('Authenticate with application id & clientKey', function (done) {
        Application.authenticate(registeredApp.id, registeredApp.clientKey,
            function (err, result) {
                t.equal(result.application.id, registeredApp.id);
                t.equal(result.keyType, 'clientKey');
                done(err, result);
            });
    });

    it('Authenticate with application id & javaScriptKey', function (done) {
        Application.authenticate(registeredApp.id, registeredApp.javaScriptKey,
            function (err, result) {
                t.equal(result.application.id, registeredApp.id);
                t.equal(result.keyType, 'javaScriptKey');
                done(err, result);
            });
    });

    it('Authenticate with application id & restApiKey', function (done) {
        Application.authenticate(registeredApp.id, registeredApp.restApiKey,
            function (err, result) {
                t.equal(result.application.id, registeredApp.id);
                t.equal(result.keyType, 'restApiKey');
                done(err, result);
            });
    });

    it('Authenticate with application id & masterKey', function (done) {
        Application.authenticate(registeredApp.id, registeredApp.masterKey,
            function (err, result) {
                t.equal(result.application.id, registeredApp.id);
                t.equal(result.keyType, 'masterKey');
                done(err, result);
            });
    });

    it('Authenticate with application id & windowsKey', function (done) {
        Application.authenticate(registeredApp.id, registeredApp.windowsKey,
            function (err, result) {
                t.equal(result.application.id, registeredApp.id);
                t.equal(result.keyType, 'windowsKey');
                done(err, result);
            });
    });

    it('Fail to authenticate with application id & invalid key', function (done) {
        Application.authenticate(registeredApp.id, 'invalid-key',
            function (err, result) {
                t(!result);
                done(err, result);
            });
    });
});