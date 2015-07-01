"use strict";

var _ = require('lodash');
var s = require('./../support');
var t = s.t;
var sec = require('../../').security;

function checkResult(done) {
    return function (err, result) {
        t(!err);
        done && done();
    }
}

describe('Security Scopes', function () {
    var app;
    var ACL, Role, RoleMapping, User, Scope;
    var testModel;

    beforeEach(function (done) {
        app = s.mockApplicationWithDB();
        app.registry.define('testModel');
        app.boot(function () {
            ACL = app.model('ACL');
            Role = app.model('Role');
            RoleMapping = app.model('RoleMapping');
            User = app.model('User');
            Scope = app.model('Scope');
            testModel = app.model('testModel');
            done();
        });

    });

    afterEach(function (done) {
        s.cleanup(app, done);
    });

    it("should allow access to models for the given scope by wildcard", function (done) {
        var check = t.plan(3, done);
        Scope.create({name: 'userScope', description: 'access user information'}, function (err, scope) {
            ACL.create({principalType: ACL.SCOPE, principalId: scope.id, model: 'User', property: ACL.ALL,
                    accessType: ACL.ALL, permission: ACL.ALLOW},
                function (err, resource) {
                    Scope.checkPermission('userScope', 'User', ACL.ALL, ACL.ALL, checkResult(check));
                    Scope.checkPermission('userScope', 'User', 'name', ACL.ALL, checkResult(check));
                    Scope.checkPermission('userScope', 'User', 'name', ACL.READ, checkResult(check));
                });
        });

    });

    it("should allow access to models for the given scope", function (done) {
        var check = t.plan(4, done);
        Scope.create({name: 'testModelScope', description: 'access testModel information'}, function (err, scope) {
            ACL.create({principalType: ACL.SCOPE, principalId: scope.id,
                    model: 'testModel', property: 'name', accessType: ACL.READ, permission: ACL.ALLOW},
                function (err, resource) {
                    ACL.create({principalType: ACL.SCOPE, principalId: scope.id,
                            model: 'testModel', property: 'name', accessType: ACL.WRITE, permission: ACL.DENY},
                        function (err, resource) {
                            // console.log(resource);
                            Scope.checkPermission('testModelScope', 'testModel', ACL.ALL, ACL.ALL, function (err, perm) {
                                t.equal(perm.permission, ACL.DENY); // because name.WRITE == DENY
                                check();
                            });
                            Scope.checkPermission('testModelScope', 'testModel', 'name', ACL.ALL, function (err, perm) {
                                t.equal(perm.permission, ACL.DENY); // because name.WRITE == DENY
                                check();
                            });
                            Scope.checkPermission('testModelScope', 'testModel', 'name', ACL.READ, function (err, perm) {
                                t.equal(perm.permission, ACL.ALLOW);
                                check();
                            });
                            Scope.checkPermission('testModelScope', 'testModel', 'name', ACL.WRITE, function (err, perm) {
                                t.equal(perm.permission, ACL.DENY);
                                check();
                            });
                        });
                });
        });
    });
});

describe('Security ACLs', function () {
    var app;
    var ACL, Role, RoleMapping, User, Scope, Customer;
    beforeEach(function (done) {
        app = s.mockApplicationWithDB();

        app.registry.define('Customer', {
            properties: {
                name: {
                    type: String,
                    acls: [
                        {principalType: sec.USER, principalId: 'u001', accessType: sec.WRITE, permission: sec.DENY},
                        {principalType: sec.USER, principalId: 'u001', accessType: sec.ALL, permission: sec.ALLOW}
                    ]
                }
            },
            settings: {
                acls: [
                    {principalType: sec.USER, principalId: 'u001', accessType: sec.ALL, permission: sec.ALLOW}
                ]
            }
        });

        app.boot(function () {
            ACL = app.model('ACL');
            Role = app.model('Role');
            RoleMapping = app.model('RoleMapping');
            User = app.model('User');
            Scope = app.model('Scope');
            Customer = app.model('Customer');
            done();
        });
    });

    afterEach(function (done) {
        s.cleanup(app, done);
    });


    it('should order ACL entries based on the matching score', function () {
        var acls = [
            {
                "model": "account",
                "accessType": "*",
                "permission": "DENY",
                "principalType": "ROLE",
                "principalId": "$everyone"
            },
            {
                "model": "account",
                "accessType": "*",
                "permission": "ALLOW",
                "principalType": "ROLE",
                "principalId": "$owner"
            },
            {
                "model": "account",
                "accessType": "READ",
                "permission": "ALLOW",
                "principalType": "ROLE",
                "principalId": "$everyone"
            }
        ];
        var req = {
            model: 'account',
            property: 'find',
            accessType: 'WRITE'
        };

        acls = acls.map(function (a) {
            return new ACL(a)
        });

        var perm = ACL.resolvePermission(acls, req);
        t.deepEqual(_.clone(perm), { // remove perm prototype data
            model: 'account',
            property: 'find',
            accessType: 'WRITE',
            permission: 'ALLOW',
            methodNames: []
        });
    });

    it("should allow access to models for the given principal by wildcard", function (done) {
        var check = t.plan(2, done);
        ACL.create({principalType: ACL.USER, principalId: 'u001', model: 'User', property: ACL.ALL,
            accessType: ACL.ALL, permission: ACL.ALLOW}, function (err, acl) {

            ACL.create({principalType: ACL.USER, principalId: 'u001', model: 'User', property: ACL.ALL,
                accessType: ACL.READ, permission: ACL.DENY}, function (err, acl) {

                ACL.checkPermission(ACL.USER, 'u001', 'User', 'name', ACL.READ, function (err, perm) {
                    t(perm.permission === ACL.DENY);
                    check();
                });

                ACL.checkPermission(ACL.USER, 'u001', 'User', 'name', ACL.ALL, function (err, perm) {
                    t(perm.permission === ACL.DENY);
                    check();
                });

            });

        });

    });

    it("should allow access to models by exception", function (done) {
        var check = t.plan(4, done);
        ACL.create({principalType: ACL.USER, principalId: 'u001', model: 'testModel', property: ACL.ALL,
            accessType: ACL.ALL, permission: ACL.DENY}, function (err, acl) {

            ACL.create({principalType: ACL.USER, principalId: 'u001', model: 'testModel', property: ACL.ALL,
                accessType: ACL.READ, permission: ACL.ALLOW}, function (err, acl) {

                ACL.checkPermission(ACL.USER, 'u001', 'testModel', 'name', ACL.READ, function (err, perm) {
                    t(perm.permission === ACL.ALLOW);
                    check();
                });

                ACL.checkPermission(ACL.USER, 'u001', 'testModel', ACL.ALL, ACL.READ, function (err, perm) {
                    t(perm.permission === ACL.ALLOW);
                    check();
                });

                ACL.checkPermission(ACL.USER, 'u001', 'testModel', 'name', ACL.WRITE, function (err, perm) {
                    t(perm.permission === ACL.DENY);
                    check();
                });

                ACL.checkPermission(ACL.USER, 'u001', 'testModel', 'name', ACL.ALL, function (err, perm) {
                    t(perm.permission === ACL.DENY);
                    check();
                });

            });

        });

    });

    it("should honor defaultPermission from the model", function (done) {
        var check = t.plan(3, done);

        Customer.settings.defaultPermission = ACL.DENY;

        ACL.checkPermission(ACL.USER, 'u001', 'Customer', 'name', ACL.WRITE, function (err, perm) {
            t(perm.permission === ACL.DENY);
            check();
        });

        ACL.checkPermission(ACL.USER, 'u001', 'Customer', 'name', ACL.READ, function (err, perm) {
            t(perm.permission === ACL.ALLOW);
            check();
        });

        ACL.checkPermission(ACL.USER, 'u002', 'Customer', 'name', ACL.WRITE, function (err, perm) {
            t(perm.permission === ACL.DENY);
            check();
        });

    });

    it("should honor static ACLs from the model", function (done) {
        var check = t.plan(3, done);

        ACL.checkPermission(ACL.USER, 'u001', 'Customer', 'name', ACL.WRITE, function (err, perm) {
            t(perm.permission === ACL.DENY);
            check();
        });

        ACL.checkPermission(ACL.USER, 'u001', 'Customer', 'name', ACL.READ, function (err, perm) {
            t(perm.permission === ACL.ALLOW);
            check();
        });

        ACL.checkPermission(ACL.USER, 'u001', 'Customer', 'name', ACL.ALL, function (err, perm) {
            t(perm.permission === ACL.ALLOW);
            check();
        });

    });
//
//    it("should check access against LDL, ACL, and Role", function (done) {
//        var check = t.plan(2, done);
//        // var log = console.log;
//        var log = function() {};
//
//        // Create
//        User.create({name: 'Raymond', email: 'x@y.com', password: 'foobar'}, function (err, user) {
//
//            log('User: ', user.toObject());
//
//            var userId = user.id;
//
//            // Define a model with static ACLs
//            var Customer = ds.createModel('Customer', {
//                name: {
//                    type: String,
//                    acls: [
//                        {principalType: ACL.USER, principalId: userId, accessType: ACL.WRITE, permission: ACL.DENY},
//                        {principalType: ACL.USER, principalId: userId, accessType: ACL.ALL, permission: ACL.ALLOW}
//                    ]
//                }
//            }, {
//                acls: [
//                    {principalType: ACL.USER, principalId: userId, accessType: ACL.ALL, permission: ACL.ALLOW}
//                ],
//                defaultPermission: 'DENY'
//            });
//
//            ACL.create({principalType: ACL.USER, principalId: userId, model: 'Customer', property: ACL.ALL,
//                accessType: ACL.ALL, permission: ACL.ALLOW}, function (err, acl) {
//
//                log('ACL 1: ', acl.toObject());
//
//                Role.create({name: 'MyRole'}, function (err, myRole) {
//                    log('Role: ', myRole.toObject());
//
//                    myRole.principals.create({principalType: RoleMapping.USER, principalId: userId}, function (err, p) {
//
//                        log('Principal added to role: ', p.toObject());
//
//                        ACL.create({principalType: ACL.ROLE, principalId: 'MyRole', model: 'Customer', property: ACL.ALL,
//                            accessType: ACL.READ, permission: ACL.DENY}, function (err, acl) {
//
//                            log('ACL 2: ', acl.toObject());
//
//                            ACL.checkAccessForContext({
//                                principals: [
//                                    {type: ACL.USER, id: userId}
//                                ],
//                                model: 'Customer',
//                                property: 'name',
//                                accessType: ACL.READ
//                            }, function(err, access) {
//                                t(!err && access.permission === ACL.ALLOW);
//                                check();
//                            });
//
//                            ACL.checkAccessForContext({
//                                principals: [
//                                    {type: ACL.ROLE, id: Role.EVERYONE}
//                                ],
//                                model: 'Customer',
//                                property: 'name',
//                                accessType: ACL.READ
//                            }, function(err, access) {
//                                t(!err && access.permission === ACL.DENY);
//                                check();
//                            });
//
//                        });
//                    });
//                });
//            });
//        });
//    });
});

