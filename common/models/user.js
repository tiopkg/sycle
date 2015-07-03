"use strict";

var debug = require('debug')('sycle:model:user');
var validator = require('validator');
var bcrypt = require('bcryptjs');

var SALT_WORK_FACTOR = 10;
var DEFAULT_TTL = 1209600; // 2 weeks in seconds
var DEFAULT_RESET_PW_TTL = 15 * 60;// 15 mins in seconds
var DEFAULT_MAX_TTL = 31556926; // 1 year in second

module.exports = function (User, app) {
    var ACL = app.model('ACL');
    var Role = app.model('Role');

    // max ttl
    User.settings.maxTTL = User.settings.maxTTL || DEFAULT_MAX_TTL;
    User.settings.ttl = DEFAULT_TTL;


    User.validatesUniquenessOf('email', {allowNull: true, allowBlank: true, message: 'Email already exists'});
    User.validatesUniquenessOf('username',  {allowNull: true, allowBlank: true, message: 'User already exists'});

    User.validate('email', emailValidator, {message: 'Invalid email'});

    User.setter.password = function (plain) {
        var salt = bcrypt.genSaltSync(this.constructor.settings.saltWorkFactor || SALT_WORK_FACTOR);
        this.__data.password = bcrypt.hashSync(plain, salt);
    };

    User.hook('beforeUpdate', function (data) {
        data.nickname = data.nickname || data.username;
        data.updated = new Date();
    });


    /**
     * Create access token for the logged in user. This method can be overridden to
     * customize how access tokens are generated
     *
     * @param {Number} [ttl] The requested ttl
     * @param {Function} cb The callback function (err, token)
     */
    User.prototype.createAccessToken = function (ttl, cb) {
        var Clazz = this.constructor;
        ttl = Math.min(ttl || Clazz.settings.ttl, Clazz.settings.maxTTL);
        this.accessTokens.create({
            ttl: ttl
        }, function (err, data) {
            cb && cb(err, data);
        });

    };


    /**
     * Login a user by with the given `credentials`.
     *
     * ```js
     *    User.login({username: 'foo', password: 'bar'}, function (err, token) {
 *      console.log(token.id);
 *    });
     * ```
     *
     * @param {Object} credentials
     * @param {String} [include] `user`
     * @param {Function} cb (err, token)
     */

    User.login = function (credentials, include, cb) {
        var self = this;

        if (typeof include === 'function') {
            cb = include;
            include = null;
        }

        include = (include || '').toLowerCase();

        var query = {};
        if (credentials.email) {
            query.email = credentials.email;
        } else if (credentials.username) {
            query.username = credentials.username;
        } else {
            var err = new Error('username or email is required');
            err.statusCode = 400;
            return cb(err);
        }

        self.findOne({where: query}, function (err, user) {
            var defaultError = new Error('login failed');
            defaultError.statusCode = 401;

            if (err) {
                debug('An error is reported from User.findOne: %j', err);
                cb(defaultError);
            } else if (user) {
                user.validatePassword(credentials.password, function (err, isMatch) {
                    if (err) {
                        debug('An error is reported from User.validatePassword: %j', err);
                        cb(defaultError);
                    } else if (isMatch) {
                        user.createAccessToken(credentials.ttl, function (err, token) {
                            if (err) return cb(err);
                            if (include === 'user') {
                                // NOTE We can't set token.user here:
                                //  1. token.user already exists, it's a function injected by
                                //     "AccessToken belongsTo User" relation
                                //  2. Model.toJSON() ignores own properties, thus
                                //     the value won't be included in the HTTP response
                                token.__cachedRelations.user = user;
                            }
                            cb(err, token);
                        });
                    } else {
                        debug('The password is invalid for user %s', query.email || query.username);
                        cb(defaultError);
                    }
                });
            } else {
                debug('No matching record is found for user %s', query.email || query.username);
                cb(defaultError);
            }
        });
    };

    /**
     * Logout a user with the given accessToken id.
     *
     * ```js
     *    User.logout('asd0a9f8dsj9s0s3223mk', function (err) {
 *      console.log(err || 'Logged out');
 *    });
     * ```
     *
     * @param {String} token
     * @param {Function} cb (err)
     */

    User.logout = function (token, cb) {
        this.relations.accessTokens.modelTo.findByToken(token, function (err, accessToken) {
            if (err) return cb(err);
            if (accessToken) return accessToken.destroy(cb);
            cb(new Error('Could not find accessToken ' + token));
        });
    };

    /**
     * Compare the given `password` with the users hashed password.
     *
     * @param {String} password The plain text password
     * @param {Function} cb (err, isMatch)
     */
    User.prototype.hasPassword =
    User.prototype.validatePassword = function (password, cb) {
        if (this.password && password) {
            bcrypt.compare(password, this.password, function (err, isMatch) {
                if (err) return cb(err);
                cb(null, isMatch);
            });
        } else {
            cb(null, false);
        }
    };


    /**
     * Create a short lived acess token for temporary login. Allows users
     * to change passwords if forgotten.
     *
     * @param {Object} options
     * @param {String} [options.email] The user's email address
     * @param {Function} cb (err, ingo)
     */

    User.resetPassword = function (options, cb) {
        var Clazz = this;
        var ttl = Clazz.settings.resetPasswordTokenTTL || DEFAULT_RESET_PW_TTL;

        options = options || {};
        if (typeof options.email === 'string') {
            Clazz.findOne({ where: {email: options.email} }, function (err, user) {
                if (err) {
                    cb(err);
                } else if (user) {
                    // create a short lived access token for temp login to change password
                    // TODO - eventually this should only allow password change
                    user.accessTokens.create({ttl: ttl}, function (err, accessToken) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, {
                                email: options.email,
                                accessToken: accessToken,
                                user: user
                            });
                        }
                    })
                } else {
                    cb();
                }
            });
        } else {
            var err = new Error('email is required');
            err.statusCode = 400;

            cb(err);
        }
    };

    User.expose('login', {
        accepts: [
            {arg: 'credentials', type: 'object', required: true, source: 'body'},
            {arg: 'include', type: 'string', description: 'Related objects to include in the response. ' +
                'See the description of return value for more details.'}
        ],
        returns: {
            arg: 'accessToken', type: 'object', root: true, description:
                'The response body contains properties of the AccessToken created on login.\n' +
                'Depending on the value of `include` parameter, the body may contain ' +
                'additional properties:\n\n' +
                '  - `user` - `{User}` - Data of the currently logged in user. (`include=user`)\n\n'
        },
        http: {verb: 'post'}
    });

    User.expose('logout', {
        accepts: [
            {arg: 'access_token', type: 'string', required: true, source: function (ctx) {
                var req = ctx && ctx.request;
                var accessToken = req && (req.accessToken || req.token);
                return accessToken && accessToken.token;
            }, description: 'Do not supply this argument, it is automatically extracted ' +
                'from request.'
            }
        ],
        http: {verb: 'all'}
    });

//    User.expose('confirm', {
//        accepts: [
//            {arg: 'uid', type: 'string', required: true},
//            {arg: 'token', type: 'string', required: true}
//        ],
//        http: {verb: 'get', path: '/confirm'}
//    });

    User.expose('resetPassword', {
        accepts: [
            {arg: 'options', type: 'object', required: true, source: 'body'}
        ],
        http: {verb: 'post', path: '/reset'}
    });

};

function emailValidator(err) {
    if (this.email && this.email.length > 0 && !validator.isEmail(this.email)) err();
}