"use strict";

var cancelify = require('cancelify');
var delegate = require('delegates');

module.exports = Context;

function Context(req) {
    this.req = this.request = req;
    if (req) req.ctx = req.context = this;

    this.deferred = cancelify();
    this.future = this.deferred.future();
}

/**
 * Throw an error with `msg` and optional `status`
 * defaulting to 500. Note that these are user-level
 * errors, and the message may be exposed to the client.
 *
 *    this.throw(403)
 *    this.throw('name required', 400)
 *    this.throw(400, 'name required')
 *    this.throw('something exploded')
 *    this.throw(new Error('invalid'), 400);
 *    this.throw(400, new Error('invalid'));
 *
 * @param {String|Number|Error} msg err, msg or status
 * @param {String|Number|Error} status err, msg or status
 * @api public
 */

Context.prototype.throw = function (msg, status) {
    if ('number' == typeof msg) {
        var tmp = msg;
        msg = status;// || http.STATUS_CODES[tmp];
        status = tmp;
    }

    var err = msg instanceof Error ? msg : new Error(msg);
    err.status = status || err.status || 500;
    err.expose = err.status < 500;
    throw err;
};

delegate(Context.prototype, 'req')
    .getter('uri')
    .getter('payload');
