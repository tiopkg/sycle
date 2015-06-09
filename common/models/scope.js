"use strict";

module.exports = function (Scope, app) {

    var ACL = app.model('ACL');
    /**
     * Check if the given scope is allowed to access the model/property
     * @param {String} scope The scope name
     * @param {String} model The model name
     * @param {String} property The property/method/relation name
     * @param {String} accessType The access type
     * @param {Function} callback (err, accessRequest)
     */
    Scope.checkPermission = function (scope, model, property, accessType, callback) {
        this.findOne({where: {name: scope}}, function (err, scope) {
            if (err) return callback && callback(err);
            ACL.checkPermission(ACL.SCOPE, scope.id, model, property, accessType, callback);
        });
    };
};