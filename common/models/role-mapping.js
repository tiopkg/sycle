"use strict";

module.exports = function (RoleMapping, app) {
    var models = app.models;
    var Application = models.Application;
    var User = models.User;
    var Role = models.Role;

    // Principal types
    RoleMapping.USER = 'USER';
    RoleMapping.APP = RoleMapping.APPLICATION = 'APP';
    RoleMapping.ROLE = 'ROLE';

    /**
     * Get the application principal
     * @callback {Function} callback (err, application)
     */
    RoleMapping.prototype.application = function (callback) {
        if (this.principalType === RoleMapping.APPLICATION) {
            var Application = this.constructor.Application || Application;
            Application.findById(this.principalId, callback);
        } else {
            process.nextTick(function () {
                callback && callback(null, null);
            });
        }
    };

    /**
     * Get the user principal
     * @callback {Function} callback (err, user)
     */
    RoleMapping.prototype.user = function (callback) {
        if (this.principalType === RoleMapping.USER) {
            var User = this.constructor.User || User;
            User.findById(this.principalId, callback);
        } else {
            process.nextTick(function () {
                callback && callback(null, null);
            });
        }
    };

    /**
     * Get the child role principal
     * @callback {Function} callback (err, childRole)
     */
    RoleMapping.prototype.childRole = function (callback) {
        if (this.principalType === RoleMapping.ROLE) {
            var Role = this.constructor.Role || Role;
            Role.findById(this.principalId, callback);
        } else {
            process.nextTick(function () {
                callback && callback(null, null);
            });
        }
    };
};