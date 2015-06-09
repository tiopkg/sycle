var sycle = require('../');
var s = require('./support');
var t = s.t;

describe('boot-with-builtin-models', function () {

    it('should load module resources', function (done) {
        var app = sycle({loadBuiltinModels: true});
        app.phase(sycle.boot.database());
        app.boot(function (err) {
            if (err) throw err;
            t.ok(app.models.User);
            done(err);
        });

    });

});