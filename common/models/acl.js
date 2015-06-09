"use strict";

var async = require('async');
var assert = require('assert');
var debug = require('debug')('sycle:security:acl');

var sec = require('../../lib/security');
var accessing = require('../../lib/accessing');
var AccessContext = accessing.AccessContext;
var Principal = accessing.Principal;
var AccessRequest = accessing.AccessRequest;

module.exports = function (ACL, app) {

    var Role = app.model('Role');

    ACL.ALL = sec.ALL;

    ACL.DEFAULT = sec.DEFAULT; // Not specified
    ACL.ALLOW = sec.ALLOW; // Allow
    ACL.ALARM = sec.ALARM; // Warn - send an alarm
    ACL.AUDIT = sec.AUDIT; // Audit - record the access
    ACL.DENY = sec.DENY; // Deny

    ACL.READ = sec.READ; // Read operation
    ACL.WRITE = sec.WRITE; // Write operation
    ACL.EXECUTE = sec.EXECUTE; // Execute operation

    ACL.USER = sec.USER;
    ACL.APP = ACL.APPLICATION = sec.APPLICATION;
    ACL.ROLE = sec.ROLE;
    ACL.SCOPE = sec.SCOPE;


    /**
     * Calculate the matching score for the given rule and request
     * @param {Object} rule The ACL entry
     * @param {AccessRequest} req The request
     * @returns {Number}
     */
    ACL.calcMatchingScore = function calcMatchingScore(rule, req) {
        var props = ['model', 'property', 'accessType'];
        var score = 0;

        for (var i = 0; i < props.length; i++) {
            // Shift the score by 4 for each of the properties as the weight
            score = score * 4;
            var val1 = rule[props[i]] || ACL.ALL;
            var val2 = req[props[i]] || ACL.ALL;
            var isMatchingMethodName = props[i] === 'property' && req.methodNames.indexOf(val1) !== -1;

            if (val1 === val2 || isMatchingMethodName) {
                // Exact match
                score += 3;
            } else if (val1 === ACL.ALL) {
                // Wildcard match
                score += 2;
            } else if (val2 === ACL.ALL) {
                // Doesn't match at all
                score += 1;
            } else {
                return -1;
            }
        }

        // Weigh against the principal type into 4 levels
        // - user level (explicitly allow/deny a given user)
        // - app level (explicitly allow/deny a given app)
        // - role level (role based authorization)
        // - other
        // user > app > role > ...
        score = score * 4;
        switch (rule.principalType) {
            case ACL.USER:
                score += 4;
                break;
            case ACL.APP:
                score += 3;
                break;
            case ACL.ROLE:
                score += 2;
                break;
            default:
                score += 1;
        }

        // Weigh against the roles
        // everyone < authenticated/unauthenticated < related < owner < ...
        score = score * 8;
        if (rule.principalType === ACL.ROLE) {
            switch (rule.principalId) {
                case Role.OWNER:
                    score += 4;
                    break;
                case Role.RELATED:
                    score += 3;
                    break;
                case Role.AUTHENTICATED:
                case Role.UNAUTHENTICATED:
                    score += 2;
                    break;
                case Role.EVERYONE:
                    score += 1;
                    break;
                default:
                    score += 5;
            }
        }
        score = score * 4;
        score += AccessContext.permissionOrder[rule.permission || ACL.ALLOW] - 1;
        return score;
    };

    /**
     * Get matching score for the given `AccessRequest`.
     * @param {AccessRequest} req The request
     * @returns {Number} score
     */

    ACL.prototype.score = function (req) {
        return this.constructor.calcMatchingScore(this, req);
    };

    /**
     * Resolve permission from the ACLs
     *
     * @param {Object[]} acls The list of ACLs
     * @param {Object} req The request
     * @returns {AccessRequest} result The effective ACL
     */
    ACL.resolvePermission = function resolvePermission(acls, req) {
        if (!(req instanceof AccessRequest)) {
            req = new AccessRequest(req);
        }
        // Sort by the matching score in descending order
        acls = acls.sort(function (rule1, rule2) {
            return ACL.calcMatchingScore(rule2, req) - ACL.calcMatchingScore(rule1, req);
        });
        var permission = ACL.DEFAULT;
        var score = 0;

        for (var i = 0; i < acls.length; i++) {
            score = ACL.calcMatchingScore(acls[i], req);
            if (score < 0) {
                // the highest scored ACL did not match
                break;
            }
            if (!req.isWildcard()) {
                // We should stop from the first match for non-wildcard
                permission = acls[i].permission;
                break;
            } else {
                if (req.exactlyMatches(acls[i])) {
                    permission = acls[i].permission;
                    break;
                }
                // For wildcard match, find the strongest permission
                if (AccessContext.permissionOrder[acls[i].permission] > AccessContext.permissionOrder[permission]) {
                    permission = acls[i].permission;
                }
            }
        }

        if (debug.enabled) {
            debug('The following ACLs were searched: ');
            acls.forEach(function (acl) {
                acl.debug();
                debug('with score:', acl.score(req));
            });
        }

        return new AccessRequest(req.model, req.property, req.accessType, permission || ACL.DEFAULT);
    };

    /**
     * Build the static ACLs from the model definition
     * @param {String} model The model name
     * @param {String} property The property/method/relation name
     *
     * @return {Object[]} An array of ACLs
     */
    ACL.buildStaticACLs = function buildStaticACLs(model, property) {
        var modelClass = app.model(model);
        var staticACLs = [];
        if (modelClass && modelClass.settings.acls) {
            modelClass.settings.acls.forEach(function (acl) {
                staticACLs.push(new ACL({
                    model: model,
                    property: acl.property || ACL.ALL,
                    principalType: acl.principalType,
                    principalId: acl.principalId, // TODO: Should it be a name?
                    accessType: acl.accessType || ACL.ALL,
                    permission: acl.permission
                }));
            });
        }
        var prop = modelClass &&
            (modelClass.properties[property] // regular property
                || modelClass[property] // static method
                || modelClass.prototype[property]); // prototype method
        if (prop && prop.acls) {
            prop.acls.forEach(function (acl) {
                staticACLs.push(new ACL({
                    model: modelClass.modelName,
                    property: property,
                    principalType: acl.principalType,
                    principalId: acl.principalId,
                    accessType: acl.accessType,
                    permission: acl.permission
                }));
            });
        }
        return staticACLs;
    };

    /**
     * Check if the given principal is allowed to access the model/property
     * @param {String} principalType The principal type.
     * @param {String} principalId The principal ID.
     * @param {String} model The model name.
     * @param {String} property The property/method/relation name.
     * @param {String} accessType The access type.
     * @param {Function} callback Callback function. (err, accessRequest)
     */
    ACL.checkPermission = function checkPermission(principalType, principalId, model, property, accessType, callback) {
        if (principalId !== null && principalId !== undefined && (typeof principalId !== 'string')) {
            principalId = principalId.toString();
        }
        property = property || ACL.ALL;
        var propertyQuery = (property === ACL.ALL) ? undefined : {inq: [property, ACL.ALL]};
        accessType = accessType || ACL.ALL;
        var accessTypeQuery = (accessType === ACL.ALL) ? undefined : {inq: [accessType, ACL.ALL]};

        var req = new AccessRequest(model, property, accessType);

        var acls = this.buildStaticACLs(model, property);

        var resolved = this.resolvePermission(acls, req);

        if (resolved && resolved.permission === ACL.DENY) {
            debug('Permission denied by statically resolved permission');
            debug('  Resolved Permission: %j', resolved);
            process.nextTick(function () {
                callback && callback(null, resolved);
            });
            return;
        }

        var self = this;

        var where = {principalType: principalType, principalId: principalId, model: model};
        if (propertyQuery) where.property = propertyQuery;
        if (accessTypeQuery) where.accessType = accessTypeQuery;

        this.all({where: where}, function (err, dynACLs) {
            if (err) return callback && callback(err);

            acls = acls.concat(dynACLs);
            resolved = self.resolvePermission(acls, req);
            if (resolved && resolved.permission === ACL.DEFAULT) {
                var modelClass = app.model(model);
                resolved.permission = (modelClass && modelClass.settings.defaultPermission) || ACL.ALLOW;
            }
            callback && callback(null, resolved);
        });
    };

    ACL.prototype.debug = function () {
        if (debug.enabled) {
            debug('---ACL---');
            debug('model %s', this.model);
            debug('property %s', this.property);
            debug('principalType %s', this.principalType);
            debug('principalId %s', this.principalId);
            debug('accessType %s', this.accessType);
            debug('permission %s', this.permission);
        }
    };

    /**
     * Check if the request has the permission to access.
     *
     * @param {Object|AccessContext} context See below.
     *  @param {Object[]} context.principals An array of principals.
     *  @param {String|Model} context.model The model name or model class.
     *  @param {*} context.id The model instance ID.
     *  @param {String} context.property The property/method/relation name.
     *  @param {String} context.accessType The access type: READE, WRITE, or EXECUTE.
     * @param {Function} callback Callback function
     */
    ACL.checkAccessForContext = function (context, callback) {
        if (!(context instanceof AccessContext)) {
            context = new AccessContext(context, app);
        }

        var model = context.model;
        var property = context.property;
        var accessType = context.accessType;
        var modelName = context.modelName;

        var methodNames = context.methodNames;
        var propertyQuery = (property === ACL.ALL) ? undefined : {inq: methodNames.concat([ACL.ALL])};
        var accessTypeQuery = (accessType === ACL.ALL) ? undefined : {inq: [accessType, ACL.ALL]};

        var req = new AccessRequest(modelName, property, accessType, ACL.DEFAULT, methodNames);

        var effectiveACLs = [];
        var staticACLs = this.buildStaticACLs(model.modelName, property);

        var self = this;
        this.all({where: {model: model.modelName, property: propertyQuery,
            accessType: accessTypeQuery}}, function (err, acls) {

            if (err) return callback && callback(err);

            var inRoleTasks = [];

            acls = acls.concat(staticACLs);

            acls.forEach(function (acl) {
                // Check exact matches
                for (var i = 0; i < context.principals.length; i++) {
                    var p = context.principals[i];
                    if (p.type === acl.principalType
                        && String(p.id) === String(acl.principalId)) {
                        effectiveACLs.push(acl);
                        return;
                    }
                }

                // Check role matches
                if (acl.principalType === ACL.ROLE) {
                    inRoleTasks.push(function (done) {
                        Role.isInRole(acl.principalId, context, function (err, inRole) {
                            if (!err && inRole) {
                                effectiveACLs.push(acl);
                            }
                            done(err, acl);
                        });
                    });
                }
            });

            async.parallel(inRoleTasks, function (err, results) {
                if (err) {
                    callback && callback(err, null);
                    return;
                }
                var resolved = self.resolvePermission(effectiveACLs, req);
                if (resolved && resolved.permission === ACL.DEFAULT) {
                    resolved.permission = (model && model.settings.defaultPermission) || ACL.ALLOW;
                }
                debug('---Resolved---');
                resolved.debug();
                callback && callback(null, resolved);
            });
        });
    };

    /**
     * Check if the given access token can invoke the method
     * @param {Object} token The access token
     * @param {String} model The model name
     * @param {*} modelId The model id
     * @param {String} method The method name
     * @param {Function} callback Callback function (err, allowed)
     */
    ACL.checkAccessForToken = function (token, model, modelId, method, callback) {
        assert(token, 'Access token is required');

        var context = new AccessContext({
            accessToken: token,
            model: model,
            property: method,
            method: method,
            modelId: modelId
        });

        this.checkAccessForContext(context, function (err, access) {
            if (err) {
                callback && callback(err);
                return;
            }
            callback && callback(null, access.permission !== ACL.DENY);
        });
    };

};