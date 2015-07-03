"use strict";

var s = require('./../support');
var t = s.t;

describe('User', function () {
    var validCredentials = {email: 'foo@bar.com', password: 'bar'};
    var validCredentialsWithTTL = {email: 'foo@bar.com', password: 'bar', ttl: 3600};
//    var invalidCredentials = {email: 'foo1@bar.com', password: 'bar1'};

    var User, AccessToken;
    var app;

    beforeEach(function (done) {
        app = s.mockApplicationWithDB();
        app.boot(done);
    });

    beforeEach(function (done) {
        User = app.models.User;
        AccessToken = app.models.AccessToken;
        User.create(validCredentials, done);
    });

    afterEach(function (done) {
        s.cleanup(app, done);
    });

    describe('User.create', function () {
        it('Create a new user', function (done) {
            User.create({email: 'f@b.com', password: 'bar'}, function (err, user) {
                t(!err);
                t(user.id);
                t(user.email);
                done();
            });
        });

        it('Username and Email can be both blank', function (done) {
            User.create({password: '123'}, function (err) {
                t.ok(err);
                done();
            });
        });

        it('Requires a valid email', function (done) {
            User.create({email: 'foo@', password: '123'}, function (err) {
                t(err);
                done();
            });
        });

        it('Hashes the given password', function () {
            var u = new User({username: 'foo', password: 'bar'});
            t(u.password !== 'bar');
        });
    });


    describe('User.login', function () {
        it('Login a user by providing credentials', function (done) {
            User.login(validCredentials, function (err, accessToken) {
                t(accessToken.userId);
                t(accessToken.token);
                t.equal(accessToken.token.length, 64);

                done();
            });
        });

        it('Login a user by providing credentials with TTL', function (done) {
            User.login(validCredentialsWithTTL, function (err, accessToken) {
                t(accessToken.userId);
                t(accessToken.token);
                t.equal(accessToken.ttl, validCredentialsWithTTL.ttl);
                t.equal(accessToken.token.length, 64);

                done();
            });
        });

        it('Login a user using a custom createAccessToken', function (done) {
            var createToken = User.prototype.createAccessToken; // Save the original method
            // Override createAccessToken
            User.prototype.createAccessToken = function (ttl, cb) {
                // Reduce the ttl by half for testing purpose
                this.accessTokens.create({ttl: ttl / 2 }, cb);
            };
            User.login(validCredentialsWithTTL, function (err, accessToken) {
                t(accessToken.userId);
                t(accessToken.token);
                t.equal(accessToken.ttl, 1800);
                t.equal(accessToken.token.length, 64);

                User.findById(accessToken.userId, function (err, user) {
                    user.createAccessToken(120, function (err, accessToken) {
                        t(accessToken.userId);
                        t(accessToken.token);
                        t.equal(accessToken.ttl, 60);
                        t.equal(accessToken.token.length, 64);
                        // Restore create access token
                        User.prototype.createAccessToken = createToken;
                        done();
                    });
                });
            });
        });
    });

    describe('User.logout', function() {
        function verify(token, done) {
            t(token);

            return function (err) {
                if(err) return done(err);

                AccessToken.findByToken(token, function (err, accessToken) {
                    t(!accessToken, 'accessToken should not exist after logging out');
                    done(err);
                });
            }
        }

        it('Logout a user by providing the current accessToken id (using node)', function (done) {
            login(logout);

            function login(fn) {
                User.login({email: 'foo@bar.com', password: 'bar'}, fn);
            }

            function logout(err, accessToken) {
                User.logout(accessToken.token, verify(accessToken.token, done));
            }
        });

        it('Logout a user by providing the current accessToken id (over handler)', function(done) {
            login(logout);
            function login(fn) {
                app.rekuest('user.login')
                    .payload({email: 'foo@bar.com', password: 'bar'})
                    .send(function (err, accessToken) {
                        if(err) return done(err);

                        t(accessToken.userId);
                        t(accessToken.token);

                        fn(null, accessToken);
                    });
            }

            function logout(err, accessToken) {
                app.rekuest('user.logout')
                    .prop('accessToken', accessToken)
                    .send(verify(accessToken.token, done));
            }
        });

    });


    describe('user.validatePassword(password, cb)', function(){
        it('Determine if the password matches the stored password', function(done) {
            var u = new User({username: 'foo', password: 'bar'});
            u.validatePassword('bar', function (err, isMatch) {
                t(isMatch, 'password does not match');
                done();
            });
        });

        it('should match a password when saved', function(done) {
            var u = new User({username: 'a', password: 'b', email: 'z@z.net'});

            u.save(function (err, user) {
                User.findById(user.id, function (err, uu) {
                    uu.validatePassword('b', function (err, isMatch) {
                        t(isMatch);
                        done();
                    });
                });
            });
        });

        it('should match a password after it is changed', function(done) {
            User.create({email: 'foo@baz.net', username: 'bat', password: 'baz'}, function (err, user) {
                User.findById(user.id, function (err, foundUser) {
                    t(foundUser);
                    foundUser.validatePassword('baz', function (err, isMatch) {
                        t(isMatch);
                        foundUser.password = 'baz2';
                        foundUser.save(function (err, updatedUser) {
                            updatedUser.validatePassword('baz2', function (err, isMatch) {
                                t(isMatch);
                                User.findById(user.id, function (err, uu) {
                                    uu.validatePassword('baz2', function (err, isMatch) {
                                        t(isMatch);
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });


    describe('Verification', function(){
        // TODO
//        describe('user.verify(options, fn)', function(){
//            it('Verify a user\'s email address', function(done) {
//                User.afterRemote('create', function(ctx, user, next) {
//                    t(user, 'afterRemote should include result');
//
//                    var options = {
//                        type: 'email',
//                        to: user.email,
//                        from: 'noreply@myapp.org',
//                        redirect: '/',
//                        protocol: ctx.req.protocol,
//                        host: ctx.req.get('host')
//                    };
//
//                    user.verify(options, function (err, result) {
//                        t(result.email);
//                        t(result.email.message);
//                        t(result.token);
//
//
//                        t(~result.email.message.indexOf('To: bar@bat.com'));
//                        done();
//                    });
//                });
//
//                request(app)
//                    .post('/users')
//                    .expect('Content-Type', /json/)
//                    .expect(200)
//                    .send({email: 'bar@bat.com', password: 'bar'})
//                    .end(function(err, res){
//                        if(err) return done(err);
//                    });
//            });
//        });
//
//        describe('User.confirm(options, fn)', function(){
//            it('Confirm a user verification', function(done) {
//                User.afterRemote('create', function(ctx, user, next) {
//                    t(user, 'afterRemote should include result');
//
//                    var options = {
//                        type: 'email',
//                        to: user.email,
//                        from: 'noreply@myapp.org',
//                        redirect: 'http://foo.com/bar',
//                        protocol: ctx.req.protocol,
//                        host: ctx.req.get('host')
//                    };
//
//                    user.verify(options, function (err, result) {
//                        if(err) return done(err);
//
//                        request(app)
//                            .get('/users/confirm?uid=' + result.uid + '&token=' + encodeURIComponent(result.token) + '&redirect=' + encodeURIComponent(options.redirect))
//                            .expect(302)
//                            .expect('location', options.redirect)
//                            .end(function(err, res){
//                                if(err) return done(err);
//                                done();
//                            });
//                    });
//                });
//
//                request(app)
//                    .post('/users')
//                    .expect('Content-Type', /json/)
//                    .expect(302)
//                    .send({email: 'bar@bat.com', password: 'bar'})
//                    .end(function(err, res){
//                        if(err) return done(err);
//                    });
//            });
//        });
    });

    describe('Password Reset', function () {
        describe('User.resetPassword(options, cb)', function () {
            it('Creates a temp accessToken to allow a user to change password', function (done) {
                var email = 'foo@bar.com';

                User.resetPassword({
                    email: email
                }, function (err, info) {
                    t(!err);
                    t(info.email);
                    t(info.accessToken);
                    t(info.accessToken.token);
                    t.equal(info.accessToken.ttl / 60, 15);
                    info.accessToken.user(function (err, user) {
                        t.equal(user.email, email);
                        done();
                    });
                });
            });
        });
    });

});