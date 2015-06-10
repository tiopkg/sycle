"use strict";

var debug = require('debug')('sycle:registry');
var _ = require('lodash');
var i8n = require('inflection');
var path = require('path');
var resolve = require('resolve');
var Schema = require('./schema');

var DATA_TYPES = _.assign({
    "String": String,
    "Date": Date,
    "Number": Number,
    "Boolean": Boolean
}, Schema.types);

Object.keys(DATA_TYPES).forEach(function (name) {
    DATA_TYPES[name.toLowerCase()] = DATA_TYPES[name];
    DATA_TYPES[name.toUpperCase()] = DATA_TYPES[name];
});

module.exports = Registry;

function Registry(context) {
    if (!this instanceof Registry) return new Registry(context);

    this.context = context || this;
    this.schemas = [];
    this.definitions = {};
    this.models = {};
    this.plugins = [];
}

Registry.prototype.use = function (plugin, opts) {
    if (typeof plugin === "string") {
        try {
            plugin = require(resolve.sync(plugin, {basedir: path.resolve('./')}));
        } catch (e) {
            throw e;
        }
    }

    plugin = new plugin(this, opts || {});

    if (typeof plugin.define === "function") {
        for (var k in this.models) {
            plugin.define(this.models[k]);
        }
    }

    this.plugins.push(plugin);

    return this;
};

Registry.prototype.define = function (/*name, desc, setup*/) {
    var i, arg, type, name, desc, setup;
    for (i = 0; i < arguments.length; i++) {
        arg = arguments[i];
        type = typeof arg;
        if (!name && type === 'string') {
            name = arg;
        } else if (!desc && (type === 'object' || type === 'function')) {
            desc = arg;
        } else if (!setup && type === 'function') {
            setup = arg;
        } else {
            throw new Error('Unsupported argument ' + arg);
        }
    }

    desc = desc || {};
    if (typeof desc === 'function') {
        desc = desc(Schema);
    }

    if (desc.name) {
        name = desc.name;
    }

    var def;

    desc = standartize(desc);
    def = findDefinition(this.definitions, name);
    if (def) {
        name = def.name;
        desc = _.merge(_.cloneDeep(def), desc);
    } else {
        desc.name = name;
    }
    this.definitions[name] = desc;
    this.setup(desc, setup);
    return desc;
};

var DEF_KEYS = ['name', 'properties', 'fields', 'relations', 'settings'];
function standartize(desc) {
    var result = _.pick(desc, DEF_KEYS);
    coerceAll(result.properties || result.fields);
    result.settings = _.assign({}, result.settings, _.omit(desc, DEF_KEYS));
    return result;
}

function coerce(value) {
    if (value === undefined || value === null) return value;
    var t = typeof value;
    if (t === 'string') {
        return DATA_TYPES[value];
    } else if (t === 'object' && value.constructor.name === 'Array') {
        return value.map(coerce);
    }
    return value;
}

function coerceAll(properties) {
    if (!properties) return;
    Object.keys(properties).forEach(function (key) {
        var v = properties[key];
        if (!v) return;
        if (typeof v === 'object' && v.type) {
            v.type = coerce(v.type);
        } else {
            properties[key] = coerce(v);
        }
    });
}

Registry.prototype.setup = function (name, setup) {
    if (typeof setup !== 'function') return;
    var def = findDefinition(this.definitions, name);

    if (!def) throw new Error('Unknown model ' + name + ' for setup');

    def.setups = def.setups || [];
    if (Array.isArray(setup)) {
        def.setups = def.setups.concat(setup);
    } else {
        def.setups.push(setup);
    }
};

Registry.prototype.build = function (opts) {
    if (!opts) {
        opts = {db: {driver: 'memory'}};
    } else if (typeof opts === 'string') {
        opts = {db: {driver: opts}};
    } else if (opts.driver) {
        opts = {db: opts};
    }

    if (_.isEmpty(opts)) throw new Error('No database config provided');

    var self = this;
    var schemas = this.schemas = [];
    this.models = {};

    // reduce definitions
    var defaultDb = opts.default ? 'default' : opts.db ? 'db' : Object.keys(opts)[0];
    var defs = _.reduce(this.definitions, function (result, def, name) {
        var db = def.settings.db || def.settings.database || defaultDb;
        if (!result[db]) result[db] = {};
        result[db][name] = def;
        return result;
    }, {});

    _.forEach(defs, function (v, k) {
        debug('building schema for `' + k + '` with models [' + Object.keys(v) + ']');
        var opt = opts[k];
        if (!opt) {
            console.log('No config found for ' + k + ' schema, using in-memory schema');
            opt = {driver: 'memory'};
        }
        if (typeof opt === 'string') {
            opt = {driver: opt};
        }
        var schema = createSchema(opt.driver || opt.adapter, opt);
        self._build(schema, v);
        schema.name = k;
        schemas[k] = schema;
        schemas.push(schema);
    });

//    _.forEach(opts, function (conf, name) {
//        if (!conf || !conf.driver) {
//            console.log('No config found for ' + name + ' schema, using in-memory schema');
//            conf = {driver: 'memory'};
//        }
//        var schema = createSchema(conf.driver, conf);
//        self._build(schema, defs[name]);
//        schema.name = name;
//        schemas[name] = schema;
//        schemas.push(schema);
//    });

    return schemas;
};

Registry.prototype._build = function (schema, defs) {
//    if (names == '*') names = null;
//    if (typeof names === 'string') names = [names];
//    if (names && !Array.isArray(names)) {
//        throw new Error('`names` must be a string or string array');
//    }

    var context = this.context;
    var plugins = this.plugins;
    var models = this.models;
//    var defs = names ? _.pick(this.definitions, names) : this.definitions;

    schema.on('beforeDefine', function (name, properties, settings) {
        for (var i = 0; i < plugins.length; i++) {
            if (typeof plugins[i].beforeDefine === "function") {
                plugins[i].beforeDefine(name, properties, settings);
            }
        }
    });

    schema.on('define', function (model, name, properties, settings) {
        models[name] = model;
        if (schema.backyard) {
            schema.backyard.define(name, properties, settings);
        }
        for (var i = 0; i < plugins.length; i++) {
            if (typeof plugins[i].define === "function") {
                plugins[i].define(model, name, properties, settings);
            }
        }
    });

    _.forEach(defs, function (def, name) {
        schema.define(name, def.properties || def.fields, def.settings);
    });

    _.forEach(defs, function (def) {
        buildRelations(schema, def);
    });

    _.forEach(defs, function (def) {
        if (!def.setups) return;
        for (var i = 0; i < def.setups.length; i++) {
            def.setups[i](models[def.name], context);
        }
    });
};

function findDefinition(definitions, name) {
    if (typeof name === 'object') return name;
    var possibles = [name, name.toLowerCase(), name.toUpperCase(), i8n.underscore(name), i8n.camelize(name),
        i8n.dasherize(i8n.underscore(name))],
        i;
    for (i = 0; i < possibles.length; i++) {
        if (definitions[possibles[i]]) return definitions[possibles[i]];
    }
}

function createSchema(name, settings) {
    var schema = new Schema(name, settings);
    if (settings && settings.backyard) {
        schema.backyard = new Schema(settings.backyard.driver, settings.backyard);
    }
    return schema;
}

function buildRelations(schema, def) {
    if (!def.relations) return;
    var model = schema.models[def.name];
    var relations = def.relations;
    for (var name in relations) {
        var rel = relations[name];
        var target = rel.model,
            targetName,
            targetModel;

        if (!target) {
            target = i8n.singularize(name);
        }

        targetName = findKey(schema.models, target);
        if (!targetName) {
            throw new Error(util.format('Unknown target model `%s` to build relationship %s.%s -> %s -> %s',
                target, model.modelName, name, rel.type, target));
        }

        targetModel = schema.models[targetName];

        if (typeof rel.through === 'string') {
            var throughName = findKey(schema.models, rel.through);
            if (!throughName) {
                throw new Error(util.format('Unknown through model `%s` to build relationship %s.%s -> %s -> %s',
                    rel.through, model.modelName, name, rel.type, target));
            }
            rel.through = schema.models[throughName];
        }

        var options = _.omit(rel, ['type', 'target', 'model']);
        options.as = options.as || name;
        model[rel.type](targetModel, options);
    }
}

function findKey(object, target) {
    var targetName = target.toLowerCase();
    return _.findKey(object, function (value, name) {
        return name.toLowerCase() === targetName;
    });
}
