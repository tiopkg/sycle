"use strict";

var uid = require('uid2');
var assert = require('assert');

var DEFAULT_TOKEN_LEN = 64;

module.exports = function (AccessToken) {


    /**
     * Anonymous Token
     *
     * ```js
     * assert(AccessToken.ANONYMOUS.id === '$anonymous');
     * ```
     */

    AccessToken.ANONYMOUS = new AccessToken({id: '$anonymous'});

    /**
     * Create a cryptographically random access token id.
     *
     * @param {Function} cb callback (err, token)
     */

    AccessToken.createAccessTokenId = function (cb) {
        uid(this.settings.accessTokenIdLength || DEFAULT_TOKEN_LEN, function (err, guid) {
            err ? cb(err) : cb(err, guid);
        });
    };

    /*!
     * Hook to create accessToken id.
     */

    AccessToken.hook('beforeCreate', function (data, next) {
        data = data || {};

        if (data.id) return next();

        AccessToken.createAccessTokenId(function (err, id) {
            if (err) return next(err);
            data.id = id;
            next();
        });
    });

    /**
     * Find and validate a token for the given `id`.
     *
     * @param {String} id
     * @param {Function} cb (err, token)
     */
    AccessToken.findForId = function (id, cb) {
        if (id) {
            this.findById(id, function (err, token) {
                if (err) return cb(err);
                if (!token) return cb();
                token.validate(function (err, isValid) {
                    if (err) return cb(err);
                    if (isValid) return cb(null, token);
                    var e = new Error('Invalid Access Token');
                    e.status = e.statusCode = 401;
                    cb(e);
                });
            });
        } else {
            process.nextTick(function () {
                cb();
            });
        }
    };

    /**
     * Validate the token.
     *
     * @callback {Function} cb (err, isValid)
     */
    AccessToken.prototype.validate = function (cb) {
        try {
            assert(this.created && typeof this.created.getTime === 'function', 'token.created must be a valid Date');
            assert(this.ttl !== 0, 'token.ttl must be not be 0');
            assert(this.ttl, 'token.ttl must exist');
            assert(this.ttl >= -1, 'token.ttl must be >= -1');

            var now = Date.now();
            var created = this.created.getTime();
            var elapsedSeconds = (now - created) / 1000;
            var secondsToLive = this.ttl;
            var isValid = elapsedSeconds < secondsToLive;

            if (isValid) {
                cb(null, isValid);
            } else {
                this.destroy(function (err) {
                    cb(err, isValid);
                });
            }
        } catch (e) {
            cb(e);
        }
    };

};