"use strict";
var sycle = require('../../../');
var authorizer = require('../../../').authorizer;

module.exports = function (cb) {
    var sapp = sycle({loadBuiltinModels: true});
    sapp.phase(sycle.boot.module(__dirname));
    sapp.phase(sycle.boot.database());
    sapp.phase(function () {
        sapp.use(sapp.dispatcher);
        sapp.use(function (ctx) {
            if (!ctx.handled) throw new Error('Unhandled request ' + ctx.request.uri);
        });
    });
    sapp.phase(authorizer);

    sapp.boot(cb);
    return sapp;
};

