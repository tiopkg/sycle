"use strict";

var i8n = require('inflection');
var defineScope = require('jugglingdb/lib/scope.js').defineScope;

module.exports = function (/*registry*/) {
    return {
        define: define
    }
};

function define(Model, name, properties, settings) {

    /**
     * Declare hasMany relation
     *
     * @param {Model} anotherClass - class to has many
     * @param {Object} params - configuration {as:, foreignKey:}
     * @example `User.hasMany(Post, {as: 'posts', foreignKey: 'authorId'});`
     */
    Model.hasMany = function hasMany(anotherClass, params) {
        var thisClass = this, thisClassName = this.modelName;
        params = params || {};
        if (typeof anotherClass === 'string') {
            params.as = anotherClass;
            if (params.model) {
                anotherClass = params.model;
            } else {
                var anotherClassName = i8n.singularize(anotherClass).toLowerCase();
                for(var name in this.schema.models) {
                    if (name.toLowerCase() === anotherClassName) {
                        anotherClass = this.schema.models[name];
                    }
                }
            }
        }
        var methodName = params.as ||
            i8n.camelize(i8n.pluralize(anotherClass.modelName), true);
        var fk = params.foreignKey || i8n.camelize(thisClassName + '_id', true);

        this.relations[methodName] = {
            type: 'hasMany',
            keyFrom: 'id',
            keyTo: fk,
            modelTo: anotherClass,
            multiple: true
        };
        // each instance of this class should have method named
        // pluralize(anotherClass.modelName)
        // which is actually just anotherClass.all({where: {thisModelNameId: this.id}}, cb);
        var scopeMethods = {
            find: find,
            destroy: destroy
        };
        if (params.through) {
            var fk2 = params.throughKey || i8n.camelize(anotherClass.modelName + '_id', true);
            scopeMethods.create = function create(data, done) {
                if (typeof data !== 'object') {
                    done = data;
                    data = {};
                }
                if ('function' !== typeof done) {
                    done = function() {};
                }
                var self = this;
                var id = this.id;
                anotherClass.create(data, function(err, ac) {
                    if (err) return done(err, ac);
                    var d = {};
                    d[params.through.relationNameFor(fk)] = self;
                    d[params.through.relationNameFor(fk2)] = ac;
                    params.through.create(d, function(e) {
                        if (e) {
                            ac.destroy(function() {
                                done(e);
                            });
                        } else {
                            done(err, ac);
                        }
                    });
                });
            };
            scopeMethods.add = function(acInst, data, done) {
                if (typeof data === 'function') {
                    done = data;
                    data = {};
                }
                var query = {};
                query[fk] = this.id;
                data[params.through.relationNameFor(fk)] = this;
                query[fk2] = acInst.id || acInst;
                data[params.through.relationNameFor(fk2)] = acInst;
                params.through.findOrCreate({where: query}, data, done);
            };
            scopeMethods.remove = function(acInst, done) {
                var q = {};
                q[fk] = this.id;
                q[fk2] = acInst.id || acInst;
                params.through.findOne({where: q}, function(err, d) {
                    if (err) {
                        return done(err);
                    }
                    if (!d) {
                        return done();
                    }
                    d.destroy(done);
                });
            };
            delete scopeMethods.destroy;
        }
        defineScope(this.prototype, params.through || anotherClass, methodName, function () {
            var filter = {};
            filter.where = {};
            filter.where[fk] = this.id;
            if (params.through) {
                filter.collect = params.throughKey ?
                    params.through.relationNameFor(params.throughKey) :
                    i8n.camelize(anotherClass.modelName, true);
                filter.include = filter.collect;
            }
            return filter;
        }, scopeMethods);

        if (!params.through) {
            // obviously, anotherClass should have attribute called `fk`
            anotherClass.schema.defineForeignKey(anotherClass.modelName, fk, this.modelName);
        }

        function find(id, cb) {
            anotherClass.find(id, function (err, inst) {
                if (err) return cb(err);
                if (!inst) return cb(new Error('Not found'));
                if (inst[fk] && inst[fk].toString() == this.id.toString()) {
                    cb(null, inst);
                } else {
                    cb(new Error('Permission denied'));
                }
            }.bind(this));
        }

        function destroy(id, cb) {
            var self = this;
            anotherClass.find(id, function (err, inst) {
                if (err) return cb(err);
                if (!inst) return cb(new Error('Not found'));
                if (inst[fk] && inst[fk].toString() == self.id.toString()) {
                    inst.destroy(cb);
                } else {
                    cb(new Error('Permission denied'));
                }
            });
        }

    };
}