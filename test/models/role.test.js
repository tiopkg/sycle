"use strict";

var s = require('./../support');
var t = s.t;

describe('Role', function () {

    describe('model', function () {

        var app;
        var User, Role, RoleMapping;

        beforeEach(function (done) {
            app = s.mockApplicationWithDB();
            app.boot(function (err) {
                User = app.models.User;
                Role = app.models.Role;
                RoleMapping = app.models.RoleMapping;
                done(err);
            })
        });

        beforeEach(function (done) {
            s.cleanup(app, done);
        });

        afterEach(function (done) {
            s.cleanup(app, done);
        });

        it("should define role/role relations", function (done) {
            Role.create({name: 'user'}, function (err, userRole) {
                Role.create({name: 'admin'}, function (err, adminRole) {
                    userRole.principals.create({principalType: RoleMapping.ROLE, principalId: adminRole.id}, function (err, mapping) {
                        var check = t.plan(4, done);
                        Role.all(function (err, roles) {
                            t.equal(roles.length, 2);
                            check();
                        });
                        RoleMapping.all(function (err, mappings) {
                            t.equal(mappings.length, 1);
                            t.equal(mappings[0].principalType, RoleMapping.ROLE);
                            t.equal(mappings[0].principalId, adminRole.id);
                            check();
                        });
                        userRole.principals(function (err, principals) {
                            t.equal(principals.length, 1);
                            check();
                        });
                        userRole.roles(function (err, roles) {
                            t.equal(roles.length, 1);
                            check();
                        });
                    });
                });
            });
        });


        it("should define role/user relations", function (done) {

            User.create({name: 'Raymond', email: 'x@y.com', password: 'foobar'}, function (err, user) {
//                console.log('User: ', user.id);
                t(user.id);
                Role.create({name: 'userRole'}, function (err, role) {
                    role.principals.create({principalType: RoleMapping.USER, principalId: user.id}, function (err, p) {
                        var check = t.plan(3, done);
                        Role.all(function (err, roles) {
                            t(!err);
                            t.equal(roles.length, 1);
                            t.equal(roles[0].name, 'userRole');
                            check();
                        });
                        role.principals(function (err, principals) {
                            t(!err);
                            // console.log(principals);
                            t.equal(principals.length, 1);
                            t.equal(principals[0].principalType, RoleMapping.USER);
                            t.equal(principals[0].principalId, user.id);
                            check();
                        });
                        role.users(function (err, users) {
                            t(!err);
                            t.equal(users.length, 1);
                            t.equal(users[0].principalType, RoleMapping.USER);
                            t.equal(users[0].principalId, user.id);
                            check();
                        });
                    });
                });
            });
        });


        it("should automatically generate role id", function (done) {

            User.create({name: 'Raymond', email: 'x@y.com', password: 'foobar'}, function (err, user) {
//                console.log('User: ', user.id);
                t(user.id);
                Role.create({name: 'userRole'}, function (err, role) {
                    t(role.id);
                    role.principals.create({principalType: RoleMapping.USER, principalId: user.id}, function (err, p) {
                        var check = t.plan(3, done);
                        t(p.id);
                        t.equal(p.roleId, role.id);
                        Role.all(function (err, roles) {
                            t(!err);
                            t.equal(roles.length, 1);
                            t.equal(roles[0].name, 'userRole');
                            check();
                        });
                        role.principals(function (err, principals) {
                            t(!err);
                            // console.log(principals);
                            t.equal(principals.length, 1);
                            t.equal(principals[0].principalType, RoleMapping.USER);
                            t.equal(principals[0].principalId, user.id);
                            check();
                        });
                        role.users(function (err, users) {
                            t(!err);
                            t.equal(users.length, 1);
                            t.equal(users[0].principalType, RoleMapping.USER);
                            t.equal(users[0].principalId, user.id);
                            check();
                        });
                    });
                });
            });

        });

        it("should support getRoles() and isInRole()", function (done) {
            User.create({name: 'Raymond', email: 'x@y.com', password: 'foobar'}, function (err, user) {
//                console.log('User: ', user.id);
                t(user.id);
                Role.create({name: 'userRole'}, function (err, role) {
                    role.principals.create({principalType: RoleMapping.USER, principalId: user.id}, function (err, p) {
                        var check = t.plan(7, done);
                        Role.isInRole('userRole', {principalType: RoleMapping.USER, principalId: user.id}, function (err, exists) {
                            t.notOk(err);
                            t.ok(exists);
                            check();
                        });

                        Role.isInRole('userRole', {principalType: RoleMapping.APP, principalId: user.id}, function (err, exists) {
                            t.notOk(err);
                            t.notOk(exists);
                            check();
                        });

                        Role.isInRole('userRole', {principalType: RoleMapping.USER, principalId: 100}, function (err, exists) {
                            t.notOk(err);
                            t.notOk(exists);
                            check();
                        });

                        Role.getRoles({principalType: RoleMapping.USER, principalId: user.id}, function (err, roles) {
                            t.equal(roles.length, 3); // everyone, authenticated, userRole
                            t(roles.indexOf(role.id) >= 0);
                            t(roles.indexOf(Role.EVERYONE) >= 0);
                            t(roles.indexOf(Role.AUTHENTICATED) >= 0);
                            check();
                        });
                        Role.getRoles({principalType: RoleMapping.APP, principalId: user.id}, function (err, roles) {
                            t.equal(roles.length, 2);
                            t(roles.indexOf(Role.EVERYONE) >= 0);
                            t(roles.indexOf(Role.AUTHENTICATED) >= 0);
                            check();
                        });
                        Role.getRoles({principalType: RoleMapping.USER, principalId: 100}, function (err, roles) {
                            t.equal(roles.length, 2);
                            t(roles.indexOf(Role.EVERYONE) >= 0);
                            t(roles.indexOf(Role.AUTHENTICATED) >= 0);
                            check();
                        });
                        Role.getRoles({principalType: RoleMapping.USER, principalId: null}, function (err, roles) {
                            t.equal(roles.length, 2);
                            t(roles.indexOf(Role.EVERYONE) >= 0);
                            t(roles.indexOf(Role.UNAUTHENTICATED) >= 0);
                            check();
                        });
                    });
                });
            });
        });
    });

    describe('Resource', function () {

        var app;
        var User, Role, ACL, Album;

        beforeEach(function (done) {
            app = s.mockApplicationWithDB();
            app.registry.define('Album', {
                properties: {
                    name: String,
                    userId: String
                },
                relations: {
                    user: {
                        type: 'belongsTo',
                        model: 'User',
                        foreignKey: 'userId'
                    }
                }
            });
            app.boot(function (err) {
                User = app.model('User');
                Role = app.model('Role');
                ACL = app.model('ACL');
                Album = app.model('Album');
                done(err);
            });
        });

        afterEach(function (done) {
            s.cleanup(app, done);
        });

        it("should support owner role resolver", function (done) {
            var check = t.plan(8, done);
            User.create({name: 'Raymond', email: 'x@y.com', password: 'foobar'}, function (err, user) {
                Role.isInRole(Role.AUTHENTICATED, {principalType: ACL.USER, principalId: user.id}, function (err, yes) {
                    t(!err && yes);
                    check();
                });
                Role.isInRole(Role.AUTHENTICATED, {principalType: ACL.USER, principalId: null}, function (err, yes) {
                    t(!err && !yes);
                    check();
                });

                Role.isInRole(Role.UNAUTHENTICATED, {principalType: ACL.USER, principalId: user.id}, function (err, yes) {
                    t(!err && !yes);
                    check();
                });
                Role.isInRole(Role.UNAUTHENTICATED, {principalType: ACL.USER, principalId: null}, function (err, yes) {
                    t(!err && yes);
                    check();
                });

                Role.isInRole(Role.EVERYONE, {principalType: ACL.USER, principalId: user.id}, function (err, yes) {
                    t(!err && yes);
                    check();
                });

                Role.isInRole(Role.EVERYONE, {principalType: ACL.USER, principalId: null}, function (err, yes) {
                    t(!err && yes);
                    check();
                });

                // console.log('User: ', user.id);
                Album.create({name: 'Album 1', userId: user.id}, function (err, album1) {
                    Role.isInRole(Role.OWNER, {principalType: ACL.USER, principalId: user.id, model: Album, id: album1.id}, function (err, yes) {
                        t(!err && yes);
                        check();
                    });
                    Album.create({name: 'Album 2'}, function (err, album2) {
                        Role.isInRole(Role.OWNER, {principalType: ACL.USER, principalId: user.id, model: Album, id: album2.id}, function (err, yes) {
                            t(!err && !yes);
                            check();
                        });
                    });
                });
            });
        });
    });

});