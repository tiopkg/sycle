"use strict";

var _ = require('lodash');

/**
 * Database initialization phase.
 *
 * @examples
 *
 * app.phase(app.boot.database({ driver: 'redis' });
 *
 * app.phase(app.boot.database({
 *      mysql: {
 *          driver: 'mysql',
 *          models: ['User', 'Role'...]
 *      },
 *      redis: {
 *          driver: 'redis',
 *          models: ['User', 'Role'...]
 *      }
 *  });
 *
 * @param settings database connection settings.
 * @returns {Function}
 */

module.exports = function (settings) {

    return function database(done) {
        var schemas = this.registry.build(settings);

        this.emit('models', this.models, this);

        if (settings && settings.autoupdate) {
            this.once('after boot', function () {
                _.forEach(schemas, function (s) {
                    s.autoupdate(function (err) {
                        if (err) return done(err);
                        if (s.backyard) {
                            s.backyard.log = s.log;
                            s.backyard.autoupdate(done);
                        } else {
                            return done();
                        }
                    });
                });
            });
        } else {
            done();
        }
    }
};



